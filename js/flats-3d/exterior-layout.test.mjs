import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PARKING, SETBACK_ROOFS, parkingAccess, replacesWalkFrontage } from './exterior-layout.js';

const data = JSON.parse(fs.readFileSync(new URL('../../assets/data/building-3d.json', import.meta.url)));
for (const [level, x, z] of [[6, 30.10, 9.70], [7, 26.20, 9.70]]) {
  const below = data.levels.find((floor) => floor.level === level - 1);
  assert.ok(below.slab.some(([x0, z0, x1, z1]) => x0 <= x && x <= x1 && z0 <= z && z <= z1));
  assert.ok(SETBACK_ROOFS[level].some(([x0, z0, x1, z1]) => x0 <= x && x <= x1 && z0 <= z && z <= z1),
    `Level ${level} must cover the end glazing of level ${level - 1}`);
}

const [upper, lower] = parkingAccess(0, -3.7);
const [, z0, x1] = PARKING.bounds;
assert.deepEqual(upper.points[0], [PARKING.upper.x, 0, z0 + PARKING.join]);
assert.deepEqual(lower.points[0], [x1 - PARKING.join, -3.7, PARKING.lower.z]);
assert.deepEqual(upper.points.at(-1), lower.points.at(-1));
assert.ok(PARKING.lower.halfWidth * 2 >= 4, 'The lower garage opening must fit a vehicle');
assert.ok(3.7 - PARKING.deckThickness > 2.3, 'The lower garage needs clear headroom');
for (const { points } of [upper, lower]) {
  for (let i = 1; i < points.length; i++) {
    const [x0, y0, z0] = points[i - 1], [x1, y1, z1] = points[i];
    assert.ok(Math.abs(y1 - y0) / Math.hypot(x1 - x0, z1 - z0) < 0.15, 'Parking approach grade is too steep');
  }
}

const fifth = data.levels.find(floor => floor.level === 5);
const balcony504 = fifth.units.find(unit => unit.number === '504').outdoor;
const balcony505 = fifth.units.find(unit => unit.number === '505').outdoor;
const panel505 = fifth.facade.find(([ax, az]) => ax === 21.47 && az === 19.73);
assert.ok(panel505, 'The drawn frontage for balcony 505 must be present');
const [ax, az, bx, bz] = panel505;
for (const edge of [[ax, az, bx, bz], [bx, bz, ax, az]]) {
  assert.ok(replacesWalkFrontage({ edge }, balcony505, []), 'Remove the entire duplicate pane in 505');
  assert.equal(replacesWalkFrontage({ edge }, balcony504, []), false, 'Keep the neighbouring balcony in 504');
}

const wedge = { edge: [26.2, 19.78, 31.32, 19.48], wedge: true };
const terraceCutout = [[1, 0, -25.87], [-1, 0, 31.57], [0, 1, -18.22], [0, -1, 19.95]];
assert.ok(replacesWalkFrontage(wedge, balcony504, [terraceCutout]), 'Remove the wedge across the terrace');
assert.equal(replacesWalkFrontage(wedge, balcony505, []), false, 'Keep wedges outside the active floor pieces');
