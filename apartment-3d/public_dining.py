"""Open kitchen and dining room on level 1, with terrace furniture shared by the roof."""

import math
from public_furniture import chair


def turned(s, finish, x, z, profile, segments=24):
    """Revolve a radius/height profile, including its lip and underside."""
    verts = [
        (x + r * math.cos(i * math.tau / segments), y, z + r * math.sin(i * math.tau / segments))
        for r, y in profile
        for i in range(segments)
    ]
    indices = []
    for j in range(len(profile) - 1):
        for i in range(segments):
            a = j * segments + i
            b = j * segments + (i + 1) % segments
            indices.extend([a, a + segments, b, b, a + segments, b + segments])
    s.mesh(finish, verts, indices, "#ffffff")


def dining_table(s, x, z, outdoor=False):
    top = 0.755
    material = "teak" if outdoor else "walnut"
    turned(
        s, material, x, z, [(0, 0.705), (0.49, 0.705), (0.52, 0.721), (0.52, 0.747), (0.505, top), (0, top)], 36
    )
    turned(s, material, x, z, [(0.25, 0.015), (0.24, 0.065), (0.14, 0.20), (0.10, 0.62), (0.25, 0.705)])
    s.barriers.append([x - 0.52, z - 0.52, x + 0.52, z + 0.52])
    for side in (-1, 1):
        chair(s, x, z + side * 0.73, side, "linen" if outdoor else "leather", material)
        pz = z + side * 0.275
        turned(
            s,
            "porcelain",
            x,
            pz,
            [(0.083, top), (0.135, top + 0.013), (0.134, top + 0.021), (0.09, top + 0.012), (0, top + 0.012)],
        )
        s.part("linen", x - 0.074, pz - 0.036, 0.148, 0.072, top + 0.019, 0.013)
        for offset in (-0.164, 0.164):
            s.part("chrome", x + offset, pz - 0.080, 0.011, 0.15, top + 0.003, 0.004)
        s.part("chrome", x + 0.162, pz + side * 0.062, 0.016, 0.068, top + 0.003, 0.003)
        for tooth in range(4):
            s.part("chrome", x - 0.169 + tooth * 0.005, pz + side * 0.071, 0.0025, 0.036, top + 0.003, 0.003)
        # Foot, stem and bowl of a wine glass.
        gx, gz = x + side * 0.205, z + side * 0.17
        s.oval("crystal", gx, gz, 0.040, 0.040, top, 0.006, "#ffffff", segments=14)
        s.tube("chrome", (gx, top + 0.006, gz), (gx, top + 0.094, gz), 0.003)
        turned(
            s,
            "crystal",
            gx,
            gz,
            [
                (0.006, top + 0.092),
                (0.041, top + 0.115),
                (0.048, top + 0.151),
                (0.035, top + 0.204),
                (0.033, top + 0.204),
            ],
            18,
        )
    if outdoor:
        turned(s, "bronze", x, z, [(0.056, top), (0.049, top + 0.13), (0.040, top + 0.14)])
        s.oval("light", x, z, 0.032, 0.032, top + 0.137, 0.018, "#ffffff")


def restaurant(s):
    # The kitchen and cafe share this 1.8 m-long section on the sheet.
    # A serving hatch leaves the adjacent doorway into the hall free.
    s.part("walnut", 17.19, 10.05, 0.18, 1.78, 0, 0.96, solid=True)
    s.part("slate", 17.07, 10.04, 0.67, 1.80, 0.96, 0.075)
    s.part("slate", 17.19, 10.05, 0.18, 1.78, 2.34, s.height - 2.34)
    s.part("bronze", 17.76, 10.05, 0.022, 1.76, 0.977, 0.024)
    for z in (10.43, 11.25):
        for i in range(3):
            s.oval("porcelain", 17.45, z, 0.135, 0.135, 1.038 + i * 0.014, 0.014, "#ffffff")

    # Kitchen prep line, tiled splashback, range, extraction hood and pass.
    s.part("chrome", 10.3, 4.05, 6.76, 0.77, 0.10, 0.79, solid=True)
    s.part("slate", 10.28, 4.02, 6.81, 0.83, 0.89, 0.075)
    s.part("kitchen-tile", 10.30, 3.94, 6.75, 0.075, 0.96, 0.78)
    for i in range(8):
        x = 10.33 + i * 0.835
        s.part("satin", x, 4.826, 0.80, 0.018, 0.16, 0.64)
        s.part("frame", x + 0.55, 4.85, 0.19, 0.022, 0.70, 0.02)
    for x in (13.62, 14.16, 14.70):
        for z in (4.28, 4.63):
            s.oval("frame", x, z, 0.138, 0.138, 0.965, 0.017, "#ffffff", segments=18)
    for x in (13.62, 14.70):
        turned(s, "chrome", x, 4.46, [(0.132, 0.982), (0.17, 1.05), (0.17, 1.18), (0.157, 1.19)])
    s.part("chrome", 13.12, 4.01, 2.17, 1.01, 2.10, 0.18)
    s.part("satin", 13.71, 4.03, 0.97, 0.55, 2.28, s.height - 2.28)
    s.part("light", 13.24, 4.89, 1.92, 0.04, 2.086, 0.014)
    s.part("walnut", 11.70, 7.42, 3.64, 0.88, 0.11, 0.79, solid=True)
    s.part("limestone", 11.64, 7.38, 3.76, 0.96, 0.90, 0.065)
    for x in (12.1, 13.45):
        s.part("oak", x, 7.56, 0.45, 0.36, 0.965, 0.031)
    s.part("chrome", 8.05, 4.12, 1.17, 0.76, 0.05, 2.12, solid=True)
    s.part("frame", 8.61, 4.885, 0.017, 0.02, 0.1, 2.04)
    # Bar and softly backlit bottle shelves on the inland wall.
    s.part("dining-stone", 21.8, 10.053, 7.63, 0.09, 0.02, s.height - 0.02)
    for x in (21.8, 23.89, 25.98, 28.07, 29.41):
        s.part("bronze", x, 10.142, 0.015, 0.014, 0.04, s.height - 0.05)
    s.part("walnut", 22.08, 10.29, 6.93, 0.57, 0.08, 0.89, solid=True)
    s.part("slate", 22.02, 10.24, 7.05, 0.66, 0.97, 0.085)
    for y in (1.28, 1.91):
        s.part("walnut", 22.24, 10.14, 3.55, 0.24, y, 0.045)
        s.part("light", 22.30, 10.15, 3.43, 0.016, y - 0.021, 0.017)
        for i in range(7):
            x = 22.52 + i * 0.46
            bottle_y = y + 0.045
            turned(
                s,
                "bottle" if i % 3 else "bronze",
                x,
                10.27,
                [
                    (0.040, bottle_y),
                    (0.042, bottle_y + 0.19),
                    (0.018, bottle_y + 0.24),
                    (0.018, bottle_y + 0.31),
                ],
                12,
            )
    for z, xs in [
        (11.63, [20.05, 22.45, 24.63, 26.86, 28.65]),
        (14.02, [20.10, 22.80, 25.50, 28.20]),
        (16.58, [20.65, 24.20, 28.20]),
    ]:
        for x in xs:
            dining_table(s, x, z)
    for x in (20.05, 24.2, 28.2):
        for z in (14.02, 16.58):
            s.tube("bronze", (x, 2.26, z), (x, s.height, z), 0.008)
            turned(s, "bronze", x, z, [(0.235, 2.22), (0.234, 2.25), (0.16, 2.33), (0.038, 2.39)])
            s.oval("light", x, z, 0.214, 0.214, 2.209, 0.015, "#ffffff")
    s.view("Ресторан", [28.95, 15.21], [23.5, 11.12], -0.075, "/assets/img/24_upscaled.webp", "restaurant")
    s.view("Открытая кухня", [10.05, 9.10], [14.2, 4.80], -0.075, key="kitchen")
    s.view("Столики у окон", [21.27, 12.55], [25.15, 17.86], -0.10, key="windows")
