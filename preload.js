const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openFile: async () => {
    return await ipcRenderer.invoke('dialog:openFile');
  },
  loadDefault: async () => {
    return await ipcRenderer.invoke('file:loadDefault');
  }
});

contextBridge.exposeInMainWorld('apiExtra', {
  pickFile: async () => {
    return await ipcRenderer.invoke('dialog:pickFile');
  },
  readFile: async (filePath) => {
    return await ipcRenderer.invoke('file:readFile', filePath);
  },
  hasDefault: async () => {
    return await ipcRenderer.invoke('file:hasDefault');
  }
});
