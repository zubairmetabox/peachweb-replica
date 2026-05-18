# Scraping peachweb.io — Full Process Documentation

Local replica of the first two sections of https://peachweb.io/

---

## Goal

Download the homepage of peachweb.io and serve it fully locally — all assets included, no runtime calls to the live server. Target: first two sections (hero + gallery).

---

## Stack

- Node.js HTTP server (`server.js`)
- curl for asset downloading
- PeachWeb's own builder JS runtime (webpack chunks)

---

## Step 1 — Fetch the Raw HTML

Used `curl` to download the raw HTML instead of `WebFetch` (which only returns extracted text, no structure):

```bash
curl -s -L "https://peachweb.io/" -o raw_index.html
```

The page is a **SPA built on the PeachWeb no-code builder**. All HTML is server-rendered upfront — no client-side hydration skeleton. The full DOM is in the HTML. Content is structured around cryptic builder-generated IDs (`#i2pjm`, `#ivkbm9`, etc.).

---

## Step 2 — Understand the Structure

Key layout (all on one minified line in the HTML):

```
#pwb-body-wrap
  #ip9j (.pwb-background)       ← fixed full-screen WebGL canvas background
  #i9wvtj                       ← main content wrapper
    #icy7f                      ← fixed nav container
      #ir9fo                    ← actual nav bar
    #iolnzn9                    ← scroll indicator
    #i2pjm                      ← SECTION 1: Hero ("3D Websites in Minutes")
    #iee4h3-4 (.pwb-anchor)
    #ilex4h                     ← secondary hero layout
    #iee4h3-3 (.pwb-anchor)
    #ivkbm9                     ← SECTION 2: Gallery showcase
    #iee4h3-3-2 (.pwb-anchor)   ← start of section 3 (cut point)
```

Used Node.js to find byte offsets of each anchor and extract sections 1 & 2 cleanly.

---

## Step 3 — Download Static Assets

### CSS
- `/website-base.css` — base reset (1KB)
- `/styles.css` — full builder styles keyed by element IDs (253KB)

### Custom Fonts (from `files.peachworlds.com`)
- `neuehaasdisplayroman.ttf`
- `neuehaasdisplaylight.ttf`
- `neuehaasdisplaymediu.ttf`
- `instrumentserif-regular.ttf`
- `instrumentserif-italic.ttf`

### Images
All nav icons, logos, gallery thumbnails, award logos — 44 files total.

### Videos
Hero demo video + 6 gallery hover videos (hover-to-play cards in section 2).

### 3D Scene Assets (added later)
- 6× `.glb` model files (particle system, clown fish, jelly, frame, card, sphere)
- 2× `.hdr` environment maps (Kloofendal, Belfast Sunset)
- 16× texture `.webp`/`.jpg` files
- 2× video textures (water, rays)

---

## Step 4 — Build `index.html`

Wrote `build.js` — a Node.js script that:
1. Reads `raw_index.html`
2. Extracts the HTML from `#pwb-body-wrap` up to the `#iee4h3-3-2` anchor
3. Replaces all `https://files.peachworlds.com/website/` URLs with local paths
4. Injects CSS, fonts, scripts, and the cache shim
5. Writes `index.html`

**Pitfall — div balance:** Cutting the HTML mid-document left 4 unclosed `</div>` tags. Fixed by appending them manually after measuring the open/close count.

**Pitfall — hero background image access denied:** The preloaded hero background (`f737228e...`) returned `403 Access Denied` from the CDN. It's signed/protected. Worked around with the gradient background.

---

## Step 5 — Local HTTP Server

**Pitfall — `file://` protocol blocked:** Opening `index.html` directly in the browser throws:

```
Unsafe attempt to load URL file:///...
'file:' URLs are treated as unique security origins.
```

Browsers block cross-origin resource loads (CSS, fonts, JS) from `file://`. A local HTTP server is required.

**Fix:** Wrote `server.js` — a minimal Node.js `http` server serving the project root on port 4200.

---

## Pitfall Chain — The JS Runtime

The site's CSS is entirely driven by the PeachWeb builder JS runtime. Without it:

- All elements have initial CSS states of `display: none` or `opacity: 0`
- The hero text is `position: fixed` but parents may be hidden
- The 3D canvas background doesn't render → white/black screen

### Attempt 1 — Pure CSS overrides (failed)

Tried injecting CSS overrides (`#igpl { background: #000 !important }`, etc.) to force elements visible. Result: **black screen** — the text is white, many elements are `display: none` waiting for JS state changes.

### Attempt 2 — Load `script.js` (partial)

Downloaded `script.js` from peachweb.io and included it. New error:

```
GET http://localhost:4200/658.script.js 404 (Not Found)
ChunkLoadError: Loading chunk 658 failed.
```

**Cause:** `script.js` is a webpack entry point that lazy-loads 5 additional chunks. The chunk filename format is `{id}.script.js`.

**Fix:** Parsed the bundle to find all `u.e(chunkId)` calls — found IDs `658, 191, 875, 928, 720` — and downloaded each:

```bash
for id in 658 191 875 928 720; do
  curl -s "https://peachweb.io/${id}.script.js" -o "${id}.script.js"
done
```

### Attempt 3 — Chunks loaded, new error

```
Router initialization error: Error: Load file from cache function missing.
  at 191.script.js:1:532
```

**Cause:** Found in `191.script.js`:

```javascript
function o(e) {
  if (!window._pwLoadFileFromCache)
    throw new Error("Load file from cache function missing.");
  return yield window._pwLoadFileFromCache(e);
}
function a(e, t) {
  window._pwSetFileCache && window._pwSetFileCache(e, t);
}
```

The PeachWeb runtime requires two global functions to be defined before initialization:
- `window._pwLoadFileFromCache(url)` — load a file (used for scene state, 3D assets, etc.)
- `window._pwSetFileCache(url, data)` — cache a loaded file

These are normally provided by their server infrastructure (likely a service worker).

**Fix:** Implemented the shim in `index.html` before `script.js` loads:

```javascript
window._pwLoadFileFromCache = async function(url) { ... };
window._pwSetFileCache = function() {};
```

### Attempt 4 — Cache shim returns ArrayBuffer (wrong)

First implementation returned `res.arrayBuffer()`. New error:

```
GET http://localhost:4200/[object%20ArrayBuffer] 404 (Not Found)
Router initialization error: Error: Unexpected content type "" for "/ui-state.json"
```

**Cause:** The router uses the return value of `_pwLoadFileFromCache` as a **URL string** — it fetches from it and inspects the `Content-Type` header. Returning a raw `ArrayBuffer` causes JavaScript to coerce it to the string `"[object ArrayBuffer]"`, which becomes the fetch target → 404 → empty content-type.

**Fix:** Return a `blob:` URL instead:

```javascript
window._pwLoadFileFromCache = async function(url) {
  const localUrl = _pwLocalUrl(url);
  const res = await fetch(localUrl);
  if (!res.ok) throw new Error('Failed to load asset: ' + localUrl);
  const blob = await res.blob();
  return URL.createObjectURL(blob); // ← blob URL preserves Content-Type
};
```

`URL.createObjectURL(blob)` returns a `blob:http://localhost:4200/xxx` URL. When the runtime fetches that, it gets back the correct `Content-Type` (`application/json` for JSON files, `model/gltf-binary` for GLBs, etc.).

### Attempt 5 — 3D assets not found locally

```
GET http://localhost:4200/[object%20ArrayBuffer] 404
```

The 3D assets (GLB models, HDR environments, textures) are hosted at `https://files.peachworlds.com/website/{uuid}/{filename}`. The runtime passes these full URLs to `_pwLoadFileFromCache`.

**Fix — two-part:**

1. **URL rewriting in the shim:** Rewrote CDN URLs to local paths:
   ```javascript
   function _pwLocalUrl(url) {
     return url.replace(
       'https://files.peachworlds.com/website/',
       '/cdn/website/'
     );
   }
   ```

2. **Downloaded all assets referenced in the scene state JSON** (`scene-state/a2be68de...json`):
   - 6 GLB models
   - 2 HDR environment maps
   - 16 texture images
   - 2 video textures (water, rays)

3. **Updated `server.js`** to serve `/cdn/website/*` from the local `cdn/website/` folder with `Access-Control-Allow-Origin: *` headers.

### Final error — missing error page

```
GET http://localhost:4200/error-page.html 404
GET http://localhost:4200/error-page-styles.css 404
```

The runtime tries to load its own error page when initialization fails. The missing files caused a secondary error cascade on top of the original one, masking the real issue.

**Fix:** Downloaded both from the live site:

```bash
curl -s "https://peachweb.io/error-page.html" -o error-page.html
curl -s "https://peachweb.io/error-page-styles.css" -o error-page-styles.css
```

---

## Final File Structure

```
peachweb-replica/
├── index.html                  ← generated by build.js
├── build.js                    ← build script (run to regenerate index.html)
├── server.js                   ← local HTTP server on port 4200
├── raw_index.html              ← original downloaded HTML (source)
├── script.js                   ← PeachWeb builder runtime entry
├── 658.script.js               ← Three.js + 3D engine (~1.7MB)
├── 720.script.js               ← Router
├── 928.script.js               ← UI/builder logic
├── 191.script.js               ← Cache interface module
├── 875.script.js               ← Misc utilities
├── ui-state.json               ← Page UI configuration
├── error-page.html             ← Runtime error fallback
├── error-page-styles.css
├── scene-state/
│   ├── a2be68de...json         ← Desktop 3D scene configuration
│   └── 7a38b385...json         ← Mobile 3D scene configuration
├── assets/
│   ├── css/
│   │   ├── styles.css          ← All element styles (253KB)
│   │   └── website-base.css
│   ├── fonts/                  ← 5 custom typefaces
│   ├── images/                 ← 44 images (logos, icons, thumbnails)
│   └── videos/                 ← 7 MP4s (hero demo + gallery hover videos)
└── cdn/
    └── website/
        └── {uuid}/             ← 3D assets keyed by UUID
            ├── *.glb           ← 3D models
            ├── *.hdr           ← Environment maps
            ├── *.webp / *.jpg  ← Textures
            └── *.mp4           ← Video textures
```

---

## Running Locally

```bash
cd peachweb-replica
node server.js
# Open http://localhost:4200
```

To regenerate `index.html` (e.g. after tweaking `build.js`):

```bash
node build.js
```

---

## Key Lessons

| Problem | Root Cause | Fix |
|---|---|---|
| `file://` CORS errors | Browser security origin model | Local HTTP server |
| Blank white page | CSS driven by JS state machine | Must load the builder JS runtime |
| `ChunkLoadError` | Webpack code splitting | Download all chunk files |
| `Load file from cache function missing` | Runtime expects `window._pwLoadFileFromCache` | Implement the shim before script.js loads |
| `[object ArrayBuffer]` 404 | Shim returned binary data instead of a URL | Return `URL.createObjectURL(blob)` |
| `Unexpected content type ""` | Consequence of ArrayBuffer-as-URL (404 → no content-type) | Fixed by blob URL fix above |
| 3D assets 404 | CDN URLs not rewritten | URL rewrite shim + local CDN folder |
| Error cascade on load failure | `error-page.html` missing | Download error page from live site |
