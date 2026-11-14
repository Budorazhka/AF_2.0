/* Sun position and hours of direct sun for Aurum Fort (Gonio, Batumi).
   Formulas follow SunCalc (Vladimir Agafonkin, BSD-2) — accurate to well under
   a degree, which is plenty for shadows and "hours of sun in the window".
   No three.js here, so the module also runs under node for tests. */

export const SITE = { lat: 41.5762, lon: 41.5705, utcOffset: 4 }; // Georgia: UTC+4, no DST

const RAD = Math.PI / 180;
const DAY_MS = 864e5;
const J1970 = 2440588;
const J2000 = 2451545;
const OBLIQUITY = RAD * 23.4397;

function toDays(date) {
  return date.valueOf() / DAY_MS - 0.5 + J1970 - J2000;
}

/** Sun azimuth (radians clockwise from north) and altitude (radians). */
export function sunPosition(date, lat = SITE.lat, lon = SITE.lon) {
  const d = toDays(date);
  const M = RAD * (357.5291 + 0.98560028 * d);
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + RAD * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(OBLIQUITY) * Math.sin(L));
  const ra = Math.atan2(Math.sin(L) * Math.cos(OBLIQUITY), Math.cos(L));
  const H = RAD * (280.16 + 360.9856235 * d) + RAD * lon - ra;
  const phi = RAD * lat;
  const altitude = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const fromSouth = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
  return { azimuth: (fromSouth + Math.PI) % (2 * Math.PI), altitude };
}

/** World direction towards the sun. World axes: +X east, +Y up, -Z north. */
export function sunDirection(pos) {
  const c = Math.cos(pos.altitude);
  return [Math.sin(pos.azimuth) * c, Math.sin(pos.altitude), -Math.cos(pos.azimuth) * c];
}

/** Local site time (minutes after midnight) on a calendar day → Date. */
export function siteDate(year, month, day, minutes) {
  return new Date(Date.UTC(year, month, day, 0, minutes - SITE.utcOffset * 60));
}

/* -- hours of direct sun -------------------------------------------------- */

function rayHitsBox(o, d, b) {
  // slab test; b = [x0, y0, z0, x1, y1, z1]
  let tmin = 0.05, tmax = 1e4;
  for (let a = 0; a < 3; a++) {
    const inv = 1 / d[a];
    let t0 = (b[a] - o[a]) * inv, t1 = (b[a + 3] - o[a]) * inv;
    if (inv < 0) { const s = t0; t0 = t1; t1 = s; }
    if (t0 > tmin) tmin = t0;
    if (t1 < tmax) tmax = t1;
    if (tmax < tmin) return false;
  }
  return true;
}

function terrainBlocks(o, d, height) {
  if (!height || d[1] > 0.6) return false;
  for (let s = 12; s < 2600; s *= 1.18) {
    const x = o[0] + d[0] * s, y = o[1] + d[1] * s, z = o[2] + d[2] * s;
    if (height(x, z) > y) return true;
  }
  return false;
}

/**
 * Minutes of direct sun on a flat's windows over one day.
 * windows:   [{p: [x, y, z], n: [nx, 0, nz]}] world points on the glass, normals outward
 * occluders: [[x0, y0, z0, x1, y1, z1]] world boxes of the building
 * height:    (x, z) => terrain height, or null
 * Returns {minutes, spans: [[fromMin, toMin]], sunrise, sunset} in site time.
 */
export function sunHours({ year, month, day, windows, occluders, height, step = 10 }) {
  const lit = [];
  let sunrise = null, sunset = null;
  for (let m = 0; m <= 1440; m += step) {
    const pos = sunPosition(siteDate(year, month, day, m));
    if (pos.altitude > 0) {
      if (sunrise === null) sunrise = m;
      sunset = m;
    }
    let on = false;
    if (pos.altitude > 2 * RAD) {
      const d = sunDirection(pos);
      for (const w of windows) {
        if (w.n[0] * d[0] + w.n[2] * d[2] < 0.17 * Math.hypot(d[0], d[2])) continue; // grazing light
        const o = [w.p[0] + w.n[0] * 0.35, w.p[1], w.p[2] + w.n[2] * 0.35];
        if (occluders.some((b) => rayHitsBox(o, d, b))) continue;
        if (terrainBlocks(o, d, height)) continue;
        on = true;
        break;
      }
    }
    lit.push(on);
  }
  const spans = [];
  let minutes = 0;
  lit.forEach((on, i) => {
    if (!on) return;
    minutes += step;
    const m = i * step;
    const last = spans[spans.length - 1];
    if (last && last[1] === m) last[1] = m + step;
    else spans.push([m, m + step]);
  });
  return { minutes, spans, sunrise, sunset };
}

export function formatClock(minutes) {
  const h = Math.floor(minutes / 60) % 24, m = Math.round(minutes % 60);
  return h + ':' + String(m).padStart(2, '0');
}
