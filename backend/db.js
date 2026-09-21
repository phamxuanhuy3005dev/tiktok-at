import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initGroupSchema } from './group-store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// When running inside Electron, APP_DATA_DIR is set to app.getPath('userData')
// This ensures data survives app updates (stored in %APPDATA%\TikTok Automation)
export const APP_DATA_DIR = process.env.APP_DATA_DIR;
export const BASE_DIR = APP_DATA_DIR || path.join(__dirname, '..');

export const DB_DIR = path.join(BASE_DIR, 'data');
export const DB_PATH = path.join(DB_DIR, 'tiktok.db');
export const OLD_DB_PATH = path.join(DB_DIR, 'db.json');
export const PROFILES_DIR = path.join(BASE_DIR, 'profiles');
export const UPLOADS_DIR = path.join(BASE_DIR, 'uploads');
export const DUMMY_VIDEOS_DIR = path.join(BASE_DIR, 'dummy_videos');

// Ensure directories exist
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
if (!fs.existsSync(PROFILES_DIR)) fs.mkdirSync(PROFILES_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(DUMMY_VIDEOS_DIR)) fs.mkdirSync(DUMMY_VIDEOS_DIR, { recursive: true });

// Init SQLite DB
export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 10000');

// Create tables
db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT UNIQUE,
        status TEXT DEFAULT 'idle',
        video_folder TEXT,
        is_scheduled INTEGER DEFAULT 0,
        auto_increment_schedule INTEGER DEFAULT 1,
        schedule_interval INTEGER DEFAULT 10,
        upload_count INTEGER DEFAULT 1,
        remove_title INTEGER DEFAULT 1,
        set_music INTEGER DEFAULT 1,
        need_content_check INTEGER DEFAULT 0,
        channel_ids TEXT,
        fingerprint TEXT,
        use_fingerprint INTEGER DEFAULT 1,
        music_search TEXT,
        cookies TEXT,
        account_id TEXT,
        pass TEXT,
        email TEXT,
        pass_email TEXT,
        last_run TEXT,
        group_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT
    );
    CREATE TABLE IF NOT EXISTS profile_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id TEXT,
        time TEXT,
        FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );
`);

// Safe migration: ensure account_id, pass, email, pass_email exist
const credCols = ['account_id', 'pass', 'email', 'pass_email'];
try {
    const tableInfo = db.prepare("PRAGMA table_info(profiles)").all();
    const existingCols = new Set(tableInfo.map(c => c.name));
    for (const col of credCols) {
        if (!existingCols.has(col)) {
            try {
                db.exec(`ALTER TABLE profiles ADD COLUMN ${col} TEXT;`);
                console.log(`Added column ${col} to profiles table`);
            } catch (e) {
                console.error(`Error adding column ${col}:`, e.message);
            }
        }
    }

    // Drop only unused legacy columns (proxy, render, avatar)
    const unusedCols = [
        'proxy', 'use_proxy', 'needs_render', 'render_concat_video',
        'render_video_long', 'avatar_image'
    ];
    for (const col of unusedCols) {
        if (existingCols.has(col)) {
            try {
                db.exec('ALTER TABLE profiles DROP COLUMN ' + col + ';');
                console.log('Cleaned up unused column:', col);
            } catch (e) {
                console.error('Error dropping column ' + col + ':', e.message);
            }
        }
    }
} catch (err) {
    console.error('Migration error:', err);
}

initGroupSchema(db);

// Ensure database indexes exist for fast lookups & polling
try {
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_profile_schedules_profile_id ON profile_schedules(profile_id);
        CREATE INDEX IF NOT EXISTS idx_profiles_group_id ON profiles(group_id);
        CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);
    `);
} catch (err) {
    console.error('Index creation error:', err);
}

// Migration from db.json
if (fs.existsSync(OLD_DB_PATH)) {
    try {
        const oldData = JSON.parse(fs.readFileSync(OLD_DB_PATH, 'utf-8'));
        if (oldData.profiles) {
            const insertProfile = db.prepare('INSERT OR IGNORE INTO profiles (id, name, status) VALUES (?, ?, ?)');
            for (const p of oldData.profiles) {
                insertProfile.run(p.id, p.name, p.status || 'idle');
            }
        }
        if (oldData.config) {
            const insertConfig = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');
            Object.entries(oldData.config).forEach(([k, v]) => {
                insertConfig.run(k, String(v));
            });
        }
        // Rename old DB to avoid repeat migration
        fs.renameSync(OLD_DB_PATH, OLD_DB_PATH + '.bak');
        console.log('Migrated data from db.json to SQLite');
    } catch (err) {
        console.error('Migration error:', err);
    }
}

// Config helpers
export const getConfig = (key, defaultValue) => {
    const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key);
    return row ? row.value : defaultValue;
};

export const setConfig = (key, value) => {
    db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, String(value));
};
