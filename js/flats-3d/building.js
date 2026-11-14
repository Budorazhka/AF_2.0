/* Aurum Fort massing built from assets/data/building-3d.json
   (generated from the ArchiCAD floor plans by apartment-3d/building.py).

   Plan coordinates are metres on the drawing: x to the right of the sheet,
   z down the sheet. Everything is built in plan coordinates inside `inner`;
   `outer` turns the sheet so that its "down" faces the real azimuth (the sea). */
import * as THREE from './three.js';
import { mergeGeometries } from './three.js';
import { frameGeometry, balustradeGeometry, carPark } from './facade.js';

export const SLAB = 0.3;
const CUT = 1.25;          // wall height left standing when a floor is opened
const EYE = 1.4;           // height of window sample points for the sun estimate

export const STATUS_COLORS = {
  active: '#1c4e89', booked: '#9a7a3c', sold: '#a3433a', reserved: '#6a5a8c', unavailable: '#9a9a9a',
};

function boxes(rects, y0, h, colours) {
  if (!rects.length) return null;
  const geos = rects.map((r) => {
    const g = new THREE.BoxGeometry(Math.max(r[2] - r[0], 0.01), h, Math.max(r[3] - r[1], 0.01));
    g.translate((r[0] + r[2]) / 2, y0 + h / 2, (r[1] + r[3]) / 2);
    return g;
  });
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
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

export function createBuilding(data, apartments, { basePath = '' } = {}) {
  const byNumber = new Map(apartments.map((a) => [String(a.apartmentNumber), a]));
  const outer = new THREE.Group();
  const inner = new THREE.Group();
  outer.add(inner);
  outer.rotation.y = Math.PI - (data.planDownAzimuth * Math.PI) / 180;

  // colours taken from the renders: graphite body, white faceted frames, dark glass
  const mats = {
    slab: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }),
    wall: new THREE.MeshStandardMaterial({ color: 0xe6e2da, roughness: 0.9 }),
    shell: new THREE.MeshStandardMaterial({ color: 0x3a404a, roughness: 0.7, metalness: 0.05 }),
    column: new THREE.MeshStandardMaterial({ color: 0xe9e6e0, roughness: 0.8 }),
    frame: new THREE.MeshStandardMaterial({ color: 0xf2f2ef, roughness: 0.5, metalness: 0, side: THREE.DoubleSide }),
    glass: new THREE.MeshStandardMaterial({ color: 0x1b2836, roughness: 0.06, metalness: 0.65, transparent: true, opacity: 0.86, envMapIntensity: 1.6 }),
    rail: new THREE.MeshStandardMaterial({ color: 0xcfe0e8, roughness: 0.05, transparent: true, opacity: 0.26, depthWrite: false }),
    pool: new THREE.MeshStandardMaterial({ color: 0x4aa6da, roughness: 0.08, metalness: 0.1 }),
    deck: new THREE.MeshStandardMaterial({ color: 0xb99671, roughness: 0.85 }),
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
    // on the flats' floors the slab edge is the white lower band of the frames; the podium is graphite
    const slabColours = { top: 0xe7e4de, side: lv.kind === 'residential' ? 0xe9e9e5 : 0x3a404a };
    add(g, mesh(boxes(lv.slab, y, SLAB, slabColours), mats.slab));
    if (lv.kind === 'spa') {
      // the podium's roof is the lobby-level terrace around the tower
      add(g, mesh(boxes(lv.slab, y + lv.height - SLAB, SLAB, slabColours), mats.slab));
    }
    if (lv.kind === 'roof') {
      add(g, mesh(boxes(lv.pool || [], L.floor, 0.04), mats.pool, false));
      add(g, mesh(boxes(lv.decks || [], L.floor, 0.06), mats.deck, false));
      if (!lv.outline) {
        // older data without the roof outline: plain housings and raster balustrade
        add(vert, mesh(boxes(lv.walls, 0, 2.8), mats.wall));
        add(g, mesh(boxes(lv.rails, L.floor, 1.1), mats.rail, false));
      }   // otherwise the roof terrace (amenities.js) draws housings, deck and glass
    } else {
      L.walls = add(vert, mesh(boxes(lv.walls, 0, full), mats.wall));
      // the lobby is glazed all round (restaurant, entrance); elsewhere the envelope is graphite cladding
      L.shell = add(vert, mesh(boxes(lv.shell || [], 0, full), lv.kind === 'lobby' ? mats.glass : mats.shell));
      L.columns = add(vert, mesh(boxes(lv.columns, 0, full), mats.column));
      if (lv.facade && lv.facade.length) {
        // own material per floor: hovering a floor lights its whole band of frames
        L.frameMat = keep(mats.frame.clone());
        L.frames = add(g, mesh(keep(frameGeometry([{ y0: y, height: lv.height, edges: lv.facade }])), L.frameMat));
      }
      add(vert, mesh(boxes(lv.glass.filter((r) => r[4] < 0), 0, full), mats.glass));
      // balustrades along the drawn terrace fronts (slanted ones stay straight); raster outline where none
      L.rails = add(g, mesh(lv.facade && lv.facade.some((e) => e[6]) ? balustradeGeometry(lv.facade, L.floor) : boxes(lv.rails, L.floor, 1.1), mats.rail, false));
      add(g, mesh(boxes(lv.units.flatMap((u) => u.decks || []), L.floor, 0.05), mats.deck, false));
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

    // floor drawing laid on the slab (shown when the floor is opened)
    if (lv.plan) {
      const tex = keep(loader.load(basePath + lv.plan));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      const plane = new THREE.Mesh(
        keep(new THREE.PlaneGeometry(data.size[0], data.size[1]).rotateX(-Math.PI / 2)),
        keep(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -4 }))
      );
      plane.position.set(data.size[0] / 2, L.floor + 0.04, data.size[1] / 2);
      plane.renderOrder = 3;
      plane.visible = false;
      g.add(plane);
      L.plan = plane;
    }

    g.add(vert);
    inner.add(g);
    L.group = g;
    levels.push(L);
    y += lv.height;
  }
  const top = y;

  // car park on the lobby level: left row on the spa roof, right row on its own deck
  const lobby = levels.find((l) => l.level === 1);
  let parkGroup = null;
  if (data.parking && lobby) {
    const park = carPark(data.parking, lobby.y0 + SLAB * 0);
    inner.add(park.group);
    parkGroup = park.group;
    disposables.push(park);
  }

  outer.updateMatrixWorld(true);
  const toWorld = (v) => v.clone().applyMatrix4(inner.matrixWorld);

  // -- occluders and windows for the sun estimate ---------------------------
  const occluders = [];
  const corner = new THREE.Vector3();
  function pushBox(r, y0, y1) {
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const [px, pz] of [[r[0], r[1]], [r[2], r[3]]]) {
      corner.set(px, 0, pz).applyMatrix4(inner.matrixWorld);
      x0 = Math.min(x0, corner.x); x1 = Math.max(x1, corner.x); z0 = Math.min(z0, corner.z); z1 = Math.max(z1, corner.z);
    }
    occluders.push([x0, y0, z0, x1, y1, z1]);
  }
  for (const L of levels) {
    for (const r of L.data.slab) pushBox(r, L.y0, L.floor);
    const h = L.kind === 'roof' ? 2.8 : L.full;
    for (const r of [...L.data.walls, ...(L.data.shell || []), ...(L.data.glass || []), ...(L.data.columns || [])]) pushBox(r, L.floor, L.floor + h);
  }

  // ground the forest must stay off: podium, tower and car park (world AABBs)
  const keepOut = [];
  const occluderCount = occluders.length;
  for (const L of levels) if (L.level <= 2) for (const r of L.data.slab) pushBox(r, 0, 0);
  if (data.parking && data.parking.length) {
    const b = data.parking;
    pushBox([Math.min(...b.map((p) => p[0])) - 1, Math.min(...b.map((p) => p[1])) - 7, Math.max(...b.map((p) => p[2])) + 1, Math.max(...b.map((p) => p[3])) + 1], 0, 0);
  }
  occluders.splice(occluderCount).forEach((o) => keepOut.push([o[0], o[2], o[3], o[5]]));
  // the road starts at the far end of the car park's driving lane
  const roadFrom = data.parking && data.parking.length
    ? toWorld(new THREE.Vector3(Math.max(...data.parking.map((p) => p[2])) + 4, 0, Math.min(...data.parking.map((p) => p[1])) - 3))
    : toWorld(new THREE.Vector3(data.size[0], 0, data.size[1]));

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
  let focus = null, hover = null, selected = null, night = 0;

  function paint() {
    for (const L of levels) {
      const opened = focus !== null && L.level === focus;
      const hidden = focus !== null && L.level > focus;
      L.group.visible = !hidden;
      L.vert.scale.y = opened ? CUT / (L.kind === 'roof' ? 2.8 : L.full) : 1;
      if (L.plan) L.plan.visible = opened;
      if (L.glow) L.glow.visible = focus === null && hover === L.level;
      if (L.frames) {
        L.frames.visible = !opened && !(walkPatch && walkPatch.hidden.includes(L.frames));
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

  /* Walk-through: the flat's own model stands in its place, so this floor's
     massing walls, columns and glass inside the flat give way to it. */
  let walkPatch = null;
  function nearPoly(x, z, poly, margin) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, zi] = poly[i], [xj, zj] = poly[j];
      if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
      const dx = xj - xi, dz = zj - zi, t = Math.max(0, Math.min(1, ((x - xi) * dx + (z - zi) * dz) / (dx * dx + dz * dz || 1)));
      if (Math.hypot(xi + t * dx - x, zi + t * dz - z) < margin) return true;
    }
    return inside;
  }
  function setWalk(unit) {
    if (walkPatch) {
      walkPatch.hidden.forEach((o) => { o.visible = true; });
      walkPatch.meshes.forEach((m) => { m.parent.remove(m); m.geometry.dispose(); });
      walkPatch = null;
      paint();
    }
    if (!unit) return;
    const L = levels.find((l) => l.level === unit.level);
    const above = levels.find((l) => l.level === unit.level + 1);
    // the flat's own model replaces the massing here: its rooms and its balcony or terrace
    const areas = [unit.data.poly, ...(unit.data.outdoor || [])];
    const keepOut = (r) => !areas.some((poly) => nearPoly((r[0] + r[2]) / 2, (r[1] + r[3]) / 2, poly, 0.6));
    // Up close the massing's facade frames and balustrades are crude: on this floor and the
    // one above they would stand right in front of the windows, so they go for the walk.
    const hidden = [L.walls, L.columns, L.shell, unit.glass, L.frames, L.rails, above && above.frames, above && above.rails].filter(Boolean);
    hidden.forEach((o) => { o.visible = false; });
    const meshes = [];
    const swap = (orig, rects, mat) => {
      if (!orig) return;
      const m = mesh(boxes(rects.filter(keepOut), 0, L.full), mat);
      if (m) { L.vert.add(m); meshes.push(m); }
    };
    swap(L.walls, L.data.walls, mats.wall);
    swap(L.shell, L.data.shell || [], mats.shell);
    swap(L.columns, L.data.columns, mats.column);
    // other flats' glazing on this floor stays, minus anything over this flat's balcony
    const others = L.data.glass.filter((r) => r[4] >= 0 && L.units[r[4]] !== unit && keepOut(r));
    const glass = mesh(boxes(others, 0, L.full), mats.glass);
    if (glass) { L.vert.add(glass); meshes.push(glass); }
    L.units.forEach((u) => { if (u.glass && u !== unit) { u.glass.visible = false; hidden.push(u.glass); } });
    walkPatch = { L, unit, meshes, hidden };
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
    roadFrom: { x: roadFrom.x, z: roadFrom.z },
    floorOf: (unit) => levels.find((l) => l.level === unit.level).floor,
    object: outer,
    levels,
    top,
    occluders,
    residentialLevels: levels.filter((l) => l.kind === 'residential').map((l) => l.level),
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
      return levels.filter((l) => l.kind === 'residential')
        .flatMap((l) => l.group.children.concat(l.vert.children))
        .filter((c) => c.isMesh && c.visible && !c.userData.hoverVolume);
    },
    setFocus(level) { focus = level; paint(); },
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
      disposables.forEach((d) => d.dispose && d.dispose());
      Object.values(mats).forEach((m) => m.dispose());
    },
  };
}
