/**
 * SQLite persistence helpers for profile groups (no HTTP layer).
 */

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

export function initGroupSchema(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS groups (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            video_folder TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    try {
        const cols = db.prepare('PRAGMA table_info(groups)').all();
        if (!cols.some(c => c.name === 'video_folder')) {
            db.exec('ALTER TABLE groups ADD COLUMN video_folder TEXT;');
        }
    } catch (_) {}
}

function normalizeGroupName(name) {
    if (typeof name !== 'string') {
        throw httpError(400, 'Group name is required');
    }
    const trimmed = name.trim();
    if (trimmed.length === 0) {
        throw httpError(400, 'Group name is required');
    }
    return trimmed;
}

export function getGroupById(db, id) {
    return db
        .prepare('SELECT id, name, video_folder, created_at FROM groups WHERE id = ?')
        .get(id);
}

export function assertGroupExists(db, id) {
    if (!getGroupById(db, id)) {
        throw httpError(404, 'Group not found');
    }
}

export function listGroups(db) {
    return db
        .prepare(
            `
            SELECT
                g.id,
                g.name,
                g.video_folder,
                g.created_at,
                COUNT(p.id) AS profile_count
            FROM groups g
            LEFT JOIN profiles p ON p.group_id = g.id
            GROUP BY g.id, g.name, g.video_folder, g.created_at
            ORDER BY g.created_at DESC
        `
        )
        .all()
        .map((row) => ({
            ...row,
            profile_count: Number(row.profile_count)
        }));
}

export function createGroup(db, payload) {
    let id;
    let name;

    if (typeof payload === 'string') {
        name = payload;
    } else if (payload && typeof payload === 'object') {
        id = payload.id;
        name = payload.name;
    } else {
        throw httpError(400, 'Group name is required');
    }

    if (!id || typeof id !== 'string' || id.trim() === '') {
        id = 'grp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    } else {
        id = id.trim();
    }

    const trimmedName = normalizeGroupName(name);
    const existingName = db
        .prepare('SELECT id FROM groups WHERE LOWER(name) = LOWER(?)')
        .get(trimmedName);
    if (existingName) {
        throw httpError(400, 'Group name already exists');
    }
    try {
        db.prepare(
            'INSERT INTO groups (id, name) VALUES (?, ?)'
        ).run(id, trimmedName);
        return getGroupById(db, id);
    } catch (e) {
        if (e && e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            throw httpError(400, 'Group name already exists');
        }
        if (e && e.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
            throw httpError(400, 'A group with this id already exists');
        }
        throw e;
    }
}

export function updateGroup(db, id, updates = {}) {
    if (!id || typeof id !== 'string' || id.trim() === '') {
        throw httpError(400, 'Group id is required');
    }
    const trimmedId = id.trim();
    assertGroupExists(db, trimmedId);

    if (updates.name !== undefined) {
        const trimmedName = normalizeGroupName(updates.name);
        const conflict = db
            .prepare(
                'SELECT id FROM groups WHERE LOWER(name) = LOWER(?) AND id != ?'
            )
            .get(trimmedName, trimmedId);
        if (conflict) {
            throw httpError(400, 'Group name already exists');
        }
        db.prepare('UPDATE groups SET name = ? WHERE id = ?').run(
            trimmedName,
            trimmedId
        );
    }

    if (updates.video_folder !== undefined) {
        const folder = typeof updates.video_folder === 'string' ? updates.video_folder.trim() : null;
        db.prepare('UPDATE groups SET video_folder = ? WHERE id = ?').run(
            folder || null,
            trimmedId
        );
    }

    return getGroupById(db, trimmedId);
}

export function renameGroup(db, arg2, arg3) {
    let id;
    let name;

    if (arg2 && typeof arg2 === 'object') {
        id = arg2.id;
        name = arg2.name;
    } else {
        id = arg2;
        name = arg3;
    }

    return updateGroup(db, id, { name });
}

export function deleteGroup(db, id) {
    if (!id || typeof id !== 'string' || id.trim() === '') {
        throw httpError(400, 'Group id is required');
    }
    const trimmedId = id.trim();
    assertGroupExists(db, trimmedId);
    const row = db
        .prepare(
            'SELECT COUNT(*) AS n FROM profiles WHERE group_id = ?'
        )
        .get(trimmedId);
    const n = Number(row.n);
    if (n > 0) {
        throw httpError(
            400,
            'Cannot delete group: it still has profiles assigned'
        );
    }
    db.prepare('DELETE FROM groups WHERE id = ?').run(trimmedId);
    return { success: true };
}
