import * as THREE from './three.js';
import { addMetricUVs } from './styles.js?v=19';
import { FINISH_LAYOUTS } from './walk-finish-layouts.js?v=2';

const profiles = {
  art_deco: {
    folder: 'art-deco', light: 0xffdab6,
    finishes: {
      floor: { map: 'oak-chevron', bump: 0.003, size: 1.2, roughness: 0.52 },
      plaster: { map: 'lime-plaster', bump: 0.004, size: 1.2, roughness: 0.9 },
      stone: { map: 'breccia', size: 1.6, roughness: 0.38 },
      upholstery: { map: 'linen', bump: 0.002, size: 0.42, roughness: 0.91 },
      accent: { map: 'linen', bump: 0.002, size: 0.42, roughness: 0.91, color: 0x7c8256 },
      casework: { color: 0xcbb69b, roughness: 0.44 },
      wood: { folder: 'black-sea-modern', map: 'oak-veneer', size: 1.24, color: 0x846043, roughness: 0.47 },
      hardware: { color: 0x695440, roughness: 0.38, metalness: 0.72 },
      moulding: { color: 0xd7c5ad, roughness: 0.76 },
      innerMoulding: { color: 0xd7c5ad, roughness: 0.76 },
      diffuser: { color: 0xffebd6, emissive: 0xffcea1, roughness: 0.58 },
    },
  },
  black_sea: {
    folder: 'black-sea-modern', light: 0xffd2a2,
    finishes: {
      floor: { map: 'oak-chevron', bump: 0.003, size: 1.06, roughness: 0.58 },
      plaster: { map: 'venetian-plaster', bump: 0.004, size: 1.45, roughness: 0.88 },
      stone: { map: 'travertine', bump: 0.003, size: 1.15, roughness: 0.57 },
      upholstery: { map: 'oat-boucle', bump: 0.002, size: 0.30, roughness: 0.94 },
      accent: { map: 'oat-boucle', bump: 0.002, size: 0.30, roughness: 0.9, color: 0x858365 },
      rug: { map: 'oat-boucle', bump: 0.004, size: 0.30, roughness: 0.97, color: 0xc2a57f },
      casework: { map: 'oak-veneer', size: 1.24, roughness: 0.56 },
      wood: { map: 'oak-veneer', size: 1.24, roughness: 0.63, color: 0xdcc3a7 },
      integrated: { map: 'oak-veneer', size: 1.24, roughness: 0.56 },
      hardware: { color: 0x766247, roughness: 0.43, metalness: 0.66 },
      moulding: { color: 0xdfcdb6, roughness: 0.89 },
      diffuser: { color: 0xffedde, emissive: 0xffc694, roughness: 0.58 },
      painting: { map: 'coastal-painting', roughness: 0.93 },
      frame: { color: 0x8b6d4e, roughness: 0.59 },
    },
  },
};

const sofaPieces = /^Sofa\b/i;
const armchairPieces = /^Armchair\b/i;
const bedding = /\b(headboard|pillow|duvet|mattress)\b/i;

function meshName(mesh) {
  return mesh.userData.name || mesh.name;
}

function finishOf(mesh, role) {
  const name = meshName(mesh);
  if (sofaPieces.test(name)) return 'upholstery';
  if (armchairPieces.test(name)) return 'accent';
  if (bedding.test(name) || role === 'fabric') return 'upholstery';
  if (role === 'tile' || /^(Coffee table(?: top)?|Dining table top|Bath apron)$|^Kitchen .*\b(?:countertop|top)\b/i.test(name)) return 'stone';
  if (/^Cabinet front$|^Kitchen (?:lower run|return|tall unit)$|^Kitchen .*\bbase\b/i.test(name)) return 'casework';
  if (role === 'metal' && /\b(tap|mixer|handle|towel rail)\b/i.test(name)) return 'hardware';
  if (name === 'Refrigerator') return 'integrated';
  if (role === 'wall' || role === 'column') return 'plaster';
  if (role === 'floor') return 'floor';
  return role === 'rug' || role === 'wood' ? role : null;
}

function roundedBox(size, radius, mobile = false) {
  const segs = mobile ? 3 : 8;
  const geometry = new THREE.BoxGeometry(2, 2, 2, segs, segs, segs);
  const { position, normal } = geometry.attributes;
  const inner = size.clone().multiplyScalar(0.5).addScalar(-radius);
  const point = new THREE.Vector3(), centre = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i);
    centre.copy(point).clampScalar(-0.5, 0.5);
    n.subVectors(point, centre).normalize();
    centre.multiplyScalar(2).multiply(inner).addScaledVector(n, radius);
    position.setXYZ(i, centre.x, centre.y, centre.z);
    normal.setXYZ(i, n.x, n.y, n.z);
  }
  return geometry;
}

// One instanced draw for the soft occlusion immediately beneath the furniture.
function contactShadows(bases, rugs) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const fade = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  fade.addColorStop(0, 'rgba(40,31,25,.27)');
  fade.addColorStop(.68, 'rgba(40,31,25,.18)');
  fade.addColorStop(1, 'rgba(40,31,25,0)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, 64, 64);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const shadow = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false }), bases.length);
  const transform = new THREE.Object3D();
  bases.forEach((box, i) => {
    box.getCenter(transform.position);
    const { x, z } = transform.position;
    const rug = rugs.find((r) => x >= r.min.x && x <= r.max.x && z >= r.min.z && z <= r.max.z);
    transform.position.y = (rug?.max.y ?? box.min.y) + .001;
    transform.scale.set((box.max.x - box.min.x) * 1.25, 1, (box.max.z - box.min.z) * 1.25);
    transform.updateMatrix();
    shadow.setMatrixAt(i, transform.matrix);
  });
  return shadow;
}

export function createWalkFinishes(renderer, basePath, { mobile = false } = {}) {
  const loader = new THREE.TextureLoader();
  const textures = new Map();
  const materialSets = new Map();
  const pending = new Map();
  let disposed = false;

  function loadTexture(folder, name, size, isColor) {
    const url = `${basePath}/assets/residences/materials/${folder}/${name}.webp`;
    if (!textures.has(url)) {
      textures.set(url, loader.loadAsync(url).then((texture) => {
        if (disposed) { texture.dispose(); return null; }
        if (size) {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(1 / size, 1 / size);
        }
        texture.anisotropy = mobile ? 2 : Math.min(8, renderer.capabilities.getMaxAnisotropy());
        if (isColor) texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
      }).catch(() => null));
    }
    return textures.get(url);
  }

  function load(styleId) {
    const profile = profiles[styleId];
    if (!profile || disposed) return;
    if (pending.has(styleId)) return pending.get(styleId);
    const materials = new Map();
    const loaded = Promise.all(Object.entries(profile.finishes).map(async ([key, spec]) => {
      const [map, bumpMap] = spec.map ? await Promise.all([
        loadTexture(spec.folder ?? profile.folder, spec.map, spec.size, true),
        spec.bump ? loadTexture(spec.folder ?? profile.folder, `${spec.map}-bump`, spec.size, false) : null,
      ]) : [null, null];
      if (disposed || (spec.map && !map)) return;
      materials.set(key, new THREE.MeshStandardMaterial({
        map, bumpMap, bumpScale: spec.bump ?? 0, color: spec.color ?? 0xffffff,
        emissive: spec.emissive ?? 0x000000,
        roughness: spec.roughness, metalness: spec.metalness ?? 0, side: THREE.DoubleSide,
      }));
    })).then(() => {
      if (disposed) materials.forEach((material) => material.dispose());
      else materialSets.set(styleId, materials);
    });
    pending.set(styleId, loaded);
    return loaded;
  }

  function decorate(model, slug) {
    const layout = FINISH_LAYOUTS[slug];
    const details = new THREE.Group();
    const furniture = new THREE.Group();
    const replacements = new Map();
    const surfaces = new Map();
    const props = new Map();
    const lights = [];
    let activeMaterials;
    const named = new Map();
    const sofaBacks = [];
    const sofaSeats = [];
    const bases = [], rugs = [];
    const tallUnit = model.children.find((mesh) => meshName(mesh) === 'Kitchen tall unit');
    model.traverse((mesh) => {
      if (!mesh.userData.af) return;
      const name = meshName(mesh);
      named.set(name, mesh);
      const finish = finishOf(mesh, mesh.userData.af.role);
      if (finish) surfaces.set(mesh, finish);
      if (finish === 'rug') rugs.push(mesh.geometry.boundingBox);
      if (/^(Bed(?: \d+)? frame|Sofa .*base|Armchair base|Wardrobe(?: \d+| closet)?|WC pedestal)$/i.test(name)) {
        bases.push(mesh.geometry.boundingBox);
      }
      if (/^Sofa .*\bback$/i.test(name)) sofaBacks.push(mesh.geometry.boundingBox);
      if (/^Sofa .*\b(?:seat|cushion)$/i.test(name)) {
        sofaSeats.push(mesh.geometry.boundingBox.getCenter(new THREE.Vector3()));
      }
      // The exporter emits 36 vertices for a box. Preserve oval seats and other curved models.
      const boxMesh = mesh.geometry.attributes.position.count === 36;
      const soft = boxMesh && (sofaPieces.test(name) || armchairPieces.test(name) || bedding.test(name));
      const veneer = boxMesh && /^(Bed(?: \d+)? frame|Media console|Bedside cabinet|Bed.*nightstand.*)$/i.test(name);
      const countertop = name === 'Kitchen countertop' && tallUnit &&
        mesh.geometry.boundingBox.min.x < tallUnit.geometry.boundingBox.max.x;
      if (!soft && !countertop && !veneer) return;
      const original = mesh.geometry;
      const bounds = original.boundingBox.clone();
      if (countertop) bounds.min.x = tallUnit.geometry.boundingBox.max.x;
      const size = bounds.getSize(new THREE.Vector3());
      const centre = bounds.getCenter(new THREE.Vector3());
      const radius = soft ? Math.min(size.x, size.y, size.z) * 0.32 : veneer ? 0.004 : 0;
      const geometry = radius ? roundedBox(size, radius, mobile) : new THREE.BoxGeometry(size.x, size.y, size.z);
      if (/pillow/i.test(name)) {
        const p = geometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = 2 * p.getX(i) / size.x, z = 2 * p.getZ(i) / size.z;
          const loft = (1 - x * x) * (1 - z * z);
          p.setY(i, p.getY(i) * (0.72 + 0.55 * loft));
        }
        geometry.computeVertexNormals();
      }
      geometry.translate(centre.x, centre.y, centre.z);
      addMetricUVs(geometry);
      if (veneer) {
        const { uv, normal } = geometry.attributes;
        for (let i = 0; i < uv.count; i++) {
          if (Math.abs(normal.getY(i)) < .7 || size.x > size.z) uv.setXY(i, uv.getY(i), uv.getX(i));
        }
      }
      replacements.set(mesh, { original, geometry });
    });
    const shadows = contactShadows(bases, rugs);
    furniture.add(shadows);

    function box(group, key, x, y, z, w, h, d, radius = 0) {
      const geometry = radius ? roundedBox(new THREE.Vector3(w, h, d), radius, mobile) : new THREE.BoxGeometry(w, h, d);
      addMetricUVs(geometry);
      const mesh = new THREE.Mesh(geometry, null);
      mesh.position.set(x, y, z);
      mesh.visible = false;
      mesh.castShadow = Boolean(radius);
      mesh.receiveShadow = true;
      group.add(mesh);
      props.set(mesh, key);
      return mesh;
    }

    // Along the face, u is horizontal and v is depth on the face's normal axis.
    function alongFace(group, key, axis, u, y, v, w, h, d, radius) {
      return axis === 'x' ? box(group, key, v, y, u, d, h, w, radius) : box(group, key, u, y, v, w, h, d, radius);
    }

    function addPanel([wall, face, start, end]) {
      const bounds = named.get(wall)?.geometry.boundingBox;
      if (!bounds) return;
      const [axis, side] = face;
      const sign = side === '+' ? 1 : -1;
      const edge = (sign > 0 ? bounds.max : bounds.min)[axis];
      const span = end - start;
      const count = Math.max(2, Math.round(span / 0.92));
      const step = span / count;
      alongFace(details, 'moulding', axis, (start + end) / 2, 0.047, edge + 0.012 * sign, span, 0.094, 0.024);
      for (let i = 0; i < count; i++) {
        const u = start + (i + 0.5) * step;
        for (const [key, width, height] of [['moulding', step - 0.07, 2.27], ['innerMoulding', step - 0.19, 2.15]]) {
          const v = edge + 0.01 * sign;
          for (const side of [-1, 1]) {
            alongFace(details, key, axis, u + side * width / 2, 1.40, v, 0.016, height - 0.016, 0.02);
            alongFace(details, key, axis, u, 1.40 + side * height / 2, v, width + 0.016, 0.016, 0.02);
          }
        }
      }
      const u = start + (Math.floor(count / 2) + 0.5) * step;
      const width = step - 0.17;
      const height = width * 0.75;
      const y = 1.66;
      alongFace(furniture, 'frame', axis, u, y, edge + 0.022 * sign, width + 0.042, height + 0.042, 0.033);
      const painting = new THREE.Mesh(new THREE.PlaneGeometry(width, height), null);
      const depth = edge + 0.04 * sign;
      painting.position.set(axis === 'x' ? depth : u, y, axis === 'x' ? u : depth);
      painting.rotation.y = axis === 'x' ? sign * Math.PI / 2 : (sign > 0 ? 0 : Math.PI);
      painting.visible = false;
      painting.receiveShadow = true;
      furniture.add(painting);
      props.set(painting, 'painting');
    }

    function addKitchen([top, face, start, end, upper = true]) {
      const bounds = named.get(top)?.geometry.boundingBox;
      if (!bounds) return;
      const [axis, side] = face;
      const sign = side === '+' ? 1 : -1;
      const edge = (sign > 0 ? bounds.min : bounds.max)[axis];
      const y = bounds.max.y;
      const span = end - start;
      const centre = (start + end) / 2;
      alongFace(furniture, 'stone', axis, centre, y + 0.275, edge + 0.024 * sign, span, 0.55, 0.022);
      if (!upper) return;
      const count = Math.max(2, Math.round(span / 0.58));
      const step = span / count;
      for (let i = 0; i < count; i++) {
        const u = start + (i + 0.5) * step;
        alongFace(furniture, 'casework', axis, u, y + 0.895, edge + 0.18 * sign, step - 0.014, 0.69, 0.34);
        alongFace(furniture, 'hardware', axis, u, y + 0.61, edge + 0.357 * sign, 0.115, 0.014, 0.022, 0.004);
      }
      alongFace(furniture, 'diffuser', axis, centre, y + 0.545, edge + 0.25 * sign, span - 0.06, 0.012, 0.028);
      const taskLight = new THREE.PointLight(0xffdab6, 0.65, 1.45);
      const depth = edge + 0.29 * sign;
      taskLight.position.set(axis === 'x' ? depth : centre, y + 0.495, axis === 'x' ? centre : depth);
      furniture.add(taskLight);
      lights.push(taskLight);
    }

    if (layout) {
      addPanel(layout.panel);
      layout.kitchens.forEach(addKitchen);
    }
    if (tallUnit) {
      for (const x of [5.116, 5.709, 6.278]) box(furniture, 'hardware', x, 0.721, 2.173, 0.135, 0.018, 0.025, 0.005);
    }
    for (const bounds of sofaBacks) {
      if (!sofaSeats.length) break;
      const centre = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      const [axis, lengthAxis] = size.x < size.z ? ['x', 'z'] : ['z', 'x'];
      const closest = sofaSeats.reduce((a, b) => a.distanceToSquared(centre) < b.distanceToSquared(centre) ? a : b);
      const sign = Math.sign(closest[axis] - centre[axis]);
      const depth = (sign > 0 ? bounds.max : bounds.min)[axis] + 0.055 * sign;
      const positions = size[lengthAxis] > 1.65 ? [0.19, 0.81] : [0.5];
      for (const fraction of positions) {
        const u = bounds.min[lengthAxis] + size[lengthAxis] * fraction;
        const cushion = alongFace(furniture, 'accent', axis, u, bounds.max.y - 0.16, depth, 0.354, 0.334, 0.155, 0.071);
        const tilt = fraction < 0.5 ? 0.26 : -0.24;
        cushion.rotation.x = axis === 'x' ? tilt : 0.22 * sign;
        cushion.rotation.z = axis === 'x' ? -0.22 * sign : tilt;
      }
    }

    model.add(details, furniture);
    return {
      view: layout?.view,
      materialFor(mesh) { return activeMaterials?.get(surfaces.get(mesh)); },
      show(styleId, showFurniture) {
        activeMaterials = materialSets.get(styleId);
        const active = Boolean(activeMaterials);
        details.visible = active;
        furniture.visible = active && showFurniture;
        for (const [mesh, key] of props) {
          mesh.material = activeMaterials?.get(key) ?? null;
          mesh.visible = Boolean(mesh.material);
        }
        if (active) lights.forEach((light) => light.color.setHex(profiles[styleId].light));
        replacements.forEach(({ original, geometry }, mesh) => { mesh.geometry = active ? geometry : original; });
      },
      dispose() {
        shadows.material.map.dispose();
        shadows.material.dispose();
        shadows.dispose();
        replacements.forEach(({ original, geometry }, mesh) => {
          mesh.geometry = original;
          geometry.dispose();
        });
        model.remove(details, furniture);
        for (const group of [details, furniture]) group.traverse((mesh) => mesh.geometry?.dispose());
      },
    };
  }

  return {
    load, decorate,
    dispose() {
      disposed = true;
      for (const texture of textures.values()) texture.then((t) => t?.dispose());
      for (const materials of materialSets.values()) materials.forEach((material) => material.dispose());
    },
  };
}
