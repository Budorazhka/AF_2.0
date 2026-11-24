"""Public interiors traced from the supplied -1 and 1 SARTULI plans.
Run python apartment-3d/public_floors.py to rebuild the public-space models.
X/Z follow the building plan. Furniture and finishes follow the interior renders.
"""

import math
from public_geometry import PublicScene, ROOT
from public_furniture import lounger, palm
from public_dining import dining_table, restaurant
from public_roof import roof, write_roof_plan

SPA_POOL = (15.51, 21.28, 27.10, 26.33)
STOREY_SLAB_DEPTH = 0.30


def stair_underside(s, x0, x1, z0, z1, y0, y1, thickness=0.18):
    """Continuous stone soffit below a return flight's stepped profile."""
    s.mesh("limestone", [
        (x0, y0, z0), (x1, y1, z0), (x1, y1, z1), (x0, y0, z1),
        (x0, y0 - thickness, z0), (x1, y1 - thickness, z0),
        (x1, y1 - thickness, z1), (x0, y0 - thickness, z1),
    ], [0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1,
        1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0], "#ffffff")


def return_stair(s, run, landings, lower, upper, steps):
    """Two parallel flights with the lower entrance at the right of the plan."""
    x0, x1 = run
    left, right = landings
    lower_front, lower_back = lower
    upper_front, upper_back = upper
    top_floor = s.height + STOREY_SLAB_DEPTH
    landing = top_floor / 2
    rise, tread = landing / steps, (x1 - x0) / steps
    z0, z1 = min(lower_front, upper_front), max(lower_back, upper_back)
    s.part("limestone", left, z0, x0 - left, z1 - z0, 0, landing, solid=True)
    for i in range(steps):
        x = x0 + i * tread
        s.part("limestone", x, lower_front, tread, lower_back - lower_front, 0, landing - i * rise, solid=True)
        s.part("limestone", x, upper_front, tread, upper_back - upper_front, landing + i * rise, rise)
    # Inset the sides so the soffit and the treads never share a plane.
    stair_underside(s, x0, x1, upper_front + 0.004, upper_back - 0.004, landing, top_floor, thickness=0.21)
    s.part("limestone", x1, upper_front, right - x1, upper_back - upper_front, top_floor - 0.14, 0.15)
    rail_z = upper_front + 0.025 if lower_front < upper_front else upper_back - 0.025
    for i in range(steps):
        x = x0 + (i + 0.5) * tread
        if i % 2 == 0 or i == steps - 1:
            y = landing + (i + 1) * rise
            s.tube("bronze", (x, y, rail_z), (x, y + 0.86 - rise / 2, rail_z), 0.015)
    s.tube("bronze", (x0, landing + 0.86, rail_z), (x1, top_floor + 0.86, rail_z), 0.025)


def glazing(s, x, z, x2, z2, divisions):
    horizontal = z == z2

    def strip(start, end, y, h, depth, finish, solid=False):
        if horizontal:
            s.part(finish, start, z - depth / 2, end - start, depth, y, h, solid=solid)
        else:
            s.part(finish, x - depth / 2, start, depth, end - start, y, h, solid=solid)

    a, b = (x, x2) if horizontal else (z, z2)
    strip(a, b, 0.04, s.height - 0.14, 0.014, "glass", True)
    for y in (0.025, s.height - 0.16):
        strip(a, b, y, 0.07, 0.085, "frame")
    strip(a, b, s.height - 0.09, 0.09, 0.16, "basalt")
    for i in range(divisions + 1):
        p = a + (b - a) * i / divisions
        strip(p - 0.024, p + 0.024, 0.05, s.height - 0.13, 0.082, "frame")


def doors(s, x, z, x2, z2, gaps, finish="ivory"):
    horizontal = z == z2
    start, end = (x, x2) if horizontal else (z, z2)

    def piece(a, b, y, h, solid):
        if b <= a:
            return
        if horizontal:
            s.part(finish, a, z - 0.09, b - a, 0.18, y, h, solid=solid)
        else:
            s.part(finish, x - 0.09, a, 0.18, b - a, y, h, solid=solid)

    for a, b in gaps:
        piece(start, a, 0, s.height, True)
        piece(a, b, 2.32, s.height - 2.32, False)
        start = b
    piece(start, end, 0, s.height, True)


def core(s, ground):
    # Service wing, lift shafts and the two stairs shown on both sheets.
    for x, z, x2, z2 in [
        (7.59, 3.68, 17.39, 3.89),
        (7.59, 3.88, 7.79, 9.85),
        (17.19, 3.88, 17.39, 7.47),
        (17.20, 7.47, 21.76, 7.67),
        (21.56, 7.67, 21.76, 9.85),
        (4.12, 9.85, 7.79, 10.04),
        (4.12, 9.85, 4.32, 16.48),
        (11.26, 13.42, 11.46, 18.95),
        (13.04, 13.42, 13.24, 18.95),
        (11.46, 16.38, 13.04, 16.58),
        (11.46, 18.76, 13.04, 18.95),
    ]:
        s.partition(x, z, x2, z2)
    for x, z, x2, z2 in [(7.59, 3.69, 17.39, 7.48), (7.59, 7.48, 16.15 if ground else 17.19, 9.85)]:
        s.floor(x, z, x2, z2, "limestone")
    # Leave the side stairwell open through the ceiling for its return flight.
    s.floors.append([4.12, 9.85, 29.87, 16.48])
    s.part("limestone", 4.12, 9.85, 25.75, 6.63, -0.14, 0.14)
    for x, z, w, d in [(4.12, 9.85, 25.75, 4.15), (8.50, 14.0, 21.37, 2.48)]:
        s.part("ivory", x, z, w, d, s.ceiling_y, 0.10)
    for x, z, w, d in [(4.12, 14.0, 0.20, 2.48), (9.17, 14.0, 0.20, 2.48),
                        (4.12, 14.0, 5.25, 0.20), (4.12, 16.28, 5.25, 0.20)]:
        s.part("ivory", x, z, w, d, s.height, s.height)
    s.part("ivory", 4.12, 14.0, 5.25, 2.48, s.height + s.ceiling_y, 0.10)
    if ground:
        # The stairwell is open above the return flight and the upper landing.
        s.floors.append([16.15, 7.48, 17.19, 9.85])
        s.part("limestone", 16.15, 7.48, 1.04, 2.37, -0.14, 0.14)
        s.part("ivory", 16.15, 7.48, 1.04, 1.16, s.ceiling_y, 0.10)
        s.floors.append([17.19, 7.48, 21.76, 9.85])
        s.part("limestone", 17.19, 7.48, 4.57, 2.37, -0.14, 0.14)
        s.part("ivory", 16.15, 7.48, 5.61, 2.37, s.height + s.ceiling_y, 0.10)
        for x, z, w, d in [
            (16.15, 7.48, 5.61, 0.20),
            (17.19, 9.65, 4.57, 0.20),
            (21.56, 7.48, 0.20, 2.37),
            (16.15, 7.48, 1.04, 0.18),
        ]:
            s.part("ivory", x, z, w, d, s.height, s.height)
    else:
        s.floors.append([17.19, 7.48, 21.76, 9.85])
        s.part("limestone", 17.19, 7.48, 4.57, 2.37, -0.14, 0.14)
        s.part("ivory", 20.82, 7.48, 0.94, 2.37, s.ceiling_y, 0.10)
        s.part("ivory", 17.19, 7.48, 4.57, 2.37, s.height + s.ceiling_y, 0.10)
        for x, z, w, d in [(17.19, 7.48, 0.20, 2.37), (21.56, 7.48, 0.20, 2.37),
                            (17.39, 7.48, 4.17, 0.20), (17.39, 9.65, 4.17, 0.20)]:
            s.part("ivory", x, z, w, d, s.height, s.height)
    doors(s, 11.35, 13.50, 13.14, 13.50, [(11.80, 12.76)])
    for z in (15.0, 17.55):
        s.part("bronze", 11.23, z - 0.47, 0.035, 0.94, 0.02, 2.27)
        s.part("frame", 11.207, z - 0.009, 0.02, 0.018, 0.02, 2.24)
    if not ground:
        doors(s, 7.7, 5.99, 11.35, 5.99, [(9.2, 10.1)])
        doors(s, 11.35, 3.9, 11.35, 9.95, [(7.55, 8.47)])
    doors(s, 7.7, 9.94, 21.65, 9.94, [(10.05, 11.02), (13.8, 14.85), (17.50, 18.55) if ground else (20.18, 21.22)])
    doors(s, 4.22, 13.51, 9.37, 13.51, [(8.1, 9.1)])
    doors(s, 9.37, 10.0, 9.37, 16.39, [(11.20, 12.28), (14.17, 15.2)])
    return_stair(s, run=(5.30, 8.50), landings=(4.32, 9.17),
                 lower=(14.09, 15.23), upper=(15.25, 16.27), steps=10 if ground else 11)
    s.part("oak", 9.143, 15.34, 0.027, 0.84, s.height + STOREY_SLAB_DEPTH + 0.02, 2.1)
    if not ground:
        return_stair(s, run=(18.22, 20.82), landings=(17.39, 21.56),
                     lower=(8.76, 9.71), upper=(7.68, 8.63), steps=11)
        s.part("oak", 21.533, 7.77, 0.027, 0.78, s.height + STOREY_SLAB_DEPTH + 0.02, 2.1)
    if ground:
        # Cut into the stairwell lining so slab edges don't share its plane.
        s.stair_openings.extend([[4.28, 13.98, 8.50, 16.32], [17.30, 7.64, 20.50, 9.69]])
        fascia_height = s.height + STOREY_SLAB_DEPTH - s.ceiling_y
        s.part("ivory", 8.46, 14.0, 0.04, 2.48, s.ceiling_y, fascia_height)
        # The lower flight is on the far side; the high return leaves the
        # restaurant doorway and headroom unobstructed beneath it.
        for i in range(10):
            s.part("limestone", 17.30 + i * 0.32, 7.70, 0.32, 0.94, 0, (i + 1) * 0.165, solid=True)
            top = (20 - i) * 0.165
            s.part("limestone", 17.30 + i * 0.32, 8.77, 0.32, 0.94, top - 0.165, 0.165)
        s.part("limestone", 20.50, 7.70, 1.04, 2.01, 0, 1.65, solid=True)
        s.part("limestone", 16.27, 8.77, 1.03, 0.94, 3.16, 0.14)
        stair_underside(s, 17.30, 20.50, 8.77, 9.71, 3.135, 1.485)
        # The low end of the overhead flight has less than standing headroom.
        s.barriers.append([18.95, 8.77, 20.50, 9.71])
        s.tube("bronze", (17.36, 3.95, 8.70), (20.48, 2.30, 8.70), 0.025)
        for i in range(5):
            x = 17.45 + i * 0.73
            y = 3.30 - (x - 17.30) / 3.20 * 1.65
            s.tube("bronze", (x, y, 8.70), (x, y + 0.70, 8.70), 0.015)


def playground(s, play_y):
    """Scandinavian wooden children's playground: gabled playhouse with slide, A-frame swings, and sandbox."""
    # 1. Playhouse tower with pitched gable roof, safety railings, ladder, and chrome slide
    tx, tz = 11.4, 41.0
    deck_y = play_y + 1.12
    eave_y = play_y + 2.26
    ridge_y = play_y + 2.86
    # Corner posts & raised deck
    for ox, oz in ((-0.62, -0.62), (0.62, -0.62), (-0.62, 0.62), (0.62, 0.62)):
        s.part("oak", tx + ox - 0.055, tz + oz - 0.055, 0.11, 0.11, play_y, eave_y - play_y)
    s.part("oak", tx - 0.70, tz - 0.70, 1.40, 1.40, deck_y - 0.10, 0.10)
    # Horizontal safety slats on back (z-0.62), front (z+0.62), and half of left side
    for h in (0.28, 0.56, 0.84):
        s.part("oak", tx - 0.62, tz + 0.59, 1.24, 0.05, deck_y + h, 0.09)
        s.part("oak", tx - 0.62, tz - 0.64, 1.24, 0.05, deck_y + h, 0.09)
    # Pitched gabled roof (two sloped walnut panels)
    over_x, over_z = 0.84, 0.88
    thick = 0.07
    for side in (-1, 1):
        z_eave = tz + side * over_z
        pts = [
            (tx - over_x, ridge_y, tz), (tx + over_x, ridge_y, tz),
            (tx + over_x, eave_y, z_eave), (tx - over_x, eave_y, z_eave),
            (tx - over_x, ridge_y - thick, tz), (tx + over_x, ridge_y - thick, tz),
            (tx + over_x, eave_y - thick, z_eave), (tx - over_x, eave_y - thick, z_eave),
        ]
        s.mesh("walnut", pts, [
            0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6,
            0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2,
            2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0,
        ], "#ffffff")
    # Sloped climbing ladder on the left (-X)
    for dz in (-0.28, 0.28):
        s.tube("oak", (tx - 1.25, play_y, tz + dz), (tx - 0.66, deck_y + 0.05, tz + dz), 0.032)
    for k in range(5):
        t = (k + 0.5) / 5.0
        lx = (tx - 1.25) + t * 0.59
        ly = play_y + t * (deck_y - play_y)
        s.tube("oak", (lx, ly, tz - 0.28), (lx, ly, tz + 0.28), 0.022)
    # Stainless-steel (chrome) slide on the right (+X) with side curbs
    sx0, sx1 = tx + 0.66, tx + 2.45
    sy0, sy1 = deck_y - 0.02, play_y + 0.14
    sw = 0.28
    slide_pts = [
        (sx0, sy0, tz - sw), (sx1, sy1, tz - sw), (sx1, sy1, tz + sw), (sx0, sy0, tz + sw),
        (sx0, sy0 - 0.04, tz - sw), (sx1, sy1 - 0.04, tz - sw), (sx1, sy1 - 0.04, tz + sw), (sx0, sy0 - 0.04, tz + sw),
    ]
    s.mesh("chrome", slide_pts, [
        0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6,
        0, 4, 5, 0, 5, 1, 2, 6, 7, 2, 7, 3,
    ], "#ffffff")
    for dz in (-sw, sw):
        s.tube("chrome", (sx0, sy0 + 0.11, tz + dz), (sx1, sy1 + 0.11, tz + dz), 0.024)
    # 2. Wooden A-frame double swing set (x = 15.8..19.2, z = 41.0)
    top_y = play_y + 2.25
    s.tube("oak", (15.65, top_y, 41.0), (19.35, top_y, 41.0), 0.058)
    for sx in (15.9, 19.1):
        for dz in (-0.82, 0.82):
            s.tube("oak", (sx, play_y, 41.0 + dz), (sx, top_y, 41.0), 0.048)
    for cx in (16.9, 18.1):
        seat_y = play_y + 0.54
        s.part("walnut", cx - 0.26, 40.87, 0.52, 0.26, seat_y, 0.045)
        for dx in (-0.22, 0.22):
            s.tube("chrome", (cx + dx, seat_y + 0.04, 41.0), (cx + dx, top_y - 0.02, 41.0), 0.009)
    # 3. Low wooden sandbox + balance stepping logs on the left (x = 8.9..10.2, z = 41.6..42.9)
    s.part("teak", 8.85, 41.55, 1.45, 0.12, play_y, 0.24)
    s.part("teak", 8.85, 42.88, 1.45, 0.12, play_y, 0.24)
    s.part("teak", 8.85, 41.67, 0.12, 1.21, play_y, 0.24)
    s.part("teak", 10.18, 41.67, 0.12, 1.21, play_y, 0.24)
    for lx, lz, lh in ((14.6, 42.2, 0.24), (15.1, 42.5, 0.34), (15.6, 42.1, 0.28)):
        s.oval("oak", lx, lz, 0.17, 0.17, play_y, lh, "#ffffff")


def parasol(s, x, z, radius=1.25, height=2.35):
    """Sun umbrella with weighted basalt base, dark pole, and 8-panel linen canopy."""
    s.oval("basalt", x, z, 0.34, 0.34, 0.0, 0.05, "#ffffff")
    s.tube("frame", (x, 0.05, z), (x, height, z), 0.032)
    s.barriers.append([x - 0.16, z - 0.16, x + 0.16, z + 0.16])
    apex = (x, height + 0.34, z)
    ring = [
        (x + radius * math.cos(i * math.tau / 8), height - 0.06, z + radius * math.sin(i * math.tau / 8))
        for i in range(8)
    ]
    pts = [apex] + ring
    tri = []
    for i in range(8):
        j = (i + 1) % 8
        tri.extend((0, i + 1, j + 1, 0, j + 1, i + 1))
    s.mesh("linen", pts, tri, "#ffffff")


def pool(s):
    a, b, c, d = SPA_POOL
    s.part("satin", a, b, c - a, d - b, s.height, 0.10)
    s.barriers.append(list(SPA_POOL))
    s.part("mosaic", a, b, c - a, d - b, -1.28, 0.08)
    for x, z, w, depth in [
        (a - 0.12, b, 0.12, d - b),
        (c, b, 0.12, d - b),
        (a - 0.12, b - 0.12, c - a + 0.24, 0.12),
        (a - 0.12, d, c - a + 0.24, 0.12),
    ]:
        s.part("mosaic", x, z, w, depth, -1.25, 1.25)
        s.part("basalt", x, z, w, depth, 0, 0.025)
    # Undulations catch the actual environment highlights. A translucent skin
    # above the tiled basin reads differently viewed across and into the water.
    nx, nz = 100, 42
    points, indices = [], []
    for j in range(nz + 1):
        for i in range(nx + 1):
            x, z = a + (c - a) * i / nx, b + (d - b) * j / nz
            y = -0.085 + 0.013 * math.sin(x * 4.8 + math.sin(z * 2.4)) + 0.009 * math.sin(z * 7.6 + x * 1.6)
            points.append((x, y, z))
            if i and j:
                k = len(points) - 1
                indices.extend((k - nx - 2, k - 1, k, k - nx - 2, k, k - nx - 1))
    s.mesh("water", points, indices, "#ffffff")
    for x in (25.27, 25.86):
        s.tube("chrome", (x, 0.02, b - 0.48), (x, 0.63, b - 0.48), 0.032)
        path = [
            (x, 0.63 + 0.27 * math.sin(i * math.pi / 16), b - 0.21 - 0.27 * math.cos(i * math.pi / 16))
            for i in range(17)
        ]
        for p, q in zip(path, path[1:]):
            s.tube("chrome", p, q, 0.032)
        s.tube("chrome", path[-1], (x, -1.04, b + 0.06), 0.032)
    for y in (-0.22, -0.48, -0.74):
        s.tube("chrome", (25.27, y, b + 0.06), (25.86, y, b + 0.06), 0.025)


def spa(s):
    core(s, False)
    for rect in [
        (4.12, 16.48, 29.87, 21.28),
        (4.12, 21.28, 15.51, 26.33),
        (27.1, 21.28, 29.87, 26.33),
        (4.12, 26.33, 29.87, 26.98),
        (5.91, 26.98, 29.87, 28.16),
        (12.05, 28.16, 28.61, 30.84),
    ]:
        s.floor(*rect, "basalt")
    for x, z, x2, z2 in [
        (21.65, 9.86, 29.87, 10.04),
        (29.67, 10.04, 29.87, 28.16),
        (28.41, 28.16, 28.61, 30.84),
        (28.61, 27.96, 29.67, 28.16),
        (12.05, 28.16, 12.25, 30.84),
        (4.12, 26.78, 6.11, 26.98),
        (5.91, 26.98, 6.11, 28.16),
    ]:
        s.partition(x, z, x2, z2, "basalt")
    glazing(s, 12.25, 30.73, 23.45, 30.73, 6)
    glazing(s, 24.45, 30.73, 28.41, 30.73, 2)
    s.part("glass", 23.45, 30.723, 1.0, 0.014, 2.32, s.height - 2.46)
    s.part("frame", 23.45, 30.688, 1.0, 0.084, 2.29, 0.06)
    glazing(s, 6.11, 28.06, 12.05, 28.06, 3)
    glazing(s, 4.23, 16.48, 4.23, 26.78, 5)
    doors(s, 4.24, 19.56, 9.27, 19.56, [(5.12, 6.02), (7.42, 8.36)])
    doors(s, 9.27, 16.39, 9.27, 19.56, [])
    doors(s, 4.23, 16.39, 9.27, 16.39, [])
    doors(s, 6.75, 16.48, 6.75, 19.46, [])
    doors(s, 12.15, 19.0, 12.15, 28.05, [(19.2, 20.65)], "nero")
    doors(s, 13.14, 11.92, 24.24, 11.92, [])
    doors(s, 13.14, 11.92, 13.14, 16.17, [])
    doors(s, 17.88, 11.92, 17.88, 16.17, [], "oak")
    doors(s, 22.55, 12.02, 22.55, 16.17, [])
    doors(s, 13.14, 16.17, 24.24, 16.17, [(16.26, 17.19), (19.1, 20.2), (22.67, 23.96)], "travertine")
    doors(s, 24.24, 12.02, 24.24, 18.06, [(14.18, 15.08)])
    # Keep the first entrance clear of the structural column at x=25.72.
    doors(s, 24.24, 18.06, 29.76, 18.06, [(24.50, 25.45), (26.9, 27.76), (28.7, 29.57)])
    for x in (26.4, 28.09):
        doors(s, x, 14.89, x, 18.06, [])
    doors(s, 26.4, 14.89, 29.76, 14.89, [(26.9, 27.76), (28.8, 29.63)])
    # Actual front and back column grids, dark polished stone against satin flooring.
    for z, xs in [
        (18.0, [17.2, 21.56, 25.72]),
        (19.63, [13.55, 17.20, 21.56, 25.72, 29.66]),
        (29.9, [13.55, 17.20, 21.56, 25.72]),
    ]:
        for x in xs:
            s.part("nero", x - 0.21, z - 0.21, 0.42, 0.42, 0, s.height, solid=True)
            s.part("light", x - 0.22, z - 0.22, 0.44, 0.44, 0.035, 0.022)
    pool(s)
    for x in (13.55, 17.2, 21.56, 25.72):
        s.part("light", x + 0.26, 30.50, 2.14, 0.045, s.height - 0.055, 0.028)
    for x in (19.3, 22.9, 26.1):
        lounger(s, x, 28.48)
    # The lower terrace gives the glazing a near foreground in front of the sea.
    # Basalt structural base sits 2 cm below a warm teak deck finish (matching п6-pool.webp & masterplan.jpg).
    s.part("basalt", 4.6, 28.06, 7.45, 2.78, -5.20, 5.18)
    s.part("basalt", 4.6, 30.84, 21.2, 7.56, -5.20, 5.18)
    s.part("teak", 4.6, 28.06, 7.45, 2.78, -0.02, 0.02)
    s.part("teak", 4.6, 30.84, 21.2, 7.56, -0.02, 0.02)
    s.floors.extend([[4.6, 28.06, 12.05, 30.84], [4.6, 30.84, 25.8, 38.26], [1.55, 26.95, 4.65, 30.45]])
    s.barriers.extend([[11.20, 32.40, 20.80, 36.60],
                       [4.6, 30.55, 4.72, 38.26], [25.68, 30.84, 25.8, 38.26],
                       [4.6, 38.14, 25.8, 38.26],
                       [8.0, 30.4, 9.85, 34.2],
                       [1.40, 26.85, 1.55, 30.55], [1.40, 26.85, 4.62, 27.00],
                       [1.40, 30.40, 4.62, 30.55], [4.52, 26.85, 4.65, 28.15]])
    # Outdoor pool coping and turquoise water cleanly layered above the teak deck.
    s.part("limestone", 10.82, 32.02, 10.36, 4.96, 0.002, 0.045)
    s.part("water", 11.20, 32.40, 9.60, 4.20, 0.052, 0.012)
    for z in (32.02, 34.65, 36.86):
        lounger(s, 22.80, z)
    # Place parasols cleanly beside the loungers (x=24.45, clear of x=22.41..23.19)
    for z in (33.30, 35.85):
        parasol(s, 24.45, z, radius=1.22, height=2.32)
    # Left lounge seating corner at the foot of the exterior stairs (п3.webp)
    s.part("oak", 6.0, 33.85, 2.25, 0.80, 0.0, 0.14, solid=True)
    s.part("linen", 6.04, 33.89, 2.17, 0.72, 0.14, 0.28)
    s.part("linen", 6.04, 33.89, 2.17, 0.18, 0.42, 0.36)
    s.part("oak", 5.85, 34.65, 0.80, 1.55, 0.0, 0.14, solid=True)
    s.part("linen", 5.89, 34.69, 0.72, 1.47, 0.14, 0.28)
    s.part("linen", 5.89, 34.69, 0.18, 1.47, 0.42, 0.36)
    s.oval("limestone", 7.45, 35.35, 0.48, 0.48, 0.0, 0.34, "#ffffff")
    s.barriers.append([6.97, 34.87, 7.93, 35.83])
    parasol(s, 5.65, 36.95, radius=1.22, height=2.38)
    # Exterior staircase ascending to the open Level 1 front walkway landing (outside the lobby glass at z=29.65)
    # Landing connects right -> restaurant terrace (under pergola) and left -> pavilion rooftop yoga terrace (п3.webp)
    s.part("basalt", 4.6, 29.75, 5.4, 0.90, s.height - 0.14, 0.24)
    s.part("glass", 4.65, 30.60, 3.35, 0.03, s.height + 0.10, 1.02)
    for st in range(12):
        t = st / 12.0
        sy = (1.0 - t) * s.height
        sz = 30.55 + t * 3.55
        s.part("basalt", 8.05, sz - 0.16, 1.75, 0.34, max(0.0, sy - 0.26), 0.26)
    for rx in (8.08, 9.77):
        s.tube("frame", (rx, s.height + 0.95, 30.55), (rx, 0.95, 34.10), 0.025)
    # Adjacent left glazed Yoga & Stretching Pavilion ("Студия йоги") with wooden rooftop deck (masterplan.jpg).
    # Keep strictly south of the gym panoramic glazing (z >= 26.85) and open onto the pool deck at x=4.62, z=28.15..30.45.
    s.part("basalt", 1.35, 26.80, 3.30, 3.80, -5.20, 5.18)
    s.part("basalt", 4.12, 26.78, 2.00, 1.32, -5.20, 5.18)
    s.part("teak", 1.40, 26.85, 3.22, 3.70, -0.02, 0.025)
    s.part("frame", 1.40, 26.85, 3.22, 3.70, s.height - 0.18, 0.24)
    s.part("light", 1.80, 27.30, 2.20, 0.05, s.height - 0.20, 0.025)
    s.part("teak", 1.50, 26.95, 3.05, 3.50, s.height + 0.06, 0.06)
    # Perimeter bottom sill & transom over the wide doorway (x=4.58, z=28.15..30.46)
    s.part("frame", 1.41, 30.46, 3.20, 0.08, 0.0, 0.06)
    s.part("frame", 1.41, 26.85, 3.20, 0.08, 0.0, 0.06)
    s.part("frame", 1.41, 26.85, 0.08, 3.69, 0.0, 0.06)
    s.part("frame", 4.54, 26.85, 0.08, 1.30, 0.0, 0.06)
    s.part("frame", 4.54, 28.12, 0.08, 2.38, 2.34, 0.08)
    # Thin glass walls & vertical corner/bay mullions (east doorway z=28.15..30.46 is open!)
    s.part("glass", 1.45, 30.50, 3.13, 0.024, 0.05, s.height - 0.23)
    s.part("glass", 1.45, 26.88, 0.024, 3.64, 0.05, s.height - 0.23)
    s.part("glass", 1.45, 26.88, 3.13, 0.024, 0.05, s.height - 0.23)
    s.part("glass", 4.57, 26.88, 0.024, 1.27, 0.05, s.height - 0.23)
    s.part("glass", 4.57, 28.15, 0.024, 2.31, 2.40, s.height - 2.58)
    for px in (1.45, 2.50, 3.55, 4.58):
        s.part("frame", px - 0.04, 30.46, 0.08, 0.08, 0.0, s.height - 0.16)
    for px, pz in ((1.45, 26.89), (1.45, 28.70), (2.75, 26.89), (4.58, 26.89), (4.58, 28.12)):
        s.part("frame", px - 0.04, pz - 0.04, 0.08, 0.08, 0.0, s.height - 0.16)
    s.part("glass", 1.45, 30.52, 3.20, 0.03, s.height + 0.12, 1.02)
    s.part("glass", 1.45, 26.88, 0.03, 3.64, s.height + 0.12, 1.02)
    # Yoga studio interior: 3 yoga mats with bolsters, wooden bench along north wall, and potted palm
    for mz in (27.85, 28.75, 29.65):
        s.part("linen", 2.05, mz - 0.30, 1.72, 0.60, 0.005, 0.022)
        s.oval("walnut", 2.22, mz, 0.10, 0.24, 0.027, 0.11, "#ffffff")
    s.part("oak", 2.15, 27.05, 1.65, 0.38, 0.0, 0.38, solid=True)
    s.part("linen", 2.18, 27.08, 1.59, 0.32, 0.38, 0.06)
    palm(s, 1.82, 30.08)
    # Ground-level children's wooden playground, stairs down from the pool deck & garden apron (masterplan.jpg)
    play_y = -0.75
    # 5 wide teak/stone steps descending from the left-front edge of the pool deck (x = 6.2..8.2) to ground level
    for st in range(5):
        t = (st + 1) / 5.0
        sy = -t * abs(play_y)
        sz = 38.26 + st * 0.30
        s.part("teak", 6.22, sz, 1.96, 0.32, sy - 0.15, 0.15)
    for rx in (6.24, 8.16):
        s.tube("frame", (rx, 0.96, 38.26), (rx, play_y + 0.96, 39.76), 0.024)
        s.part("frame", rx - 0.03, 39.72, 0.06, 0.06, play_y, 0.98)
    # Continuous ground-level stone walkway + sand playground + clean architectural border (no spiky bushes)
    s.part("basalt", 4.2, 38.26, 19.0, 6.2, play_y - 2.6, 2.54)
    s.part("limestone", 4.6, 38.26, 4.0, 5.8, play_y - 0.05, 0.07)
    s.part("limestone", 8.6, 38.40, 13.6, 5.2, play_y - 0.06, 0.06)
    s.part("teak", 8.5, 38.35, 13.8, 0.14, play_y - 0.02, 0.08)
    s.part("teak", 8.5, 43.52, 13.8, 0.14, play_y - 0.02, 0.08)
    s.part("teak", 22.16, 38.35, 0.14, 5.31, play_y - 0.02, 0.08)
    # Clean low basalt perimeter curb + glass safety railing along the outer playground edge
    s.part("basalt", 4.6, 43.75, 18.2, 0.30, play_y, 0.36)
    s.part("glass", 4.65, 43.89, 18.1, 0.024, play_y + 0.36, 0.78)
    for x in (4.68, 9.2, 13.7, 18.2, 22.72):
        s.part("frame", x - 0.03, 43.86, 0.06, 0.06, play_y + 0.34, 0.82)
    playground(s, play_y)
    # Tasteful potted botanical palms in the playground corners (matching the spa terrace)
    palm(s, 5.25, 43.15, base=play_y)
    palm(s, 21.65, 43.10, base=play_y)
    palm(s, 27.46, 28.70)
    palm(s, 24.70, 31.80)
    # Complete glass balustrades & posts on front (with stair opening at x=6.2..8.2), left, and right outer edges
    for x in (4.68, 6.20, 8.20, 12.6, 17.4, 22.2, 25.72):
        s.part("frame", x - 0.035, 38.22, 0.07, 0.07, -0.02, 1.04)
    s.part("glass", 4.68, 38.25, 1.52, 0.024, 0.0, 1.02)
    s.part("glass", 8.20, 38.25, 17.52, 0.024, 0.0, 1.02)
    # Pool deck left glass balustrade starts at z=30.55, leaving x=4.6, z=28.15..30.45 wide open into the Yoga Pavilion
    for z in (30.55, 34.4):
        s.part("frame", 4.63, z - 0.035, 0.07, 0.07, -0.02, 1.04)
    s.part("glass", 4.66, 30.55, 0.024, 7.71, 0.0, 1.02)
    for z in (30.92, 34.6):
        s.part("frame", 25.70, z - 0.035, 0.07, 0.07, -0.02, 1.04)
    s.part("glass", 25.73, 30.86, 0.024, 7.40, 0.0, 1.02)
    for z in (12.43, 13.02):
        s.part("oak", 13.55, z, 4.06, 0.53, 0.03, 0.46 if z > 12.5 else 0.88, solid=True)
    for j in range(16):
        s.part("oak", 13.45 + j * 0.267, 12.065, 0.248, 0.075, 0.9, 1.40)
    for i in range(23):
        s.part("oak", 13.235, 12.10 + i * 0.168, 0.055, 0.162, 0.02, s.height - 0.04)
    for z, y in [(12.43, 0.91), (13.02, 0.49)]:
        for j in range(6):
            s.part("oak", 13.53, z + j * 0.089, 4.10, 0.078, y, 0.045)
        s.part("light", 13.59, z + 0.52, 3.98, 0.018, y - 0.06, 0.025)
    s.part("frame", 13.59, 14.32, 0.67, 0.61, 0.07, 0.71, solid=True)
    for j in range(6):
        s.oval("basalt", 13.78 + (j % 2) * 0.24, 14.42 + (j // 2) * 0.17, 0.15, 0.12, 0.76, 0.095, "#ffffff")
    s.part("linen", 19.15, 13.45, 0.93, 1.94, 0.71, 0.18, solid=True)
    s.part("oak", 19.27, 13.63, 0.69, 1.58, 0.04, 0.67)
    # Treadmills with raised consoles and handrails in the separate gym.
    for x in (6.5, 8.35, 10.2):
        s.part("frame", x - 0.40, 24.35, 0.80, 1.7, 0, 0.27, solid=True)
        s.part("basalt", x - 0.30, 24.40, 0.60, 1.50, 0.27, 0.015)
        for dx in (-0.32, 0.32):
            s.tube("chrome", (x + dx, 0.22, 25.72), (x + dx, 1.13, 25.94), 0.037)
            s.tube("frame", (x + dx, 0.92, 25.38), (x + dx, 1.13, 25.94), 0.032)
        s.part("frame", x - 0.32, 25.90, 0.64, 0.15, 1.10, 0.32)
    s.view("Бассейн", [28.04, 20.35], [20.8, 28.9], -0.13, "pool-day.webp")
    s.view("У панорамных окон", [27.58, 26.89], [20.1, 31.1], -0.065, "pool-evening.webp")
    s.view("Сауна", [17.15, 15.45], [14.95, 12.32], -0.13)
    s.view("Спортзал", [10.72, 20.36], [7.79, 26.72], -0.10)
    s.view("Йога-павильон", [4.35, 29.25], [1.90, 28.60], -0.09)


def lobby(s):
    core(s, True)
    for rect in [
        (4.12, 16.48, 29.87, 18.17),
        (4.12, 18.17, 11.46, 23.62),
        (4.12, 23.62, 13.44, 26.98),
        (5.91, 26.98, 13.44, 28.17),
    ]:
        s.floor(*rect, "limestone")
    doors(s, 4.22, 16.39, 8.19, 16.39, [])
    doors(s, 8.19, 16.48, 8.19, 19.36, [(17.5, 18.4)])
    doors(s, 4.23, 19.36, 8.19, 19.36, [])
    doors(s, 6.2, 19.36, 6.2, 23.62, [(20.42, 21.36), (22.4, 23.25)])
    doors(s, 4.23, 22.14, 6.2, 22.14, [])
    doors(s, 4.23, 23.62, 6.2, 23.62, [])
    doors(s, 13.22, 13.82, 17.09, 13.82, [(13.67, 14.53), (15.64, 16.50)])
    doors(s, 17.29, 11.83, 17.29, 17.98, [(12.35, 13.55)])
    doors(s, 15.07, 13.92, 15.07, 18.05, [])
    doors(s, 13.14, 16.14, 17.0, 16.14, [(13.65, 14.52), (15.6, 16.48)])
    doors(s, 13.14, 18.08, 17.0, 18.08, [])
    s.partition(21.65, 9.86, 29.87, 10.05)
    doors(s, 9.37, 12.04, 17.29, 12.04, [(12.28, 13.22)])
    s.partition(4.12, 16.48, 4.32, 26.98, "travertine")
    s.partition(4.22, 26.79, 6.11, 26.98, "travertine")
    s.partition(5.91, 26.98, 6.11, 28.16, "travertine")
    glazing(s, 6.11, 28.06, 9.75, 28.06, 2)
    s.partition(9.75, 27.98, 13.44, 28.17, "travertine")
    glazing(s, 13.34, 23.72, 13.34, 28.06, 3)
    # The opening in the glazed frontage gives access to the outdoor tables.
    glazing(s, 11.36, 18.94, 11.36, 20.40, 1)
    glazing(s, 11.36, 21.60, 11.36, 23.72, 1)
    s.partition(11.36, 23.62, 13.44, 23.82, "travertine")
    glazing(s, 17.30, 18.07, 22.0, 18.07, 3)
    glazing(s, 23.20, 18.07, 29.77, 18.07, 4)
    s.part("glass", 22.0, 18.063, 1.20, 0.014, 2.32, s.height - 2.46)
    s.part("frame", 22.0, 18.028, 1.20, 0.084, 2.29, 0.06)
    glazing(s, 29.77, 10.04, 29.77, 18.07, 4)
    for x in (17.20, 21.56, 25.72, 29.68):
        s.part("travertine", x - 0.21, 17.78, 0.42, 0.42, 0, s.height, solid=True)
    # Welcome desk, ribbed piers, Nero plinth, brass mushroom lamp and warm line of light.
    # The stair enclosure ends at the column, leaving the lobby-to-dining passage open.
    s.part("travertine", 8.28, 16.48, 1.09, 0.18, 0, s.height, solid=True)
    s.part("sign", 10.08, 27.95, 1.82, 0.022, 0.91, 2.04)
    s.part("nero", 10.08, 27.87, 1.82, 0.09, 0.02, 0.89)
    for x in (9.80, 11.98):
        for i in range(6):
            s.part("travertine", x + i * 0.035, 27.91, 0.020, 0.065, 0.05, s.height - 0.08)
    s.oval("ivory", 9.43, 26.44, 0.65, 0.85, 0.045, 0.94, "#ffffff", segments=64)
    s.barriers.append([8.78, 25.59, 10.08, 27.29])
    s.oval("limestone", 9.43, 26.44, 0.73, 0.94, 0.985, 0.05, "#ffffff", segments=64)
    s.tube("bronze", (9.54, 1.035, 26.64), (9.54, 1.35, 26.64), 0.045)
    for i in range(10):
        rad = 0.235 * math.cos(i / 10 * math.pi / 2)
        s.oval("bronze", 9.54, 26.64, rad, rad, 1.35 + i * 0.021, 0.022, "#ffffff")
    s.part("light", 10.90, 21.35, 0.035, 6.10, s.height - 0.033, 0.027)
    s.part("limestone", 11.35, 18.18, 18.52, 5.42, -0.14, 0.14)
    s.part("limestone", 13.45, 23.60, 12.75, 7.0, -0.14, 0.14)
    s.floors.extend([[11.35, 18.18, 29.87, 23.60], [13.45, 23.60, 26.20, 30.28]])
    # Match the terrace and balustrade to the external building model.
    s.part("basalt", 13.45, 30.28, 12.75, 0.22, -0.07, 0.78)
    s.part("basalt", 26.00, 23.60, 0.20, 6.90, -0.07, 0.78)
    s.part("basalt", 13.35, 28.17, 0.20, 2.21, -0.07, 0.78, solid=True)
    for a, b in [((13.45, 28.17), (13.45, 30.38)), ((13.45, 30.38), (26.10, 30.38)), ((26.10, 23.60), (26.10, 30.38))]:
        s.band("glass", [a, b], 0.025, 0.71, 0.40, "#ffffff")
        s.tube("bronze", (a[0], 1.13, a[1]), (b[0], 1.13, b[1]), 0.018)
    for x, z in [(15.6, 28.0), (18.7, 28.0), (21.8, 28.0), (16.8, 23.6), (20.6, 23.6), (24.4, 23.8)]:
        dining_table(s, x, z, outdoor=True)
    palm(s, 18.0, 17.14)
    palm(s, 27.8, 21.32)
    s.view("Ресепшен", [11.62, 24.17], [10.92, 27.98], -0.035, "reception.webp")
    restaurant(s)


def build(level):
    s = PublicScene(3.70 if level == -1 else 3.30, ceiling_drop=0.04 if level in (-1, 1) else 0)
    {-1: spa, 1: lobby, 8: roof}[level](s)
    return s


if __name__ == "__main__":
    for level, folder in [(-1, "spa"), (1, "lobby"), (8, "roof")]:
        dest = ROOT.parent / "assets/residences" / folder
        dest.mkdir(exist_ok=True)
        data = build(level).export()
        (dest / "interior.glb").write_bytes(data)
        if level == 8:
            write_roof_plan(ROOT.parent / "assets/docs/aurum-fort-floor-plans.pdf", dest / "plan.webp")
        print(f"{folder}: {len(data):,} bytes")
