import express from 'express';
import fs from 'fs';
import path from 'path';
import { db, PROFILES_DIR, BASE_DIR } from '../db.js';
import { createProfileRecord } from '../profile-store.js';
import { resetProfileFingerprint } from '../services/fingerprint-service.js';
import { clearTrashForProfiles } from '../services/system-service.js';
import { manualBrowsers } from '../services/tracker.js';

const TRASH_DIR = path.join(BASE_DIR, 'trash');
const router = express.Router();

function normalizeGroupId(value) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const s = typeof value === 'string' ? value : String(value);
    const trimmed = s.trim();
    return trimmed.length === 0 ? null : trimmed;
}

// GET /api/profiles — List all profiles
router.get('/profiles', (req, res) => {
    try {
        const profiles = db.prepare('SELECT * FROM profiles ORDER BY created_at DESC').all();
        res.json(profiles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/profiles — Create a new profile
router.post('/profiles', (req, res) => {
    try {
        const newProfile = createProfileRecord(db, req.body || {});
        res.status(201).json(newProfile);
    } catch (err) {
        const status = err.message === 'Profile name is required' || err.message === 'Profile name already exists' || err.message === 'Group does not exist'
            ? 400
            : err.message === 'Profile ID already exists'
                ? 409
                : 500;
        res.status(status).json({ error: err.message });
    }
});

// PATCH /api/profiles/:id — Partial update
router.patch('/profiles/:id', (req, res) => {
    try {
        const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id);
        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        const allowed = [
            'name', 'status', 'is_scheduled', 'group_id', 'video_folder',
            'channel_ids', 'last_run', 'remove_title', 'set_music',
            'need_content_check', 'auto_increment_schedule', 'schedule_interval',
            'upload_count', 'cookies', 'music_search', 'account_id', 'pass',
            'email', 'pass_email', 'use_fingerprint', 'fingerprint'
        ];

        const updates = [];
        const values = [];

        Object.keys(req.body).forEach(key => {
            if (allowed.includes(key)) {
                let val = req.body[key];
                if (key === 'group_id') {
                    val = normalizeGroupId(val);
                } else if (['is_scheduled', 'remove_title', 'set_music', 'need_content_check', 'auto_increment_schedule', 'use_fingerprint'].includes(key)) {
                    val = val ? 1 : 0;
                } else if (['schedule_interval', 'upload_count'].includes(key)) {
                    val = parseInt(val, 10) || 0;
                }
                updates.push(`${key} = ?`);
                values.push(val);
            }
        });

        if (updates.length > 0) {
            values.push(req.params.id);
            db.prepare(`UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        }

        const updated = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/profiles/:id — Full update
router.put('/profiles/:id', (req, res) => {
    try {
        const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id);
        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        const {
            name, group_id, video_folder, channel_ids, is_scheduled,
            remove_title, set_music, need_content_check, auto_increment_schedule,
            schedule_interval, upload_count, cookies, music_search, account_id,
            pass, email, pass_email, use_fingerprint, fingerprint
        } = req.body;

        db.prepare(`
            UPDATE profiles SET
                name = COALESCE(?, name),
                group_id = ?,
                video_folder = COALESCE(?, video_folder),
                channel_ids = COALESCE(?, channel_ids),
                is_scheduled = COALESCE(?, is_scheduled),
                remove_title = COALESCE(?, remove_title),
                set_music = COALESCE(?, set_music),
                need_content_check = COALESCE(?, need_content_check),
                auto_increment_schedule = COALESCE(?, auto_increment_schedule),
                schedule_interval = COALESCE(?, schedule_interval),
                upload_count = COALESCE(?, upload_count),
                cookies = COALESCE(?, cookies),
                music_search = COALESCE(?, music_search),
                account_id = COALESCE(?, account_id),
                pass = COALESCE(?, pass),
                email = COALESCE(?, email),
                pass_email = COALESCE(?, pass_email),
                use_fingerprint = COALESCE(?, use_fingerprint),
                fingerprint = COALESCE(?, fingerprint)
            WHERE id = ?
        `).run(
            name,
            normalizeGroupId(group_id),
            video_folder,
            channel_ids,
            is_scheduled !== undefined ? (is_scheduled ? 1 : 0) : null,
            remove_title !== undefined ? (remove_title ? 1 : 0) : null,
            set_music !== undefined ? (set_music ? 1 : 0) : null,
            need_content_check !== undefined ? (need_content_check ? 1 : 0) : null,
            auto_increment_schedule !== undefined ? (auto_increment_schedule ? 1 : 0) : null,
            schedule_interval !== undefined ? (parseInt(schedule_interval, 10) || 10) : null,
            upload_count !== undefined ? (parseInt(upload_count, 10) || 1) : null,
            cookies,
            music_search,
            account_id,
            pass,
            email,
            pass_email,
            use_fingerprint !== undefined ? (use_fingerprint ? 1 : 0) : null,
            fingerprint,
            req.params.id
        );

        const updated = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/profiles/:id — Delete single profile
router.delete('/profiles/:id', async (req, res) => {
    try {
        const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id);
        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        if (manualBrowsers.has(profile.id)) {
            const browser = manualBrowsers.get(profile.id);
            manualBrowsers.delete(profile.id);
            await browser.close().catch(() => null);
        }

        const sourceDir = path.join(PROFILES_DIR, profile.name);
        if (fs.existsSync(sourceDir)) {
            if (!fs.existsSync(TRASH_DIR)) fs.mkdirSync(TRASH_DIR, { recursive: true });
            const destDir = path.join(TRASH_DIR, `${profile.name}_${Date.now()}`);
            try {
                fs.renameSync(sourceDir, destDir);
            } catch (e) {
                console.error(`Failed to move ${sourceDir} to trash:`, e);
            }
        }

        db.prepare('DELETE FROM profiles WHERE id = ?').run(req.params.id);
        res.json({ success: true, message: 'Profile deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/profiles/delete-multiple — Bulk delete profiles
router.post('/profiles/delete-multiple', async (req, res) => {
    const ids = req.body.ids || req.body.profileIds || [];
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'profileIds array is required' });
    }

    try {
        if (!fs.existsSync(TRASH_DIR)) fs.mkdirSync(TRASH_DIR, { recursive: true });
        for (const id of ids) {
            if (!id || id === 'null' || id === 'undefined') {
                db.prepare('DELETE FROM profiles WHERE id IS NULL OR id = "" OR id = "null"').run();
                continue;
            }
            const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id);
            if (!profile) continue;

            if (manualBrowsers.has(id)) {
                const browser = manualBrowsers.get(id);
                manualBrowsers.delete(id);
                await browser.close().catch(() => null);
            }

            const sourceDir = path.join(PROFILES_DIR, profile.name);
            if (fs.existsSync(sourceDir)) {
                const destDir = path.join(TRASH_DIR, `${profile.name}_${Date.now()}`);
                try {
                    fs.renameSync(sourceDir, destDir);
                } catch (e) {
                    console.error(`Failed to move ${sourceDir} to trash:`, e);
                }
            }

            db.prepare('DELETE FROM profiles WHERE id = ?').run(id);
        }
        res.json({ success: true, count: ids.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/profiles/:id/random-fingerprint — Generate new random fingerprint
router.post('/profiles/:id/random-fingerprint', async (req, res) => {
    try {
        const result = await resetProfileFingerprint(db, req.params.id);
        res.json({ success: true, fingerprint: result.fingerprint });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/profiles/clear-trash — Clear browser cache for selected profiles
router.post('/profiles/clear-trash', (req, res) => {
    const { profileIds } = req.body;
    if (!Array.isArray(profileIds) || profileIds.length === 0) {
        return res.status(400).json({ error: 'profileIds array is required' });
    }
    try {
        const result = clearTrashForProfiles(db, profileIds);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
