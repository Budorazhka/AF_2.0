// node js/flats-3d/building-data.test.cjs
// The 3D selector joins two sources: assets/data/apartments.js (statuses, prices)
// and assets/data/building-3d.json (geometry rebuilt by apartment-3d/building.py).
// If a flat is added, renumbered or the floor plans change, this says so.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..', '..');
const ctx = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(root, 'assets/data/apartments.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/residence-media.js'), 'utf8'), ctx);
const flats = ctx.window.AF_APARTMENTS;
const media = ctx.window.AF_RESIDENCE_MEDIA;
const data = JSON.parse(fs.readFileSync(path.join(root, 'assets/data/building-3d.json'), 'utf8'));

const units = new Map();
for (const level of data.levels) {
  for (const u of level.units) {
    assert.ok(!units.has(u.number), `flat ${u.number} appears twice in the 3D data`);
    units.set(u.number, { ...u, level: level.level });
  }
}

for (const flat of flats) {
  const u = units.get(String(flat.apartmentNumber));
  assert.ok(u, `flat ${flat.apartmentNumber} is on sale but missing from building-3d.json — rerun apartment-3d/building.py`);
  assert.equal(u.level, flat.floor, `flat ${flat.apartmentNumber}: floor in 3D (${u.level}) differs from the chessboard (${flat.floor})`);
  const interior = flat.areaInterior || { 81.8: 70.1, 26.1: 21.6, 48.5: 38.9, 66: 51.7, 40.5: 35.7, 28.3: 26.1, 113.7: 65.2, 107.1: 59.4 }[flat.areaTotal];
  assert.ok(Math.abs(u.area - interior) / interior < 0.035, `flat ${flat.apartmentNumber}: zone ${u.area} m² vs interior ${interior} m²`);
  assert.ok(u.windows.length > 0, `flat ${flat.apartmentNumber}: no glazing found, sun hours would be zero`);
  assert.ok(u.model, `flat ${flat.apartmentNumber}: no apartment model placed, the walk-through button would be missing`);
  const unit = media.unitFor(flat);
  assert.equal(u.model.slug, unit && unit.slug, `flat ${flat.apartmentNumber}: 3D model differs from the one the chessboard shows`);
  assert.ok(fs.existsSync(path.join(root, 'assets/residences', u.model.slug, 'apartment.glb')), `missing model for ${u.model.slug}`);
}
assert.equal(units.size, flats.length, 'the 3D data has flats the chessboard does not know');

for (const level of data.levels) {
  if (level.plan) assert.ok(fs.existsSync(path.join(root, level.plan.split('?')[0])), `missing floor drawing ${level.plan}`);
}
for (const f of ['n', 'e', 's', 'w-low', 'w-high', ...[2, 3, 4, 5, 6, 7].map((n) => 'pano-' + n)]) {
  assert.ok(fs.existsSync(path.join(root, 'assets/residences/views', f + '.webp')), `missing window view ${f}.webp`);
}

console.log(`PASS: ${flats.length} flats matched to the 3D model, all with glazing and a walk-through model`);
