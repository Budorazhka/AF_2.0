/* What the renders and the masterplan show but the floor plans do not:
   - the roof terrace with the restaurant (render п6-pool): deck, pool with
     loungers, dining tables under umbrellas and a pergola, planters, a bar and
     a glass balustrade along the real roof outline;
   - the pool with its deck in front of the spa podium (render п3);
   - planters on the podium roof beside the car park;
   - the garden on the quiet north side (masterplan): pavilions, a fire-pit
     circle and paths winding through the lawn;
   - lamps for the evening.
   Placement is read off the pictures, not surveyed. Plan-space pieces go into
   the building's own group; the garden lives in world space on the relief. */
import * as THREE from './three.js';
import { mergeGeometries } from './three.js';
import { createLamps, alongPath } from './lights.js';

const COLOURS = { white: 0xf1efe9, dark: 0x34373c, wood: 0xa97f56, cloth: 0xf4f0e6, roof: 0x6f5a45, stone: 0xd2cbbd, leaf: 0x58763c, bar: 0x2b2d31 };

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
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: COLOURS[key], roughness: key === 'cloth' ? 0.9 : 0.7, flatShading: key === 'leaf' || key === 'cloth' }));
      m.castShadow = true;
      m.receiveShadow = true;
      target.add(m);
      made.push(m);
    }
    return made;
  }
}

/* -- pieces ------------------------------------------------------------------- */
const box = (w, h, d, x, y, z, rot = 0) => new THREE.BoxGeometry(w, h, d).rotateY(rot).translate(x, y + h / 2, z);

function umbrella(b, x, y, z) {
  b.add('cloth', new THREE.ConeGeometry(1.5, 0.45, 8).translate(x, y + 2.45, z));
  b.add('dark', new THREE.CylinderGeometry(0.035, 0.035, 2.4, 6).translate(x, y + 1.2, z));
}
function tableSet(b, x, y, z, withUmbrella) {
  b.add('white', new THREE.CylinderGeometry(0.45, 0.45, 0.04, 16).translate(x, y + 0.74, z));
  b.add('dark', new THREE.CylinderGeometry(0.04, 0.04, 0.72, 6).translate(x, y + 0.36, z));
  for (const [dx, dz] of [[0.75, 0], [-0.75, 0], [0, 0.75], [0, -0.75]]) b.add('wood', box(0.42, 0.45, 0.42, x + dx, y, z + dz));
  if (withUmbrella) umbrella(b, x, y, z);
}
function lounger(b, x, y, z, rot) { b.add('white', box(0.7, 0.32, 1.9, x, y, z, rot)); }
function planter(b, x, y, z, s = 1) {
  b.add('dark', new THREE.CylinderGeometry(0.45 * s, 0.38 * s, 0.6 * s, 10).translate(x, y + 0.3 * s, z));
  b.add('leaf', new THREE.IcosahedronGeometry(0.6 * s, 1).translate(x, y + 0.95 * s, z));
}
function pergola(b, x0, z0, x1, z1, y) {
  const h = 2.8;
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) b.add('wood', box(0.14, h, 0.14, x, y, z));
  b.add('wood', box(x1 - x0 + 0.3, 0.16, 0.12, (x0 + x1) / 2, y + h, z0));
  b.add('wood', box(x1 - x0 + 0.3, 0.16, 0.12, (x0 + x1) / 2, y + h, z1));
  for (let x = x0; x <= x1 + 0.01; x += 0.45) b.add('wood', box(0.06, 0.1, z1 - z0 + 0.4, x, y + h + 0.12, (z0 + z1) / 2));
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
  const world = new THREE.Group();
  const P = new Bins(), W = new Bins(), RF = new Bins();   // RF: the roof, hidden with the upper floors
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

  // -- pool and deck on the sea side of the spa level --------------------------
  const spaFloor = L(-1).floor;
  const sx0 = Math.min(...spa.slab.map((r) => r[0])), sx1 = Math.max(...spa.slab.map((r) => r[2]));
  const sz1 = Math.max(...spa.slab.map((r) => r[3]));
  const dx0 = sx0 + 2, dx1 = Math.min(sx0 + 24, sx1 - 2), dz0 = sz1 + 0.2, dz1 = sz1 + 11;
  const base = solid(new THREE.BoxGeometry(dx1 - dx0, 5, dz1 - dz0), 0x3f454e);
  base.position.set((dx0 + dx1) / 2, spaFloor - 2.5, (dz0 + dz1) / 2);
  const deck = solid(new THREE.BoxGeometry(dx1 - dx0, 0.12, dz1 - dz0), 0xb48d66, { roughness: 0.8 });
  deck.position.set((dx0 + dx1) / 2, spaFloor + 0.06, (dz0 + dz1) / 2);
  const px = (dx0 + dx1) / 2, pz = (dz0 + dz1) / 2 + 0.6;
  const coping = solid(new THREE.BoxGeometry(13.8, 0.1, 6), 0xece9e2, { roughness: 0.6 });
  coping.position.set(px, spaFloor + 0.08, pz);
  const poolMat = new THREE.MeshStandardMaterial({ color: 0x3fb3d9, roughness: 0.05, metalness: 0.1, emissive: 0x2aa6d6, emissiveIntensity: 0 });
  mats.push(poolMat);
  const water = new THREE.Mesh(new THREE.BoxGeometry(13, 0.1, 5.2), poolMat);
  water.position.set(px, spaFloor + 0.1, pz);
  plan.add(base, deck, coping, water);
  for (let i = 0; i < 6; i++) lounger(P, px - 6 + i * 2.4, spaFloor + 0.12, pz - 4.1, 0);
  for (const k of [-4.8, 0, 4.8]) umbrella(P, px + k, spaFloor + 0.12, pz - 4.6);
  for (const [x, z] of [[dx0 + 0.6, dz0 + 0.6], [dx1 - 0.6, dz0 + 0.6], [dx0 + 0.6, dz1 - 0.6], [dx1 - 0.6, dz1 - 0.6]]) lampPlan.push([x, spaFloor + 0.12, z]);
  worldBox(dx0, dz0, dx1, dz1, 3);

  // -- podium roof: planters where neither the tower, the lobby nor the car park is --
  const covered = [...lobby.slab, ...lv(2).slab];
  const bays = data.parking || [];
  const carPark = bays.length ? [[Math.min(...bays.map((b) => b[0])) - 1, Math.min(...bays.map((b) => b[1])) - 7, Math.max(...bays.map((b) => b[2])) + 1, Math.max(...bays.map((b) => b[3])) + 1]] : [];
  const podiumY = L(1).y0;
  let planted = 0;
  for (let z = sz1 - 1.2; z > 0 && planted < 14; z -= 2.6) {
    for (let x = sx0 + 1.2; x < sx1 - 1 && planted < 14; x += 2.6) {
      if (inRects(x, z, spa.slab, -0.6) && !inRects(x, z, covered, 0.8) && !inRects(x, z, carPark, 0.5)) { planter(P, x, podiumY, z, 1.2); planted++; }
    }
  }
  // lamps along the car park's driving lane
  if (carPark.length) {
    const [cx0, cz0, cx1] = carPark[0];
    for (let x = cx0 + 3; x < cx1; x += 9) lampPlan.push([x, podiumY, cz0 + 0.6]);
  }

  // -- roof terrace and restaurant (render п6-pool) -------------------------------
  if (roof && roof.outline) {
    const R = L(8), y = R.floor;
    const outline = roof.outline;
    const housing = roof.walls || [], pool = roof.pool || [];
    // deck over the whole roof, the pool and the stair/lift housings excepted
    const deckRects = [];
    const xs = outline.map((p) => p[0]), zs = outline.map((p) => p[1]);
    for (let x = Math.min(...xs); x < Math.max(...xs); x += 1) {
      for (let z = Math.min(...zs); z < Math.max(...zs); z += 1) {
        const cx = x + 0.5, cz = z + 0.5;
        if (inPoly(cx, cz, outline) && distToPoly(cx, cz, outline) > 0.35 && !inRects(cx, cz, housing, 0.1) && !inRects(cx, cz, pool, 0.2)) deckRects.push([x, z]);
      }
    }
    deckRects.forEach(([x, z]) => RF.add('wood', box(1, 0.06, 1, x + 0.5, y, z + 0.5)));
    // housings clad like the tower, with a glazed bar front
    housing.forEach((r) => {
      const w = r[2] - r[0], d = r[3] - r[1];
      if (w * d < 1.5) return;
      RF.add('bar', box(w, 2.9, d, (r[0] + r[2]) / 2, y, (r[1] + r[3]) / 2));
    });
    const free = (x, z, pad) => inPoly(x, z, outline) && distToPoly(x, z, outline) > pad && !inRects(x, z, housing, pad) && !inRects(x, z, pool, pad + 0.6);
    // loungers beside the pool
    pool.forEach((r) => {
      if ((r[2] - r[0]) * (r[3] - r[1]) < 4) return;
      for (let x = r[0] + 0.6; x < r[2] - 0.4; x += 1.4) {
        for (const z of [r[1] - 1.4, r[3] + 1.4]) if (free(x, z, 0.5)) lounger(RF, x, y + 0.06, z, 0);
      }
      roofLamps.push({ x: (r[0] + r[2]) / 2, y: y + 0.06, z: r[1] - 0.5 });
    });
    // dining: tables on a 3 m grid where there is room, pergola over the first rows
    const seats = [];
    for (let x = Math.min(...xs) + 1.6; x < Math.max(...xs); x += 3) {
      for (let z = Math.min(...zs) + 1.6; z < Math.max(...zs); z += 3) {
        if (free(x, z, 1.4) && [[1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2]].every(([ox, oz]) => free(x + ox, z + oz, 0.3))) seats.push([x, z]);
      }
    }
    seats.slice(0, 16).forEach(([x, z], i) => {
      tableSet(RF, x, y + 0.06, z, i % 3 !== 0);
      if (i % 3 === 0) pergola(RF, x - 1.4, z - 1.4, x + 1.4, z + 1.4, y + 0.06);
    });
    // a bar counter against the biggest housing
    const big = housing.slice().sort((a, b) => (b[2] - b[0]) * (b[3] - b[1]) - (a[2] - a[0]) * (a[3] - a[1]))[0];
    if (big && free((big[0] + big[2]) / 2, big[3] + 1.2, 0.3)) RF.add('white', box(Math.min(4, big[2] - big[0]), 1.1, 0.6, (big[0] + big[2]) / 2, y + 0.06, big[3] + 0.9));
    // planters and soft wall lights along the parapet
    for (let i = 0; i < outline.length; i++) {
      const [ax, az] = outline[i], [bx, bz] = outline[(i + 1) % outline.length];
      const len = Math.hypot(bx - ax, bz - az);
      const nx = (bz - az) / len, nz = -(bx - ax) / len;               // one of the two normals
      const inward = inPoly((ax + bx) / 2 + nx * 0.8, (az + bz) / 2 + nz * 0.8, outline) ? 1 : -1;
      for (let t = 1.5; t < len - 1; t += 3.5) {
        const x = ax + ((bx - ax) * t) / len + nx * inward * 0.7, z = az + ((bz - az) * t) / len + nz * inward * 0.7;
        if (free(x, z, 0.2)) { planter(RF, x, y + 0.06, z, 0.8); wallLights.push({ x, y: y + 0.06, z }); }
      }
      // glass balustrade panel on the edge
      const g = new THREE.BoxGeometry(len, 1.1, 0.03);
      g.rotateY(-Math.atan2(bz - az, bx - ax)).translate((ax + bx) / 2, y + 0.55, (az + bz) / 2);
      RF.add('glass', g);
    }
  }

  // -- garden on the north side ---------------------------------------------------
  const at = (azDeg, r) => ({ x: r * Math.sin((azDeg * Math.PI) / 180), z: -r * Math.cos((azDeg * Math.PI) / 180) });
  const garden = [
    { kind: 'pavilion', p: at(315, 46), a: 0.4 },
    { kind: 'pavilion', p: at(350, 54), a: -0.3 },
    { kind: 'pavilion', p: at(28, 46), a: 0.2 },
    { kind: 'fire', p: at(337, 31) },
  ];
  const start = at(340, 19);
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
  COLOURS.glass = 0xcfe0e8;
  const roofGroup = new THREE.Group();
  P.build(plan);
  RF.build(roofGroup).filter((m) => m.material.color.getHex() === new THREE.Color(COLOURS.glass).getHex()).forEach((m) => {
    Object.assign(m.material, { transparent: true, opacity: 0.25, depthWrite: false, roughness: 0.05 });
    m.castShadow = false;
  });
  W.build(world);

  // lamps live in the space of what they light: plan space for the podium and roof
  const planLamps = createLamps(lampPlan.map(([x, y, z]) => ({ x, y, z })));
  const roofPosts = createLamps(roofLamps);
  const roofWall = createLamps(wallLights, { post: false, radius: 2.6 });
  const gardenLamps = createLamps(lampWorld);
  plan.add(planLamps.group);
  roofGroup.add(roofPosts.group, roofWall.group);
  world.add(gardenLamps.group);
  const lamps = [planLamps, roofPosts, roofWall, gardenLamps];

  return {
    plan, roof: roofGroup, world, keepOut, paths,
    setNight(f) {
      lamps.forEach((l) => l.setNight(f));
      poolMat.emissiveIntensity = 0.9 * f;
    },
    dispose() {
      [plan, roofGroup, world].forEach((g) => g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); }));
      lamps.forEach((l) => l.dispose());
    },
  };
}
