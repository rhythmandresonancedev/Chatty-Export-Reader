const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openFile: async () => {
    return await ipcRenderer.invoke('dialog:openFile');
  },
  loadDefault: async () => {
    return await ipcRenderer.invoke('file:loadDefault');
  }
});
