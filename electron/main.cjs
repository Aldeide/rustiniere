const { app, BrowserWindow, Tray, Menu, ipcMain, Notification } = require('electron');
const path = require('path');
const url = require('url');

let mainWindow = null;
let tray = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0f1013',
    title: 'Rustinière',
    frame: true, // Native title bar or custom
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Allows unencrypted ws:// connections without browser SSL warnings
    }
  });

  // Remove default menu for clean gaming look
  Menu.setApplicationMenu(null);

  // Load production dist or local dev server
  const indexPath = path.join(__dirname, '..', 'client', 'dist', 'index.html');
  mainWindow.loadURL(
    url.format({
      pathname: indexPath,
      protocol: 'file:',
      slashes: true
    })
  );

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      if (Notification.isSupported()) {
        new Notification({
          title: 'Rustinière',
          body: 'Rustinière is still running in the background. Triggers & scheduler remain active.'
        }).show();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // Simple tray menu
  tray = new Tray(path.join(__dirname, 'icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Rustinière',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Rustinière - Rust Server Admin');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// IPC Handlers
ipcMain.handle('app:notify', (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title: title || 'Rustinière', body }).show();
  }
});

ipcMain.handle('app:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('app:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});

ipcMain.handle('app:close', () => {
  if (mainWindow) mainWindow.close();
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  try {
    createTray();
  } catch (e) {
    // If icon is missing, tray creation will gracefully skip
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (isQuitting) app.quit();
  }
});
