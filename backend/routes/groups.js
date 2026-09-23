import express from 'express';
import fs from 'fs';
import path from 'path';
import { db, getConfig, UPLOADS_DIR } from '../db.js';
import {
  listGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupById,
} from '../group-store.js';
import {
  executeGroupBatchSession,
  distributeVideosEvenly,
} from '../services/batch-runner.js';
import { runningProfiles, processingProfiles } from '../services/tracker.js';

const router = express.Router();

router.get('/groups', (req, res) => {
  try {
    const groups = listGroups(db);
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/groups', (req, res) => {
  try {
    const { id, name } = req.body || {};
    const group = createGroup(db, { id, name });
    res.status(201).json(group);
  } catch (err) {
    const status =
      err.status ||
      (err.message === 'Group name already exists' ||
      err.message === 'Group name is required'
        ? 400
        : 500);
    res.status(status).json({ error: err.message });
  }
});

router.patch('/groups/:id', (req, res) => {
  try {
    const { name, video_folder } = req.body || {};
    const group = updateGroup(db, req.params.id, { name, video_folder });
    res.json(group);
  } catch (err) {
    const status =
      err.status ||
      (err.message === 'Group name already exists' ||
      err.message === 'Group name is required'
        ? 400
        : err.message === 'Group not found'
          ? 404
          : 500);
    res.status(status).json({ error: err.message });
  }
});

router.delete('/groups/:id', (req, res) => {
  try {
    deleteGroup(db, req.params.id);
    res.json({ success: true });
  } catch (err) {
    const status =
      err.status || (err.message === 'Group not found' ? 404 : 400);
    res.status(status).json({ error: err.message });
  }
});

// POST /api/groups/:id/preview-distribution — Preview video distribution for group
router.post('/groups/:id/preview-distribution', (req, res) => {
  try {
    const group = getGroupById(db, req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const folder =
      req.body.videoFolder ||
      group.video_folder ||
      getConfig('videoFolder', UPLOADS_DIR);
    if (!folder || !fs.existsSync(folder)) {
      return res.status(400).json({
        error: `Thư mục video không tồn tại: ${folder || '(chưa chọn)'}`,
      });
    }

    const videos = fs
      .readdirSync(folder)
      .filter((file) => {
        if (file.startsWith('.')) return false;
        const ext = path.extname(file).toLowerCase();
        return ext === '.mp4' || ext === '.mov' || ext === '.webm';
      })
      .sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
      );

    const profiles = db
      .prepare(
        'SELECT id, name, status FROM profiles WHERE group_id = ? ORDER BY name ASC',
      )
      .all(group.id);

    if (profiles.length === 0) {
      return res.status(400).json({ error: 'Nhóm này chưa có profile nào.' });
    }

    const distribution = distributeVideosEvenly(videos, profiles.length);
    const preview = profiles.map((p, idx) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      isBusy: runningProfiles.has(p.id) || processingProfiles.has(p.id),
      videos: distribution[idx] || [],
    }));

    res.json({
      group,
      folder,
      totalVideos: videos.length,
      profilesCount: profiles.length,
      preview,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/groups/:id/start-automation — Start group batch automation
router.post('/groups/:id/start-automation', async (req, res) => {
  try {
    const group = getGroupById(db, req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const folder =
      req.body.videoFolder ||
      group.video_folder ||
      getConfig('videoFolder', UPLOADS_DIR);
    if (!folder || !fs.existsSync(folder)) {
      return res.status(400).json({
        error: `Thư mục video không tồn tại: ${folder || '(chưa chọn)'}`,
      });
    }

    // Save folder to group if provided
    if (req.body.videoFolder && req.body.videoFolder !== group.video_folder) {
      updateGroup(db, group.id, { video_folder: req.body.videoFolder });
    }

    const profiles = db
      .prepare('SELECT * FROM profiles WHERE group_id = ? ORDER BY name ASC')
      .all(group.id);
    if (profiles.length === 0) {
      return res.status(400).json({ error: 'Nhóm này chưa có profile nào.' });
    }

    const { runMode, limitUploads, uploadLimitCount } = req.body || {};

    executeGroupBatchSession(
      group,
      profiles,
      folder,
      runMode,
      limitUploads,
      uploadLimitCount,
    ).catch((err) =>
      console.error(`Error in group batch session [${group.name}]:`, err),
    );

    res.json({
      status: 'started',
      groupId: group.id,
      groupName: group.name,
      profilesCount: profiles.length,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
