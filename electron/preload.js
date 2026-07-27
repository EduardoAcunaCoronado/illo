const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApp', {
    quit: () => ipcRenderer.send('app:quit'),
});
