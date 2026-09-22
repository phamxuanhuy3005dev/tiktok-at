#!/usr/bin/env node

/**
 * TikTok Automation - Unified Cross-Platform Runner
 * Tự động kiểm tra, cài đặt thư viện, build giao diện và khởi chạy hệ thống
 * Hỗ trợ đồng bộ trên cả Windows và macOS / Linux.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync, spawn, execSync } = require('child_process');
const net = require('net');

const ROOT_DIR = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const CACHE_FILE = path.join(DATA_DIR, '.runner-cache.json');
const DEFAULT_PORT = parseInt(process.env.PORT || '3001', 10);

// Đảm bảo thư mục data tồn tại
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Đọc và ghi cache
function readCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    }
  } catch (_) {}
  return {};
}

function writeCache(data) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (_) {}
}

// Chạy lệnh shell đồng bộ
function runCmd(command, args, cwd) {
  const isWin = process.platform === 'win32';
  const bin = isWin && (command === 'npm' || command === 'npx') ? `${command}.cmd` : command;
  const res = spawnSync(bin, args, {
    cwd,
    stdio: 'inherit',
    shell: isWin,
    env: process.env,
  });
  if (res.error) {
    throw res.error;
  }
  if (res.status !== 0) {
    throw new Error(`Lệnh "${command} ${args.join(' ')}" thất bại với mã lỗi ${res.status}`);
  }
}

// Tính MD5 của 1 file
function hashFile(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

// Lấy danh sách toàn bộ file trong thư mục đệ quy
function getFilesRecursively(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      files = files.concat(getFilesRecursively(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

// Tính tổng hash của mã nguồn Frontend để nhận biết có code mới hay không
function calculateFrontendSourceHash() {
  const hash = crypto.createHash('sha256');
  const srcFiles = getFilesRecursively(path.join(FRONTEND_DIR, 'src'));
  
  // Thêm các file cấu hình quan trọng
  const configFiles = [
    path.join(FRONTEND_DIR, 'index.html'),
    path.join(FRONTEND_DIR, 'vite.config.js'),
    path.join(FRONTEND_DIR, 'package.json'),
  ];

  const allFiles = [...srcFiles, ...configFiles.filter(f => fs.existsSync(f))].sort();

  for (const file of allFiles) {
    const relPath = path.relative(FRONTEND_DIR, file);
    hash.update(relPath);
    hash.update(fs.readFileSync(file));
  }

  return hash.digest('hex');
}

// Kiểm tra cổng đang bị chiếm dụng
function checkPortInUse(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', (err) => {
        if (err.code === 'EADDRINUSE') resolve(true);
        else resolve(false);
      })
      .once('listening', () => {
        tester.once('close', () => resolve(false)).close();
      })
      .listen(port);
  });
}

// Giải phóng cổng nếu bị kẹt từ phiên trước
async function freePortIfBusy(port) {
  const inUse = await checkPortInUse(port);
  if (!inUse) return;

  console.log(`⚠️  [Cổng ${port}] Đang bị chiếm dụng bởi tiến trình khác. Đang tiến hành giải phóng...`);
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const lines = output.trim().split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && pid !== String(process.pid)) {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        }
      }
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' });
    }
    // Chờ 0.5s để hệ điều hành giải phóng socket
    await new Promise(r => setTimeout(r, 500));
    console.log(`✅ [Cổng ${port}] Đã giải phóng thành công!`);
  } catch (err) {
    console.warn(`⚠️  Không thể tự động đóng tiến trình trên cổng ${port}: ${err.message}`);
  }
}

// Tiến trình chính
async function main() {
  const forceRebuild = process.argv.includes('--rebuild') || process.argv.includes('--build');
  const cache = readCache();

  console.log('=======================================================');
  console.log('   HỆ THỐNG TỰ ĐỘNG HÓA KÊNH TIKTOK (TIKTOK STUDIO)    ');
  console.log('=======================================================');
  console.log('');

  // 1. Kiểm tra & Cài đặt thư viện Backend
  const backendPkgPath = path.join(BACKEND_DIR, 'package.json');
  const backendPkgHash = hashFile(backendPkgPath);
  const backendExpressInstalled = fs.existsSync(path.join(BACKEND_DIR, 'node_modules', 'express'));
  const needsBackendInstall = !backendExpressInstalled || cache.backendPkgHash !== backendPkgHash;

  if (needsBackendInstall) {
    console.log('📦 [1/3] Đang chuẩn bị thư viện Backend (lần đầu hoặc có cập nhật)...');
    runCmd('npm', ['install'], BACKEND_DIR);
    
    console.log('🌐 [Playwright] Kiểm tra & chuẩn bị trình duyệt Chromium...');
    runCmd('npx', ['playwright', 'install', 'chromium'], BACKEND_DIR);

    cache.backendPkgHash = backendPkgHash;
    writeCache(cache);
    console.log('✅ [1/3] Thư viện Backend và Playwright đã sẵn sàng!\n');
  } else {
    console.log('✅ [1/3] Thư viện Backend: Đã sẵn sàng.');
  }

  // 2. Kiểm tra & Cài đặt thư viện Frontend
  const frontendPkgPath = path.join(FRONTEND_DIR, 'package.json');
  const frontendPkgHash = hashFile(frontendPkgPath);
  const frontendViteInstalled = fs.existsSync(path.join(FRONTEND_DIR, 'node_modules', 'vite'));
  const needsFrontendInstall = !frontendViteInstalled || cache.frontendPkgHash !== frontendPkgHash;

  if (needsFrontendInstall) {
    console.log('📦 [2/3] Đang chuẩn bị thư viện Frontend (lần đầu hoặc có cập nhật)...');
    runCmd('npm', ['install'], FRONTEND_DIR);

    cache.frontendPkgHash = frontendPkgHash;
    writeCache(cache);
    console.log('✅ [2/3] Thư viện Frontend đã sẵn sàng!\n');
  } else {
    console.log('✅ [2/3] Thư viện Frontend: Đã sẵn sàng.');
  }

  // 3. Kiểm tra & Build giao diện Frontend
  const distIndexPath = path.join(FRONTEND_DIR, 'dist', 'index.html');
  const currentSourceHash = calculateFrontendSourceHash();
  const distMissing = !fs.existsSync(distIndexPath);
  const codeChanged = cache.frontendBuildHash !== currentSourceHash;
  const needsBuild = distMissing || codeChanged || forceRebuild;

  if (needsBuild) {
    if (distMissing) {
      console.log('🔨 [3/3] Chưa có bản build giao diện (lần đầu clone), đang tiến hành biên dịch...');
    } else if (codeChanged) {
      console.log('🔨 [3/3] Phát hiện code mới nhất (sau khi cập nhật / git pull), đang tự động build lại...');
    } else {
      console.log('🔨 [3/3] Đang biên dịch lại giao diện Frontend theo yêu cầu...');
    }

    runCmd('npm', ['run', 'build'], FRONTEND_DIR);

    cache.frontendBuildHash = currentSourceHash;
    writeCache(cache);
    console.log('✅ [3/3] Biên dịch giao diện Frontend hoàn tất!\n');
  } else {
    console.log('✅ [3/3] Bản build Frontend: Đã sẵn sàng và mới nhất.');
  }

  // 4. Kiểm tra cổng và giải phóng nếu cần
  await freePortIfBusy(DEFAULT_PORT);

  // 5. Khởi chạy ứng dụng
  console.log('');
  console.log('=======================================================');
  console.log('🚀 [HỆ THỐNG] Đang khởi chạy TikTok Automation Server...');
  console.log(`🌐 [HỆ THỐNG] Trình duyệt web sẽ tự động mở tại: http://localhost:${DEFAULT_PORT}`);
  console.log('💡 Nhấn tổ hợp phím [Ctrl + C] tại cửa sổ này khi muốn dừng chương trình.');
  console.log('=======================================================');
  console.log('');

  const serverScript = path.join(BACKEND_DIR, 'server.js');
  const serverProcess = spawn(process.execPath, [serverScript], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: {
      ...process.env,
      AUTO_OPEN: process.env.AUTO_OPEN || 'true',
      PORT: String(DEFAULT_PORT),
    },
  });

  // Chuyển tiếp tín hiệu đóng ứng dụng
  const shutdown = (sig) => {
    try {
      serverProcess.kill(sig);
    } catch (_) {}
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  serverProcess.on('exit', (code, signal) => {
    if (signal) {
      process.exit(0);
    } else {
      process.exit(code ?? 0);
    }
  });
}

main().catch((err) => {
  console.error('\n❌ [LỖI KHỞI CHẠY]:', err.message);
  process.exit(1);
});
