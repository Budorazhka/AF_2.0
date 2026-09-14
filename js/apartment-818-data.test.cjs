const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const context = vm.createContext({window: {}});
vm.runInContext(fs.readFileSync(__dirname + '/../assets/data/apartments.js', 'utf8'), context);
const units = context.window.AF_APARTMENTS.filter(apartment => apartment.areaTotal === 81.8);

assert.equal(units.length, 6, 'expected the 81.8 m² plan on floors 2–7');
for (const unit of units) {
  assert.equal(unit.rooms, '2+1', `${unit.id}: room type`);
  assert.equal(unit.areaInterior, 70.1, `${unit.id}: interior area`);
  assert.equal(unit.terraceArea, 10.7, `${unit.id}: terrace area`);
  assert.equal(unit.balconyArea, 1, `${unit.id}: balcony area`);
  assert.equal(unit.bathroomCount, 1, `${unit.id}: bathroom count`);
  assert.equal(unit.areaLiving, undefined, `${unit.id}: remove unverified living area`);
  assert.equal(unit.areaKitchen, undefined, `${unit.id}: remove unverified kitchen area`);
}

console.log('PASS: 81.8 m² cards match the IV-floor plan');
