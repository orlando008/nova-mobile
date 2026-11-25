import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createRound, mapFrame, MODES, panFrame, ROUND_LENGTH, worldOffset, zoomFrame } from '../carts/global-citizen/code.js';
import { COUNTRIES } from '../carts/global-citizen/assets/countries.mjs';

test('all three quizzes produce deterministic ten-question rounds for every region', () => {
  const regions = new Set(COUNTRIES.map(country => country.region));
  assert.equal(regions.size, 6);
  for (const region of ['World', ...regions]) {
    for (const mode of Object.keys(MODES)) {
      for (const seed of [0, 42, 319, 0xffffffff]) {
        const settings = { mode, region, seed };
        const questions = createRound(COUNTRIES, settings);
        assert.deepEqual(questions, createRound(COUNTRIES, settings));
        assert.equal(questions.length, ROUND_LENGTH);
        assert.equal(new Set(questions.map(question => question.country.id)).size, ROUND_LENGTH);
        for (const { country, prompt, answer, options } of questions) {
          if (region !== 'World') assert.equal(country.region, region);
          if (mode === 'countries') {
            assert.equal(prompt, `Tap ${country.name}`);
            continue;
          }
          assert.equal(answer, mode === 'flags' ? country.name : country.capital);
          assert.equal(new Set(options).size, 3);
          assert.ok(options.includes(answer));
        }
      }
    }
  }
  assert.notDeepEqual(
    createRound(COUNTRIES, { mode: 'countries', region: 'World', seed: 1 }),
    createRound(COUNTRIES, { mode: 'countries', region: 'World', seed: 2 }),
  );
});

test('every quiz country has a uniquely indexed flag and a reachable map feature', () => {
  const outlines = JSON.parse(readFileSync(new URL('../carts/global-citizen/assets/map.json', import.meta.url), 'utf8'));
  const mapped = new Set(outlines.map(([id]) => id));
  assert.equal(mapped.size, outlines.length);
  assert.equal(COUNTRIES.length, 195);
  assert.equal(new Set(COUNTRIES.map(country => country.id)).size, 195);
  for (const [index, country] of COUNTRIES.entries()) {
    assert.equal(country.flag, index);
    assert.ok(mapped.has(country.id));
    assert.ok(country.capital);
    const frame = mapFrame(country.center);
    const [x, y] = country.center;
    const wrappedX = x + worldOffset(x, frame);
    assert.ok(wrappedX >= frame.x && wrappedX <= frame.x + frame.width, country.name);
    assert.ok(y >= frame.y && y <= frame.y + frame.height, country.name);
  }
});

test('the map wraps at the antimeridian and clamps at the poles and zoom limits', () => {
  const frame = mapFrame([359, 70]);
  assert.equal(worldOffset(4, frame), 360);
  assert.equal(worldOffset(359, panFrame(frame, 30, -300)), -360);
  assert.equal(panFrame(frame, 30, -300).y, 0);
  assert.equal(panFrame(frame, -30, 300).y, 180 - frame.height);
  assert.equal(zoomFrame(frame, .0001).width, 6);
  assert.equal(zoomFrame(frame, 100).width, 180);
  assert.equal(zoomFrame(frame, 100).height, 144);
});
