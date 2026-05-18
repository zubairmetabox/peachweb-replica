# Scene Editing Notes

The PeachWeb 3D scene is data-driven. The runtime in `script.js` and `658.script.js` mostly reads `scene-state/a2be68de-75b9-45eb-b89f-cac9fd6cde5c.json` and loads the referenced assets from `cdn/website/`.

That means the safest reuse workflow is:

1. Start from `C:\dev\peachweb-scene-only` if you want the 3D scene without the full PeachWeb hero UI.
2. Change scene objects in the JSON instead of patching the minified runtime.
3. Keep the `_pwLoadFileFromCache` shim and the local `/cdn/website/` asset mirror intact.

## CLI

This repo now includes `tools/scene-tool.js` for common scene edits.

Examples:

```powershell
node tools/scene-tool.js summary
node tools/scene-tool.js list
node tools/scene-tool.js list jelly
node tools/scene-tool.js show "fish-RIG" --exact
node tools/scene-tool.js set "fish-RIG" --exact --position 0.8,10,0.4
node tools/scene-tool.js set "🔴 Main Camera" --exact --position 0,0,4 --rotation 0,0,0
node tools/scene-tool.js remove Sphere --exact
node tools/scene-tool.js list card5 --type IMPORTED
```

By default the tool edits the desktop scene:

`scene-state/a2be68de-75b9-45eb-b89f-cac9fd6cde5c.json`

To target another scene file, pass `--scene`:

```powershell
node tools/scene-tool.js summary --scene C:\dev\peachweb-replica\scene-state\7a38b385-c817-4e66-8d96-8cad23a6b0d9.json
```

The tool creates a `.bak` file before write operations unless you pass `--no-backup`.

## What Is Editable

Common object fields:

- `position`: world position
- `rotation`: Euler rotation in radians
- `scale`: world scale
- `visible`: show or hide without deleting
- `name`: useful for giving objects stable labels during reuse

Useful scene groups in the desktop scene:

- `HERO`: main hero container
- `Cards`: floating card stack area
- `fish-RIG`: clown fish rig
- `UNDERWORLD`: underwater jellyfish and lighting cluster
- `BGS`: background planes and particles

Useful single objects:

- `🔴 Main Camera`: default camera
- `Water`: reflective water surfaces
- `Sphere`: crystal orb meshes
- `particle`: imported particle system
- `frame`: imported frame mesh

## Reuse Guidance

If the next project only needs the visual scene, the fastest path is usually:

1. Copy the `peachweb-scene-only` folder into the new project as a standalone prototype.
2. Remove or hide unwanted scene objects with `scene-tool.js`.
3. Adjust camera, fish, cards, and underworld transforms until the composition fits the new layout.
4. Only after the scene looks right, decide whether to keep the PeachWeb runtime wrapper or replace it with a custom Three.js implementation.

If you want, the next step can be either:

- pruning the current scene into a cleaner variant, or
- extracting the scene into a smaller embeddable wrapper for the other project.
