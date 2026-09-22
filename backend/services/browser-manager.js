import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PROFILES_DIR, db } from '../db.js';
import { manualBrowsers, loggingInProfiles } from './tracker.js';

const execAsync = promisify(exec);
const lastSyncedCookies = new Map(); // profileId -> json string cache

const LOCK_FILES = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile'];

/**
 * Query OS process table to find all Chromium processes (main + helpers)
 * whose command line contains this profile user-data-dir.
 */
export async function getProfilePids(userDataDir) {
    if (!userDataDir || !fs.existsSync(userDataDir)) return [];
    try {
        if (process.platform === 'win32') {
            const dirName = path.basename(userDataDir).replace(/["'\\]/g, '');
            if (!dirName) return [];
            const psCmd = `powershell -NoProfile -NonInteractive -Command "Get-CimInstance Win32_Process | Where-Object { ($_.Name -like '*chrome*') -and ($_.CommandLine -like '*${dirName}*') } | Select-Object -ExpandProperty ProcessId"`;
            const { stdout } = await execAsync(psCmd).catch(() => ({ stdout: '' }));
            return stdout.split('\n')
                .map(s => parseInt(s.trim(), 10))
                .filter(pid => pid && !isNaN(pid) && pid > 0);
        } else {
            // macOS and Linux
            const { stdout } = await execAsync('ps -Ao pid,args').catch(() => ({ stdout: '' }));
            const pids = [];
            for (const line of stdout.split('\n')) {
                if (line.includes(userDataDir) && (line.includes('chrome') || line.includes('Chromium') || line.includes('Google Chrome'))) {
                    const parts = line.trim().split(/\s+/);
                    const pid = parseInt(parts[0], 10);
                    if (pid && !isNaN(pid) && pid !== process.pid) {
                        pids.push(pid);
                    }
                }
            }
            return pids;
        }
    } catch {
        return [];
    }
}

/**
 * Clean up OS-level lock files and terminate ALL lingering/orphaned Chromium processes
 * (main, GPU, Network, Renderers) for a specific profile's user-data-dir.
 * Optimized with fast-path: skips heavy process queries when no locks exist.
 */
export async function releaseProfileLocks(userDataDir, profileName) {
    if (!userDataDir || !fs.existsSync(userDataDir)) return;

    // Fast-path: Check if any lock file actually exists on disk
    let foundLocks = [];
    for (const file of LOCK_FILES) {
        const p = path.join(userDataDir, file);
        try {
            const s = fs.lstatSync(p);
            if (s.isSymbolicLink() || s.isFile() || s.isSocket()) {
                foundLocks.push(p);
            }
        } catch (e) {}
    }

    // If no lock files exist, Chromium is not running on this profile.
    // Exit immediately (0ms) instead of running slow PowerShell/ps queries.
    if (foundLocks.length === 0) {
        return;
    }

    // 1. Terminate all Chromium processes matching this profile's user-data-dir
    const pids = await getProfilePids(userDataDir);
    if (pids.length > 0) {
        console.log(`[${profileName}] Found ${pids.length} lingering Chromium processes for profile. Terminating...`);
        for (const pid of pids) {
            try {
                if (process.platform === 'win32') {
                    // Instant tree kill on Windows via native taskkill
                    await execAsync(`taskkill /F /T /PID ${pid}`).catch(() => {});
                } else {
                    process.kill(pid, 'SIGKILL');
                }
            } catch (e) {}
        }
        await new Promise(r => setTimeout(r, 100));
    }

    // 2. Unlink lock and socket files
    for (const lockPath of foundLocks) {
        try {
            fs.unlinkSync(lockPath);
        } catch (e) {}
    }

    // Brief settling delay only when locks were actively cleaned up
    await new Promise(r => setTimeout(r, 100));
}

/**
 * Sync cookies from an open BrowserContext to SQLite database.
 * Optimized: memoized to avoid redundant database writes when cookies are unchanged.
 */
export async function syncCookiesToDatabase(browser, profileId) {
    if (!browser || !profileId) return;
    try {
        const cookies = await browser.cookies();
        if (Array.isArray(cookies) && cookies.length > 0) {
            const hasSession = cookies.some(c => c.name === 'sessionid' || c.name === 'sessionid_ss' || c.name === 'sid_tt');
            if (hasSession) {
                const cookiesJson = JSON.stringify(cookies);
                if (lastSyncedCookies.get(profileId) === cookiesJson) {
                    return; // Skip identical cookie write to disk
                }
                lastSyncedCookies.set(profileId, cookiesJson);
                db.prepare('UPDATE profiles SET cookies = ? WHERE id = ?').run(cookiesJson, profileId);
            }
        }
    } catch (e) {}
}

/**
 * Gracefully close any manual browser session for a profile, saving cookies first,
 * and releasing all OS locks and child helper processes.
 */
export async function closeProfileBrowser(profileId, profileName) {
    if (manualBrowsers.has(profileId)) {
        const browser = manualBrowsers.get(profileId);
        manualBrowsers.delete(profileId);
        await syncCookiesToDatabase(browser, profileId);
        lastSyncedCookies.delete(profileId);
        try {
            await browser.close();
            console.log(`[${profileName}] Manual browser context closed successfully`);
        } catch (e) {
            console.warn(`[${profileName}] Error closing manual browser:`, e.message);
        }
    } else {
        lastSyncedCookies.delete(profileId);
    }

    const userDataDir = path.join(PROFILES_DIR, profileName);
    await releaseProfileLocks(userDataDir, profileName);
}

/**
 * Ensure the profile is 100% clean and ready for a new persistent context launch.
 * Closes any manual browsers, stops any ongoing login checks, and clears stale locks.
 */
export async function ensureProfileReadyForLaunch(profileId, profileName) {
    // 1. Close manual browser if open
    if (manualBrowsers.has(profileId)) {
        console.log(`[${profileName}] Active manual browser detected. Closing it before launch...`);
        await closeProfileBrowser(profileId, profileName);
    }

    // 2. Stop login check if running
    if (loggingInProfiles.has(profileId)) {
        const session = loggingInProfiles.get(profileId);
        if (session && session.browser) {
            try { await session.browser.close(); } catch (e) {}
        }
        loggingInProfiles.delete(profileId);
    }

    // 3. Clean up lock files and lingering processes
    const userDataDir = path.join(PROFILES_DIR, profileName);
    await releaseProfileLocks(userDataDir, profileName);
}

/**
 * Robust launcher for Playwright launchPersistentContext.
 * Ensures the profile is clean before launch, and includes automatic self-healing retry
 * if a race condition or locked directory error is encountered.
 */
export async function launchPersistentContextSafe(chromiumInstance, userDataDir, browserOptions, profile) {
    const profileId = profile.id;
    const profileName = profile.name;

    await ensureProfileReadyForLaunch(profileId, profileName);

    try {
        return await chromiumInstance.launchPersistentContext(userDataDir, browserOptions);
    } catch (err) {
        const msg = String(err?.message || '');
        const isLockError = msg.includes('Opening in existing browser session') ||
                            msg.includes('Target page, context or browser has been closed') ||
                            msg.includes('SingletonLock') ||
                            msg.includes('ProcessSingleton');

        if (isLockError) {
            console.warn(`[${profileName}] Browser launch collision detected: "${msg}". Force-releasing locks and retrying...`);
            await releaseProfileLocks(userDataDir, profileName);
            await new Promise(r => setTimeout(r, 400));
            return await chromiumInstance.launchPersistentContext(userDataDir, browserOptions);
        }

        throw err;
    }
}

/**
 * Attach automatic close listeners to a manual browser context.
 * When the user closes the window (or all tabs), this automatically terminates
 * the persistent Chromium process on macOS/Windows and cleans up tracker maps.
 */
export function setupAutoCloseOnEmpty(browser, profile, syncTimer = null) {
    let isClosing = false;

    const cleanupAndClose = async (reason) => {
        if (isClosing) return;
        isClosing = true;

        console.log(`[${profile.name}] ${reason}. Terminating browser process.`);
        if (syncTimer) clearInterval(syncTimer);
        await syncCookiesToDatabase(browser, profile.id);
        manualBrowsers.delete(profile.id);

        try {
            await browser.close();
        } catch (e) {}

        const userDataDir = path.join(PROFILES_DIR, profile.name);
        await releaseProfileLocks(userDataDir, profile.name);
    };

    const handleWindowClose = () => {
        setTimeout(async () => {
            if (isClosing) return;
            try {
                const openPages = browser.pages().filter(p => !p.isClosed());
                if (openPages.length === 0) {
                    await cleanupAndClose('All browser windows closed by user');
                }
            } catch (e) {}
        }, 200);
    };

    browser.on('page', (newPage) => {
        newPage.on('close', handleWindowClose);
    });

    for (const page of browser.pages()) {
        page.on('close', handleWindowClose);
    }

    browser.on('close', () => {
        cleanupAndClose('Browser context closed');
    });
}
