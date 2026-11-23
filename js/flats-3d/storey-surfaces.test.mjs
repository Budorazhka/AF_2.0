import assert from 'node:assert/strict';
import { storeyQuads, subtractSlabOpenings } from './storey-surfaces.js';

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

// The stair opening must remove both surfaces, while leaving the landing.
const slab = [[0, 0, 4, 3], [2, 0, 5, 3]];
const cut = subtractSlabOpenings(slab, [[1, 0.5, 3, 2.5]]);
const recess = storeyQuads(cut, 0, 0.3);
for (const height of [0, 0.3]) {
  const faces = recess.filter(quad => quad.every(vertex => vertex[1] === height));
  assert.equal(faces.reduce((sum, quad) => {
    const xs = quad.map(v => v[0]), zs = quad.map(v => v[2]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
    assert.ok(x1 <= 1 || x0 >= 3 || z1 <= 0.5 || z0 >= 2.5);
    return sum + (x1 - x0) * (z1 - z0);
  }, 0), 11);
}
