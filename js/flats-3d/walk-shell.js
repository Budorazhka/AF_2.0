import * as THREE from './three.js';

// Floor pieces in the apartment GLBs are convex. Cover the wall reveal as well
// so the simplified shell cannot put a second wall across the detailed window.
const REVEAL = 0.22;

export function floorCutout(geometry, [offsetX, offsetZ]) {
  const points = new Map();
  const { position, normal } = geometry.attributes;
  for (let i = 0; i < position.count; i++) {
    if (normal.getY(i) < 0.9) continue;
    const x = position.getX(i) + offsetX, z = position.getZ(i) + offsetZ;
    points.set(x + ',' + z, [x, z]);
  }
  const ring = [...points.values()];
  const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const cz = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  ring.sort((a, b) => Math.atan2(a[1] - cz, a[0] - cx) - Math.atan2(b[1] - cz, b[0] - cx));
  return ring.map(([x, z], i) => {
    const next = ring[(i + 1) % ring.length];
    const dx = next[0] - x, dz = next[1] - z, len = Math.hypot(dx, dz);
    return [-dz / len, dx / len, (dz * x - dx * z) / len + REVEAL];
  });
}

/** A plan rectangle [x0, z0, x1, z1] grown by `pad`, in the same plane form as floorCutout. */
export function rectCutout([x0, z0, x1, z1], pad) {
  return [[1, 0, pad - x0], [-1, 0, x1 + pad], [0, 1, pad - z0], [0, -1, z1 + pad]];
}

// Subtract a convex prism from one polygon, interpolating normals at cut edges.
function subtract(polygon, planes) {
  const distance = ([a, b, c], vertex) => a * vertex[0] + b * vertex[2] + c;
  if (planes.some((plane) => polygon.every((v) => distance(plane, v) < 0))) return [polygon];
  const pieces = [];
  let inside = polygon;
  for (const plane of planes) {
    const kept = [], outside = [];
    let prev = inside.at(-1), d0 = distance(plane, prev);
    for (const curr of inside) {
      const d1 = distance(plane, curr);
      if ((d0 < 0) !== (d1 < 0)) {
        const t = d0 / (d0 - d1);
        const v = prev.map((value, k) => value + (curr[k] - value) * t);
        kept.push(v);
        outside.push(v);
      }
      (d1 < 0 ? outside : kept).push(curr);
      prev = curr;
      d0 = d1;
    }
    if (outside.length >= 3) pieces.push(outside);
    if (kept.length < 3) break;
    inside = kept;
  }
  return pieces;
}

/** Cut only this storey's shared walls, glazing and railings. Other storeys
 * and the continuous load-bearing slab retain their original geometry. */
export function trimWalkStorey(meshes, cutouts, replacesFrontage) {
  const originals = new Map();
  for (const mesh of meshes.filter(Boolean)) {
    const geometry = mesh.geometry;
    const meshCutouts = geometry.userData.clipToFloor === false ? [] : cutouts;
    const { position, normal } = geometry.attributes;
    const pos = [], norm = [];
    const omitted = new Map((geometry.userData.frontages || [])
      .filter(replacesFrontage).map(part => [part.start, part.count]));
    if (!meshCutouts.length && !omitted.size) continue;
    let changed = false;
    const count = geometry.index?.count ?? position.count;
    for (let i = 0; i < count;) {
      const rangeLength = omitted.get(i);
      if (rangeLength) {
        i += rangeLength;
        changed = true;
        continue;
      }
      const tri = [i, i + 1, i + 2].map((index) => {
        const j = geometry.index ? geometry.index.getX(index) : index;
        return [position.getX(j), position.getY(j), position.getZ(j),
          normal.getX(j), normal.getY(j), normal.getZ(j)];
      });
      i += 3;
      let pieces = [tri];
      for (const cutout of meshCutouts) pieces = pieces.flatMap((p) => subtract(p, cutout));
      if (pieces.length !== 1 || pieces[0] !== tri) changed = true;
      for (const p of pieces) for (let j = 1; j + 1 < p.length; j++) {
        for (const v of [p[0], p[j], p[j + 1]]) {
          pos.push(v[0], v[1], v[2]);
          norm.push(v[3], v[4], v[5]);
        }
      }
    }
    if (!changed) continue;
    originals.set(mesh, geometry);
    const clipped = new THREE.BufferGeometry();
    clipped.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    clipped.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
    mesh.geometry = clipped;
  }
  return () => originals.forEach((geometry, mesh) => {
    mesh.geometry.dispose();
    mesh.geometry = geometry;
  });
}
