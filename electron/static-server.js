// Servidor estático interno para la app de Electron.
//
// El juego se escribió contra http://localhost:8000 (start.bat) y usa fetch()
// para los JSON de chapters/ y characters/, además de vídeo y audio que
// necesitan peticiones Range para poder buscar dentro del archivo. Con file://
// nada de eso funciona, así que la app levanta este servidor en 127.0.0.1 con
// un puerto libre y carga la ventana desde ahí: el comportamiento es idéntico
// al del navegador, sin tocar una línea del juego.

const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
};

function mimeFor(filePath) {
    return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

// Traduce la URL a una ruta dentro de root, o null si intenta salirse de ahí.
function resolveInside(root, urlPath) {
    let decoded;
    try {
        decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
    } catch (error) {
        return null;
    }
    if (decoded === '/' || decoded === '') decoded = '/index.html';

    const resolved = path.resolve(root, '.' + decoded);
    const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
    if (resolved !== root && !resolved.startsWith(rootWithSep)) return null;
    return resolved;
}

function sendError(res, status) {
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(String(status));
}

const IMMUTABLE_ASSET_EXTENSIONS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico',
    '.mp4', '.webm', '.mp3', '.ogg', '.wav', '.m4a',
    '.woff', '.woff2', '.ttf', '.otf',
]);

function cachePolicyFor(filePath) {
    // Los assets llevan una versión estable por sesión. Se pueden conservar
    // agresivamente: al editar y recargar, el juego genera otra URL. HTML, JS,
    // CSS y JSON se revalidan para mantener cómodo el desarrollo local.
    return IMMUTABLE_ASSET_EXTENSIONS.has(path.extname(filePath).toLowerCase())
        ? 'public, max-age=31536000, immutable'
        : 'no-cache';
}

function serveFile(req, res, filePath, stat) {
    const size = stat.size;
    const etag = `W/"${size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
    const headers = {
        'Content-Type': mimeFor(filePath),
        'Accept-Ranges': 'bytes',
        'Cache-Control': cachePolicyFor(filePath),
        'ETag': etag,
        'Last-Modified': stat.mtime.toUTCString(),
    };

    const range = req.headers.range;
    const match = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (match) {
        let start = match[1] === '' ? null : parseInt(match[1], 10);
        let end = match[2] === '' ? null : parseInt(match[2], 10);

        if (start === null && end === null) return sendError(res, 416);
        if (start === null) {
            // "bytes=-500": los últimos 500 bytes.
            start = Math.max(0, size - end);
            end = size - 1;
        } else if (end === null || end >= size) {
            end = size - 1;
        }
        if (start > end || start >= size) {
            res.writeHead(416, { 'Content-Range': `bytes */${size}` });
            return res.end();
        }

        headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
        headers['Content-Length'] = end - start + 1;
        res.writeHead(206, headers);
        if (req.method === 'HEAD') return res.end();
        return fs.createReadStream(filePath, { start, end }).pipe(res);
    }

    if (req.headers['if-none-match'] === etag) {
        res.writeHead(304, headers);
        return res.end();
    }

    headers['Content-Length'] = size;
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
}

// Arranca el servidor sobre `root` y resuelve con { origin, close }.
function startServer(rootDir) {
    // Normalizado para que la comprobación anti-traversal compare rutas del
    // mismo formato (en Windows, con las barras que use el sistema).
    const root = path.resolve(rootDir);

    return new Promise((resolve, reject) => {
        const server = http.createServer(async (req, res) => {
            if (req.method !== 'GET' && req.method !== 'HEAD') {
                return sendError(res, 405);
            }

            const filePath = resolveInside(root, req.url || '/');
            if (!filePath) return sendError(res, 403);

            try {
                const stat = await fsp.stat(filePath);
                if (stat.isDirectory()) {
                    const index = path.join(filePath, 'index.html');
                    const indexStat = await fsp.stat(index);
                    return serveFile(req, res, index, indexStat);
                }
                serveFile(req, res, filePath, stat);
            } catch (error) {
                // ENOENT puede ser normal: game.js usa el primer 404 como
                // respaldo si el catálogo de capítulos no marca uno como final.
                sendError(res, error.code === 'ENOENT' ? 404 : 500);
            }
        });

        server.on('error', reject);
        // Puerto 0 = el sistema elige uno libre. Solo escucha en loopback.
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            resolve({
                origin: `http://127.0.0.1:${port}`,
                close: () => new Promise((done) => server.close(done)),
            });
        });
    });
}

module.exports = { startServer };
