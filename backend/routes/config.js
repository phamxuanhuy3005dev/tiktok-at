import express from 'express';
import { db, getConfig, setConfig, UPLOADS_DIR } from '../db.js';

const router = express.Router();

router.get('/config', (req, res) => {
    try {
        const rows = db.prepare('SELECT key, value FROM config').all();
        const config = {
            videoFolder: UPLOADS_DIR,
            maxConcurrency: 2,
            runMode: 'parallel',
            limitUploads: false,
            uploadLimitCount: 1,
            telegramToken: '',
            telegramChatId: ''
        };

        rows.forEach(r => {
            if (r.key === 'limitUploads') config.limitUploads = r.value === 'true';
            else if (r.key === 'uploadLimitCount') config.uploadLimitCount = parseInt(r.value, 10) || 1;
            else if (r.key === 'maxConcurrency') config.maxConcurrency = parseInt(r.value, 10) || 2;
            else config[r.key] = r.value;
        });

        res.json(config);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/config', (req, res) => {
    try {
        const updates = req.body;
        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ error: 'Body must be an object' });
        }

        Object.entries(updates).forEach(([k, v]) => {
            setConfig(k, String(v));
        });

        res.json({ success: true, message: 'Config updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
