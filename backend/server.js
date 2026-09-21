import express from 'express';
import cors from 'cors';
import { db } from './db.js';
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

// Reset stuck profile states on startup
try {
  db.prepare(
    "UPDATE profiles SET status = 'idle' WHERE status IN ('uploading', 'logging_in', 'changing_avatar', 'adding_favorite_music')",
  ).run();
  console.log('[System] Reset stuck profiles to idle state');
} catch (e) {
  console.error('[System] Failed to reset profile statuses:', e.message);
}

// Mount modular API routes
app.use('/api', profilesRouter);
app.use('/api', groupsRouter);
app.use('/api', configRouter);
app.use('/api', systemRouter);
app.use('/api', cookiesRouter);
app.use('/api', automationRouter);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(
    `[Server] TikTok Automation Backend running at http://localhost:${PORT}`,
  );
});

export default app;
