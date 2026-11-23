// Extrude the union of the plan rectangles. Neighbouring strips share edges,
// so looking through glazing or along a slab never reveals an internal face.
function intervals(rects, z) {
  const bands = rects.filter((r) => r[1] < z && z < r[3])
    .map((r) => [r[0], r[2]]).sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const band of bands) {
    const last = merged.at(-1);
    if (last && band[0] <= last[1]) last[1] = Math.max(last[1], band[1]);
    else merged.push(band);
  }
  return merged;
}

function uncovered(start, end, adjacent) {
  const result = [];
  for (const [a, b] of adjacent) {
    if (a >= end) break;
    if (b <= start) continue;
    if (a > start) result.push([start, a]);
    start = Math.max(start, b);
    if (start >= end) break;
  }
  if (start < end) result.push([start, end]);
  return result;
}

export function subtractSlabOpenings(rects, openings) {
  for (const [left, front, right, back] of openings) {
    rects = rects.flatMap(rect => {
      const [x0, z0, x1, z1] = rect;
      const a = Math.max(x0, left), b = Math.max(z0, front);
      const c = Math.min(x1, right), d = Math.min(z1, back);
      if (a >= c || b >= d) return [rect];
      return [[x0, z0, a, z1], [c, z0, x1, z1], [a, z0, c, b], [a, d, c, z1]]
        .filter(([x, z, xEnd, zEnd]) => x < xEnd && z < zEnd);
    });
  }
  return rects;
}

export function storeyQuads(rects, bottom, height) {
  const valid = rects.filter(([x, z, right, far]) => right > x && far > z);
  const zs = [...new Set(valid.flatMap((r) => [r[1], r[3]]))].sort((a, b) => a - b);
  const bands = zs.slice(1).map((z, i) => intervals(valid, (zs[i] + z) / 2));
  const quads = [], top = bottom + height;
  for (let i = 0; i < bands.length; i++) {
    const z = zs[i], far = zs[i + 1];
    for (const [x, right] of bands[i]) {
      quads.push(
        [[x,top,z], [x,top,far], [right,top,far], [right,top,z]],
        [[x,bottom,z], [right,bottom,z], [right,bottom,far], [x,bottom,far]],
        [[x,bottom,z], [x,bottom,far], [x,top,far], [x,top,z]],
        [[right,bottom,far], [right,bottom,z], [right,top,z], [right,top,far]],
      );
      for (const [a, b] of uncovered(x, right, bands[i - 1] ?? []))
        quads.push([[b,bottom,z], [a,bottom,z], [a,top,z], [b,top,z]]);
      for (const [a, b] of uncovered(x, right, bands[i + 1] ?? []))
        quads.push([[a,bottom,far], [b,bottom,far], [b,top,far], [a,top,far]]);
    }
  }
  return quads;
}
