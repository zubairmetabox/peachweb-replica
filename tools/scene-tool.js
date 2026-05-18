#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DEFAULT_SCENE = path.resolve(
  __dirname,
  '..',
  'scene-state',
  'a2be68de-75b9-45eb-b89f-cac9fd6cde5c.json'
);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const positionals = [];
  const flags = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }

    const eq = arg.indexOf('=');
    if (eq !== -1) {
      flags[arg.slice(2, eq)] = arg.slice(eq + 1);
      continue;
    }

    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      flags[key] = next;
      i += 1;
    } else {
      flags[key] = true;
    }
  }

  return { positionals, flags };
}

function loadScene(scenePath) {
  const resolved = path.resolve(scenePath || DEFAULT_SCENE);
  const raw = fs.readFileSync(resolved, 'utf8');
  const scene = JSON.parse(raw);
  const engineState = scene.engineState;
  if (!engineState || !engineState.pwObjects) {
    fail(`Scene file is missing engineState.pwObjects: ${resolved}`);
  }
  return { resolved, scene, engineState };
}

function saveScene(scenePath, scene, createBackup) {
  const serialized = `${JSON.stringify(scene, null, 2)}\n`;
  if (createBackup) {
    const backupPath = `${scenePath}.bak`;
    fs.copyFileSync(scenePath, backupPath);
    console.log(`Backup written: ${backupPath}`);
  }
  fs.writeFileSync(scenePath, serialized);
  console.log(`Scene updated: ${scenePath}`);
}

function objectEntries(engineState) {
  return Object.entries(engineState.pwObjects);
}

function normalize(text) {
  return String(text || '').toLowerCase();
}

function matchesQuery(id, obj, query, exact) {
  if (!query) return true;
  if (exact) return id === query || obj.name === query;
  const haystacks = [id, obj.name, obj.type].map(normalize);
  const needle = normalize(query);
  return haystacks.some((value) => value.includes(needle));
}

function findMatches(engineState, query, exact) {
  return objectEntries(engineState)
    .filter(([id, obj]) => matchesQuery(id, obj, query, exact))
    .map(([id, obj]) => ({ id, obj }));
}

function parseVector(value, label) {
  const parts = String(value)
    .split(',')
    .map((part) => Number(part.trim()));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    fail(`Expected ${label} as x,y,z but received: ${value}`);
  }
  return { x: parts[0], y: parts[1], z: parts[2] };
}

function parseBoolean(value, label) {
  if (value === true) return true;
  if (value === false) return false;
  const normalized = normalize(value);
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  fail(`Expected ${label} to be true or false but received: ${value}`);
}

function collectDescendants(engineState, rootIds) {
  const visited = new Set();
  const stack = [...rootIds];

  while (stack.length) {
    const current = stack.pop();
    if (visited.has(current)) continue;
    visited.add(current);
    const children = engineState.children[current] || [];
    for (const childId of children) stack.push(childId);
  }

  return visited;
}

function detachFromParent(engineState, id) {
  const parentId = engineState.parents[id];
  if (!parentId) return;
  const siblings = engineState.children[parentId] || [];
  engineState.children[parentId] = siblings.filter((childId) => childId !== id);
  delete engineState.parents[id];
}

function removeObjects(engineState, ids) {
  const allIds = collectDescendants(engineState, ids);

  for (const id of allIds) {
    detachFromParent(engineState, id);
  }

  for (const id of allIds) {
    delete engineState.pwObjects[id];
    delete engineState.children[id];
    delete engineState.parents[id];
    delete engineState.pwObjectsUsingPwMaterial[id];
  }

  return allIds;
}

function printSummary(engineState) {
  const counts = {};
  for (const obj of Object.values(engineState.pwObjects)) {
    counts[obj.type] = (counts[obj.type] || 0) + 1;
  }

  console.log(`Objects: ${Object.keys(engineState.pwObjects).length}`);
  console.log(`Materials: ${Object.keys(engineState.pwMaterials || {}).length}`);
  console.log(`Default camera: ${engineState.defaultCameraId}`);
  console.log('Types:');
  for (const [type, count] of Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`  ${type}: ${count}`);
  }
}

function printList(matches) {
  for (const { id, obj } of matches) {
    console.log(`${id} | ${obj.type} | ${obj.name || ''}`);
  }
  console.log(`Matched ${matches.length} object(s).`);
}

function printShow(engineState, matches) {
  if (matches.length !== 1) {
    fail(`show expects exactly 1 match, found ${matches.length}`);
  }

  const { id, obj } = matches[0];
  console.log(JSON.stringify({
    id,
    parentId: engineState.parents[id] || null,
    childIds: engineState.children[id] || [],
    object: obj,
  }, null, 2));
}

function applySet(obj, flags) {
  if (flags.position) obj.position = parseVector(flags.position, 'position');
  if (flags.rotation) obj.rotation = parseVector(flags.rotation, 'rotation');
  if (flags.scale) obj.scale = parseVector(flags.scale, 'scale');
  if (flags.visible !== undefined) obj.visible = parseBoolean(flags.visible, 'visible');
  if (flags.name) obj.name = flags.name;
}

function usage() {
  console.log(`Usage:
  node tools/scene-tool.js summary [--scene path]
  node tools/scene-tool.js list [query] [--scene path] [--exact] [--type TYPE]
  node tools/scene-tool.js show <query> [--scene path] [--exact]
  node tools/scene-tool.js remove <query> [--scene path] [--exact] [--no-backup]
  node tools/scene-tool.js set <query> [--scene path] [--exact] [--position x,y,z] [--rotation x,y,z] [--scale x,y,z] [--visible true|false] [--name value]

Notes:
  - Default scene is the desktop scene JSON in scene-state/.
  - Queries match id, name, or type by substring unless --exact is used.
  - remove deletes descendants too and updates parent/child links.`);
}

function main() {
  const { positionals, flags } = parseArgs(process.argv.slice(2));
  const command = positionals[0];

  if (!command || command === 'help' || command === '--help') {
    usage();
    return;
  }

  const scenePath = flags.scene || DEFAULT_SCENE;
  const { resolved, scene, engineState } = loadScene(scenePath);
  const exact = Boolean(flags.exact);

  if (command === 'summary') {
    console.log(`Scene: ${resolved}`);
    printSummary(engineState);
    return;
  }

  if (command === 'list') {
    const query = positionals[1];
    let matches = findMatches(engineState, query, exact);
    if (flags.type) {
      matches = matches.filter(({ obj }) => normalize(obj.type) === normalize(flags.type));
    }
    printList(matches);
    return;
  }

  const query = positionals[1];
  if (!query) fail(`Missing query for command: ${command}`);

  const matches = findMatches(engineState, query, exact);
  if (!matches.length) fail(`No scene objects matched: ${query}`);

  if (command === 'show') {
    printShow(engineState, matches);
    return;
  }

  if (command === 'remove') {
    if (!exact && matches.length > 1) {
      fail(`remove matched ${matches.length} objects. Re-run with --exact or a narrower query.`);
    }
    const removedIds = removeObjects(engineState, matches.map(({ id }) => id));
    saveScene(resolved, scene, !flags['no-backup']);
    console.log(`Removed ${removedIds.size} object(s).`);
    return;
  }

  if (command === 'set') {
    if (matches.length !== 1) {
      fail(`set expects exactly 1 match, found ${matches.length}`);
    }
    const { obj } = matches[0];
    applySet(obj, flags);
    saveScene(resolved, scene, !flags['no-backup']);
    console.log(`Updated object: ${matches[0].id} (${obj.name || obj.type})`);
    return;
  }

  fail(`Unknown command: ${command}`);
}

main();
