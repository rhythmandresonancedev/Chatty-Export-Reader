const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openFile: async () => {
    return await ipcRenderer.invoke('dialog:openFile');
  },
  loadDefault: async () => {
    return await ipcRenderer.invoke('file:loadDefault');
  },
  onImportFromMenu: (callback) => {
    ipcRenderer.on('menu:importFile', callback);
  },
  setImportMenuVisible: (isVisible) => {
    ipcRenderer.send('menu:setImportVisible', !!isVisible);
  },
  saveEdits: async (edits) => {
    return await ipcRenderer.invoke('dialog:saveEdits', edits);
  },
  loadEdits: async () => {
    return await ipcRenderer.invoke('dialog:loadEdits');
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
