import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectCaptcha,
  waitForCaptchaResolution,
  dismissPopups,
} from '../services/tiktok-automation.js';

test('detectCaptcha: returns false for null or closed page', async () => {
  assert.equal(await detectCaptcha(null), false);
  assert.equal(await detectCaptcha(undefined), false);

  const mockClosedPage = {
    isClosed: () => true,
  };
  assert.equal(await detectCaptcha(mockClosedPage), false);
});

test('detectCaptcha: detects captcha iframe by url', async () => {
  const mainFrame = { url: () => 'https://www.tiktok.com/tiktokstudio/upload' };
  const verifyFrame = {
    url: () => 'https://verify.tiktok.com/captcha?region=us',
  };

  const mockPage = {
    isClosed: () => false,
    mainFrame: () => mainFrame,
    frames: () => [mainFrame, verifyFrame],
    locator: () => ({
      count: async () => 0,
    }),
    evaluate: async () => false,
  };

  assert.equal(await detectCaptcha(mockPage), true);
});

test('detectCaptcha: detects captcha byteoversea frame', async () => {
  const mainFrame = { url: () => 'https://www.tiktok.com/tiktokstudio/upload' };
  const verifyFrame = {
    url: () => 'https://verify.byteoversea.com/captcha/v2',
  };

  const mockPage = {
    isClosed: () => false,
    mainFrame: () => mainFrame,
    frames: () => [mainFrame, verifyFrame],
    locator: () => ({
      count: async () => 0,
    }),
    evaluate: async () => false,
  };

  assert.equal(await detectCaptcha(mockPage), true);
});

test('detectCaptcha: detects captcha DOM container', async () => {
  const mainFrame = { url: () => 'https://www.tiktok.com/tiktokstudio/upload' };
  const mockPage = {
    isClosed: () => false,
    mainFrame: () => mainFrame,
    frames: () => [mainFrame],
    locator: () => ({
      count: async () => 1,
      nth: () => ({
        isVisible: async () => true,
      }),
    }),
    evaluate: async () => false,
  };

  assert.equal(await detectCaptcha(mockPage), true);
});

test('detectCaptcha: returns false when no captcha is present', async () => {
  const mainFrame = { url: () => 'https://www.tiktok.com/tiktokstudio/upload' };
  const otherFrame = { url: () => 'https://www.tiktok.com/embed/v2' };
  const mockPage = {
    isClosed: () => false,
    mainFrame: () => mainFrame,
    frames: () => [mainFrame, otherFrame],
    locator: () => ({
      count: async () => 0,
    }),
    evaluate: async () => false,
  };

  assert.equal(await detectCaptcha(mockPage), false);
});

test('dismissPopups: skips dismiss when captcha is detected', async () => {
  const mainFrame = { url: () => 'https://www.tiktok.com/tiktokstudio/upload' };
  const verifyFrame = { url: () => 'https://verify.tiktok.com/check' };
  let clicked = false;

  const mockPage = {
    isClosed: () => false,
    mainFrame: () => mainFrame,
    frames: () => [mainFrame, verifyFrame],
    locator: () => ({ count: async () => 0 }),
    evaluate: async () => false,
    $$: async () => [
      {
        isVisible: async () => true,
        innerText: async () => 'Verify to continue',
        $: async () => ({
          isVisible: async () => true,
          click: async () => {
            clicked = true;
          },
        }),
      },
    ],
  };

  const result = await dismissPopups(mockPage);
  assert.equal(result, false);
  assert.equal(clicked, false, 'Should not click any button when captcha is present');
});

test('waitForCaptchaResolution: returns true when captcha resolves', async () => {
  let captchaActive = true;
  const mainFrame = { url: () => 'https://www.tiktok.com/tiktokstudio/upload' };

  const mockPage = {
    isClosed: () => false,
    mainFrame: () => mainFrame,
    frames: () =>
      captchaActive
        ? [mainFrame, { url: () => 'https://verify.tiktok.com/' }]
        : [mainFrame],
    locator: () => ({ count: async () => 0 }),
    evaluate: async () => false,
    bringToFront: async () => {},
    waitForTimeout: async () => {
      // Simulate captcha being solved on first wait loop
      captchaActive = false;
    },
  };

  const logs = [];
  const profile = { id: 'test_captcha_p1', name: 'test_captcha' };

  const resolved = await waitForCaptchaResolution(
    mockPage,
    (m) => logs.push(m),
    profile,
    5,
  );

  assert.equal(resolved, true);
  assert.ok(logs.some((l) => l.includes('CAPTCHA DETECTED')));
  assert.ok(logs.some((l) => l.includes('CAPTCHA SOLVED')));
});

test('attachCaptchaStabilizer: holds subsequent requests when BdTuring is detected and releases on verify', async () => {
  const { attachCaptchaStabilizer } = await import('../services/browser-manager.js');

  let routePattern = null;
  let routeHandler = null;
  const responseHandlers = [];
  let exposeName = null;
  let exposeFn = null;

  const mockContext = {
    route: async (pattern, handler) => {
      routePattern = pattern;
      routeHandler = handler;
    },
    on: (evt, handler) => {
      if (evt === 'response') responseHandlers.push(handler);
    },
    exposeFunction: async (name, fn) => {
      exposeName = name;
      exposeFn = fn;
    },
    addInitScript: async () => {},
  };

  await attachCaptchaStabilizer(mockContext, { id: 'p1', name: 'profile1' });

  assert.equal(routePattern, '**/api/v1/user/profile/upload/**');
  assert.ok(typeof routeHandler === 'function');
  assert.equal(exposeName, '__notifyTikTokCaptchaDismissed');

  // Simulate 1st request returning 3008017 (BdTuring)
  let fulfilled1 = false;
  const mockRoute1 = {
    fetch: async () => ({
      status: () => 200,
      text: async () => JSON.stringify({ status_code: 3008017, status_msg: 'BdTuring' }),
    }),
    fulfill: async () => {
      fulfilled1 = true;
    },
    continue: async () => {},
  };

  await routeHandler(mockRoute1);
  assert.equal(fulfilled1, true, 'First route should fulfill with BdTuring');

  // Simulate 2nd concurrent request while captcha is active -> should be HELD
  let continued2 = false;
  const mockRoute2 = {
    fetch: async () => {
      throw new Error('Should not fetch while captcha is active');
    },
    fulfill: async () => {},
    continue: async () => {
      continued2 = true;
    },
  };

  await routeHandler(mockRoute2);
  assert.equal(continued2, false, 'Second route should be held, not continued yet');

  // Simulate captcha verify response success
  const verifyResponse = {
    url: () => 'https://verification.tiktokw.us/captcha/verify',
    json: async () => ({ code: 200, message: 'success' }),
  };

  for (const h of responseHandlers) {
    await h(verifyResponse);
  }

  // Wait for the release timeout
  await new Promise((r) => setTimeout(r, 700));

  assert.equal(continued2, true, 'Held second route should be continued after verify');
});

test('attachCaptchaStabilizer: releases held requests when DOM detects dismissal', async () => {
  const { attachCaptchaStabilizer } = await import('../services/browser-manager.js');

  let routeHandler = null;
  let onDismissed = null;

  const mockContext = {
    route: async (pattern, handler) => {
      routeHandler = handler;
    },
    on: () => {},
    exposeFunction: async (name, fn) => {
      if (name === '__notifyTikTokCaptchaDismissed') onDismissed = fn;
    },
    addInitScript: async () => {},
  };

  await attachCaptchaStabilizer(mockContext, { id: 'p2', name: 'profile2' });

  // 1. BdTuring triggers captchaActive
  await routeHandler({
    fetch: async () => ({
      status: () => 200,
      text: async () => '{"status_code": 3008017, "status_msg": "BdTuring"}',
    }),
    fulfill: async () => {},
    continue: async () => {},
  });

  // 2. Second request is held
  let released = false;
  await routeHandler({
    fetch: async () => {},
    fulfill: async () => {},
    continue: async () => {
      released = true;
    },
  });
  assert.equal(released, false);

  // 3. User closes modal -> triggers __notifyTikTokCaptchaDismissed
  await onDismissed();
  assert.equal(released, true, 'Held route should be released when captcha is dismissed');
});

