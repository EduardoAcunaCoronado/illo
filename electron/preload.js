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

// Canal deliberadamente limitado: cerrar la app y guardar un ajuste conocido.
// El renderizador no recibe acceso a APIs de Node ni de Electron.
contextBridge.exposeInMainWorld('desktopApp', {
    quit: () => ipcRenderer.send('app:quit'),
    setSetting: (key, value) => ipcRenderer.send('settings:set', key, value),
});
