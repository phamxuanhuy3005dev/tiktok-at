import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

export function parseCookies(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return [];
  const trimmed = rawInput.trim();
  if (!trimmed) return [];

  let cookies = [];
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      cookies = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      // fallback to string parsing if JSON fails
    }
  }

  if (cookies.length === 0) {
    cookies = trimmed
      .split(';')
      .map((part) => {
        const equalIdx = part.indexOf('=');
        if (equalIdx === -1) return null;
        const name = part.substring(0, equalIdx).trim();
        const value = part.substring(equalIdx + 1).trim();
        if (!name) return null;
        return {
          name,
          value,
          domain: '.tiktok.com',
          path: '/',
        };
      })
      .filter(Boolean);
  }

  return cookies.map((c) => {
    const clean = { ...c };
    if (typeof clean.expires === 'number') {
      clean.expires = Math.round(clean.expires);
    }
    if (clean.sameSite && !['Lax', 'Strict', 'None'].includes(clean.sameSite)) {
      delete clean.sameSite;
    }
    return clean;
  });
}

export async function injectProfileCookies(browserContext, profile) {
  if (!profile || !profile.cookies || !profile.cookies.trim()) return;

  try {
    const cleanedCookies = parseCookies(profile.cookies);
    if (cleanedCookies.length > 0) {
      await browserContext.addCookies(cleanedCookies);
      console.log(
        `[${profile.name}] Automatically injected ${cleanedCookies.length} cookies into browser context`,
      );
    }
  } catch (e) {
    console.error(
      `[${profile?.name || 'Profile'}] Failed to inject cookies:`,
      e.message,
    );
  }
}

export async function captureBrowserCookies(browserContext) {
  if (!browserContext) return [];
  try {
    const cookies = await browserContext.cookies();
    return Array.isArray(cookies) ? cookies : [];
  } catch (e) {
    console.error('Failed to capture browser cookies:', e.message);
    return [];
  }
}

export async function extractCookiesFromDisk(profileName, profilesDir) {
  if (!profileName || !profilesDir) return [];
  const userDataDir = path.join(profilesDir, profileName);
  if (!fs.existsSync(userDataDir)) return [];
  try {
    const ctx = await chromium.launchPersistentContext(userDataDir, {
      headless: true,
      args: ['--no-startup-window'],
    });
    const cookies = await ctx.cookies();
    await ctx.close();
    return Array.isArray(cookies) ? cookies : [];
  } catch (err) {
    console.warn(
      `[${profileName}] Could not extract cookies from disk:`,
      err.message,
    );
    return [];
  }
}
