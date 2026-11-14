// node js/flats-3d/sun.test.mjs
import assert from 'node:assert/strict';
import { sunPosition, siteDate, sunHours, formatClock } from './sun.js';

const RAD = Math.PI / 180;
const noonOf = (month, day) => {
  let best = 0, alt = -9;
  for (let m = 600; m < 960; m++) {
    const a = sunPosition(siteDate(2026, month, day, m)).altitude;
    if (a > alt) { alt = a; best = m; }
  }
  return { minutes: best, altitude: alt / RAD };
};

// Georgia keeps UTC+4 while Gonio sits at 41.6° E, so solar noon is about 13:13.
const june = noonOf(5, 21), december = noonOf(11, 21);
assert.ok(Math.abs(june.minutes - 793) < 12, 'solar noon in June ' + formatClock(june.minutes));
assert.ok(Math.abs(june.altitude - (90 - 41.58 + 23.44)) < 0.6, 'June noon altitude ' + june.altitude.toFixed(1));
assert.ok(Math.abs(december.altitude - (90 - 41.58 - 23.44)) < 0.6, 'December noon altitude ' + december.altitude.toFixed(1));

// Azimuth: east in the morning, south at noon, west in the evening.
const az = (m) => sunPosition(siteDate(2026, 2, 20, m)).azimuth / RAD;
assert.ok(az(8 * 60) > 80 && az(8 * 60) < 130, 'morning azimuth ' + az(480).toFixed(0));
assert.ok(Math.abs(az(june.minutes) - 180) < 8, 'noon azimuth ' + az(june.minutes).toFixed(0));
assert.ok(az(18 * 60) > 240 && az(18 * 60) < 290, 'evening azimuth ' + az(1080).toFixed(0));

// A west-facing window with nothing around: sun from about solar noon to sunset.
const open = sunHours({ year: 2026, month: 5, day: 21, windows: [{ p: [0, 10, 0], n: [-1, 0, 0] }], occluders: [], height: null });
assert.ok(open.minutes > 6 * 60 && open.minutes < 8.5 * 60, 'west window, June: ' + open.minutes + ' min');
assert.ok(open.spans[0][0] > 12 * 60, 'west window lit only after noon, from ' + formatClock(open.spans[0][0]));
const dayLength = open.sunset - open.sunrise;
assert.ok(Math.abs(dayLength - 15 * 60) < 25, 'June day length ' + dayLength);

// The same window behind a wall gets nothing.
const blocked = sunHours({ year: 2026, month: 5, day: 21, windows: [{ p: [0, 10, 0], n: [-1, 0, 0] }],
  occluders: [[-6, -50, -100, -5, 100, 100]], height: null });
assert.equal(blocked.minutes, 0, 'wall in front of the window');

// A ridge to the east delays sunrise on an east window.
const ridge = (x) => (x > 0 ? x * 0.4 : -200);
const east = (h) => sunHours({ year: 2026, month: 2, day: 20, windows: [{ p: [0, 2, 0], n: [1, 0, 0] }], occluders: [], height: h });
assert.ok(east(ridge).spans[0][0] > east(null).spans[0][0] + 60, 'ridge delays the morning sun');

console.log('PASS: sun position, solar noon ' + formatClock(june.minutes) + ', June west window ' + (open.minutes / 60).toFixed(1) + ' h');
