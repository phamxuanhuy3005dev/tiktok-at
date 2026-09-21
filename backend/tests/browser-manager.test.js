import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
    releaseProfileLocks,
    ensureProfileReadyForLaunch,
    closeProfileBrowser
} from '../services/browser-manager.js';
import { manualBrowsers } from '../services/tracker.js';

test('releaseProfileLocks: cleanly handles non-existent or empty directories', async () => {
    const tmpDir = path.join(os.tmpdir(), `test-empty-lock-${Date.now()}`);
    await assert.doesNotReject(async () => {
        await releaseProfileLocks(tmpDir, 'test-profile');
    });
});

test('releaseProfileLocks: unlinks lingering lock files', async () => {
    const tmpDir = path.join(os.tmpdir(), `test-lock-files-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    // Create dummy lock files
    fs.writeFileSync(path.join(tmpDir, 'lockfile'), 'dummy-lock');
    fs.writeFileSync(path.join(tmpDir, 'SingletonCookie'), '12345');

    // Create a dead symlink for SingletonLock
    try {
        fs.symlinkSync('dummy-host-999999', path.join(tmpDir, 'SingletonLock'));
    } catch (e) {}

    await releaseProfileLocks(tmpDir, 'test-profile');

    const fileExists = (p) => {
        try {
            fs.lstatSync(p);
            return true;
        } catch (e) {
            return false;
        }
    };

    assert.equal(fileExists(path.join(tmpDir, 'lockfile')), false);
    assert.equal(fileExists(path.join(tmpDir, 'SingletonCookie')), false);
    assert.equal(fileExists(path.join(tmpDir, 'SingletonLock')), false);

    fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('ensureProfileReadyForLaunch: closes open manual browser and cleans up tracking', async () => {
    const fakeProfileId = 'test-profile-id-123';
    let browserClosed = false;

    const fakeBrowser = {
        cookies: async () => [],
        close: async () => { browserClosed = true; },
        pages: () => []
    };

    manualBrowsers.set(fakeProfileId, fakeBrowser);
    assert.equal(manualBrowsers.has(fakeProfileId), true);

    await ensureProfileReadyForLaunch(fakeProfileId, 'non-existent-profile-folder');

    assert.equal(browserClosed, true);
    assert.equal(manualBrowsers.has(fakeProfileId), false);
});
