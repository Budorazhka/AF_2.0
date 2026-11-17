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
      wall: { color: '#f1f0ec', map: 'plaster', roughness: 0.92, bump: 0.012, size: 1.4 },
      column: { color: '#efeee9', map: 'plaster', roughness: 0.92, bump: 0.012, size: 1.4 },
      ceiling: { color: '#f6f5f2', map: 'plaster', roughness: 0.95, bump: 0.008, size: 1.8 },
      floor: { color: '#b7b3ab', map: 'concrete', roughness: 0.88, bump: 0.018, size: 1.6 },
      tile: { color: '#b7b3ab', map: 'concrete', roughness: 0.88, bump: 0.018, size: 1.6 },
      wood: { color: '#7a5c43', map: 'wood', roughness: 0.55, bump: 0.01, size: 1.0 },
      terrace: { color: '#c9c5bd', map: 'tiles', roughness: 0.82, bump: 0.015, size: 0.6 },
    },
  },
  {
    id: 'art_deco', title: 'Ар-деко', furniture: true,
    roles: {
      wall: { color: '#ece3d4', map: 'plaster', roughness: 0.86, bump: 0.01, size: 1.4 },
      column: { color: '#e6dccb', map: 'plaster', roughness: 0.86, bump: 0.01, size: 1.4 },
      ceiling: { color: '#f5efe6', map: 'plaster', roughness: 0.92, bump: 0.006, size: 1.8 },
      floor: { color: '#6b4630', map: 'parquet', roughness: 0.42, bump: 0.018, size: 1.2 },
      wood: { color: '#4b2e20', map: 'wood', roughness: 0.36, bump: 0.008, size: 1.2 },
      fabric: { color: '#1f4a40', map: 'fabric', roughness: 0.78, bump: 0.014, size: 0.35 },
      white: { color: '#f3efe8', roughness: 0.32 },
      dark: { color: '#1b1b1d', roughness: 0.28, metalness: 0.15 },
      metal: { color: '#b08d57', roughness: 0.28, metalness: 0.92 },
      tile: { color: '#efebe5', map: 'marble', roughness: 0.22, bump: 0.01, size: 1.2 },
      rug: { color: '#c3a874', map: 'rug', roughness: 0.94, bump: 0.025, size: 0.5 },
      appliance: { color: '#2a2a2c', roughness: 0.32, metalness: 0.45 },
      terrace: { color: '#d8d2c8', map: 'tiles', roughness: 0.76, bump: 0.016, size: 0.6 },
    },
  },
  {
    id: 'black_sea', title: 'Черноморский модерн', furniture: true,
    roles: {
      wall: { color: '#f4f2ed', map: 'plaster', roughness: 0.88, bump: 0.01, size: 1.4 },
      column: { color: '#f1efe9', map: 'plaster', roughness: 0.88, bump: 0.01, size: 1.4 },
      ceiling: { color: '#f8f7f3', map: 'plaster', roughness: 0.94, bump: 0.006, size: 1.8 },
      floor: { color: '#c9a77d', map: 'planks', roughness: 0.54, bump: 0.018, size: 1.8 },
      wood: { color: '#b8946a', map: 'wood', roughness: 0.48, bump: 0.008, size: 1.2 },
      fabric: { color: '#d6ccb9', map: 'fabric', roughness: 0.82, bump: 0.014, size: 0.35 },
      white: { color: '#f7f5ef', roughness: 0.38 },
      dark: { color: '#2e434c', roughness: 0.45, metalness: 0.1 },
      metal: { color: '#a3abae', roughness: 0.32, metalness: 0.88 },
      tile: { color: '#e5e2da', map: 'terrazzo', roughness: 0.38, bump: 0.012, size: 0.9 },
      rug: { color: '#8ea7ad', map: 'rug', roughness: 0.94, bump: 0.025, size: 0.5 },
      appliance: { color: '#e9e7e2', roughness: 0.36, metalness: 0.25 },
      terrace: { color: '#b49673', map: 'planks', roughness: 0.74, bump: 0.02, size: 1.8 },
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
    for (let i = 0; i < 120; i++) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      const a = 0.015 + r() * 0.025;
      g.addColorStop(0, r() < 0.5 ? `rgba(40,35,30,${a})` : `rgba(255,255,255,${a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save(); ctx.translate(r() * n, r() * n); ctx.scale(30 + r() * 70, 30 + r() * 70);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    for (let i = 0; i < 3200; i++) {
      ctx.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.018)' : 'rgba(255,255,255,0.028)';
      const s = 1.5 + r() * 8;
      ctx.fillRect(r() * n, r() * n, s, s);
    }
  },
  concrete(ctx, n, base, r) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, n, n);
    for (let i = 0; i < 240; i++) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      const a = 0.03 + r() * 0.05;
      g.addColorStop(0, r() < 0.5 ? `rgba(60,55,50,${a})` : `rgba(255,255,255,${a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save(); ctx.translate(r() * n, r() * n); ctx.scale(20 + r() * 60, 20 + r() * 60);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    for (let i = 0; i < 2200; i++) { ctx.fillStyle = 'rgba(40,40,40,0.06)'; ctx.fillRect(r() * n, r() * n, 1.5, 1.5); }
  },
  wood(ctx, n, base, r) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, n, n);
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = shade(base, (r() - 0.5) * 0.022);
      ctx.fillRect((i / 120) * n, 0, n / 90, n);
    }
    for (let k = 0; k < 160; k++) {
      ctx.strokeStyle = r() < 0.65 ? 'rgba(30,15,5,0.045)' : 'rgba(255,235,210,0.03)';
      ctx.lineWidth = 0.7 + r() * 1.4;
      ctx.beginPath();
      const xx = r() * n, amp = (r() - 0.5) * 8;
      ctx.moveTo(xx, 0);
      ctx.bezierCurveTo(xx + amp, n * 0.33, xx - amp, n * 0.66, xx, n);
      ctx.stroke();
    }
  },
  fabric(ctx, n, base, r) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, n, n);
    const step = 4;
    for (let y = 0; y < n; y += step) {
      ctx.fillStyle = (y / step) % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.04)';
      ctx.fillRect(0, y, n, 1.5);
    }
    for (let x = 0; x < n; x += step) {
      ctx.fillStyle = (x / step) % 2 === 0 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.03)';
      ctx.fillRect(x, 0, 1.5, n);
    }
    for (let i = 0; i < 2400; i++) {
      ctx.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.045)' : 'rgba(255,255,255,0.04)';
      ctx.fillRect(r() * n, r() * n, 2 + r() * 4, 2 + r() * 4);
    }
  },
  rug(ctx, n, base, r) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, n, n);
    for (let y = 0; y < n; y += 3) {
      ctx.fillStyle = (y % 6 === 0) ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, y, n, 1.5);
    }
    for (let i = 0; i < 5000; i++) {
      ctx.fillStyle = shade(base, (r() - 0.5) * 0.12);
      ctx.fillRect(r() * n, r() * n, 2 + r() * 5, 1.5 + r() * 3);
    }
  },
  planks(ctx, n, base, r) {
    const rows = 8, h = n / rows;           // one tile = `size` metres, 8 boards across
    for (let i = 0; i < rows; i++) {
      let x = -r() * n;
      while (x < n) {
        const len = n * (0.45 + r() * 0.6);
        ctx.fillStyle = shade(base, (r() - 0.5) * 0.075);
        ctx.fillRect(x, i * h, len, h);
        ctx.strokeStyle = 'rgba(55,35,15,0.11)';
        ctx.lineWidth = 1;
        for (let k = 0; k < 7; k++) {
          ctx.beginPath();
          const yy = i * h + r() * h;
          ctx.moveTo(x, yy); ctx.bezierCurveTo(x + len * 0.3, yy + (r() - 0.5) * 5, x + len * 0.6, yy + (r() - 0.5) * 5, x + len, yy);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(35,20,8,0.38)'; ctx.fillRect(x, i * h, 1.8, h);
        x += len;
      }
      ctx.fillStyle = 'rgba(35,20,8,0.32)'; ctx.fillRect(0, i * h, n, 1.8);
      ctx.fillStyle = 'rgba(255,240,220,0.08)'; ctx.fillRect(0, i * h + 1.8, n, 1);
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
          ctx.strokeStyle = 'rgba(60,38,16,0.12)';
          ctx.lineWidth = 1;
          for (let g = 0; g < 6; g++) {
            ctx.beginPath();
            if (across) { const yy = y + r() * h; ctx.moveTo(x, yy); ctx.lineTo(x + w, yy + (r() - 0.5) * 3); }
            else { const xx = x + r() * w; ctx.moveTo(xx, y); ctx.lineTo(xx + (r() - 0.5) * 3, y + h); }
            ctx.stroke();
          }
          ctx.strokeStyle = 'rgba(28,16,6,0.52)'; ctx.lineWidth = 1.4; ctx.strokeRect(x + 0.7, y + 0.7, w - 1.4, h - 1.4);
        }
      }
    }
  },
  marble(ctx, n, base, r) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, n, n);
    for (let v = 0; v < 12; v++) {
      ctx.strokeStyle = `rgba(115,108,100,${0.04 + r() * 0.11})`;
      ctx.lineWidth = 0.8 + r() * 2.4;
      ctx.beginPath();
      let x = r() * n, y = 0;
      ctx.moveTo(x, y);
      while (y < n) { x += (r() - 0.46) * 55; y += 18 + r() * 34; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(120,114,106,0.18)';
    ctx.fillRect(0, 0, n, 1.5); ctx.fillRect(0, 0, 1.5, n);
  },
  terrazzo(ctx, n, base, r) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, n, n);
    const chips = ['#c9c2b4', '#9fa7a3', '#d9cfbf', '#7d8b8c', '#efe9df'];
    for (let i = 0; i < 950; i++) {
      ctx.fillStyle = chips[Math.floor(r() * chips.length)];
      ctx.beginPath();
      const x = r() * n, y = r() * n, s = 1 + r() * 5;
      ctx.ellipse(x, y, s, s * (0.5 + r()), r() * 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(100,96,90,0.22)';
    ctx.fillRect(0, 0, n, 1.5); ctx.fillRect(0, 0, 1.5, n);
  },
  tiles(ctx, n, base, r) {
    const k = 2, s = n / k;
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) {
        ctx.fillStyle = shade(base, (r() - 0.5) * 0.045);
        ctx.fillRect(i * s, j * s, s, s);
        for (let m = 0; m < 180; m++) {
          ctx.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.018)' : 'rgba(255,255,255,0.022)';
          ctx.fillRect(i * s + r() * s, j * s + r() * s, 2 + r() * 6, 2 + r() * 6);
        }
      }
    }
    ctx.fillStyle = 'rgba(75,70,65,0.38)';
    for (let i = 0; i <= k; i++) { ctx.fillRect(i * s - 1, 0, 2.2, n); ctx.fillRect(0, i * s - 1, n, 2.2); }
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
    side: THREE.DoubleSide,
  });
  if (spec.map) {
    const tex = texture(spec.map, spec.color, renderer);
    tex.repeat.set(1 / (spec.size || 1), 1 / (spec.size || 1));   // UVs are in metres
    m.map = tex;
    if (spec.bump) {
      m.bumpMap = tex;
      m.bumpScale = spec.bump;
    }
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
