import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STAGING_LAYOUTS, PATIO_FOOTPRINTS } from './walk-staging-layouts.js';

const root = new URL('../../', import.meta.url);
const layoutData = JSON.parse(readFileSync(new URL('assets/data/building-3d.json', root)));
const units = layoutData.levels.flatMap(({ units = [] }) => units);
assert.deepEqual(new Set(units.map(({ model }) => model.slug)), new Set(Object.keys(STAGING_LAYOUTS)));

function modelOf(slug) {
  const bytes = readFileSync(new URL(`assets/residences/${slug}/apartment.glb`, root));
  const jsonEnd = 20 + bytes.readUInt32LE(12);
  const model = JSON.parse(bytes.toString('utf8', 20, jsonEnd));
  return model.nodes.map((node) => {
    const accessor = model.accessors[model.meshes[node.mesh].primitives[0].attributes.POSITION];
    const { byteOffset } = model.bufferViews[accessor.bufferView];
    return { name: node.name, group: node.extras.group, ...accessor, byteOffset: jsonEnd + 8 + byteOffset, bytes };
  });
}

function overlaps([x0, z0, x1, z1], { min, max }) {
  return Math.min(x1, max[0]) - Math.max(x0, min[0]) > 0.012 && Math.min(z1, max[2]) - Math.max(z0, min[2]) > 0.012;
}

function covers(x, z, triangle) {
  const signs = triangle.map(([xa, za], i) => {
    const [xb, zb] = triangle[(i + 1) % 3];
    return (xb - xa) * (z - za) - (zb - za) * (x - xa);
  });
  return signs.every((v) => v > -0.00001) || signs.every((v) => v < 0.00001);
}

function deckFaces(node) {
  const faces = [];
  for (let i = 0; i < node.count; i += 3) {
    const points = [0, 1, 2].map((n) => {
      const p = node.byteOffset + (i + n) * 12;
      return [node.bytes.readFloatLE(p), node.bytes.readFloatLE(p + 4), node.bytes.readFloatLE(p + 8)];
    });
    if (points.every(([, y]) => Math.abs(y - node.max[1]) < 0.0001)) faces.push(points.map(([x, , z]) => [x, z]));
  }
  return faces;
}

for (const [slug, plan] of Object.entries(STAGING_LAYOUTS)) {
  const model = modelOf(slug);
  for (const choice of [plan.lamp, plan.tray, plan.throw]) {
    if (!choice.on) continue;
    const mesh = model.filter(({ name }) => name === choice.on)[choice.index ?? 0];
    assert.ok(mesh, `${slug} missing ${choice.on}`);
    if (choice.at) {
      const [x, z] = choice.at;
      assert.ok(overlaps([x - 0.045, z - 0.045, x + 0.045, z + 0.045], mesh), `${slug} prop misses ${choice.on}`);
    }
  }
  const deck = model.filter(({ group, max }) => group === 'floor' && max[1] < -0.01).flatMap(deckFaces);
  const furniture = model.filter(({ group, name }) => group === 'furniture' && name !== 'Terrace lounger');
  const exteriorDoors = model.filter(({ group, name }) => group === 'walls' && /(?:balcony|terrace).*lintel/i.test(name));
  for (const [kind, [x, z]] of Object.entries(plan.patio)) {
    const [rx, rz] = PATIO_FOOTPRINTS[kind];
    const shape = kind === 'lounger' ? [[-1, -1], [1, -1], [-1, 1], [1, 1]] : [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dx, dz] of shape) {
      assert.ok(deck.some((face) => covers(x + dx * rx, z + dz * rz, face)), `${slug} ${kind} extends beyond the deck`);
    }
    const footprint = [x - rx, z - rz, x + rx, z + rz];
    assert.ok(!furniture.some((node) => overlaps(footprint, node)), `${slug} ${kind} intersects existing furniture`);
    for (const { min, max } of exteriorDoors) {
      const away = 0.46;
      assert.ok(x + rx < min[0] - away || x - rx > max[0] + away || z + rz < min[2] - away || z - rz > max[2] + away,
        `${slug} ${kind} is too close to an exterior doorway`);
    }
  }
}

console.log(`PASS: staged furniture fits all ${Object.keys(STAGING_LAYOUTS).length} layouts used by ${units.length} apartments`);
