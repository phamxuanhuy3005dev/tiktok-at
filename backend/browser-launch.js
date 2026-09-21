// Shared Chrome launch options for launchPersistentContext() calls.
// Standard Playwright launch matching feature/change_music_auto (clean, no bot detection flags).

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
            '--disable-blink-features=AutomationControlled',
            ...extraArgs
        ]
    };
    if (viewport) options.viewport = viewport;

    return options;
}
