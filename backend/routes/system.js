import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { selectFolder, selectImageFile, clearDebugFiles } from '../services/system-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_DIR = path.join(__dirname, '..');

const router = express.Router();

router.post('/select-folder', async (req, res) => {
    try {
        const folderPath = await selectFolder();
        res.json({ path: folderPath });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/select-image-file', async (req, res) => {
    try {
        const filePath = await selectImageFile();
        res.json({ path: filePath });
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

router.post('/system/test-telegram', async (req, res) => {
    try {
        const { sendTelegramNotification } = await import('../services/system-service.js');
        await sendTelegramNotification('🔔 <b>TikTok Automation:</b> Tin nhắn kiểm tra kết nối Telegram thành công!');
        res.json({ success: true, message: 'Đã gửi tin nhắn thử nghiệm tới Telegram.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
