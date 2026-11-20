import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeBricks } from '../carts/bubble-mania/code.js';
import { challengeUrl, readChallenge } from '../play/bubble-mania/challenge.mjs';

const page = 'https://example.com/nova-mobile/pr/12/play/bubble-mania/';

test('a shared result preserves the board seed and the displayed score', () => {
  const seed = 3718015713;
  const url = challengeUrl(page + '?seed=1&score=99#old', seed, 38.274);
  assert.equal(url.href, page + '?seed=3718015713&score=38.3');
  const challenge = readChallenge(url);
  assert.deepEqual(challenge, { seed, target: 38.3 });
  assert.deepEqual(makeBricks(challenge.seed), makeBricks(seed));
});

test('a board-only link has no target and a zero result keeps its target', () => {
  assert.deepEqual(readChallenge(challengeUrl(page, 0)), { seed: 0, target: null });
  assert.deepEqual(readChallenge(challengeUrl(page, 0xffffffff, 0)), { seed: 0xffffffff, target: 0 });
  assert.equal(challengeUrl(page + '?seed=0&score=0.0').href, page);
});

test('incomplete or malformed links never enter a wrong board or display an invalid target', () => {
  for (const query of ['', '?score=25.0', '?seed=-1', '?seed=4294967296', '?seed=1e3', '?seed=']) {
    assert.equal(readChallenge(page + query), null);
  }
  for (const score of ['NaN', '-3.0', '100.1', '12.55', '1e1', '']) {
    assert.deepEqual(readChallenge(page + '?seed=12&score=' + score), { seed: 12, target: null });
  }
});
