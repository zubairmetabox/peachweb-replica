const fs = require('fs');
const html = fs.readFileSync('c:/dev/peachweb-replica/raw_index.html', 'utf8');

const bodyStart = html.indexOf('<div id="pwb-body-wrap">');
const sec3Anchor = html.indexOf('id="iee4h3-3-2"');
let bodyContent = html.substring(bodyStart, sec3Anchor + 'id="iee4h3-3-2" class="pwb-anchor"></div>'.length);
bodyContent += '</div></div></div></div>';

const inlineStyleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
const inlineStyles = inlineStyleMatch ? inlineStyleMatch[1] : '';

const B = 'https://files.peachworlds.com/website';

const assetMap = {
  [`${B}/a47520b2-f76f-4ce3-a59d-33c060273915/logo1.svg`]: 'assets/images/logo1.svg',
  [`${B}/678083f3-005d-487d-97fe-c40890a0d58f/logo-dark2b.png`]: 'assets/images/logo-dark2b.png',
  [`${B}/0850309e-2955-4bfa-bee9-9905708c98d3/logo-dark.png`]: 'assets/images/logo-dark.png',
  [`${B}/e81e868d-3c18-4257-9045-9ae4208e1ba5/close-24dp-ffffff-fill0-wght400-grad0-opsz24.png`]: 'assets/images/close-icon.png',
  [`${B}/c81480c6-a8de-4439-a170-57902c230610/arrow-forward-24dp-000000-fill0-wght400-grad0-opsz24.png`]: 'assets/images/arrow-forward.png',
  [`${B}/acd16628-9855-4497-8326-ff416d8528f5/menu-2-.svg`]: 'assets/images/menu.svg',
  [`${B}/05ec2f83-43f3-48ec-b6e7-422402f230da/down-chevron-1.svg`]: 'assets/images/down-chevron.svg',
  [`${B}/e7a81e1a-3de9-4dd5-85fe-45a240f4c0ac/down-chevron-white.svg`]: 'assets/images/down-chevron-white.svg',
  [`${B}/52c10c19-2ae1-4151-adde-711178209d17/arrow-down.svg`]: 'assets/images/arrow-down.svg',
  [`${B}/e701a3ca-3f07-4441-9377-b85768884240/up-arrow2-dark.svg`]: 'assets/images/up-arrow2-dark.svg',
  [`${B}/61399ee3-0db7-43a9-a528-4212df5dbdc5/right-arrow-4-.svg`]: 'assets/images/right-arrow.svg',
  [`${B}/6d40a962-63ad-4633-b48c-4b9abc94b2ae/purple-blur2.png`]: 'assets/images/purple-blur2.png',
  [`${B}/7e400339-c348-4615-9965-e5c08e5cd758/gradient.png`]: 'assets/images/gradient.png',
  [`${B}/6ccb89f5-7f97-4ceb-9e81-5585043f90e7/white-hm.svg`]: 'assets/images/white-hm.svg',
  [`${B}/55ecd9fc-4e42-4174-be2c-644d070171d8/up-arrow2.svg`]: 'assets/images/up-arrow2.svg',
  [`${B}/2d026246-8840-4605-8709-5ae1c5331884/arrow-back-ios-24dp-000000-fill0-wght400-grad0-opsz24.png`]: 'assets/images/arrow-back.png',
  [`${B}/0dfb4187-7724-49c0-9bbf-344c65ac180a/ico-discord-dark.svg`]: 'assets/images/ico-discord.svg',
  [`${B}/24fc4340-3a63-42c4-bc8f-f800a77c7995/ico-yt-dark.svg`]: 'assets/images/ico-yt.svg',
  [`${B}/7605389c-ae92-416e-91dd-5f50f50d959d/ico-x-dark.svg`]: 'assets/images/ico-x.svg',
  [`${B}/77ab9212-9047-4f9c-9aee-d5a3e61ff38b/ico-linked-dark.svg`]: 'assets/images/ico-linkedin.svg',
  [`${B}/4a53b684-ddb0-43dc-a0e9-d06c31180aae/ico-insta-dark.svg`]: 'assets/images/ico-insta.svg',
  [`${B}/5684aa52-328a-44e6-af5f-eacdd8d96980/trex-1-.webp`]: 'assets/images/trex-thumb.webp',
  [`${B}/686b42ff-68a6-41c8-9693-7751306368f7/1.jpg`]: 'assets/images/gallery-1.jpg',
  [`${B}/3d6b79ab-8b82-4e23-8c6e-3ebefe82023d/bmw-thumb.webp`]: 'assets/images/bmw-thumb.webp',
  [`${B}/252daf85-de67-48f2-87a5-052b9ad2aecc/2.jpg`]: 'assets/images/gallery-2.jpg',
  [`${B}/90df31bc-b787-4bdd-8035-19a30e933aef/vexel.webp`]: 'assets/images/vexel-thumb.webp',
  [`${B}/f92157ef-9cfe-4b6b-93fd-8db1e40de92e/3.jpg`]: 'assets/images/gallery-3.jpg',
  [`${B}/49d00774-e325-4305-90aa-cb50b8f90f3c/hp.webp`]: 'assets/images/hp-thumb.webp',
  [`${B}/cbb8acd3-90f8-4420-8a11-9dd3b93ef7bd/6.jpg`]: 'assets/images/gallery-6.jpg',
  [`${B}/92e025d3-09c4-4e8e-bf23-6ecff1a93f83/surge.webp`]: 'assets/images/surge-thumb.webp',
  [`${B}/49527a07-20aa-49f7-8223-c8fc564f400c/5.jpg`]: 'assets/images/gallery-5.jpg',
  [`${B}/547bea63-d7a4-4141-b301-95637bdc82f1/garri-thumb.webp`]: 'assets/images/garri-thumb.webp',
  [`${B}/61d5b41b-0e88-4481-8a8b-e17e4924c6eb/8.jpg`]: 'assets/images/gallery-8.jpg',
  [`${B}/26d7c4fb-ae11-4fd2-b023-3c1fefc270d3/9.jpg`]: 'assets/images/gallery-9.jpg',
  [`${B}/513eae78-4212-44d0-a21d-45e32ea5edd0/w-.svg`]: 'assets/images/webflow-award.svg',
  [`${B}/fcfd2800-b50d-4775-9f34-693140840067/muzli3.svg`]: 'assets/images/muzli.svg',
  [`${B}/b917ff53-f4ea-4283-972c-36e13d97aba4/cube.webp`]: 'assets/images/cube.webp',
  [`${B}/40ab35c4-227a-403b-aa46-6dd39a84da1f/mindyhve.webp`]: 'assets/images/mindyhve.webp',
  [`${B}/1177eb3a-5261-402f-a4b5-6916a4813789/snkr.webp`]: 'assets/images/snkr.webp',
  [`${B}/b18486a0-d5d6-4cb2-a38a-008f1ca092e5/vxl1.webp`]: 'assets/images/vxl1.webp',
  [`${B}/3f9c55ff-8cee-4aaf-98e0-97d01dcdfe95/layout.webp`]: 'assets/images/layout.webp',
  [`${B}/07e43f7d-b120-43c6-bd4a-d2529f26387d/vxl.webp`]: 'assets/images/vxl.webp',
  [`${B}/70bec4e7-e914-41fe-88ea-10f21ab7064f/peachweb-builder.webp`]: 'assets/images/peachweb-builder.webp',
  [`${B}/0e5f237e-0e45-4db9-8798-8e340bff43f0/peachwebsitevideo-2b.mp4`]: 'assets/videos/hero-demo.mp4',
  [`${B}/dafa35d5-6840-4a22-b04f-70b7ff2df664/trex360.mp4`]: 'assets/videos/trex360.mp4',
  [`${B}/53661df7-32ab-4778-a555-6d4cb0a4c52a/bmw-360.mp4`]: 'assets/videos/bmw-360.mp4',
  [`${B}/dfa8f7cf-3568-4c21-9326-ddc3fa49b00e/vexel-360c.mp4`]: 'assets/videos/vexel-360c.mp4',
  [`${B}/87651fcd-de70-4c4b-a281-057d6a5c61ac/hp1.mp4`]: 'assets/videos/hp1.mp4',
  [`${B}/b680519c-4c23-4122-98d8-de182da038e0/surge-2.mp4`]: 'assets/videos/surge-2.mp4',
  [`${B}/2af6cb04-12f7-409b-ae21-e4f10221fe16/garri-360.mp4`]: 'assets/videos/garri-360.mp4',
  [`${B}/c9f9a490-5d2b-4f62-95c2-5d94e52e2d34/neuehaasdisplaylight.ttf`]: 'assets/fonts/neuehaasdisplaylight.ttf',
  [`${B}/16c65cb5-4775-4a9d-8308-12cfaea3c761/instrumentserif-regular.ttf`]: 'assets/fonts/instrumentserif-regular.ttf',
  [`${B}/fd64d257-136a-4dcd-b466-694abc6bdf40/instrumentserif-italic.ttf`]: 'assets/fonts/instrumentserif-italic.ttf',
  [`${B}/67ceb542-3b40-4b6f-a780-2744b8cef469/neuehaasdisplayroman.ttf`]: 'assets/fonts/neuehaasdisplayroman.ttf',
  [`${B}/00d102c8-63f7-42d6-a6dd-f900aed652bb/neuehaasdisplaymediu.ttf`]: 'assets/fonts/neuehaasdisplaymediu.ttf',
  '/website-base.css': 'assets/css/website-base.css',
  '/styles.css': 'assets/css/styles.css',
};

function replaceUrls(content) {
  let result = content;
  for (const [remote, local] of Object.entries(assetMap)) {
    result = result.split(remote).join(local);
  }
  return result;
}

const processedBody = replaceUrls(bodyContent);
const processedStyles = replaceUrls(inlineStyles);

const hoverScript = `
<script>
function initVideoHoverWrapper(wrapper) {
  const video = wrapper.querySelector(".hover-video");
  const poster = wrapper.querySelector(".video-poster");
  if (poster && poster.dataset.src && !poster.src) poster.src = poster.dataset.src;
  const playOnHover = () => {
    if (!video.src) { video.src = video.dataset.src; video.load(); setTimeout(() => video.play().catch(function(){}), 100); }
    else { video.play().catch(function(){}); }
    if (poster) poster.style.opacity = "0";
  };
  const pauseAndReset = () => {
    video.pause(); video.currentTime = 0;
    setTimeout(function() { if (poster) poster.style.opacity = "1"; }, 100);
  };
  if (!wrapper._hoverAttached) {
    wrapper.addEventListener("mouseenter", playOnHover);
    wrapper.addEventListener("mouseleave", pauseAndReset);
    wrapper._hoverAttached = true;
  }
}
document.addEventListener("DOMContentLoaded", function() {
  document.querySelectorAll(".video-hover-wrapper").forEach(initVideoHoverWrapper);
});
</script>`;

const output = `<!doctype html>
<html lang="en">
<head>
  <title>PeachWeb | Stunning Interactive 3D Websites Without Code</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="theme-color" content="#000000" />
  <link rel="icon" href="assets/images/logo1.svg" />
  <link href="assets/css/website-base.css" rel="stylesheet" />
  <link href="assets/css/styles.css" rel="stylesheet" />
  <link href="https://fonts.gstatic.com" rel="preconnect" crossorigin="" />
  <link href="https://fonts.googleapis.com" rel="preconnect" />
  <link href="https://fonts.googleapis.com/css?family=Inter:100,200,300,400,500,600,700,800,900&display=swap" rel="stylesheet" />
  <style>
${processedStyles}
  </style>
  <script>
    window._pwInitialPath = "/";

    // Rewrite files.peachworlds.com URLs to our local CDN proxy
    function _pwLocalUrl(url) {
      return typeof url === 'string'
        ? url.replace('https://files.peachworlds.com/website/', '/cdn/website/')
        : url;
    }

    // Intercept ALL fetch/XHR — including Three.js GLTFLoader direct fetches —
    // so files.peachworlds.com URLs are rewritten before they ever hit the network.
    (function() {
      var _fetch = window.fetch;
      window.fetch = function(input, init) {
        if (typeof input === 'string') input = _pwLocalUrl(input);
        else if (input && input.url) input = new Request(_pwLocalUrl(input.url), input);
        return _fetch.call(this, input, init);
      };
      var _xhrOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url) {
        if (typeof url === 'string') url = _pwLocalUrl(url);
        return _xhrOpen.apply(this, [method, url].concat(Array.prototype.slice.call(arguments, 2)));
      };
    })();

    // Required by the PeachWeb runtime (191.script.js).
    // Must return a blob URL string — the router fetches it and checks the Content-Type header.
    window._pwLoadFileFromCache = async function(url) {
      const localUrl = _pwLocalUrl(url);
      const res = await fetch(localUrl);
      if (!res.ok) throw new Error('Failed to load asset: ' + localUrl);
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    };
    window._pwSetFileCache = function() {};
  </script>
  <script defer fetchpriority="high" src="script.js"></script>
</head>
<body id="igpl">
${hoverScript}
${processedBody}


</body>
</html>`;

fs.writeFileSync('c:/dev/peachweb-fish/index.html', output);

const remaining = [...new Set((output.match(/https:\/\/files\.peachworlds\.com\/website\/[^"'\s)]+/g) || []))];
console.log('Written index.html (' + output.length + ' chars). Remaining remote URLs:', remaining.length);
remaining.forEach(function(u) { console.log(' -', u); });
