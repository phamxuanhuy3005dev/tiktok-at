import express from 'express';
import path from 'path';
import { chromium } from 'playwright';
import { buildBrowserLaunchOptions } from '../browser-launch.js';
import { db, PROFILES_DIR } from '../db.js';
import { executeBatchSession } from '../services/batch-runner.js';
import {
  closeProfileBrowser,
  launchPersistentContextSafe,
  setupAutoCloseOnEmpty,
  syncCookiesToDatabase,
} from '../services/browser-manager.js';
import { injectProfileCookies } from '../services/cookie-service.js';
import {
  addFavoriteMusic,
  runTikTokLogin,
} from '../services/tiktok-automation.js';
import {
  addingFavoriteMusicProfiles,
  dismissBatchSession,
  getAllBatchSessions,
  getBatchSession,
  loggingInProfiles,
  manualBrowsers,
  processingProfiles,
  runningProfiles,
} from '../services/tracker.js';

const router = express.Router();

// GET /api/batch-status
router.get('/batch-status', (req, res) => {
  const sessions = getAllBatchSessions();
  const latest = getBatchSession();
  res.json({
    ...(latest || { status: 'idle' }),
    sessions: sessions.length > 0 ? sessions : latest ? [latest] : [],
  });
});

// POST /api/batch-status/dismiss & /api/batch-dismiss
router.post(['/batch-status/dismiss', '/batch-dismiss'], (req, res) => {
  const { sessionId } = req.body || {};
  dismissBatchSession(sessionId || null);
  res.json({ status: 'dismissed', sessionId: sessionId || 'all' });
});

// POST /api/start
router.post('/start', async (req, res) => {
  const { profileId, profileIds, runMode, limitUploads, uploadLimitCount } =
    req.body;

  if (profileId) {
    const profile = db
      .prepare('SELECT * FROM profiles WHERE id = ?')
      .get(profileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    if (runningProfiles.has(profileId) || processingProfiles.has(profileId)) {
      return res
        .status(400)
        .json({ error: 'Profile already running or processing a video' });
    }

    executeBatchSession(
      [profile],
      'sequential',
      !!limitUploads,
      Number(uploadLimitCount) || 0,
      { title: `Profile: ${profile.name}` },
    ).catch((err) => console.error(`Error running ${profile.name}:`, err));

    return res.json({ status: 'started', profile: profile.name });
  }

  let profiles = [];
  if (Array.isArray(profileIds) && profileIds.length > 0) {
    const placeholders = profileIds.map(() => '?').join(',');
    profiles = db
      .prepare(`SELECT * FROM profiles WHERE id IN (${placeholders})`)
      .all(...profileIds);
    if (profiles.length === 0) {
      return res
        .status(400)
        .json({ error: 'No matching profiles for the given selection' });
    }
  } else {
    profiles = db.prepare('SELECT * FROM profiles').all();
    if (profiles.length === 0) {
      return res.status(400).json({ error: 'No profiles available to run' });
    }
  }

  const idleProfiles = profiles.filter(
    (p) => !runningProfiles.has(p.id) && !processingProfiles.has(p.id),
  );
  if (idleProfiles.length === 0) {
    return res.status(400).json({ error: 'No idle profiles in selection' });
  }

  const mode = runMode === 'sequential' ? 'sequential' : 'parallel';
  executeBatchSession(
    idleProfiles,
    mode,
    !!limitUploads,
    Number(uploadLimitCount) || 0,
  ).catch((err) => console.error('Batch session execution error:', err));

  return res.json({
    status: 'started',
    count: idleProfiles.length,
    runMode: mode,
  });
});

// POST /api/open-profile
router.post('/open-profile', async (req, res) => {
  const { profileId } = req.body;
  if (!profileId)
    return res.status(400).json({ error: 'Profile ID is required' });

  const profile = db
    .prepare('SELECT * FROM profiles WHERE id = ?')
    .get(profileId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  if (runningProfiles.has(profileId) || processingProfiles.has(profileId)) {
    return res.status(400).json({
      error: 'Profile is currently running automation or processing a video',
    });
  }

  if (manualBrowsers.has(profileId)) {
    const existingBrowser = manualBrowsers.get(profileId);
    const openPages = existingBrowser.pages().filter((p) => !p.isClosed());
    if (openPages.length > 0) {
      try {
        await openPages[0].bringToFront();
      } catch (e) {}
      return res.json({
        status: 'already_open',
        message: 'Browser is already open',
      });
    } else {
      // User closed the window on macOS/Windows, clean up dead context
      await closeProfileBrowser(profile.id, profile.name);
    }
  }

  try {
    const userDataDir = path.join(PROFILES_DIR, profile.name);
    const browserOptions = buildBrowserLaunchOptions(profile, {
      log: (msg) => console.log(`[${profile.name}] ${msg}`),
    });

    const browser = await launchPersistentContextSafe(
      chromium,
      userDataDir,
      browserOptions,
      profile,
    );
    await injectProfileCookies(browser, profile);
    manualBrowsers.set(profileId, browser);

    const syncCookies = async () => {
      await syncCookiesToDatabase(browser, profile.id);
    };

    const syncTimer = setInterval(syncCookies, 15000);

    browser.on('close', () => {
      clearInterval(syncTimer);
      manualBrowsers.delete(profileId);
      console.log(`[${profile.name}] Manual browser closed`);
    });

    // Auto-close persistent context when user closes the window on macOS or Windows
    setupAutoCloseOnEmpty(browser, profile, syncTimer);

    const page =
      browser.pages().length > 0 ? browser.pages()[0] : await browser.newPage();
    page.on('framenavigated', () => {
      syncCookies();
    });
    await page
      .goto('https://www.tiktok.com/', { waitUntil: 'domcontentloaded' })
      .catch(() => null);

    res.json({ status: 'opened', profile: profile.name });
  } catch (err) {
    console.error(`Failed to open browser for ${profile.name}:`, err);
    manualBrowsers.delete(profileId);
    res.status(500).json({ error: `Failed to launch browser: ${err.message}` });
  }
});

// POST /api/close-profile
router.post('/close-profile', async (req, res) => {
  const { profileId } = req.body;
  if (!profileId)
    return res.status(400).json({ error: 'Profile ID is required' });

  const profile = db
    .prepare('SELECT * FROM profiles WHERE id = ?')
    .get(profileId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  try {
    await closeProfileBrowser(profile.id, profile.name);
    res.json({ status: 'closed', profile: profile.name });
  } catch (err) {
    console.error(`Failed to close browser for ${profile.name}:`, err);
    res.status(500).json({ error: `Failed to close browser: ${err.message}` });
  }
});

// POST /api/login-tiktok
router.post('/login-tiktok', async (req, res) => {
  const { profileId } = req.body;
  if (!profileId)
    return res.status(400).json({ error: 'profileId is required' });

  const profile = db
    .prepare('SELECT * FROM profiles WHERE id = ?')
    .get(profileId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  if (runningProfiles.has(profileId) || processingProfiles.has(profileId)) {
    return res.status(400).json({
      error:
        'Profile is currently running upload automation or processing a video',
    });
  }
  if (loggingInProfiles.has(profileId)) {
    return res
      .status(400)
      .json({ error: 'Profile is already in login verification process' });
  }
  const hasCookies = profile.cookies && profile.cookies.trim();
  const hasCredentials = (profile.account_id || profile.email) && profile.pass;
  if (!hasCookies && !hasCredentials) {
    return res.status(400).json({
      error:
        'Profile chưa có cookies hoặc thông tin tài khoản (cần import CSV hoặc bấm Mở Profile để đăng nhập tay).',
    });
  }

  runTikTokLogin(profile).catch((err) =>
    console.error(`[${profile.name}] Login check error:`, err),
  );
  res.json({ status: 'started', profile: profile.name });
});

// POST /api/login-tiktok/stop
router.post('/login-tiktok/stop', async (req, res) => {
  const { profileId } = req.body;
  if (!profileId)
    return res.status(400).json({ error: 'profileId is required' });

  const session = loggingInProfiles.get(profileId);
  if (!session)
    return res.status(400).json({ error: 'Profile is not in login process' });

  session.stop = true;
  res.json({
    status: 'stopping',
    message: 'Login verification session will stop shortly',
  });
});

// GET /api/login-tiktok/status/:profileId
router.get('/login-tiktok/status/:profileId', (req, res) => {
  const session = loggingInProfiles.get(req.params.profileId);
  res.json({
    loggingIn: !!session,
    stats: session ? session.stats : null,
  });
});

// POST /api/add-favorite-music
router.post('/add-favorite-music', async (req, res) => {
  const { profileId, searchTerm } = req.body;
  if (!profileId || !searchTerm || !searchTerm.trim()) {
    return res
      .status(400)
      .json({ error: 'profileId and searchTerm are required' });
  }

  const profile = db
    .prepare('SELECT * FROM profiles WHERE id = ?')
    .get(profileId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  if (runningProfiles.has(profileId) || processingProfiles.has(profileId)) {
    return res.status(400).json({
      error: 'Profile is currently running automation or processing a video',
    });
  }
  if (addingFavoriteMusicProfiles.has(profileId)) {
    return res
      .status(400)
      .json({ error: 'Profile is already adding favorite music' });
  }

  res.json({
    status: 'started',
    profile: profile.name,
    searchTerm: searchTerm.trim(),
  });
  addFavoriteMusic(profile, searchTerm.trim()).catch((err) =>
    console.error(`[${profile.name}] Add favorite music failed:`, err),
  );
});

export default router;
