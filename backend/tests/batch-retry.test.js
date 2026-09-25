import assert from 'node:assert/strict';
import test from 'node:test';
import { executeBatchSession } from '../services/batch-runner.js';

test('executeBatchSession: accurately tracks 100% Round 1 success', async () => {
  const mockProfiles = [
    { id: 991, name: 'test_profile_1', is_scheduled: 0 },
    { id: 992, name: 'test_profile_2', is_scheduled: 0 },
  ];

  // assignedVideosMap with empty arrays marks them as already completed
  const session = await executeBatchSession(mockProfiles, 'sequential', false, 0, {
    title: 'Test Batch Complete',
    assignedVideosMap: {
      991: [],
      992: [],
    },
  });

  assert.equal(session.status, 'completed');
  assert.equal(session.totalProfiles, 2);
  assert.ok(session.summary);
  assert.equal(session.round1.completed.length, 2);
  assert.equal(session.round1.failed.length, 0);
  assert.match(session.summary.finalSummaryText, /hoàn thành xuất sắc/);
});

test('executeBatchSession: triggers Round 2 retry and reports failures accurately when videos cannot be processed', async () => {
  const mockProfiles = [
    { id: 993, name: 'test_profile_fail', is_scheduled: 0, video_folder: 'c:\\non_existent_folder_abc123' },
  ];

  const session = await executeBatchSession(mockProfiles, 'sequential', false, 0, {
    title: 'Test Batch Fail',
    overrideFolder: 'c:\\non_existent_folder_abc123',
    assignedVideosMap: {
      993: ['missing_video_1.mp4'],
    },
  });

  assert.equal(session.status, 'completed');
  assert.equal(session.totalProfiles, 1);
  assert.equal(session.round1.failed.length, 1);
  assert.equal(session.retry.total, 1);
  assert.equal(session.retry.failed.length, 1);
  assert.match(session.summary.finalSummaryText, /còn sót video/);
});
