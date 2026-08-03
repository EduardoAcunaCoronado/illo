const { contextBridge, ipcRenderer } = require('electron');

// El localStorage del juego no sobrevive al reinicio: el servidor interno
// escucha en un puerto libre distinto cada vez, así que el origen cambia y el
// almacenamiento con él. Las opciones de Configuración se guardan en la carpeta
// de datos de la app (ver main.js) y se restauran aquí, en el preload, porque
// corre antes que los scripts de la página: game.js, engine.js y
// battle-minigame.js leen el localStorage y se lo encuentran ya puesto.
try {
    const settings = ipcRenderer.sendSync('settings:get-sync');
    for (const [key, value] of Object.entries(settings || {})) {
        window.localStorage.setItem(key, value);
    }
} catch (error) {
    console.error('No se han podido restaurar los ajustes:', error);
}

// Ajustes que cambian sin pasar por el panel: el modo de ventana también se
// toca con F11 o con el botón del marco. Se reflejan en el localStorage aquí
// mismo para que quien lo lea después vea el valor bueno, y se avisa al juego
// por si tiene el panel abierto.
const oyentes = new Set();
ipcRenderer.on('settings:changed', (_event, key, value) => {
    try {
        window.localStorage.setItem(key, value);
    } catch (error) {
        /* sin localStorage no hay nada que reflejar */
    }
    for (const oyente of oyentes) oyente(key, value);
});

// Canal deliberadamente limitado: cerrar la app y guardar ajustes conocidos.
// El renderizador no recibe acceso a APIs de Node ni de Electron.
contextBridge.exposeInMainWorld('desktopApp', {
    isPackaged: Boolean(ipcRenderer.sendSync('app:is-packaged-sync')),
    quit: () => ipcRenderer.send('app:quit'),
    setSetting: (key, value) => ipcRenderer.send('settings:set', key, value),
    onSettingChanged: (callback) => {
        oyentes.add(callback);
        return () => oyentes.delete(callback);
    },
});
