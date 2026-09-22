import express from 'express';
import fs from 'fs';
import path from 'path';
import { db, PROFILES_DIR } from '../db.js';
import { parseCookies, captureBrowserCookies, extractCookiesFromDisk } from '../services/cookie-service.js';
import { manualBrowsers } from '../services/tracker.js';
import { createProfileRecord } from '../profile-store.js';
import { createGroup } from '../group-store.js';
import { closeProfileBrowser } from '../services/browser-manager.js';

const router = express.Router();

// POST /api/profiles/:id/logout — Clear cookies & browser session
router.post('/profiles/:id/logout', async (req, res) => {
    const profileId = req.params.id;
    const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(profileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    try {
        await closeProfileBrowser(profile.id, profile.name);
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

export function importCookiesJsonRecords(database, items) {
    if (!Array.isArray(items)) {
        throw new Error('Dữ liệu phải là một mảng các profile JSON');
    }

    const results = { updated: 0, created: 0, errors: [] };
    const existingProfiles = database.prepare('SELECT id, name, group_id, cookies FROM profiles').all();
    const byName = new Map(existingProfiles.map(p => [p.name.toLowerCase(), p]));

    const existingGroups = database.prepare('SELECT id, name FROM groups').all();
    const groupById = new Map(existingGroups.map(g => [g.id, g]));
    const groupByName = new Map(existingGroups.map(g => [g.name.toLowerCase().trim(), g]));

    for (const item of items) {
        const name = (item.name || item.profile_name || '').trim();
        if (!name) {
            results.errors.push('Bỏ qua dòng không có tên profile');
            continue;
        }

        let cookieStr = null;
        if (item.cookies !== undefined && item.cookies !== null) {
            if (typeof item.cookies === 'string') {
                const trimmed = item.cookies.trim();
                if (trimmed && trimmed !== '[]' && trimmed !== '{}') {
                    cookieStr = trimmed;
                }
            } else if (Array.isArray(item.cookies)) {
                if (item.cookies.length > 0) {
                    cookieStr = JSON.stringify(item.cookies);
                }
            } else if (typeof item.cookies === 'object' && Object.keys(item.cookies).length > 0) {
                cookieStr = JSON.stringify(item.cookies);
            }
        }

        // Resolve group: support item.group (string or object), item.group_name, item.group_id
        let targetGroupId = null;
        let groupNameInput = '';
        if (typeof item.group === 'string') groupNameInput = item.group;
        else if (item.group && typeof item.group.name === 'string') groupNameInput = item.group.name;
        else if (typeof item.group_name === 'string') groupNameInput = item.group_name;
        groupNameInput = groupNameInput.trim();

        let rawGroupId = '';
        if (typeof item.group_id === 'string') rawGroupId = item.group_id;
        else if (item.group && typeof item.group.id === 'string') rawGroupId = item.group.id;
        rawGroupId = rawGroupId.trim();

        if (groupNameInput) {
            let matchedGroup = groupByName.get(groupNameInput.toLowerCase());
            if (!matchedGroup) {
                try {
                    matchedGroup = createGroup(database, { name: groupNameInput });
                    groupById.set(matchedGroup.id, matchedGroup);
                    groupByName.set(matchedGroup.name.toLowerCase().trim(), matchedGroup);
                } catch (err) {
                    matchedGroup = database.prepare('SELECT id, name FROM groups WHERE LOWER(name) = LOWER(?)').get(groupNameInput);
                    if (matchedGroup) {
                        groupById.set(matchedGroup.id, matchedGroup);
                        groupByName.set(matchedGroup.name.toLowerCase().trim(), matchedGroup);
                    }
                }
            }
            if (matchedGroup) {
                targetGroupId = matchedGroup.id;
            }
        } else if (rawGroupId && groupById.has(rawGroupId)) {
            targetGroupId = rawGroupId;
        }

        const existing = byName.get(name.toLowerCase());
        if (existing) {
            const updates = [];
            const params = [];
            if (cookieStr) {
                updates.push('cookies = ?');
                params.push(cookieStr);
            }
            if (targetGroupId) {
                updates.push('group_id = ?');
                params.push(targetGroupId);
            }
            if (updates.length > 0) {
                params.push(existing.id);
                database.prepare(`UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`).run(...params);
                if (targetGroupId) existing.group_id = targetGroupId;
                if (cookieStr) existing.cookies = cookieStr;
            }
            results.updated++;
        } else {
            try {
                const newProfile = createProfileRecord(database, {
                    name,
                    cookies: cookieStr,
                    auto_increment_schedule: item.auto_increment_schedule !== undefined ? (item.auto_increment_schedule ? 1 : 0) : 1,
                    schedule_interval: Number(item.schedule_interval) || 10,
                    set_music: item.set_music !== undefined ? (item.set_music ? 1 : 0) : 1,
                    remove_title: item.remove_title !== undefined ? (item.remove_title ? 1 : 0) : 1,
                    need_content_check: item.need_content_check !== undefined ? (item.need_content_check ? 1 : 0) : 0,
                    group_id: targetGroupId,
                    video_folder: item.video_folder || null
                });
                byName.set(name.toLowerCase(), {
                    id: newProfile.id,
                    name: newProfile.name,
                    group_id: newProfile.group_id,
                    cookies: newProfile.cookies
                });
                results.created++;
            } catch (err) {
                results.errors.push(`Lỗi tạo profile "${name}": ${err.message}`);
            }
        }
    }

    return results;
}

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

        const results = importCookiesJsonRecords(db, items);

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
