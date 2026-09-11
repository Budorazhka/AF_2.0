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

// no structure may stand in a hob or sink: that is what put a column through the 66 cooktop
const box = o => {
  const at = i => o.v.map(v => v[i]);
  return [Math.min(...at(0)), Math.min(...at(1)), Math.min(...at(2)),
          Math.max(...at(0)), Math.max(...at(1)), Math.max(...at(2))];
};
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
