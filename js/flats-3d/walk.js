/* Walk-through of one flat at 1:1 scale, inside the real house.

   The flat's model (the same apartment.glb the chessboard shows, from
   apartment-3d/lib.py) is put in its place in the building, so the lower
   terraces, the white facade frames, the slope, the sea and Batumi are what you
   see from the windows. A ceiling is added (the models are open-topped), the
   surfaces are re-dressed with a renovation style, and the sun is the same sun
   as outside. */
import * as THREE from './three.js';
import { GLTFLoader } from './three.js';
import { STYLES, roleOf, materialFor, addMetricUVs } from './styles.js?v=19';
import { ART_DECO_PILOT, createArtDeco } from './art-deco.js?v=2';

const EYE = 1.6;
const CEILING = 2.8;
const RADIUS = 0.22;          // body radius for collisions
const SPEED = 1.5;            // m/s, Shift doubles

/** Drone frames for the card (assets/residences/views, see apartment-3d/window_views.py). */
export function viewFiles(floor) {
  return { w: floor >= 5 ? 'w-high.webp' : 'w-low.webp', n: 'n.webp', s: 's.webp', e: 'e.webp' };
}

/* The view from the windows is photographs only: the modelled landscape is
   hidden during the walk (app.js) and a 360° panorama stitched from the drone
   film (apartment-3d/panorama.py) surrounds the flat on a sphere 600 m out.
   Its layout matches SphereGeometry, so no extra rotation is needed. */
const PANO_R = 600;
export function createWalk({ renderer, site, scene, basePath = '', assetUrl }) {
  const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 40000);
  camera.rotation.order = 'YXZ';

  const loader = new GLTFLoader();
  const glbCache = new Map();
  const artDeco = createArtDeco(renderer, assetUrl);
  const railGlass = new THREE.MeshStandardMaterial({ color: 0xaecad8, roughness: 0.08, metalness: 0.12, transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false });
  const lamp = new THREE.PointLight(0xffd6a0, 1.2, 16, 1.3);   // warm interior light
  const fillLight = new THREE.HemisphereLight(0xfffbf4, 0xd8cfc2, 0.42);

  let model = null, parent = null;
  let artDecoDetails = null;
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(PANO_R, 96, 48),
    // writes depth so the live sky dome behind it (40 km) cannot paint over the photographs
    new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false, toneMapped: false })
  );
  const panoCache = new Map();
  function loadPano(file) {
    if (!panoCache.has(file)) {
      panoCache.set(file, new Promise((resolve, reject) => new THREE.TextureLoader().load(basePath + '/assets/residences/views/' + file, (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        resolve(t);
      }, undefined, reject)));
    }
    return panoCache.get(file);
  }
  async function buildRing(floor, centre) {
    sphere.material.map = await loadPano(`pano-${floor}.webp`);
    sphere.material.needsUpdate = true;
    sphere.position.copy(centre);
  }
  let style = STYLES[1];
  let furniture = true;
  let walkable = [];           // floor triangles in model space [ax, az, bx, bz, cx, cz]
  let blockers = [];           // AABBs in model space [x0, z0, x1, z1]
  let furnBlockers = [];       // tall furniture: [x0, z0, x1, z1, mesh]; only counts while the mesh is shown
  const yaw = { v: 0 }, pitch = { v: -0.05 };
  const keys = new Set();
  let glide = null;
  const local = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const qInv = new THREE.Quaternion();

  function loadGlb(slug) {
    if (!glbCache.has(slug)) {
      const url = assetUrl(slug, 'apartment.glb');
      const vUrl = url + (url.includes('?') ? '&' : '?') + 'v=19';
      glbCache.set(slug, new Promise((resolve, reject) => loader.load(vUrl, (g) => resolve(g.scene), undefined, reject)));
    }
    return glbCache.get(slug);
  }

  function prepare(src) {
    const g = src.clone(true);
    const floors = [];
    g.traverse((o) => {
      if (!o.isMesh) return;
      o.geometry = o.geometry.clone();
      addMetricUVs(o.geometry);
      o.geometry.computeBoundingBox();
      const group = (o.userData && o.userData.group) || (o.parent && o.parent.userData && o.parent.userData.group) || 'furniture';
      let role = roleOf(o.material);
      if (group === 'floor' && o.geometry.boundingBox.max.y < -0.01) role = 'terrace';
      o.userData.af = { group, role, original: o.material };
      o.castShadow = group !== 'floor';
      o.receiveShadow = true;
      // the building draws its own facade frames now; the model's fins would double them
      if (group === 'facade') o.visible = false;
      if (group === 'floor') floors.push(o);
    });
    const ceilings = new THREE.Group();
    for (const f of floors) {
      if (f.geometry.boundingBox.max.y < -0.01) continue;
      const c = new THREE.Mesh(f.geometry.clone().translate(0, CEILING + 0.16, 0), null);
      c.userData.af = { group: 'ceiling', role: 'ceiling' };
      c.castShadow = true;
      c.receiveShadow = true;
      ceilings.add(c);
    }
    g.add(ceilings);

    walkable = [];
    blockers = [];
    const v = new THREE.Vector3();
    for (const f of floors) {
      const p = f.geometry.attributes.position, n = f.geometry.attributes.normal;
      for (let i = 0; i < p.count; i += 3) {
        if (n.getY(i) < 0.5) continue;
        const tri = [];
        for (let k = 0; k < 3; k++) { v.fromBufferAttribute(p, i + k); tri.push(v.x, v.z); }
        walkable.push(tri);
      }
    }
    g.traverse((o) => {
      if (!o.isMesh || !o.userData.af) return;
      if (!['walls', 'glazing', 'rail', 'facade'].includes(o.userData.af.group)) return;
      if (/open/i.test(o.name)) return;
      const bb = o.geometry.boundingBox;
      const fixedWindowBase = o.userData.af.group === 'glazing' && / base$/i.test(o.name) && !/door|slider|window/i.test(o.name);
      if (bb.min.y > 1.0 || (bb.max.y < 0.3 && !fixedWindowBase)) return;           // lintels, sills, fascia bands
      blockers.push([bb.min.x, bb.min.z, bb.max.x, bb.max.z]);
    });
    // Tall floor-standing furniture (fridge, wardrobe, cabinets, sofa backs, tables) stops the
    // walker; without this the camera ended up inside a black fridge. Low things (beds, rugs)
    // and door leaves stay walk-through.
    furnBlockers = [];
    g.traverse((o) => {
      if (!o.isMesh || !o.userData.af || o.userData.af.group !== 'furniture' || /door/i.test(o.name)) return;
      const bb = o.geometry.boundingBox;
      if (bb.max.y < 0.6 || bb.min.y > 0.9 || (bb.max.x - bb.min.x) * (bb.max.z - bb.min.z) < 0.06) return;
      furnBlockers.push([bb.min.x, bb.min.z, bb.max.x, bb.max.z, o]);
    });
    return g;
  }

  function applyStyle() {
    if (!model) return;
    const detailed = artDecoDetails && style.id === 'art_deco';
    artDecoDetails?.show(detailed, furniture);
    model.traverse((o) => {
      if (!o.isMesh || !o.userData.af) return;
      const { group, role, original } = o.userData.af;
      const styled = ['walls', 'floor', 'furniture', 'ceiling'].includes(group);
      const m = (detailed && artDecoDetails.materialFor(o)) || (styled && role && materialFor(style, role, renderer));
      // the model's dark railing glass reads as a blue band across the view; real balustrade glass is clear
      o.material = group === 'rail' && role === 'blue_glass' ? railGlass : m || original || materialFor(style, 'wall', renderer);
      if (group === 'furniture') o.visible = (furniture && style.furniture) || /Entrance open door/i.test(o.name);
    });
  }

  function onFloor(x, z) {
    for (const t of walkable) {
      const d = (t[3] - t[5]) * (t[0] - t[4]) + (t[4] - t[2]) * (t[1] - t[5]);
      const a = ((t[3] - t[5]) * (x - t[4]) + (t[4] - t[2]) * (z - t[5])) / d;
      const b = ((t[5] - t[1]) * (x - t[4]) + (t[0] - t[4]) * (z - t[5])) / d;
      if (a >= -0.001 && b >= -0.001 && a + b <= 1.001) return true;
    }
    return false;
  }
  // Door sills leave a strip with no floor under it (40.5: living floor ends at
  // 6.00 m, balcony slab starts at 6.13 m), so gaps up to 30 cm can be stepped
  // over; the balustrades still stop you at the terrace edge.
  function inside(x, z) {
    return onFloor(x, z) || onFloor(x, z + 0.3) || onFloor(x, z - 0.3) || onFloor(x + 0.3, z) || onFloor(x - 0.3, z);
  }
  function free(x, z) {
    if (!inside(x, z)) return false;
    for (const b of blockers) {
      const dx = Math.max(b[0] - x, 0, x - b[2]), dz = Math.max(b[1] - z, 0, z - b[3]);
      if (dx * dx + dz * dz < RADIUS * RADIUS) return false;
    }
    for (const b of furnBlockers) {
      if (!b[4].visible) continue;
      const dx = Math.max(b[0] - x, 0, x - b[2]), dz = Math.max(b[1] - z, 0, z - b[3]);
      if (dx * dx + dz * dz < 0.12 * 0.12) return false;
    }
    return true;
  }
  function moveBy(dx, dz) {
    const nx = local.x + dx, nz = local.z + dz;
    if (free(nx, nz)) { local.x = nx; local.z = nz; return true; }
    if (free(nx, local.z)) { local.x = nx; return true; }
    if (free(local.x, nz)) { local.z = nz; return true; }
    return false;
  }

  function spawn(facingWorld) {
    // middle of the largest interior floor piece — the living room
    let best = null, area = 0;
    model.traverse((o) => {
      if (o.isMesh && o.userData.af && o.userData.af.group === 'floor') {
        const bb = o.geometry.boundingBox;
        const a = (bb.max.x - bb.min.x) * (bb.max.z - bb.min.z);
        if (bb.max.y > -0.01 && a > area) { area = a; best = bb; }
      }
    });
    local.set((best.min.x + best.max.x) / 2, 0, (best.min.z + best.max.z) / 2);
    if (!free(local.x, local.z)) {
      // nearest free spot, searched in rings round the middle of the room
      search: for (let r = 0.2; r < 4; r += 0.2) {
        for (let a = 0; a < 16; a++) {
          const dx = r * Math.cos((a * Math.PI) / 8), dz = r * Math.sin((a * Math.PI) / 8);
          if (free(local.x + dx, local.z + dz)) { local.x += dx; local.z += dz; break search; }
        }
      }
    }
    yaw.v = facingWorld;
    pitch.v = -0.06;
  }

  function placeCamera() {
    tmp.copy(local);
    model.localToWorld(tmp);
    camera.position.set(tmp.x, tmp.y + EYE, tmp.z);
    camera.rotation.set(pitch.v, yaw.v, 0);
  }

  /* -- public ------------------------------------------------------------ */
  /** parent: the building's plan-space group; offset: [x, z] of the model in it; floorY: slab top. */
  async function enter({ slug, parent: p, offset, floorY, facingAz, floor }) {
    const [src] = await Promise.all([loadGlb(slug), slug === ART_DECO_PILOT ? artDeco.load() : null]);
    exit();
    parent = p;
    model = prepare(src);
    if (slug === ART_DECO_PILOT) artDecoDetails = artDeco.decorate(model);
    // 1 cm above the building's slab so the two floor surfaces do not flicker
    model.position.set(offset[0], floorY + 0.03, offset[1]);
    parent.add(model);
    parent.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    model.add(lamp);
    model.add(fillLight);
    applyStyle();
    // Azimuth → camera yaw. Frame the sofa and the balcony together in the pilot.
    const windowYaw = facingAz != null ? (-facingAz * Math.PI) / 180 : 0;
    const showLivingRoom = artDecoDetails && style.id === 'art_deco';
    spawn(windowYaw - (showLivingRoom ? Math.PI / 3.7 : 0));
    if (showLivingRoom) pitch.v = -0.19;
    lamp.position.set(local.x, 2.4, local.z);
    placeCamera();
    site.setShadowFocus(box.getCenter(new THREE.Vector3()), 16);
    await buildRing(floor, camera.position.clone());
    scene.add(sphere);
    return box.getCenter(new THREE.Vector3());
  }

  function exit() {
    artDecoDetails?.dispose();
    artDecoDetails = null;
    if (model && parent) {
      parent.remove(model);
      model.traverse((o) => o.geometry?.dispose());
    }
    model = null;
    scene.remove(sphere);
    keys.clear();
    glide = null;
  }

  function setSun(dir, altitude) {
    const day = THREE.MathUtils.smoothstep(altitude, -0.1, 0.25);
    lamp.intensity = 1.2 + 5.8 * (1 - day);
    fillLight.intensity = 0.25 + 0.22 * day;
    sphere.material.color.setScalar(0.18 + 0.82 * day);
    renderer.toneMappingExposure = 0.66 + 0.2 * day;
  }

  function update(dt) {
    if (!model) return;
    const run = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 2 : 1;
    let fx = 0, fz = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) fz -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) fz += 1;
    if (keys.has('KeyA')) fx -= 1;
    if (keys.has('KeyD')) fx += 1;
    if (keys.has('ArrowLeft')) yaw.v += dt * 1.6;
    if (keys.has('ArrowRight')) yaw.v -= dt * 1.6;
    if (fx || fz) {
      glide = null;
      const step = (SPEED * run * dt) / Math.hypot(fx, fz);
      // camera-relative step in the world, then into the model's own axes
      const c = Math.cos(yaw.v), s = Math.sin(yaw.v);
      tmp.set((fx * c + fz * s) * step, 0, (-fx * s + fz * c) * step);
      model.getWorldQuaternion(qInv).invert();
      tmp.applyQuaternion(qInv);
      moveBy(tmp.x, tmp.z);
    } else if (glide) {
      const dx = glide.x - local.x, dz = glide.z - local.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.05) glide = null;
      else {
        const st = Math.min(d, SPEED * 1.4 * dt);
        if (!moveBy((dx / d) * st, (dz / d) * st)) glide = null;
      }
    }
    placeCamera();
  }

  /** Tap on the floor: walk there. ndc in -1..1. */
  const ray = new THREE.Raycaster();
  function tapTo(ndc) {
    if (!model) return;
    ray.setFromCamera(ndc, camera);
    const targets = [];
    model.traverse((o) => { if (o.isMesh && o.visible && o.userData.af && o.userData.af.group === 'floor') targets.push(o); });
    const hit = ray.intersectObjects(targets, false)[0];
    if (!hit) return;
    const p = model.worldToLocal(hit.point.clone());
    glide = { x: p.x, z: p.z };
  }

  function look(dx, dy) {
    yaw.v -= dx * 0.0032;
    pitch.v = THREE.MathUtils.clamp(pitch.v - dy * 0.0032, -1.25, 1.1);
  }

  return {
    camera, styles: STYLES,
    enter, exit, setSun, update, tapTo, look,
    get active() { return !!model; },
    get style() { return style.id; },
    setStyle(id) { style = STYLES.find((s) => s.id === id) || style; applyStyle(); },
    get furniture() { return furniture; },
    setFurniture(on) { furniture = on; applyStyle(); },
    keyDown(code) { keys.add(code); },
    keyUp(code) { keys.delete(code); },
    clearKeys() { keys.clear(); glide = null; },
    resize(w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); },
    dispose() {
      exit(); railGlass.dispose(); lamp.dispose(); fillLight.dispose();
      artDeco.dispose();
      sphere.geometry.dispose(); sphere.material.dispose();
      panoCache.forEach((p) => p.then((t) => t.dispose()).catch(() => {}));
    },
  };
}
