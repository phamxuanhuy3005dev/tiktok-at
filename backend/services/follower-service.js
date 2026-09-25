import { chromium } from 'playwright';

/**
 * Concurrently fetches public TikTok follower counts for a list of profiles.
 * Extremely lightweight: blocks media, fonts, and images to run in ~1-2s with minimal RAM.
 *
 * @param {Array<{id: string, name: string}>} profileList
 * @returns {Promise<Array<{id: string, name: string, followers: number|string|null, success: boolean, error?: string}>>}
 */
export async function fetchProfilesFollowers(profileList = []) {
  if (!Array.isArray(profileList) || profileList.length === 0) {
    return [];
  }

  const results = [];
  let browser = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--js-flags=--max-old-space-size=256'
      ]
    });

    const queue = [...profileList];
    const concurrency = Math.min(3, queue.length);

    async function worker() {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item || !item.name) continue;

        let page = null;
        try {
          page = await browser.newPage();
          // Abort heavy media, image, and font resources to minimize network and memory usage
          await page.route('**/*', (route) => {
            const type = route.request().resourceType();
            if (['image', 'media', 'font'].includes(type)) {
              return route.abort();
            }
            return route.continue();
          });

          const url = `https://www.tiktok.com/@${item.name}`;
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

          // Wait for hydration or follower element to appear
          await page.waitForFunction(() => {
            return !!document.querySelector('[data-e2e="followers-count"]') ||
                   !!document.getElementById('__UNIVERSAL_DATA_FOR_REHYDRATION__');
          }, { timeout: 6000 }).catch(() => null);

          const followerCount = await page.evaluate(() => {
            try {
              const script = document.getElementById('__UNIVERSAL_DATA_FOR_REHYDRATION__');
              if (script) {
                const data = JSON.parse(script.innerText);
                const stats = data?.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo?.stats;
                if (stats && stats.followerCount !== undefined) {
                  return stats.followerCount;
                }
              }
            } catch (e) {}

            const el = document.querySelector('[data-e2e="followers-count"]');
            if (el && el.innerText.trim()) return el.innerText.trim();
            return null;
          });

          results.push({
            id: item.id,
            name: item.name,
            followers: followerCount !== null ? followerCount : null,
            success: followerCount !== null
          });
        } catch (err) {
          results.push({
            id: item.id,
            name: item.name,
            followers: null,
            success: false,
            error: err.message
          });
        } finally {
          if (page) await page.close().catch(() => null);
        }
      }
    }

    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);
  } finally {
    if (browser) await browser.close().catch(() => null);
  }

  // Preserve the original order of requested profileList
  const orderMap = new Map(profileList.map((p, idx) => [p.id, idx]));
  results.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

  return results;
}
