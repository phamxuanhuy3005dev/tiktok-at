import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { randomUUID } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function sanitizeToAscii(str) {
    if (!str) return '';
    let sanitized = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    sanitized = sanitized.replace(/đ/g, 'd').replace(/Đ/g, 'D');
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_]/g, '');
    sanitized = sanitized.trim().replace(/\s+/g, ' ');
    return sanitized;
}

export const safeSpawn = (cmd, args, activeProcesses = [], timeoutMs = 300000) => {
    const child = spawn(cmd, args);
    activeProcesses.push(child);

    let timeout = null;
    if (timeoutMs > 0) {
        timeout = setTimeout(() => {
            console.log(`Process '${cmd} ${args.join(' ')}' timed out after ${timeoutMs}ms. Killing it.`);
            try { child.kill('SIGKILL'); } catch (e) {}
        }, timeoutMs);
    }

    const cleanup = () => {
        if (timeout) clearTimeout(timeout);
        const idx = activeProcesses.indexOf(child);
        if (idx !== -1) activeProcesses.splice(idx, 1);
    };

    child.on('close', cleanup);
    child.on('error', cleanup);
    return child;
};

export async function downloadAndPrepareVideo({ videoUrlOrId, destinationFolder, profileName, activeProcesses = [] }) {
    if (!fs.existsSync(destinationFolder)) {
        fs.mkdirSync(destinationFolder, { recursive: true });
    }

    const cookiesPath = path.join(__dirname, '..', 'cookies.txt');
    const cookieArgs = fs.existsSync(cookiesPath) ? ['--cookies', cookiesPath] : [];

    let targetUrl = videoUrlOrId.startsWith('http')
        ? videoUrlOrId
        : `https://youtube.com/shorts/${videoUrlOrId}`;

    console.log(`[${profileName}] Resolving video title from: ${targetUrl}`);

    let originalTitle = await new Promise((resolve) => {
        const child = safeSpawn('yt-dlp', ['--js-runtimes', `node:${process.execPath}`, '--get-title', '--no-playlist', ...cookieArgs, targetUrl], activeProcesses);
        let titleData = '';
        child.stdout.on('data', (data) => { titleData += data.toString(); });
        child.on('close', (code) => {
            if (code === 0 && titleData.trim()) resolve(titleData.trim());
            else resolve(null);
        });
        child.on('error', () => resolve(null));
    });

    if (!originalTitle && !videoUrlOrId.startsWith('http')) {
        targetUrl = `https://youtube.com/watch?v=${videoUrlOrId}`;
        console.log(`[${profileName}] Short not found. Trying long video format: ${targetUrl}`);

        originalTitle = await new Promise((resolve) => {
            const child = safeSpawn('yt-dlp', ['--js-runtimes', `node:${process.execPath}`, '--get-title', '--no-playlist', ...cookieArgs, targetUrl], activeProcesses);
            let titleData = '';
            child.stdout.on('data', (data) => { titleData += data.toString(); });
            child.on('close', (code) => {
                if (code === 0 && titleData.trim()) resolve(titleData.trim());
                else resolve('video');
            });
            child.on('error', () => resolve('video'));
        });
    }

    console.log(`[${profileName}] Title retrieved: "${originalTitle}"`);
    const cleanTitle = sanitizeToAscii(originalTitle).substring(0, 80);
    const fileNameBase = cleanTitle || 'video';
    const safeFileName = `${fileNameBase}_${Date.now()}_${randomUUID().slice(0, 8)}.mp4`;
    const downloadedFilePath = path.join(destinationFolder, safeFileName);

    console.log(`[${profileName}] Downloading to: ${downloadedFilePath}`);

    const downloadArgs = [
        '--js-runtimes', `node:${process.execPath}`,
        targetUrl,
        '-o', downloadedFilePath,
        '-f', 'bestvideo[height<=1080]+bestaudio/best/best',
        '--merge-output-format', 'mp4',
        '--no-playlist',
        ...cookieArgs
    ];

    await new Promise((resolve, reject) => {
        const child = safeSpawn('yt-dlp', downloadArgs, activeProcesses);
        let stderrData = '';
        child.stdout.on('data', () => {});
        child.stderr.on('data', (data) => { stderrData += data.toString(); });
        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`yt-dlp failed (code ${code}): ${stderrData}`));
        });
        child.on('error', (err) => { child.kill(); reject(err); });
    });

    console.log(`[${profileName}] Download complete.`);

    // Duration verification with ffprobe
    let videoDuration = await new Promise((resolve) => {
        const ffprobe = safeSpawn('ffprobe', [
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            downloadedFilePath
        ], activeProcesses);
        let output = '';
        ffprobe.stdout.on('data', (data) => output += data.toString());
        ffprobe.on('close', () => {
            const dur = parseFloat(output.trim());
            resolve(isNaN(dur) ? 0 : dur);
        });
        ffprobe.on('error', () => resolve(0));
    });

    console.log(`[${profileName}] Duration: ${videoDuration.toFixed(2)}s`);

    // Ensure video is at least 5s
    if (videoDuration > 0 && videoDuration < 5.0) {
        console.log(`[${profileName}] Video is under 5s (${videoDuration.toFixed(2)}s). Extending with speed factor 0.9...`);
        const speedFactor = 0.9;
        const slowedFilePath = downloadedFilePath.replace('.mp4', '_slowed.mp4');
        const slowedDuration = videoDuration / speedFactor;

        let extended = false;
        try {
            await new Promise((resolve, reject) => {
                const ffmpeg = safeSpawn('ffmpeg', [
                    '-y',
                    '-i', downloadedFilePath,
                    '-filter_complex', `[0:v]setpts=${1 / speedFactor}*PTS[v];[0:a]atempo=${speedFactor}[a]`,
                    '-map', '[v]',
                    '-map', '[a]',
                    '-c:v', 'libx264',
                    '-c:a', 'aac',
                    slowedFilePath
                ], activeProcesses);
                ffmpeg.on('close', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg slowed failed code ${code}`)));
                ffmpeg.on('error', reject);
            });

            if (slowedDuration >= 5.0 && fs.existsSync(slowedFilePath)) {
                fs.unlinkSync(downloadedFilePath);
                fs.renameSync(slowedFilePath, downloadedFilePath);
                extended = true;
            }
        } catch (err) {
            console.error(`[${profileName}] Slowdown failed:`, err.message);
            if (fs.existsSync(slowedFilePath)) fs.unlinkSync(slowedFilePath);
        }

        if (!extended) {
            // Loop padding fallback
            const neededDuration = 5.0 - videoDuration;
            const slicePath = downloadedFilePath.replace('.mp4', '_slice.mp4');
            const concatFilePath = downloadedFilePath.replace('.mp4', '_concat.mp4');
            const listFilePath = downloadedFilePath.replace('.mp4', '_concat_list.txt');
            try {
                await new Promise((resolve, reject) => {
                    const ffmpeg = safeSpawn('ffmpeg', [
                        '-y', '-ss', '0', '-i', downloadedFilePath, '-t', String(neededDuration),
                        '-c', 'copy', slicePath
                    ], activeProcesses);
                    ffmpeg.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Slice failed code ${code}`)));
                    ffmpeg.on('error', reject);
                });

                fs.writeFileSync(listFilePath, `file '${downloadedFilePath.replace(/'/g, "'\\''")}'\nfile '${slicePath.replace(/'/g, "'\\''")}'\n`);

                await new Promise((resolve, reject) => {
                    const ffmpeg = safeSpawn('ffmpeg', [
                        '-y', '-f', 'concat', '-safe', '0', '-i', listFilePath,
                        '-c', 'copy', concatFilePath
                    ], activeProcesses);
                    ffmpeg.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Concat failed code ${code}`)));
                    ffmpeg.on('error', reject);
                });

                if (fs.existsSync(concatFilePath)) {
                    fs.unlinkSync(downloadedFilePath);
                    fs.renameSync(concatFilePath, downloadedFilePath);
                }
            } catch (err) {
                console.error(`[${profileName}] Loop padding failed:`, err.message);
                if (fs.existsSync(concatFilePath)) fs.unlinkSync(concatFilePath);
            } finally {
                if (fs.existsSync(slicePath)) fs.unlinkSync(slicePath);
                if (fs.existsSync(listFilePath)) fs.unlinkSync(listFilePath);
            }
        }
    }

    return downloadedFilePath;
}
