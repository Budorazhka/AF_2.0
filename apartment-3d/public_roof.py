"""The open roof terrace, traced from sheet 10 of aurum-fort-floor-plans.pdf.
Coordinates use the same metre grid as building.py. The hatched cantilever
on the east is a sun screen over level 7 and has no walkable surface.
"""

import math
import fitz
from PIL import Image
from public_dining import turned, dining_table
from public_furniture import cushion, lounger, palm

OUTLINE = [
    (7.55, 3.56),
    (17.41, 3.56),
    (17.41, 7.46),
    (21.85, 7.46),
    (21.85, 19.10),
    (17.42, 19.77),
    (15.19, 19.15),
    (13.34, 19.15),
    (13.34, 23.78),
    (14.01, 23.78),
    (13.44, 29.30),
    (9.67, 29.92),
    (9.67, 28.37),
    (5.86, 28.37),
    (5.86, 27.13),
    (4.03, 27.13),
    (4.03, 16.52),
    (3.50, 16.52),
    (3.50, 13.60),
    (2.82, 13.60),
    (2.82, 9.82),
    (7.55, 9.82),
]
POOL = [(14.62, 15.14), (21.67, 15.14), (21.67, 18.95), (17.42, 19.58), (15.22, 18.98), (14.62, 18.98)]


def write_roof_plan(pdf, dest):
    with fitz.open(pdf) as doc:
        pixels = doc[9].get_pixmap(matrix=fitz.Matrix(4, 4), clip=fitz.Rect(155, 44, 451, 397), alpha=False)
        Image.frombytes("RGB", (pixels.width, pixels.height), pixels.samples).save(dest, lossless=True)


def strips(loops):
    """Horizontal trapezoids inside the perimeter and outside the holes, including sloped edges."""
    heights = sorted({z for ring in loops for _, z in ring})
    edges = [(start, end) for ring in loops for start, end in zip(ring, ring[1:] + ring[:1])]
    for z0, z1 in zip(heights, heights[1:]):
        mid = (z0 + z1) / 2
        spans = []
        for (x, z), (xx, zz) in edges:
            if min(z, zz) < mid < max(z, zz):
                slope = (xx - x) / (zz - z)
                spans.append((x + (mid - z) * slope, x + (z0 - z) * slope, x + (z1 - z) * slope))
        spans.sort()
        for (_, a, d), (_, b, c) in zip(spans[::2], spans[1::2]):
            yield [(a, z0), (b, z0), (c, z1), (d, z1)]


def terrace_floor(s):
    for quad in strips([OUTLINE, POOL]):
        s.slab("teak", quad, -0.19, 0.19, "#ffffff")
        for a, b, c in [(quad[0], quad[1], quad[2]), (quad[0], quad[2], quad[3])]:
            area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
            if abs(area) > 1e-7:
                s.floor_triangles.append([*a, *b, *c])
    # The grey front parapet and transparent upper rail leave the horizon visible at eye height.
    for a, b in zip(OUTLINE, OUTLINE[1:] + OUTLINE[:1]):
        dx, dz = b[0] - a[0], b[1] - a[1]
        length = math.hypot(dx, dz)
        front = max(a[1], b[1]) > 17.5
        base = 0.73 if front else 0.13
        s.band("basalt", [a, b], 0.14, -0.15, base + 0.15, "#ffffff")
        count = math.ceil(length / 1.52)
        for i in range(count):
            start = [a[0] + dx * (i + 0.012) / count, a[1] + dz * (i + 0.012) / count]
            end = [a[0] + dx * (i + 0.988) / count, a[1] + dz * (i + 0.988) / count]
            s.band("glass", [start, end], 0.025, base, 1.13 - base, "#ffffff")
        s.tube("bronze", (a[0], 1.14, a[1]), (b[0], 1.14, b[1]), 0.018)
    for z in (9.92, 14.36, 18.12):
        s.part("frame", 21.84, z, 3.37, 0.09, -0.30, 0.13)
    for i in range(11):
        s.part("teak", 21.90 + i * 0.32, 9.92, 0.09, 8.28, -0.22, 0.14)


def roof_pool(s):
    for quad in strips([POOL]):
        s.slab("pool-tile", quad, -1.25, 0.08, "#ffffff")
    for a, b in zip(POOL, POOL[1:] + POOL[:1]):
        s.band("pool-tile", [a, b], 0.08, -1.23, 1.24, "#ffffff")
        s.band("limestone", [a, b], 0.105, 0.008, 0.045, "#ffffff")
    # Mesh follows the kinked seaward edge even at water level.
    rows, cols = 24, 62
    for quad in strips([POOL]):
        (x0, z0), (x1, _), (x2, z1), (x3, _) = quad
        count = max(1, round(rows * (z1 - z0) / 4.44))
        pts = []
        indices = []
        for j in range(count + 1):
            v = j / count
            left = x0 + (x3 - x0) * v
            right = x1 + (x2 - x1) * v
            z = z0 + (z1 - z0) * v
            for i in range(cols + 1):
                x = left + (right - left) * i / cols
                pts.append(
                    [x, -0.065 + 0.009 * math.sin(4 * x + 1.8 * z) + 0.006 * math.sin(7 * z - 0.9 * x), z]
                )
                if i and j:
                    k = len(pts) - 1
                    indices.extend([k - cols - 2, k - 1, k, k - cols - 2, k, k - cols - 1])
        s.mesh("water", pts, indices, "#ffffff")
    for x in (16.29, 16.83):
        path = (
            [(x, 0.012, 14.76)]
            + [
                (x, 0.53 + 0.24 * math.sin(i * math.pi / 14), 15.0 - 0.24 * math.cos(i * math.pi / 14))
                for i in range(15)
            ]
            + [(x, -1.06, 15.24)]
        )
        for a, b in zip(path, path[1:]):
            s.tube("chrome", a, b, 0.030)
    for y in (-0.24, -0.49, -0.74):
        s.tube("chrome", (16.29, y, 15.24), (16.83, y, 15.24), 0.023)


def housing(s, x, z, w, d, door_x):
    height = 2.75
    s.part("basalt", x, z, w, d, 0, height, solid=True)
    s.part("frame", x - 0.075, z - 0.075, w + 0.15, d + 0.15, height, 0.095)
    s.part("walnut", door_x, z + d, 1.01, 0.035, 0.015, 2.17)
    s.part("bronze", door_x + 0.81, z + d + 0.039, 0.025, 0.052, 0.91, 0.36)
    for i in range(6):
        s.part("frame", door_x + 1.20, z + d, 0.55, 0.025, 1.57 + i * 0.065, 0.025)
    s.part("light", door_x + 0.04, z + d + 0.045, 0.92, 0.035, 2.23, 0.032)


def parasol(s, x, z):
    turned(s, "basalt", x, z, [(0.26, 0.012), (0.28, 0.027), (0.245, 0.088), (0.045, 0.088)])
    s.tube("walnut", (x, 0.08, z), (x, 2.65, z), 0.037)
    s.barriers.append([x - 0.12, z - 0.12, x + 0.12, z + 0.12])
    for i in range(10):
        a, b = i * math.tau / 10, (i + 1) * math.tau / 10

        def vertex(az, r, h):
            return (x + r * math.cos(az), h, z + r * math.sin(az))

        mid = (a + b) / 2
        verts = [
            (x, 2.76, z),
            vertex(a, 0.72, 2.63),
            vertex(b, 0.72, 2.63),
            vertex(a, 1.53, 2.35),
            vertex(mid, 1.48, 2.31),
            vertex(b, 1.53, 2.35),
        ]
        s.mesh("linen", verts, [0, 2, 1, 1, 2, 4, 1, 4, 3, 2, 5, 4], "#ffffff")
        s.tube("bronze", (x, 2.67, z), vertex(a, 1.51, 2.33), 0.008)


def roof(s):
    terrace_floor(s)
    roof_pool(s)
    housing(s, 2.84, 9.84, 4.84, 3.72, 5.9)
    housing(s, 3.51, 13.56, 6.08, 2.96, 4.16)
    housing(s, 16.23, 7.48, 5.59, 2.51, 16.55)
    housing(s, 11.27, 13.42, 1.98, 5.49, 11.42)
    for x in (9.45, 12.40, 15.42):
        dining_table(s, x, 5.70, outdoor=True)
    for x, z in [(10.65, 5.75), (14.08, 6.17)]:
        parasol(s, x, z)
    for x in (15.42, 17.69, 19.94):
        lounger(s, x, 13.34)
        turned(
            s,
            "travertine",
            x + 0.73,
            13.45,
            [(0.20, 0.025), (0.15, 0.09), (0.10, 0.34), (0.23, 0.37), (0.24, 0.405), (0, 0.405)],
        )
    for x, z in [(8.77, 8.38), (20.9, 11.04), (5.37, 18.02), (12.27, 27.40)]:
        palm(s, x, z)
    for x in (6.45, 9.47):
        s.part("teak", x, 24.05, 2.14, 0.79, 0.17, 0.13, solid=True)
        for leg_x in (x + 0.13, x + 1.89):
            for leg_z in (24.15, 24.66):
                s.part("teak", leg_x, leg_z, 0.12, 0.12, 0.01, 0.16)
        s.part("teak", x, 24.74, 2.14, 0.12, 0.20, 0.59)
        for i in range(2):
            cushion(s, x + 0.55 + 1.04 * i, 0.41, 24.39, 1.02, 0.24, 0.75)
            cushion(s, x + 0.55 + 1.04 * i, 0.69, 24.70, 1.02, 0.52, 0.18, -0.15)
        turned(
            s,
            "travertine",
            x + 1.07,
            23.15,
            [(0.28, 0.01), (0.23, 0.08), (0.16, 0.24), (0.44, 0.28), (0.46, 0.34), (0, 0.34)],
        )
        s.barriers.append([x + 0.60, 22.69, x + 1.53, 23.61])
    for x, z in [(4.46, 21.2), (6.22, 27.4), (10.45, 28.42), (13.55, 11.43), (8.04, 4.08)]:
        s.part("frame", x, z, 0.13, 0.13, 0.01, 0.53, solid=True)
        s.part("light", x - 0.004, z - 0.004, 0.138, 0.138, 0.54, 0.09)
        s.part("bronze", x - 0.014, z - 0.014, 0.158, 0.158, 0.63, 0.022)
    s.view("Бассейн на крыше", [13.92, 12.06], [18.26, 17.41], -0.14, key="pool")
    s.view("Обеденная терраса", [15.35, 8.98], [10.68, 5.37], -0.11, key="terrace")
    s.view("Лаунж с видом на море", [6.06, 20.75], [9.80, 26.94], -0.085, key="lounge")
