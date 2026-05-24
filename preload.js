const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openFile: async () => {
    return await ipcRenderer.invoke('dialog:openFile');
  },
  openDroppedFile: async (filePath) => {
    return await ipcRenderer.invoke('file:openPath', filePath);
  },
  loadDefault: async () => {
    return await ipcRenderer.invoke('file:loadDefault');
  },
  onImportFromMenu: (callback) => {
    ipcRenderer.on('menu:importFile', callback);
  },
  onSaveEditsFromMenu: (callback) => {
    ipcRenderer.on('menu:saveEdits', callback);
  },
  onLoadEditsFromMenu: (callback) => {
    ipcRenderer.on('menu:loadEdits', callback);
  },
  onExportMarkdownFromMenu: (callback) => {
    ipcRenderer.on('menu:exportMarkdown', callback);
  },
  onExportHtmlFromMenu: (callback) => {
    ipcRenderer.on('menu:exportHtml', callback);
  },
  onBackgroundFromMenu: (callback) => {
    ipcRenderer.on('menu:setBackground', (event, background) => callback(background));
  },
  setImportMenuVisible: (isVisible) => {
    ipcRenderer.send('menu:setImportVisible', !!isVisible);
  },
  setCurrentBackground: (relativePath) => {
    ipcRenderer.send('background:setCurrent', relativePath);
  },
  saveEdits: async (edits) => {
    return await ipcRenderer.invoke('dialog:saveEdits', edits);
  },
  loadEdits: async () => {
    return await ipcRenderer.invoke('dialog:loadEdits');
  },
  saveMarkdown: async (markdown) => {
    return await ipcRenderer.invoke('dialog:saveMarkdown', markdown);
  },
  saveHtml: async (html) => {
    return await ipcRenderer.invoke('dialog:saveHtml', html);
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
