const { app, BrowserWindow, shell, screen, ipcMain } = require('electron');
const fs = require('fs');
const { startServer } = require('./static-server');

// La raíz del juego (index.html y compañía). En desarrollo es la carpeta del
// proyecto; empaquetado es resources/app, porque el build va sin asar.
const ROOT = app.getAppPath();

const DESIGN_W = 1280;
const DESIGN_H = 720;

// La app es un reproductor de la novela: el tema del menú debe poder empezar
// al abrir la ventana, sin esperar un clic como ocurre en un navegador normal.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let server = null;
let mainWindow = null;

// El candado de instancia única es un archivo dentro de la carpeta de datos,
// que Electron no crea hasta el "ready". En la primerísima ejecución todavía no
// existe, así que el candado fallaría y la app se cerraría sin decir nada.
fs.mkdirSync(app.getPath('userData'), { recursive: true });

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
        autoHideMenuBar: true,
        show: false,
        webPreferences: {
            // El juego es HTML/JS puro: no necesita Node en el render.
            nodeIntegration: false,
            contextIsolation: true,
            preload: require('path').join(__dirname, 'preload.js'),
            backgroundThrottling: false,
        },
    });

    mainWindow.setMenuBarVisibility(false);
    mainWindow.once('ready-to-show', () => mainWindow.show());
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Los enlaces externos se abren en el navegador, no dentro del juego.
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // F11 pantalla completa, F12 devtools, Ctrl+R recargar.
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.type !== 'keyDown') return;
        const key = (input.key || '').toLowerCase();
        if (key === 'f11') {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
            event.preventDefault();
        } else if (key === 'f12') {
            mainWindow.webContents.toggleDevTools();
            event.preventDefault();
        } else if (key === 'r' && input.control) {
            mainWindow.webContents.reloadIgnoringCache();
            event.preventDefault();
        }
    });

    mainWindow.loadURL(`${server.origin}/index.html`);
}

// Canal deliberadamente limitado para que el botÃ³n Salir del juego cierre la
// aplicaciÃ³n sin dar al renderizador acceso a APIs de Node/Electron.
ipcMain.on('app:quit', () => app.quit());

app.whenReady().then(async () => {
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
