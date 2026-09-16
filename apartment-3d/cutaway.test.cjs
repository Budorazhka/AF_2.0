const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const html = fs.readFileSync(__dirname + '/viewer-template.html', 'utf8');
const source = html.slice(html.indexOf('function buffer('), html.indexOf('const data=scene.map'));
const uploads = [];
const gl = { createBuffer: () => ({}), bindBuffer() {}, bufferData(_, data) { uploads.push([...data]); } };
const context = vm.createContext({gl, Float32Array});
vm.runInContext(source, context);

const built = __dirname + '/units-out';
assert.ok(fs.existsSync(built), 'сначала соберите модели: python build.py');
const load = slug => JSON.parse(fs.readFileSync(`${built}/${slug}/scene.json`, 'utf8'));

function result(scene, name, cut) {
  uploads.length = 0;
  const object = scene.find(o => o.name === name);
  assert.ok(object, `missing object ${name}`);
  const original = JSON.stringify(object);
  const mesh = context.buffer(object, cut);
  assert.equal(JSON.stringify(object), original, 'Viewer must not change source geometry');
  const heights = uploads[0].filter((_, i) => i % 3 === 1);
  return {mesh, heights};
}

// the cutaway must drop walls and tall units low enough to see the worktop
const studio = load('40-5');
assert.ok(Math.max(...result(studio, 'South bathroom exterior', true).heights) <= .40, 'Cut wall must stay below the 0.91 m worktop');
assert.ok(Math.max(...result(studio, 'Kitchen tall unit', true).heights) <= .86, 'Tall kitchen unit must not obscure cooktop in cutaway');
assert.equal(result(studio, 'Entrance lintel', true).mesh.count, 0, 'Overhead lintel must disappear, not collapse onto cut plane');
assert.ok(Math.max(...result(studio, 'Cooktop', true).heights) > .92, 'Cooktop must stay at original height');
assert.ok(Math.max(...result(studio, 'South bathroom exterior', false).heights) > 2.79, 'Full-height mode must preserve walls');
assert.ok(Math.max(...result(studio, 'Kitchen tall unit', false).heights) > 2.14, 'Full-height mode must preserve tall kitchen unit');

// 81.8 m² openings are photo-verified. These guards prevent the old failure where
// the model showed a solid wall or a balcony on the wrong side of the camera.
const large = load('81-8');
const bedroomEntry = large.find(o => o.name === 'Bedroom 1 door lintel');
assert.ok(Math.min(...bedroomEntry.v.map(v => v[2])) >= 2.8,
  '81-8: photo 0077 places the small-balcony bedroom entry at the bathroom-side end');
const span = (object, axis) => {
  const values = object.v.map(vertex => vertex[axis]);
  return Math.max(...values) - Math.min(...values);
};
const bounds = object => [0, 1, 2].flatMap(axis => {
  const values = object.v.map(vertex => vertex[axis]);
  return [Math.min(...values), Math.max(...values)];
});
assert.ok(large.some(o => o.name === 'Bathroom window base'), '81-8: bathroom window missing');
assert.ok(large.some(o => o.name === 'West bedroom window base'), '81-8: small-balcony bedroom window missing');
assert.ok(large.some(o => o.name === 'West bedroom balcony door base'), '81-8: small-balcony bedroom door missing');
assert.ok(span(large.find(o => o.name === 'Bedroom 2 panorama base'), 2) >= 2.7, '81-8: bedroom panorama too narrow');
assert.ok(span(large.find(o => o.name === 'Living south panorama base'), 0) >= 3.9, '81-8: living panorama too narrow');
assert.ok(span(large.find(o => o.name === 'Terrace two-panel slider base'), 2) >= 1.7, '81-8: terrace slider too narrow');
assert.ok(large.some(o => o.name === 'Corner bathtub shell'), '81-8: selected bathroom concept includes a corner bath');
assert.ok(!large.some(o => /^Shower /.test(o.name)), '81-8: shower must not replace the bathtub');
const bathtub = large.find(o => o.name === 'Corner bathtub shell');
const bathtubBounds = bounds(bathtub);
assert.ok(bathtubBounds[4] >= 4.5 && bathtubBounds[5] >= 5.5,
  '81-8: corner bathtub must be against the south kitchen wall, left of the WC');
const balconyDoor = bounds(large.find(o => o.name === 'West bedroom balcony door base'));
const bedroomWindow = bounds(large.find(o => o.name === 'West bedroom window base'));
assert.ok(balconyDoor[5] <= bedroomWindow[4] + .01,
  '81-8: photo 0075 puts balcony door NORTH of the raised window (right when looking west)');
assert.ok(balconyDoor[5] - balconyDoor[4] >= .70, '81-8: balcony doorway must have a usable clear opening');
assert.ok(bedroomWindow[2] >= .90, '81-8: window frame must start on the sill, not at floor level');
const cistern = bounds(large.find(o => o.name === 'WC cistern'));
const bowl = bounds(large.find(o => o.name === 'WC seat'));
assert.ok(cistern[5] >= 5.50 && bowl[5] <= cistern[4],
  '81-8: WC cistern must back onto kitchen wall, bowl must face bathroom walking space');

// no structure may stand in a hob or sink: that is what put a column through the 66 cooktop
const box = o => {
  const at = i => o.v.map(v => v[i]);
  return [Math.min(...at(0)), Math.min(...at(1)), Math.min(...at(2)),
          Math.max(...at(0)), Math.max(...at(1)), Math.max(...at(2))];
};
// 48.5 m² is photo-checked against the actual black-framed openings.  Its two
// balconies are shallow exterior strips, not rooms: never allow furniture to
// migrate outside or block either full-height balcony door again.
const compact = load('48-5');
const westSlab = box(compact.find(o => o.name === 'West balcony slab'));
const eastSlab = box(compact.find(o => o.name === 'East balcony slab'));
assert.ok(westSlab[3] - westSlab[0] <= 1.21, '48-5: west balcony is a shallow 1.2m exterior strip');
assert.ok(eastSlab[3] - eastSlab[0] <= 1.41, '48-5: east balcony is a shallow 1.4m exterior strip');
assert.ok(compact.some(o => o.name === 'West balcony open door'), '48-5: west balcony needs a real door');
assert.ok(compact.some(o => o.name === 'East balcony open door'), '48-5: east balcony needs a real door');
for (const object of compact.filter(o => o.group === 'furniture' && !/open door/i.test(o.name))) {
  const occupied = box(object);
  assert.ok(occupied[0] >= -.20 && occupied[3] <= 7.21,
    `48-5: ${object.name} must stay inside; exterior balconies remain unfurnished`);
}
// Check occupied volumes, not just furniture names: the bedroom entry must join
// the balcony threshold, and the bathroom doorway must join a continuous aisle.
const clearRoutes = [
  ['bedroom south entry approach', [.05, .08, 2.84, 2.85, 2.05, 3.60]],
  ['bedroom west passage to balcony', [.05, .08, .38, .65, 2.05, 3.60]],
  ['small balcony threshold', [-.73, .08, .38, .72, 2.05, 1.00]],
  ['bathroom circulation without invented partitions', [.08, .08, 4.08, 2.85, 2.05, 4.57]],
];
for (const [route, volume] of clearRoutes) {
  for (const object of large.filter(o => ['furniture', 'walls', 'glazing', 'rail'].includes(o.group))) {
    const occupied = box(object);
    const overlaps = [0, 1, 2].map(i => Math.min(volume[i + 3], occupied[i + 3]) - Math.max(volume[i], occupied[i]));
    assert.ok(overlaps.some(value => value <= .005), `81-8: ${object.name} blocks ${route}`);
  }
}
for (const slug of fs.readdirSync(__dirname + '/units-out')) {
  const scene = load(slug);
  const structure = scene.filter(o => o.group === 'walls' || o.group === 'glazing');
  for (const worktop of scene.filter(o => /Cooktop|Burner|Sink|Washbasin/.test(o.name))) {
    const a = box(worktop);
    for (const wall of structure) {
      const b = box(wall);
      const over = [0, 1, 2].map(i => Math.min(a[i + 3], b[i + 3]) - Math.max(a[i], b[i]) - 0.02);
      assert.ok(over.some(v => v <= 0), `${slug}: ${wall.name} stands in ${worktop.name}`);
    }
  }
}

console.log('PASS: kitchen visibility, lintel removal, full-height geometry, no structure in worktops');
