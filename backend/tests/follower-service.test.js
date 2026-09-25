import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchProfilesFollowers } from '../services/follower-service.js';

test('fetchProfilesFollowers: returns empty array for empty or non-array inputs', async () => {
  const r1 = await fetchProfilesFollowers([]);
  assert.deepEqual(r1, []);

  const r2 = await fetchProfilesFollowers(null);
  assert.deepEqual(r2, []);

  const r3 = await fetchProfilesFollowers(undefined);
  assert.deepEqual(r3, []);
});

test('fetchProfilesFollowers: gracefully handles invalid/blank usernames without crashing', async () => {
  const r = await fetchProfilesFollowers([{ id: 'test_1', name: '' }]);
  assert.deepEqual(r, []);
});
