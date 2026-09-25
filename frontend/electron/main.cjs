const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const http = require('http');
const { spawn, exec } = require('child_process');

let mainWindow = null;
let pythonProcess = null;
let backendSpawnedByElectron = false;

const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_DEV === '1';

/**
 * Backend sağlık kontrolü (healthcheck).
 * http://127.0.0.1:8000/api/v1/health adresine GET isteği atar.
 */
function checkBackendHealth(timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:8000/api/v1/health', { timeout: timeoutMs }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Arka planda Python FastAPI backend servisini başlatır (gerekliyse).
 */
async function startBackendIfNeeded() {
  const isAlreadyRunning = await checkBackendHealth(1000);
  if (isAlreadyRunning) {
    console.log('[Electron] FastAPI backend 8000 portunda zaten aktif.');
    return;
  }

  const projectRoot = path.resolve(__dirname, '../..');
  const backendDir = path.resolve(projectRoot, 'backend');

  console.log('[Electron] FastAPI backend başlatılıyor. Dizin:', backendDir);

  pythonProcess = spawn('python', ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'], {
    cwd: backendDir,
    env: {
      ...process.env,
      PYTHONPATH: backendDir,
      PYTHONIOENCODING: 'utf-8',
    },
    shell: false,
    windowsHide: true,
  });

  backendSpawnedByElectron = true;

  if (pythonProcess.stdout) {
    pythonProcess.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) console.log(`[FastAPI] ${msg}`);
    });
  }

  if (pythonProcess.stderr) {
    pythonProcess.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) console.log(`[FastAPI] ${msg}`);
    });
  }

  pythonProcess.on('close', (code) => {
    console.log(`[FastAPI] Süreç kapandı. Çıkış kodu: ${code}`);
    pythonProcess = null;
  });

  // Backend'in hazır olmasını bekle (maksimum 30 sn)
  const startTime = Date.now();
  while (Date.now() - startTime < 30000) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const healthy = await checkBackendHealth(800);
    if (healthy) {
      console.log('[Electron] FastAPI backend hazır ve yanıt veriyor.');
      return;
    }
  }

  throw new Error('FastAPI backend servisi 30 saniye içinde yanıt vermedi. Python ortamınızı kontrol ediniz.');
}

/**
 * Python alt sürecini ve alt süreç ağacını güvenle sonlandırır.
 */
function killBackend() {
  if (pythonProcess && backendSpawnedByElectron) {
    const pid = pythonProcess.pid;
    console.log(`[Electron] Python backend süreci sonlandırılıyor (PID: ${pid})...`);
    try {
      if (process.platform === 'win32') {
        exec(`taskkill /pid ${pid} /f /t`, (err) => {
          if (err) console.warn('[Electron] taskkill uyarısı:', err.message);
        });
      } else {
        pythonProcess.kill('SIGTERM');
      }
    } catch (e) {
      console.error('[Electron] Backend sonlandırma hatası:', e);
    }
    pythonProcess = null;
  }
}

/**
 * Ana masaüstü penceresini oluşturur.
 */
function createMainWindow() {
  const iconPath = path.join(__dirname, 'icon.ico');

  mainWindow = new BrowserWindow({
    title: 'ETK Kablo • TDS Studio Pro v3.0',
    width: 1480,
    height: 940,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: '#0f172a',
    show: false,
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  // Harici web bağlantılarını sistem varsayılan tarayıcısında aç
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Tekil örnek kilidi (Tek instance kuralı)
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

  app.whenReady().then(async () => {
    try {
      if (process.platform === 'win32') {
        app.setAppUserModelId('com.etkkablo.tdsstudio');
      }
      await startBackendIfNeeded();
      createMainWindow();
    } catch (err) {
      console.error('[Electron Başlatma Hatası]', err);
      dialog.showErrorBox(
        'ETK TDS Studio Başlatılamadı',
        `Sistem başlatılırken bir hata oluştu:\n\n${err.message || err}`
      );
      app.quit();
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });

  // Çıkış işlemleri
  app.on('before-quit', killBackend);
  app.on('will-quit', killBackend);
  app.on('window-all-closed', () => {
    killBackend();
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  process.on('SIGINT', () => {
    killBackend();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    killBackend();
    process.exit(0);
  });
  process.on('exit', killBackend);
}
