import * as THREE from './three.js';
import { addMetricUVs } from './styles.js?v=19';

export const ART_DECO_PILOT = '40-5';

const finishes = {
  floor: { map: 'oak-chevron', bump: 0.003, size: 1.2, roughness: 0.52 },
  plaster: { map: 'lime-plaster', bump: 0.004, size: 1.2, roughness: 0.9 },
  stone: { map: 'breccia', size: 1.6, roughness: 0.38 },
  linen: { map: 'linen', bump: 0.002, size: 0.42, roughness: 0.91 },
  olive: { map: 'linen', bump: 0.002, size: 0.42, roughness: 0.91, color: 0x7c8256 },
  lacquer: { color: 0xcbb69b, roughness: 0.44 },
  bronze: { color: 0x695440, roughness: 0.38, metalness: 0.72 },
  moulding: { color: 0xd7c5ad, roughness: 0.76 },
  diffuser: { color: 0xffebd6, emissive: 0xffcea1, roughness: 0.58 },
};

const sofaPieces = /^Sofa (base|seat|back|arm)$/;
const softPieces = /^(Armchair (seat|back|arm)|Headboard|Pillow)$/;

function finishOf(mesh, role) {
  const name = mesh.userData.name || mesh.name;
  if (sofaPieces.test(name)) return 'linen';
  if (/^Armchair /.test(name)) return 'olive';
  if (/^(Headboard|Pillow)$/.test(name)) return 'linen';
  if (/^(Coffee table|Kitchen (return )?countertop|Bath apron)$/.test(name) || role === 'tile') return 'stone';
  if (/^(Cabinet front|Kitchen (lower run|return|tall unit))$/.test(name)) return 'lacquer';
  if (role === 'wall' || role === 'column') return 'plaster';
  if (role === 'floor') return 'floor';
  return null;
}

function roundedBox(size, radius) {
  const geometry = new THREE.BoxGeometry(2, 2, 2, 8, 8, 8);
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

export function createArtDeco(renderer, assetUrl) {
  const loader = new THREE.TextureLoader();
  const textures = new Map();
  const materials = new Map();
  let ready;
  let disposed = false;

  function loadTexture(name, size, isColor) {
    if (!textures.has(name)) {
      const url = assetUrl(ART_DECO_PILOT, `art-deco-materials/${name}.webp`);
      textures.set(name, loader.loadAsync(url).then((texture) => {
        if (disposed) { texture.dispose(); return null; }
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1 / size, 1 / size);
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        if (isColor) texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
      }).catch(() => null));
    }
    return textures.get(name);
  }

  function load() {
    ready ??= Promise.all(Object.entries(finishes).map(async ([key, spec]) => {
      const [map, bumpMap] = spec.map ? await Promise.all([
        loadTexture(spec.map, spec.size, true),
        spec.bump ? loadTexture(`${spec.map}-bump`, spec.size, false) : null,
      ]) : [null, null];
      if (disposed || (spec.map && !map)) return;
      materials.set(key, new THREE.MeshStandardMaterial({
        map, bumpMap, bumpScale: spec.bump ?? 0, color: spec.color ?? 0xffffff,
        emissive: spec.emissive ?? 0x000000,
        roughness: spec.roughness, metalness: spec.metalness ?? 0, side: THREE.DoubleSide,
      }));
    }));
    return ready;
  }

  function decorate(model) {
    const details = new THREE.Group();
    const furniture = new THREE.Group();
    const replacements = new Map();
    const surfaces = new Map();
    const tallUnit = model.children.find((mesh) => mesh.userData.name === 'Kitchen tall unit');
    model.traverse((mesh) => {
      if (!mesh.userData.af) return;
      const name = mesh.userData.name || mesh.name;
      const finish = finishOf(mesh, mesh.userData.af.role);
      if (finish) surfaces.set(mesh, finish);
      const soft = sofaPieces.test(name) || softPieces.test(name);
      const countertop = name === 'Kitchen countertop' && tallUnit;
      if (!soft && !countertop) return;
      const original = mesh.geometry;
      const bounds = original.boundingBox.clone();
      if (countertop) bounds.min.x = tallUnit.geometry.boundingBox.max.x;
      const size = bounds.getSize(new THREE.Vector3());
      const centre = bounds.getCenter(new THREE.Vector3());
      const geometry = soft ? roundedBox(size, Math.min(size.x, size.y, size.z) * 0.32) : new THREE.BoxGeometry(size.x, size.y, size.z);
      geometry.translate(centre.x, centre.y, centre.z);
      addMetricUVs(geometry);
      replacements.set(mesh, { original, geometry });
    });

    function box(group, key, x, y, z, w, h, d, radius = 0) {
      const geometry = radius ? roundedBox(new THREE.Vector3(w, h, d), radius) : new THREE.BoxGeometry(w, h, d);
      addMetricUVs(geometry);
      const mesh = new THREE.Mesh(geometry, materials.get(key) ?? null);
      mesh.position.set(x, y, z);
      mesh.visible = materials.has(key);
      mesh.castShadow = Boolean(radius);
      mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    }

    // Interior faces of the living-room wall and the two legs of the kitchen.
    box(details, 'moulding', 0.011, 0.047, 4.48, 0.022, 0.094, 3.26);
    for (const z of [3.69, 4.62, 5.55]) {
      for (const [w, h] of [[0.84, 2.27], [0.72, 2.15]]) {
        for (const side of [-1, 1]) {
          box(details, 'moulding', 0.009, 1.40, z + side * w / 2, 0.018, h, 0.016);
          box(details, 'moulding', 0.009, 1.40 + side * h / 2, z, 0.018, 0.016, w);
        }
      }
    }
    box(furniture, 'stone', 5.65, 1.18, 2.779, 1.65, 0.55, 0.022);
    box(furniture, 'stone', 6.485, 1.18, 1.785, 0.022, 0.55, 0.85);
    for (const x of [5.116, 5.669, 6.222]) {
      box(furniture, 'lacquer', x, 1.8, 2.614, 0.539, 0.69, 0.34);
      box(furniture, 'bronze', x, 1.515, 2.437, 0.115, 0.014, 0.022, 0.004);
      box(furniture, 'bronze', x, 0.721, 2.173, 0.135, 0.018, 0.025, 0.005);
    }
    box(furniture, 'diffuser', 5.669, 1.45, 2.538, 1.58, 0.012, 0.028);
    const taskLight = new THREE.PointLight(0xffdab6, 0.65, 1.45);
    taskLight.position.set(5.669, 1.4, 2.49);
    furniture.add(taskLight);
    for (const [z, tilt] of [[4.15, 0.29], [5.49, -0.24]]) {
      const cushion = box(furniture, 'olive', 0.239, 0.631, z, 0.155, 0.334, 0.354, 0.071);
      cushion.rotation.x = tilt;
      cushion.rotation.z = -0.22;
    }

    model.add(details, furniture);
    return {
      materialFor(mesh) { return materials.get(surfaces.get(mesh)); },
      show(active, showFurniture) {
        details.visible = active;
        furniture.visible = active && showFurniture;
        replacements.forEach(({ original, geometry }, mesh) => { mesh.geometry = active ? geometry : original; });
      },
      dispose() {
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
      for (const material of materials.values()) material.dispose();
    },
  };
}
