const { app, BrowserWindow, Menu, shell, screen, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { startServer } = require('./static-server');

// La raíz del juego (index.html y compañía). En desarrollo es la carpeta del
// proyecto; empaquetado es resources/app, porque el build va sin asar.
const ROOT = app.getAppPath();

const DESIGN_W = 1280;
const DESIGN_H = 720;

const ES_MAC = process.platform === 'darwin';

// La app es un reproductor de la novela: el tema del menú debe poder empezar
// al abrir la ventana, sin esperar un clic como ocurre en un navegador normal.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Windows compone el vídeo en una capa aparte (DirectComposition) y ahí aplica
// DOS VECES el escalado de object-fit: el opening y las cutscenes se pintaban a
// dos tercios de su tamaño, pegados a la esquina superior izquierda, con el
// resto de la ventana en negro. Sin esa capa, el vídeo se dibuja con el resto
// de la página y ocupa lo que le toca.
app.commandLine.appendSwitch('disable-direct-composition-video-overlays');

let server = null;
let mainWindow = null;

// El candado de instancia única es un archivo dentro de la carpeta de datos,
// que Electron no crea hasta el "ready". En la primerísima ejecución todavía no
// existe, así que el candado fallaría y la app se cerraría sin decir nada.
fs.mkdirSync(app.getPath('userData'), { recursive: true });

// ===== Ajustes persistentes =====
// El servidor interno escucha en un puerto libre, distinto en cada arranque, así
// que el origen del juego cambia y su localStorage empieza vacío: las opciones
// de Configuración se perdían al cerrar la app. Aquí se guardan aparte, en la
// carpeta de datos de la aplicación, y el preload las devuelve al localStorage
// antes de que corra una sola línea del juego.
//
// La lista de claves es cerrada a propósito: el renderizador solo puede escribir
// estos ajustes, no usar el archivo como almacén libre.
const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');
const SETTINGS_KEYS = new Set([
    'illo_vol_music',
    'illo_vol_sfx',
    'illo_kosai',
    'illo_text_blip',
    'illo_window_mode',
]);

// Modo de ventana: la app abre a pantalla completa salvo que se haya elegido
// "Ventana". Es el único ajuste que además de guardarse hace algo aquí.
const WINDOW_MODES = new Set(['fullscreen', 'window']);
const WINDOW_MODE_KEY = 'illo_window_mode';

function loadSettings() {
    try {
        const saved = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
        return Object.fromEntries(
            Object.entries(saved).filter(
                ([key, value]) => SETTINGS_KEYS.has(key) && typeof value === 'string',
            ),
        );
    } catch (error) {
        // Todavía no hay archivo (primer arranque) o está corrupto: valores por defecto.
        return {};
    }
}

function saveSettings(settings) {
    try {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings), 'utf8');
    } catch (error) {
        console.error('No se han podido guardar los ajustes:', error);
    }
}

// Síncrono a propósito: el preload lo pide antes de cargar la página, y así el
// juego se encuentra el localStorage ya puesto en vez de tener que esperar.
ipcMain.on('settings:get-sync', (event) => {
    event.returnValue = loadSettings();
});

function storeSetting(key, value) {
    if (!SETTINGS_KEYS.has(key) || typeof value !== 'string') return;
    if (key === WINDOW_MODE_KEY && !WINDOW_MODES.has(value)) return;
    const settings = loadSettings();
    if (settings[key] === value) return;
    settings[key] = value;
    saveSettings(settings);
}

function windowMode() {
    const mode = loadSettings()[WINDOW_MODE_KEY];
    return WINDOW_MODES.has(mode) ? mode : 'fullscreen';
}

ipcMain.on('settings:set', (event, key, value) => {
    storeSetting(key, value);
    // El modo de ventana no solo se guarda: se aplica al momento. El cambio de
    // verdad lo confirman los eventos enter/leave-full-screen de la ventana.
    if (key === WINDOW_MODE_KEY && mainWindow && WINDOW_MODES.has(value)) {
        mainWindow.setFullScreen(value === 'fullscreen');
    }
});

// Una sola instancia: si se abre otra, se enfoca la ventana que ya existe.
if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (!mainWindow) return;
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    });
}

// La barra de menú de macOS es global: `autoHideMenuBar` no la afecta y, sin un
// menú propio, la app sale con el de ejemplo de Electron ("Learn More" y
// compañía). Se deja el mínimo, que además es de donde macOS saca los atajos
// del sistema: sin menú no funcionarían ni Cmd+Q ni Cmd+H.
function configurarMenu() {
    if (!ES_MAC) {
        Menu.setApplicationMenu(null);
        return;
    }
    Menu.setApplicationMenu(
        Menu.buildFromTemplate([
            { role: 'appMenu' },
            {
                label: 'Ventana',
                submenu: [
                    // Trae el atajo estándar de macOS, Ctrl+Cmd+F, y dispara los
                    // mismos eventos de ventana que el resto de vías.
                    { role: 'togglefullscreen' },
                    { role: 'minimize' },
                ],
            },
        ]),
    );
}

function createWindow() {
    // Si la pantalla es pequeña, se abre una ventana proporcional que quepa.
    const work = screen.getPrimaryDisplay().workAreaSize;
    const scale = Math.min(1, work.width / DESIGN_W, (work.height - 40) / DESIGN_H);

    mainWindow = new BrowserWindow({
        // Medidas del área de dibujo, no del marco: así el 16:9 es exacto y no
        // salen bandas negras nada más abrir.
        useContentSize: true,
        width: Math.round(DESIGN_W * scale),
        height: Math.round(DESIGN_H * scale),
        minWidth: 640,
        minHeight: 360,
        backgroundColor: '#000000',
        // El título largo va aquí, no en "productName" del package.json: ese
        // nombre lo usa Electron como carpeta en %APPDATA% y los dos puntos
        // son ilegales en rutas de Windows (la app no arrancaría).
        title: 'Project AI.ri: Transfurmados',
        // Ancho y alto de arriba son el tamaño al salir de pantalla completa.
        fullscreen: windowMode() === 'fullscreen',
        autoHideMenuBar: true,
        show: false,
        webPreferences: {
            // El juego es HTML/JS puro: no necesita Node en el render.
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            backgroundThrottling: false,
        },
    });

    mainWindow.setMenuBarVisibility(false);
    mainWindow.once('ready-to-show', () => mainWindow.show());
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // La ventana es la fuente de la verdad: se anota el modo y se avisa al
    // juego venga el cambio de donde venga (el desplegable de Configuración,
    // F11 o el botón del marco), para que el desplegable no quede desfasado.
    const anotarModo = (mode) => {
        storeSetting(WINDOW_MODE_KEY, mode);
        mainWindow.webContents.send('settings:changed', WINDOW_MODE_KEY, mode);
    };
    mainWindow.on('enter-full-screen', () => anotarModo('fullscreen'));
    mainWindow.on('leave-full-screen', () => anotarModo('window'));

    // Los enlaces externos se abren en el navegador, no dentro del juego.
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // F11 pantalla completa, F12 devtools, Ctrl+R recargar. En macOS los atajos
    // son otros: F11 y F12 los tiene cogidos el sistema, así que allí valen
    // Cmd+R y Cmd+Alt+I, y la pantalla completa la pone el menú (Ctrl+Cmd+F).
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.type !== 'keyDown') return;
        const key = (input.key || '').toLowerCase();
        const mod = ES_MAC ? input.meta : input.control;

        if (!ES_MAC && key === 'f11') {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
        } else if (!ES_MAC && key === 'f12') {
            mainWindow.webContents.toggleDevTools();
        } else if (ES_MAC && mod && input.alt && input.code === 'KeyI') {
            // Con Alt pulsado macOS convierte la "i" en una tecla muerta, así
            // que hay que mirar la tecla física y no el carácter que produce.
            mainWindow.webContents.toggleDevTools();
        } else if (mod && key === 'r') {
            mainWindow.webContents.reloadIgnoringCache();
        } else {
            return;
        }
        event.preventDefault();
    });

    mainWindow.loadURL(`${server.origin}/index.html`);
}

// Canal deliberadamente limitado para que el botÃ³n Salir del juego cierre la
// aplicaciÃ³n sin dar al renderizador acceso a APIs de Node/Electron.
ipcMain.on('app:quit', () => app.quit());

app.whenReady().then(async () => {
    configurarMenu();
    server = await startServer(ROOT);
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async () => {
    if (server) await server.close();
});
