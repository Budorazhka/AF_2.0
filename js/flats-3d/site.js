/* The hillside around the house: relief, forest, neighbours, road, the sea and
   Batumi on the horizon, sky and sunlight.

   Modelled on the drone film and the renders: the house stands in dense forest
   on a slope falling ~1 km west to the Gonio coast, with scattered two- and
   three-storey houses downhill, a road climbing behind it and the towers of
   Batumi to the north across the bay. Shapes are schematic (no survey data);
   the same height function shades the morning sun in the sun-hours estimate,
   so the picture and the numbers agree. */
import * as THREE from './three.js';
import { Sky, mergeGeometries } from './three.js';
import { createLamps, alongPath } from './lights.js';

export const SEA_LEVEL = -145;

function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// waterline: straight along Gonio, bending north-east towards Batumi
const coastX = (z) => (z > -1500 ? -970 : -970 + (-1500 - z) * 0.62);
const BATUMI = { x: coastX(-7600) + 900, z: -7600 };

/** Ground height at world (x, z): +X east, -Z north, building centred on 0. */
export function groundHeight(x, z) {
  const d = x - coastX(z);                               // metres inland from the water
  if (d < 0) return SEA_LEVEL - Math.min(-d * 0.05, 25);
  const plain = smooth(-2600, -4200, z);                 // Batumi lowland
  let h = SEA_LEVEL + d * (0.15 * (1 - plain) + 0.02 * plain);
  const m = 0.00025 * Math.max(d - 970, 0) ** 2 * (1 - 0.8 * plain);
  h += 750 * (1 - Math.exp(-m / 750));                   // mountains behind, capped like the real ridge
  h += 70 * smooth(260, 900, z) * smooth(-900, -100, x); // ridge down to the sea south of the house
  h += smooth(0, 80, d) * (7 * Math.sin(x / 83 + z / 140) + 5 * Math.sin(z / 61 - x / 230) + 3 * Math.sin((x + z) / 37));
  // building terrace cut into the slope; the spa podium, pool deck and playground open to the west (y = -4.6)
  const r = Math.hypot(x, z);
  const pad = 1 - smooth(32, 82, r);
  return h * (1 - pad) + (-0.25 - 4.45 * smooth(6, -8, x)) * pad;
}

/* -- relief ------------------------------------------------------------------ */

function relief(height, localBounds) {
  // one grid, dense near the house and stretched towards the horizon
  const n = 280, R = 9000, k = 2.2;
  const map = (u) => Math.sign(u) * R * Math.abs(u) ** k;
  const regular = Array.from({ length: n + 1 }, (_, i) => map((i / n) * 2 - 1));
  const axis = (min, max) => {
    if (!localBounds) return regular;
    const values = regular.filter((v) => v < min || v > max);
    for (let v = min; v <= max; v += 0.85) values.push(v);
    return values.sort((a, b) => a - b);
  };
  const [x0, z0, x1, z1] = localBounds || [];
  const xs = axis(x0, x1), zs = axis(z0, z1);
  const pos = [], col = [], idx = [];
  const c = new THREE.Color();
  const forest = new THREE.Color(0x3d5e2b), deep = new THREE.Color(0x2d4a20), lawn = new THREE.Color(0x4b6b35);
  const sand = new THREE.Color(0xd8ccb0), town = new THREE.Color(0x9a9d8e), rock = new THREE.Color(0x6b745c);
  const noise = rng(11);
  for (const z of zs) {
    for (const x of xs) {
      const h = height(x, z);
      pos.push(x, h, z);
      const r = Math.hypot(x, z), d = x - coastX(z);
      c.copy(forest).lerp(deep, smooth(150, 700, h) * 0.8).lerp(rock, smooth(500, 800, h) * 0.5);
      c.offsetHSL(0, 0, (noise() - 0.5) * 0.05);
      c.lerp(town, smooth(-2600, -4000, z) * (1 - smooth(1500, 3500, d)) * 0.85);
      c.lerp(lawn, 1 - smooth(30, 70, r));
      c.lerp(sand, 1 - smooth(SEA_LEVEL + 1.5, SEA_LEVEL + 6, h));
      col.push(c.r, c.g, c.b);
    }
  }
  for (let j = 0; j < zs.length - 1; j++) {
    for (let i = 0; i < xs.length - 1; i++) {
      const a = j * xs.length + i, b = a + 1, cc = a + xs.length, d = cc + 1;
      idx.push(a, cc, b, b, cc, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97 }));
  m.receiveShadow = true;
  m.userData.base = Float32Array.from(col);
  return m;
}

/* Seasons: the slopes of Gonio are a mix of evergreens (laurel, pine, tea) and
   deciduous chestnut, alder and hornbeam. Only the deciduous part turns. */
const SEASON = {
  spring: { leaves: [0x4c7834, 0x58863c, 0x3e682a, 0x649244, 0x457030], ground: [0, 0.02, 0], snow: 0 },
  summer: { leaves: [0x385e26, 0x466d30, 0x2e5020, 0x527a38], ground: [0, 0, 0], snow: 0 },
  autumn: { leaves: [0x3c6228, 0x486e30, 0x335522, 0x547c38, 0x627e36], ground: [0.01, 0.01, -0.01], snow: 0 },
  winter: { leaves: [0x365825, 0x42642d, 0x2d4c1f], ground: [0.01, -0.01, -0.01], snow: 0.4 },
};
export function seasonOf(month) {
  return month <= 1 || month === 11 ? 'winter' : month <= 4 ? 'spring' : month <= 7 ? 'summer' : 'autumn';
}

/* -- forest ------------------------------------------------------------------ */

function treeGeometry() {
  const parts = [];
  const r = rng(5);
  for (const [x, y, z, s] of [[0, 1.0, 0, 1], [0.45, 0.75, 0.2, 0.75], [-0.4, 0.8, -0.25, 0.72], [0.1, 1.45, -0.1, 0.62]]) {
    const b = new THREE.IcosahedronGeometry(s * 0.62, 1);
    const p = b.attributes.position;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (0.9 + r() * 0.2), p.getY(i) * (0.8 + r() * 0.2), p.getZ(i) * (0.9 + r() * 0.2));
    b.translate(x * 0.62, y * 0.62 + 0.35, z * 0.62);
    parts.push(b);                                   // polyhedra come non-indexed already
  }
  const trunk = new THREE.CylinderGeometry(0.05, 0.08, 0.6, 5).translate(0, 0.3, 0).toNonIndexed();
  parts.push(trunk);
  const g = mergeGeometries(parts.map((p) => { p.deleteAttribute('uv'); return p; }), false);
  g.computeVertexNormals();
  return g;
}

function blocked(x, z, keepOut, margin) {
  for (const b of keepOut) if (x > b[0] - margin && x < b[2] + margin && z > b[1] - margin && z < b[3] + margin) return true;
  return false;
}

function distToPath(x, z, path) {
  let best = Infinity;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(a.x + dx * t - x, a.z + dz * t - z));
  }
  return best;
}

const GREENS = [0x2f5422, 0x3b6329, 0x467231, 0x26471b, 0x527d38, 0x355c25, 0x5d8942];

function forest({ keepOut, roads, houses, paths = [] }) {
  const geo = treeGeometry();
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: false });
  const random = rng(42);
  const place = (count, rMin, rMax, sMin, sMax) => {
    const out = [];
    let tries = 0;
    while (out.length < count && tries++ < count * 12) {
      const a = random() * Math.PI * 2, r = rMin + (rMax - rMin) * Math.sqrt(random());
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const h = groundHeight(x, z);
      if (h < SEA_LEVEL + 7) continue;                                        // beach and sea
      if (z < -2600 && x - coastX(z) < 3000) continue;                         // Batumi lowland
      if (blocked(x, z, keepOut, r < 120 ? 3.5 : 3)) continue;                 // hug the podium closely like фасад 2
      // keep the camera sightline from the west-south-west (x < -18, -14 < z < 20) open to the pool & facade
      if (x < -18 && x > -58 && z > -14 && z < 16) continue;
      if (roads.some((road) => distToPath(x, z, road) < 7)) continue;
      if (r < 120 && paths.some((p) => distToPath(x, z, p) < 2.8)) continue;
      if (houses.some((p) => Math.hypot(p.x - x, p.z - z) < p.r + 3)) continue;
      out.push({ x, y: h - 0.3, z, s: sMin + (sMax - sMin) * random(), a: random() * Math.PI * 2, c: GREENS[Math.floor(random() * GREENS.length)], deciduous: random() < 0.35, pick: random() });
    }
    return out;
  };
  // geometry is ~1.6 units tall: lush 6–11 m trees right around the house, bigger canopy further off
  const near = [...place(700, 14, 75, 3.8, 7.2), ...place(2400, 50, 340, 3.5, 6.8)];
  const far = place(4600, 330, 1400, 4.8, 8.5);
  const build = (list, shadows) => {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
    list.forEach((t, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.a);
      s.set(t.s, t.s * (1.05 + (i % 5) * 0.06), t.s);
      m.compose(p.set(t.x, t.y, t.z), q, s);
      im.setMatrixAt(i, m);
      im.setColorAt(i, c.setHex(t.c));
    });
    im.castShadow = shadows;
    im.receiveShadow = true;
    return im;
  };
  const group = new THREE.Group();
  const meshes = [[build(near, true), near], [build(far, false), far]];
  meshes.forEach(([m]) => group.add(m));
  const c = new THREE.Color();
  function setSeason(name) {
    const leaves = SEASON[name].leaves;
    for (const [m, list] of meshes) {
      list.forEach((t, i) => {
        // evergreens stay green all year, a little duller in winter
        if (!t.deciduous) c.setHex(t.c).offsetHSL(0, name === 'winter' ? -0.08 : 0, name === 'winter' ? -0.03 : 0);
        else c.setHex(leaves[Math.floor(t.pick * leaves.length)]);
        m.setColorAt(i, c);
      });
      m.instanceColor.needsUpdate = true;
    }
  }
  return { group, setSeason, dispose() { geo.dispose(); mat.dispose(); } };
}

/* -- neighbours, road, Batumi ------------------------------------------------ */

function neighbourSpots(keepOut, road) {
  const random = rng(7);
  // Above the house on the upper slope there is only 1 neighbouring house; all other neighbours lie further downhill towards the coast.
  const out = [
    { x: 85, z: -48, y: groundHeight(85, -48), w: 10.5, d: 9.0, h: 6, a: 0.35, r: 7.5 },
  ];
  let tries = 0;
  while (out.length < 65 && tries++ < 4000) {
    const a = Math.PI * 0.65 + random() * Math.PI * 0.70;   // strictly downhill towards the sea (west / NW / SW)
    const r = 165 + 880 * random() ** 1.3;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const h = groundHeight(x, z);
    if (x > -120 || h > -16 || h < SEA_LEVEL + 8 || blocked(x, z, keepOut, 18) || distToPath(x, z, road) < 12) continue;
    const w = 8 + random() * 6, d = 9 + random() * 5, hh = 6 + Math.floor(random() * 3) * 3;
    if (out.some((p) => Math.hypot(p.x - x, p.z - z) < p.r + 14)) continue;
    out.push({ x, z, y: h, w, d, h: hh, a: random() * Math.PI, r: Math.max(w, d) * 0.7 });
  }
  return out;
}

function neighbours(spots) {
  const body = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const roof = new THREE.ConeGeometry(0.78, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0);
  const walls = new THREE.InstancedMesh(body, new THREE.MeshStandardMaterial({ roughness: 0.85 }), spots.length);
  const roofs = new THREE.InstancedMesh(roof, new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true }), spots.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  const wallCol = [0xf1ede4, 0xe9e2d2, 0xf4f1ea, 0xdcd3c2, 0xe3e6e8], roofCol = [0x9b3b2c, 0x7d3326, 0x55504c, 0xa8492f, 0x4a4643];
  spots.forEach((p, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.a);
    m.compose(new THREE.Vector3(p.x, p.y - 1.5, p.z), q, new THREE.Vector3(p.w, p.h + 1.5, p.d));
    walls.setMatrixAt(i, m); walls.setColorAt(i, c.setHex(wallCol[i % wallCol.length]));
    m.compose(new THREE.Vector3(p.x, p.y + p.h, p.z), q, new THREE.Vector3(p.w * 1.08, 2.6, p.d * 1.08));
    roofs.setMatrixAt(i, m); roofs.setColorAt(i, c.setHex(roofCol[(i * 7) % roofCol.length]));
  });
  [walls, roofs].forEach((o) => { o.castShadow = true; o.receiveShadow = true; });
  // lit windows after dark: a warm band round most houses, a few stay dark
  const litSpots = spots.filter((p, i) => (i * 37) % 10 < 7);
  const bandMat = new THREE.MeshBasicMaterial({ color: 0xffc98a, transparent: true, opacity: 0, toneMapped: false });
  const bands = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), bandMat, litSpots.length);
  litSpots.forEach((p, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.a);
    m.compose(new THREE.Vector3(p.x, p.y + p.h * 0.45, p.z), q, new THREE.Vector3(p.w * 1.01, 0.7, p.d * 1.01));
    bands.setMatrixAt(i, m);
  });
  const group = new THREE.Group();
  group.add(walls, roofs, bands);
  group.userData.setNight = (f) => { bandMat.opacity = 0.75 * f; };
  return group;
}

function roadPath(from) {
  // Leaves the junction, then climbs the slope behind the house.
  const pts = [[0, 0], [8, 38], [70, 62], [150, 40], [230, 92], [330, 70], [430, 140], [560, 120]]
    .map(([dx, dz]) => new THREE.Vector3(from.x + dx, 0, from.z + dz));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4);
  return curve.getSpacedPoints(Math.round(curve.getLength() / 3));
}

function accessTerrain(drives, garage) {
  const strips = drives.map(({ path, halfWidth }) => ({
    path,
    halfWidth,
    bounds: new THREE.Box3().setFromPoints(path).expandByScalar(halfWidth + 3),
  }));
  const bounds = strips.reduce((combined, strip) => combined.union(strip.bounds), new THREE.Box3());
  if (garage) {
    bounds.expandByPoint(new THREE.Vector3(garage[0] - 2, garage[1], garage[2] - 2));
    bounds.expandByPoint(new THREE.Vector3(garage[3] + 2, garage[4], garage[5] + 2));
  }
  function height(x, z) {
    const base = groundHeight(x, z);
    let top = base;
    for (const { path, halfWidth, bounds: area } of strips) {
      if (x < area.min.x || x > area.max.x || z < area.min.z || z > area.max.z) continue;
      let nearest = Infinity, surface = 0;
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i];
        const dx = b.x - a.x, dz = b.z - a.z;
        const t = THREE.MathUtils.clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
        const distance = Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
        if (distance >= nearest) continue;
        nearest = distance;
        surface = THREE.MathUtils.lerp(a.y, b.y, t);
      }
      top = Math.min(top, THREE.MathUtils.lerp(surface - 0.22, base, smooth(halfWidth + 0.65, halfWidth + 2.4, nearest)));
    }
    if (garage && x >= garage[0] && x <= garage[3] && z >= garage[2] && z <= garage[5]) top = Math.min(top, garage[1] - 0.24);
    return top;
  }
  return { height, bounds: bounds.isEmpty() ? null : [bounds.min.x, bounds.min.z, bounds.max.x, bounds.max.z] };
}

function roadMesh(path, halfWidth, elevation, terrain) {
  const pos = [], skirt = [], idx = [], skirtIdx = [];
  path.forEach((p, i) => {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
    const tx = b.x - a.x, tz = b.z - a.z, l = Math.hypot(tx, tz) || 1;
    const nx = -tz / l, nz = tx / l;
    for (const s of [-1, 1]) {
      const x = p.x + nx * halfWidth * s, z = p.z + nz * halfWidth * s;
      const y = elevation(p, x, z);
      pos.push(x, y, z);
      if (terrain) skirt.push(x, y, z, x, Math.min(y - 0.16, terrain(x, z) - 0.12), z);
    }
    if (i) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); }
    if (i && terrain) {
      for (const k of [i * 4, i * 4 + 2]) skirtIdx.push(k - 4, k - 3, k, k, k - 3, k + 1);
    }
  });
  const mesh = (positions, indices, color) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 0.95, side: THREE.DoubleSide }));
    m.receiveShadow = true;
    return m;
  };
  const group = new THREE.Group();
  group.add(mesh(pos, idx, 0x40464b));
  if (terrain) group.add(mesh(skirt, skirtIdx, 0x4a4e52));
  return group;
}

function batumi() {
  const random = rng(3);
  const n = 70;
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.2, emissive: 0xffc480, emissiveIntensity: 0 }), n);
  const m = new THREE.Matrix4(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const along = (random() - 0.5) * 4200, back = random() * 1400;
    const z = BATUMI.z + along * 0.78, x = coastX(z) + 250 + back;
    const tall = random() < 0.22;
    const h = tall ? 90 + random() * 110 : 25 + random() * 45;
    const w = 18 + random() * 22;
    m.compose(new THREE.Vector3(x, groundHeight(x, z) - 2, z), new THREE.Quaternion(), new THREE.Vector3(w, h, w * (0.7 + random() * 0.6)));
    im.setMatrixAt(i, m);
    im.setColorAt(i, c.setHSL(0.58, 0.05 + random() * 0.08, 0.7 + random() * 0.18));
  }
  return im;
}

/* -- site ----------------------------------------------------------------------- */

/** keepOut: world AABBs [x0, z0, x1, z1] of the house. */
export function createSite(scene, renderer, { keepOut = [], roadFrom = { x: 0, z: 30 }, approaches = [], parkingGround = null, paths = [] } = {}) {
  const group = new THREE.Group();
  scene.add(group);

  const drives = approaches.map(({ points, halfWidth }) => {
    const curve = new THREE.CatmullRomCurve3(points);
    return { halfWidth, path: curve.getSpacedPoints(Math.ceil(curve.getLength() / 0.65)) };
  });
  const road = roadPath(roadFrom);
  const roadElevation = (p, x, z) => {
    const surface = groundHeight(x, z) + 0.25;
    if (!drives.length) return surface;
    return THREE.MathUtils.lerp(roadFrom.y, surface, smooth(0, 14, Math.hypot(p.x - roadFrom.x, p.z - roadFrom.z)));
  };
  const join = drives.length ? [
    { halfWidth: 3.5, path: [roadFrom, roadFrom] },
    { halfWidth: 3, path: road.slice(0, 6).map((p) => new THREE.Vector3(p.x, roadElevation(p, p.x, p.z), p.z)) },
  ] : [];
  const terrain = accessTerrain([...drives, ...join], parkingGround);
  const ground = relief(terrain.height, terrain.bounds);
  group.add(ground);

  const sea = new THREE.Mesh(
    new THREE.CircleGeometry(30000, 64).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x24577f, roughness: 0.18, metalness: 0.25, envMapIntensity: 1.2 })
  );
  sea.position.y = SEA_LEVEL;
  group.add(sea);

  const spots = neighbourSpots(keepOut, road);
  group.add(roadMesh(road, 3, roadElevation));
  for (const { path, halfWidth } of drives) group.add(roadMesh(path, halfWidth, (p) => p.y, terrain.height));
  if (drives.length) {
    const apron = new THREE.Mesh(new THREE.CircleGeometry(3.5, 24).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x40464b, roughness: 0.95 }));
    apron.position.copy(roadFrom);
    apron.position.y -= 0.012;
    apron.receiveShadow = true;
    group.add(apron);
  }
  const houses = neighbours(spots);
  group.add(houses);
  const trees = forest({ keepOut, roads: [road, ...drives.map(({ path }) => path)], houses: spots, paths });
  group.add(trees.group);
  const city = batumi();
  group.add(city);
  const roadLamps = createLamps(alongPath(road, 26, 4.2, groundHeight), { radius: 6 });
  group.add(roadLamps.group);

  // -- sky and light -------------------------------------------------------
  const sky = new Sky();
  sky.scale.setScalar(40000);
  const u = sky.material.uniforms;
  u.turbidity.value = 3.2;
  u.rayleigh.value = 1.1;
  u.mieCoefficient.value = 0.004;
  u.mieDirectionalG.value = 0.82;
  group.add(sky);

  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  const sc = sun.shadow.camera;
  sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60; sc.near = 1; sc.far = 500;
  scene.add(sun, sun.target);

  const hemi = new THREE.HemisphereLight(0xdfeaf7, 0x6f7a5a, 1.1);
  scene.add(hemi);

  scene.fog = new THREE.Fog(0xcfdbe6, 1200, 16000);

  // reflections in the glass and the sea come from this sky
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new Sky();
  envSky.scale.setScalar(1000);
  Object.assign(envSky.material.uniforms.turbidity, { value: 3.2 });
  envScene.add(envSky);
  let envRT = null;
  function refreshEnvironment() {
    envSky.material.uniforms.sunPosition.value.copy(u.sunPosition.value);
    envSky.material.uniforms.rayleigh.value = 1.1;
    envSky.material.uniforms.mieCoefficient.value = 0.004;
    const next = pmrem.fromScene(envScene, 0, 1, 2000);
    if (envRT) envRT.dispose();
    envRT = next;
    scene.environment = envRT.texture;
  }

  const tmp = new THREE.Vector3();
  const centre = new THREE.Vector3();
  const colDay = new THREE.Color(0xfff4e6), colLow = new THREE.Color(0xffb27a);
  const fogDay = new THREE.Color(0xcfdbe6), fogDusk = new THREE.Color(0xd9b9a2), fogNight = new THREE.Color(0x1d2a42);
  const hemiDay = new THREE.Color(0xdfeaf7), hemiNight = new THREE.Color(0x4a66a8);

  /** Where the sun's shadow box is centred and how big it is (tighter inside a flat). */
  function setShadowFocus(point, half) {
    centre.copy(point);
    sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half;
    sc.updateProjectionMatrix();
  }

  /** dir: [x, y, z] towards the sun; altitude in radians. */
  function setSun(dir, altitude) {
    tmp.set(dir[0], dir[1], dir[2]).normalize();
    u.sunPosition.value.copy(tmp);
    sun.position.copy(centre).addScaledVector(tmp, 250);
    sun.target.position.copy(centre);
    const day = smooth(-0.1, 0.25, altitude);
    const low = 1 - smooth(0.05, 0.45, altitude);
    const night = 1 - smooth(-0.12, 0.02, altitude);
    if (night > 0.5) {
      // moonlight from the south-east keeps the night readable: deep blue, not black
      tmp.set(0.45, 0.7, 0.55).normalize();
      sun.position.copy(centre).addScaledVector(tmp, 250);
      sun.intensity = 0.7 * night;
      sun.color.set(0x9fb4e0);
    } else {
      sun.intensity = 3.4 * smooth(-0.02, 0.12, altitude);
      sun.color.copy(colDay).lerp(colLow, low);
    }
    hemi.intensity = 0.22 + 0.95 * day + 1.25 * night;
    hemi.color.copy(hemiDay).lerp(hemiNight, night);
    renderer.toneMappingExposure = 0.3 + 0.4 * day + 0.32 * night;
    roadLamps.setNight(night);
    houses.userData.setNight(night);
    city.material.emissiveIntensity = 0.35 * night;
    scene.fog.color.copy(fogNight).lerp(fogDusk, smooth(-0.15, 0.02, altitude)).lerp(fogDay, smooth(0.05, 0.35, altitude));
    return day;
  }

  /* Season: leaves of the deciduous trees, a touch of colour on the ground and
     snow on the high ridge in winter. */
  const groundColour = ground.geometry.attributes.color, base = ground.userData.base;
  const gpos = ground.geometry.attributes.position;
  let season = null;
  function setSeason(month) {
    const name = seasonOf(month);
    if (name === season) return;
    season = name;
    trees.setSeason(name);
    const [dr, dg, db] = SEASON[name].ground;
    for (let i = 0; i < groundColour.count; i++) {
      const h = gpos.getY(i);
      const forested = h > SEA_LEVEL + 6 ? 1 : 0;
      let r = base[i * 3] + dr * forested, g = base[i * 3 + 1] + dg * forested, b = base[i * 3 + 2] + db * forested;
      const snow = SEASON[name].snow * smooth(380, 620, h);
      r += (0.93 - r) * snow; g += (0.94 - g) * snow; b += (0.96 - b) * snow;
      groundColour.setXYZ(i, r, g, b);
    }
    groundColour.needsUpdate = true;
  }

  /** Hide the modelled landscape (inside a flat the windows show photographs); the sky stays. */
  function setLandscape(on) {
    group.children.forEach((c) => { if (c !== sky) c.visible = on; });
  }

  return {
    group, sun, hemi, setSun, setShadowFocus, refreshEnvironment, setSeason, setLandscape,
    dispose() {
      group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); });
      trees.dispose();
      roadLamps.dispose();
      envSky.material.dispose(); envSky.geometry.dispose();
      if (envRT) envRT.dispose();
      pmrem.dispose();
    },
  };
}
