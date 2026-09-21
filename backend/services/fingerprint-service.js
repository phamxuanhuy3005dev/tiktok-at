import { FingerprintGenerator } from 'fingerprint-generator';
import { db } from '../db.js';

const fingerprintGenerator = new FingerprintGenerator({
    browsers: [{ name: 'chrome', minVersion: 110 }],
    operatingSystems: ['windows'],
    devices: ['desktop'],
});

export function getOrGenerateFingerprint(profileId) {
    const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(profileId);
    if (!profile) return null;

    if (profile.use_fingerprint === 0) {
        return null;
    }

    if (profile.fingerprint) {
        try {
            return JSON.parse(profile.fingerprint);
        } catch (e) {
            console.error(`Error parsing fingerprint JSON for profile ${profileId}:`, e);
        }
    }

    // Generate new fingerprint
    const generated = fingerprintGenerator.getFingerprint();
    db.prepare('UPDATE profiles SET fingerprint = ? WHERE id = ?').run(JSON.stringify(generated), profileId);
    console.log(`[${profile.name}] Generated and saved new fingerprint`);
    return generated;
}

export function resetProfileFingerprint(profileId) {
    const generated = fingerprintGenerator.getFingerprint();
    db.prepare('UPDATE profiles SET fingerprint = ? WHERE id = ?').run(JSON.stringify(generated), profileId);
    return generated;
}

/**
 * Kept for backwards compatibility.
 * In feature/change_music_auto, Chromium runs without prototype tampering
 * because WebGL prototype monkey-patching triggers TikTok anti-bot / max attempt errors.
 */
export async function applyProfileFingerprint(browserContext, profile) {
    // No-op to preserve 100% native [native code] integrity for TikTok anti-bot checks
    return;
}
