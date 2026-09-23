import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'better-sqlite3';
import { uploadVideo } from '../services/tiktok-automation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARTIFACTS_DIR =
  process.env.TIKTOK_SCREENSHOT_DIR ||
  path.join(__dirname, '../../debug_screenshots');
if (!fs.existsSync(ARTIFACTS_DIR))
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
process.env.TIKTOK_SCREENSHOT_DIR = ARTIFACTS_DIR;

const db = sqlite3(path.join(__dirname, '../../data/tiktok.db'));
const profile = db
  .prepare('SELECT * FROM profiles WHERE name = ?')
  .get('devyfunkk');

if (!profile) {
  console.error('Profile devyfunkk not found!');
  process.exit(1);
}

console.log('Profile loaded:', {
  name: profile.name,
  set_music: profile.set_music,
  music_search: profile.music_search,
  remove_title: profile.remove_title,
  auto_increment_schedule: profile.auto_increment_schedule,
});

// Setup test video
const testDir = path.join(__dirname, '../../dummy_videos/e2e_run');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

const srcVideo = path.join(
  __dirname,
  '../../dummy_videos/sample_vertical_1.mp4',
);
const testVideoPath = path.join(testDir, 'test_vertical.mp4');
fs.copyFileSync(srcVideo, testVideoPath);
console.log(
  `Copied test video to: ${testVideoPath} (${fs.statSync(testVideoPath).size} bytes)`,
);

const videos = ['test_vertical.mp4'];

console.log('--- STARTING E2E UPLOAD TEST ---');
const startTime = Date.now();

try {
  const uploadedCount = await uploadVideo(
    profile,
    testDir,
    videos,
    false,
    0,
    false,
  );
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`--- E2E TEST FINISHED ---`);
  console.log(`Uploaded count: ${uploadedCount}`);
  console.log(`Duration: ${duration}s`);
} catch (err) {
  console.error('CRITICAL ERROR DURING E2E TEST:', err);
  process.exit(1);
}
