# Handover — PeachWeb Local Replica

Picking up from a Claude Code session. Everything below is the full context needed to continue.

---

## What This Is

A fully local replica of https://peachweb.io/ — first two sections only (hero + gallery). All assets served locally, including the proprietary PeachWeb builder JS runtime and WebGL 3D scene.

There are **two versions**:

| Folder | Server | Description |
|---|---|---|
| `C:\dev\peachweb-replica` | `node server.js` → http://localhost:4200 | Full replica: nav, hero text, CTAs, 3D scene, gallery |
| `C:\dev\peachweb-scene-only` | `node server.js` → http://localhost:4201 | Same but section 1 UI stripped — only the 3D background + gallery remain |

Both are fully working and independently runnable.

---

## How to Run

```bash
# Terminal 1 — full replica
cd C:\dev\peachweb-replica
node server.js
# Open http://localhost:4200

# Terminal 2 — scene only
cd C:\dev\peachweb-scene-only
node server.js
# Open http://localhost:4201
```

To regenerate `index.html` in either version after editing `build.js`:

```bash
node build.js
```

---

## File Structure (both folders identical in layout)

```
peachweb-replica/  (or peachweb-scene-only/)
│
├── index.html                  ← GENERATED — do not edit directly, run build.js
├── build.js                    ← Build script — edit this, then run node build.js
├── server.js                   ← Local HTTP server (port 4200 / 4201)
├── raw_index.html              ← Original HTML downloaded from peachweb.io (source of truth)
├── handover.md                 ← This file
│
├── script.js                   ← PeachWeb builder runtime (webpack entry)
├── 658.script.js               ← Three.js + WebGL 3D engine (~1.7MB)
├── 720.script.js               ← Router / page lifecycle manager
├── 928.script.js               ← UI + builder logic
├── 191.script.js               ← Cache interface module (defines _pwLoadFileFromCache API)
├── 875.script.js               ← Misc utilities
│
├── ui-state.json               ← Page UI layout config (read by router on init)
├── error-page.html             ← Shown by runtime if init fails
├── error-page-styles.css
│
├── scene-state/
│   ├── a2be68de...json         ← Desktop 3D scene config (objects, materials, lights, camera)
│   └── 7a38b385...json         ← Mobile 3D scene config
│
├── assets/
│   ├── css/
│   │   ├── styles.css          ← All element styles keyed by PeachWeb builder IDs (253KB)
│   │   └── website-base.css
│   ├── fonts/                  ← 5 custom typefaces (Neue Haas Display, Instrument Serif)
│   ├── images/                 ← 44 images (logos, icons, gallery thumbnails, awards)
│   └── videos/                 ← 7 MP4s: hero-demo, trex360, bmw-360,
│                                   vexel-360c, hp1, surge-2, garri-360
│
└── cdn/
    └── website/
        └── {uuid}/             ← 3D assets mirroring files.peachworlds.com paths
            ├── particle.glb
            ├── card5.glb
            ├── frame.glb
            ├── *-clown-5-v1.glb
            ├── *-jelly-v2.glb
            ├── 333-v1.glb
            ├── kloofendal-*.hdr
            ├── belfast-sunset-*.hdr
            ├── *.webp / *.jpg
            └── water2.mp4, rays-2b.mp4
```

---

## How the Build Works (`build.js`)

1. Reads `raw_index.html` (original HTML from peachweb.io)
2. Extracts HTML from `<div id="pwb-body-wrap">` to `id="iee4h3-3-2"` anchor (sections 1 & 2 only)
3. Appends 4 closing `</div>` tags (mid-document cut leaves them unclosed)
4. Replaces all `https://files.peachworlds.com/website/` URLs with local `assets/` paths
5. **[scene-only]** Calls `removeById()` to delete UI elements from the HTML string
6. Writes a complete `index.html` with inline styles, CSS links, the cache shim, `script.js`, and processed body

---

## Critical: The `_pwLoadFileFromCache` Shim

The PeachWeb runtime (`191.script.js`) requires two globals before `script.js` executes:

```javascript
window._pwLoadFileFromCache = async function(url) { ... }
window._pwSetFileCache = function(url, data) { ... }
```

The router calls `_pwLoadFileFromCache` to load `ui-state.json`, scene state JSON, and all 3D assets.

**Must return a blob URL string** — not raw binary. The router fetches from the returned value and validates the `Content-Type` header. Returning an `ArrayBuffer` causes it to coerce to the string `"[object ArrayBuffer]"` and `fetch("[object ArrayBuffer]")` → 404 → empty content-type → crash.

**URL rewriting** — the runtime passes full CDN URLs (`https://files.peachworlds.com/website/{uuid}/{file}`), rewritten to `/cdn/website/{uuid}/{file}` for local serving.

```javascript
function _pwLocalUrl(url) {
  return typeof url === 'string'
    ? url.replace('https://files.peachworlds.com/website/', '/cdn/website/')
    : url;
}

window._pwLoadFileFromCache = async function(url) {
  const localUrl = _pwLocalUrl(url);
  const res = await fetch(localUrl);
  if (!res.ok) throw new Error('Failed to load asset: ' + localUrl);
  const blob = await res.blob();
  return URL.createObjectURL(blob); // blob URL preserves Content-Type
};

window._pwSetFileCache = function() {};
```

---

## How the Server Works (`server.js`)

Minimal Node.js `http` server, two rules:

1. `/cdn/website/*` → serves from `cdn/website/` with `Access-Control-Allow-Origin: *`
2. Everything else → serves from project root

MIME types manually mapped including `.glb`, `.hdr`, `.webp`, `.mp4`, `.ttf`.

---

## Scene-Only: How Elements Are Removed

`removeById(html, id)` in `build.js`:
1. Finds `id="TARGET"` in the HTML string
2. Walks back to opening `<` tag
3. Counts `<div` / `</div>` depth to find matching close tag
4. Slices both out

Elements removed (order matters — each removal shifts string offsets):

```javascript
const REMOVE_IDS = [
  'i54bq-2-2',   // hero text: "3D Websites in Minutes" + CTAs (fixed bottom-left)
  'ir9fo',       // main nav bar (logo + links + buttons)
  'icy7f',       // nav wrapper + all mobile overlay menus
  'i0gnr9t',     // Resources dropdown mobile overlay
  'i25h83e',     // Product dropdown mobile overlay
  'i27b3qz',     // Use Cases dropdown mobile overlay
  'iolnzn9',     // "W. Honors" Webflow badge (fixed right side)
  'i4qyc',       // "Scroll down & dive in" purple button (fixed bottom-right)
  'iawqb1g',     // scroll hint text
  'ilex4h',      // secondary hero copy (between hero and gallery)
];
```

CSS/JS hiding was tried first — failed because the PeachWeb runtime sets inline styles via JS after init, overriding `!important` stylesheet rules. Removing from HTML at build time is the only reliable approach.

---

## The 3D Scene

WebGL scene rendered by Three.js (`658.script.js`, ~1.7MB). Configured by `scene-state/a2be68de...json`.

48 objects total. Key ones:

| Name | Type | Notes |
|---|---|---|
| scene | SCENE | Root |
| 🔴 Main Camera | CAMERA | Perspective |
| HERO | GROUP | Main hero scene container |
| fish-RIG | GROUP | Animated clown fish |
| UNDERWORLD | GROUP | Below-water elements |
| BGS | GROUP | Background layers |
| Sphere ×2 | MESH | Crystal orbs — **already removed in scene-only** |
| Water ×2 | Water | Reflective water surface |
| particle | IMPORTED | Particle system |
| Cards | GROUP | 10× card5.glb floating cards |
| jelly / jelly2 ×3 | IMPORTED | Jellyfish |
| clown-5-v1 | IMPORTED | Clown fish model |

### Removing Scene Objects

```javascript
const fs = require('fs');
const path = 'scene-state/a2be68de-75b9-45eb-b89f-cac9fd6cde5c.json';
const scene = JSON.parse(fs.readFileSync(path, 'utf8'));
const es = scene.engineState;

const TARGET_IDS = ['full-uuid-of-object', ...];

TARGET_IDS.forEach(id => {
  delete es.pwObjects[id];
  delete es.parents[id];
});

// Also remove from the parent's children array:
const parentId = es.parents['TARGET_ID']; // get this before deleting
es.children[parentId] = es.children[parentId].filter(id => !TARGET_IDS.includes(id));

fs.writeFileSync(path, JSON.stringify(scene));
```

To list all objects and find their IDs:

```javascript
Object.entries(es.pwObjects).forEach(([id, obj]) => {
  console.log(id, '|', obj.type, '|', obj.name);
});
```

---

## Key HTML Element IDs (PeachWeb Builder Conventions)

| ID | Element |
|---|---|
| `ip9j` | Fixed full-screen WebGL canvas container — **never remove or hide this** |
| `iwq9` | `.pwb-scene` div where the canvas is injected |
| `i9wvtj` | Main content wrapper |
| `icy7f` | Nav outer container (fixed, z-index 999999999) |
| `ir9fo` | Actual nav bar (logo + links + CTA buttons) |
| `i2pjm` | Section 1 hero (100vh space) |
| `i54bq-2-2` | Hero text block — fixed bottom-left |
| `i58eb-2-2` | Inner hero wrapper (100dvh height) |
| `iolnzn9` | Webflow Honors badge (fixed right at 37dvh) |
| `i4qyc` | "Scroll down & dive in" button (fixed bottom-right) |
| `ilex4h` | Secondary hero section (between hero and gallery) |
| `ivkbm9` | Section 2 — gallery showcase |
| `iee4h3-3-2` | Anchor marking start of section 3 (build cut point) |

---

## Pitfalls — Save Yourself the Time

| What was tried | Why it failed | Fix |
|---|---|---|
| Opening `index.html` via `file://` | Browser blocks cross-origin resource loads | Local HTTP server required |
| CSS `!important` overrides to hide elements | Runtime sets inline styles via JS post-init, overrides stylesheets | Remove elements from HTML in build.js |
| MutationObserver to force-hide elements | Adds complexity, still a race condition | HTML removal at build time |
| `_pwLoadFileFromCache` returning `ArrayBuffer` | Router treats return value as a URL string → `"[object ArrayBuffer]"` → 404 | Return `URL.createObjectURL(blob)` |
| Loading `script.js` alone | It's a webpack entry that chunk-loads 5 more files | Download all chunks: 658, 191, 875, 928, 720 |
| Missing `error-page.html` | Runtime loads it when init fails, cascades into a second unrelated error masking the real one | Download from live site |

---

## Known Limitations / Open Items

- Hero background image (`f737228e` UUID, no extension) returns 403 from CDN — signed/protected. The WebGL scene renders anyway; this was a preload hint only.
- Mobile scene (`7a38b385...json`) downloaded but mobile assets not fully verified.
- Sections 3+ intentionally excluded (cut at `iee4h3-3-2` anchor).
- Nav dropdowns and CTA buttons are non-functional (links not local).
- The `scraping.md` in `peachweb-replica/` has the full narrative of every issue and fix in chronological order — good supplementary reading.
