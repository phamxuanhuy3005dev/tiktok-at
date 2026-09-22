// Shared Chrome launch options for launchPersistentContext() calls.
// Optimized for low-end and older hardware while preserving full TikTok Studio functionality (WebGL, Audio, Canvas).

export const PERFORMANCE_CHROME_ARGS = [
    '--disable-blink-features=AutomationControlled',
    // Memory and disk cache limits for low RAM/disk machines
    '--js-flags=--max-old-space-size=512',
    '--disk-cache-size=33554432',
    '--media-cache-size=33554432',
    // Disable unnecessary background processes and network requests
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-domain-reliability',
    '--disable-sync',
    '--disable-client-side-phishing-detection',
    '--disable-default-apps',
    '--disable-hang-monitor',
    '--disable-popup-blocking',
    '--disable-prompt-on-repost',
    // Disable metrics and crash reporting
    '--metrics-recording-only',
    '--disable-breakpad',
    '--no-first-run',
    '--no-default-browser-check',
    '--password-store=basic',
    // Disable heavy unneeded features (retains WebGL/HW accel for video editor)
    '--disable-features=Translate,OptimizationHints,MediaRouter,CalculateNativeWinOcclusion,InterestFeedContentSuggestions'
];

/**
 * Build the options object for chromium.launchPersistentContext().
 *
 * @param {object|null} [profile] profile row (optional)
 * @param {object}      [opts]
 * @param {string[]}    [opts.extraArgs] additional Chrome args (e.g. --window-size)
 * @param {object}      [opts.viewport]  Playwright viewport option
 */
export function buildBrowserLaunchOptions(profile, { extraArgs = [], viewport } = {}) {
    const options = {
        headless: false,
        args: [
            ...PERFORMANCE_CHROME_ARGS,
            ...extraArgs
        ]
    };
    if (viewport) options.viewport = viewport;

    return options;
}

