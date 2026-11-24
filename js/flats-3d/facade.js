/* What makes the massing look like Aurum Fort rather than a block model.

   - White faceted origami lattice (matching the Blender model & architectural
     renders 16.png / фасад 2): straight-edged rectangular window apertures set
     inside a 3D folded 4-pointed star lattice (`✦`) where adjacent bays and
     storeys share each protruding star apex.
   - Tinted glass balustrades along balconies and the stepped setback terraces.
   - The elevated dark-graphite car park deck on the right of the podium, with
     parapet walls, dark asphalt, bay markings and parked cars.

   Everything here is in plan coordinates (metres on the drawing). */
import * as THREE from './three.js';
import { mergeGeometries } from './three.js';
import { PARKING } from './exterior-layout.js?v=2';

/* Fixed plan-space node chains placed along the outer terrace edge; outward
   normals point +Z (south/sea) and +X (east), so the origami exoskeleton sits
   proud in front of the floor slabs and columns. */
const LEFT_CHAIN = [
  { x: 5.75, z: 28.40, d: 0.78 },
  { x: 9.82, z: 29.88, d: 1.15 },
  { x: 13.45, z: 29.28, d: 1.02 },
  { x: 13.98, z: 23.90, d: 0.76 },
];

const RIGHT_CHAIN = [
  { x: 15.32, z: 18.28, d: 0.62 },
  { x: 15.44, z: 19.55, d: 0.96 },
  { x: 17.42, z: 19.78, d: 1.12 },
  { x: 21.65, z: 19.48, d: 0.98 },
  { x: 26.20, z: 19.78, d: 1.12 },
  { x: 31.32, z: 19.48, d: 1.02 },
  { x: 31.58, z: 15.58, d: 0.78 },
];

function enrichChain(raw) {
  const n = raw.length;
  const segN = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = raw[i + 1].x - raw[i].x, dz = raw[i + 1].z - raw[i].z;
    const len = Math.hypot(dx, dz) || 1;
    // Outward normal: when moving +X (dx > 0), outward is +Z (nz > 0); when moving -Z (dz < 0), outward is +X (nx > 0)
    segN.push({ nx: -dz / len, nz: dx / len, tx: dx / len, tz: dz / len, len });
  }
  const nodes = raw.map((p, i) => {
    let nx, nz, tx, tz;
    if (i === 0) {
      nx = segN[0].nx; nz = segN[0].nz; tx = segN[0].tx; tz = segN[0].tz;
    } else if (i === n - 1) {
      nx = segN[n - 2].nx; nz = segN[n - 2].nz; tx = segN[n - 2].tx; tz = segN[n - 2].tz;
    } else {
      nx = segN[i - 1].nx + segN[i].nx;
      nz = segN[i - 1].nz + segN[i].nz;
      const l = Math.hypot(nx, nz) || 1;
      const cosHalf = Math.max(0.58, l / 2);
      nx = (nx / l) / cosHalf;
      nz = (nz / l) / cosHalf;
      tx = segN[i].tx; tz = segN[i].tz;
    }
    return { ...p, nx, nz, tx, tz };
  });
  return { nodes, segN };
}

const LEFT_WING = enrichChain(LEFT_CHAIN);
const RIGHT_WING = enrichChain(RIGHT_CHAIN);

/** Glass balustrades along balconies + stepped setback terraces on Levels 5..7. */
export function balustradeGeometry(edges, y, level = 0) {
  const parts = [], frontages = [];
  let indexOffset = 0;
  const addPanel = (ax, az, bx, bz, h = 1.08) => {
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 0.4) return;
    const g = new THREE.BoxGeometry(len, h, 0.04);
    g.rotateY(-Math.atan2(bz - az, bx - ax));
    g.translate((ax + bx) / 2, y + h / 2, (az + bz) / 2);
    frontages.push({ start: indexOffset, count: g.index.count, edge: [ax, az, bx, bz] });
    indexOffset += g.index.count;
    parts.push(g);
  };
  for (const [ax, az, bx, bz, , , terrace] of edges) {
    if (!terrace) continue;
    addPanel(ax, az, bx, bz, 1.08);
  }
  if (level === 5) {
    addPanel(26.20, 19.65, 31.32, 19.48, 1.10);
    addPanel(31.32, 19.48, 31.55, 15.60, 1.10);
  } else if (level === 6) {
    addPanel(21.65, 19.48, 26.20, 19.65, 1.10);
    addPanel(26.20, 19.65, 31.32, 19.48, 1.10);
    addPanel(31.32, 19.48, 31.32, 14.20, 1.10);
    addPanel(26.20, 14.20, 31.32, 14.20, 1.10);
  } else if (level === 7) {
    addPanel(15.46, 19.35, 21.65, 19.35, 1.10);
    addPanel(21.65, 19.35, 26.20, 19.55, 1.10);
    addPanel(26.20, 19.55, 26.20, 13.55, 1.10);
    addPanel(21.95, 13.55, 26.20, 13.55, 1.10);
    addPanel(5.85, 28.40, 9.82, 29.85, 1.10);
    addPanel(9.82, 29.85, 13.45, 29.25, 1.10);
    addPanel(13.45, 29.25, 13.95, 23.90, 1.10);
  }
  if (!parts.length) return null;
  const merged = mergeGeometries(parts, false);
  merged.userData.frontages = frontages;
  parts.forEach((p) => p.dispose());
  return merged;
}

/** Deterministic star-node position so shared vertices across storeys and bays match 100%. */
function starVertex(wing, idx, y, storeyIdx, back = false) {
  const N = wing.nodes[idx];
  const isEnd = idx === 0 || idx === wing.nodes.length - 1;
  // Alternating origami zig-zag shift along the facade tangent and vertically
  const sign = (idx + storeyIdx) % 2 === 0 ? 1 : -1;
  const shiftT = isEnd ? 0 : sign * 0.24;
  const shiftY = (storeyIdx > 0 && storeyIdx < 5) ? sign * 0.12 : 0;
  const depth = back ? -0.18 : 0.12 + N.d * ((idx + storeyIdx) % 2 === 0 ? 1.05 : 0.78);
  return [
    N.x + N.tx * shiftT + N.nx * depth,
    y + shiftY,
    N.z + N.tz * shiftT + N.nz * depth,
  ];
}

/** Sculpted 4-pointed star origami lattice with crisp 4-sided window openings (16.png & Blender). */
export function frameGeometry(storeys) {
  const pos = [], frontages = [];
  const faceTri = (a, b, c, ox, oy, oz) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    if (cx * ox + cy * oy + cz * oz >= 0) pos.push(...a, ...b, ...c);
    else pos.push(...a, ...c, ...b);
  };
  const faceQuad = (a, b, c, d, ox, oy, oz) => {
    faceTri(a, b, c, ox, oy, oz);
    faceTri(a, c, d, ox, oy, oz);
  };

  function buildWingCell(wing, i, y0, y1, levelIdx, isTopCell) {
    const A = wing.nodes[i], B = wing.nodes[i + 1];
    const seg = wing.segN[i];
    const len = seg.len;
    const nx = seg.nx, nz = seg.nz, tx = seg.tx, tz = seg.tz;

    // Drop the lowest origami soffit 2 cm below Level 2's slab bottom (y0) so
    // the white frame closure never Z-fights with the dark slab underside when
    // viewed from the Level 1 lobby windows.
    const botY = levelIdx === 0 ? y0 - 0.02 : y0;

    // 4 outer star apexes at the 4 corners of this cell
    const S00 = starVertex(wing, i, botY, levelIdx, false);
    const S10 = starVertex(wing, i + 1, botY, levelIdx, false);
    const S11 = starVertex(wing, i + 1, y1, levelIdx + 1, false);
    const S01 = starVertex(wing, i, y1, levelIdx + 1, false);

    // 4 wall-back anchor points
    const B00 = starVertex(wing, i, botY, levelIdx, true);
    const B10 = starVertex(wing, i + 1, botY, levelIdx, true);
    const B11 = starVertex(wing, i + 1, y1, levelIdx + 1, true);
    const B01 = starVertex(wing, i, y1, levelIdx + 1, true);

    // Mid-span ridge points along the 4 edges (recessed relative to S00..S11 so every node flares as a 4-pointed star)
    const HBot = [(S00[0] + S10[0]) / 2 - nx * 0.36, (S00[1] + S10[1]) / 2, (S00[2] + S10[2]) / 2 - nz * 0.36];
    const HTop = [(S01[0] + S11[0]) / 2 - nx * 0.36, (S01[1] + S11[1]) / 2, (S01[2] + S11[2]) / 2 - nz * 0.36];
    const VLft = [(S00[0] + S01[0]) / 2 - A.nx * 0.34, (y0 + y1) / 2, (S00[2] + S01[2]) / 2 - A.nz * 0.34];
    const VRgt = [(S10[0] + S11[0]) / 2 - B.nx * 0.34, (y0 + y1) / 2, (S10[2] + S11[2]) / 2 - B.nz * 0.34];

    // Crisp 4-corner window opening [I_bl, I_br, I_tr, I_tl] with straight edges!
    const padU = Math.min(0.11, 0.38 / len);
    const padY = 0.32;
    const dIn = 0.12;
    const dRev = -0.18;

    const baseWindowCorner = (u, y, depth) => {
      const x = A.x + (B.x - A.x) * u;
      const z = A.z + (B.z - A.z) * u;
      const inx = A.nx * (1 - u) + B.nx * u;
      const inz = A.nz * (1 - u) + B.nz * u;
      return [x + inx * depth, y, z + inz * depth];
    };

    const I_bl = baseWindowCorner(padU, y0 + padY, dIn);
    const I_br = baseWindowCorner(1 - padU, y0 + padY, dIn);
    const I_tr = baseWindowCorner(1 - padU, y1 - padY, dIn);
    const I_tl = baseWindowCorner(padU, y1 - padY, dIn);

    const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
    const I_bm = mid(I_bl, I_br);
    const I_rm = mid(I_br, I_tr);
    const I_tm = mid(I_tr, I_tl);
    const I_lm = mid(I_tl, I_bl);

    const R_bl = baseWindowCorner(padU, y0 + padY, dRev);
    const R_br = baseWindowCorner(1 - padU, y0 + padY, dRev);
    const R_tr = baseWindowCorner(1 - padU, y1 - padY, dRev);
    const R_tl = baseWindowCorner(padU, y1 - padY, dRev);

    // 1. Bottom beam upper sloped facets (sunlit shelf: outward + upward)
    faceTri(S00, HBot, I_bm, nx, 0.4, nz);
    faceTri(S00, I_bm, I_bl, nx, 0.4, nz);
    faceTri(HBot, S10, I_br, nx, 0.4, nz);
    faceTri(HBot, I_br, I_bm, nx, 0.4, nz);

    // 2. Top beam lower sloped facets (shadowed soffit: outward + downward)
    faceTri(S01, I_tl, I_tm, nx, -0.4, nz);
    faceTri(S01, I_tm, HTop, nx, -0.4, nz);
    faceTri(HTop, I_tm, I_tr, nx, -0.4, nz);
    faceTri(HTop, I_tr, S11, nx, -0.4, nz);

    // 3. Left pier right-facing facets (outward + right)
    faceTri(S00, I_bl, I_lm, nx + tx * 0.35, 0, nz + tz * 0.35);
    faceTri(S00, I_lm, VLft, nx + tx * 0.35, 0, nz + tz * 0.35);
    faceTri(VLft, I_lm, I_tl, nx + tx * 0.35, 0, nz + tz * 0.35);
    faceTri(VLft, I_tl, S01, nx + tx * 0.35, 0, nz + tz * 0.35);

    // 4. Right pier left-facing facets (outward + left)
    faceTri(S10, VRgt, I_rm, nx - tx * 0.35, 0, nz - tz * 0.35);
    faceTri(S10, I_rm, I_br, nx - tx * 0.35, 0, nz - tz * 0.35);
    faceTri(VRgt, S11, I_tr, nx - tx * 0.35, 0, nz - tz * 0.35);
    faceTri(VRgt, I_tr, I_rm, nx - tx * 0.35, 0, nz - tz * 0.35);

    // 5. Crisp 4-sided inner window reveals
    faceQuad(I_bl, I_br, R_br, R_bl, 0, 1, 0);
    faceQuad(I_br, I_tr, R_tr, R_br, -tx, 0, -tz);
    faceQuad(I_tr, I_tl, R_tl, R_tr, 0, -1, 0);
    faceQuad(I_tl, I_bl, R_bl, R_tl, tx, 0, tz);

    // Close the back around the opening. From a balcony, glass embedded in
    // a neighbouring pier would otherwise show through its hollow interior.
    faceQuad(B00, B10, R_br, R_bl, -nx, 0, -nz);
    faceQuad(B10, B11, R_tr, R_br, -nx, 0, -nz);
    faceQuad(B11, B01, R_tl, R_tr, -nx, 0, -nz);
    faceQuad(B01, B00, R_bl, R_tl, -nx, 0, -nz);

    // 6. Outer boundary side closures
    if (i === 0) {
      const B_lm = mid(B00, B01);
      faceTri(B00, S00, VLft, -tx, 0, -tz);
      faceTri(B00, VLft, B_lm, -tx, 0, -tz);
      faceTri(B_lm, VLft, S01, -tx, 0, -tz);
      faceTri(B_lm, S01, B01, -tx, 0, -tz);
    }
    if (i === wing.segN.length - 1) {
      const B_rm = mid(B10, B11);
      faceTri(S10, B10, B_rm, tx, 0, tz);
      faceTri(S10, B_rm, VRgt, tx, 0, tz);
      faceTri(VRgt, B_rm, B11, tx, 0, tz);
      faceTri(VRgt, B11, S11, tx, 0, tz);
    }
    if (levelIdx === 0) {
      const B_bm = mid(B00, B10);
      faceTri(B00, B_bm, HBot, 0, -1, 0);
      faceTri(B00, HBot, S00, 0, -1, 0);
      faceTri(B_bm, B10, S10, 0, -1, 0);
      faceTri(B_bm, S10, HBot, 0, -1, 0);
    }
    if (isTopCell) {
      const C_tl = baseWindowCorner(padU, y1 + 0.24, dRev);
      const C_tr = baseWindowCorner(1 - padU, y1 + 0.24, dRev);
      const C_tm = mid(C_tl, C_tr);
      faceTri(S01, HTop, C_tm, nx, 0.5, nz);
      faceTri(S01, C_tm, C_tl, nx, 0.5, nz);
      faceTri(S01, C_tl, B01, nx, 0.5, nz);
      faceTri(HTop, S11, C_tr, nx, 0.5, nz);
      faceTri(HTop, C_tr, C_tm, nx, 0.5, nz);
      faceTri(S11, B11, C_tr, nx, 0.5, nz);
    }
  }

  // Diagonal step-down wedge hood (as seen on the right wing in the Blender model & 16.png)
  function buildStepWedge(wing, i, y0, y1, levelIdx) {
    const start = pos.length / 3;
    const a = wing.nodes[i], b = wing.nodes[i + 1];
    const seg = wing.segN[i];
    const nx = seg.nx, nz = seg.nz;
    const S00 = starVertex(wing, i, y0, levelIdx, false);
    const S10 = starVertex(wing, i + 1, y0, levelIdx, false);
    const S01 = starVertex(wing, i, y0 + (y1 - y0) * 0.62, levelIdx + 1, false);
    const B00 = starVertex(wing, i, y0, levelIdx, true);
    const B10 = starVertex(wing, i + 1, y0, levelIdx, true);
    const B01 = starVertex(wing, i, y0 + (y1 - y0) * 0.62, levelIdx + 1, true);

    faceTri(S00, S10, S01, nx, 0.2, nz);
    faceQuad(S01, S10, B10, B01, nx, 0.7, nz);
    faceQuad(B00, S00, S01, B01, -seg.tx, 0, -seg.tz);
    frontages.push({ start, count: pos.length / 3 - start, wedge: true, edge: [a.x, a.z, b.x, b.z] });
  }

  for (const s of storeys) {
    const levelIdx = Math.round((s.y0 - 3.6) / 3.3);
    if (levelIdx < 0 || levelIdx > 4) continue;

    for (let i = 0; i < LEFT_WING.segN.length; i++) {
      buildWingCell(LEFT_WING, i, s.y0, s.y0 + s.height, levelIdx, levelIdx === 4);
    }

    const maxSeg = levelIdx <= 2 ? 6 : levelIdx === 3 ? 4 : 3;
    for (let i = 0; i < maxSeg; i++) {
      const topHere = (i >= 4 && levelIdx === 2) || (i === 3 && levelIdx === 3) || (i <= 2 && levelIdx === 4);
      buildWingCell(RIGHT_WING, i, s.y0, s.y0 + s.height, levelIdx, topHere);
    }
    if (levelIdx === 3) buildStepWedge(RIGHT_WING, 4, s.y0, s.y0 + s.height, levelIdx);
    if (levelIdx === 4) buildStepWedge(RIGHT_WING, 3, s.y0, s.y0 + s.height, levelIdx);
  }

  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.userData.frontages = frontages;
  // Keep the piers closed. During a walk only a complete intersecting wedge
  // is removed; slicing a pier open would expose the railing inside it.
  g.userData.clipToFloor = false;
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/* -- car park ------------------------------------------------------------- */

const CAR_COLOURS = [0x354859, 0xbfc5c9, 0x242832, 0x5b6879, 0x798387, 0xd2cbc2];

function carGeometry() {
  const body = new THREE.BoxGeometry(4.4, 0.58, 1.82); body.translate(0, 0.54, 0);
  const cabin = new THREE.BoxGeometry(2.3, 0.48, 1.58); cabin.translate(-0.15, 1.06, 0);
  const parts = [body, cabin];
  for (const [x, z] of [[1.4, -0.85], [1.4, 0.85], [-1.4, -0.85], [-1.4, 0.85]]) {
    const w = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 12); w.rotateX(Math.PI / 2); w.translate(x, 0.33, z);
    parts.push(w);
  }
  const g = mergeGeometries(parts.map((p) => p.toNonIndexed()), false);
  parts.forEach((p) => p.dispose());
  return g;
}

/** Open top deck above a covered garage, with an entrance at each elevation. */
export function carPark(y, lowerY) {
  const group = new THREE.Group();
  const { bounds: [x0, z0, x1, z1], upper, lower, deckThickness } = PARKING;
  const w = x1 - x0, d = z1 - z0;
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x38414f, roughness: 0.82 });
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x40464b, roughness: 0.95 });
  const boxes = [];
  const box = (a, b, c, e, base, height) => boxes.push(new THREE.BoxGeometry(c - a, height, e - b)
    .translate((a + c) / 2, base + height / 2, (b + e) / 2));
  box(x0, z0, x1, z1, y - deckThickness, deckThickness);
  box(x0, z0, x1, z1, lowerY - 0.22, 0.22);
  const wall = 0.26;
  const clearHeight = y - deckThickness - lowerY;
  const entryStart = lower.z - lower.halfWidth;
  const entryEnd = lower.z + lower.halfWidth;
  box(x0, z0, x0 + wall, z1, lowerY, clearHeight);
  // Low sea-facing retaining wall with open bays below the deck.
  box(x0, z1 - wall, x1, z1, lowerY, 0.84);
  for (const x of [x0 + wall / 2, x0 + w / 3, x1 - w / 3, x1 - wall / 2]) {
    box(x - wall / 2, z1 - wall, x + wall / 2, z1, lowerY + 0.84, clearHeight - 0.84);
  }
  box(x0, z0, x1, z0 + wall, lowerY, clearHeight);
  box(x1 - wall, z0, x1, entryStart, lowerY, clearHeight);
  box(x1 - wall, entryEnd, x1, z1, lowerY, clearHeight);
  box(x0, z1 - wall, x1, z1, y, 0.75);
  box(x1 - wall, z0, x1, z1, y, 0.75);
  box(x0, z0, upper.x - upper.halfWidth, z0 + wall, y, 0.75);
  box(upper.x + upper.halfWidth, z0, x1, z0 + wall, y, 0.75);
  const structure = new THREE.Mesh(mergeGeometries(boxes, false), deckMat);
  boxes.forEach((p) => p.dispose());
  structure.castShadow = structure.receiveShadow = true;
  group.add(structure);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.19, entryEnd - entryStart + 0.4),
    new THREE.MeshStandardMaterial({ color: 0x929da5, roughness: 0.8 }));
  lintel.position.set(x1 + 0.03, y - deckThickness + 0.105, lower.z);
  lintel.receiveShadow = true;
  group.add(lintel);
  const fixture = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 3.4),
    new THREE.MeshStandardMaterial({ color: 0xffedd7, emissive: 0xffd6a5, emissiveIntensity: 0.75 }));
  fixture.position.set(x1 - 1.3, y - deckThickness - 0.02, lower.z);
  const entranceLight = new THREE.PointLight(0xffddb8, 20, 7);
  entranceLight.position.set(x1 - 1.75, y - deckThickness - 0.45, lower.z);
  group.add(fixture, entranceLight);
  for (const elevation of [y, lowerY]) {
    const surface = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), asphalt);
    surface.position.set((x0 + x1) / 2, elevation + 0.02, (z0 + z1) / 2);
    surface.receiveShadow = true;
    group.add(surface);
  }

  const lines = [];
  const bayZ0 = z0 + 1.2, bayPitch = 2.0, bayCount = 5;
  for (let i = 0; i <= bayCount; i++) {
    const bz = bayZ0 + i * bayPitch;
    const l = new THREE.PlaneGeometry(5.0, 0.1).rotateX(-Math.PI / 2);
    l.translate(x1 - 2.9, y + 0.03, bz);
    lines.push(l);
  }
  const frontLine = new THREE.PlaneGeometry(0.1, bayCount * bayPitch).rotateX(-Math.PI / 2);
  frontLine.translate(x1 - 5.4, y + 0.03, bayZ0 + (bayCount * bayPitch) / 2);
  lines.push(frontLine);
  const lowerBays = 4, lowerPitch = 2.65, lowerStart = x0 + 1.1;
  for (let i = 0; i <= lowerBays; i++) {
    lines.push(new THREE.PlaneGeometry(0.08, 4.65).rotateX(-Math.PI / 2)
      .translate(lowerStart + i * lowerPitch, lowerY + 0.03, z1 - 2.5));
  }

  const lineMesh = new THREE.Mesh(mergeGeometries(lines, false), new THREE.MeshBasicMaterial({ color: 0xd8dce2 }));
  lines.forEach((l) => l.dispose());
  group.add(lineMesh);

  const cars = new THREE.InstancedMesh(
    carGeometry(),
    new THREE.MeshStandardMaterial({ roughness: 0.22, metalness: 0.65 }),
    bayCount + lowerBays
  );
  const m = new THREE.Matrix4(), c = new THREE.Color();
  for (let i = 0; i < bayCount; i++) {
    const bz = bayZ0 + (i + 0.5) * bayPitch;
    m.makeRotationY(0).setPosition(x1 - 2.9, y, bz);
    cars.setMatrixAt(i, m);
    cars.setColorAt(i, c.setHex(CAR_COLOURS[i % CAR_COLOURS.length]));
  }
  for (let i = 0; i < lowerBays; i++) {
    m.makeRotationY(Math.PI / 2).setPosition(lowerStart + (i + 0.5) * lowerPitch, lowerY + 0.02, z1 - 2.45);
    cars.setMatrixAt(bayCount + i, m);
    cars.setColorAt(bayCount + i, c.setHex(CAR_COLOURS[(i + 1) % CAR_COLOURS.length]));
  }
  cars.castShadow = true;
  cars.receiveShadow = true;
  group.add(cars);

  return {
    group,
    dispose() {
      group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    },
  };
}
