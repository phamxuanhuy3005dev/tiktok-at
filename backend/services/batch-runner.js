import fs from 'fs';
import path from 'path';
import { db, getConfig, UPLOADS_DIR } from '../db.js';
import { uploadVideo } from './tiktok-automation.js';
import {
  runningProfiles,
  processingProfiles,
  setBatchSession,
} from './tracker.js';

export function distributeVideosEvenly(videoList, profileCount) {
  if (!profileCount || profileCount <= 0) return [];
  if (!Array.isArray(videoList) || videoList.length === 0) {
    return Array.from({ length: profileCount }, () => []);
  }

  const n = videoList.length;
  const m = profileCount;
  const distribution = [];
  let currentIndex = 0;

  for (let i = 0; i < m; i++) {
    const countForThisProfile = Math.floor(n / m) + (i < n % m ? 1 : 0);
    if (countForThisProfile > 0 && currentIndex < n) {
      distribution.push(
        videoList.slice(currentIndex, currentIndex + countForThisProfile),
      );
      currentIndex += countForThisProfile;
    } else {
      distribution.push([]);
    }
  }

  return distribution;
}

export async function runSingleProfile(
  profile,
  limitUploads = false,
  uploadLimitCount = 0,
  forceUploadAll = false,
  specificFile = null,
  assignedVideos = null,
  overrideFolder = null,
) {
  if (runningProfiles.has(profile.id)) {
    return {
      success: false,
      uploadedCount: 0,
      error: 'Already running',
      profileId: profile.id,
      profileName: profile.name,
    };
  }
  runningProfiles.add(profile.id);

  console.log(`[${profile.name}] Starting automation...`);
  db.prepare('UPDATE profiles SET status = ?, last_run = ? WHERE id = ?').run(
    'uploading',
    new Date().toISOString(),
    profile.id,
  );

  let uploadedCount = 0;
  try {
    const videoFolder =
      overrideFolder ||
      profile.video_folder ||
      getConfig('videoFolder', UPLOADS_DIR);
    let videos = [];
    try {
      if (Array.isArray(assignedVideos) && assignedVideos.length > 0) {
        videos = assignedVideos;
        console.log(
          `[${profile.name}] Assigned ${videos.length} videos from ${videoFolder}`,
        );
      } else if (specificFile) {
        if (fs.existsSync(specificFile)) {
          videos = [path.basename(specificFile)];
          console.log(
            `[${profile.name}] Single-file mode: uploading ${specificFile}`,
          );
        } else {
          console.error(
            `[${profile.name}] Specific file not found: ${specificFile}`,
          );
        }
      } else {
        if (!fs.existsSync(videoFolder)) {
          console.error(
            `[${profile.name}] Video folder does not exist: ${videoFolder}`,
          );
          db.prepare('UPDATE profiles SET status = ? WHERE id = ?').run(
            'error',
            profile.id,
          );
          return {
            success: false,
            uploadedCount: 0,
            error: 'Video folder does not exist',
            profileId: profile.id,
            profileName: profile.name,
          };
        }
        videos = fs
          .readdirSync(videoFolder)
          .filter((file) => {
            if (file.startsWith('.')) return false;
            const ext = path.extname(file).toLowerCase();
            return ext === '.mp4' || ext === '.mov' || ext === '.webm';
          })
          .sort((a, b) =>
            a.localeCompare(b, undefined, {
              numeric: true,
              sensitivity: 'base',
            }),
          );
        console.log(
          `[${profile.name}] Found ${videos.length} videos in ${videoFolder}`,
        );
      }
    } catch (e) {
      console.error(`[${profile.name}] Folder error:`, e.message);
    }

    if (!videos || videos.length === 0) {
      console.log(
        `[${profile.name}] Không tìm thấy video hợp lệ trong ${videoFolder}. Bỏ qua.`,
      );
      db.prepare('UPDATE profiles SET status = ? WHERE id = ?').run(
        'no_videos',
        profile.id,
      );
      return {
        success: false,
        uploadedCount: 0,
        error: 'Không tìm thấy video nào trong thư mục để upload',
        profileId: profile.id,
        profileName: profile.name,
      };
    }

    const actualFolder = specificFile
      ? path.dirname(specificFile)
      : videoFolder;
    uploadedCount = await uploadVideo(
      profile,
      actualFolder,
      videos,
      limitUploads,
      uploadLimitCount,
      forceUploadAll,
    );

    if (uploadedCount > 0) {
      db.prepare('UPDATE profiles SET status = ? WHERE id = ?').run(
        'success',
        profile.id,
      );
      return {
        success: true,
        uploadedCount,
        profileId: profile.id,
        profileName: profile.name,
      };
    } else {
      db.prepare('UPDATE profiles SET status = ? WHERE id = ?').run(
        'no_videos',
        profile.id,
      );
      return {
        success: false,
        uploadedCount: 0,
        error: 'Không có video nào được upload',
        profileId: profile.id,
        profileName: profile.name,
      };
    }
  } catch (error) {
    console.error(`[${profile.name}] Automation error:`, error);
    db.prepare('UPDATE profiles SET status = ? WHERE id = ?').run(
      'error',
      profile.id,
    );
    return {
      success: false,
      uploadedCount: 0,
      error: error.message || 'Automation error',
      profileId: profile.id,
      profileName: profile.name,
    };
  } finally {
    runningProfiles.delete(profile.id);
    setTimeout(() => {
      if (!runningProfiles.has(profile.id)) {
        db.prepare('UPDATE profiles SET status = ? WHERE id = ?').run(
          'idle',
          profile.id,
        );
      }
    }, 10000);
  }
}

export async function executeBatchSession(
  idleProfiles,
  runMode = 'parallel',
  limitUploads = false,
  uploadLimitCount = 0,
  options = {},
) {
  const sessionId =
    options.sessionId ||
    'batch_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const title = options.title || `Chạy tự động ${idleProfiles.length} profile`;
  const assignedVideosMap = options.assignedVideosMap || null;
  const overrideFolder = options.overrideFolder || null;

  const session = {
    id: sessionId,
    title,
    totalProfiles: idleProfiles.length,
    runMode,
    limitUploads: !!limitUploads,
    uploadLimitCount: Number(uploadLimitCount) || 0,
    round: 1,
    status: 'running_round1',
    round1: {
      total: idleProfiles.length,
      completed: [],
      failed: [],
    },
    retry: {
      total: 0,
      completed: [],
      failed: [],
    },
    summary: null,
    message: `Đang chạy Lượt 1 cho ${idleProfiles.length} profile (${runMode === 'sequential' ? 'tuần tự' : 'cùng lúc'})`,
  };
  setBatchSession(session);

  console.log(
    `[BatchSession ${sessionId}] Starting Round 1: "${title}" with ${idleProfiles.length} profiles...`,
  );

  const runBatchQueue = async (profilesToRun, onProfileDone) => {
    const runOne = async (profile) => {
      if (runningProfiles.has(profile.id)) return;
      const myVideos = assignedVideosMap
        ? assignedVideosMap[profile.id] || []
        : null;
      if (assignedVideosMap && (!myVideos || myVideos.length === 0)) {
        console.log(
          `[BatchSession] ${profile.name} has no videos assigned. Skipping.`,
        );
        onProfileDone(profile, {
          success: false,
          uploadedCount: 0,
          error: 'Không được chia video nào',
        });
        return;
      }
      const res = await runSingleProfile(
        profile,
        session.limitUploads,
        session.uploadLimitCount,
        false,
        null,
        myVideos,
        overrideFolder,
      );
      onProfileDone(profile, res);
    };

    if (runMode === 'sequential') {
      for (const profile of profilesToRun) {
        await runOne(profile);
      }
    } else {
      const maxConcurrency = Number(getConfig('maxConcurrency', 2));
      const queue = [...profilesToRun];
      const active = [];

      async function processQueue() {
        while (queue.length > 0) {
          if (active.length >= maxConcurrency) {
            await Promise.race(active);
            continue;
          }
          const profile = queue.shift();
          const promise = runOne(profile).finally(() => {
            const idx = active.indexOf(promise);
            if (idx !== -1) active.splice(idx, 1);
          });
          active.push(promise);
        }
        await Promise.all(active);
      }
      await processQueue();
    }
  };

  // Round 1 Execution
  await runBatchQueue(idleProfiles, (profile, res) => {
    if (res && res.success) {
      session.round1.completed.push({
        id: profile.id,
        name: profile.name,
        uploadedCount: res.uploadedCount,
      });
      console.log(
        `[BatchSession] Round 1: ${profile.name} completed (${res.uploadedCount} uploaded).`,
      );
    } else {
      const errReason = res?.error || 'No videos uploaded / error';
      session.round1.failed.push({
        id: profile.id,
        name: profile.name,
        error: errReason,
      });
      console.log(
        `[BatchSession] Round 1: ${profile.name} failed (${errReason}).`,
      );
    }
    session.message = `Lượt 1: ${session.round1.completed.length}/${session.round1.total} hoàn thành${session.round1.failed.length > 0 ? `, ${session.round1.failed.length} lỗi` : ''}`;
    setBatchSession(session);
  });

  console.log(
    `[BatchSession] Round 1 completed. ${session.round1.completed.length} succeeded, ${session.round1.failed.length} failed.`,
  );

  // Round 2 Execution (Auto-Retry for failed profiles)
  if (session.round1.failed.length > 0) {
    const failedIds = new Set(session.round1.failed.map((p) => p.id));
    const profilesToRetry = idleProfiles.filter((p) => failedIds.has(p.id));

    if (profilesToRetry.length > 0) {
      session.status = 'retrying_round2';
      session.round = 2;
      session.retry.total = profilesToRetry.length;
      session.message = `Lượt 1: ${session.round1.completed.length} thành công, ${session.round1.failed.length} lỗi. Đang tự động chạy lại ${profilesToRetry.length} profile lỗi...`;
      setBatchSession(session);

      console.log(
        `[BatchSession] Starting Retry Round for ${profilesToRetry.length} failed profiles...`,
      );

      await runBatchQueue(profilesToRetry, (profile, res) => {
        if (res && res.success) {
          session.retry.completed.push({
            id: profile.id,
            name: profile.name,
            uploadedCount: res.uploadedCount,
          });
          console.log(
            `[BatchSession] Retry: ${profile.name} succeeded on retry (${res.uploadedCount} uploaded).`,
          );
        } else {
          const errReason = res?.error || 'Failed on retry';
          session.retry.failed.push({
            id: profile.id,
            name: profile.name,
            error: errReason,
          });
          console.log(
            `[BatchSession] Retry: ${profile.name} failed again (${errReason}).`,
          );
        }
        session.message = `Đang chạy lại: ${session.retry.completed.length + session.retry.failed.length}/${session.retry.total} (${session.retry.completed.length} thành công, ${session.retry.failed.length} vẫn lỗi)`;
        setBatchSession(session);
      });
    }
  }

  // Finalization
  session.status = 'completed';
  const totalSucceeded =
    session.round1.completed.length + session.retry.completed.length;
  const finalFailed =
    session.retry.total > 0 ? session.retry.failed : session.round1.failed;

  let finalSummaryText = '';
  if (session.round1.failed.length === 0) {
    finalSummaryText = `🎉 Tất cả ${session.totalProfiles} profile đã hoàn thành xuất sắc trong lượt 1!`;
  } else {
    finalSummaryText = `📊 Hoàn tất!\n• Lượt 1: ${session.round1.completed.length}/${session.totalProfiles} thành công, ${session.round1.failed.length} lỗi.\n• Lượt retry: ${session.retry.completed.length}/${session.retry.total} thành công.\n• Tổng kết: ${totalSucceeded}/${session.totalProfiles} thành công, ${finalFailed.length} lỗi.`;
  }

  session.summary = {
    totalProfiles: session.totalProfiles,
    round1Completed: session.round1.completed,
    round1Failed: session.round1.failed,
    retryCompleted: session.retry.completed,
    retryFailed: session.retry.failed,
    totalSucceeded,
    finalFailed,
    finalSummaryText,
  };
  session.message = finalSummaryText;
  setBatchSession(session);

  console.log(`[BatchSession] Execution finished:\n${finalSummaryText}`);
  return session;
}

export async function executeGroupBatchSession(
  group,
  profiles,
  videoFolder,
  runMode = 'parallel',
  limitUploads = false,
  uploadLimitCount = 0,
) {
  if (!videoFolder || !fs.existsSync(videoFolder)) {
    throw new Error(`Thư mục video không tồn tại: ${videoFolder}`);
  }

  const videos = fs
    .readdirSync(videoFolder)
    .filter((file) => {
      if (file.startsWith('.')) return false;
      const ext = path.extname(file).toLowerCase();
      return ext === '.mp4' || ext === '.mov' || ext === '.webm';
    })
    .sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
    );

  if (videos.length === 0) {
    throw new Error(
      `Không tìm thấy video (.mp4, .mov, .webm) nào trong thư mục: ${videoFolder}`,
    );
  }

  const idleProfiles = profiles.filter(
    (p) => !runningProfiles.has(p.id) && !processingProfiles.has(p.id),
  );
  if (idleProfiles.length === 0) {
    throw new Error(
      'Tất cả profile trong nhóm đều đang bận xử lý hoặc đang mở.',
    );
  }

  const distribution = distributeVideosEvenly(videos, idleProfiles.length);
  const assignedVideosMap = {};
  idleProfiles.forEach((p, idx) => {
    assignedVideosMap[p.id] = distribution[idx];
  });

  const options = {
    title: `Nhóm: ${group.name} (${idleProfiles.length} profiles · ${videos.length} videos)`,
    assignedVideosMap,
    overrideFolder: videoFolder,
    groupId: group.id,
  };

  return executeBatchSession(
    idleProfiles,
    runMode,
    limitUploads,
    uploadLimitCount,
    options,
  );
}

export async function runAllParallel(
  profilesToRun,
  limitUploads = false,
  uploadLimitCount = 0,
) {
  return executeBatchSession(
    profilesToRun,
    'parallel',
    limitUploads,
    uploadLimitCount,
  );
}

export async function runAllSequential(
  profilesToRun,
  limitUploads = false,
  uploadLimitCount = 0,
) {
  return executeBatchSession(
    profilesToRun,
    'sequential',
    limitUploads,
    uploadLimitCount,
  );
}
