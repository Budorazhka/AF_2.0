// Building plan coordinates in metres. Z increases toward the sea.
// Traced rail panels use the exact polygon edges from the floor plan. A setback
// wedge is drawn by bay instead, so identify it by the centre of its base.
export function replacesWalkFrontage({ edge, wedge }, outdoor, floorCutouts) {
  const [ax, az, bx, bz] = edge;
  if (wedge) {
    const x = (ax + bx) / 2, z = (az + bz) / 2;
    return floorCutouts.some(planes => planes.every(([a, b, c]) => a * x + b * z + c >= 0));
  }
  return outdoor.some(ring => ring.some(([x, z], i) => {
    const [nextX, nextZ] = ring[(i + 1) % ring.length];
    return (x === ax && z === az && nextX === bx && nextZ === bz) ||
      (x === bx && z === bz && nextX === ax && nextZ === az);
  }));
}

export const SETBACK_ROOFS = {
  6: [[26.2, 9.5, 30.4, 14.2], [26.2, 14.2, 31.3, 19.55]],
  7: [[21.95, 9.5, 26.55, 19.55]],
};

export const PARKING = {
  bounds: [26.2, 20.2, 42.5, 32.8],
  upper: { x: 34.45, halfWidth: 2.5 },
  lower: { z: 25.3, halfWidth: 2.55 },
  deckThickness: 0.35,
  join: 0.15,
};

export function parkingAccess(upperY, lowerY) {
  const { bounds: [, z0, x1], upper, lower, join } = PARKING;
  const junction = [50, lowerY - 0.5, lower.z];
  const ramp = [
    [upper.x, z0 + join, 0], [upper.x, 16, 0.09], [35.4, 10.8, 0.25],
    [39, 7.5, 0.40], [45, 9.2, 0.59], [49.5, 14.5, 0.74],
    [50.2, 20.5, 0.88],
  ];
  return [
    { halfWidth: upper.halfWidth, points: [...ramp.map(([x, z, t]) => [x, upperY + (junction[1] - upperY) * t, z]), junction] },
    { halfWidth: lower.halfWidth, points: [[x1 - join, lowerY, lower.z], [46, lowerY - 0.24, lower.z], junction] },
  ];
}
