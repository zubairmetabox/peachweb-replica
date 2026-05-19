# Scene Composition — peachweb-fish

Reference doc for the PeachWeb 3D scene structure. All data from `scene-state/a2be68de-75b9-45eb-b89f-cac9fd6cde5c.json`.

---

## Scene Tree

```
SCENE (root)
├── LIGHT — Point Light          y=6.98  z=-0.97
├── GROUP — UNDERWORLD           y=4.45  z=-0.66   ← below-water zone
│   ├── IMPORTED — jelly2 ×3    (jellyfish.glb)
│   ├── IMPORTED — fish particles (333-v1.glb)
│   ├── MESH — Margin ×2
│   ├── GROUP — BGS              ← underwater backgrounds
│   │   ├── MESH — PlaneSeaBG
│   │   ├── MESH — Plane ×2
│   └── GROUP — Group
│       └── IMPORTED — frame    (frame.glb)
│
├── GROUP — Cards                y=8.89
│   └── 11× IMPORTED card5      (card5.glb, stacked z=0…60)
│
├── CAMERA — 🔴 Main Camera      y=8.76  z=1.07  fov=40
│
├── IMPORTED — jelly             y=7.05  z=-0.84  (floating jellyfish)
│
├── GROUP — fish-RIG             y=12.56 z=0.41   ← bait lives here
│   ├── IMPORTED — detailed-bait (detailed-bait.glb)
│   └── LIGHT — Spotlight
│
├── GROUP — HERO                 y=12.43 z=-0.18  ← all hero visuals
│   ├── MESH — main BG           local z=0.02   world z=-0.17
│   ├── Water — Water            local z=0.18   world z=0.00   ← water surface
│   ├── MESH — PinkBG            local z=-0.57  world z=-0.75  ← rolling hills
│   ├── Water — Water            local z=0.18   world z=0.00   ← water surface (×2)
│   ├── MESH — gray              local z=1.08   world z=0.90   ← sky haze
│   └── IMPORTED — particle      local z=0.87   world z=0.68   (particle.glb)
│
└── LIGHT — Spotlight            y=13.06 z=0.40
```

---

## Layer Stack (front → back, camera at z=1.07)

Objects closer to camera render on top. Camera faces −Z.

| # | Object | World Z | Distance from camera | Role |
|---|---|---|---|---|
| 1 | `gray` MESH | 0.90 | 0.17 | Atmospheric sky haze |
| 2 | `particle` GLB | 0.68 | 0.39 | Floating dust particles |
| 3 | `Water` ×2 | 0.00 | 1.07 | Reflective water surface |
| 4 | `main BG` MESH | −0.17 | 1.24 | Base sky plane |
| 5 | `PinkBG` MESH | −0.75 | 1.82 | Pink/purple rolling landscape |

> **Note:** `gray` (world z=0.90) sits almost between the camera and near-clip plane (z=0.97).  
> Objects behind `gray` are occluded by it unless they are close enough in z to poke through.  
> This is why the bait needs z ≈ −0.01 local to appear above the horizon.

---

## Water & Reflection

Two stacked `Water` type objects at identical positions inside HERO.  
PeachWeb uses Three.js's built-in Water shader:

- **Real-time reflection** — renders the scene from a mirrored viewpoint below the water plane each frame
- **Wave distortion** — driven by `water2.mp4` (an animated video texture used as a normal map), served locally at `cdn/website/86f44a38.../water2.mp4`
- **Reflection color / sky** — controlled by the HDR environment: `belfast-sunset-puresky-2k-1-.hdr` (warm sunset tones). Swapping this HDR changes the overall lighting and reflection colour entirely.
- **Sun highlight** — the white glint on the water comes from the HDR's sun position

The second Water layer adds depth/layering to the reflection effect.

---

## Materials — Background Elements

| Object | Material ID | Name | Color | Type | Notes |
|---|---|---|---|---|---|
| `PinkBG` | `138fab4c` | Plane Material | `#ffcfe9` | UNLIT | The rolling pink/purple hills |
| `gray` | `d3d2a9b8` | MAIN BG | `#d6d8e2` | UNLIT | Sky haze + alpha gradient texture |
| `main BG` | `ca670ace` | Plane Material | `#ffffff` | UNLIT | Base sky plane with texture |

### How to change the landscape color

Edit `color` in `pwMaterials['138fab4c-...']` in the scene state JSON:

```javascript
const fs = require('fs');
const path = 'scene-state/a2be68de-75b9-45eb-b89f-cac9fd6cde5c.json';
const scene = JSON.parse(fs.readFileSync(path, 'utf8'));

// Change the rolling hills colour
scene.engineState.pwMaterials['138fab4c-5ae7-48a0-91c4-af68e7de61cd'].color = '#c9a0dc';

// Change the sky haze colour
scene.engineState.pwMaterials['d3d2a9b8-7bb3-4d44-848e-a40756c89706'].color = '#b0c4de';

fs.writeFileSync(path, JSON.stringify(scene));
```

### How to change the reflection environment

Swap the HDR file served at:
```
cdn/website/e2b954fe-ea8a-4ba1-8458-8e4001148a5e/belfast-sunset-puresky-2k-1-.hdr
```
Replace with any 2K HDR (equirectangular). Keep the same filename.

---

## Bait Object

Lives in `fish-RIG` group (y=12.56, z=0.41 world).

| Property | Value |
|---|---|
| GLB | `cdn/website/custom-katana/detailed-bait.glb` |
| Scene URL | `https://files.peachworlds.com/website/custom-katana/detailed-bait.glb` |
| Working rotation | rx=180°, ry=89°, rz=−180° |
| Working position | x=0, y=0, z=−0.01 (local to fish-RIG) |
| Controls | `node server.js` → http://localhost:4202 → Bait Controls panel |
| Apply endpoint | `POST /apply-bait { scale, x, y, rx, ry, rz }` |

Scale via scene state and GLB node scale both get normalised by the engine.  
Apparent size is best controlled via the Z position (closer to camera = larger).

---

## Key Files

| File | Purpose |
|---|---|
| `scene-state/a2be68de...json` | Desktop 3D scene — objects, materials, lights, camera |
| `scene-state/7a38b385...json` | Mobile 3D scene |
| `cdn/website/*/belfast-*.hdr` | Reflection environment map |
| `cdn/website/*/kloofendal-*.hdr` | Secondary environment map |
| `cdn/website/*/water2.mp4` | Water normal map (animated) |
| `cdn/website/*/rays-2b.mp4` | Light ray texture |
| `cdn/website/custom-katana/detailed-bait.glb` | Custom bait model |
| `build.js` | Generates index.html — run `node build.js` after changes |
| `server.js` | Local HTTP server on port 4202 with `/apply-bait` and `/bait-config` endpoints |
