import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildBrowserLaunchOptions,
  PERFORMANCE_CHROME_ARGS,
} from '../browser-launch.js';

test('buildBrowserLaunchOptions: base shape matching feature/change_music_auto', () => {
  const opts = buildBrowserLaunchOptions(null, {});
  assert.equal(opts.headless, false);
  assert.deepEqual(opts.args, PERFORMANCE_CHROME_ARGS);
  assert.ok(
    opts.args.includes('--disable-blink-features=AutomationControlled'),
  );
  assert.ok(opts.args.includes('--js-flags=--max-old-space-size=512'));
  assert.equal(opts.chromiumSandbox, undefined);
  assert.equal(opts.ignoreDefaultArgs, undefined);
  assert.equal(opts.viewport, undefined);
});

test('buildBrowserLaunchOptions: extraArgs and viewport pass through', () => {
  const opts = buildBrowserLaunchOptions(null, {
    extraArgs: ['--window-size=1440,900'],
    viewport: { width: 1440, height: 900 },
  });
  assert.equal(opts.headless, false);
  assert.deepEqual(opts.args, [
    ...PERFORMANCE_CHROME_ARGS,
    '--window-size=1440,900',
  ]);
  assert.deepEqual(opts.viewport, { width: 1440, height: 900 });
});
