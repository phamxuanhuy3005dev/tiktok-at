import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { db, PROFILES_DIR } from './db.js';
import { manualBrowsers } from './services/tracker.js';
import { releaseProfileLocks } from './services/browser-manager.js';
import profilesRouter from './routes/profiles.js';
import groupsRouter from './routes/groups.js';
import configRouter from './routes/config.js';
import systemRouter from './routes/system.js';
import cookiesRouter from './routes/cookies.js';
import automationRouter from './routes/automation.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Catch unhandled exceptions to prevent abrupt process termination
process.on('uncaughtException', (err) => {
  console.error('[System] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[System] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Reset stuck profile states and release any stale locks on startup
try {
  db.prepare(
    "UPDATE profiles SET status = 'idle' WHERE status IN ('uploading', 'logging_in', 'changing_avatar', 'adding_favorite_music')",
  ).run();
  console.log('[System] Reset stuck profiles to idle state');

  // Checkpoint WAL to keep DB files small on disk
  try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch (_) {}

  const allProfiles = db.prepare('SELECT name FROM profiles').all();
  for (const p of allProfiles) {
    const dir = path.join(PROFILES_DIR, p.name);
    releaseProfileLocks(dir, p.name).catch(() => {});
  }
} catch (e) {
  console.error('[System] Failed to reset profile statuses:', e.message);
}

// Graceful process shutdown
const gracefulShutdown = async (signal) => {
  console.log(`[System] Received ${signal}. Closing active browsers...`);
  for (const [id, browser] of manualBrowsers.entries()) {
    try {
      await browser.close();
    } catch (e) {}
  }
  manualBrowsers.clear();
  try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch (_) {}
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Mount modular API routes
app.use('/api', profilesRouter);
app.use('/api', groupsRouter);
app.use('/api', configRouter);
app.use('/api', systemRouter);
app.use('/api', cookiesRouter);
app.use('/api', automationRouter);

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend static build if available
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
}

// Start server
app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`[Server] TikTok Automation running at ${url}`);

  if (process.env.AUTO_OPEN === 'true') {
    const cmd = process.platform === 'darwin'
      ? `open ${url}`
      : process.platform === 'win32'
      ? `start ${url}`
      : `xdg-open ${url}`;
    import('child_process').then(({ exec }) => {
      exec(cmd, () => {});
    });
  }
});

export default app;
