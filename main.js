const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { buildLocalAssetMap } = require('./asset-map');
const { findDefaultArchive, readArchive } = require('./archive');
const { assetByUrl, imageDataUrl, savePortableExport } = require('./export-assets');

let currentAssets = {};

async function openArchive(filePath) {
  const data = await readArchive(filePath);
  currentAssets = buildLocalAssetMap(path.dirname(filePath));
  return { filePath, data, assets: currentAssets };
}

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

  // Open web links outside the reader without creating app windows.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
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

  

  mainWindow.loadFile(path.join(__dirname, 'index .html'))
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
    return await openArchive(filePath);
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
    return await openArchive(filePath);
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
    await savePortableExport(filePath, markdown || '', 'markdown', currentAssets);
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
    await savePortableExport(filePath, html || '', 'html', currentAssets);
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
    const defaultFile = await findDefaultArchive(path.join(__dirname, 'conversation'));
    if (!defaultFile) return { error: 'Default conversation archive not found', data: null };
    return await openArchive(defaultFile);
  } catch (err) {
    return { error: err.message };
  }
});


ipcMain.handle('asset:readImage', async (event, url) => {
  try {
    return { url: await imageDataUrl(assetByUrl(currentAssets, url)) };
  } catch (error) {
    return { error: error.message };
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
