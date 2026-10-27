/* The milestone rules in js/milestones.js (a browser script), loaded
   as-is, so the front end and these tests share one copy. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const source = fs.readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../js/milestones.js'), 'utf8');
const milestones = vm.runInNewContext(`${source}; milestones`);
// Arrays made inside the vm context have a different prototype; compare plain copies
const plain = (value) => JSON.parse(JSON.stringify(value));

test('keeps the four thresholds', () => {
  assert.deepEqual(
    plain(milestones.all.map((m) => [m.count, m.name])),
    [[1, 'First find'], [3, 'On the scent'], [5, 'Deep dive'], [10, 'Down the rabbit hole']]);
});

test('progress: current, next, and how many to go', () => {
  const none = milestones.progress(0);
  assert.equal(none.current, null);
  assert.equal(none.next.name, 'First find');
  assert.equal(none.toNext, 1);

  const four = milestones.progress(4);
  assert.equal(four.current.name, 'On the scent');
  assert.equal(four.next.name, 'Deep dive');
  assert.equal(four.toNext, 1);
  assert.equal(four.fraction, 0.5);

  const all = milestones.progress(12);
  assert.equal(all.current.name, 'Down the rabbit hole');
  assert.equal(all.next, null);
  assert.equal(all.fraction, 1);
});

test('reachedBetween: only when a threshold is crossed', () => {
  assert.equal(milestones.reachedBetween(0, 1).name, 'First find');
  assert.equal(milestones.reachedBetween(4, 5).name, 'Deep dive');
  assert.equal(milestones.reachedBetween(5, 6), null);
  assert.equal(milestones.reachedBetween(0, 5).name, 'Deep dive'); // biggest one crossed
});

test('tally: trails per milestone and the total', () => {
  // The four sample trails have 5, 3, 4, and 2 discoveries
  const { earned, total } = milestones.tally([5, 3, 4, 2]);
  assert.deepEqual(plain(earned.map((e) => e.trails)), [4, 3, 1, 0]);
  assert.equal(total, 8);
  assert.equal(milestones.tally([]).total, 0);
});
