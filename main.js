const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let importMenuItem = null;

function buildAppMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          id: 'importConversation',
          label: 'Import Conversation',
          visible: false,
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('menu:importFile');
            }
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }
  ];

  //const menu = Menu.buildFromTemplate(template);
  //Menu.setApplicationMenu(menu);
  //importMenuItem = menu.getMenuItemById('importConversation');
}

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }

    

  })

  // Prevent in-app navigation to external pages; open externals in default browser
  const { shell } = require('electron');

  // Deny any attempt to open a new window from the renderer.
  // Previously we forwarded these to the external browser; to avoid creating
  // another window, we simply deny them now so nothing else opens automatically.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation to external http/https addresses. This stops auto-redirects
  // that would otherwise open a new tab/window in the default browser.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        event.preventDefault();
        //shell.openExternal(url); do not open externally; swallow the navigation
      }
    } catch (e) {
      // ignore malformed URLs
    }
  });

  

  mainWindow.loadFile('index .html')
}

app.disableHardwareAcceleration();

app.whenReady().then(() => {
  buildAppMenu()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// Handler: show open dialog and read chosen JSON file
ipcMain.handle('dialog:openFile', async (event) => {
  try {
    const defaultPath = path.join(__dirname, 'Conversation');
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Select OpenAI export JSON',
      defaultPath,
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (canceled || !filePaths || filePaths.length === 0) return null;
    const filePath = filePaths[0];
    const content = await fs.promises.readFile(filePath, 'utf8');
    let parsed = null;
    try { parsed = JSON.parse(content); } catch (e) { return { error: 'Invalid JSON: ' + e.message }; }
    return { filePath, data: parsed };
  } catch (err) {
    return { error: err.message };
  }
});

// Handler: attempt to load default conversations.json in Conversation folder
ipcMain.handle('file:loadDefault', async () => {
  try {
    const defaultFile = path.join(__dirname, 'Conversation', 'conversations.json');
    if (!fs.existsSync(defaultFile)) return { error: 'Default conversations.json not found', data: null };
    const content = await fs.promises.readFile(defaultFile, 'utf8');
    let parsed = null;
    try { parsed = JSON.parse(content); } catch (e) { return { error: 'Invalid JSON: ' + e.message }; }
    return { data: parsed };
  } catch (err) {
    return { error: err.message };
  }
});


ipcMain.on('menu:setImportVisible', (event, isVisible) => {
  if (!importMenuItem) return;
  importMenuItem.visible = !!isVisible;
  const menu = Menu.getApplicationMenu();
  if (menu) Menu.setApplicationMenu(menu);
});
