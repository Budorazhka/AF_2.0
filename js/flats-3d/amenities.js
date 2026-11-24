/* What the renders (фасад 2 / 16.png) and the masterplan show around the tower:
   - the lobby-level restaurant terrace: 3 beige retractable awnings under the
     right wing, a dark steel pergola draped in lush green vines, and dining tables;
   - the spa podium with 4 large dark-framed spa windows, a glazed left pavilion,
     and the exterior staircase descending on the left to the pool deck;
   - the dark-stone pool deck: turquoise swimming pool with white coping, row of
     white loungers on the right, white lounge sofas on the left, and the
     wooden children's playground in front;
   - the roof terrace and Level-7 penthouse pergola;
   - the garden on the north side and evening lighting. */
import * as THREE from './three.js';
import { mergeGeometries } from './three.js';
import { createLamps, alongPath } from './lights.js';

const COLOURS = {
  white: 0xf3f2ee,
  dark: 0x232830,
  slate: 0x3b4556,
  wood: 0xa67c52,
  awning: 0xdfd3be,
  roof: 0x6f5a45,
  stone: 0xd2cbbd,
  sand: 0xc8a97e,
  leaf: 0x3f6628,
  bar: 0x364050,
  spaGlass: 0x13202d,
  glass: 0x8cb4cc,
};

function inRects(x, z, rects, pad = 0) {
  return rects.some((r) => x > r[0] - pad && x < r[2] + pad && z > r[1] - pad && z < r[3] + pad);
}
function inPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
function distToPoly(x, z, poly) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j], [bx, bz] = poly[i];
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(ax + dx * t - x, az + dz * t - z));
  }
  return best;
}

class Bins {
  constructor() { this.bins = {}; }
  add(key, geo) { (this.bins[key] = this.bins[key] || []).push(geo.index ? geo.toNonIndexed() : geo); }
  build(target) {
    const made = [];
    for (const [key, list] of Object.entries(this.bins)) {
      list.forEach((g) => { if (g.attributes.uv) g.deleteAttribute('uv'); });
      const geo = mergeGeometries(list, false);
      list.forEach((g) => g.dispose());
      const isGlass = key === 'spaGlass';
      const isRail = key === 'glass';
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
        color: COLOURS[key],
        roughness: isGlass || isRail ? 0.06 : key === 'awning' ? 0.88 : 0.72,
        metalness: isGlass ? 0.7 : isRail ? 0.2 : key === 'dark' ? 0.35 : 0.04,
        transparent: isRail,
        opacity: isRail ? 0.38 : 1,
        depthWrite: !isRail,
        side: isRail ? THREE.DoubleSide : THREE.FrontSide,
        flatShading: key === 'leaf',
      }));
      m.castShadow = !isRail;
      m.receiveShadow = true;
      target.add(m);
      made.push(m);
    }
    return made;
  }
}

/* -- pieces ------------------------------------------------------------------- */
const box = (w, h, d, x, y, z, rot = 0) => new THREE.BoxGeometry(w, h, d).rotateY(rot).translate(x, y + h / 2, z);

function tableSet(b, x, y, z) {
  b.add('white', new THREE.CylinderGeometry(0.46, 0.46, 0.04, 16).translate(x, y + 0.74, z));
  b.add('dark', new THREE.CylinderGeometry(0.04, 0.04, 0.72, 6).translate(x, y + 0.36, z));
  for (const [dx, dz] of [[0.72, 0], [-0.72, 0], [0, 0.72], [0, -0.72]]) b.add('dark', box(0.42, 0.44, 0.42, x + dx, y, z + dz));
}
function lounger(b, x, y, z, rot = 0) {
  b.add('white', box(1.85, 0.26, 0.68, x, y, z, rot));
  b.add('white', box(0.55, 0.38, 0.64, x - 0.62 * Math.cos(rot), y + 0.12, z + 0.62 * Math.sin(rot), rot));
}
function planter(b, x, y, z, s = 1) {
  b.add('dark', new THREE.CylinderGeometry(0.45 * s, 0.38 * s, 0.6 * s, 10).translate(x, y + 0.3 * s, z));
  b.add('leaf', new THREE.IcosahedronGeometry(0.62 * s, 1).translate(x, y + 0.95 * s, z));
}
function pergola(b, x0, z0, x1, z1, y, { vines = false, colour = 'wood' } = {}) {
  const h = 2.75;
  for (const x of [x0, (x0 + x1) / 2, x1]) {
    for (const z of [z0, z1]) b.add(colour, box(0.14, h, 0.14, x, y, z));
  }
  b.add(colour, box(x1 - x0 + 0.24, 0.16, 0.14, (x0 + x1) / 2, y + h, z0));
  b.add(colour, box(x1 - x0 + 0.24, 0.16, 0.14, (x0 + x1) / 2, y + h, z1));
  for (let x = x0; x <= x1 + 0.01; x += 0.55) {
    b.add(colour, box(0.07, 0.12, z1 - z0 + 0.3, x, y + h + 0.1, (z0 + z1) / 2));
  }
  if (vines) {
    // Lush green vine canopy along the top and front beam of the restaurant pergola (фасад 2)
    for (let x = x0 - 0.2; x <= x1 + 0.2; x += 0.9) {
      b.add('leaf', new THREE.IcosahedronGeometry(0.68, 1).scale(1.2, 0.45, 1.1).translate(x, y + h + 0.22, z1));
      b.add('leaf', new THREE.IcosahedronGeometry(0.58, 1).scale(1.1, 0.4, 1.0).translate(x, y + h + 0.2, z0 + (z1 - z0) * 0.45));
    }
    for (const x of [x0, (x0 + x1) / 2, x1]) {
      b.add('leaf', new THREE.CylinderGeometry(0.28, 0.22, h * 0.75, 7).translate(x, y + h * 0.55, z1));
    }
  }
}
function awning(b, x0, x1, y, z0, z1) {
  const w = x1 - x0, d = z1 - z0;
  const slope = new THREE.BoxGeometry(w, 0.08, d);
  slope.rotateX(0.22);
  slope.translate((x0 + x1) / 2, y - 0.22, (z0 + z1) / 2);
  b.add('awning', slope);
  b.add('awning', box(w, 0.18, 0.06, (x0 + x1) / 2, y - 0.48, z1));
}
function parasol(b, x, y, z, r = 1.45, h = 2.45) {
  b.add('dark', new THREE.CylinderGeometry(0.035, 0.035, h, 8).translate(x, y + h / 2, z));
  b.add('white', new THREE.ConeGeometry(r, 0.44, 8).translate(x, y + h, z));
}
function pavilion(b, x, y, z, a) {
  b.add('wood', box(5, 0.3, 5, x, y, z, a));
  b.add('roof', box(6, 0.28, 6, x, y + 2.9, z, a));
  const c = Math.cos(a), s = Math.sin(a);
  for (const [dx, dz] of [[2.2, 2.2], [-2.2, 2.2], [2.2, -2.2], [-2.2, -2.2]]) b.add('dark', box(0.16, 2.7, 0.16, x + dx * c + dz * s, y + 0.25, z - dx * s + dz * c));
  b.add('white', box(2.4, 0.42, 0.9, x, y + 0.3, z, a));
}

/* -- layout ------------------------------------------------------------------- */

export function createAmenities(building, data, height) {
  const lv = (n) => data.levels.find((l) => l.level === n);
  const L = (n) => building.levels.find((l) => l.level === n);
  const spa = lv(-1), lobby = lv(1), roof = lv(8);
  const plan = new THREE.Group();
  const upperTerrace = new THREE.Group();
  const world = new THREE.Group();
  const P = new Bins(), UP = new Bins(), W = new Bins(), RF = new Bins();   // RF: the roof, hidden with the upper floors
  // T7: decor on the level-7 terraces. Its positions are set for the exterior view and cross
  // the detailed flat models, so a walk through a level-7 flat hides it (app.js showLandscape).
  const T7 = new Bins();
  const keepOut = [], paths = [];
  const lampPlan = [], lampWorld = [], wallLights = [], roofLamps = [];
  const toWorld = (x, y, z) => building.planToWorld(x, z, y);
  const worldBox = (x0, z0, x1, z1, pad) => {
    const a = toWorld(x0, 0, z0), b = toWorld(x1, 0, z1);
    keepOut.push([Math.min(a.x, b.x) - pad, Math.min(a.z, b.z) - pad, Math.max(a.x, b.x) + pad, Math.max(a.z, b.z) + pad]);
  };
  const mats = [];
  const solid = (geo, colour, opts = {}) => {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: colour, roughness: 0.75, ...opts }));
    m.castShadow = true; m.receiveShadow = true;
    mats.push(m.material);
    return m;
  };

  const spaFloor = L(-1).floor;
  const podiumY = L(1).y0;

  // -- 1. Solid tower podium, spa podium, left glass pavilion, exterior stairs & restaurant terrace (фасад 2) --
  // Solid slate-graphite podium base directly under the Left Wing (x = 3.9..13.55, z = 9.6..29.25)
  // and front terrace walkway (x = 3.9..9.8, z = 28.4..30.6) so no upper column or wall ever hangs in mid-air
  const leftPodH = podiumY - spaFloor + 0.3;
  const leftWingBase = solid(new THREE.BoxGeometry(9.65, leftPodH, 19.65), 0x3b4556, { roughness: 0.78 });
  leftWingBase.position.set(8.725, (spaFloor + podiumY) / 2, 19.425);
  const leftWalkBase = solid(new THREE.BoxGeometry(5.9, leftPodH, 2.2), 0x3b4556, { roughness: 0.78 });
  leftWalkBase.position.set(6.85, (spaFloor + podiumY) / 2, 29.5);
  const leftWalkDeck = solid(new THREE.BoxGeometry(5.9, 0.16, 2.2), 0x434d5e, { roughness: 0.82 });
  leftWalkDeck.position.set(6.85, podiumY + 0.02, 29.5);

  // Spa podium block under the restaurant terrace (x = 9.8..26.2, z = 19.35..30.6)
  const podBase = solid(new THREE.BoxGeometry(16.4, leftPodH, 11.25), 0x3b4556, { roughness: 0.78 });
  podBase.position.set(18.0, (spaFloor + podiumY) / 2, 24.975);
  // Keep the restaurant terrace deck cleanly above Level 1's slab bottom (podiumY)
  // so it never overlaps the spa interior ceiling when viewed from Floor -1.
  const podDeck = solid(new THREE.BoxGeometry(16.4, 0.18, 11.25), 0x434d5e, { roughness: 0.82 });
  podDeck.position.set(18.0, podiumY + 0.14, 24.975);
  plan.add(leftWingBase, leftWalkBase, leftWalkDeck, podBase);
  upperTerrace.add(podDeck);

  // Parapet along the front and right side of the restaurant terrace
  UP.add('slate', box(16.4, 0.78, 0.32, 18.0, podiumY + 0.14, 30.44));
  UP.add('slate', box(0.32, 0.78, 11.25, 26.04, podiumY + 0.14, 24.975));

  // 4 large dark-framed spa windows along the front wall facing the pool (z = 30.62)
  for (let i = 0; i < 4; i++) {
    const wx = 11.9 + i * 4.0;
    P.add('spaGlass', box(3.2, 2.5, 0.14, wx, spaFloor + 0.15, 30.62));
    P.add('dark', box(3.3, 0.1, 0.2, wx, spaFloor + 2.62, 30.64));
    P.add('dark', box(0.08, 2.5, 0.2, wx - 1.6, spaFloor + 0.15, 30.64));
    P.add('dark', box(0.08, 2.5, 0.2, wx, spaFloor + 0.15, 30.64));
    P.add('dark', box(0.08, 2.5, 0.2, wx + 1.6, spaFloor + 0.15, 30.64));
  }

  // Left glazed spa/martial-arts pavilion wing (x = 1.4..8.0, z = 24.0..30.6) with solid plinth & rooftop yoga terrace (masterplan.jpg)
  const pavH = podiumY - spaFloor;
  const pavPlinth = solid(new THREE.BoxGeometry(6.6, 5.2, 6.6), 0x363e4b);
  pavPlinth.position.set(4.7, spaFloor - 2.6, 27.3);
  plan.add(pavPlinth);
  P.add('dark', box(6.6, 0.24, 6.6, 4.7, spaFloor + pavH - 0.12, 27.3));
  P.add('wood', box(6.3, 0.08, 6.3, 4.7, podiumY + 0.12, 27.3));
  for (const [mx, mz] of [[3.2, 26.2], [4.7, 26.2], [6.2, 26.2], [4.0, 28.4], [5.5, 28.4]]) {
    P.add('stone', box(0.68, 0.03, 1.75, mx, podiumY + 0.20, mz));
  }
  P.add('spaGlass', box(6.3, pavH - 0.2, 6.3, 4.7, spaFloor + 0.05, 27.3));
  for (const x of [1.55, 3.1, 4.7, 6.3, 7.85]) P.add('dark', box(0.08, pavH - 0.1, 0.08, x, spaFloor + 0.05, 30.5));
  // Glass balustrade on top of the left pavilion roof terrace (y = podiumY)
  P.add('glass', box(6.6, 1.05, 0.04, 4.7, podiumY + 0.16, 30.55));
  P.add('glass', box(0.04, 1.05, 6.6, 1.45, podiumY + 0.16, 27.3));

  // Exterior staircase descending in the open air (x = 8.05..9.80, z = 30.55..34.10) from the open front walkway landing to the pool deck
  const steps = 12;
  for (let s = 0; s < steps; s++) {
    const t = s / steps;
    const sy = spaFloor + (1 - t) * (podiumY - spaFloor);
    const sz = 30.55 + t * 3.55;
    P.add('slate', box(1.75, 0.26, 0.34, 8.925, sy - 0.26, sz));
  }
  for (const x of [8.08, 9.77]) {
    const rGeo = new THREE.BoxGeometry(0.06, 0.06, 4.15);
    rGeo.rotateX(Math.atan2(podiumY - spaFloor, 3.55));
    rGeo.translate(x, (spaFloor + podiumY) / 2 + 0.90, 32.32);
    P.add('dark', rGeo);
  }

  // 3 cream/beige retractable awnings under the 2nd-floor right wing (x = 16.0..28.2, z = 19.35..22.15)
  for (let i = 0; i < 3; i++) {
    const ax0 = 16.0 + i * 4.1, ax1 = ax0 + 3.8;
    awning(UP, ax0, ax1, L(2).y0 - 0.05, 19.35, 22.15);
  }

  // Vine-covered dark steel pergola on the open restaurant terrace (x = 13.85..23.6, z = 25.8..30.2 — 100% clear of the left wing!)
  pergola(UP, 13.85, 25.8, 23.6, 30.2, podiumY + 0.22, { vines: true, colour: 'dark' });
  // Continuous green vine planter along the front parapet to the left of the pergola (x = 10.2..13.5, z = 30.2)
  for (let x = 10.4; x <= 13.4; x += 0.85) {
    UP.add('leaf', new THREE.IcosahedronGeometry(0.55, 1).scale(1.15, 0.5, 0.9).translate(x, podiumY + 1.05, 30.35));
  }

  // Dining tables & white parasols on the open lobby restaurant terrace (п3.webp)
  for (const [tx, tz] of [
    [15.6, 28.0], [18.7, 28.0], [21.8, 28.0],
    [16.8, 23.6], [20.6, 23.6], [24.4, 23.8],
  ]) {
    tableSet(UP, tx, podiumY + 0.22, tz);
  }
  for (const [px2, pz2] of [[16.4, 24.4], [20.6, 24.4], [24.4, 24.6]]) {
    parasol(UP, px2, podiumY + 0.22, pz2, 1.55, 2.55);
  }

  // -- 2. Pool deck, swimming pool, loungers, parasols, lounge corner & playground (п3.webp & masterplan.jpg) --
  const dx0 = 4.6, dx1 = 25.8, dz0 = 30.6, dz1 = 38.4;
  const base = solid(new THREE.BoxGeometry(dx1 - dx0, 5.2, dz1 - dz0), 0x363e4b);
  base.position.set((dx0 + dx1) / 2, spaFloor - 2.6, (dz0 + dz1) / 2);
  const deck = solid(new THREE.BoxGeometry(dx1 - dx0, 0.14, dz1 - dz0), 0x3b424d, { roughness: 0.84 });
  deck.position.set((dx0 + dx1) / 2, spaFloor + 0.07, (dz0 + dz1) / 2);

  // Turquoise swimming pool with crisp white stone coping (centred in front of the 4 spa windows)
  const px = 16.0, pz = 34.5, pw = 9.6, pd = 4.2;
  const coping = solid(new THREE.BoxGeometry(pw + 0.8, 0.10, pd + 0.8), 0xeeebe3, { roughness: 0.55 });
  coping.position.set(px, spaFloor + 0.16, pz);
  const poolMat = new THREE.MeshStandardMaterial({ color: 0x38b5d6, roughness: 0.05, metalness: 0.12, emissive: 0x269ec2, emissiveIntensity: 0.12 });
  mats.push(poolMat);
  const water = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.08, pd), poolMat);
  water.position.set(px, spaFloor + 0.19, pz);
  plan.add(base, deck, coping, water);

  // Glass balustrade along all three outer edges of the pool deck (with stair opening at x=6.2..8.2 to the playground)
  P.add('glass', box(1.52, 1.04, 0.04, 5.44, spaFloor + 0.14, dz1 - 0.08));
  P.add('glass', box(17.52, 1.04, 0.04, 16.96, spaFloor + 0.14, dz1 - 0.08));
  P.add('glass', box(0.04, 1.04, dz1 - dz0 - 0.16, dx0 + 0.08, spaFloor + 0.14, (dz0 + dz1) / 2));
  P.add('glass', box(0.04, 1.04, dz1 - dz0 - 0.16, dx1 - 0.08, spaFloor + 0.14, (dz0 + dz1) / 2));
  for (const x of [dx0 + 0.12, 6.20, 8.20, 12.6, 17.4, 22.2, dx1 - 0.12]) P.add('dark', box(0.06, 1.06, 0.06, x, spaFloor + 0.14, dz1 - 0.08));
  for (const x of [dx0 + 0.08, dx1 - 0.08]) {
    for (let z = dz0 + 0.5; z <= dz1 - 0.2; z += 3.6) P.add('dark', box(0.06, 1.06, 0.06, x, spaFloor + 0.14, z));
  }

  // Row of 6 white sun loungers & 2 white parasols clear of the loungers on the right of the pool (п3.webp)
  for (let i = 0; i < 6; i++) {
    lounger(P, 22.8, spaFloor + 0.14, 31.6 + i * 1.12, 0);
  }
  for (const pz2 of [33.1, 35.8]) {
    parasol(P, 24.55, spaFloor + 0.14, pz2, 1.25, 2.35);
  }

  // Left lounge area at the foot of the stairs (white L-sofa, coffee table & clear white parasol)
  P.add('white', box(2.3, 0.42, 0.8, 7.2, spaFloor + 0.14, 34.2));
  P.add('white', box(0.8, 0.42, 1.7, 6.2, spaFloor + 0.14, 35.3));
  P.add('white', new THREE.CylinderGeometry(0.5, 0.5, 0.34, 16).translate(7.5, spaFloor + 0.31, 35.4));
  parasol(P, 5.65, spaFloor + 0.14, 36.95, 1.25, 2.40);

  // Children's wooden playground at ground level below the pool deck + 5-step stairs down (x = 6.2..8.2, masterplan.jpg)
  const playY = spaFloor - 0.75;
  for (let s = 0; s < 5; s++) {
    const sy = spaFloor + 0.14 - ((s + 1) / 5) * (spaFloor + 0.14 - playY);
    P.add('wood', box(1.96, 0.16, 0.32, 7.2, sy - 0.16, dz1 + 0.14 + s * 0.30));
  }
  P.add('slate', box(17.8, 3.4, 5.8, 13.7, playY - 3.45, 41.3));
  P.add('sand', box(15.0, 0.18, 5.2, 14.5, playY - 0.08, 41.2));
  P.add('stone', box(3.8, 0.18, 5.4, 6.6, playY - 0.08, 41.2));
  // Two wooden play towers with pitched roofs + rope bridge + slide
  for (const [tx, tz] of [[10.2, 40.9], [14.2, 41.1]]) {
    P.add('wood', box(1.35, 0.14, 1.35, tx, playY + 1.15, tz));
    for (const [ox, oz] of [[-0.56, -0.56], [0.56, -0.56], [-0.56, 0.56], [0.56, 0.56]]) {
      P.add('wood', box(0.12, 2.35, 0.12, tx + ox, playY, tz + oz));
    }
    P.add('roof', new THREE.ConeGeometry(1.18, 0.85, 4).rotateY(Math.PI / 4).translate(tx, playY + 2.75, tz));
  }
  P.add('wood', box(3.2, 0.10, 0.72, 12.2, playY + 1.12, 41.0));
  const slide = new THREE.BoxGeometry(1.85, 0.10, 0.62);
  slide.rotateZ(0.58);
  slide.translate(8.8, playY + 0.62, 40.9);
  P.add('wood', slide);
  // A-frame wooden swing set on the right of the playground
  P.add('wood', box(2.6, 0.12, 0.12, 18.0, playY + 2.15, 41.3));
  for (const sx of [16.8, 19.2]) {
    for (const dz of [-0.55, 0.55]) {
      const leg = new THREE.BoxGeometry(0.10, 2.35, 0.10);
      leg.rotateX(dz > 0 ? -0.24 : 0.24);
      leg.translate(sx, playY + 1.12, 41.3 + dz * 0.55);
      P.add('wood', leg);
    }
  }
  // Lush green bushes framing the playground perimeter
  for (const [bx, bz, s] of [
    [6.6, 39.2, 1.0], [6.8, 41.2, 1.15], [7.2, 43.2, 1.1],
    [10.8, 43.4, 0.95], [15.6, 43.5, 1.05], [20.2, 43.2, 1.15],
    [20.8, 40.6, 1.2], [20.5, 39.0, 0.95],
  ]) {
    P.add('leaf', new THREE.IcosahedronGeometry(0.75 * s, 1).scale(1.2, 0.75, 1.1).translate(bx, playY + 0.55 * s, bz));
  }

  for (const [x, z] of [[dx0 + 0.6, dz0 + 0.6], [dx1 - 0.6, dz0 + 0.6], [dx0 + 0.6, dz1 - 0.6], [dx1 - 0.6, dz1 - 0.6]]) lampPlan.push([x, spaFloor + 0.14, z]);
  worldBox(dx0 - 2, dz0 - 2, dx1 + 2, dz1 + 5, 4);
  worldBox(24.5, 19.0, 43.0, 33.5, 4);

  // -- 3. Level 7 penthouse pergola and roof terrace (Level 8) --
  if (L(7)) {
    const y7 = L(7).floor;
    // Sleek dark steel pergola over the left wing Level-7 corner terrace (фасад 2)
    pergola(T7, 9.8, 24.2, 13.4, 29.1, y7, { vines: false, colour: 'dark' });
  }

  if (roof && roof.outline) {
    const R = L(8), y = R.floor;
    const outline = roof.outline;
    const housing = roof.walls || [], pool = roof.pool || [];
    const deckRects = [];
    const xs = outline.map((p) => p[0]), zs = outline.map((p) => p[1]);
    for (let x = Math.min(...xs); x < Math.max(...xs); x += 1) {
      for (let z = Math.min(...zs); z < Math.max(...zs); z += 1) {
        const cx = x + 0.5, cz = z + 0.5;
        if (inPoly(cx, cz, outline) && distToPoly(cx, cz, outline) > 0.35 && !inRects(cx, cz, housing, 0.1) && !inRects(cx, cz, pool, 0.2)) deckRects.push([x, z]);
      }
    }
    deckRects.forEach(([x, z]) => RF.add('wood', box(1, 0.06, 1, x + 0.5, y, z + 0.5)));
    // Taller slate-graphite elevator/stair tower housing (visible at the top of фасад 2)
    housing.forEach((r) => {
      const w = r[2] - r[0], d = r[3] - r[1];
      if (w * d < 1.5) return;
      RF.add('bar', box(w, 3.2, d, (r[0] + r[2]) / 2, y, (r[1] + r[3]) / 2));
    });
    const free = (x, z, pad) => inPoly(x, z, outline) && distToPoly(x, z, outline) > pad && !inRects(x, z, housing, pad) && !inRects(x, z, pool, pad + 0.6);
    pool.forEach((r) => {
      if ((r[2] - r[0]) * (r[3] - r[1]) < 4) return;
      for (let x = r[0] + 0.6; x < r[2] - 0.4; x += 1.4) {
        for (const z of [r[1] - 1.4, r[3] + 1.4]) if (free(x, z, 0.5)) lounger(RF, x, y + 0.06, z, Math.PI / 2);
      }
      roofLamps.push({ x: (r[0] + r[2]) / 2, y: y + 0.06, z: r[1] - 0.5 });
    });
    const seats = [];
    for (let x = Math.min(...xs) + 1.6; x < Math.max(...xs); x += 3) {
      for (let z = Math.min(...zs) + 1.6; z < Math.max(...zs); z += 3) {
        if (free(x, z, 1.4) && [[1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2]].every(([ox, oz]) => free(x + ox, z + oz, 0.3))) seats.push([x, z]);
      }
    }
    seats.slice(0, 8).forEach(([x, z]) => {
      if (z < 18.0) tableSet(RF, x, y + 0.06, z);
    });
    const big = housing.slice().sort((a, b) => (b[2] - b[0]) * (b[3] - b[1]) - (a[2] - a[0]) * (a[3] - a[1]))[0];
    if (big && free((big[0] + big[2]) / 2, big[3] + 1.2, 0.3)) RF.add('white', box(Math.min(4, big[2] - big[0]), 1.1, 0.6, (big[0] + big[2]) / 2, y + 0.06, big[3] + 0.9));
    // Clean architectural slate-graphite parapet along the roof front (16.png & фасад 2)
    for (let i = 0; i < outline.length; i++) {
      const [ax, az] = outline[i], [bx, bz] = outline[(i + 1) % outline.length];
      const len = Math.hypot(bx - ax, bz - az);
      const isFront = az > 17.5 || bz > 17.5;
      const g = new THREE.BoxGeometry(len, isFront ? 0.95 : 1.05, isFront ? 0.28 : 0.04);
      g.rotateY(-Math.atan2(bz - az, bx - ax)).translate((ax + bx) / 2, y + 0.48, (az + bz) / 2);
      RF.add(isFront ? 'slate' : 'glass', g);
    }
  }

  // -- 4. Garden on the north-east side (behind the building, clear of the west/south podium) --
  const at = (azDeg, r) => ({ x: r * Math.sin((azDeg * Math.PI) / 180), z: -r * Math.cos((azDeg * Math.PI) / 180) });
  const garden = [
    { kind: 'pavilion', p: at(25, 48), a: 0.4 },
    { kind: 'pavilion', p: at(55, 54), a: -0.3 },
    { kind: 'pavilion', p: at(82, 48), a: 0.2 },
    { kind: 'fire', p: at(42, 34) },
  ];
  const start = at(48, 22);
  for (const g of garden) {
    const y = height(g.p.x, g.p.z);
    if (g.kind === 'pavilion') pavilion(W, g.p.x, y, g.p.z, g.a);
    else {
      W.add('stone', new THREE.CylinderGeometry(3.6, 3.8, 0.35, 32).translate(g.p.x, y + 0.1, g.p.z));
      W.add('dark', new THREE.CylinderGeometry(0.8, 0.9, 0.5, 16).translate(g.p.x, y + 0.3, g.p.z));
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        W.add('wood', box(1.6, 0.45, 0.5, g.p.x + Math.cos(a) * 2.6, y + 0.1, g.p.z + Math.sin(a) * 2.6, -a + Math.PI / 2));
      }
    }
    keepOut.push([g.p.x - 6, g.p.z - 6, g.p.x + 6, g.p.z + 6]);
    const mid = { x: (start.x + g.p.x) / 2 + (g.p.z - start.z) * 0.2, z: (start.z + g.p.z) / 2 - (g.p.x - start.x) * 0.2 };
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(start.x, 0, start.z), new THREE.Vector3(mid.x, 0, mid.z), new THREE.Vector3(g.p.x, 0, g.p.z));
    paths.push(curve.getSpacedPoints(24).map((v) => ({ x: v.x, z: v.z })));
  }
  {
    const pos = [], idx = [];
    let o = 0;
    for (const path of paths) {
      path.forEach((p, i) => {
        const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
        const tx = b.x - a.x, tz = b.z - a.z, l = Math.hypot(tx, tz) || 1;
        for (const s of [-0.85, 0.85]) {
          const x = p.x - (tz / l) * s, z = p.z + (tx / l) * s;
          pos.push(x, height(x, z) + 0.08, z);
        }
        if (i) { const k = o + i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); }
      });
      o += path.length * 2;
      lampWorld.push(...alongPath(path, 12, 1.4, height));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xd9d1c0, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide }));
    m.receiveShadow = true;
    mats.push(m.material);
    world.add(m);
  }

  // -- build ----------------------------------------------------------------------
  COLOURS.glass = 0x8cb4cc;
  const roofGroup = new THREE.Group();
  const terraceDecor = new THREE.Group();
  terraceDecor.userData.level = 7;
  T7.build(terraceDecor);
  roofGroup.add(terraceDecor);
  P.build(plan);
  UP.build(upperTerrace);
  RF.build(roofGroup).filter((m) => m.material.color.getHex() === new THREE.Color(COLOURS.glass).getHex()).forEach((m) => {
    Object.assign(m.material, { transparent: true, opacity: 0.38, depthWrite: false, roughness: 0.05 });
    m.castShadow = false;
  });
  W.build(world);

  const planLamps = createLamps(lampPlan.map(([x, y, z]) => ({ x, y, z })));
  const roofPosts = createLamps(roofLamps);
  const roofWall = createLamps(wallLights, { post: false, radius: 2.6 });
  const gardenLamps = createLamps(lampWorld);
  plan.add(planLamps.group);
  roofGroup.add(roofPosts.group, roofWall.group);
  world.add(gardenLamps.group);
  const lamps = [planLamps, roofPosts, roofWall, gardenLamps];

  return {
    plan, upperTerrace, roof: roofGroup, terraceDecor, world, keepOut, paths,
    setNight(f) {
      lamps.forEach((l) => l.setNight(f));
      poolMat.emissiveIntensity = 0.08 + 0.85 * f;
    },
    dispose() {
      [plan, upperTerrace, roofGroup, world].forEach((g) => g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); }));
      lamps.forEach((l) => l.dispose());
    },
  };
}
