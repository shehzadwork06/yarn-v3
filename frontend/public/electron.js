// const { app, BrowserWindow, shell, dialog } = require('electron');
// const path = require('path');
// const { spawn } = require('child_process');
// const fs = require('fs');

// const isDev = !app.isPackaged;

// let mainWindow;
// let backendProcess;

// // ─── Find Node executable ─────────────────────────────────────────────────────
// function getNodePath() {
//   if (isDev) {
//     // In dev, use system Node
//     return process.platform === 'win32' ? 'node' : 'node';
//   }
//   // In packaged app, Node.js is NOT available — we use Electron's own Node
//   // by spawning a new electron process in --run mode, OR we use the
//   // node binary that ships inside electron
//   const possiblePaths = [
//     path.join(process.resourcesPath, 'node', 'node.exe'),      // bundled node
//     path.join(path.dirname(process.execPath), 'node.exe'),      // next to electron.exe
//     'node', // fallback: system node
//   ];
//   for (const p of possiblePaths) {
//     if (p === 'node') return p;
//     if (fs.existsSync(p)) return p;
//   }
//   return 'node';
// }

// // ─── Start Express Backend ────────────────────────────────────────────────────
// function startBackend() {
//   return new Promise((resolve) => {
//     const nodePath = getNodePath();

//     const backendDir = isDev
//       ? path.join(__dirname, '../../backend')
//       : path.join(process.resourcesPath, 'backend');

//     const serverFile = path.join(backendDir, 'server.js');

//     console.log('[Electron] Node path:', nodePath);
//     console.log('[Electron] Backend dir:', backendDir);
//     console.log('[Electron] Server file:', serverFile);

//     backendProcess = spawn(nodePath, [serverFile], {
//       cwd: backendDir,
//       env: {
//         ...process.env,
//         PORT: '5000',
//         NODE_ENV: 'production',
//       },
//     });

//     backendProcess.stdout.on('data', (data) => {
//       console.log('[Backend]', data.toString());
//       resolve();
//     });

//     backendProcess.stderr.on('data', (data) => {
//       const msg = data.toString();
//       console.error('[Backend Error]', msg);
//       // Some servers log to stderr even when OK
//       if (msg.includes('running') || msg.includes('listening') || msg.includes('started')) {
//         resolve();
//       }
//     });

//     backendProcess.on('error', (err) => {
//       console.error('[Spawn Error]', err.message);
//       dialog.showErrorBox('Backend Error', `Could not start backend.\n\n${err.message}`);
//       resolve(); // still open the window
//     });

//     // Always resolve after 4 seconds as fallback
//     setTimeout(resolve, 4000);
//   });
// }

// // ─── Create Window ────────────────────────────────────────────────────────────
// function createWindow() {
//   mainWindow = new BrowserWindow({
//     width: 1440,
//     height: 900,
//     minWidth: 1100,
//     minHeight: 700,
//     webPreferences: {
//       nodeIntegration: false,
//       contextIsolation: true,
//     },
//     title: 'YarnChem ERP — GH & Sons Enterprises',
//     backgroundColor: '#0A0F1C',
//     show: false,
//   });

//   mainWindow.once('ready-to-show', () => {
//     mainWindow.show();
//     mainWindow.maximize();
//   });

//   const startUrl = isDev
//     ? 'http://localhost:3000'
//     : `file://${path.join(__dirname, '../build/index.html')}`;

//   mainWindow.loadURL(startUrl);

//   mainWindow.webContents.setWindowOpenHandler(({ url }) => {
//     shell.openExternal(url);
//     return { action: 'deny' };
//   });

//   mainWindow.on('closed', () => { mainWindow = null; });
// }

// // ─── App Lifecycle ────────────────────────────────────────────────────────────
// app.whenReady().then(async () => {
//   await startBackend();
//   createWindow();
//   app.on('activate', () => {
//     if (BrowserWindow.getAllWindows().length === 0) createWindow();
//   });
// });

// app.on('window-all-closed', () => {
//   if (backendProcess) backendProcess.kill();
//   if (process.platform !== 'darwin') app.quit();
// });

// app.on('before-quit', () => {
//   if (backendProcess) backendProcess.kill();
// });
const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

const isDev = !app.isPackaged;

let mainWindow;
let backendProcess;

// ─── Poll until backend is ready ─────────────────────────────────────────────
function waitForBackend(port, maxAttempts = 30) {
  return new Promise((resolve) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const req = http.get(`http://localhost:${port}/api/`, (res) => {

        console.log(`[Electron] Backend ready after ${attempts} attempts`);
        resolve(true);
      });
      req.on('error', () => {
        if (attempts >= maxAttempts) {
          console.log('[Electron] Backend did not respond, loading anyway');
          resolve(false);
        } else {
          setTimeout(check, 500); // retry every 500ms
        }
      });
      req.setTimeout(400, () => { req.destroy(); });
    };
    check();
  });
}

// ─── Start Express Backend ────────────────────────────────────────────────────
function startBackend() {
  return new Promise((resolve) => {
    const backendDir = isDev
      ? path.join(__dirname, '../../backend')
      : path.join(process.resourcesPath, 'backend');

    const serverFile = path.join(backendDir, 'server.js');

    console.log('[Electron] Backend dir:', backendDir);
    console.log('[Electron] Server file exists:', fs.existsSync(serverFile));

    backendProcess = spawn('node', [serverFile], {
      cwd: backendDir,
      env: {
        ...process.env,
        PORT: '8002',
        NODE_ENV: 'production',
      },
      shell: true,
    });

    backendProcess.stdout.on('data', (data) => {
      console.log('[Backend]', data.toString());
    });

    backendProcess.stderr.on('data', (data) => {
      console.error('[Backend Error]', data.toString());
    });

    backendProcess.on('error', (err) => {
      console.error('[Spawn Error]', err.message);
      dialog.showErrorBox('Backend Error', `Could not start backend.\n\n${err.message}\n\nMake sure Node.js is installed.`);
    });

    // Give backend a moment to start, then poll
    setTimeout(resolve, 1000);
  });
}

// ─── Create Window ────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'GH & Sons Enterprises',
    backgroundColor: '#0A0F1C',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../build/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Load Error]', errorCode, errorDescription);
    // Retry loading after 2 seconds if it failed
    if (errorCode !== -3) { // -3 is aborted, ignore
      setTimeout(() => {
        if (mainWindow) {
          const indexPath = path.join(__dirname, '../build/index.html');
          mainWindow.loadFile(indexPath);
        }
      }, 2000);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  await startBackend();
  // Poll backend until ready (max 15 seconds)
  await waitForBackend(8002, 30);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (backendProcess) backendProcess.kill();
});