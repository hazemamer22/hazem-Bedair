const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const path = require('path');

let mainWindow = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createMenu() {
  const template = [
    {
      label: 'ملف',
      submenu: [
        {
          label: 'طباعة الصفحة الحالية',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            if (mainWindow) mainWindow.webContents.print();
          }
        },
        { type: 'separator' },
        {
          label: 'إعادة تحميل البرنامج',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) mainWindow.reload();
          }
        },
        {
          label: 'خروج',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'عرض',
      submenu: [
        { label: 'تكبير', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'تصغير', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: 'الحجم الافتراضي', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'شاشة كاملة', accelerator: 'F11', role: 'togglefullscreen' },
        ...(isDev ? [
          { type: 'separator' },
          {
            label: 'أدوات المطور (DevTools)',
            accelerator: 'CmdOrCtrl+Shift+I',
            click: () => {
              if (mainWindow) mainWindow.webContents.toggleDevTools();
            }
          }
        ] : [])
      ]
    },
    {
      label: 'مساعدة',
      submenu: [
        {
          label: 'عن برنامج إدارة التغذية والعلائق',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'عن البرنامج',
              message: 'نظام إدارة علائق وتغذية مزرعة الماشية',
              detail: 'برنامج مكتبي متكامل لإدارة خامات وعلائق المزرعة، العنابر، لفات المكسر، أوامر تحضير العلف، كشوف السائقين، والمخزون.\n\nيعمل بدون إنترنت (Offline-First) مع حفظ تلقائي لجميع البيانات محلياً.',
              buttons: ['حسناً']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    title: 'نظام إدارة علائق وتغذية مزرعة الماشية',
    backgroundColor: '#f8fafc',
    autoHideMenuBar: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      spellcheck: false,
    }
  });

  createMenu();

  // Show window smoothly when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Open external links in user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Load URL in dev or file in production
  const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';
  if (isDev && !process.env.ELECTRON_SERVE_DIST) {
    mainWindow.loadURL(devUrl).catch(() => {
      // Fallback to dist if dev server not responding
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Ensure single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for system dialogs / actions
ipcMain.handle('app:get-version', () => app.getVersion());
ipcMain.handle('app:is-packaged', () => app.isPackaged);
ipcMain.handle('app:print', () => {
  if (mainWindow) {
    mainWindow.webContents.print();
    return true;
  }
  return false;
});
