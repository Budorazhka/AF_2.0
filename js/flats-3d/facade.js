/* What makes the massing look like Aurum Fort rather than a block model.

   - White faceted frames (the renders' "origami" lattice): one cell per storey
     and per 2.5–3.5 m of every terrace front or street-facing glazing (edges come
     from building.py). Lattice nodes are jittered by a hash of their position,
     so a node shared by two cells — side by side or one above the other — moves
     the same way and the frames join up into one lattice, staggered like the
     real facade. Each node also gets its own depth: the frame is folded, not flat.
   - The car park on the lobby level (12 bays read from sheet I), with cars.

   Everything here is in plan coordinates (metres on the drawing). */
import * as THREE from './three.js';
import { mergeGeometries } from './three.js';

function hash(a, b, c) {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const BAND = 0.66;        // frame width (the renders' frames are broad)
const BACK = 0.06;        // frames start just outside the facade line

/* Terrace fronts and glazing along one facade line arrive as separate pieces;
   joined, they give one continuous run of cells instead of a scatter of
   narrow frames. Edges are grouped by direction and by distance from the
   origin along their normal, then overlapping intervals are merged. */
function mergeEdges(edges) {
  const groups = new Map();
  for (const e of edges) {
    const [ax, az, bx, bz, nx, nz] = e;
    const key = Math.round(Math.atan2(nz, nx) * 36 / Math.PI) + ':' + Math.round((ax * nx + az * nz) / 0.4);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }
  const out = [];
  for (const list of groups.values()) {
    const [, , , , nx, nz] = list[0];
    const tx = -nz, tz = nx;
    const off = list.reduce((m, e) => m + e[0] * nx + e[1] * nz, 0) / list.length;
    const spans = list.map((e) => {
      const a = e[0] * tx + e[1] * tz, b = e[2] * tx + e[3] * tz;
      return [Math.min(a, b), Math.max(a, b)];
    }).sort((p, q) => p[0] - q[0]);
    let cur = spans[0].slice();
    const flush = () => out.push([nx * off + tx * cur[0], nz * off + tz * cur[0], nx * off + tx * cur[1], nz * off + tz * cur[1], nx, nz]);
    for (const sp of spans.slice(1)) {
      if (sp[0] <= cur[1] + 0.6) cur[1] = Math.max(cur[1], sp[1]);
      else { flush(); cur = sp.slice(); }
    }
    flush();
  }
  return out;
}

/** Glass balustrades along terrace fronts, following their real (often slanted) line. */
export function balustradeGeometry(edges, y) {
  const parts = [];
  for (const [ax, az, bx, bz, , , terrace] of edges) {
    if (!terrace) continue;
    const len = Math.hypot(bx - ax, bz - az);
    const g = new THREE.BoxGeometry(len, 1.1, 0.03);
    g.rotateY(-Math.atan2(bz - az, bx - ax));
    g.translate((ax + bx) / 2, y + 0.55, (az + bz) / 2);
    parts.push(g);
  }
  if (!parts.length) return null;
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
}

/** One merged, flat-shaded geometry with every frame cell of the given storeys. */
export function frameGeometry(storeys) {
  const pos = [];
  const quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  const node = (x, z, y, tx, tz, nx, nz, endOfEdge) => {
    const kx = Math.round(x * 5), kz = Math.round(z * 5), ky = Math.round(y * 5);
    const r1 = hash(kx, kz, ky), r2 = hash(kz, ky, kx), r3 = hash(ky, kx, kz);
    let along = (r1 - 0.5) * 1.1;
    if (endOfEdge) along *= 0.2;                      // building corners stay put
    const up = (r2 - 0.5) * 0.55;
    const depth = 0.3 + r3 * 0.6;
    return { x: x + tx * along, z: z + tz * along, y: y + up, depth, nx, nz };
  };
  const at = (p, depth) => [p.x + p.nx * depth, p.y, p.z + p.nz * depth];

  for (const s of storeys) {
    for (const [ax, az, bx, bz, nx, nz] of mergeEdges(s.edges.map((e) => e.slice(0, 6)))) {
      const len = Math.hypot(bx - ax, bz - az);
      if (len < 1) continue;
      const tx = (bx - ax) / len, tz = (bz - az) / len;
      const cells = Math.max(1, Math.round(len / 3.6));
      const bottom = [], top = [];
      for (let k = 0; k <= cells; k++) {
        const x = ax + (bx - ax) * (k / cells), z = az + (bz - az) * (k / cells);
        const end = k === 0 || k === cells;
        bottom.push(node(x, z, s.y0, tx, tz, nx, nz, end));
        top.push(node(x, z, s.y0 + s.height, tx, tz, nx, nz, end));
      }
      for (let k = 0; k < cells; k++) {
        const outer = [bottom[k], bottom[k + 1], top[k + 1], top[k]];
        const cxm = outer.reduce((m, p) => m + p.x, 0) / 4, cym = outer.reduce((m, p) => m + p.y, 0) / 4, czm = outer.reduce((m, p) => m + p.z, 0) / 4;
        // inner ring: each corner pulled towards the cell centre by the band width
        const inner = outer.map((p) => {
          const dx = cxm - p.x, dy = cym - p.y, dz = czm - p.z;
          const d = Math.hypot(dx, dy, dz) || 1;
          const k2 = (BAND * 1.4) / d;
          return { ...p, x: p.x + dx * k2, y: p.y + dy * k2, z: p.z + dz * k2, depth: p.depth * 0.82 };
        });
        for (let i = 0; i < 4; i++) {
          const j = (i + 1) % 4;
          const o0 = outer[i], o1 = outer[j], i0 = inner[i], i1 = inner[j];
          quad(at(o0, o0.depth), at(o1, o1.depth), at(i1, i1.depth), at(i0, i0.depth));     // face
          quad(at(i0, i0.depth), at(i1, i1.depth), at(i1, BACK), at(i0, BACK));               // reveal around the opening
          quad(at(o1, o1.depth), at(o0, o0.depth), at(o0, BACK), at(o1, BACK));               // outer side
        }
      }
    }
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();          // non-indexed: every facet keeps its own normal
  return g;
}

/* -- car park ------------------------------------------------------------- */

const CAR_COLOURS = [0x1d1f23, 0xe9e9e6, 0x8d9297, 0x2b3445, 0x5b5f63, 0xd8d4cb, 0x3a2a26];

function carGeometry() {
  const body = new THREE.BoxGeometry(1.8, 0.62, 4.5); body.translate(0, 0.58, 0);
  const cabin = new THREE.BoxGeometry(1.6, 0.5, 2.4); cabin.translate(0, 1.13, -0.2);
  const parts = [body, cabin];
  for (const [x, z] of [[-0.85, 1.45], [0.85, 1.45], [-0.85, -1.4], [0.85, -1.4]]) {
    const w = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12); w.rotateZ(Math.PI / 2); w.translate(x, 0.34, z);
    parts.push(w);
  }
  const g = mergeGeometries(parts.map((p) => p.toNonIndexed()), false);
  parts.forEach((p) => p.dispose());
  return g;
}

/** Asphalt, markings and parked cars. y: deck level. Returns {group, dispose}. */
export function carPark(bays, y) {
  const group = new THREE.Group();
  if (!bays || !bays.length) return { group, dispose() {} };
  const x0 = Math.min(...bays.map((b) => b[0])), x1 = Math.max(...bays.map((b) => b[2]));
  const z0 = Math.min(...bays.map((b) => b[1])), z1 = Math.max(...bays.map((b) => b[3]));
  const aisle = 6;   // driving lane in front of the bays, towards the building
  const geos = [];

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(x1 - x0 + 1.2, 4.3, z1 - z0 + aisle + 0.6),
    new THREE.MeshStandardMaterial({ color: 0x3d4148, roughness: 0.85 })
  );
  deck.position.set((x0 + x1) / 2, y - 2.15, (z0 + z1 - aisle) / 2);
  deck.receiveShadow = true;
  group.add(deck);
  const asphalt = new THREE.Mesh(
    new THREE.PlaneGeometry(x1 - x0 + 1.2, z1 - z0 + aisle + 0.6).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x55595f, roughness: 0.95 })
  );
  asphalt.position.set((x0 + x1) / 2, y + 0.01, (z0 + z1 - aisle) / 2);
  asphalt.receiveShadow = true;
  group.add(asphalt);

  const lines = [];
  for (const b of bays) {
    for (const x of [b[0], b[2]]) {
      const l = new THREE.PlaneGeometry(0.12, b[3] - b[1]).rotateX(-Math.PI / 2);
      l.translate(x, y + 0.02, (b[1] + b[3]) / 2);
      lines.push(l);
    }
  }
  const lineMesh = new THREE.Mesh(mergeGeometries(lines, false), new THREE.MeshBasicMaterial({ color: 0xe8e8e3 }));
  lines.forEach((l) => l.dispose());
  group.add(lineMesh);

  const parked = bays.filter((b, i) => hash(i, Math.round(b[0]), 7) > 0.35);
  const cars = new THREE.InstancedMesh(carGeometry(), new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.5 }), parked.length);
  const m = new THREE.Matrix4(), c = new THREE.Color();
  parked.forEach((b, i) => {
    const flip = hash(i, 3, 9) > 0.5 ? Math.PI : 0;
    m.makeRotationY(flip).setPosition((b[0] + b[2]) / 2, y, (b[1] + b[3]) / 2 + 0.2);
    cars.setMatrixAt(i, m);
    cars.setColorAt(i, c.setHex(CAR_COLOURS[i % CAR_COLOURS.length]));
  });
  cars.castShadow = true;
  cars.receiveShadow = true;
  group.add(cars);

  return {
    group,
    dispose() {
      group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      geos.forEach((g) => g.dispose());
    },
  };
}
