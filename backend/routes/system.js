import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  selectFolder,
  clearDebugFiles,
  clearTrashDirectory,
} from '../services/system-service.js';
import { BASE_DIR } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_DIR = path.join(__dirname, '..');
const TRASH_DIR = path.join(BASE_DIR, 'trash');

const router = express.Router();

router.post('/select-folder', async (req, res) => {
  try {
    const folderPath = await selectFolder();
    res.json({ path: folderPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/system/clear-debug', (req, res) => {
  try {
    const result = clearDebugFiles(BACKEND_DIR);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/system/clear-trash', (req, res) => {
  try {
    const result = clearTrashDirectory(TRASH_DIR);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/system/clear-all-temp', (req, res) => {
  try {
    const debugResult = clearDebugFiles(BACKEND_DIR);
    const trashResult = clearTrashDirectory(TRASH_DIR);
    res.json({
      success: true,
      totalFreedMB: parseFloat(
        (
          (debugResult.freedBytes + trashResult.freedBytes) /
          (1024 * 1024)
        ).toFixed(1),
      ),
      debug: debugResult,
      trash: trashResult,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
