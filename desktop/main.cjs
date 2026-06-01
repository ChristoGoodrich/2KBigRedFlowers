const path = require('node:path');
const { app, BrowserWindow, shell } = require('electron');

if (require('electron-squirrel-startup')) app.quit();

const APP_USER_MODEL_ID = 'com.squirrel.2KBigRedFlowers.2KBigRedFlowers';

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 960,
    minHeight: 680,
    backgroundColor: '#0a0a0a',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.loadFile(path.join(__dirname, '..', 'dist', 'web', 'index.html'));
}

app.whenReady().then(() => {
  app.setAppUserModelId(APP_USER_MODEL_ID);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
