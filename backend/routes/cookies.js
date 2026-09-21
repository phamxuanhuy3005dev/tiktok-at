import express from 'express';
import fs from 'fs';
import path from 'path';
import { db, PROFILES_DIR } from '../db.js';
import { parseCookies, captureBrowserCookies, extractCookiesFromDisk } from '../services/cookie-service.js';
import { manualBrowsers } from '../services/tracker.js';

const router = express.Router();

// POST /api/profiles/:id/logout — Clear cookies & browser session
router.post('/profiles/:id/logout', async (req, res) => {
    const profileId = req.params.id;
    const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(profileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    try {
        if (manualBrowsers.has(profileId)) {
            const browser = manualBrowsers.get(profileId);
            manualBrowsers.delete(profileId);
            await browser.close().catch(() => null);
        }

        db.prepare('UPDATE profiles SET cookies = NULL, status = ? WHERE id = ?').run('idle', profileId);

        const userDataDir = path.join(PROFILES_DIR, profile.name);
        const networkDir = path.join(userDataDir, 'Default', 'Network');
        if (fs.existsSync(networkDir)) {
            try {
                const files = fs.readdirSync(networkDir);
                for (const file of files) {
                    if (file.toLowerCase().includes('cookie')) {
                        fs.unlinkSync(path.join(networkDir, file));
                    }
                }
            } catch (e) {
                console.error(`[${profile.name}] Failed to clean local cookie files:`, e.message);
            }
        }

        console.log(`[${profile.name}] Logged out, session cleared.`);
        res.json({ success: true, message: 'Đã đăng xuất và xóa session thành công' });
    } catch (err) {
        console.error(`[${profile.name}] Logout error:`, err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/profiles/:id/cookie — Get current cookies of a profile
router.get('/profiles/:id/cookie', async (req, res) => {
    const profile = db.prepare('SELECT id, name, cookies FROM profiles WHERE id = ?').get(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    let cookies = null;
    let count = 0;
    let hasSession = false;

    // 1. If manual browser is open, attempt to grab latest cookies
    const openBrowser = manualBrowsers.get(profile.id);
    if (openBrowser) {
        try {
            const browserCookies = await captureBrowserCookies(openBrowser);
            if (browserCookies && browserCookies.length > 0) {
                const hasSess = browserCookies.some(c => c.name === 'sessionid' || c.name === 'sessionid_ss' || c.name === 'sid_tt');
                if (hasSess) {
                    db.prepare('UPDATE profiles SET cookies = ? WHERE id = ?').run(JSON.stringify(browserCookies), profile.id);
                    profile.cookies = JSON.stringify(browserCookies);
                }
            }
        } catch (e) {
            console.warn(`[${profile.name}] Failed to capture cookies from open browser:`, e.message);
        }
    } else if (!profile.cookies || !profile.cookies.trim()) {
        // 2. If DB has no cookies, fallback to disk (e.g. user logged in via manual browser then closed it)
        try {
            const diskCookies = await extractCookiesFromDisk(profile.name, PROFILES_DIR);
            if (diskCookies && diskCookies.length > 0) {
                const hasSess = diskCookies.some(c => c.name === 'sessionid' || c.name === 'sessionid_ss' || c.name === 'sid_tt');
                if (hasSess) {
                    db.prepare('UPDATE profiles SET cookies = ? WHERE id = ?').run(JSON.stringify(diskCookies), profile.id);
                    profile.cookies = JSON.stringify(diskCookies);
                    console.log(`[${profile.name}] Auto-recovered ${diskCookies.length} cookies from disk into DB`);
                }
            }
        } catch (e) {
            console.warn(`[${profile.name}] Failed to extract cookies from disk:`, e.message);
        }
    }

    if (profile.cookies && profile.cookies.trim()) {
        try {
            cookies = parseCookies(profile.cookies);
            count = cookies.length;
            hasSession = cookies.some(c => c.name === 'sessionid' || c.name === 'sessionid_ss' || c.name === 'sid_tt');
        } catch (e) {
            cookies = profile.cookies;
        }
    }

    res.json({
        raw: profile.cookies || null,
        cookies,
        count,
        hasSession
    });
});

// POST /api/profiles/:id/cookie — Save or update cookies for a profile
router.post('/profiles/:id/cookie', (req, res) => {
    const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    let { cookies } = req.body;
    if (!cookies) {
        db.prepare('UPDATE profiles SET cookies = NULL WHERE id = ?').run(profile.id);
        return res.json({ success: true, message: 'Đã xóa cookie' });
    }

    let normalizedCookies;
    if (typeof cookies === 'string') {
        const parsed = parseCookies(cookies);
        if (parsed.length === 0) {
            return res.status(400).json({ error: 'Chuỗi cookie không hợp lệ' });
        }
        normalizedCookies = JSON.stringify(parsed);
    } else if (Array.isArray(cookies)) {
        normalizedCookies = JSON.stringify(cookies);
    } else {
        return res.status(400).json({ error: 'Dữ liệu cookie không hợp lệ' });
    }

    db.prepare('UPDATE profiles SET cookies = ? WHERE id = ?').run(normalizedCookies, profile.id);
    res.json({ success: true, message: 'Đã lưu cookie thành công' });
});

// POST /api/profiles/:id/save-session-cookies — Capture active cookies from open browser or disk
router.post('/profiles/:id/save-session-cookies', async (req, res) => {
    const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    let cookies = [];
    const browser = manualBrowsers.get(profile.id);
    if (browser) {
        try {
            cookies = await captureBrowserCookies(browser);
        } catch (err) {
            console.warn(`[${profile.name}] Error capturing from live browser:`, err.message);
        }
    }

    // If browser not open or no cookies returned, try on-disk
    if (!cookies || cookies.length === 0) {
        try {
            cookies = await extractCookiesFromDisk(profile.name, PROFILES_DIR);
        } catch (err) {
            console.warn(`[${profile.name}] Error capturing from disk:`, err.message);
        }
    }

    if (cookies && cookies.length > 0) {
        db.prepare('UPDATE profiles SET cookies = ? WHERE id = ?').run(JSON.stringify(cookies), profile.id);
        return res.json({ success: true, count: cookies.length, cookies, message: `Đã lưu ${cookies.length} cookie thành công!` });
    } else {
        return res.status(400).json({ error: 'Không tìm thấy cookie nào (Hãy mở trình duyệt và đăng nhập TikTok trước)' });
    }
});

// GET /api/profiles/export-cookies-json — Export selected (or all) profiles with cookies directly as a JSON download
router.get('/profiles/export-cookies-json', (req, res) => {
    try {
        const { ids } = req.query;
        let query = 'SELECT id, name, cookies, group_id FROM profiles';
        let params = [];
        if (ids && ids.trim()) {
            const idList = ids.split(',').map(s => s.trim()).filter(Boolean);
            if (idList.length > 0) {
                const placeholders = idList.map(() => '?').join(',');
                query += ` WHERE id IN (${placeholders})`;
                params = idList;
            }
        }
        const profiles = db.prepare(query).all(...params);
        const groupRows = db.prepare('SELECT id, name FROM groups').all();
        const groupMap = new Map(groupRows.map(g => [g.id, g.name]));

        const exportList = profiles.map(p => {
            let cookieObj = [];
            if (p.cookies && p.cookies.trim()) {
                try {
                    cookieObj = JSON.parse(p.cookies);
                } catch {
                    cookieObj = p.cookies;
                }
            }
            return {
                name: p.name,
                group: groupMap.get(p.group_id) || '',
                cookies: cookieObj
            };
        });

        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const filename = `tiktok_cookies_${profiles.length}profiles_${dateStr}.json`;

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(JSON.stringify(exportList, null, 2));
    } catch (err) {
        console.error('Export cookies json error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/profiles/import-cookies-json — Import cookies JSON exported from another machine
router.post('/profiles/import-cookies-json', (req, res) => {
    try {
        let items = req.body;
        if (!Array.isArray(items)) {
            if (items && Array.isArray(items.profiles)) {
                items = items.profiles;
            } else {
                return res.status(400).json({ error: 'Dữ liệu phải là một mảng các profile JSON' });
            }
        }

        const results = { updated: 0, created: 0, errors: [] };
        const existingProfiles = db.prepare('SELECT id, name FROM profiles').all();
        const byName = new Map(existingProfiles.map(p => [p.name.toLowerCase(), p]));

        const updateCookieStmt = db.prepare('UPDATE profiles SET cookies = ? WHERE id = ?');
        const insertProfileStmt = db.prepare(`
            INSERT INTO profiles (id, name, status, is_scheduled, auto_increment_schedule, schedule_interval, group_id, video_folder, set_music, upload_count, remove_title, need_content_check, cookies)
            VALUES (?, ?, 'idle', 0, 1, 5, NULL, NULL, 1, 1, 1, 0, ?)
        `);

        for (const item of items) {
            const name = (item.name || item.profile_name || '').trim();
            if (!name) {
                results.errors.push('Bỏ qua dòng không có tên profile');
                continue;
            }

            let cookieStr = null;
            if (item.cookies) {
                if (typeof item.cookies === 'string') cookieStr = item.cookies;
                else if (Array.isArray(item.cookies) || typeof item.cookies === 'object') {
                    cookieStr = JSON.stringify(item.cookies);
                }
            }

            const existing = byName.get(name.toLowerCase());
            if (existing) {
                if (cookieStr) {
                    updateCookieStmt.run(cookieStr, existing.id);
                    results.updated++;
                }
            } else {
                const newId = Date.now().toString() + '_' + Math.random().toString(36).slice(2, 7);
                insertProfileStmt.run(newId, name, cookieStr);
                byName.set(name.toLowerCase(), { id: newId, name });
                results.created++;
            }
        }

        res.json({
            success: true,
            message: `Nhập thành công: ${results.updated} profile được cập nhật, ${results.created} profile mới được tạo`,
            ...results
        });
    } catch (err) {
        console.error('Import cookies json error:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
