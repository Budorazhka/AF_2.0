import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PARKING, SETBACK_ROOFS, parkingAccess } from './exterior-layout.js';

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

console.log('PASS: setback roofs cover the end bays, both parking approaches reach their entries');
