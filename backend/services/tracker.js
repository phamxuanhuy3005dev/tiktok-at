// Shared in-memory runtime tracking states for active profile sessions
export const runningProfiles = new Set();
export const processingProfiles = new Set();
export const manualBrowsers = new Map(); // profileId -> BrowserContext
export const loggingInProfiles = new Map(); // profileId -> { browser, stop: boolean, stats: object }
export const addingFavoriteMusicProfiles = new Set();

const activeBatchSessions = new Map();

export function getAllBatchSessions() {
  return Array.from(activeBatchSessions.values());
}

export function getBatchSession(sessionId = null) {
  if (sessionId && activeBatchSessions.has(sessionId)) {
    return activeBatchSessions.get(sessionId);
  }
  const sessions = Array.from(activeBatchSessions.values());
  if (sessions.length === 0) return null;
  // Return latest running session if any, otherwise latest session
  const running = sessions.filter((s) => s.status !== 'completed');
  if (running.length > 0) return running[running.length - 1];
  return sessions[sessions.length - 1];
}

export function setBatchSession(session) {
  if (!session || !session.id) return;
  activeBatchSessions.set(session.id, session);
}

export function dismissBatchSession(sessionId = null) {
  if (sessionId) {
    activeBatchSessions.delete(sessionId);
  } else {
    // Dismiss completed sessions, or clear if all are completed
    const completedIds = [];
    for (const [id, s] of activeBatchSessions.entries()) {
      if (s.status === 'completed') completedIds.push(id);
    }
    if (completedIds.length > 0) {
      completedIds.forEach((id) => activeBatchSessions.delete(id));
    } else {
      activeBatchSessions.clear();
    }
  }
}
