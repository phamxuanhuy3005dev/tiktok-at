import test from 'node:test';
import assert from 'node:assert/strict';
import { distributeVideosEvenly } from '../services/batch-runner.js';

test('distributeVideosEvenly: distributes 10 videos evenly across 3 profiles (4, 3, 3)', () => {
    const videos = ['v01.mp4', 'v02.mp4', 'v03.mp4', 'v04.mp4', 'v05.mp4', 'v06.mp4', 'v07.mp4', 'v08.mp4', 'v09.mp4', 'v10.mp4'];
    const result = distributeVideosEvenly(videos, 3);

    assert.equal(result.length, 3);
    assert.deepEqual(result[0], ['v01.mp4', 'v02.mp4', 'v03.mp4', 'v04.mp4']);
    assert.deepEqual(result[1], ['v05.mp4', 'v06.mp4', 'v07.mp4']);
    assert.deepEqual(result[2], ['v08.mp4', 'v09.mp4', 'v10.mp4']);

    // Ensure all videos accounted for with no duplicates
    const allAssigned = result.flat();
    assert.equal(allAssigned.length, videos.length);
    assert.deepEqual(allAssigned, videos);
});

test('distributeVideosEvenly: distributes 12 videos perfectly across 3 profiles (4, 4, 4)', () => {
    const videos = Array.from({ length: 12 }, (_, i) => `v${i + 1}.mp4`);
    const result = distributeVideosEvenly(videos, 3);

    assert.equal(result.length, 3);
    assert.equal(result[0].length, 4);
    assert.equal(result[1].length, 4);
    assert.equal(result[2].length, 4);
    assert.deepEqual(result.flat(), videos);
});

test('distributeVideosEvenly: handles fewer videos than profiles (e.g. 2 videos across 4 profiles)', () => {
    const videos = ['v1.mp4', 'v2.mp4'];
    const result = distributeVideosEvenly(videos, 4);

    assert.equal(result.length, 4);
    assert.deepEqual(result[0], ['v1.mp4']);
    assert.deepEqual(result[1], ['v2.mp4']);
    assert.deepEqual(result[2], []);
    assert.deepEqual(result[3], []);
});

test('distributeVideosEvenly: handles empty or invalid inputs gracefully', () => {
    assert.deepEqual(distributeVideosEvenly([], 3), [[], [], []]);
    assert.deepEqual(distributeVideosEvenly(['v1.mp4'], 0), []);
    assert.deepEqual(distributeVideosEvenly(null, 2), [[], []]);
});
