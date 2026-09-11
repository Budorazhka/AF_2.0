const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

// --- a DOM small enough to exercise mount() without a browser -----------------
const dataKey = k => 'data-' + String(k).replace(/[A-Z]/g, c => '-' + c.toLowerCase());
function element(tag, attrs = {}) {
  const el = {
    tag, attrs, children: [], listeners: {}, hidden: false, tabIndex: 0, textContent: '',
    dataset: new Proxy(attrs, {
      get: (t, k) => t[dataKey(k)],
      set: (t, k, v) => ((t[dataKey(k)] = v), true),
      deleteProperty: (t, k) => (delete t[dataKey(k)], true),
    }),
    getAttribute: k => attrs[k],
    setAttribute: (k, v) => { attrs[k] = String(v); },
    removeAttribute: k => { delete attrs[k]; },
    appendChild(child) { el.children.push(child); return child; },
    addEventListener(type, fn) { (el.listeners[type] ||= []).push(fn); },
    click() { (el.listeners.click || []).forEach(fn => fn.call(el, {})); },
    focus() {},
    get all() { return el.children.flatMap(c => [c, ...c.all]); },
    matches(sel) {
      if (sel.startsWith('#')) return attrs.id === sel.slice(1);
      if (sel.startsWith('[')) return sel.slice(1, -1) in attrs;
      return tag === sel;
    },
    querySelector: sel => el.all.find(c => c.matches(sel)) || null,
    querySelectorAll: sel => el.all.filter(c => c.matches(sel)),
  };
  return el;
}
function parse(html) {
  const root = element('#root');
  const stack = [root];
  const tag = /<(\/?)([a-z0-9]+)((?:\s+[a-z-]+(?:="[^"]*")?)*)\s*\/?>/gi;
  let m;
  while ((m = tag.exec(html))) {
    if (m[1]) { if (stack.length > 1) stack.pop(); continue; }
    const attrs = {};
    for (const a of m[3].matchAll(/([a-z-]+)(?:="([^"]*)")?/gi)) attrs[a[1]] = a[2] === undefined ? '' : a[2];
    const el = element(m[2], attrs);
    stack[stack.length - 1].appendChild(el);
    if (!['img', 'input', 'br'].includes(m[2])) stack.push(el);
  }
  return root.children[0];
}

const ctx = {window: {__BASE_PATH__: '/preview'}, document: {createElement: tag => element(tag)}};
vm.runInNewContext(fs.readFileSync(__dirname + '/../assets/data/apartments.js', 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync(__dirname + '/residence-media.js', 'utf8'), ctx);
const api = ctx.window.AF_RESIDENCE_MEDIA;
const apartments = ctx.window.AF_APARTMENTS;

// every published residence resolves to a 3D model folder
const without = Array.from(apartments.filter(a => !api.hasMedia(a)), a => a.apartmentNumber);
assert.deepEqual(without, [], 'every apartment must map to a model: ' + without);
assert.equal(api.hasMedia({apartmentNumber: '205', planImageUrl: '/another-plan.png'}), false);

// each referenced model is actually built
const slugs = new Set(apartments.map(a => api.unitFor(a).slug));
assert.ok(slugs.size >= 8, 'expected at least eight plan types, got ' + slugs.size);
for (const slug of slugs) {
  for (const file of ['model.html', 'apartment.glb']) {
    assert.ok(fs.existsSync(`${__dirname}/../assets/residences/${slug}/${file}`), `missing ${slug}/${file}`);
  }
}

// finished render set renders a gallery, the rest render placeholder slots
const artDeco = apartments.find(a => api.unitFor(a).interior);
const galleryHtml = api.render(artDeco, s => s);
assert.equal((galleryHtml.match(/role="tab"/g) || []).length, 3);
assert.ok(galleryHtml.includes('/preview/assets/residences/40-5/model.html'));
assert.ok(galleryHtml.includes('Ар-деко'));
assert.equal((galleryHtml.match(/data-interior-index=/g) || []).length, 5);
assert.ok(!galleryHtml.includes('residence-media__slot'), 'finished set must not show placeholders');
assert.ok(!galleryHtml.includes('<iframe'), 'model must load on demand');

const pending = apartments.find(a => !api.unitFor(a).interior);
const pendingHtml = api.render(pending, s => s);
assert.equal((pendingHtml.match(/role="tab"/g) || []).length, 3);
assert.ok(pendingHtml.includes('Вариант ремонта'));
assert.equal((pendingHtml.match(/residence-media__slot"/g) || []).length, 5, 'five placeholder slots');
assert.ok(!pendingHtml.includes('data-interior-index'), 'no gallery without renders');
assert.ok(pendingHtml.includes(`/preview/assets/residences/${api.unitFor(pending).slug}/model.html`));
assert.ok(!pendingHtml.includes('<iframe'), 'model must load on demand');
assert.ok(api.asset('66', '02-living.png').startsWith('/preview/assets/'));

// mount() has to work both with and without a finished render set
for (const apt of [artDeco, pending]) {
  const unit = api.unitFor(apt);
  const root = parse(api.render(apt, s => s));
  assert.equal(root.dataset.unit, unit.slug);
  const lightbox = [];
  api.mount(root, s => s, (src, caption) => lightbox.push([src, caption]));

  const tabs = root.querySelectorAll('[data-media-tab]');
  assert.equal(tabs.length, 3);
  const modelTab = tabs.find(b => b.dataset.mediaTab === 'model');
  modelTab.click();
  const frame = root.querySelector('iframe');
  assert.ok(frame, `${unit.slug}: 3D tab must create the iframe on first open`);
  assert.ok(frame.src.includes(`/assets/residences/${unit.slug}/model.html`), `${unit.slug}: wrong model src`);
  modelTab.click();
  assert.equal(root.querySelectorAll('iframe').length, 1, 'iframe must not be created twice');

  tabs.find(b => b.dataset.mediaTab === 'interior').click();
  assert.equal(root.querySelector('#res-pane-interior').hidden, false);
  assert.equal(root.querySelector('#res-pane-plan').hidden, true);

  const hero = root.querySelector('[data-interior-open]');
  if (unit.interior) {
    assert.ok(root.querySelector('[data-interior-image]').src.includes('01-overview.png'));
    root.querySelectorAll('[data-interior-index]')[2].click();
    assert.ok(root.querySelector('[data-interior-image]').src.includes('03-bedroom.png'));
    hero.click();
    assert.equal(lightbox.length, 1);
    assert.ok(lightbox[0][1].includes(unit.interior), 'lightbox caption must name the finish');
  } else {
    assert.equal(hero, null, 'placeholder pane has no zoomable hero');
    assert.equal(lightbox.length, 0);
  }
}

console.log(`PASS: ${apartments.length} residences over ${slugs.size} models, lazy 3D, gallery + placeholders, mount() safe both ways`);
