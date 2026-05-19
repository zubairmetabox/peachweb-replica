const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 4202;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.hdr': 'application/octet-stream',
  '': 'application/octet-stream',
};

const CDN_PREFIX = '/cdn/website/';

const SCENE_PATH  = path.join(__dirname, 'scene-state/a2be68de-75b9-45eb-b89f-cac9fd6cde5c.json');
const BAIT_ID     = '480aae7d-371f-4934-9033-698109657d31';
const GLB_SRC     = 'C:/dev/katana-website/public/homepage/detailed bait.glb';
const GLB_DEST    = path.join(__dirname, 'cdn/website/custom-katana/detailed-bait.glb');

function bakeGLBScale(scale) {
  const buf = fs.readFileSync(GLB_SRC);
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
  json.nodes[0].scale = [scale, scale, scale];
  const newJson  = Buffer.from(JSON.stringify(json), 'utf8');
  const pad      = (4 - (newJson.length % 4)) % 4;
  const padded   = Buffer.concat([newJson, Buffer.alloc(pad, 0x20)]);
  const binChunk = buf.slice(20 + jsonLen);           // binary chunk (header + data)
  const hdr      = Buffer.alloc(12);
  hdr.write('glTF', 0, 'ascii');
  hdr.writeUInt32LE(2, 4);
  hdr.writeUInt32LE(12 + 8 + padded.length + binChunk.length, 8);
  const chunkHdr = Buffer.alloc(8);
  chunkHdr.writeUInt32LE(padded.length, 0);
  chunkHdr.writeUInt32LE(0x4E4F534A, 4);
  fs.writeFileSync(GLB_DEST, Buffer.concat([hdr, chunkHdr, padded, binChunk]));
}

http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  const DEG = Math.PI / 180;

  // GET /bait-config — returns current bait values from scene state
  if (req.method === 'GET' && urlPath === '/bait-config') {
    try {
      const scene = JSON.parse(fs.readFileSync(SCENE_PATH, 'utf8'));
      const bait  = scene.engineState.pwObjects[BAIT_ID];
      // Read scale from GLB root node (that's what actually controls size)
      let glbScale = 1;
      try {
        const glbBuf = fs.readFileSync(GLB_DEST);
        const jLen   = glbBuf.readUInt32LE(12);
        const glbJson = JSON.parse(glbBuf.slice(20, 20 + jLen).toString('utf8'));
        glbScale = (glbJson.nodes[0].scale || [1])[0];
      } catch(e) {}
      // Reverse: localZ = 0.660 - 0.670/S  →  S = 0.670 / (0.660 - localZ)
      const localZ = bait.position.z;
      const derivedScale = +(0.670 / Math.max(0.001, 0.660 - localZ)).toFixed(2);
      const cfg = {
        scale: derivedScale,
        x: bait.position.x,
        y: bait.position.y,
        rx: Math.round(bait.rotation.x / DEG),
        ry: Math.round(bait.rotation.y / DEG),
        rz: Math.round(bait.rotation.z / DEG),
      };
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(cfg));
    } catch(e) { res.writeHead(500); res.end(e.message); }
    return;
  }

  // POST /apply-bait  { scale, x, y, z, rx, ry, rz }
  if (req.method === 'POST' && urlPath === '/apply-bait') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const cfg   = JSON.parse(body);
        const scene = JSON.parse(fs.readFileSync(SCENE_PATH, 'utf8'));
        const bait  = scene.engineState.pwObjects[BAIT_ID];
        if (bait) {
          // Scale works via perspective: moving bait closer to camera makes it appear bigger.
          // Camera z=1.066, baseline distance=0.670 (at z=-0.01 local).
          // local_z = 0.660 - 0.670/scale  (clamped to 0.55 max to avoid near-clip)
          const S = Math.max(0.1, +cfg.scale || 1);
          const localZ = Math.min(0.55, 0.660 - 0.670 / S);
          bait.position = { x: +cfg.x, y: +cfg.y, z: localZ };
          bait.rotation = {
            x: (+cfg.rx || 0) * DEG,
            y: (+cfg.ry || 0) * DEG,
            z: (+cfg.rz || 0) * DEG,
          };
          fs.writeFileSync(SCENE_PATH, JSON.stringify(scene));
        }
        res.writeHead(200); res.end('ok');
      } catch(e) { res.writeHead(500); res.end(e.message); }
    });
    return;
  }

  // Serve CDN assets from local cdn/ folder
  if (urlPath.startsWith(CDN_PREFIX)) {
    const localPath = path.join(ROOT, urlPath);
    const ext = path.extname(localPath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';

    fs.readFile(localPath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('CDN asset not found: ' + urlPath);
        return;
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        // No caching for GLBs — scale is baked on-the-fly
        'Cache-Control': ext === '.glb' ? 'no-cache, no-store' : 'public, max-age=3600',
      });
      res.end(data);
    });
    return;
  }

  // Serve local files
  const filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found: ' + urlPath);
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
  });

}).listen(PORT, () => {
  console.log('Server running at http://localhost:' + PORT);
});
