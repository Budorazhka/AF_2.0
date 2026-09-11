const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(__dirname + '/viewer-template.html', 'utf8');
const source = html.slice(html.indexOf('function buffer('), html.indexOf('const data=scene.map'));
const uploads = [];
const gl = { createBuffer: () => ({}), bindBuffer() {}, bufferData(_, data) { uploads.push([...data]); } };
const context = vm.createContext({gl, Float32Array});
vm.runInContext(source, context);
const scene = JSON.parse(fs.readFileSync(__dirname + '/scene.json', 'utf8'));
function result(name, cut) {
  uploads.length = 0;
  const object = scene.find(o => o.name === name);
  const original = JSON.stringify(object);
  const mesh = context.buffer(object, cut);
  assert.equal(JSON.stringify(object), original, 'Viewer must not change source geometry');
  const heights = uploads[0].filter((_, i) => i % 3 === 1);
  return {mesh, heights};
}
assert.ok(Math.max(...result('South bathroom exterior', true).heights) <= .36, 'Cut wall must be well below the cooktop');
assert.ok(Math.max(...result('Kitchen tall unit', true).heights) <= .86, 'Tall kitchen unit must not obscure cooktop in cutaway');
assert.equal(result('Entrance lintel', true).mesh.count, 0, 'Overhead lintel must disappear, not collapse onto cut plane');
assert.ok(Math.max(...result('Cooktop', true).heights) > .92, 'Cooktop must stay at original height');
assert.ok(Math.max(...result('South bathroom exterior', false).heights) > 2.79, 'Full-height mode must preserve walls');
assert.ok(Math.max(...result('Kitchen tall unit', false).heights) > 2.14, 'Full-height mode must preserve tall kitchen unit');
console.log('PASS: kitchen visibility, lintel removal and full-height geometry');
