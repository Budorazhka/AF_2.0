import * as THREE from './three.js';
import { mergeGeometries } from './three.js';
import { createWalkStaging } from './walk-staging.js?v=1';

// Facing into the living room for each TV in the apartment assets.
const tvFaces = { '48-5': 'x-', '81-8': 'z+', '107-1': 'z-' };
const unsupportedSeats = /^(?:(?:Dining|Terrace) chair|Chair seat) (?:north|south|east|west)$/i;

function centreline(mesh) {
  const vertices = mesh.geometry.attributes.position;
  const bottom = mesh.geometry.boundingBox.min.y;
  const points = [];
  for (let i = 0; i < vertices.count; i++) {
    if (Math.abs(vertices.getY(i) - bottom) > 0.001) continue;
    const point = new THREE.Vector2(vertices.getX(i), vertices.getZ(i));
    if (!points.some((other) => point.equals(other))) points.push(point);
  }
  if (points.length !== 4) return null;
  const centre = points.reduce((sum, point) => sum.add(point), new THREE.Vector2()).multiplyScalar(0.25);
  points.sort((a, b) => Math.atan2(a.y - centre.y, a.x - centre.x) - Math.atan2(b.y - centre.y, b.x - centre.x));
  const edges = points.map((a, i) => [a, points[(i + 1) % points.length]]);
  edges.sort(([a, b], [c, d]) => a.distanceToSquared(b) - c.distanceToSquared(d));
  return edges.slice(0, 2).map(([a, b]) => a.clone().lerp(b, 0.5));
}

function balconyFrame(panes) {
  const parts = [], posts = [];
  for (const pane of panes) {
    const span = centreline(pane);
    if (!span) continue;
    const [a, b] = span;
    const length = a.distanceTo(b);
    if (length < 0.1) continue;
    const bounds = pane.geometry.boundingBox;
    const floor = bounds.min.y - 0.10;
    const top = bounds.max.y + 0.014;
    const mid = a.clone().lerp(b, 0.5);
    const angle = -Math.atan2(b.y - a.y, b.x - a.x);
    for (const [y, height, depth] of [[(bounds.min.y + floor) / 2, 0.10, 0.061], [top, 0.036, 0.048]]) {
      parts.push(new THREE.BoxGeometry(length + 0.035, height, depth).rotateY(angle).translate(mid.x, y, mid.y));
    }
    const spans = Math.ceil(length / 1.22);
    for (let i = 0; i <= spans; i++) {
      const point = a.clone().lerp(b, i / spans);
      if (posts.some((other) => other.distanceToSquared(point) < 0.0049)) continue;
      posts.push(point);
      parts.push(new THREE.BoxGeometry(0.041, top - floor, 0.045)
        .rotateY(angle).translate(point.x, (top + floor) / 2, point.y));
    }
  }
  if (!parts.length) return null;
  const geometry = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  return geometry;
}

export function createWalkAccessories(basePath) {
  const staging = createWalkStaging(basePath);
  const metal = new THREE.MeshStandardMaterial({ color: 0x4a5158, roughness: 0.37, metalness: 0.76 });
  const display = new THREE.MeshBasicMaterial({ color: 0xe2e9ee, toneMapped: false });
  let screen;
  let disposed = false;

  function loadScreen() {
    screen ??= new THREE.TextureLoader().loadAsync(`${basePath}/assets/residences/materials/aurum-tv.webp`).then((texture) => {
      if (disposed) { texture.dispose(); return false; }
      texture.colorSpace = THREE.SRGBColorSpace;
      display.map = texture;
      display.needsUpdate = true;
      return true;
    }).catch(() => false);
    return screen;
  }

  function addDisplay(tv, face) {
    const [axis, side] = face;
    const sign = side === '+' ? 1 : -1;
    const bounds = tv.geometry.boundingBox;
    const size = bounds.getSize(new THREE.Vector3());
    const width = (axis === 'x' ? size.z : size.x) - 0.027;
    const height = size.y - 0.027;
    const aspect = 16 / 9;
    const picture = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(width, height * aspect), Math.min(height, width / aspect)), display);
    picture.name = 'Aurum Fort TV screen';
    bounds.getCenter(picture.position);
    picture.position[axis] = (sign > 0 ? bounds.max : bounds.min)[axis] + sign * 0.0015;
    picture.rotation.y = axis === 'x' ? sign * Math.PI / 2 : (sign > 0 ? 0 : Math.PI);
    picture.visible = false;
    tv.add(picture);
    loadScreen().then((loaded) => { picture.visible = loaded; });
  }

  function addChairLegs(seat, floor) {
    const bounds = seat.geometry.boundingBox;
    const centre = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const height = bounds.min.y - floor;
    const legs = [];
    for (const x of [-1, 1]) {
      for (const z of [-1, 1]) {
        legs.push(new THREE.BoxGeometry(0.032, height, 0.032)
          .translate(centre.x + x * size.x * 0.34, floor + height / 2, centre.z + z * size.z * 0.34));
      }
    }
    const support = new THREE.Mesh(mergeGeometries(legs, false), metal);
    support.name = 'Chair legs';
    support.castShadow = true;
    support.receiveShadow = true;
    for (const part of legs) part.dispose();
    seat.add(support);
  }

  return {
    load: staging.load,
    decorate(model, slug) {
      const panes = [], previousRails = [], seats = [];
      let tv;
      model.traverse((mesh) => {
        if (!mesh.userData.af) return;
        const { group, role } = mesh.userData.af;
        const name = mesh.userData.name || mesh.name;
        if (group === 'rail' && role === 'blue_glass') panes.push(mesh);
        if (group === 'rail' && /handrail/i.test(name)) previousRails.push(mesh);
        if (group === 'furniture' && name === 'TV panel') tv = mesh;
        if (group === 'furniture' && unsupportedSeats.test(name)) seats.push([mesh, /^Terrace/i.test(name) ? -0.02 : 0]);
      });
      const frame = balconyFrame(panes);
      if (frame) {
        for (const mesh of previousRails) mesh.visible = false;
        const support = new THREE.Mesh(frame, metal);
        support.name = 'Balcony metal frame';
        support.castShadow = true;
        support.receiveShadow = true;
        model.add(support);
      }
      if (tv && tvFaces[slug]) addDisplay(tv, tvFaces[slug]);
      for (const [seat, floor] of seats) addChairLegs(seat, floor);
      return staging.decorate(model, slug);
    },
    dispose() {
      disposed = true;
      display.map?.dispose();
      display.dispose();
      metal.dispose();
      staging.dispose();
    },
  };
}
