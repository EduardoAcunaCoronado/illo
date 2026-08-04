const http = require('http');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');
const { projectRootId } = require('./static-server');

const SERVICE_NAME = 'project-airi-eye-tools';
const PROTOCOL_VERSION = 1;

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestHealth(port, expectedRootId, timeoutMs = 700) {
    return new Promise((resolve) => {
        let settled = false;
        let request = null;
        const finish = (value) => {
            if (settled) return;
            settled = true;
            clearTimeout(deadline);
            if (!value && request && !request.destroyed) request.destroy();
            resolve(value);
        };
        const deadline = setTimeout(() => finish(false), timeoutMs);

        request = http.get(
            {
                hostname: '127.0.0.1',
                port,
                path: '/api/health',
                headers: { Accept: 'application/json' },
            },
            (response) => {
                let body = '';
                response.setEncoding('utf8');
                response.on('data', (chunk) => {
                    if (body.length + chunk.length > 4096) {
                        response.destroy();
                        finish(false);
                        return;
                    }
                    body += chunk;
                });
                response.on('end', () => {
                    try {
                        const payload = JSON.parse(body);
                        finish(
                            response.statusCode === 200 &&
                                payload.ok === true &&
                                payload.service === SERVICE_NAME &&
                                payload.protocolVersion === PROTOCOL_VERSION &&
                                payload.rootId === expectedRootId,
                        );
                    } catch (_error) {
                        finish(false);
                    }
                });
            },
        );
        request.on('error', () => finish(false));
    });
}

function portIsOpen(port, timeoutMs = 450) {
    return new Promise((resolve) => {
        const socket = net.createConnection({ host: '127.0.0.1', port });
        let settled = false;
        const finish = (open) => {
            if (settled) return;
            settled = true;
            socket.destroy();
            resolve(open);
        };
        socket.setTimeout(timeoutMs);
        socket.once('connect', () => finish(true));
        socket.once('timeout', () => finish(false));
        socket.once('error', () => finish(false));
    });
}

function spawnCandidate(command, args, rootDir) {
    return new Promise((resolve) => {
        const child = spawn(command, args, {
            cwd: rootDir,
            shell: false,
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let settled = false;
        child.once('spawn', () => {
            settled = true;
            resolve(child);
        });
        child.once('error', (error) => {
            if (!settled) resolve({ error });
        });
    });
}

function createEyeToolsController(rootDir, options = {}) {
    const root = path.resolve(rootDir);
    const port = Number.isInteger(options.port) ? options.port : 8011;
    const script = path.join(root, 'scripts', 'build_character_eye_layers.py');
    const toolsUrl = `http://127.0.0.1:${port}/tools`;
    const rootId = projectRootId(root);
    let ownedProcess = null;
    let startPromise = null;
    let stderr = '';
    let stopping = false;
    let generation = 0;

    async function spawnPython() {
        const baseArgs = [script, '--serve', '--port', String(port)];
        const candidates =
            process.platform === 'win32'
                ? [
                      ['python', baseArgs],
                      ['py', ['-3', ...baseArgs]],
                  ]
                : [
                      ['python3', baseArgs],
                      ['python', baseArgs],
                  ];

        let startedAny = false;
        for (const [command, args] of candidates) {
            const result = await spawnCandidate(command, args, root);
            if (!result || result.error) continue;

            const child = result;
            startedAny = true;
            child.stdout.on('data', () => {});
            child.stderr.on('data', (chunk) => {
                stderr = (stderr + chunk.toString('utf8')).slice(-3000);
            });

            // Algunos alias de Python llegan a emitir `spawn` y fallan justo
            // después (intérprete roto o dependencias ausentes). En ese caso
            // se prueba el siguiente candidato en vez de darlo por válido.
            await Promise.race([new Promise((resolve) => child.once('exit', resolve)), wait(450)]);
            if (stopping) {
                if (child.exitCode === null) child.kill();
                return { child: null, startedAny };
            }
            if (child.exitCode === null) return { child, startedAny };
        }
        return { child: null, startedAny };
    }

    async function ensure() {
        if (stopping) return { ok: false, reason: 'stopped', url: toolsUrl };

        if (await requestHealth(port, rootId)) {
            if (stopping) return { ok: false, reason: 'stopped', url: toolsUrl };
            return { ok: true, started: false, url: toolsUrl };
        }
        if (stopping) return { ok: false, reason: 'stopped', url: toolsUrl };
        if (startPromise) return startPromise;

        const currentGeneration = ++generation;
        startPromise = (async () => {
            const occupied = await portIsOpen(port);
            if (stopping || currentGeneration !== generation) {
                return { ok: false, reason: 'stopped', url: toolsUrl };
            }
            if (occupied) {
                return { ok: false, reason: 'port-occupied', url: toolsUrl };
            }

            stderr = '';
            const spawned = await spawnPython();
            const child = spawned.child;
            if (stopping || currentGeneration !== generation) {
                if (child && !child.error && child.exitCode === null) child.kill();
                return { ok: false, reason: 'stopped', url: toolsUrl };
            }
            if (!child) {
                return {
                    ok: false,
                    reason: spawned.startedAny ? 'start-failed' : 'python-unavailable',
                    detail: stderr.trim().slice(-800),
                    url: toolsUrl,
                };
            }

            ownedProcess = child;
            child.once('exit', () => {
                if (ownedProcess === child) ownedProcess = null;
            });

            const startupDeadline = Date.now() + 10000;
            while (Date.now() < startupDeadline) {
                const healthy = await requestHealth(port, rootId, 200);
                if (stopping || currentGeneration !== generation) {
                    if (child.exitCode === null) child.kill();
                    return { ok: false, reason: 'stopped', url: toolsUrl };
                }
                if (healthy) {
                    return { ok: true, started: true, url: toolsUrl };
                }
                if (child.exitCode !== null) break;
                await wait(Math.min(100, Math.max(0, startupDeadline - Date.now())));
            }

            if (child.exitCode === null) child.kill();
            return {
                ok: false,
                reason: 'start-failed',
                detail: stderr.trim().slice(-800),
                url: toolsUrl,
            };
        })();

        try {
            return await startPromise;
        } finally {
            startPromise = null;
        }
    }

    function stop() {
        stopping = true;
        generation += 1;
        if (ownedProcess && ownedProcess.exitCode === null && !ownedProcess.killed) {
            ownedProcess.kill();
        }
        ownedProcess = null;
    }

    return {
        ensure,
        stop,
        isHealthy: () => requestHealth(port, rootId),
        port,
        toolsUrl,
        rootId,
    };
}

module.exports = {
    SERVICE_NAME,
    PROTOCOL_VERSION,
    createEyeToolsController,
};
