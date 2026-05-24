const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

let mainWindow = null;
let importMenuItem = null;
const appIconPath = path.join(__dirname, 'images', 'ChattyExportReaderIcon.ico');
const defaultBackgroundPath = path.join(__dirname, 'images', 'background.png');
const additionalBackgroundsDir = path.join(__dirname, 'images', 'additional backgrounds');
const backgroundImageExts = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.avif']);

function toTitleCase(text) {
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

function getBackgroundChoices() {
  const choices = [
    {
      id: 'background:images/background.png',
      label: 'Default Background',
      relativePath: 'images/background.png',
      url: pathToFileURL(defaultBackgroundPath).href,
      checked: true
    }
  ];

  if (!fs.existsSync(additionalBackgroundsDir)) return choices;

  let entries = [];
  try {
    entries = fs.readdirSync(additionalBackgroundsDir, { withFileTypes: true });
  } catch (err) {
    return choices;
  }

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!backgroundImageExts.has(ext)) continue;

    const stem = path.basename(entry.name, ext).replace(/^background\s*-\s*/i, '');
    const relativePath = path.join('images', 'additional backgrounds', entry.name).replace(/\\/g, '/');
    choices.push({
      id: 'background:' + relativePath,
      label: toTitleCase(stem.replace(/[-_]+/g, ' ')),
      relativePath,
      url: pathToFileURL(path.join(additionalBackgroundsDir, entry.name)).href
    });
  }

  return choices;
}

function setCheckedBackgroundMenuItem(relativePath) {
  const menu = Menu.getApplicationMenu();
  if (!menu || !relativePath) return;
  const item = menu.getMenuItemById('background:' + relativePath);
  if (item) item.checked = true;
}

function getUserFriendlySavePath(fileName) {
  let basePath = '';
  try {
    basePath = app.getPath('documents');
  } catch (err) {
    basePath = '';
  }

  if (!basePath) {
    try {
      basePath = app.getPath('desktop');
    } catch (err) {
      basePath = __dirname;
    }
  }

  return path.join(basePath, fileName);
}

function buildAppMenu() {
  const backgroundChoices = getBackgroundChoices();
  const backgroundMenu = backgroundChoices.map((choice) => ({
    id: choice.id,
    label: choice.label,
    type: 'radio',
    checked: !!choice.checked,
    click: () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('menu:setBackground', {
          relativePath: choice.relativePath,
          url: choice.url
        });
      }
    }
  }));

  const template = [
    {
      label: 'File',
      submenu: [
        {
          id: 'importConversation',
          label: 'Open Conversation',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('menu:importFile');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Save Edits',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('menu:saveEdits');
            }
          }
        },
        {
          label: 'Load Edits',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('menu:loadEdits');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Export Published Markdown',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('menu:exportMarkdown');
            }
          }
        },
        {
          label: 'Export Published HTML',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('menu:exportHtml');
            }
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Background',
          submenu: backgroundMenu
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          enabled: false
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  importMenuItem = menu.getMenuItemById('importConversation');
}

function buildLocalAssetMap(baseDir) {
  const assetMap = {};
  if (!baseDir || !fs.existsSync(baseDir)) return assetMap;

  const assetExts = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.avif', '.mp4', '.webm', '.mp3', '.wav', '.m4a']);
  function scanDir(dir, depth) {
    if (depth > 2) return;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath, depth + 1);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!assetExts.has(ext)) continue;

      const fileUrl = pathToFileURL(fullPath).href;
      const assetInfo = {
        url: fileUrl,
        relativePath: path.relative(baseDir, fullPath).replace(/\\/g, '/')
      };
      const stem = path.basename(entry.name, ext);
      const unsanitizedStem = stem.replace(/-sanitized$/, '');

      assetMap[entry.name] = assetInfo;
      assetMap[stem] = assetInfo;
      assetMap[unsanitizedStem] = assetInfo;
      assetMap['sediment://' + unsanitizedStem] = assetInfo;
    }
  }

  scanDir(baseDir, 0);

  return assetMap;
}

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    icon: appIconPath,
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
    return { filePath, data: parsed, assets: buildLocalAssetMap(path.dirname(filePath)) };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('file:openPath', async (event, filePath) => {
  try {
    if (!filePath || typeof filePath !== 'string') return { error: 'No file path provided' };
    const stats = await fs.promises.stat(filePath);
    if (!stats.isFile()) return { error: 'Dropped item is not a file' };
    if (path.extname(filePath).toLowerCase() !== '.json') return { error: 'Please drop a JSON file' };
    const content = await fs.promises.readFile(filePath, 'utf8');
    let parsed = null;
    try { parsed = JSON.parse(content); } catch (e) { return { error: 'Invalid JSON: ' + e.message }; }
    return { filePath, data: parsed, assets: buildLocalAssetMap(path.dirname(filePath)) };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('dialog:saveEdits', async (event, edits) => {
  try {
    const defaultPath = getUserFriendlySavePath('conversation-edits.json');
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save edit metadata',
      defaultPath,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (canceled || !filePath) return null;
    await fs.promises.writeFile(filePath, JSON.stringify(edits || {}, null, 2), 'utf8');
    return { filePath };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('dialog:saveMarkdown', async (event, markdown) => {
  try {
    const defaultPath = getUserFriendlySavePath('published-threads.md');
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export published threads to Markdown',
      defaultPath,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    });
    if (canceled || !filePath) return null;
    await fs.promises.writeFile(filePath, markdown || '', 'utf8');
    return { filePath };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('dialog:saveHtml', async (event, html) => {
  try {
    const defaultPath = getUserFriendlySavePath('published-threads.html');
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export published threads to HTML',
      defaultPath,
      filters: [{ name: 'HTML', extensions: ['html', 'htm'] }]
    });
    if (canceled || !filePath) return null;
    await fs.promises.writeFile(filePath, html || '', 'utf8');
    return { filePath };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('dialog:loadEdits', async () => {
  try {
    const defaultPath = path.join(__dirname, 'Conversation');
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Load edit metadata',
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
    return { filePath: defaultFile, data: parsed, assets: buildLocalAssetMap(path.dirname(defaultFile)) };
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

ipcMain.on('background:setCurrent', (event, relativePath) => {
  setCheckedBackgroundMenuItem(relativePath);
});
