// Building plan coordinates in metres. Z increases toward the sea.
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
