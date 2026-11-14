/* Evening light: lamp posts with a warm pool of light under each.
   Real point lights for a hundred lamps would be far too heavy; the pool is a
   soft additive disc on the ground and the bulb an unlit sphere, both faded in
   with nightfall, which reads the same from the overview distance. */
import * as THREE from './three.js';

let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,214,150,1)');
  g.addColorStop(0.35, 'rgba(255,190,120,0.45)');
  g.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

/** points: [{x, y, z}] in world space (y = ground). post: draw a pole (false for wall lights). */
export function createLamps(points, { post = true, radius = 5, height = 3.2 } = {}) {
  const group = new THREE.Group();
  if (!points.length) return { group, setNight() {}, dispose() {} };
  const m = new THREE.Matrix4();
  const posts = post ? new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.07, height, 6).translate(0, height / 2, 0), new THREE.MeshStandardMaterial({ color: 0x2c2f33, roughness: 0.6 }), points.length) : null;
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false });
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 8, 6), bulbMat, points.length);
  const glowMat = new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4 });
  const glows = new THREE.InstancedMesh(new THREE.PlaneGeometry(radius * 2, radius * 2).rotateX(-Math.PI / 2), glowMat, points.length);
  points.forEach((p, i) => {
    if (posts) { m.makeTranslation(p.x, p.y, p.z); posts.setMatrixAt(i, m); }
    m.makeTranslation(p.x, p.y + (post ? height : 0), p.z); bulbs.setMatrixAt(i, m);
    m.makeTranslation(p.x, p.y + 0.06, p.z); glows.setMatrixAt(i, m);
  });
  if (posts) { posts.castShadow = true; group.add(posts); }
  glows.renderOrder = 3;
  group.add(bulbs, glows);
  return {
    group,
    setNight(f) {
      glowMat.opacity = 0.85 * f;
      bulbMat.color.setRGB(0.35 + 0.65 * f, 0.33 + 0.52 * f, 0.3 + 0.33 * f);
    },
    dispose() { group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); },
  };
}

/** Points every `step` metres along a path [{x, z}], offset sideways. */
export function alongPath(path, step, side, height) {
  const out = [];
  let acc = step / 2;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const seg = Math.hypot(b.x - a.x, b.z - a.z);
    while (acc <= seg) {
      const t = acc / seg;
      const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      const nx = -(b.z - a.z) / seg, nz = (b.x - a.x) / seg;
      const px = x + nx * side, pz = z + nz * side;
      out.push({ x: px, y: height(px, pz), z: pz });
      acc += step;
    }
    acc -= seg;
  }
  return out;
}
