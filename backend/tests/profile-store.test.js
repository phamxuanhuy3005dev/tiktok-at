import Database from 'better-sqlite3';
import assert from 'node:assert/strict';
import test from 'node:test';

import { createGroup, initGroupSchema } from '../group-store.js';
import { createProfileRecord } from '../profile-store.js';

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
            schedule_interval INTEGER DEFAULT 10
        );
    `);
  initGroupSchema(db);
  return db;
};

test('createProfileRecord stores a profile without group when group_id is empty', () => {
  const db = makeDb();

  const profile = createProfileRecord(db, {
    id: 'p-1',
    name: 'Profile A',
    group_id: '',
  });

  assert.equal(profile.id, 'p-1');
  assert.equal(profile.name, 'Profile A');
  assert.equal(profile.group_id, null);
  assert.equal(profile.group_name, null);
  assert.equal(profile.status, 'idle');
  assert.equal(profile.is_scheduled, 0);
});

test('createProfileRecord auto-generates id and defaults schedule_interval to 10 when omitted', () => {
  const db = makeDb();

  const profile = createProfileRecord(db, {
    name: 'Auto ID Profile',
  });

  assert.ok(profile.id, 'profile.id should be truthy');
  assert.equal(typeof profile.id, 'string');
  assert.ok(profile.id.length > 5);
  assert.equal(profile.name, 'Auto ID Profile');
  assert.equal(profile.schedule_interval, 10);
});

test('createProfileRecord stores a valid group_id', () => {
  const db = makeDb();
  createGroup(db, { id: 'g-1', name: 'Team A' });

  const profile = createProfileRecord(db, {
    id: 'p-2',
    name: 'Profile B',
    group_id: 'g-1',
  });

  assert.equal(profile.group_id, 'g-1');
  assert.equal(profile.group_name, 'Team A');
});

test('createProfileRecord stores video_folder when provided', () => {
  const db = makeDb();

  const profile = createProfileRecord(db, {
    id: 'p-video-1',
    name: 'Profile With Folder',
    group_id: '',
    video_folder: '/tmp/profile-videos',
  });

  assert.equal(profile.video_folder, '/tmp/profile-videos');
});

test('createProfileRecord normalizes empty video_folder to null', () => {
  const db = makeDb();

  const profile = createProfileRecord(db, {
    id: 'p-video-2',
    name: 'Profile Without Folder',
    group_id: '',
    video_folder: '   ',
  });

  assert.equal(profile.video_folder, null);
});

test('createProfileRecord rejects a missing group', () => {
  const db = makeDb();

  assert.throws(
    () =>
      createProfileRecord(db, {
        id: 'p-3',
        name: 'Profile C',
        group_id: 'missing',
      }),
    /group not found/i,
  );
});

test('createProfileRecord does not insert when group is missing', () => {
  const db = makeDb();

  assert.throws(
    () =>
      createProfileRecord(db, {
        id: 'p-3',
        name: 'Profile C',
        group_id: 'missing',
      }),
    /group not found/i,
  );

  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM profiles').get().n, 0);
});

test('createProfileRecord rejects non-string name', () => {
  const db = makeDb();

  assert.throws(
    () =>
      createProfileRecord(db, {
        id: 'p-nonstring',
        name: {},
        group_id: '',
      }),
    (err) => err.status === 400 && /name must be a string/i.test(err.message),
  );

  assert.throws(
    () =>
      createProfileRecord(db, {
        id: 'p-nonstring-2',
        name: 123,
        group_id: '',
      }),
    (err) => err.status === 400 && /name must be a string/i.test(err.message),
  );

  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM profiles').get().n, 0);
});

test('createProfileRecord rejects blank or whitespace-only name', () => {
  const db = makeDb();

  assert.throws(
    () =>
      createProfileRecord(db, {
        id: 'p-bad',
        name: '',
        group_id: '',
      }),
    (err) => err.status === 400 && /name is required/i.test(err.message),
  );

  assert.throws(
    () =>
      createProfileRecord(db, {
        id: 'p-bad2',
        name: '   \t  ',
        group_id: '',
      }),
    (err) => err.status === 400 && /name is required/i.test(err.message),
  );

  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM profiles').get().n, 0);
});

test('createProfileRecord maps duplicate name insert to a store error', () => {
  const db = makeDb();

  createProfileRecord(db, {
    id: 'p-first',
    name: 'Unique Name',
    group_id: '',
  });

  assert.throws(
    () =>
      createProfileRecord(db, {
        id: 'p-second',
        name: 'Unique Name',
        group_id: '',
      }),
    (err) =>
      err.status === 400 &&
      /profile with this name already exists/i.test(err.message),
  );

  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM profiles').get().n, 1);
});

test('createProfileRecord maps duplicate id insert to a store error', () => {
  const db = makeDb();

  createProfileRecord(db, {
    id: 'p-same-id',
    name: 'First Profile',
    group_id: '',
  });

  assert.throws(
    () =>
      createProfileRecord(db, {
        id: 'p-same-id',
        name: 'Second Profile',
        group_id: '',
      }),
    (err) =>
      err.status === 400 &&
      /profile with this id already exists/i.test(err.message),
  );

  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM profiles').get().n, 1);
});

test('createProfileRecord stores credentials and cookies when provided', () => {
  const db = makeDb();
  db.exec(`
        ALTER TABLE profiles ADD COLUMN account_id TEXT;
        ALTER TABLE profiles ADD COLUMN pass TEXT;
        ALTER TABLE profiles ADD COLUMN email TEXT;
        ALTER TABLE profiles ADD COLUMN pass_email TEXT;
        ALTER TABLE profiles ADD COLUMN cookies TEXT;
    `);

  const profile = createProfileRecord(db, {
    id: 'p-cred-1',
    name: 'Cred Profile',
    account_id: 'tiktok_user_1',
    pass: 'tiktok_pass_1',
    email: 'user@hotmail.com',
    pass_email: 'mail_pass_1',
    cookies: '[{"name":"sessionid","value":"123"}]',
  });

  assert.equal(profile.id, 'p-cred-1');
  assert.equal(profile.account_id, 'tiktok_user_1');
  assert.equal(profile.pass, 'tiktok_pass_1');
  assert.equal(profile.email, 'user@hotmail.com');
  assert.equal(profile.pass_email, 'mail_pass_1');
  assert.equal(profile.cookies, '[{"name":"sessionid","value":"123"}]');
});
