import assert from 'node:assert/strict';
import { storeyQuads } from './storey-surfaces.js';

// The overlap is two square metres. The union has area 10 and perimeter 14.
const quads = storeyQuads([[0, 0, 3, 2], [1, 1, 4, 3], [1, 1, 2, 2]], 0, 1);
const areas = [0, 0, 0];
for (const [a, b, , d] of quads) {
  const u = b.map((q, i) => q - a[i]), v = d.map((q, i) => q - a[i]);
  const normal = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
  areas[normal[1] > 0 ? 0 : normal[1] < 0 ? 1 : 2] += Math.hypot(...normal);
}
assert.deepEqual(areas, [10, 10, 14]);
assert.deepEqual(storeyQuads([], 0, 1), []);
