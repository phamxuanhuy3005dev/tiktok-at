import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildBrowserLaunchOptions
} from '../browser-launch.js';

test('buildBrowserLaunchOptions: base shape matching feature/change_music_auto', () => {
    const opts = buildBrowserLaunchOptions(null, {});
    assert.equal(opts.headless, false);
    assert.deepEqual(opts.args, ['--disable-blink-features=AutomationControlled']);
    assert.equal(opts.chromiumSandbox, undefined);
    assert.equal(opts.ignoreDefaultArgs, undefined);
    assert.equal(opts.viewport, undefined);
});

test('buildBrowserLaunchOptions: extraArgs and viewport pass through', () => {
    const opts = buildBrowserLaunchOptions(null, {
        extraArgs: ['--window-size=1440,900'],
        viewport: { width: 1440, height: 900 }
    });
    assert.equal(opts.headless, false);
    assert.deepEqual(opts.args, ['--disable-blink-features=AutomationControlled', '--window-size=1440,900']);
    assert.deepEqual(opts.viewport, { width: 1440, height: 900 });
});
