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
    for x, z, x2, z2 in [(7.59, 3.69, 17.39, 7.48), (7.59, 7.48, 16.15 if ground else 17.19, 9.85), (4.12, 9.85, 29.87, 16.48)]:
        s.floor(x, z, x2, z2, "limestone")
    if ground:
        # The stairwell is open above the return flight and the upper landing.
        s.floors.append([16.15, 7.48, 17.19, 9.85])
        s.part("limestone", 16.15, 7.48, 1.04, 2.37, -0.14, 0.14)
        s.part("ivory", 16.15, 8.64, 1.04, 1.21, s.height, 0.10)
        s.floors.append([17.19, 7.48, 21.76, 9.85])
        s.part("limestone", 17.19, 7.48, 4.57, 2.37, -0.14, 0.14)
        s.part("ivory", 16.15, 7.48, 5.61, 2.37, s.height * 2, 0.10)
        for x, z, w, d in [
            (16.15, 7.48, 5.61, 0.20),
            (17.19, 9.65, 4.57, 0.20),
            (21.56, 7.48, 0.20, 2.37),
            (16.15, 8.64, 1.04, 0.18),
        ]:
            s.part("ivory", x, z, w, d, s.height, s.height)
    else:
        s.floor(17.19, 7.48, 21.76, 9.85, "limestone")
    doors(s, 11.35, 13.50, 13.14, 13.50, [(11.80, 12.76)])
    for z in (15.0, 17.55):
        s.part("bronze", 11.23, z - 0.47, 0.035, 0.94, 0.02, 2.27)
        s.part("frame", 11.207, z - 0.009, 0.02, 0.018, 0.02, 2.24)
    if not ground:
        doors(s, 7.7, 5.99, 11.35, 5.99, [(9.2, 10.1)])
        doors(s, 11.35, 3.9, 11.35, 9.95, [(7.55, 8.47)])
    doors(s, 7.7, 9.94, 21.65, 9.94, [(10.05, 11.02), (13.8, 14.85), (20.18, 21.22)])
    doors(s, 4.22, 13.51, 9.37, 13.51, [(8.1, 9.1)])
    doors(s, 9.37, 10.0, 9.37, 16.39, [(11.20, 12.28), (14.17, 15.2)])
    stairs = [(4.52, 14.09, 3.20, 1.14)]
    if not ground:
        stairs.append((17.2, 8.1, 3.4, 1.15))
    for x, z, length, width in stairs:
        for i in range(10):
            s.part("limestone", x + i * length / 10, z, length / 10, width, 0, (i + 1) * 0.15, solid=True)
    if ground:
        for i in range(10):
            s.part("limestone", 17.30 + i * 0.32, 8.77, 0.32, 0.94, 0, (i + 1) * 0.165, solid=True)
            top = (20 - i) * 0.165
            s.part("limestone", 17.30 + i * 0.32, 7.70, 0.32, 0.94, top - 0.165, 0.165, solid=True)
        s.part("limestone", 20.50, 7.70, 1.04, 2.01, 0, 1.65, solid=True)
        s.part("limestone", 16.27, 7.70, 1.03, 0.94, 3.16, 0.14)
        # A sloped concrete slab supports the return flight above the landing.
        s.mesh("limestone", [
            (17.30, 3.135, 7.70), (20.50, 1.485, 7.70), (20.50, 1.485, 8.64), (17.30, 3.135, 8.64),
            (17.30, 2.955, 7.70), (20.50, 1.305, 7.70), (20.50, 1.305, 8.64), (17.30, 2.955, 8.64),
        ], [0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1,
            1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0], "#ffffff")
        s.tube("bronze", (17.36, 3.95, 8.70), (20.48, 2.30, 8.70), 0.025)
        for i in range(5):
            x = 17.45 + i * 0.73
            y = 3.30 - (x - 17.30) / 3.20 * 1.65
            s.tube("bronze", (x, y, 8.70), (x, y + 0.70, 8.70), 0.015)


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
    glazing(s, 12.25, 30.73, 28.41, 30.73, 8)
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
    doors(s, 24.24, 18.06, 29.76, 18.06, [(25.0, 25.87), (26.9, 27.76), (28.7, 29.57)])
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
    s.part("basalt", 4.6, 28.06, 7.45, 2.78, -5.20, 5.20)
    s.part("basalt", 4.6, 30.84, 21.2, 7.56, -5.20, 5.20)
    s.part("limestone", 10.82, 32.02, 10.36, 4.96, -0.07, 0.08)
    s.part("water", 11.20, 32.40, 9.60, 4.20, 0.012, 0.012)
    for z in (32.02, 34.45, 36.86):
        lounger(s, 22.80, z)
    palm(s, 27.46, 28.70)
    palm(s, 24.70, 31.80)
    for x in (12.6, 17.4, 22.2):
        s.part("frame", x - 0.035, 38.24, 0.07, 0.07, -0.075, 1.04)
    s.part("glass", 4.75, 38.26, 20.9, 0.024, -0.05, 1.0)
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
    glazing(s, 11.36, 18.94, 11.36, 23.72, 3)
    s.partition(11.36, 23.62, 13.44, 23.82, "travertine")
    glazing(s, 17.30, 18.07, 29.77, 18.07, 8)
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
    # Match the terrace and balustrade to the external building model.
    s.part("basalt", 13.45, 30.28, 12.75, 0.22, -0.07, 0.78)
    s.part("basalt", 26.00, 23.60, 0.20, 6.90, -0.07, 0.78)
    for a, b in [((13.45, 30.38), (26.10, 30.38)), ((26.10, 23.60), (26.10, 30.38))]:
        s.band("glass", [a, b], 0.025, 0.71, 0.40, "#ffffff")
        s.tube("bronze", (a[0], 1.13, a[1]), (b[0], 1.13, b[1]), 0.018)
    for x, z in [(15.6, 28.0), (18.7, 28.0), (21.8, 28.0), (16.8, 23.6), (20.6, 23.6), (24.4, 23.8)]:
        dining_table(s, x, z, outdoor=True)
    palm(s, 18.0, 17.14)
    palm(s, 27.8, 21.32)
    s.view("Ресепшен", [11.62, 24.17], [10.92, 27.98], -0.035, "reception.webp")
    restaurant(s)


def build(level):
    s = PublicScene(3.70 if level == -1 else 3.30)
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
