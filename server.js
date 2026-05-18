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

http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

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
        'Cache-Control': 'public, max-age=3600',
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
