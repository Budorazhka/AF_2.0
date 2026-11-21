"""Shared furnishings for the public spaces, in building plan coordinates."""

import math


def cushion(s, x, y, z, width, height, depth, angle=0, finish="linen"):
    """Upholstery with rounded corners and a crowned seat, pitched about its local X axis."""
    vertices, indices = [], []

    def rounded(v, exponent):
        return math.copysign(abs(v) ** exponent, v)

    for j in range(11):
        lat = math.pi * (j / 10 - 0.5)
        ring = abs(math.cos(lat)) ** 0.28
        for i in range(36):
            t = i * math.tau / 36
            dx = width / 2 * ring * rounded(math.cos(t), 0.26)
            dz = depth / 2 * ring * rounded(math.sin(t), 0.26)
            dy = height / 2 * rounded(math.sin(lat), 0.65)
            vertices.append(
                (
                    x + dx,
                    y + dy * math.cos(angle) - dz * math.sin(angle),
                    z + dz * math.cos(angle) + dy * math.sin(angle),
                )
            )
            if j:
                a = (j - 1) * 36 + i
                b = (j - 1) * 36 + (i + 1) % 36
                indices.extend((a, a + 36, b, b, a + 36, b + 36))
    s.mesh(finish, vertices, indices, "#ffffff")


def chair(s, x, z, back=1, finish="linen", wood="oak"):
    s.part(wood, x - 0.24, z - 0.25, 0.48, 0.50, 0.38, 0.08)
    s.barriers.append([x - 0.24, z - 0.24, x + 0.24, z + 0.24])
    cushion(s, x, 0.49, z, 0.49, 0.10, 0.47, finish=finish)
    cushion(s, x, 0.70, z + back * 0.23, 0.46, 0.35, 0.075, back * 0.12, finish)
    for dx in (-0.19, 0.19):
        for dz in (-0.20, 0.20):
            s.tube(wood, (x + dx, 0.02, z + dz), (x + dx * 0.86, 0.4, z + dz * 0.86), 0.025)


def lounger(s, x, z):
    s.barriers.append([x - 0.39, z - 0.97, x + 0.39, z + 0.94])
    cushion(s, x, 0.43, z + 0.31, 0.74, 0.12, 1.24)
    cushion(s, x, 0.69, z - 0.61, 0.74, 0.12, 0.93, 0.62)
    cushion(s, x, 0.94, z - 0.90, 0.64, 0.17, 0.23, 0.62)
    for dx in (-0.30, 0.30):
        s.tube("oak", (x + dx, 0.33, z + 0.91), (x + dx, 0.33, z - 0.28), 0.036)
        s.tube("oak", (x + dx, 0.33, z - 0.28), (x + dx, 0.86, z - 0.96), 0.036)
        s.tube("oak", (x + dx, 0.34, z - 0.60), (x + dx, 0.66, z - 0.71), 0.029)
        s.tube("oak", (x + dx, 0.01, z - 0.74), (x + dx, 0.36, z - 0.64), 0.034)
        s.tube("oak", (x + dx, 0.01, z + 0.77), (x + dx, 0.36, z + 0.68), 0.034)


def palm(s, x, z, base=0):
    s.oval("nero", x, z, 0.29, 0.29, base, 0.49, "#ffffff")
    s.barriers.append([x - 0.29, z - 0.29, x + 0.29, z + 0.29])
    for i in range(13):
        az = i * 2.40
        reach = 0.54 + 0.16 * (i % 3)
        dx, dz = math.cos(az), math.sin(az)

        def spine(t):
            return (
                x + dx * t * reach,
                base + 0.47 + 1.5 * t - 0.80 * t * t + 0.12 * (i % 4) * t,
                z + dz * t * reach,
            )

        for j in range(6):
            s.tube("leaf", spine(j / 6), spine((j + 1) / 6), 0.009)
        for j in range(2, 11):
            t = j / 12
            a, y, b = spine(t)
            for side in (-1, 1):
                spread = side * 0.32 * math.sin(t * math.pi)
                tip = (a - dz * spread + dx * 0.12, y - 0.15, b + dx * spread + dz * 0.12)
                s.mesh(
                    "leaf",
                    [
                        (a, y, b),
                        (a - dz * spread * 0.5, y + 0.018, b + dx * spread * 0.5),
                        tip,
                        (a - dz * spread * 0.5 + dx * 0.08, y, b + dx * spread * 0.5 + dz * 0.08),
                    ],
                    [0, 1, 2, 0, 2, 3],
                    "#ffffff",
                )
