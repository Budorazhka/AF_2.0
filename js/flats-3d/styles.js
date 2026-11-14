/* Renovation options for the walk-through.

   The apartment models (apartment-3d/lib.py) carry no textures: every object
   has one of a dozen colours that say what it is (wall, floor, wood, fabric…).
   A style maps those roles to materials; surfaces get box-projected UVs so the
   procedural textures below sit at real-world scale. Names match the interior
   render sets already on the site («Ар-деко», «Черноморский модерн»), plus the
   white box the flats are actually handed over in. */
import * as THREE from './three.js';

// role colours written by lib.py (sRGB hex as stored in the glTF factor)
const ROLES = {
  wall: '#ece8df', column: '#ded8cc', floor: '#c5a783', wood: '#947657', fabric: '#a7b1a3',
  white: '#faf7ef', dark: '#3b4547', metal: '#798d90', tile: '#d2d8d4', glass: '#a9c6cb',
  rug: '#ddd6c6', blue_glass: '#163e59', appliance: '#dcd8cf',
};
const ROLE_RGB = Object.entries(ROLES).map(([k, hex]) => [k, new THREE.Color(hex)]);

/** Role of a glTF material: compares the raw factor with the lib.py palette. */
export function roleOf(material) {
  const c = material.color;
  let best = null, dist = 0.05;
  for (const [k, ref] of ROLE_RGB) {
    // ref was parsed as sRGB and converted to linear; compare in the same space as the raw factor
    const d = Math.abs(c.r - srgb(ref.r)) + Math.abs(c.g - srgb(ref.g)) + Math.abs(c.b - srgb(ref.b));
    if (d < dist) { dist = d; best = k; }
  }
  return best;
}
function srgb(linear) { return linear <= 0.0031308 ? linear * 12.92 : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055; }

export const STYLES = [
  {
    id: 'white_box', title: 'Белый каркас', furniture: false,
    roles: {
      wall: { color: '#f1f0ec', map: 'plaster', roughness: 0.95 },
      column: { color: '#efeee9', map: 'plaster', roughness: 0.95 },
      ceiling: { color: '#f4f3f0', roughness: 0.95 },
      floor: { color: '#b7b3ab', map: 'concrete', roughness: 0.9, size: 1.6 },
      tile: { color: '#b7b3ab', map: 'concrete', roughness: 0.9, size: 1.6 },
      terrace: { color: '#c9c5bd', map: 'tiles', roughness: 0.85, size: 0.6 },
    },
  },
  {
    id: 'art_deco', title: 'Ар-деко', furniture: true,
    roles: {
      wall: { color: '#ece3d4', map: 'plaster', roughness: 0.9 },
      column: { color: '#e6dccb', map: 'plaster', roughness: 0.9 },
      ceiling: { color: '#f2ece2', roughness: 0.92 },
      floor: { color: '#6b4630', map: 'parquet', roughness: 0.45, size: 1.2 },
      wood: { color: '#4b2e20', roughness: 0.35 },
      fabric: { color: '#1f4a40', roughness: 0.75 },
      white: { color: '#f1ece3', map: 'marble', roughness: 0.25, size: 1.4 },
      dark: { color: '#1b1b1d', roughness: 0.3 },
      metal: { color: '#b08d57', roughness: 0.32, metalness: 1 },
      tile: { color: '#efebe5', map: 'marble', roughness: 0.2, size: 1.2 },
      rug: { color: '#c3a874', roughness: 0.95 },
      appliance: { color: '#2a2a2c', roughness: 0.35, metalness: 0.4 },
      terrace: { color: '#d8d2c8', map: 'tiles', roughness: 0.8, size: 0.6 },
    },
  },
  {
    id: 'black_sea', title: 'Черноморский модерн', furniture: true,
    roles: {
      wall: { color: '#f4f2ed', map: 'plaster', roughness: 0.92 },
      column: { color: '#f1efe9', map: 'plaster', roughness: 0.92 },
      ceiling: { color: '#f7f6f2', roughness: 0.95 },
      floor: { color: '#c9a77d', map: 'planks', roughness: 0.6, size: 1.8 },
      wood: { color: '#b8946a', roughness: 0.55 },
      fabric: { color: '#d6ccb9', roughness: 0.85 },
      white: { color: '#f7f5ef', roughness: 0.6 },
      dark: { color: '#2e434c', roughness: 0.5 },
      metal: { color: '#a3abae', roughness: 0.35, metalness: 0.9 },
      tile: { color: '#e5e2da', map: 'terrazzo', roughness: 0.4, size: 0.9 },
      rug: { color: '#8ea7ad', roughness: 0.95 },
      appliance: { color: '#e9e7e2', roughness: 0.4, metalness: 0.2 },
      terrace: { color: '#b49673', map: 'planks', roughness: 0.8, size: 1.8 },
    },
  },
];

/* -- procedural textures ------------------------------------------------- */

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}

function shade(hex, f) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, f);
  return '#' + c.getHexString();
}

const PAINTERS = {
  plaster(ctx, n, base, r) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, n, n);
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.018)' : 'rgba(255,255,255,0.03)';
      const s = 2 + r() * 10;
      ctx.fillRect(r() * n, r() * n, s, s);
    }
  },
  concrete(ctx, n, base, r) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, n, n);
    for (let i = 0; i < 220; i++) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      const a = 0.03 + r() * 0.05;
      g.addColorStop(0, r() < 0.5 ? `rgba(60,55,50,${a})` : `rgba(255,255,255,${a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save(); ctx.translate(r() * n, r() * n); ctx.scale(20 + r() * 60, 20 + r() * 60);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    for (let i = 0; i < 1800; i++) { ctx.fillStyle = 'rgba(40,40,40,0.06)'; ctx.fillRect(r() * n, r() * n, 1.5, 1.5); }
  },
  planks(ctx, n, base, r) {
    const rows = 8, h = n / rows;           // one tile = `size` metres, 8 boards across
    for (let i = 0; i < rows; i++) {
      let x = -r() * n;
      while (x < n) {
        const len = n * (0.45 + r() * 0.6);
        ctx.fillStyle = shade(base, (r() - 0.5) * 0.07);
        ctx.fillRect(x, i * h, len, h);
        ctx.strokeStyle = 'rgba(60,40,20,0.10)';
        for (let k = 0; k < 5; k++) {
          ctx.beginPath();
          const yy = i * h + r() * h;
          ctx.moveTo(x, yy); ctx.bezierCurveTo(x + len * 0.3, yy + (r() - 0.5) * 4, x + len * 0.6, yy + (r() - 0.5) * 4, x + len, yy);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(40,25,10,0.35)'; ctx.fillRect(x, i * h, 1.5, h);
        x += len;
      }
      ctx.fillStyle = 'rgba(40,25,10,0.3)'; ctx.fillRect(0, i * h, n, 1.5);
    }
  },
  parquet(ctx, n, base, r) {
    // square parquet: 2 x 2 blocks of four boards, direction alternating (seamless)
    const cell = n / 2, bw = cell / 4;
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const across = (i + j) % 2 === 0;
        for (let k = 0; k < 4; k++) {
          ctx.fillStyle = shade(base, (r() - 0.5) * 0.1);
          const x = i * cell + (across ? 0 : k * bw), y = j * cell + (across ? k * bw : 0);
          const w = across ? cell : bw, h = across ? bw : cell;
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = 'rgba(70,45,20,0.10)';
          for (let g = 0; g < 4; g++) {
            ctx.beginPath();
            if (across) { const yy = y + r() * h; ctx.moveTo(x, yy); ctx.lineTo(x + w, yy + (r() - 0.5) * 3); }
            else { const xx = x + r() * w; ctx.moveTo(xx, y); ctx.lineTo(xx + (r() - 0.5) * 3, y + h); }
            ctx.stroke();
          }
          ctx.strokeStyle = 'rgba(30,18,8,0.5)'; ctx.lineWidth = 1.2; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        }
      }
    }
  },
  marble(ctx, n, base, r) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, n, n);
    for (let v = 0; v < 9; v++) {
      ctx.strokeStyle = `rgba(110,105,100,${0.05 + r() * 0.12})`;
      ctx.lineWidth = 0.8 + r() * 2.2;
      ctx.beginPath();
      let x = r() * n, y = 0;
      ctx.moveTo(x, y);
      while (y < n) { x += (r() - 0.45) * 60; y += 20 + r() * 40; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  },
  terrazzo(ctx, n, base, r) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, n, n);
    const chips = ['#c9c2b4', '#9fa7a3', '#d9cfbf', '#7d8b8c', '#efe9df'];
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = chips[Math.floor(r() * chips.length)];
      ctx.beginPath();
      const x = r() * n, y = r() * n, s = 1 + r() * 5;
      ctx.ellipse(x, y, s, s * (0.5 + r()), r() * 3, 0, Math.PI * 2); ctx.fill();
    }
  },
  tiles(ctx, n, base, r) {
    const k = 2, s = n / k;
    for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) { ctx.fillStyle = shade(base, (r() - 0.5) * 0.04); ctx.fillRect(i * s, j * s, s, s); }
    ctx.fillStyle = 'rgba(80,75,70,0.35)';
    for (let i = 0; i <= k; i++) { ctx.fillRect(i * s - 1, 0, 2, n); ctx.fillRect(0, i * s - 1, n, 2); }
  },
};

const texCache = new Map();
function texture(kind, base, renderer) {
  const key = kind + base;
  if (texCache.has(key)) return texCache.get(key);
  const n = 512;
  const [c, ctx] = canvas(n);
  PAINTERS[kind](ctx, n, base, rng(kind.length * 7 + base.length));
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 4;
  texCache.set(key, t);
  return t;
}

/** Material for a role in a style (cached). */
const matCache = new Map();
export function materialFor(style, role, renderer) {
  const spec = style.roles[role];
  if (!spec) return null;
  const key = style.id + ':' + role;
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({
    color: spec.map ? '#ffffff' : spec.color,
    roughness: spec.roughness ?? 0.8,
    metalness: spec.metalness ?? 0,
  });
  if (spec.map) {
    m.map = texture(spec.map, spec.color, renderer);
    m.map.repeat.set(1 / (spec.size || 1), 1 / (spec.size || 1));   // UVs are in metres
  }
  matCache.set(key, m);
  return m;
}

/** Box-projected UVs in metres (u, v = 1 per metre) — the models have none. */
export function addMetricUVs(geometry) {
  const p = geometry.attributes.position, nrm = geometry.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(nrm.getX(i)), ay = Math.abs(nrm.getY(i)), az = Math.abs(nrm.getZ(i));
    if (ay >= ax && ay >= az) { uv[i * 2] = p.getX(i); uv[i * 2 + 1] = p.getZ(i); }
    else if (ax >= az) { uv[i * 2] = p.getZ(i); uv[i * 2 + 1] = p.getY(i); }
    else { uv[i * 2] = p.getX(i); uv[i * 2 + 1] = p.getY(i); }
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

export function disposeStyles() {
  texCache.forEach((t) => t.dispose()); texCache.clear();
  matCache.forEach((m) => m.dispose()); matCache.clear();
}
