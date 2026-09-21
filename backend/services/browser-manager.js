import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PROFILES_DIR, db } from '../db.js';
import { manualBrowsers, loggingInProfiles } from './tracker.js';

const execAsync = promisify(exec);

/**
 * Clean up OS-level lock files and any lingering/orphaned Chromium processes
 * for a specific profile's user-data-dir.
 *
 * Supports macOS, Linux, and Windows.
 */
export async function releaseProfileLocks(userDataDir, profileName) {
    if (!userDataDir || !fs.existsSync(userDataDir)) return;

    // 1. macOS & Linux: Check SingletonLock symlink and process
    const singletonLock = path.join(userDataDir, 'SingletonLock');
    try {
        const stat = fs.lstatSync(singletonLock);
        if (stat.isSymbolicLink()) {
            const target = fs.readlinkSync(singletonLock);
            const parts = target.split('-');
            const pidStr = parts[parts.length - 1];
            const pid = parseInt(pidStr, 10);
            if (pid && !isNaN(pid) && pid > 0) {
                try {
                    process.kill(pid, 0); // Is process alive?
                    // Check process command name to avoid killing an unrelated process if PID was recycled
                    const { stdout } = await execAsync(`ps -p ${pid} -o comm=`).catch(() => ({ stdout: '' }));
                    const comm = stdout.toLowerCase().trim();
                    if (comm.includes('chrome') || comm.includes('chromium')) {
                        console.log(`[${profileName}] Releasing locked Chrome process (PID ${pid})...`);
                        try { process.kill(pid, 'SIGTERM'); } catch (e) {}
                        await new Promise(r => setTimeout(r, 400));
                        try { process.kill(pid, 'SIGKILL'); } catch (e) {}
                    }
                } catch (e) {
                    // PID is already dead
                }
            }
        }
    } catch (e) {
        // File does not exist or lstat error
    }

    // Unlink lock files if still present
    for (const file of ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile']) {
        const p = path.join(userDataDir, file);
        try {
            const s = fs.lstatSync(p);
            if (s.isSymbolicLink() || s.isFile() || s.isSocket()) {
                fs.unlinkSync(p);
            }
        } catch (e) {}
    }

    // 2. Windows: Check lingering chrome.exe matching this profile folder
    if (process.platform === 'win32') {
        try {
            const safeName = (profileName || '').replace(/["'\\]/g, '');
            if (safeName) {
                const psCmd = `powershell -NoProfile -NonInteractive -Command "Get-CimInstance Win32_Process | Where-Object { ($_.Name -like '*chrome*') -and ($_.CommandLine -like '*${safeName}*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"`;
                await execAsync(psCmd).catch(() => {});
            }
        } catch (e) {}

        const lockfile = path.join(userDataDir, 'lockfile');
        try {
            if (fs.existsSync(lockfile)) fs.unlinkSync(lockfile);
        } catch (e) {}
    }

    // Short pause for filesystem to register lock release
    await new Promise(r => setTimeout(r, 300));
}

/**
 * Sync cookies from an open BrowserContext to SQLite database
 */
export async function syncCookiesToDatabase(browser, profileId) {
    if (!browser || !profileId) return;
    try {
        const cookies = await browser.cookies();
        if (Array.isArray(cookies) && cookies.length > 0) {
            const hasSession = cookies.some(c => c.name === 'sessionid' || c.name === 'sessionid_ss' || c.name === 'sid_tt');
            if (hasSession) {
                db.prepare('UPDATE profiles SET cookies = ? WHERE id = ?').run(JSON.stringify(cookies), profileId);
            }
        }
    } catch (e) {}
}

/**
 * Gracefully close any manual browser session for a profile, saving cookies first,
 * and releasing OS locks.
 */
export async function closeProfileBrowser(profileId, profileName) {
    if (manualBrowsers.has(profileId)) {
        const browser = manualBrowsers.get(profileId);
        manualBrowsers.delete(profileId);
        await syncCookiesToDatabase(browser, profileId);
        try {
            await browser.close();
            console.log(`[${profileName}] Manual browser context closed successfully`);
        } catch (e) {
            console.warn(`[${profileName}] Error closing manual browser:`, e.message);
        }
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
 * Attach automatic close listeners to a manual browser context.
 * When the user closes the window (or all tabs), this automatically terminates
 * the persistent Chromium process on macOS/Windows and cleans up tracker maps.
 */
export function setupAutoCloseOnEmpty(browser, profile, syncTimer = null) {
    let isClosing = false;

    const handleWindowClose = () => {
        setTimeout(async () => {
            if (isClosing) return;
            try {
                const openPages = browser.pages().filter(p => !p.isClosed());
                if (openPages.length === 0) {
                    isClosing = true;
                    console.log(`[${profile.name}] All browser windows closed by user. Terminating browser process.`);
                    if (syncTimer) clearInterval(syncTimer);
                    await syncCookiesToDatabase(browser, profile.id);
                    manualBrowsers.delete(profile.id);
                    await browser.close().catch(() => {});
                    const userDataDir = path.join(PROFILES_DIR, profile.name);
                    await releaseProfileLocks(userDataDir, profile.name);
                }
            } catch (e) {}
        }, 250);
    };

    browser.on('page', (newPage) => {
        newPage.on('close', handleWindowClose);
    });

    for (const page of browser.pages()) {
        page.on('close', handleWindowClose);
    }
}
