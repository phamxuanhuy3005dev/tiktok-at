import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';

import { initGroupSchema } from '../group-store.js';
import { importCookiesJsonRecords } from '../routes/cookies.js';

const makeDb = () => {
    const db = new Database(':memory:');
    db.exec(`
        CREATE TABLE profiles (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE,
            status TEXT DEFAULT 'idle',
            video_folder TEXT,
            is_scheduled INTEGER DEFAULT 0,
            auto_increment_schedule INTEGER DEFAULT 1,
            last_run TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            group_id TEXT,
            set_music INTEGER DEFAULT 1,
            upload_count INTEGER DEFAULT 1,
            channel_ids TEXT DEFAULT '',
            remove_title INTEGER DEFAULT 1,
            need_content_check INTEGER DEFAULT 0,
            schedule_interval INTEGER DEFAULT 10,
            cookies TEXT
        );
    `);
    initGroupSchema(db);
    return db;
};

test('importCookiesJsonRecords creates new group and assigns new profile to it', () => {
    const db = makeDb();

    const items = [
        {
            name: 'testsasa',
            group: 'test',
            cookies: []
        }
    ];

    const result = importCookiesJsonRecords(db, items);
    assert.equal(result.created, 1);
    assert.equal(result.updated, 0);
    assert.equal(result.errors.length, 0);

    // Group should be automatically created in groups table
    const group = db.prepare('SELECT * FROM groups WHERE name = ?').get('test');
    assert.ok(group, 'Group "test" should have been created');
    assert.ok(group.id.startsWith('grp_'));

    // Profile should be created and linked to group.id
    const profile = db.prepare('SELECT * FROM profiles WHERE name = ?').get('testsasa');
    assert.ok(profile, 'Profile "testsasa" should exist');
    assert.equal(profile.group_id, group.id);
    assert.equal(profile.cookies, null, 'Empty array should store cookies as null');
});

test('importCookiesJsonRecords reuses existing group if it already exists', () => {
    const db = makeDb();
    db.prepare('INSERT INTO groups (id, name) VALUES (?, ?)').run('grp_existing_1', 'my_group');

    const items = [
        {
            name: 'profile_1',
            group: 'my_group',
            cookies: [{ name: 'sessionid', value: 'xyz123' }]
        }
    ];

    const result = importCookiesJsonRecords(db, items);
    assert.equal(result.created, 1);

    const profile = db.prepare('SELECT * FROM profiles WHERE name = ?').get('profile_1');
    assert.equal(profile.group_id, 'grp_existing_1');
    assert.ok(profile.cookies.includes('xyz123'));
});

test('importCookiesJsonRecords assigns existing profile to new or existing group upon re-import', () => {
    const db = makeDb();
    // Insert existing profile without group
    db.prepare('INSERT INTO profiles (id, name, group_id) VALUES (?, ?, ?)').run('p_1', 'testsasa', null);

    const items = [
        {
            name: 'testsasa',
            group: 'test',
            cookies: []
        }
    ];

    const result = importCookiesJsonRecords(db, items);
    assert.equal(result.created, 0);
    assert.equal(result.updated, 1);

    const group = db.prepare('SELECT * FROM groups WHERE name = ?').get('test');
    assert.ok(group, 'Group "test" should be created');

    const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get('p_1');
    assert.equal(profile.group_id, group.id, 'Existing profile should have its group_id updated');
});

test('importCookiesJsonRecords multiple profiles with same group creates group once', () => {
    const db = makeDb();

    const items = [
        { name: 'p1', group: 'shared_group', cookies: [] },
        { name: 'p2', group: 'shared_group', cookies: [] }
    ];

    const result = importCookiesJsonRecords(db, items);
    assert.equal(result.created, 2);

    const groups = db.prepare('SELECT * FROM groups WHERE name = ?').all('shared_group');
    assert.equal(groups.length, 1, 'Only one group should be created');

    const p1 = db.prepare('SELECT * FROM profiles WHERE name = ?').get('p1');
    const p2 = db.prepare('SELECT * FROM profiles WHERE name = ?').get('p2');
    assert.equal(p1.group_id, groups[0].id);
    assert.equal(p2.group_id, groups[0].id);
});
