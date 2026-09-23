import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const DUMMY_DIR = path.join(ROOT_DIR, 'dummy_videos');

if (!fs.existsSync(DUMMY_DIR)) {
  fs.mkdirSync(DUMMY_DIR, { recursive: true });
}

console.log(`Generating dummy TikTok videos in: ${DUMMY_DIR}...`);

const videos = [
  { name: 'sample_vertical_1.mp4', duration: 5, freq: 880, color: 'testsrc' },
  { name: 'sample_vertical_2.mp4', duration: 6, freq: 440, color: 'smptebars' },
];

for (const v of videos) {
  const outPath = path.join(DUMMY_DIR, v.name);
  console.log(`Generating ${v.name} (${v.duration}s)...`);
  const cmd = `ffmpeg -y -f lavfi -i ${v.color}=size=720x1280:rate=30 -f lavfi -i sine=frequency=${v.freq}:duration=${v.duration} -t ${v.duration} -c:v libx264 -pix_fmt yuv420p -c:a aac "${outPath}"`;
  try {
    execSync(cmd, { stdio: 'pipe' });
    console.log(`✓ Created: ${outPath} (${fs.statSync(outPath).size} bytes)`);
  } catch (e) {
    console.error(`Failed to generate ${v.name}:`, e.message);
  }
}

console.log('Dummy video generation complete.');
