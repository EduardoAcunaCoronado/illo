#!/usr/bin/env node

const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const {
    DEV_SERVER_SERVICE,
    DEV_SERVER_PROTOCOL_VERSION,
    projectRootId,
    startServer,
} = require('../electron/static-server');
const { createEyeToolsController } = require('../electron/eye-tools-process');

const ROOT = path.resolve(__dirname, '..');
const ROOT_ID = projectRootId(ROOT);
const GAME_PORT = 8000;
const GAME_ORIGIN = `http://127.0.0.1:${GAME_PORT}`;
const openBrowser = process.argv.includes('--open-browser');
const checkOnly = process.argv.includes('--check');

let gameServer = null;
const eyeTools = createEyeToolsController(ROOT, { port: 8011 });
let cleanupPromise = null;
let terminating = false;

function checkGameOrigin(origin) {
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
        const deadline = setTimeout(() => finish(false), 700);

        request = http.get(`${origin}/api/dev-health`, (response) => {
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
                            payload.service === DEV_SERVER_SERVICE &&
                            payload.protocolVersion === DEV_SERVER_PROTOCOL_VERSION &&
                            payload.rootId === ROOT_ID,
                    );
                } catch (_error) {
                    finish(false);
                }
            });
        });
        request.on('error', () => finish(false));
    });
}

function launchBrowser(url) {
    let command;
    let args;
    if (process.platform === 'win32') {
        command = 'powershell.exe';
        args = ['-NoProfile', '-Command', 'Start-Process', url];
    } else if (process.platform === 'darwin') {
        command = 'open';
        args = [url];
    } else {
        command = 'xdg-open';
        args = [url];
    }
    const opener = spawn(command, args, {
        detached: true,
        windowsHide: true,
        stdio: 'ignore',
    });
    opener.unref();
}

function cleanup() {
    if (cleanupPromise) return cleanupPromise;
    cleanupPromise = (async () => {
        eyeTools.stop();
        if (gameServer) {
            const serverToClose = gameServer;
            gameServer = null;
            await serverToClose.close();
        }
    })();
    return cleanupPromise;
}

async function terminate(exitCode, error) {
    if (terminating) process.exit(exitCode);
    terminating = true;
    if (error) console.error(error.message || error);
    try {
        await cleanup();
    } catch (cleanupError) {
        console.error(cleanupError.message || cleanupError);
        exitCode = 1;
    }
    process.exit(exitCode);
}

// Se registran antes de iniciar nada: incluso un Ctrl+C durante el arranque
// cancela el Python en vuelo y cierra el servidor que ya se haya creado.
process.on('SIGINT', () => void terminate(0));
process.on('SIGTERM', () => void terminate(0));
process.on('uncaughtException', (error) => void terminate(1, error));
process.on('unhandledRejection', (error) => void terminate(1, error));

async function main() {
    let activeGameOrigin = GAME_ORIGIN;
    if (await checkGameOrigin(GAME_ORIGIN)) {
        console.log(`Juego ya activo para esta copia: ${GAME_ORIGIN}/`);
    } else {
        try {
            gameServer = await startServer(ROOT, {
                host: '127.0.0.1',
                port: GAME_PORT,
            });
            activeGameOrigin = gameServer.origin;
            console.log(`Juego: ${gameServer.origin}/`);
        } catch (error) {
            throw new Error(
                `El puerto ${GAME_PORT} ya pertenece a otro proceso o a otra copia del proyecto. ` +
                    'Ciérralo y vuelve a ejecutar start.bat.',
                { cause: error },
            );
        }
    }

    const tools = await eyeTools.ensure();
    if (!tools.ok) {
        const detail = tools.detail ? `\n${tools.detail}` : '';
        const explanation =
            tools.reason === 'port-occupied'
                ? 'El puerto 8011 pertenece a otro proceso o a otra copia del proyecto.'
                : `No se pudo iniciar Tools (${tools.reason}).`;
        throw new Error(`${explanation}${detail}`);
    }

    console.log(`Tools: ${tools.url}`);
    if (checkOnly) {
        await cleanup();
        await new Promise((resolve) => setTimeout(resolve, 600));
        console.log('Comprobación completada; los procesos creados para la prueba se han cerrado.');
        return;
    }

    console.log('Los dos servicios están listos. Pulsa Ctrl+C para cerrar los iniciados aquí.');
    if (openBrowser) launchBrowser(`${activeGameOrigin}/`);
}

main().catch((error) => void terminate(1, error));
