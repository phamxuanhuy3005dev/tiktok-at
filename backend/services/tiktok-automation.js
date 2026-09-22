import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { db, PROFILES_DIR, DUMMY_VIDEOS_DIR } from '../db.js';
import { buildBrowserLaunchOptions } from '../browser-launch.js';
import { injectProfileCookies } from './cookie-service.js';
import {
    runningProfiles,
    processingProfiles,
    loggingInProfiles,
    addingFavoriteMusicProfiles
} from './tracker.js';
import { ensureProfileReadyForLaunch, launchPersistentContextSafe, releaseProfileLocks } from './browser-manager.js';
import {
    computeAutoIncrementTime,
    formatScheduleValue,
    getScheduleHintText,
    inferScheduleFieldKind,
    sortScheduleInputs
} from '../schedule-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_FILE = path.join(__dirname, '..', 'automation.log');
const MAX_LOG_SIZE = 3 * 1024 * 1024; // 3 MB

function appendLogSafe(entry) {
    fs.appendFile(LOG_FILE, entry, (err) => {
        if (err) console.error('Failed to write to log file:', err.message);
    });
}

function checkAndRotateLog() {
    try {
        if (fs.existsSync(LOG_FILE)) {
            const stats = fs.statSync(LOG_FILE);
            if (stats.size > MAX_LOG_SIZE) {
                // Keep the last 512 KB of log content
                const buffer = Buffer.alloc(512 * 1024);
                const fd = fs.openSync(LOG_FILE, 'r');
                const startPos = Math.max(0, stats.size - buffer.length);
                const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, startPos);
                fs.closeSync(fd);
                fs.writeFileSync(LOG_FILE, buffer.subarray(0, bytesRead));
            }
        }
    } catch (_) {}
}

/**
 * Automatically pauses and mutes video preview elements in TikTok Studio to prevent
 * high CPU usage from continuous 1080p/60fps video decoding on older hardware.
 */
export async function pausePreviewVideos(page) {
    if (!page || page.isClosed()) return;
    try {
        await page.evaluate(() => {
            const vids = document.querySelectorAll('video');
            vids.forEach(v => {
                try {
                    v.pause();
                    v.muted = true;
                } catch (_) {}
            });
        });
    } catch (_) {}
}

export const describeScheduleInput = (input) => {
    const hint = getScheduleHintText(input) || 'no-hint';
    return `#${input.index} kind=${inferScheduleFieldKind(input)} hint="${hint.slice(0, 80)}"`;
};

export async function resolveScheduleInputs(page, log) {
    await page.waitForFunction(() => {
        const visibleInputs = Array.from(document.querySelectorAll('input.TUXTextInputCore-input')).filter((input) => {
            const style = window.getComputedStyle(input);
            const rect = input.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        });
        return visibleInputs.length >= 2;
    }, { timeout: 10000 }).catch(() => null);

    const locator = page.locator('input.TUXTextInputCore-input:visible');
    const count = await locator.count();
    const inputs = [];

    for (let index = 0; index < count; index++) {
        const meta = await locator.nth(index).evaluate((input) => {
            const rect = input.getBoundingClientRect();
            return {
                placeholder: input.getAttribute('placeholder') || '',
                ariaLabel: input.getAttribute('aria-label') || '',
                label: (input.closest('label')?.innerText || input.parentElement?.innerText || '').trim().slice(0, 120),
                name: input.getAttribute('name') || '',
                id: input.id || '',
                value: input.value || '',
                top: rect.top,
                left: rect.left
            };
        });
        inputs.push({ index, ...meta });
    }

    const orderedInputs = sortScheduleInputs(inputs);
    if (orderedInputs.length === 0) {
        throw new Error('No visible schedule inputs found');
    }

    log(`Visible schedule inputs: ${orderedInputs.map(describeScheduleInput).join(' | ')}`);

    const selected = { date: null, time: null };
    for (const input of orderedInputs) {
        const kind = inferScheduleFieldKind(input);
        if (kind === 'date' && !selected.date) selected.date = input;
        if (kind === 'time' && !selected.time) selected.time = input;
    }

    if (!selected.date) {
        selected.date = orderedInputs[0];
    }
    if (!selected.time) {
        selected.time = orderedInputs.find((input) => input.index !== selected.date?.index) || orderedInputs[1] || null;
    }

    return selected;
}

export async function fillScheduleInput(page, inputMeta, value, label, log) {
    if (!inputMeta) {
        throw new Error(`${label} input not found`);
    }

    const input = page.locator('input.TUXTextInputCore-input:visible').nth(inputMeta.index);
    log(`Setting ${label} using ${describeScheduleInput(inputMeta)} => ${value}`);

    await input.scrollIntoViewIfNeeded();
    await input.evaluate(el => el.removeAttribute('readonly')).catch(() => null);
    await input.click({ clickCount: 3 });
    await page.waitForTimeout(500);

    if (label === 'Time') {
        const pickerSelector = '.tiktok-timepicker-time-picker-container';
        const picker = page.locator(pickerSelector);
        try {
            if (await picker.isVisible({ timeout: 2000 })) {
                log(`Time picker detected. Selecting items directly...`);
                const [targetHour, targetMinute] = value.split(':');
                const hourEl = picker.locator(`.tiktok-timepicker-left:has-text("${targetHour}")`).first();
                if (await hourEl.isVisible()) await hourEl.click({ force: true });
                const minuteEl = picker.locator(`.tiktok-timepicker-right:has-text("${targetMinute}")`).first();
                if (await minuteEl.isVisible()) await minuteEl.click({ force: true });
                await input.click();
                await page.waitForTimeout(500);
                return;
            }
        } catch (e) {
            log(`Time picker interaction failed: ${e.message}. Falling back to fill.`);
        }
    }

    if (label === 'Date') {
        const pickerSelector = '.calendar-wrapper';
        try {
            if (!(await page.locator(pickerSelector).isVisible({ timeout: 500 }).catch(() => false))) {
                await input.click();
            }
            await page.waitForTimeout(1000);

            const picker = page.locator(pickerSelector).first();
            if (await picker.isVisible({ timeout: 3000 })) {
                log(`Calendar picker detected. Selecting day directly...`);
                const parts = value.split(/[-/.]/).map(Number);
                let targetDay = parts[2];
                if (value.includes('/') && parts[0] <= 12) targetDay = parts[1];
                else if (value.includes('/') && parts[0] > 12) targetDay = parts[0];

                const dayCells = picker.locator('.day:not(.empty)');
                const dayCount = await dayCells.count();
                for (let i = 0; i < dayCount; i++) {
                    const cell = dayCells.nth(i);
                    const text = (await cell.innerText()).trim();
                    const dayNum = parseInt(text, 10);
                    if (dayNum === targetDay) {
                        const classAttr = await cell.getAttribute('class') || '';
                        if (!classAttr.includes('disabled')) {
                            log(`Clicking calendar day cell: ${text}`);
                            await cell.click({ force: true });
                            await page.waitForTimeout(500);
                            return;
                        }
                    }
                }
            }
        } catch (e) {
            log(`Calendar picker interaction failed: ${e.message}. Falling back to fill.`);
        }
    }

    await input.fill(value);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
}

export const dismissPopups = async (page) => {
    if (!page) return false;

    const modalSelectors = [
        'div[role="dialog"]',
        'div.TUXModal:not(.TUXModal-overlay)',
        'div[class*="common-modal"]:not([class*="overlay"])',
        'div[class*="modal"]:not([class*="overlay"])',
        'div[class*="Modal"]:not([class*="overlay"])',
        'div[class*="portal"]',
        'div[class*="dialog"]',
    ];

    for (const modalSel of modalSelectors) {
        try {
            const modals = await page.$$(modalSel);
            for (const modal of modals) {
                try {
                    if (!await modal.isVisible()) continue;
                    const text = await modal.innerText().catch(() => '');
                    if (!text.trim()) continue;

                    // 1. "Turn on automatic content checks" popup -> Always click Cancel
                    if (text.includes("automatic content checks") || text.includes("content checks") || text.includes("Turn on automatic")) {
                        const cancelBtn = await modal.$('button:has-text("Cancel")');
                        if (cancelBtn && await cancelBtn.isVisible()) {
                            await cancelBtn.click();
                            console.log('[dismissPopups] Dismissed "Turn on automatic content checks" popup -> Cancel');
                            return true;
                        }
                    }

                    // 2. "Exit / Leave" confirmation popup -> Always Stay/Cancel, NEVER Exit
                    if (text.includes("Are you sure you want to exit") || text.includes("want to leave") || text.includes("Leave page")) {
                        const stayBtn = await modal.$('button:has-text("Cancel"), button:has-text("Stay"), button:has-text("No")');
                        if (stayBtn && await stayBtn.isVisible()) {
                            await stayBtn.click();
                            console.log('[dismissPopups] Dismissed "exit/leave" popup -> Cancel/Stay');
                            return true;
                        }
                    }

                    // 3. "Discard this post?" popup -> Always click "Not now" or "Cancel", NEVER Discard!
                    if (text.includes("Discard this post") || text.includes("discarded permanently")) {
                        const notNowBtn = await modal.$('button:has-text("Not now"), button:has-text("Cancel")');
                        if (notNowBtn && await notNowBtn.isVisible()) {
                            await notNowBtn.click();
                            console.log('[dismissPopups] Dismissed "Discard this post?" popup -> Not now');
                            return true;
                        }
                        // Do NOT click Discard here!
                        continue;
                    }

                    // 4. "Phone mode" editor tutorial modal -> Click "Got it"
                    if (text.includes("Phone mode")) {
                        const gotItBtn = await modal.$('button:has-text("Got it")');
                        if (gotItBtn && await gotItBtn.isVisible()) {
                            await gotItBtn.click();
                            console.log('[dismissPopups] Dismissed "Phone mode" tutorial modal -> Got it');
                            return true;
                        }
                    }

                    // 5. Generic benign buttons inside the modal (excluding Discard / Exit / Post)
                    const genericBtnSelectors = [
                        'button:has-text("Got it")',
                        'button:has-text("Allow")',
                        'button:has-text("Not now")',
                        'button:has-text("Skip")',
                        'button:has-text("OK")',
                        'button:has-text("Okay")',
                        'button:has-text("Close")',
                    ];
                    for (const btnSel of genericBtnSelectors) {
                        const btn = await modal.$(btnSel);
                        if (btn && await btn.isVisible()) {
                            await btn.click();
                            console.log(`[dismissPopups] Dismissed generic modal -> ${btnSel}`);
                            return true;
                        }
                    }
                } catch (innerE) {}
            }
        } catch (e) {}
    }
    return false;
};

export async function dismissOnboardingModals(page, log) {
    try {
        const detection = await page.evaluate(() => {
            const found = [];
            const tuxModal = document.querySelector('div.TUXModal');
            if (tuxModal) {
                const rect = tuxModal.getBoundingClientRect();
                const style = window.getComputedStyle(tuxModal);
                if (rect.width > 50 && rect.height > 20 &&
                    style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                    const btns = Array.from(tuxModal.querySelectorAll('button')).map(b => b.textContent.trim());
                    found.push({ type: 'TUXModal', buttons: btns });
                }
            }

            const tutorialTips = document.querySelectorAll('[class*="tutorial-tooltip"], .react-joyride__tooltip');
            for (const tip of tutorialTips) {
                const rect = tip.getBoundingClientRect();
                const style = window.getComputedStyle(tip);
                if (rect.width > 50 && rect.height > 20 &&
                    style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                    const btns = Array.from(tip.querySelectorAll('button')).map(b => b.textContent.trim());
                    found.push({ type: 'tutorial-tooltip', buttons: btns });
                    break;
                }
            }

            const guideTips = document.querySelectorAll('[class*="editor-guide"]');
            for (const tip of guideTips) {
                const rect = tip.getBoundingClientRect();
                const style = window.getComputedStyle(tip);
                if (rect.width > 50 && rect.height > 20 &&
                    style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                    const btns = Array.from(tip.querySelectorAll('button')).map(b => b.textContent.trim());
                    found.push({ type: 'editor-guide', buttons: btns });
                    break;
                }
            }

            const joyrides = document.querySelectorAll('[class*="joyride"], [data-joyride]');
            for (const jr of joyrides) {
                const rect = jr.getBoundingClientRect();
                const style = window.getComputedStyle(jr);
                if (rect.width > 50 && rect.height > 20 &&
                    style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                    const btns = Array.from(jr.querySelectorAll('button')).map(b => b.textContent.trim());
                    found.push({ type: 'joyride', buttons: btns });
                    break;
                }
            }

            return found;
        });

        if (detection.length === 0) return;

        if (log) log(`Detected ${detection.length} onboarding modal(s): ${detection.map(d => d.type + '(' + (d.buttons ? d.buttons.join(',') : '') + ')').join('; ')}`);

        // Handle TUXModal Cancel/Dismiss (never Discard)
        try {
            const tuxCancel = await page.locator('div.TUXModal button:has-text("Cancel"), div.TUXModal button:has-text("No"), div.TUXModal button:has-text("Not now")').first();
            if (await tuxCancel.isVisible({ timeout: 500 })) {
                await tuxCancel.click({ force: true });
                if (log) log('Dismissed TUXModal via Cancel button.');
                await page.waitForTimeout(300);
            }
        } catch (e) {}

        // Handle Tutorial Tooltips & Joyride modals
        const tooltipDismissSelectors = [
            'div:has-text("Phone mode") button:has-text("Got it")',
            '[class*="tutorial-tooltip"] button:has-text("Got it")',
            '[class*="tutorial-tooltip"] button:has-text("Next")',
            '[class*="tutorial-tooltip"] button:has-text("Close")',
            '[class*="tutorial-tooltip"] button:has-text("Skip")',
            '.react-joyride__tooltip button:has-text("Got it")',
            '.react-joyride__tooltip button:has-text("Next")',
            '.react-joyride__tooltip button[aria-label="Close"]',
            '[class*="editor-guide"] button:has-text("Got it")',
            '[class*="editor-guide"] button:has-text("Next")',
            '[class*="joyride"] button:has-text("Got it")',
            '[class*="joyride"] button:has-text("Next")',
            'button:has-text("Got it")',
        ];

        for (const sel of tooltipDismissSelectors) {
            try {
                const btn = page.locator(sel).first();
                if (await btn.isVisible({ timeout: 300 })) {
                    await btn.click({ force: true });
                    if (log) log(`Dismissed tutorial tooltip via: ${sel}`);
                    await page.waitForTimeout(300);
                }
            } catch (e) {}
        }

        // Safe generic buttons (strictly excludes Discard)
        const safeModalSelectors = [
            'div[role="dialog"] button:has-text("Turn off")',
            'div[role="dialog"] button:has-text("Stay")',
        ];
        for (const sel of safeModalSelectors) {
            try {
                const btn = page.locator(sel).first();
                if (await btn.isVisible({ timeout: 300 })) {
                    await btn.click({ force: true });
                    if (log) log(`Dismissed modal via safe button: ${sel}`);
                    await page.waitForTimeout(300);
                }
            } catch (e) {}
        }
    } catch (err) {
        if (log) log(`Error dismissing onboarding modals: ${err.message}`);
    }
}

export async function checkExistingScheduledTime(page, log) {
    const manageUrl = 'https://www.tiktok.com/tiktokstudio/content';
    log(`Checking for existing scheduled videos at ${manageUrl}...`);

    try {
        await page.goto(manageUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        log(`Navigated to ${manageUrl}`);

        // Wait smartly for content tabs or posts table to mount (max 6s)
        await page.waitForSelector('button:has-text("Posts"), [role="tab"]:has-text("Posts"), [role="tablist"], [data-tt*="PostTable"], .post-table', { timeout: 6000 }).catch(() => null);

        await dismissOnboardingModals(page, log);

        // Fast single-pass check for "Scheduled" tab (support English and Vietnamese)
        const scheduledTab = page.locator('button:has-text("Scheduled"), [role="tab"]:has-text("Scheduled"), [data-e2e="scheduled-tab"], button:has-text("Đã lên lịch"), [role="tab"]:has-text("Đã lên lịch")').first();

        const hasScheduledTab = await scheduledTab.isVisible({ timeout: 1500 }).catch(() => false);

        if (!hasScheduledTab) {
            log(`No "Scheduled" tab found on content page (0 scheduled posts on this account). Proceeding directly to upload.`);
            return null;
        }

        await scheduledTab.click();
        log(`Clicked "Scheduled" tab.`);
        await page.waitForTimeout(2000);

        const latestTime = await page.evaluate(() => {
            const bodyText = document.body.innerText;
            const matches = bodyText.match(/(?:Scheduled for|Scheduled:?)\s*([A-Za-z]+ \d{1,2}, \d{4}, \d{1,2}:\d{2} [AP]M|\d{4}-\d{2}-\d{2} \d{2}:\d{2})/g);
            if (matches && matches.length > 0) {
                return matches[matches.length - 1];
            }

            const postTable = document.querySelector('[data-tt*="PostTable"], [class*="PostTable"]');
            if (postTable) {
                const text = postTable.innerText;
                const dateMatch = text.match(/(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\s+\d{1,2}:\d{2})/);
                if (dateMatch) return dateMatch[1];
            }
            return null;
        });

        if (latestTime) {
            log(`Found existing scheduled time string: "${latestTime}"`);
            const parsed = new Date(latestTime.replace(/(?:Scheduled for|Scheduled:?)\s*/, ''));
            if (!isNaN(parsed.getTime())) {
                log(`Parsed existing scheduled date: ${parsed.toISOString()}`);
                return parsed;
            }
        }

        log(`No scheduled videos found in "Scheduled" tab.`);
        return null;
    } catch (e) {
        log(`Error checking scheduled videos: ${e.message}. Proceeding with default schedule.`);
        return null;
    }
}

export async function uploadVideo(profile, videoFolder, videos, limitUploads = false, uploadLimitCount = 0, forceUploadAll = false) {
    if (!videos || videos.length === 0) {
        console.log(`[${profile.name}] No compatible videos found in ${videoFolder}. Skipping.`);
        return 0;
    }

    checkAndRotateLog();

    const userDataDir = path.join(PROFILES_DIR, profile.name);
    let uploadedCount = 0;
    let lastScheduledTime = null;
    let hasExistingSchedule = false;

    const browserOptions = buildBrowserLaunchOptions(profile, {
        log: (msg) => console.log(`[${profile.name}] ${msg}`)
    });

    const browser = await launchPersistentContextSafe(chromium, userDataDir, browserOptions, profile);
    await injectProfileCookies(browser, profile);

    const log = (msg) => {
        const entry = `[${new Date().toISOString()}] [${profile.name}] ${msg}\n`;
        console.log(entry.trim());
        appendLogSafe(entry);
    };

    try {
        let page = await browser.newPage();
        log(`Automation started for profile: ${profile.name}`);

        if (videos.length === 0) {
            log(`No compatible videos found in ${videoFolder}. Skipping.`);
            await browser.close();
            return 0;
        }

        const maxUploads = (limitUploads && uploadLimitCount > 0)
            ? uploadLimitCount
            : (profile.is_scheduled === 1 && profile.upload_count > 0)
                ? profile.upload_count
                : videos.length;
        const uploadLimit = Math.min(videos.length, maxUploads);

        // --- Check for existing scheduled videos before starting upload loop ---
        if (profile.auto_increment_schedule) {
            const existingTime = await checkExistingScheduledTime(page, log);
            if (existingTime) {
                lastScheduledTime = existingTime;
                hasExistingSchedule = true;
                log(`Existing schedule detected. ALL ${Math.min(videos.length, maxUploads)} videos will be scheduled from base: ${existingTime.toISOString()}`);
            }
        }
        // --- End content check ---

        for (let i = 0; i < videos.length; i++) {
            if (uploadedCount >= maxUploads) {
                log(`Reached target upload count: ${uploadedCount}. Stopping.`);
                break;
            }
            const videoFileName = videos[i];
            const videoPath = path.join(videoFolder, videoFileName);

            log(`Processing video ${i + 1}/${videos.length}: ${videoFileName}`);

            // Navigate to upload page with active polling
            let initialized = false;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    log(`Navigating to upload page (Attempt ${attempt}/3)...`);
                    await page.goto('https://www.tiktok.com/tiktokstudio/upload', {
                        waitUntil: 'domcontentloaded',
                        timeout: 30000
                    });

                    log(`Active polling for upload components...`);
                    // Smart polling loop: check every 1s for up to 30s
                    for (let poll = 0; poll < 30; poll++) {
                        const [hasInput, hasButton, isLogin] = await Promise.all([
                            page.$('input[type="file"]'),
                            page.$('button.upload-stage-btn, .upload-stage-btn, [data-e2e="upload-video-button"]'),
                            page.evaluate(() => window.location.href.includes('login'))
                        ]);

                        if (hasButton || hasInput) {
                            log(`Components detected via polling.`);
                            initialized = true;
                            break;
                        }
                        if (isLogin) {
                            log(`Redirected to login page. Please log in.`);
                            initialized = true; // Still "initialized" in terms of navigation, but with warning
                            break;
                        }
                        await page.waitForTimeout(1000);
                    }

                    if (initialized) break;
                } catch (e) {
                    log(`Attempt ${attempt} failed: ${e.message}`);
                    if (attempt < 3) {
                        await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => null);
                    }
                }
            }

            if (!initialized) {
                throw new Error('Upload page components not found. Page might be too slow or blocked.');
            }

            const screenshotDir = process.env.TIKTOK_SCREENSHOT_DIR;
            const takeScreenshot = async (name) => {
                if (!screenshotDir) return;
                try {
                    const outPath = path.join(screenshotDir, `${name}.png`);
                    await page.screenshot({ path: outPath });
                    log(`Saved screenshot: ${outPath}`);
                } catch (_) {}
            };

            log(`Selecting file...`);
            let uploaded = false;

            // Strategy 1: Intercept filechooser with resilient waiting
            const uploadButtonSelectors = [
                '[data-e2e="upload-video-button"]',
                'button.upload-stage-btn',
                'button:has-text("Select videos")',
                '.upload-stage-btn',
                'button[class*="upload"]'
            ];
            for (const sel of uploadButtonSelectors) {
                try {
                    const el = await page.waitForSelector(sel, { timeout: 5000, state: 'visible' }).catch(() => null);
                    if (el) {
                        log(`Found upload button: ${sel}. Intercepting filechooser...`);
                        const [fileChooser] = await Promise.all([
                            page.waitForEvent('filechooser', { timeout: 20000 }),
                            el.click()
                        ]);
                        await fileChooser.setFiles(videoPath);
                        log(`Strategy 1 success via ${sel}`);
                        uploaded = true;
                        break;
                    }
                } catch (e) { }
            }

            if (!uploaded) {
                log(`Strategy 2: unhide input and setInputFiles...`);
                try {
                    await page.evaluate(() => {
                        const input = document.querySelector('input[type="file"]');
                        if (input) {
                            input.style.display = 'block';
                            input.style.visibility = 'visible';
                            input.style.opacity = '1';
                            input.style.position = 'fixed';
                            input.style.top = '0';
                            input.style.left = '0';
                            input.style.zIndex = '99999';
                        }
                    });
                    await page.waitForTimeout(500);
                    const [fileChooser] = await Promise.all([
                        page.waitForEvent('filechooser', { timeout: 5000 }),
                        page.click('input[type="file"]')
                    ]);
                    await fileChooser.setFiles(videoPath);
                    log(`Strategy 2 success`);
                    uploaded = true;
                } catch (e) { }
            }

            if (!uploaded) throw new Error('Could not find file input or upload button');

            // Dismiss any onboarding modals that may appear after file selection
            await dismissOnboardingModals(page, log);
            await dismissPopups(page);
            await page.waitForTimeout(1000);
            // Gá» i láº§n 2 Ä‘á»ƒ Ä‘áº£m báº£o popup Ä‘Ã£ Ä‘Æ°á»£c dismiss (popup cÃ³ thá»ƒ xuáº¥t hiá»‡n cháº­m)
            await dismissPopups(page);
            await pausePreviewVideos(page);

            // Wait for upload to complete
            // Cháº¡y dismissPopups liÃªn tá»¥c trong khi Ä‘á»£i Ä‘á»ƒ trÃ¡nh popup block upload
            try {
                const uploadCompletedPromise = (async () => {
                    // Ä á»£i Cancel button cá»§a upload progress xuáº¥t hiá»‡n trÆ°á»›c
                    const uploadProgressCancel = page.locator('.upload-progress button:has-text("Cancel"), [class*="upload"] button:has-text("Cancel"), button[class*="cancel"]').first();
                    let cancelDetected = false;
                    try {
                        await uploadProgressCancel.waitFor({ state: 'visible', timeout: 10000 });
                        cancelDetected = true;
                    } catch (_) { /* no specific upload cancel found */ }

                    // Loop dismiss popups má»—i 2s trong khi Ä‘á»£i Post button ready
                    for (let i = 0; i < 600; i++) { // max 20 phÃºt
                        await page.waitForTimeout(2000);
                        await dismissPopups(page);
                        await dismissOnboardingModals(page, log);
                        await pausePreviewVideos(page);

                        // Kiá»ƒm tra upload xong: Post button enabled vÃ  Cancel cá»§a upload progress biáº¿n máº¥t
                        const postBtn = await page.$('button[data-e2e="post_video_button"]:not([disabled]), button.common-button-post-video:not([disabled])');
                        if (postBtn && await postBtn.isVisible()) {
                            log('Upload complete (Post button is enabled and visible).');
                            break;
                        }
                    }
                })();

                await uploadCompletedPromise;
                await pausePreviewVideos(page);
                await page.waitForTimeout(2000);

                // Dismiss popups & tooltips that appeared after video upload completion
                await dismissOnboardingModals(page, log);
                await dismissPopups(page);
                await takeScreenshot('step1_video_uploaded');
            } catch (e) {
                log(`Wait for upload completion timed out or failed: ${e.message}`);
            }

            // --- TASKS: Clear Title & Add Sound ---
            try {
                log(`Waiting for upload UI components...`);
                await page.waitForSelector('.video-info-container, textarea, .DraftEditor-root, .editor-entrance, [data-button-name="sounds"], button:has-text("Post")', { timeout: 60000 });
                await page.waitForTimeout(3000);

                const shouldRemoveTitle = Number(profile.remove_title) === 1;
                if (shouldRemoveTitle) {
                    log(`Task 1: Clearing title/caption...`);
                    const captionSelectors = ['.public-DraftEditor-content', '[contenteditable="true"]', 'textarea', '[role="textbox"]', '[data-e2e="caption-edit-container"]'];
                    for (const sel of captionSelectors) {
                        try {
                            const caption = await page.waitForSelector(sel, { timeout: 5000, state: 'visible' }).catch(() => null);
                            if (caption) {
                                log(`Found caption field: ${sel}. Clearing text...`);
                                await caption.focus();
                                const selectAllKey = process.platform === 'darwin' ? 'Meta+A' : 'Control+A';
                                await page.keyboard.press(selectAllKey);
                                await page.keyboard.press('Backspace');
                                await page.waitForTimeout(300);
                                log(`Caption clearing attempt finished.`);
                                break;
                            }
                        } catch (e) { }
                    }
                } else {
                    log(`remove_title tắt: Giữ lại tiêu đề video.`);
                }
            } catch (e) {
                log(`Clear title failed: ${e.message}`);
            }
            // --- END CLEAR TITLE ---

            // --- TASK: Wait for video processing to complete & Add Sound ---
            const useSetMusic = Number(profile.set_music) === 1;
            if (useSetMusic) {
                try {
                    log(`Waiting for video upload to settle before opening Sounds editor...`);
                    const soundsSelector = '.editor-entrance[data-button-name="sounds"], button[data-button-name="sounds"]';
                    const soundsLocator = page.locator(soundsSelector).first();

                    let soundsVisible = false;
                    for (let waitSec = 0; waitSec < 20; waitSec++) {
                        await page.evaluate(() => {
                            const btn = document.querySelector('.editor-entrance[data-button-name="sounds"], [data-button-name="sounds"]');
                            if (btn) btn.scrollIntoView({ block: 'center' });
                        }).catch(() => null);

                        if (await soundsLocator.isVisible({ timeout: 1000 }).catch(() => false)) {
                            soundsVisible = true;
                            break;
                        }
                        await page.waitForTimeout(1000);
                        await dismissPopups(page);
                    }

                    if (soundsVisible) {
                        log(`Opening Sounds panel...`);
                        await soundsLocator.click({ force: true });
                        await page.waitForTimeout(3000);

                        // Dismiss any "Phone mode" tutorial modal that appears in the editor
                        const phoneModeGotIt = page.locator('div:has-text("Phone mode") button:has-text("Got it"), button:has-text("Got it")').first();
                        if (await phoneModeGotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
                            log(`Dismissing editor Phone mode dialog...`);
                            await phoneModeGotIt.click().catch(() => null);
                            await page.waitForTimeout(1000);
                        }

                        await takeScreenshot('step2_sounds_opened');

                        let soundAdded = false;
                        const hasMusicSearch = profile.music_search && profile.music_search.trim();

                        if (hasMusicSearch) {
                            // Chế độ 1: Tìm kiếm theo danh sách từ khóa
                            const keywords = profile.music_search.split(',').map(k => k.trim()).filter(Boolean);
                            const currentKeyword = keywords[uploadedCount % keywords.length];
                            log(`Search music mode: searching for "${currentKeyword}" (${(uploadedCount % keywords.length) + 1}/${keywords.length})...`);

                            const searchInput = page.locator('input.TextInput__input[placeholder*="Search sounds" i], input[placeholder*="Search sounds" i]').first();
                            if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
                                await searchInput.click();
                                const selectAllKey = process.platform === 'darwin' ? 'Meta+A' : 'Control+A';
                                await page.keyboard.press(selectAllKey);
                                await page.keyboard.press('Backspace');
                                await page.keyboard.type(currentKeyword, { delay: 40 });
                                await page.keyboard.press('Enter');
                                await page.waitForTimeout(3000);

                                // Locate round red plus button in search results
                                const searchPlusBtns = page.locator('.Button__root--shape-rounded, button[class*="Button__root--shape-rounded"]');
                                const count = await searchPlusBtns.count();
                                if (count > 0) {
                                    log(`Found ${count} sound result(s) for "${currentKeyword}". Adding top sound...`);
                                    await searchPlusBtns.first().click({ force: true });
                                    soundAdded = true;
                                } else {
                                    log(`No sound results found for "${currentKeyword}". Falling back to Favorites...`);
                                }
                            }
                        }

                        // Chế độ 2 (hoặc Fallback): Chọn từ Tab Favorites (Yêu thích)
                        if (!soundAdded) {
                            log(`Favorites music mode: opening Favorites tab...`);
                            const favTab = page.locator('button:has-text("Favorites"), [role="tab"]:has-text("Favorites")').first();
                            if (await favTab.isVisible({ timeout: 5000 }).catch(() => false)) {
                                await favTab.click().catch(() => null);
                                await page.waitForTimeout(2500);
                            }

                            // Find all round plus buttons in the favorites panel
                            const favPlusBtns = page.locator('.Button__root--shape-rounded, button[class*="Button__root--shape-rounded"]');
                            const totalFavs = await favPlusBtns.count();
                            log(`Found ${totalFavs} favorite sound(s).`);

                            if (totalFavs > 0) {
                                // Rotate every 10 uploads
                                const targetIdx = Math.floor(uploadedCount / 10) % totalFavs;
                                log(`Music rotation: video #${uploadedCount + 1} -> picking favorite #${targetIdx + 1}/${totalFavs}`);
                                await favPlusBtns.nth(targetIdx).click({ force: true });
                                soundAdded = true;
                            } else {
                                log(`No favorites found. Trying first sound from For You / default list...`);
                                const anyPlusBtn = page.locator('.Button__root--shape-rounded').first();
                                if (await anyPlusBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                                    await anyPlusBtn.click({ force: true });
                                    soundAdded = true;
                                }
                            }
                        }

                        if (soundAdded) {
                            log(`Sound added to timeline. Waiting for Audio property panel...`);
                            await page.waitForTimeout(2000);

                            // Set Volume to -50 dB in Audio properties panel
                            try {
                                const propInput = page.locator('input.PropSettingInput__input, input[class*="PropSettingInput"]').first();
                                if (await propInput.isVisible({ timeout: 6000 }).catch(() => false)) {
                                    log(`Setting sound volume to -50 dB...`);
                                    await propInput.click({ clickCount: 3 });
                                    const selectAllKey = process.platform === 'darwin' ? 'Meta+A' : 'Control+A';
                                    await page.keyboard.press(selectAllKey);
                                    await propInput.fill('-50');
                                    await page.keyboard.press('Enter');
                                    await page.waitForTimeout(500);
                                    log(`Sound volume set to -50 dB.`);
                                } else {
                                    log(`Audio PropSettingInput not visible. Keeping default volume.`);
                                }
                            } catch (volErr) {
                                log(`Volume adjustment skipped: ${volErr.message}`);
                            }

                            await takeScreenshot('step3_sound_added');

                            // Click Save button in top-right corner to exit editor and return to upload form
                            log(`Saving changes in editor...`);
                            const saveBtn = page.locator('button:has-text("Save")').first();
                            if (await saveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
                                await saveBtn.click();
                                log(`Clicked Save button. Waiting to return to upload form...`);
                                await page.waitForSelector('button[data-e2e="post_video_button"], button:has-text("Post")', { timeout: 30000 });
                                await page.waitForTimeout(2000);
                                log(`Successfully saved editor and returned to upload form.`);
                                await takeScreenshot('step4_saved_to_form');
                            } else {
                                log(`WARNING: Save button not visible in editor.`);
                            }
                        } else {
                            log(`WARNING: Could not add sound. Exiting editor...`);
                            const cancelBtn = page.locator('button:has-text("Cancel"), button:has-text("Exit")').first();
                            await cancelBtn.click().catch(() => null);
                            await page.waitForTimeout(2000);
                        }
                    } else {
                        log(`Sounds button (.editor-entrance[data-button-name="sounds"]) not visible. Skipping editor steps.`);
                    }
                } catch (e) {
                    log(`Add sound task encountered error: ${e.message}`);
                    if (process.env.TIKTOK_DEBUG_SCREENSHOTS === 'true') {
                        await page.screenshot({ path: path.join(__dirname, '..', `debug_${profile.name}_sound_fail.png`) }).catch(() => null);
                    }
                }
            } else {
                log(`set_music tắt: Bỏ qua Edit video và chọn nhạc.`);
            }
            // --- END PROCESSING WAIT & ADD SOUND ---

            // --- TASK: Content Check Lite ---
            let checkSuccess = true;
            if (profile.need_content_check !== 0) {
                try {
                    log(`Starting Content check lite validation...`);
                    // Wait for toggle/switch container to be attached
                    const headline = page.locator('.headline-wrapper', { hasText: 'Content check lite' });
                    await headline.waitFor({ timeout: 5000 }).catch(() => null);

                    if (await headline.count() > 0) {
                        const switchContent = headline.locator('.Switch__content');
                        if (await switchContent.count() > 0) {
                            const isChecked = await switchContent.getAttribute('data-state') === 'checked' || await switchContent.getAttribute('aria-checked') === 'true';
                            if (!isChecked) {
                                log("Content check lite is not enabled. Enabling it...");
                                await switchContent.click({ force: true });
                            } else {
                                log("Content check lite is already enabled.");
                            }

                            log("Waiting for Content check lite to complete...");
                            let checkStartTime = Date.now();
                            const maxCheckTime = 12 * 60 * 1000; // 12 minutes max
                            let toggledRetry = false;
                            checkSuccess = false;

                            while (Date.now() - checkStartTime < maxCheckTime) {
                                const status = await page.evaluate(() => {
                                    const successEl = document.querySelector('.status-result.status-success');
                                    if (successEl && successEl.getAttribute('data-show') === 'true') {
                                        return 'success';
                                    }
                                    const warnEl = document.querySelector('.status-result.status-warn');
                                    if (warnEl && warnEl.getAttribute('data-show') === 'true') {
                                        return 'warn';
                                    }
                                    const errorEl = document.querySelector('.status-result.status-error');
                                    if (errorEl && errorEl.getAttribute('data-show') === 'true') {
                                        return 'error';
                                    }
                                    const checkingEl = document.querySelector('.status-result.status-checking');
                                    if (checkingEl && checkingEl.getAttribute('data-show') === 'true') {
                                        return 'checking';
                                    }
                                    const readyEls = Array.from(document.querySelectorAll('.status-result.status-ready'));
                                    const visibleReady = readyEls.find(el => el.getAttribute('data-show') === 'true');
                                    if (visibleReady) {
                                        const text = visibleReady.innerText || "";
                                        if (text.includes("limit")) {
                                            return 'limit_reached';
                                        }
                                        if (text.includes("government") || text.includes("politician")) {
                                            return 'restricted';
                                        }
                                        return 'ready_initial';
                                    }
                                    return 'unknown';
                                });

                                log(`Content check status: ${status}`);

                                if (status === 'success' || status === 'limit_reached') {
                                    if (status === 'limit_reached') {
                                        log("Daily content check limit reached. Proceeding to post without safety check validation.");
                                    }
                                    checkSuccess = true;
                                    break;
                                } else if (status === 'checking' || status === 'unknown' || status === 'ready_initial') {
                                    // Stuck check retry logic: If waiting for 3 minutes and retry has not been done yet, click twice
                                    if (!toggledRetry && (Date.now() - checkStartTime > 3 * 60 * 1000)) {
                                        log("Stuck in checking for 3 minutes. Toggling Content check lite off and on again...");
                                        try {
                                            await switchContent.click({ force: true });
                                            await page.waitForTimeout(1000);
                                            await switchContent.click({ force: true });
                                            await page.waitForTimeout(2000);
                                            toggledRetry = true;
                                            checkStartTime = Date.now(); // Reset timer after toggling
                                        } catch (toggleErr) {
                                            log(`Failed to toggle retry switch: ${toggleErr.message}`);
                                        }
                                    }
                                    await page.waitForTimeout(5000);
                                } else {
                                    log(`Content check failed/restricted/warned/errored with status: ${status}`);
                                    break;
                                }
                            }
                        } else {
                            log("Warning: Content check switch content selector not found.");
                        }
                    } else {
                        log("Warning: Content check lite header not found on this page.");
                    }
                } catch (checkErr) {
                    log(`Error during Content check lite: ${checkErr.message}`);
                    checkSuccess = false;
                }
            } else {
                log("Content check lite is disabled for this profile. Skipping check.");
            }

            if (!checkSuccess) {
                log(`Content check failed. Skipping posting and deleting video file.`);
                try {
                    if (fs.existsSync(videoPath)) {
                        fs.unlinkSync(videoPath);
                        log(`Deleted ${videoFileName} due to failed content check.`);
                    }
                } catch (err) {
                    log(`ERROR deleting file: ${err.message}`);
                }

                // Discard the upload by closing the page and opening a new one
                log("Resetting page to discard current upload...");
                await page.close().catch(() => null);
                page = await browser.newPage();
                continue; // Skip rest of loop and process next video
            }
            // --- END TASK: Content Check Lite ---

            // --- TASK 3: Scheduled Publishing ---
            if (profile.auto_increment_schedule) {
                try {
                    log(`Auto-increment schedule: processing video ${i + 1}...`);

                    if (hasExistingSchedule) {
                        // ALL videos scheduled â€” existing scheduled batch detected on TikTok
                        // No immediate publish for any video
                        // 1. Click "Schedule" radio
                        const scheduleRadio = 'input[value="schedule"]';
                        const scheduleRadioInput = page.locator(scheduleRadio).first();
                        await scheduleRadioInput.waitFor({ timeout: 15000, state: 'attached' });
                        await scheduleRadioInput.check({ force: true }).catch(() => scheduleRadioInput.click({ force: true }));
                        log(`Selected "Schedule" option (existing batch).`);
                        await page.waitForTimeout(3000);

                        // 2. Resolve inputs
                        const scheduleInputs = await resolveScheduleInputs(page, log);

                        // 3. Increment by intervalMinutes from existing scheduled time
                        const intervalMin = profile.schedule_interval || 5;
                        lastScheduledTime = computeAutoIncrementTime({ lastScheduledTime, intervalMinutes: intervalMin });
                        const dateValue = formatScheduleValue(lastScheduledTime, 'date', scheduleInputs.date || {});
                        const timeValue = formatScheduleValue(lastScheduledTime, 'time', scheduleInputs.time || {});

                        log(`Video ${i + 1}: Scheduling at ${dateValue} ${timeValue} (from existing batch).`);
                        await fillScheduleInput(page, scheduleInputs.date, dateValue, 'Date', log);
                        await fillScheduleInput(page, scheduleInputs.time, timeValue, 'Time', log);
                        await page.waitForTimeout(2000);

                        if (process.env.TIKTOK_DEBUG_SCREENSHOTS === 'true') {
                            await page.screenshot({ path: path.join(__dirname, '..', `debug_${profile.name}_autoincrement_${i + 1}.png`) }).catch(() => null);
                        }

                    } else if (i === 0) {
                        log(`Video 1: Posting immediately (Public).`);
                        // Public is usually default, but we can ensure it if needed

                    } else {
                        // Normal auto-increment: video 2 captures default, video 3+ increments
                        // 1. Click "Schedule" radio
                        const scheduleRadio = 'input[value="schedule"]';
                        const scheduleRadioInput = page.locator(scheduleRadio).first();
                        await scheduleRadioInput.waitFor({ timeout: 15000, state: 'attached' });
                        await scheduleRadioInput.check({ force: true }).catch(() => scheduleRadioInput.click({ force: true }));
                        log(`Selected "Schedule" option.`);
                        await page.waitForTimeout(3000);

                        // 2. Resolve inputs
                        const scheduleInputs = await resolveScheduleInputs(page, log);

                        if (i === 1) {
                            // Video 2: Capture TikTok's default time
                            const defaultDate = await page.locator('input.TUXTextInputCore-input:visible').nth(scheduleInputs.date.index).inputValue();
                            const defaultTime = await page.locator('input.TUXTextInputCore-input:visible').nth(scheduleInputs.time.index).inputValue();
                            log(`TikTok default schedule: ${defaultDate} ${defaultTime}`);

                            lastScheduledTime = new Date(`${defaultDate} ${defaultTime}`);
                            if (!isNaN(lastScheduledTime.getTime())) {
                                log(`Captured base time: ${lastScheduledTime.toISOString()}`);
                            } else {
                                log(`Warning: Failed to parse default time. Using fallback.`);
                                lastScheduledTime = computeAutoIncrementTime({ lastScheduledTime: null, intervalMinutes: profile.schedule_interval || 5, now: new Date() });
                            }
                        } else {
                            // Video 3+: Increment by intervalMinutes (5 or 10 mins)
                            const intervalMin = profile.schedule_interval || 5;
                            lastScheduledTime = computeAutoIncrementTime({ lastScheduledTime, intervalMinutes: intervalMin });
                            const dateValue = formatScheduleValue(lastScheduledTime, 'date', scheduleInputs.date || {});
                            const timeValue = formatScheduleValue(lastScheduledTime, 'time', scheduleInputs.time || {});

                            log(`Setting incremented schedule: ${dateValue} ${timeValue}`);
                            await fillScheduleInput(page, scheduleInputs.date, dateValue, 'Date', log);
                            await fillScheduleInput(page, scheduleInputs.time, timeValue, 'Time', log);
                            await page.waitForTimeout(2000);
                        }

                        if (process.env.TIKTOK_DEBUG_SCREENSHOTS === 'true') {
                            await page.screenshot({ path: path.join(__dirname, '..', `debug_${profile.name}_autoincrement_${i + 1}.png`) }).catch(() => null);
                        }
                    }
                } catch (e) {
                    log(`Auto-increment scheduling failed: ${e.message}`);
                }
            }
            // --- END TASK 3 ---

            log(`Starting Post click sequence...`);
            let clickedPost = false;
            let capturedVideoId = null;

            // Intercept TikTok API responses to capture the video ID
            const responseHandler = async (response) => {
                try {
                    const url = response.url();
                    const status = response.status();
                    if (status >= 200 && status < 300 &&
                        (url.includes('/publish') || url.includes('/create') || url.includes('/post') ||
                         url.includes('/upload') || url.includes('/item'))) {
                        const contentType = response.headers()['content-type'] || '';
                        if (contentType.includes('json')) {
                            const text = await response.text().catch(() => '');
                            if (text) {
                                const idPatterns = [
                                    /"publish_id"\s*:\s*"(\d+)"/,
                                    /"video_id"\s*:\s*"(\d+)"/,
                                    /"item_id"\s*:\s*"(\d+)"/,
                                    /"aweme_id"\s*:\s*"(\d+)"/,
                                    /"id"\s*:\s*"(\d{15,})"/,
                                ];
                                for (const pattern of idPatterns) {
                                    const match = text.match(pattern);
                                    if (match && match[1]) {
                                        capturedVideoId = match[1];
                                        log(`Captured video ID from API: ${capturedVideoId} (via ${url.split('?')[0]})`);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                } catch (e) { /* silently ignore */ }
            };
            page.on('response', responseHandler);

            for (let clickAttempt = 0; clickAttempt < 10; clickAttempt++) {
                await dismissPopups(page);

                const postSelectors = [
                    'button.common-button-post-video',
                    '[data-e2e="post_video_button"]',
                    'button[data-e2e*="post"]',
                    'button[data-e2e*="schedule"]',
                    'button:has-text("Schedule")',
                    'button:has-text("Post"):not(:has-text("draft"))',
                ];

                let targetBtn = null;
                for (const sel of postSelectors) {
                    const btn = await page.$(sel);
                    if (btn && await btn.isVisible() && !await btn.isDisabled()) {
                        targetBtn = btn;
                        break;
                    }
                }

                if (clickAttempt === 0) {
                    await takeScreenshot('step5_ready_to_post');
                }

                if (targetBtn) {
                    const btnLabel = await targetBtn.innerText().catch(() => 'Post');
                    log(`Clicking ${btnLabel.trim()} button (Attempt ${clickAttempt + 1})...`);
                    try {
                        // Strategy A: Real browser click
                        await targetBtn.click({ force: true, timeout: 5000 });
                    } catch (e) {
                        // Strategy B: Evaluate click fallback
                        await targetBtn.evaluate(node => node.click()).catch(() => null);
                    }
                    await dismissPopups(page);
                }

                // Success detection polling (Wait up to 15s per attempt)
                for (let poll = 0; poll < 3; poll++) {
                    await page.waitForTimeout(5000);

                    const postBtnGone = !await page.$('button:has-text("Post"), button:has-text("Schedule")');
                    const successMsg = await page.$('text="Uploaded", text="Success", text="View video", text="Manage your posts", text="Share video", text="Scheduled", text="Your video has been uploaded"');
                    const redirected = !page.url().includes('upload') || page.url().includes('manage') || page.url().includes('content');

                    if (postBtnGone || successMsg || redirected) {
                        log(`Post confirmed! (btnGone: ${postBtnGone}, msg: ${!!successMsg}, redirected: ${redirected})`);
                        clickedPost = true;
                        await takeScreenshot('step6_post_success');
                        break;
                    }

                    // Check if button text changed to "Posting..." or "Scheduling..."
                    const btnText = await targetBtn?.innerText().catch(() => "");
                    if (btnText?.includes("Posting") || btnText?.includes("Scheduling")) {
                        log(`Status: ${btnText.trim()} in progress...`);
                    }

                    await dismissPopups(page);
                }

                if (clickedPost) break;
            }

            // Remove the response listener
            page.removeListener('response', responseHandler);

            if (clickedPost) {
                log(`Finalizing upload for ${videoFileName}...`);
                let videoLink = null;

                // Build the video link from the captured video ID
                if (capturedVideoId) {
                    videoLink = `https://www.tiktok.com/@${profile.name}/video/${capturedVideoId}`;
                    log(`Built video link from captured ID: ${videoLink}`);
                } else {
                    // Fallback: try to find a video ID from the current page URL
                    try {
                        const currentUrl = page.url();
                        const urlMatch = currentUrl.match(/\/video\/(\d+)/);
                        if (urlMatch) {
                            videoLink = `https://www.tiktok.com/@${profile.name}/video/${urlMatch[1]}`;
                            log(`Built video link from current URL: ${videoLink}`);
                        } else {
                            log(`No video ID captured from API or URL.`);
                        }
                    } catch (e) {
                        log(`Error checking URL for video ID: ${e.message}`);
                    }
                }

                try {
                    if (fs.existsSync(videoPath)) {
                        fs.unlinkSync(videoPath);
                        log(`SUCCESS: Deleted ${videoFileName} after upload.`);
                    }
                    uploadedCount++;
                } catch (err) {
                    log(`ERROR deleting file: ${err.message}`);
                }

                // Wait before next loop iteration to let things settle and recycle page to prevent RAM accumulation
                if (i < videos.length - 1) {
                    log(`Preparing for next video (recycling tab to free memory)...`);
                    await page.close().catch(() => null);
                    await new Promise(r => setTimeout(r, 2000));
                    page = await browser.newPage();
                }
            } else {
                if (i < videos.length - 1) {
                    log(`Upload did not finalize. Recycling tab for next video...`);
                    await page.close().catch(() => null);
                    await new Promise(r => setTimeout(r, 2000));
                    page = await browser.newPage();
                }
            }
        }
        return uploadedCount;
    } catch (error) {
        appendLogSafe(`[${new Date().toISOString()}] CRITICAL ERROR: ${error.message}\n${error.stack}\n`);
        throw error;
    } finally {
        log(`Automation session ended.`);
        await browser.close().catch(() => null);
        await releaseProfileLocks(userDataDir, profile.name).catch(() => {});
    }
}
export async function runTikTokLogin(profile) {
    const profileId = profile.id;
    const userDataDir = path.join(PROFILES_DIR, profile.name);

    const log = (msg) => {
        const entry = `[${new Date().toISOString()}] [${profile.name}][LOGIN] ${msg}\n`;
        console.log(entry.trim());
        appendLogSafe(entry);
    };

    const browserOptions = buildBrowserLaunchOptions(profile);
    const browser = await launchPersistentContextSafe(chromium, userDataDir, browserOptions, profile);

    const session = {
        browser,
        stop: false,
        stats: { step: 'checking_cookies', startedAt: Date.now() }
    };
    loggingInProfiles.set(profileId, session);
    db.prepare("UPDATE profiles SET status = ? WHERE id = ?").run('logging_in', profileId);

    log('Kiá»ƒm tra phiÃªn Ä‘Äƒng nháº­p Cookie...');

    try {
        const tiktokPage = await browser.newPage();
        await injectProfileCookies(browser, profile);

        await tiktokPage.goto('https://www.tiktok.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        await tiktokPage.waitForTimeout(3000);

        const currentUrl = tiktokPage.url();
        log('Kiá»ƒm tra tráº¡ng thÃ¡i Ä‘Äƒng nháº­p qua avatar...');
        const isLoggedIn = await tiktokPage.waitForSelector(
            '#header-profile-avatar, [data-e2e="profile-icon"], [data-e2e="avatar-icon"]',
            { timeout: 8000, state: 'visible' }
        ).then(() => true).catch(() => false);

        if (isLoggedIn) {
            log('ÄÄƒng nháº­p qua cookies thÃ nh cÃ´ng! URL: ' + currentUrl);
            session.stats.step = 'cookie_login_complete';
            const freshCookies = await browser.cookies();
            db.prepare('UPDATE profiles SET cookies = ? WHERE id = ?')
                .run(JSON.stringify(freshCookies), profileId);
        } else {
            log('Cookies chÆ°a cÃ³ hoáº·c Ä‘Ã£ háº¿t háº¡n. Vui lÃ²ng báº¥m "Má»Ÿ Profile" Ä‘á»ƒ tá»± Ä‘Äƒng nháº­p trÃªn trÃ¬nh duyá»‡t.');
            session.stats.step = 'cookie_expired';
        }
    } catch (err) {
        log(`Lá»—i kiá»ƒm tra Ä‘Äƒng nháº­p: ${err.message}`);
        session.stats.step = 'error';
        session.stats.error = err.message;
    } finally {
        loggingInProfiles.delete(profileId);
        await browser.close().catch(() => null);
        await releaseProfileLocks(userDataDir, profile.name).catch(() => {});
        db.prepare("UPDATE profiles SET status = 'idle' WHERE id = ?").run(profileId);
        log('Kết thúc phiên kiểm tra cookie, trình duyệt đã đóng.');
    }
}

export async function addFavoriteMusic(profile, searchTerm) {
    const profileId = profile.id;
    const userDataDir = path.join(PROFILES_DIR, profile.name);

    const log = (msg) => {
        const entry = `[${new Date().toISOString()}] [${profile.name}][FAV-MUSIC] ${msg}\n`;
        console.log(entry.trim());
        appendLogSafe(entry);
    };

    let videoPath = null;
    try {
        const dummyFiles = fs.readdirSync(DUMMY_VIDEOS_DIR).filter(f => {
            const ext = path.extname(f).toLowerCase();
            return ['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext);
        });
        if (dummyFiles.length === 0) {
            log('ERROR: No video found in dummy_videos folder.');
            return;
        }
        videoPath = path.join(DUMMY_VIDEOS_DIR, dummyFiles[0]);
    } catch (e) {
        log(`ERROR reading dummy_videos folder: ${e.message}`);
        return;
    }

    const browserOptions = buildBrowserLaunchOptions(profile);
    const browser = await launchPersistentContextSafe(chromium, userDataDir, browserOptions, profile);
    await injectProfileCookies(browser, profile);
    addingFavoriteMusicProfiles.add(profileId);
    db.prepare("UPDATE profiles SET status = ? WHERE id = ?").run('adding_favorite_music', profileId);

    log(`Searching for music: "${searchTerm}"`);

    try {
        const page = await browser.newPage();
        await page.goto('https://www.tiktok.com/tiktokstudio/upload', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        await page.waitForTimeout(3000);

        const fileInput = page.locator('input[type="file"]').first();
        if (await fileInput.count() > 0) {
            await fileInput.setInputFiles(videoPath);
        }

        await page.waitForTimeout(5000);
        await dismissPopups(page);
        await dismissOnboardingModals(page, log);

        await page.evaluate(() => {
            const btn = document.querySelector('.editor-entrance[data-button-name="sounds"], [data-button-name="sounds"], button:has-text("Sounds")');
            if (btn) btn.scrollIntoView({ block: 'center' });
        }).catch(() => null);

        const editBtn = page.locator('.editor-entrance[data-button-name="sounds"], button[data-button-name="sounds"], button:has-text("Sounds"), button:has-text("Edit video")').first();
        if (await editBtn.isVisible({ timeout: 15000 })) {
            await editBtn.click();
            await page.waitForTimeout(2000);

            // Dismiss Phone mode if present
            const phoneModeGotIt = page.locator('div:has-text("Phone mode") button:has-text("Got it"), button:has-text("Got it")').first();
            if (await phoneModeGotIt.isVisible({ timeout: 2000 }).catch(() => false)) {
                await phoneModeGotIt.click().catch(() => null);
                await page.waitForTimeout(1000);
            }

            const searchInput = page.locator('input[placeholder*="sound" i], input[placeholder*="music" i]').first();
            if (await searchInput.isVisible({ timeout: 5000 })) {
                await searchInput.click();
                await page.keyboard.type(searchTerm, { delay: 30 });
                await page.keyboard.press('Enter');
                await page.waitForTimeout(2500);

                const heartIcon = page.locator('div[role="listitem"] [data-icon*="heart"], div[role="listitem"] [data-icon*="bookmark"]').first();
                if (await heartIcon.isVisible({ timeout: 5000 })) {
                    await heartIcon.click({ force: true });
                    log(`Favorited sound for "${searchTerm}" successfully!`);
                }
            }
        }
    } catch (err) {
        log(`Error adding favorite music: ${err.message}`);
    } finally {
        addingFavoriteMusicProfiles.delete(profileId);
        await browser.close().catch(() => null);
        await releaseProfileLocks(userDataDir, profile.name).catch(() => {});
        db.prepare("UPDATE profiles SET status = 'idle' WHERE id = ?").run(profileId);
        log('Browser closed, favorite music task complete.');
    }
}
