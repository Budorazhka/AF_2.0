/* Aurum Fort massing built from assets/data/building-3d.json
   (generated from the ArchiCAD floor plans by apartment-3d/building.py).

   Plan coordinates are metres on the drawing: x to the right of the sheet,
   z down the sheet. Everything is built in plan coordinates inside `inner`;
   `outer` turns the sheet so that its "down" faces the real azimuth (the sea). */
import * as THREE from './three.js';
import { storeyQuads, subtractSlabOpenings } from './storey-surfaces.js?v=2';
import { frameGeometry, balustradeGeometry, carPark } from './facade.js?v=23';
import { PARKING, SETBACK_ROOFS, parkingAccess, replacesWalkFrontage } from './exterior-layout.js?v=2';
import { trimWalkStorey, rectCutout } from './walk-shell.js?v=3';

export const SLAB = 0.3;
const CUT = 1.25;          // wall height left standing when a floor is opened
const EYE = 1.4;           // height of window sample points for the sun estimate

export const STATUS_COLORS = {
  active: '#1c4e89', booked: '#9a7a3c', sold: '#a3433a', reserved: '#6a5a8c', unavailable: '#9a9a9a',
};

function boxes(rects, y0, h, colours) {
  const quads = storeyQuads(rects, y0, h);
  if (!quads.length) return null;
  const positions = [], indices = [];
  for (const quad of quads) {
    const i = positions.length / 3;
    for (const v of quad) positions.push(...v);
    indices.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.setIndex(indices);
  merged.computeVertexNormals();
  if (colours) {
    // slabs: light walking surface on top (the plan drawing sits on it), dark edge outside
    const n = merged.attributes.normal, col = new Float32Array(n.count * 3);
    const top = new THREE.Color(colours.top), side = new THREE.Color(colours.side);
    for (let i = 0; i < n.count; i++) (n.getY(i) > 0.5 ? top : side).toArray(col, i * 3);
    merged.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  return merged;
}

function flatShape(poly, y) {
  const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, z)));
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

function centroid(poly) {
  let a = 0, cx = 0, cz = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, z0] = poly[i], [x1, z1] = poly[(i + 1) % poly.length];
    const c = x0 * z1 - x1 * z0;
    a += c; cx += (x0 + x1) * c; cz += (z0 + z1) * c;
  }
  return a ? [cx / (3 * a), cz / (3 * a)] : poly[0];
}

export function createBuilding(data, apartments, { basePath = '', onUpdate = null } = {}) {
  const byNumber = new Map(apartments.map((a) => [String(a.apartmentNumber), a]));
  const outer = new THREE.Group();
  const inner = new THREE.Group();
  outer.add(inner);
  outer.rotation.y = Math.PI - (data.planDownAzimuth * Math.PI) / 180;

  // colours taken from 16.png & фасад 2: deep slate-graphite body, crisp white origami frames, dark reflective glass
  const mats = {
    slab: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78 }),
    wall: new THREE.MeshStandardMaterial({ color: 0x455164, roughness: 0.82 }),
    wallCut: new THREE.MeshStandardMaterial({ color: 0xe6e2da, roughness: 0.9 }),
    shell: new THREE.MeshStandardMaterial({ color: 0x3b4556, roughness: 0.72, metalness: 0.08 }),
    column: new THREE.MeshStandardMaterial({ color: 0x424d5f, roughness: 0.78 }),
    frame: new THREE.MeshStandardMaterial({ color: 0xf7f8fa, roughness: 0.36, metalness: 0.02, side: THREE.DoubleSide }),
    glass: new THREE.MeshStandardMaterial({ color: 0x162433, roughness: 0.05, metalness: 0.76, transparent: true, opacity: 0.88, envMapIntensity: 2.0 }),
    mullion: new THREE.MeshStandardMaterial({ color: 0x1a2029, roughness: 0.4, metalness: 0.35 }),
    rail: new THREE.MeshStandardMaterial({ color: 0x8cb4cc, roughness: 0.05, metalness: 0.25, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide }),
    pool: new THREE.MeshStandardMaterial({ color: 0x3cb4d4, roughness: 0.06, metalness: 0.12 }),
    deck: new THREE.MeshStandardMaterial({ color: 0x9b7c5b, roughness: 0.82 }),
    hall: new THREE.MeshStandardMaterial({ color: 0xe2ded6, roughness: 0.9 }),
  };
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };
  const mesh = (geo, mat, shadow = true) => {
    if (!geo) return null;
    keep(geo);
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = shadow;
    m.receiveShadow = true;
    return m;
  };

  // centre on the residential floors so the camera orbits the tower, not the podium
  const ref = data.levels.find((l) => l.level === 2) || data.levels[0];
  const xs = ref.slab.flatMap((r) => [r[0], r[2]]), zs = ref.slab.flatMap((r) => [r[1], r[3]]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  inner.position.set(-cx, 0, -cz);

  const loader = new THREE.TextureLoader();
  const levels = [];
  let y = -data.levels[0].height;
  for (const lv of data.levels) {
    const L = { level: lv.level, kind: lv.kind, y0: y, floor: y + SLAB, height: lv.height, units: [], data: lv };
    const g = new THREE.Group();
    g.userData.level = lv.level;
    const vert = new THREE.Group();           // everything that is cut down when the floor is opened
    vert.position.y = L.floor;
    const full = lv.height - SLAB;

    const add = (parent, m) => { if (m) { m.userData.level = lv.level; parent.add(m); } return m; };
    // light walking surface on top so the floor plan drawing reads clearly when opened; slate-graphite exterior edge
    const slabColours = { top: 0xe7e4de, side: 0x3b4556 };
    L.slabColours = slabColours;
    const extraSlab = SETBACK_ROOFS[lv.level] || (lv.level === 1 || lv.level === -1
      ? [
          [3.90, 9.60, 13.70, 29.40],
          [5.50, 28.20, 13.70, 30.00],
          [13.55, 9.60, 31.55, 19.85],
        ]
      : [
          // Ensure residential slabs reach the exact outer columns under both wings
          [5.65, 28.20, 13.65, 29.85],
          ...(lv.level <= 5 ? [[15.30, 18.00, 31.45, 19.65]] : []),
        ]);
    const baseSlab = lv.kind === 'spa' || lv.kind === 'lobby'
      ? lv.slab
          .filter((r) => !(r[0] < 13.8 && r[3] > 18.0))
          .map((r) => [r[0], r[1], r[2], Math.min(r[3], r[0] > 13.8 ? 19.85 : 29.85)])
      : lv.kind === 'residential'
      ? lv.slab.map((r) => [
          r[0],
          r[1],
          r[0] > 28 && r[3] > 15.2 ? Math.min(r[2], 31.45) : r[0] > 11.5 && r[0] < 14.5 && r[3] > 23.5 ? Math.min(r[2], 13.85) : r[2],
          r[0] > 14.5 ? Math.min(r[3], 19.65) : Math.min(r[3], 29.85),
        ])
      : lv.slab;
    L.slabRects = [...baseSlab, ...extraSlab];
    L.slabMesh = add(g, mesh(boxes(L.slabRects, y, SLAB, slabColours), mats.slab));
    if (lv.kind === 'roof') {
      add(g, mesh(boxes(lv.pool || [], L.floor, 0.04), mats.pool, false));
      add(g, mesh(boxes(lv.decks || [], L.floor, 0.06), mats.deck, false));
      if (!lv.outline) {
        // older data without the roof outline: plain housings and raster balustrade
        add(vert, mesh(boxes(lv.walls, 0, 2.8), mats.wall));
        add(g, mesh(boxes(lv.rails, L.floor, 1.1), mats.rail, false));
      }   // otherwise the roof terrace (amenities.js) draws housings, deck and glass
    } else {
      const trimFront = (rects) => rects
        .filter((r) => {
          if (r[0] > 29.5 && r[3] > 18.2) return false;
          if (lv.kind === 'spa' || lv.kind === 'lobby') {
            if (r[3] > 18.2) return false;
          }
          if (lv.kind === 'residential') {
            if (r[0] > 14.2 && r[1] >= 19.15) return false;
            if (r[0] <= 14.2 && r[1] >= 28.35) return false;
            if (r[0] > 12.25 && r[0] <= 14.2 && r[3] > 19.5) return false;
          }
          return true;
        })
        .map((r) => {
          if (lv.kind === 'residential') {
            const zMax = r[0] > 14.2 ? 19.20 : 28.35;
            return [r[0], r[1], r[2], Math.min(r[3], zMax)];
          }
          return r;
        });

      const extraWalls = lv.level === 1 ? [
        // Solid slate-graphite left wing pier & back walls on Level 1 (matching Blender & фасад 2)
        [3.90, 9.60, 4.30, 28.40],
        [3.90, 9.60, 5.85, 18.20],
        [5.45, 18.00, 5.85, 28.40],
        [11.20, 18.00, 13.55, 18.40],
      ] : [];
      const extraCols = lv.level === 1 ? [
        // Ground-floor structural columns directly supporting every node of the 2nd-floor origami frames (Blender & фасад 2)
        [5.50, 28.15, 6.00, 28.65],
        [9.57, 29.50, 10.07, 30.00],
        [13.20, 29.00, 13.70, 29.50],
        [13.50, 23.65, 14.00, 24.15],
        [13.20, 18.00, 13.70, 18.50],
        [15.20, 19.25, 15.70, 19.75],
        [17.17, 19.45, 17.67, 19.95],
        [21.40, 19.20, 21.90, 19.70],
        [25.95, 19.45, 26.45, 19.95],
        [31.05, 19.20, 31.55, 19.70],
      ] : [];
      const extraLobbyGlass = lv.level === 1 ? [
        // Left wing ground-floor lobby windows & storefront glazing
        [4.30, 28.15, 5.50, 28.35],
        [6.00, 28.55, 9.57, 29.65],
        [10.07, 29.25, 13.20, 29.55],
        [13.35, 24.15, 13.60, 29.00],
        [13.35, 18.50, 13.60, 23.65],
        // Right wing restaurant storefront glazing under the 3 retractable awnings
        [13.70, 19.25, 15.20, 19.45],
        [15.70, 19.35, 17.17, 19.55],
        [17.67, 19.35, 21.40, 19.55],
        [21.90, 19.35, 25.95, 19.55],
        [26.45, 19.35, 31.05, 19.55],
      ] : [];

      L.walls = add(vert, mesh(boxes([...trimFront(lv.walls), ...extraWalls], 0, full), mats.wall));
      L.shell = add(vert, mesh(boxes(trimFront(lv.shell || []), 0, full), lv.kind === 'lobby' ? mats.glass : mats.shell));
      L.columns = add(vert, mesh(boxes([...trimFront(lv.columns), ...extraCols], 0, full), mats.column));
      // dark window mullions along the glazed strips so windows have architectural framing like 16.png
      const mullionRects = [];
      for (const r of [...(lv.glass || []), ...extraLobbyGlass]) {
        const gw = r[2] - r[0], gd = r[3] - r[1];
        if (Math.max(gw, gd) < 0.9) continue;
        const horiz = gw >= gd, span = horiz ? gw : gd;
        const n = Math.max(1, Math.round(span / 1.15));
        for (let i = 0; i <= n; i++) {
          const t = i / n;
          if (horiz) {
            const mx = r[0] + gw * t;
            mullionRects.push([mx - 0.03, r[1] - 0.02, mx + 0.03, r[3] + 0.02]);
          } else {
            const mz = r[1] + gd * t;
            mullionRects.push([r[0] - 0.02, mz - 0.03, r[2] + 0.02, mz + 0.03]);
          }
        }
      }
      if (mullionRects.length) add(vert, mesh(boxes(mullionRects, 0, full), mats.mullion, false));
      if (lv.facade && lv.facade.length) {
        // own material per floor: hovering a floor lights its whole band of frames
        L.frameMat = keep(mats.frame.clone());
        L.frames = add(g, mesh(keep(frameGeometry([{ y0: y, height: lv.height, edges: lv.facade }])), L.frameMat));
      }
      L.commonGlass = add(vert, mesh(boxes([...lv.glass.filter((r) => r[4] < 0), ...extraLobbyGlass], 0, full), mats.glass));
      // balustrades along the drawn terrace fronts and stepped setback terraces
      L.rails = add(g, mesh(lv.facade && lv.facade.some((e) => e[6]) ? balustradeGeometry(lv.facade, L.floor, lv.level) : boxes(lv.rails, L.floor, 1.1), mats.rail, false));
      L.decks = add(g, mesh(boxes(lv.units.flatMap((u) => u.decks || []), L.floor, 0.05), mats.deck, false));
    }
    L.vert = vert;
    L.full = full;
    if (lv.glow) {
      // the whole floor lights up on hover: a closed volume round its outline
      const shape = new THREE.Shape(lv.glow.map(([x, z]) => new THREE.Vector2(x, -z)));
      const vol = new THREE.ExtrudeGeometry(shape, { depth: lv.height - 0.12, bevelEnabled: false });
      vol.rotateX(-Math.PI / 2);
      vol.translate(0, y + 0.06, 0);
      L.glowMat = keep(new THREE.MeshBasicMaterial({ color: 0xc09a50, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false }));
      L.glow = new THREE.Mesh(keep(vol), L.glowMat);
      L.glow.renderOrder = 6;
      L.glow.visible = false;
      L.glow.userData.level = lv.level;
      L.glow.userData.hoverVolume = true;
      // bright edges so the floor reads even against the white frames
      const edges = new THREE.LineSegments(keep(new THREE.EdgesGeometry(vol, 25)), keep(new THREE.LineBasicMaterial({ color: 0xffe2a6, toneMapped: false })));
      edges.renderOrder = 7;
      L.glow.add(edges);
      g.add(L.glow);
    }

    // -- flats --------------------------------------------------------------
    lv.units.forEach((u, k) => {
      const apt = byNumber.get(String(u.number));
      const status = apt ? apt.status : 'unavailable';
      const color = new THREE.Color(STATUS_COLORS[status] || STATUS_COLORS.unavailable);
      const glassMat = keep(mats.glass.clone());
      const glass = add(vert, mesh(boxes(lv.glass.filter((r) => r[4] === k), 0, full), glassMat));

      const zoneMat = keep(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
      const zone = new THREE.Mesh(keep(flatShape(u.poly, L.floor + 0.035)), zoneMat);
      zone.visible = false;
      zone.renderOrder = 2;
      zone.userData = { level: lv.level, number: u.number };
      g.add(zone);

      const edgeMat = keep(new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
      const edgeGeo = keep(new THREE.BufferGeometry().setFromPoints(u.poly.map(([x, z]) => new THREE.Vector3(x, L.floor + 0.05, z))));
      const edge = new THREE.LineLoop(edgeGeo, edgeMat);
      edge.visible = false;
      g.add(edge);

      const [ux, uz] = centroid(u.poly);
      L.units.push({
        number: String(u.number), apt, status, color, data: u, level: lv.level,
        glass, glassMat, zone, zoneMat, edge, edgeMat,
        anchor: new THREE.Vector3(ux, L.floor + 0.6, uz),   // plan coords, converted on demand
        night: 0.35 + ((k * 7919 + lv.level * 104729) % 100) / 160,   // which flats have lights on
      });
    });

    // floor drawing laid on the slab (lazy-loaded when that floor is opened)
    L.planUrl = lv.plan || null;
    L.plan = null;

    g.add(vert);
    inner.add(g);
    L.group = g;
    levels.push(L);
    y += lv.height;
  }
  const top = y;

  // car park on the lobby level: attached to lobby group so it hides during walk-through
  const lobby = levels.find((l) => l.level === 1);
  const spa = levels.find((l) => l.kind === 'spa');
  let parkGroup = null;
  if (data.parking?.length && lobby && spa) {
    const park = carPark(lobby.y0, spa.floor);
    lobby.group.add(park.group);
    parkGroup = park.group;
    disposables.push(park);
  }

  outer.updateMatrixWorld(true);
  const toWorld = (v) => v.clone().applyMatrix4(inner.matrixWorld);
  const approaches = parkGroup ? parkingAccess(lobby.y0 + 0.02, spa.floor + 0.02).map(({ halfWidth, points }) => ({
    halfWidth,
    points: points.map(([x, height, z]) => toWorld(new THREE.Vector3(x, height, z))),
  })) : [];

  // -- occluders and windows for the sun estimate ---------------------------
  const occluders = [];
  const corner = new THREE.Vector3();
  function pushBox(r, y0, y1) {
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const [px, pz] of [[r[0], r[1]], [r[2], r[3]]]) {
      corner.set(px, 0, pz).applyMatrix4(inner.matrixWorld);
      x0 = Math.min(x0, corner.x); x1 = Math.max(x1, corner.x); z0 = Math.min(z0, corner.z); z1 = Math.max(z1, corner.z);
    }
    const box = [x0, y0, z0, x1, y1, z1];
    occluders.push(box);
    return box;
  }
  for (const L of levels) {
    for (const r of [...L.data.slab, ...(SETBACK_ROOFS[L.level] || [])]) pushBox(r, L.y0, L.floor);
    const h = L.kind === 'roof' ? 2.8 : L.full;
    for (const r of [...L.data.walls, ...(L.data.shell || []), ...(L.data.glass || []), ...(L.data.columns || [])]) pushBox(r, L.floor, L.floor + h);
  }

  // ground the forest must stay off: podium, tower and car park (world AABBs)
  const keepOut = [];
  const occluderCount = occluders.length;
  for (const L of levels) if (L.level <= 2) for (const r of L.data.slab) pushBox(r, 0, 0);
  const parkingGround = parkGroup ? pushBox(PARKING.bounds, spa.floor, spa.floor) : null;
  if (parkGroup) {
    const [x0, z0, x1, z1] = PARKING.bounds;
    // Keep the lower entrance and open side clear of mature trees.
    pushBox([x0, z0, x1 + 7, z1 + 6], 0, 0);
  }
  occluders.splice(occluderCount).forEach((o) => keepOut.push([o[0], o[2], o[3], o[5]]));
  const roadFrom = approaches[0]?.points.at(-1) ?? toWorld(new THREE.Vector3(data.size[0], 0, data.size[1]));

  const rot = outer.rotation.y;
  function windowsOf(unit) {
    const L = levels.find((l) => l.level === unit.level);
    const out = [];
    for (const [x, z, nx, nz, len] of unit.data.windows) {
      const n = [nx * Math.cos(rot) + nz * Math.sin(rot), 0, -nx * Math.sin(rot) + nz * Math.cos(rot)];
      const along = nx !== 0 ? [0, 1] : [1, 0];
      const count = Math.max(1, Math.min(4, Math.round(len / 1.5)));
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count - 0.5;
        const p = toWorld(new THREE.Vector3(x + along[0] * t * len, L.floor + EYE, z + along[1] * t * len));
        out.push({ p: [p.x, p.y, p.z], n });
      }
    }
    return out;
  }

  /** Main directions the flat's glazing faces, weighted by glass length. */
  function facing(unit) {
    const sums = { n: 0, e: 0, s: 0, w: 0 };
    for (const [, , nx, nz, len] of unit.data.windows) {
      const wx = nx * Math.cos(rot) + nz * Math.sin(rot), wz = -nx * Math.sin(rot) + nz * Math.cos(rot);
      if (wx > 0.5) sums.e += len; else if (wx < -0.5) sums.w += len;
      if (wz > 0.5) sums.s += len; else if (wz < -0.5) sums.n += len;
    }
    const total = sums.n + sums.e + sums.s + sums.w || 1;
    return Object.entries(sums).filter(([, v]) => v / total > 0.18).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  }

  // -- state ----------------------------------------------------------------
  let focus = null, hover = null, selected = null, night = 0, publicInterior = null;
  let restorePublicSlab = null;

  function setPublicInterior(level, stairOpenings) {
    restorePublicSlab?.();
    restorePublicSlab = null;
    publicInterior = level;
    if (level === 1 && stairOpenings?.length) {
      const upper = levels.find(storey => storey.level === level + 1);
      if (upper?.slabMesh) {
        const slab = upper.slabMesh, original = slab.geometry;
        const rects = subtractSlabOpenings(upper.slabRects, stairOpenings);
        slab.geometry = boxes(rects, upper.y0, SLAB, upper.slabColours);
        restorePublicSlab = () => {
          slab.geometry.dispose();
          slab.geometry = original;
        };
      }
    }
    paint();
  }

  function paint() {
    for (const L of levels) {
      const opened = focus !== null && L.level === focus;
      const hidden = focus !== null && L.level > focus;
      // A detailed public interior (spa or lobby) replaces its own storey and anything below it.
      // Keep all storeys above visible so looking back from the pool or lobby terrace shows the full house.
      L.group.visible = !hidden && (publicInterior === null || (publicInterior < 8 && L.level > publicInterior));
      L.vert.scale.y = opened ? CUT / (L.kind === 'roof' ? 2.8 : L.full) : 1;
      if (L.walls) L.walls.material = opened ? mats.wallCut : mats.wall;
      if (L.columns) L.columns.material = opened ? mats.wallCut : mats.column;
      if (opened && L.planUrl && !L.plan) {
        const tex = keep(loader.load(basePath + L.planUrl, () => { if (onUpdate) onUpdate(); }));
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        const plane = new THREE.Mesh(
          keep(new THREE.PlaneGeometry(data.size[0], data.size[1]).rotateX(-Math.PI / 2)),
          keep(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -4 }))
        );
        plane.position.set(data.size[0] / 2, L.floor + 0.04, data.size[1] / 2);
        plane.renderOrder = 3;
        L.group.add(plane);
        L.plan = plane;
      }
      if (L.plan) L.plan.visible = opened;
      if (L.glow) L.glow.visible = focus === null && hover === L.level;
      if (L.frames) {
        L.frames.visible = !opened;
        const lit = focus === null && hover === L.level;
        // hovered: the floor's frames light up; at night all frames get the soft wash of the evening render
        L.frameMat.emissive.set(lit ? 0x1c4e89 : 0xfff1dc);
        L.frameMat.emissiveIntensity = lit ? 0.85 : 0.16 * night;
        L.frameMat.color.set(lit ? 0x9fb8d6 : 0xf2f2ef);
        // with a floor opened, the floors below fade so the opened one reads first
        const ghost = focus !== null && L.level < focus;
        if (L.frameMat.transparent !== ghost) { L.frameMat.transparent = ghost; L.frameMat.needsUpdate = true; }
        L.frameMat.opacity = ghost ? 0.28 : 1;
        L.frameMat.depthWrite = !ghost;
      }
      for (const u of L.units) {
        const isSel = selected === u;
        const lit = (focus === null && hover === L.level) || isSel;
        u.zone.visible = opened;
        u.edge.visible = opened;
        u.zoneMat.opacity = isSel ? 0.5 : hover === u ? 0.38 : 0.2;
        u.edgeMat.opacity = isSel || hover === u ? 1 : 0.75;
        if (lit) {
          u.glassMat.emissive.copy(u.color);
          u.glassMat.emissiveIntensity = 1.1;
          u.glassMat.opacity = 0.85;
        } else if (night > 0.02 && u.status !== 'unavailable') {
          u.glassMat.emissive.setRGB(1, 0.78, 0.48);
          u.glassMat.emissiveIntensity = night * (u.night > 0.7 ? 0.9 : u.night > 0.5 ? 0.35 : 0.05);
          u.glassMat.opacity = 0.62;
        } else {
          u.glassMat.emissiveIntensity = 0;
          u.glassMat.opacity = 0.62;
        }
      }
    }
  }

  function unitsOf(level) { return (levels.find((l) => l.level === level) || { units: [] }).units; }
  function findUnit(number) {
    for (const L of levels) for (const u of L.units) if (u.number === String(number)) return u;
    return null;
  }

  let restoreStorey = null;
  function setWalk(unit, cutouts) {
    restoreStorey?.();
    restoreStorey = null;
    if (unit) {
      const storey = levels.find((l) => l.level === unit.level);
      // The traced glazing of the flat itself sits up to 0.4 m outside the model's own glass
      // and would read as a second window; cut it out with its mullions (0.03 m overhang).
      const k = storey.data.units.indexOf(unit.data);
      const ownGlass = storey.data.glass.filter((r) => r[4] === k).map((r) => rectCutout(r, 0.05));
      restoreStorey = trimWalkStorey(
        [...storey.vert.children, storey.rails, storey.frames, storey.decks],
        [...cutouts, ...ownGlass],
        part => replacesWalkFrontage(part, unit.data.outdoor || [], cutouts)
      );
    }
  }

  paint();
  // world box of each floor (for the floor tags beside the facade)
  const levelBoxes = {};
  for (const L of levels) {
    const before = occluders.length;
    for (const r of L.data.slab) pushBox(r, L.y0, L.y0 + L.height);
    const own = occluders.splice(before);
    levelBoxes[L.level] = [Math.min(...own.map((o) => o[0])), L.y0, Math.min(...own.map((o) => o[2])), Math.max(...own.map((o) => o[3])), L.y0 + L.height, Math.max(...own.map((o) => o[5]))];
  }

  return {
    inner,
    setWalk,
    levelBox: (level) => levelBoxes[level],
    /** Put something into a floor's group so it hides and shows with that floor. */
    attachToLevel(level, object) { const L = levels.find((l) => l.level === level); if (L) L.group.add(object); },
    planToWorld: (x, z, y = 0) => toWorld(new THREE.Vector3(x, y, z)),
    get parkGroup() { return parkGroup; },
    keepOut,
    roadFrom,
    approaches,
    parkingGround,
    floorOf: (unit) => levels.find((l) => l.level === unit.level).floor,
    object: outer,
    levels,
    top,
    occluders,
    residentialLevels: levels.filter((l) => l.kind === 'residential').map((l) => l.level),
    selectableLevels: levels.map(l => l.level),
    worldOf: (u) => toWorld(u.anchor),
    levelCenter(level) {
      const L = levels.find((l) => l.level === level);
      return new THREE.Vector3(0, L ? L.floor : 0, 0);
    },
    unitsOf, findUnit, windowsOf, facing,
    pickTargets(mode) {
      if (mode === 'floor') return levels.filter((l) => l.level === focus).flatMap((l) => l.units.map((u) => u.zone));
      // only what is drawn: the hidden plan sheets (41 x 38 m, wider than the house) and
      // hover volumes would otherwise catch the ray above a lower floor and light the one over it
      return levels.flatMap((l) => l.group.children.concat(l.vert.children))
        .filter((c) => c.isMesh && c.visible && !c.userData.hoverVolume);
    },
    setFocus(level) { focus = level; paint(); },
    setPublicInterior,
    setHover(h) { hover = h; paint(); },
    setSelected(u) { selected = u; paint(); },
    setNight(f) { night = f; paint(); },
    setStatus(number, status) {
      const u = findUnit(number);
      if (!u) return;
      u.status = status;
      u.color.set(STATUS_COLORS[status] || STATUS_COLORS.unavailable);
      u.zoneMat.color.copy(u.color);
      u.edgeMat.color.copy(u.color);
      paint();
    },
    dispose() {
      restoreStorey?.();
      restorePublicSlab?.();
      disposables.forEach((d) => d.dispose && d.dispose());
      Object.values(mats).forEach((m) => m.dispose());
    },
  };
}
