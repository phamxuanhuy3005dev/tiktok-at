import { assertGroupExists } from './group-store.js';

const normalizeGroupId = (value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;

    const trimmed = String(value).trim();
    return trimmed === '' ? null : trimmed;
};

const normalizeOptionalText = (value) => {
    if (value === undefined || value === null) return null;
    const trimmed = String(value).trim();
    return trimmed === '' ? null : trimmed;
};

const createStoreError = (message, status) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

export function createProfileRecord(db, {
    id,
    name,
    group_id,
    video_folder,
    channel_ids,
    remove_title,
    need_content_check,
    set_music,
    music_search,
    auto_increment_schedule,
    schedule_interval,
    use_fingerprint,
    account_id,
    pass,
    email,
    pass_email,
    cookies
}) {
    if (name === undefined || name === null) {
        throw createStoreError('Name is required', 400);
    }
    if (typeof name !== 'string') {
        throw createStoreError('Name must be a string', 400);
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
        throw createStoreError('Name is required', 400);
    }

    const normalizedGroupId = normalizeGroupId(group_id);
    if (normalizedGroupId) {
        assertGroupExists(db, normalizedGroupId);
    }

    const normalizedVideoFolder = normalizeOptionalText(video_folder);
    const normalizedChannelIds = normalizeOptionalText(channel_ids);
    const normalizedRemoveTitle = remove_title !== undefined ? (remove_title ? 1 : 0) : 1;
    const normalizedNeedContentCheck = need_content_check !== undefined ? (need_content_check ? 1 : 0) : 0;
    const normalizedSetMusic = set_music !== undefined ? (set_music ? 1 : 0) : 1;

    const profileId = (typeof id === 'string' && id.trim())
        ? id.trim()
        : Date.now().toString() + '_' + Math.random().toString(36).slice(2, 8);

    try {
        const tableInfo = db.prepare('PRAGMA table_info(profiles)').all();
        const cols = new Set(tableInfo.map(c => c.name));

        const fields = ['id', 'name', 'status', 'is_scheduled', 'upload_count'];
        const values = [profileId, trimmedName, 'idle', 0, 1];

        if (cols.has('group_id')) {
            fields.push('group_id');
            values.push(normalizedGroupId ?? null);
        }
        if (cols.has('video_folder')) {
            fields.push('video_folder');
            values.push(normalizedVideoFolder);
        }
        if (cols.has('music_search')) {
            fields.push('music_search');
            values.push(normalizeOptionalText(music_search));
        }
        if (cols.has('auto_increment_schedule')) {
            fields.push('auto_increment_schedule');
            values.push(auto_increment_schedule !== undefined ? (auto_increment_schedule ? 1 : 0) : 1);
        }
        if (cols.has('schedule_interval')) {
            fields.push('schedule_interval');
            values.push(Number(schedule_interval) || 10);
        }
        if (cols.has('remove_title')) {
            fields.push('remove_title');
            values.push(normalizedRemoveTitle);
        }
        if (cols.has('set_music')) {
            fields.push('set_music');
            values.push(normalizedSetMusic);
        }
        if (cols.has('need_content_check')) {
            fields.push('need_content_check');
            values.push(normalizedNeedContentCheck);
        }
        if (cols.has('use_fingerprint')) {
            fields.push('use_fingerprint');
            values.push(use_fingerprint !== undefined ? (use_fingerprint ? 1 : 0) : 1);
        }
        if (cols.has('channel_ids')) {
            fields.push('channel_ids');
            values.push(normalizedChannelIds);
        }
        if (cols.has('account_id')) {
            fields.push('account_id');
            values.push(normalizeOptionalText(account_id));
        }
        if (cols.has('pass')) {
            fields.push('pass');
            values.push(normalizeOptionalText(pass));
        }
        if (cols.has('email')) {
            fields.push('email');
            values.push(normalizeOptionalText(email));
        }
        if (cols.has('pass_email')) {
            fields.push('pass_email');
            values.push(normalizeOptionalText(pass_email));
        }
        if (cols.has('cookies')) {
            fields.push('cookies');
            values.push(normalizeOptionalText(cookies));
        }

        const placeholders = fields.map(() => '?').join(', ');
        const query = `INSERT INTO profiles (${fields.join(', ')}) VALUES (${placeholders})`;
        db.prepare(query).run(...values);
    } catch (e) {
        if (e && e.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
            throw createStoreError(
                'A profile with this id already exists',
                400
            );
        }
        if (e && e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            const msg = String(e.message ?? '');
            if (msg.includes('profiles.name')) {
                throw createStoreError(
                    'A profile with this name already exists',
                    400
                );
            }
            if (msg.includes('profiles.id')) {
                throw createStoreError(
                    'A profile with this id already exists',
                    400
                );
            }
            throw createStoreError(
                'Profile violates a unique constraint',
                409
            );
        }
        console.error('[profile-store] Failed to create profile record:', e);
        throw createStoreError('Could not create profile: ' + e.message, 500);
    }

    return db
        .prepare(
            `
            SELECT
                p.*,
                g.name AS group_name
            FROM profiles p
            LEFT JOIN groups g ON g.id = p.group_id
            WHERE p.id = ?
        `
        )
        .get(profileId);
}
