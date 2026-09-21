import fs from 'fs';
import path from 'path';
import { db, getConfig, UPLOADS_DIR } from '../db.js';
import { uploadVideo } from './tiktok-automation.js';
import {
    runningProfiles,
    processingProfiles,
    setBatchSession
} from './tracker.js';

export async function runSingleProfile(profile, limitUploads = false, uploadLimitCount = 0, forceUploadAll = false, specificFile = null) {
    if (runningProfiles.has(profile.id)) {
        return { success: false, uploadedCount: 0, error: 'Already running', profileId: profile.id, profileName: profile.name };
    }
    runningProfiles.add(profile.id);

    console.log(`[${profile.name}] Starting automation...`);
    db.prepare('UPDATE profiles SET status = ?, last_run = ? WHERE id = ?').run('uploading', new Date().toISOString(), profile.id);

    let uploadedCount = 0;
    try {
        const videoFolder = profile.video_folder || getConfig('videoFolder', UPLOADS_DIR);
        let videos = [];
        try {
            if (specificFile) {
                if (fs.existsSync(specificFile)) {
                    videos = [path.basename(specificFile)];
                    console.log(`[${profile.name}] Single-file mode: uploading ${specificFile}`);
                } else {
                    console.error(`[${profile.name}] Specific file not found: ${specificFile}`);
                }
            } else {
                if (!fs.existsSync(videoFolder)) {
                    console.error(`[${profile.name}] Video folder does not exist: ${videoFolder}`);
                    db.prepare('UPDATE profiles SET status = ? WHERE id = ?').run('error', profile.id);
                    return { success: false, uploadedCount: 0, error: 'Video folder does not exist', profileId: profile.id, profileName: profile.name };
                }
                videos = fs.readdirSync(videoFolder).filter(file => {
                    const ext = path.extname(file).toLowerCase();
                    return ext === '.mp4' || ext === '.mov' || ext === '.webm';
                });
                console.log(`[${profile.name}] Found ${videos.length} videos in ${videoFolder}`);
            }
        } catch (e) {
            console.error(`[${profile.name}] Folder error:`, e.message);
        }

        const actualFolder = specificFile ? path.dirname(specificFile) : videoFolder;
        uploadedCount = await uploadVideo(profile, actualFolder, videos, limitUploads, uploadLimitCount, forceUploadAll);

        if (uploadedCount > 0) {
            db.prepare('UPDATE profiles SET status = ? WHERE id = ?').run('success', profile.id);
            return { success: true, uploadedCount, profileId: profile.id, profileName: profile.name };
        } else if (videos.length === 0) {
            db.prepare('UPDATE profiles SET status = ? WHERE id = ?').run('idle', profile.id);
            return { success: false, uploadedCount: 0, error: 'No videos in folder', profileId: profile.id, profileName: profile.name };
        } else {
            db.prepare('UPDATE profiles SET status = ? WHERE id = ?').run('no_videos', profile.id);
            return { success: false, uploadedCount: 0, error: 'No videos uploaded', profileId: profile.id, profileName: profile.name };
        }
    } catch (error) {
        console.error(`[${profile.name}] Automation error:`, error);
        db.prepare('UPDATE profiles SET status = ? WHERE id = ?').run('error', profile.id);
        return { success: false, uploadedCount: 0, error: error.message || 'Automation error', profileId: profile.id, profileName: profile.name };
    } finally {
        runningProfiles.delete(profile.id);
        setTimeout(() => {
            if (!runningProfiles.has(profile.id)) {
                db.prepare('UPDATE profiles SET status = ? WHERE id = ?').run('idle', profile.id);
            }
        }, 10000);
    }
}

export async function executeBatchSession(idleProfiles, runMode, limitUploads = false, uploadLimitCount = 0) {
    const session = {
        id: Date.now(),
        totalProfiles: idleProfiles.length,
        runMode,
        limitUploads: !!limitUploads,
        uploadLimitCount: Number(uploadLimitCount) || 0,
        round: 1,
        status: 'running_round1',
        round1: {
            total: idleProfiles.length,
            completed: [],
            failed: []
        },
        retry: {
            total: 0,
            completed: [],
            failed: []
        },
        summary: null,
        message: `Đang chạy Lượt 1 cho ${idleProfiles.length} profile (${runMode === 'sequential' ? 'tuần tự' : 'cùng lúc'})`
    };
    setBatchSession(session);

    console.log(`[BatchSession] Starting Round 1 with ${idleProfiles.length} profiles...`);

    const runBatchQueue = async (profilesToRun, onProfileDone) => {
        if (runMode === 'sequential') {
            for (const profile of profilesToRun) {
                if (runningProfiles.has(profile.id)) continue;
                const res = await runSingleProfile(profile, session.limitUploads, session.uploadLimitCount);
                onProfileDone(profile, res);
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
                    const promise = runSingleProfile(profile, session.limitUploads, session.uploadLimitCount)
                        .then((res) => {
                            onProfileDone(profile, res);
                        })
                        .finally(() => {
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
            session.round1.completed.push({ id: profile.id, name: profile.name, uploadedCount: res.uploadedCount });
            console.log(`[BatchSession] Round 1: ${profile.name} completed (${res.uploadedCount} uploaded).`);
        } else {
            const errReason = res?.error || 'No videos uploaded / error';
            session.round1.failed.push({ id: profile.id, name: profile.name, error: errReason });
            console.log(`[BatchSession] Round 1: ${profile.name} failed (${errReason}).`);
        }
        session.message = `Lượt 1: ${session.round1.completed.length}/${session.round1.total} hoàn thành, ${session.round1.failed.length} lỗi`;
    });

    console.log(`[BatchSession] Round 1 completed. ${session.round1.completed.length} succeeded, ${session.round1.failed.length} failed.`);

    // Round 2 Execution (Auto-Retry for failed profiles)
    if (session.round1.failed.length > 0) {
        const failedIds = new Set(session.round1.failed.map((p) => p.id));
        const profilesToRetry = idleProfiles.filter((p) => failedIds.has(p.id));

        if (profilesToRetry.length > 0) {
            session.status = 'retrying_round2';
            session.round = 2;
            session.retry.total = profilesToRetry.length;
            session.message = `Lượt 1 hoàn thành (${session.round1.completed.length} thành công, ${session.round1.failed.length} lỗi). Đang chạy lại ${profilesToRetry.length} profile lỗi...`;

            console.log(`[BatchSession] Starting Retry Round for ${profilesToRetry.length} failed profiles...`);

            await runBatchQueue(profilesToRetry, (profile, res) => {
                if (res && res.success) {
                    session.retry.completed.push({ id: profile.id, name: profile.name, uploadedCount: res.uploadedCount });
                    console.log(`[BatchSession] Retry: ${profile.name} succeeded on retry (${res.uploadedCount} uploaded).`);
                } else {
                    const errReason = res?.error || 'Failed on retry';
                    session.retry.failed.push({ id: profile.id, name: profile.name, error: errReason });
                    console.log(`[BatchSession] Retry: ${profile.name} failed again (${errReason}).`);
                }
                session.message = `Đang chạy lại: ${session.retry.completed.length + session.retry.failed.length}/${session.retry.total} (${session.retry.completed.length} thành công, ${session.retry.failed.length} vẫn lỗi)`;
            });
        }
    }

    // Finalization
    session.status = 'completed';
    const totalSucceeded = session.round1.completed.length + session.retry.completed.length;
    const finalFailed = session.retry.total > 0 ? session.retry.failed : session.round1.failed;

    let finalSummaryText = '';
    if (session.round1.failed.length === 0) {
        finalSummaryText = `🎉 Tất cả ${session.totalProfiles} profile đã hoàn thành xuất sắc trong lượt 1!`;
    } else {
        finalSummaryText = `📊 Hoàn tất batch upload!\n• Lượt 1: ${session.round1.completed.length}/${session.totalProfiles} thành công, ${session.round1.failed.length} lỗi.\n• Lượt retry: ${session.retry.completed.length}/${session.retry.total} thành công.\n• Tổng kết: ${totalSucceeded}/${session.totalProfiles} thành công, ${finalFailed.length} lỗi.`;
    }

    session.summary = {
        totalProfiles: session.totalProfiles,
        round1Completed: session.round1.completed,
        round1Failed: session.round1.failed,
        retryCompleted: session.retry.completed,
        retryFailed: session.retry.failed,
        totalSucceeded,
        finalFailed,
        finalSummaryText
    };
    session.message = finalSummaryText;

    console.log(`[BatchSession] Execution finished:\n${finalSummaryText}`);
}

export async function runAllParallel(profilesToRun, limitUploads = false, uploadLimitCount = 0) {
    return executeBatchSession(profilesToRun, 'parallel', limitUploads, uploadLimitCount);
}

export async function runAllSequential(profilesToRun, limitUploads = false, uploadLimitCount = 0) {
    return executeBatchSession(profilesToRun, 'sequential', limitUploads, uploadLimitCount);
}

