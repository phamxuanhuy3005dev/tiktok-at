// Shared in-memory runtime tracking states for active profile sessions
export const runningProfiles = new Set();
export const processingProfiles = new Set();
export const processingVideoIds = new Map(); // video_id -> profile.id
export const manualBrowsers = new Map(); // profileId -> BrowserContext
export const loggingInProfiles = new Map(); // profileId -> { browser, stop: boolean, stats: object }
export const addingFavoriteMusicProfiles = new Set();

let currentBatchSession = null;

export function getBatchSession() {
    return currentBatchSession;
}

export function setBatchSession(session) {
    currentBatchSession = session;
}

export function dismissBatchSession() {
    currentBatchSession = null;
}
