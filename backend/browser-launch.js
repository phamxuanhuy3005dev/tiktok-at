// Shared Chrome launch options for launchPersistentContext() calls.
// Optimized for low-end and older hardware while preserving full TikTok Studio functionality (WebGL, Audio, Canvas).

export const PERFORMANCE_CHROME_ARGS = [
  '--disable-blink-features=AutomationControlled',
  '--no-first-run',
  '--no-default-browser-check',
  '--password-store=basic',
  // Smooth rendering & prevent MPO / DWM swapchain flickering on Windows & AMD GPUs
  '--disable-direct-composition-video-overlays',
  '--disable-features=UseMultiplaneOverlayForHardwareVideo',
  '--enable-features=PaintHolding',
  // Disable crash reporting, telemetry & background sync noise
  '--metrics-recording-only',
  '--disable-breakpad',
  '--disable-prompt-on-repost',
  '--disable-sync',
  '--disable-default-apps',
  '--disable-component-update',
];

/**
 * Build the options object for chromium.launchPersistentContext().
 *
 * @param {object|null} [profile] profile row (optional)
 * @param {object}      [opts]
 * @param {string[]}    [opts.extraArgs] additional Chrome args (e.g. --window-size)
 * @param {object}      [opts.viewport]  Playwright viewport option
 */
export function buildBrowserLaunchOptions(
  profile,
  { extraArgs = [], viewport } = {},
) {
  const options = {
    headless: false,
    args: [...PERFORMANCE_CHROME_ARGS, ...extraArgs],
  };
  if (viewport) options.viewport = viewport;

  return options;
}
