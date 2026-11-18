import * as THREE from './three.js';
import { mergeGeometries } from './three.js';
import { PATIO_FOOTPRINTS, STAGING_LAYOUTS } from './walk-staging-layouts.js?v=2';

const deckY = -0.02;

function mesh(group, geometry, material, x, y, z) {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(x, y, z);
  item.castShadow = true;
  item.receiveShadow = true;
  group.add(item);
  return item;
}

function cylinder(group, material, x, y, z, top, bottom, height, open = false) {
  return mesh(group, new THREE.CylinderGeometry(top, bottom, height, 24, 1, open), material, x, y, z);
}

function box(group, material, x, y, z, width, height, depth) {
  return mesh(group, new THREE.BoxGeometry(width, height, depth), material, x, y, z);
}

function lamp(group, mats, x, base, z, tabletop) {
  const height = tabletop ? 0.44 : 1.52;
  const radius = tabletop ? 0.121 : 0.181;
  const shadeHeight = tabletop ? 0.186 : 0.25;
  const shadeY = base + height - shadeHeight / 2;
  cylinder(group, mats.metal, x, base + 0.015, z, radius * 0.79, radius * 0.85, 0.03);
  cylinder(group, mats.metal, x, base + height * 0.46, z, 0.014, 0.014, height * 0.85);
  cylinder(group, mats.shade, x, shadeY, z, radius * 0.72, radius, shadeHeight, true).castShadow = false;
  for (const [y, edge] of [[base + height, radius * 0.72], [base + height - shadeHeight, radius]]) {
    mesh(group, new THREE.TorusGeometry(edge, 0.0035, 6, 24), mats.metal, x, y, z).rotation.x = -Math.PI / 2;
  }
  const light = new THREE.PointLight(0xffc592, 0.48, 2.65, 1.65);
  light.position.set(x, base + height - shadeHeight - 0.035, z);
  group.add(light);
  return light;
}

function blanket(group, material, bounds, edge) {
  const [axis, side] = edge;
  const across = axis === 'x' ? 'z' : 'x';
  const sign = side === '+' ? 1 : -1;
  const end = (sign > 0 ? bounds.max : bounds.min)[axis];
  const span = bounds.max[across] - bounds.min[across];
  const width = Math.min(0.67, span * 0.82);
  const reach = Math.min(0.63, (bounds.max[axis] - bounds.min[axis]) * 0.77);
  const middle = (bounds.min[across] + bounds.max[across]) / 2;
  const geometry = new THREE.PlaneGeometry(1, 1, 12, 17);
  const { position, uv } = geometry.attributes;
  for (let i = 0; i < position.count; i++) {
    const u = uv.getX(i), v = uv.getY(i);
    const run = -reach + v * (reach + 0.115);
    const along = end + sign * run;
    const ripple = Math.sin(u * Math.PI * 5.6 + v * 2.2);
    const cross = middle + (u - 0.5) * width + ripple * 0.011 * v;
    const y = bounds.max.y + 0.018 + ripple * (0.009 + 0.011 * v) - Math.max(0, run) * 1.42;
    position.setXYZ(i, axis === 'x' ? along : cross, y, axis === 'x' ? cross : along);
  }
  geometry.computeVertexNormals();
  mesh(group, geometry, material, 0, 0, 0).name = 'Knitted throw';
}

function plant(group, mats, x, y, z, scale = 1) {
  cylinder(group, mats.ceramic, x, y + 0.084 * scale, z, 0.093 * scale, 0.067 * scale, 0.168 * scale);
  cylinder(group, mats.soil, x, y + 0.168 * scale, z, 0.079 * scale, 0.079 * scale, 0.005 * scale);
  const leaves = [], stems = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 7; i++) {
    const angle = i * 2.4;
    const spread = (0.09 + i % 3 * 0.024) * scale;
    const start = new THREE.Vector3(x, y + 0.172 * scale, z);
    const tip = new THREE.Vector3(x + Math.cos(angle) * spread, y + (0.37 + i % 4 * 0.038) * scale, z + Math.sin(angle) * spread);
    const centre = start.clone().lerp(tip, 0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(up, tip.clone().sub(start).normalize());
    stems.push(new THREE.CylinderGeometry(0.0035 * scale, 0.0035 * scale, start.distanceTo(tip), 5)
      .applyQuaternion(q).translate(centre.x, centre.y, centre.z));
    for (let j = 0; j < 4; j++) {
      const p = start.clone().lerp(tip, 0.46 + j * 0.165);
      leaves.push(new THREE.SphereGeometry(0.033 * scale, 7, 5).scale(0.53, 0.23, 1.48)
        .rotateX(j % 2 ? 0.44 : -0.28).rotateY(angle + j * 0.62).translate(p.x, p.y, p.z));
    }
  }
  for (const [parts, material] of [[stems, mats.soil], [leaves, mats.leaf]]) {
    mesh(group, mergeGeometries(parts, false), material, 0, 0, 0);
    for (const part of parts) part.dispose();
  }
}

function tea(group, mats, x, y, z) {
  cylinder(group, mats.ceramic, x, y + 0.008, z, 0.077, 0.065, 0.016);
  cylinder(group, mats.ivory, x, y + 0.048, z, 0.044, 0.033, 0.066, true);
  cylinder(group, mats.soil, x, y + 0.054, z, 0.042, 0.039, 0.005);
  mesh(group, new THREE.TorusGeometry(0.022, 0.0048, 7, 18), mats.ivory, x + 0.049, y + 0.049, z);
}

function books(group, mats, x, y, z) {
  box(group, mats.cover, x, y + 0.012, z, 0.16, 0.024, 0.228).rotation.y = 0.14;
  box(group, mats.ivory, x + 0.024, y + 0.032, z - 0.012, 0.14, 0.018, 0.18).rotation.y = -0.13;
}

function bottleSet(group, mats, x, y, z) {
  cylinder(group, mats.metal, x, y + 0.071, z, 0.094, 0.068, 0.142);
  cylinder(group, mats.ice, x, y + 0.142, z, 0.084, 0.083, 0.018);
  for (const [dx, dz] of [[-0.044, 0.03], [0.044, -0.032], [0.023, 0.041]]) {
    box(group, mats.ice, x + dx, y + 0.157, z + dz, 0.029, 0.026, 0.027).rotation.y = dx * 17;
  }
  cylinder(group, mats.cover, x - 0.007, y + 0.185, z - 0.01, 0.033, 0.035, 0.095);
  cylinder(group, mats.ivory, x - 0.007, y + 0.194, z - 0.01, 0.034, 0.035, 0.037);
  cylinder(group, mats.cover, x - 0.007, y + 0.239, z - 0.01, 0.013, 0.033, 0.025);
  cylinder(group, mats.gold, x - 0.007, y + 0.279, z - 0.01, 0.014, 0.014, 0.058);
}

function outdoorSeat(group, mats, plan) {
  if (plan.chair) {
    const [x, z, angle] = plan.chair;
    const chair = new THREE.Group();
    chair.position.set(x, deckY, z);
    chair.rotation.y = angle;
    group.add(chair);
    for (const a of [-1, 1]) for (const b of [-1, 1]) {
      cylinder(chair, mats.metal, a * 0.166, 0.124, b * 0.166, 0.015, 0.012, 0.248);
    }
    cylinder(chair, mats.rattan, 0, 0.285, 0, 0.309, 0.27, 0.075);
    cylinder(chair, mats.knit, 0, 0.355, 0.017, 0.282, 0.282, 0.078);
    mesh(chair, new THREE.CylinderGeometry(0.313, 0.306, 0.345, 24, 1, true, Math.PI / 2, Math.PI), mats.rattan, 0, 0.491, 0);
  }
  if (plan.pouf) {
    const [x, z] = plan.pouf;
    cylinder(group, mats.rattan, x, deckY + 0.156, z, 0.236, 0.214, 0.312);
    cylinder(group, mats.knit, x, deckY + 0.33, z, 0.228, 0.233, 0.037);
  }
  if (plan.lounger) {
    const [x, z] = plan.lounger;
    box(group, mats.rattan, x, deckY + 0.21, z, 0.65, 0.07, 1.76);
    for (const a of [-1, 1]) for (const b of [-1, 1]) {
      cylinder(group, mats.metal, x + a * 0.254, deckY + 0.094, z + b * 0.752, 0.024, 0.014, 0.188);
    }
    box(group, mats.knit, x, deckY + 0.292, z + 0.34, 0.626, 0.095, 1.03);
    box(group, mats.rattan, x, deckY + 0.397, z - 0.51, 0.638, 0.063, 0.78).rotation.x = 0.52;
    box(group, mats.knit, x, deckY + 0.448, z - 0.49, 0.626, 0.087, 0.76).rotation.x = 0.52;
  }
  if (plan.table) {
    const [x, z] = plan.table;
    cylinder(group, mats.metal, x, deckY + 0.016, z, 0.115, 0.145, 0.032);
    cylinder(group, mats.metal, x, deckY + 0.224, z, 0.022, 0.022, 0.425);
    cylinder(group, mats.rattan, x, deckY + 0.443, z, 0.194, 0.185, 0.037);
    if (plan.lounger) bottleSet(group, mats, x, deckY + 0.462, z);
    else tea(group, mats, x, deckY + 0.462, z);
  }
  if (plan.planter) plant(group, mats, plan.planter[0], deckY, plan.planter[1], 1.62);
}

export function createWalkStaging(basePath) {
  const mats = {
    knit: new THREE.MeshStandardMaterial({ color: 0xf0e3c9, roughness: 0.94, side: THREE.DoubleSide, bumpScale: 0.004 }),
    rattan: new THREE.MeshStandardMaterial({ color: 0xd5ad74, roughness: 0.77, side: THREE.DoubleSide, bumpScale: 0.004 }),
    shade: new THREE.MeshStandardMaterial({ color: 0xffedcf, emissive: 0xffb86c, emissiveIntensity: 0.18, roughness: 0.83, side: THREE.DoubleSide }),
    ceramic: new THREE.MeshStandardMaterial({ color: 0xc4a98d, roughness: 0.79 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x655340, metalness: 0.65, roughness: 0.42 }),
    ivory: new THREE.MeshStandardMaterial({ color: 0xe9dfcc, roughness: 0.50, side: THREE.DoubleSide }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x63744f, roughness: 0.83 }),
    soil: new THREE.MeshStandardMaterial({ color: 0x3c3026, roughness: 0.96 }),
    cover: new THREE.MeshStandardMaterial({ color: 0x3e503c, roughness: 0.69 }),
    ice: new THREE.MeshStandardMaterial({ color: 0xbdd9e2, roughness: 0.26 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xb99a57, metalness: 0.56, roughness: 0.38 }),
  };
  const loader = new THREE.TextureLoader();
  let loading;
  let disposed = false;

  const textureFiles = [['knit', 'map'], ['knit', 'bumpMap'], ['rattan', 'map'], ['rattan', 'bumpMap'], ['shade', 'map'], ['ceramic', 'map']];

  return {
    load() {
      loading ??= Promise.allSettled(textureFiles.map(async ([name, slot]) => {
        const suffix = slot === 'bumpMap' ? '-bump' : '';
        const texture = await loader.loadAsync(`${basePath}/assets/residences/materials/staging/${name}${suffix}.webp`);
        if (disposed) { texture.dispose(); return; }
        if (slot === 'map') texture.colorSpace = THREE.SRGBColorSpace;
        mats[name][slot] = texture;
        mats[name].needsUpdate = true;
      }));
      return loading;
    },
    decorate(model, slug) {
      const plan = STAGING_LAYOUTS[slug];
      if (!plan) return null;
      const staged = new THREE.Group();
      staged.name = 'Staged apartment decor';
      const named = new Map();
      model.traverse((item) => {
        if (!item.isMesh || !item.userData.af) return;
        const name = item.userData.name || item.name;
        if (!named.has(name)) named.set(name, []);
        named.get(name).push(item);
      });
      const surface = (name, index = 0) => named.get(name)?.[index]?.geometry.boundingBox;
      const [lx, lz] = plan.lamp.at;
      const table = surface(plan.lamp.on);
      const light = lamp(staged, mats, lx, table?.max.y ?? 0, lz, Boolean(table));
      const textile = surface(plan.throw.on, plan.throw.index);
      if (textile) blanket(staged, mats.knit, textile, plan.throw.edge);
      const top = surface(plan.tray.on);
      if (top) {
        const [x, z] = plan.tray.at;
        if (plan.tray.tea) tea(staged, mats, x, top.max.y, z);
        else plant(staged, mats, x, top.max.y, z, 0.67);
        books(staged, mats, x + 0.125, top.max.y, z + 0.09);
      }
      // The walk-through uses the detailed chaise in place of the original block.
      if (plan.patio.lounger && named.has('Terrace lounger')) {
        const old = named.get('Terrace lounger')[0];
        old.removeFromParent();
        old.geometry.dispose();
      }
      outdoorSeat(staged, mats, plan.patio);
      model.add(staged);
      return {
        blockers: Object.entries(plan.patio).map(([kind, [x, z]]) => {
          const [halfWidth, halfDepth] = PATIO_FOOTPRINTS[kind];
          return [x - halfWidth, z - halfDepth, x + halfWidth, z + halfDepth, staged];
        }),
        show(furnished, style) {
          staged.visible = furnished;
          mats.knit.color.setHex(style === 'art_deco' ? 0xc4ab85 : 0xf0e3c9);
          mats.metal.color.setHex(style === 'art_deco' ? 0x685540 : 0x555350);
        },
        setSun(day) { light.intensity = 0.38 + 1.05 * (1 - day); },
      };
    },
    dispose() {
      disposed = true;
      for (const material of Object.values(mats)) {
        material.map?.dispose();
        material.bumpMap?.dispose();
        material.dispose();
      }
    },
  };
}
