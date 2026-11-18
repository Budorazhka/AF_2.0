"""Residence 107.1 m² (plan N704, 2+1) — 59.4 m² interior, 45.5 m² terrace, 2.2 m² balcony.

Interior outline from the VII floor plan: main body 1.80..10.21 x 2.00..8.00, a
north-east block 6.80..10.21 x 0.00..2.00 holding the first bedroom, and a west
alcove 0.00..1.80 x 2.00..3.40 whose outer corner is cut at 45°. The terrace runs
the full east side and returns along the south.
"""
import math

from lib import Scene, CEILING

UNIT = dict(
    slug='107-1',
    title='Квартира 107,1 м²',
    eyebrow='AURUM FORT / РЕЗИДЕНЦИЯ 107,1',
    summary='59,4 м² интерьер · терраса 45,5 м² · балкон 2,2 м²<br>Объёмная реконструкция · метры',
    notes=('<p>Контур снят с поэтажного плана VII этажа (резиденция №704). Внутренняя площадь 59,4 м², '
           'терраса 45,5 м², балкон 2,2 м², общая 107,1 м².</p>'
           '<p>Высота потолков 2,80 м, дверей 2,20 м. Несущие колонны 40×40 см, внешние стены 20 см.</p>'
           '<p>Две изолированные спальни, санузел с ванной между ними, кухонный фронт спиной к северной '
           'спальне. Терраса 45,5 м² — самая большая в доме: идёт вдоль всей восточной стены '
           'и заворачивает на юг.</p>'),
)

FOOTPRINT = [
    (1.80, 2.00, 10.21, 8.00),
    (6.80, 0.00, 10.21, 2.00),
    (0.00, 2.00, 1.80, 3.40),
    (4.00, 8.00, 6.00, 9.40),      # balcony
    (6.00, 8.00, 14.61, 9.75),     # terrace south arm
    (10.21, -0.20, 14.61, 9.20),   # terrace east arm
]


def fixed_glazing(scene, name, x1, z1, x2, z2, mullions):
    """Fill the fixed part of the opening between the frame rails with glass."""
    scene.rect(f'{name} sill', x1, z1, x2, z2, 0.16, 'dark', -0.16, 'glazing')
    if x2 - x1 > z2 - z1:
        scene.glazing(name, x1, z1 + 0.05, x2, z2 - 0.05, mullions)
        z1 = (z1 + z2) / 2 - 0.008
        z2 = z1 + 0.016
    else:
        scene.glazing(name, x1 + 0.05, z1, x2 - 0.05, z2, mullions)
        x1 = (x1 + x2) / 2 - 0.008
        x2 = x1 + 0.016
    scene.rect(f'{name} pane', x1, z1, x2, z2, CEILING - 0.16, 'glass', 0.10, 'glazing')['alpha'] = 0.14


def build():
    s = Scene()

    # -- floors ----------------------------------------------------------
    s.rect('Bedroom 1 floor', 6.82, 0.00, 10.21, 3.04, 0.16, 'floor', -0.16, 'floor')
    s.rect('Bathroom tile floor', 3.00, 2.00, 6.01, 4.14, 0.16, 'tile', -0.16, 'floor')
    s.rect('Hall floor', 1.80, 2.00, 3.20, 5.12, 0.16, 'floor', -0.16, 'floor')
    s.slab('Wardrobe alcove floor', [(0.00, 2.59), (0.58, 2.00), (1.80, 2.00), (1.80, 3.40), (0.00, 3.40)],
           -0.16, 0.16, 'floor')
    s.rect('Bedroom 2 floor', 1.80, 5.12, 5.86, 8.00, 0.16, 'floor', -0.16, 'floor')
    s.rect('Bedroom 1 west bay floor', 6.01, 2.00, 6.82, 3.04, 0.16, 'floor', -0.16, 'floor')
    s.rect('Living floor north', 6.01, 3.04, 10.21, 4.34, 0.16, 'floor', -0.16, 'floor')
    s.rect('Living floor mid', 3.20, 4.34, 10.21, 5.12, 0.16, 'floor', -0.16, 'floor')
    s.rect('Living floor south', 5.86, 5.12, 10.21, 8.00, 0.16, 'floor', -0.16, 'floor')
    s.slab('Balcony slab', [(4.00, 8.00), (6.00, 8.00), (6.00, 9.40), (4.00, 9.11)], -0.20, 0.18, 'tile')
    # L-shaped terrace, split so each cap stays convex
    s.slab('Terrace slab east', [(10.21, -0.20), (14.61, -0.20), (14.61, 8.20), (10.21, 9.68)], -0.20, 0.18, 'tile')
    s.slab('Terrace slab south', [(6.00, 8.00), (10.21, 8.00), (10.21, 9.68), (6.00, 9.11)], -0.20, 0.18, 'tile')

    # -- structure -------------------------------------------------------
    for name, x, z in [('N-West', 6.62, -0.20), ('NE', 10.21, -0.20), ('Mid-West', 2.26, 1.80),
                       ('Mid', 6.62, 1.80), ('Mid-East', 10.21, 1.80), ('SW', 1.60, 7.81),
                       ('S-Mid', 5.60, 7.81), ('SE', 10.21, 7.81)]:
        s.column(f'{name} Column', x, z, x + 0.40, z + 0.40)

    s.wall('North exterior bedroom', 6.82, -0.20, 10.21, 0.00)
    s.wall('North wall west', 0.58, 1.80, 1.34, 2.00)
    s.lintel('Entrance lintel', 1.34, 1.80, 2.26, 2.00)
    s.wall('North wall mid', 2.66, 1.80, 6.62, 2.00)
    s.rect('Entrance threshold', 1.34, 1.80, 2.26, 2.00, 0.16, 'wood', -0.16, 'walls')
    s.rect('Entrance closed door', 1.34, 1.92, 2.26, 1.98, 2.20, 'wood', group='walls')

    s.slab('Chamfer wall', [(0.00, 2.72), (0.00, 2.59), (0.58, 2.00), (0.58, 1.80), (-0.20, 2.59), (-0.20, 2.72)], 0.0, CEILING, 'wall', 'walls')
    s.wall('West alcove wall', -0.20, 2.72, 0.00, 3.40)
    s.wall('Alcove south wall', -0.20, 3.40, 1.80, 3.60)
    s.wall('West party wall', 1.60, 3.60, 1.80, 7.81)

    s.wall('East exterior north', 10.21, 0.20, 10.41, 1.80)
    s.wall('East exterior pier', 10.21, 2.20, 10.41, 2.28)
    s.lintel('Bedroom 1 terrace door lintel', 10.21, 2.28, 10.41, 3.00)
    s.wall('East exterior mid', 10.21, 3.00, 10.41, 5.84)
    s.wall('East exterior south', 10.21, 7.01, 10.41, 7.81)
    s.glazed_door_leaf('Bedroom 1 terrace open door', 10.41, 2.96, 11.12, 3.00, 'metal')

    s.wall('South exterior west pier', 1.80, 8.00, 2.00, 8.20)
    s.lintel('Bedroom 2 balcony door lintel', 4.87, 8.00, 5.60, 8.20)
    s.lintel('Terrace south door lintel', 9.24, 8.00, 10.00, 8.20)
    s.wall('South exterior east', 10.00, 8.00, 10.41, 8.20)
    s.glazed_door_leaf('Balcony open door', 5.56, 8.21, 5.60, 8.94, 'metal')
    s.glazed_door_leaf('Terrace south open door', 9.96, 8.20, 10.00, 8.96, 'metal')

    # interior partitions
    s.wall('Bedroom 1 west wall north', 6.62, 0.00, 6.82, 2.20)
    s.wall('Bedroom 1 south stub', 6.21, 3.04, 6.28, 3.24)
    s.lintel('Bedroom 1 door lintel', 6.28, 3.04, 7.11, 3.24)
    s.door_leaf('Bedroom 1 open door', 6.28, 2.27, 6.32, 3.04)
    s.wall('Kitchen back wall', 7.11, 3.04, 10.21, 3.24)

    s.wall('Bathroom west wall north', 3.00, 2.00, 3.20, 2.80)
    s.lintel('Bathroom door lintel', 3.00, 2.80, 3.20, 3.60)
    s.wall('Bathroom west wall south', 3.00, 3.60, 3.20, 4.34)
    s.door_leaf('Bathroom open door', 3.23, 2.80, 3.96, 2.84, 'white')
    s.wall('Bathroom east wall', 6.01, 2.00, 6.21, 4.34)
    s.wall('Bathroom south wall', 3.20, 4.14, 6.21, 4.34)

    s.wall('Bedroom 2 north wall west', 1.80, 5.12, 4.87, 5.30)
    s.lintel('Bedroom 2 door lintel', 4.87, 5.12, 5.72, 5.30)
    s.wall('Bedroom 2 north stub', 5.72, 5.12, 6.02, 5.30)
    s.wall('Bedroom 2 east wall', 5.86, 5.30, 6.02, 7.81)
    s.door_leaf('Bedroom 2 open door', 5.68, 5.30, 5.72, 6.08)

    # -- glazing ---------------------------------------------------------
    fixed_glazing(s, 'Living east glazing', 10.21, 5.84, 10.41, 7.01, [5.84, 6.41, 6.97])
    fixed_glazing(s, 'Bedroom 2 south glazing', 2.00, 8.00, 4.87, 8.20, [2.00, 2.94, 3.90, 4.83])
    fixed_glazing(s, 'Living south glazing', 6.00, 8.00, 9.24, 8.20, [6.00, 7.07, 8.14, 9.20])

    # balcony rail
    s.glass_panel('Balcony glass', [(4.10, 9.13), (5.92, 9.39), (5.92, 9.41), (4.10, 9.15)])
    s.glass_panel('Balcony west glass', [(4.03, 8.22), (4.05, 8.22), (4.05, 9.12), (4.03, 9.12)])
    s.band('Balcony handrail', [(4.08, 9.12), (5.94, 9.39)], 0.03, 1.10, 0.025, 'metal', 'rail')
    s.rect('Balcony west handrail', 4.02, 8.20, 4.07, 9.14, 0.025, 'metal', 1.10, 'rail')
    s.band('Balcony fascia', [(4.00, 9.16), (6.00, 9.45)], 0.14, -0.24, 0.24, 'white')
    s.band('Balcony soffit', [(4.00, 9.16), (6.00, 9.45)], 0.14, CEILING, 0.24, 'white')
    s.rect('Balcony divider west', 3.86, 8.20, 4.00, 9.20, CEILING, 'white', group='facade')
    s.wall('Balcony divider east', 6.00, 8.20, 6.14, 9.48)

    # terrace rail (includes north edge 10.41..14.61)
    edge = [(10.41, -0.20), (14.61, -0.20), (14.61, 8.20), (10.41, 9.68), (6.14, 9.15)]
    for a, b in zip(edge, edge[1:]):
        dx, dz = b[0] - a[0], b[1] - a[1]
        length = math.hypot(dx, dz) or 1
        nx, nz = dz / length * 0.025, -dx / length * 0.025
        s.glass_panel('Terrace glass', [(a[0], a[1]), (b[0], b[1]), (b[0] + nx, b[1] + nz), (a[0] + nx, a[1] + nz)])
    s.band('Terrace handrail', edge, -0.04, 1.10, 0.025, 'metal', 'rail')
    s.band('Terrace fascia', edge, 0.15, -0.24, 0.24, 'white')
    s.band('Terrace soffit', edge, 0.15, CEILING, 0.24, 'white')
    s.rect('Terrace facade pier', 14.43, -0.20, 14.61, -0.02, CEILING, 'white', group='facade')

    # -- bedroom 1 (north-east) --------------------------------------------
    s.rect('Bed 1 frame', 7.56, 0.02, 9.34, 1.94, 0.32, 'wood')
    s.rect('Bed 1 headboard', 7.51, 0.02, 9.39, 0.12, 1.05, 'fabric')
    s.rect('Bed 1 mattress', 7.61, 0.12, 9.29, 1.89, 0.24, 'white', 0.32)
    s.rect('Bed 1 duvet', 7.63, 0.52, 9.27, 1.87, 0.08, 'fabric', 0.56)
    s.rect('Bed 1 pillow left', 7.71, 0.16, 8.37, 0.46, 0.13, 'white', 0.56)
    s.rect('Bed 1 pillow right', 8.53, 0.16, 9.19, 0.46, 0.13, 'white', 0.56)
    s.rect('Bed 1 nightstand left', 7.11, 0.02, 7.51, 0.42, 0.48, 'wood')
    s.rect('Bed 1 nightstand right', 9.39, 0.02, 9.79, 0.42, 0.48, 'wood')
    s.oval('Bedroom 1 rug', 8.45, 1.50, 1.35, 0.95, 0.0, 0.018, 'rug')

    # -- bedroom 2 (south-west) ----------------------------------------------
    s.rect('Bed 2 frame', 2.55, 5.32, 4.22, 7.20, 0.32, 'wood')
    s.rect('Bed 2 headboard', 2.50, 5.32, 4.27, 5.42, 1.05, 'fabric')
    s.rect('Bed 2 mattress', 2.60, 5.42, 4.17, 7.15, 0.24, 'white', 0.32)
    s.rect('Bed 2 duvet', 2.62, 5.80, 4.15, 7.13, 0.08, 'fabric', 0.56)
    s.rect('Bed 2 pillow left', 2.70, 5.46, 3.32, 5.74, 0.13, 'white', 0.56)
    s.rect('Bed 2 pillow right', 3.45, 5.46, 4.07, 5.74, 0.13, 'white', 0.56)
    s.rect('Bed 2 nightstand left', 2.05, 5.32, 2.45, 5.72, 0.48, 'wood')
    s.rect('Bed 2 nightstand right', 4.32, 5.32, 4.72, 5.72, 0.48, 'wood')
    s.oval('Bedroom 2 rug', 3.30, 6.70, 1.10, 0.85, 0.0, 0.018, 'rug')

    # -- wardrobe alcove ------------------------------------------------------
    # Both pieces fit entirely left of the entrance and its landing.
    s.rect('Alcove wardrobe', 0.12, 2.83, 1.24, 3.39, 2.40, 'white')
    for x in (0.13, 0.687):
        s.rect('Alcove wardrobe front', x, 2.807, x + 0.543, 2.83, 2.26, 'wood', 0.08)
    s.rect('Alcove bench', 0.65, 2.03, 1.23, 2.41, 0.41, 'wood')
    s.rect('Alcove bench cushion', 0.66, 2.04, 1.22, 2.40, 0.05, 'fabric', 0.41)

    # -- bathroom --------------------------------------------------------------
    s.rect('Vanity', 3.55, 2.00, 4.25, 2.50, 0.75, 'wood')
    s.oval('Washbasin', 3.90, 2.24, 0.22, 0.17, 0.75, 0.12, 'white')
    s.rect('Mirror', 3.55, 2.01, 4.25, 2.03, 0.85, 'glass', 1.15)
    s.rect('WC cistern', 4.28, 3.52, 4.66, 3.70, 0.78, 'white')
    s.oval('WC pedestal', 4.47, 3.34, 0.18, 0.14, 0.0, 0.38, 'white')
    s.oval('WC seat', 4.47, 3.31, 0.22, 0.16, 0.38, 0.055, 'white')
    s.oval('WC opening', 4.47, 3.30, 0.15, 0.10, 0.436, 0.005, 'dark')
    s.rect('Bath apron', 4.94, 2.05, 6.01, 3.54, 0.56, 'white')
    s.rect('Bath shadow', 5.00, 2.11, 5.95, 3.48, 0.012, 'metal', 0.56)
    s.rect('Bath interior', 5.04, 2.15, 5.91, 3.44, 0.016, 'white', 0.572)
    s.rect('Washing machine', 3.24, 3.50, 3.84, 4.10, 0.85, '#dcd8cf')
    s.rect('Washer porthole', 3.39, 3.46, 3.69, 3.50, 0.30, 'dark', 0.30)

    # -- kitchen backing onto bedroom 1 -------------------------------------------
    s.rect('Kitchen cabinet base', 7.59, 3.24, 10.14, 3.84, 0.86, 'wood')
    s.rect('Kitchen countertop', 7.57, 3.24, 10.16, 3.86, 0.045, 'white', 0.86)
    s.rect('Appliance front', 7.64, 3.80, 8.27, 3.84, 0.78, '#dcd8cf', 0.04)
    s.rect('Appliance porthole', 7.81, 3.84, 8.09, 3.88, 0.26, 'dark', 0.30)
    s.rect('Cooktop', 8.66, 3.30, 9.05, 3.80, 0.015, 'dark', 0.905)
    s.oval('Burner 1', 8.85, 3.44, 0.07, 0.07, 0.92, 0.005, 'metal')
    s.oval('Burner 2', 8.85, 3.65, 0.06, 0.06, 0.92, 0.005, 'metal')
    s.rect('Sink rim', 9.37, 3.30, 9.98, 3.80, 0.016, 'metal', 0.905)
    s.rect('Sink bowl', 9.41, 3.35, 9.94, 3.64, 0.019, 'dark', 0.92)
    s.rect('Kitchen tap', 9.65, 3.32, 9.69, 3.36, 0.26, 'metal', 0.92)
    s.rect('Refrigerator', 7.15, 3.24, 7.57, 3.84, 2.05, '#dcd8cf')
    s.rect('Fridge handle', 7.18, 3.84, 7.22, 3.86, 0.60, 'metal', 0.95)

    # -- dining ---------------------------------------------------------------------
    s.rect('Dining table top', 8.74, 4.49, 9.65, 5.48, 0.04, 'wood', 0.74)
    for x in (8.78, 9.57):
        for z in (4.53, 5.40):
            s.rect('Table leg', x, z, x + 0.04, z + 0.04, 0.74, 'dark')
    s.rect('Dining chair north', 9.00, 4.15, 9.40, 4.35, 0.04, 'fabric', 0.44)
    s.rect('Dining chair north back', 9.00, 4.12, 9.40, 4.15, 0.40, 'wood', 0.44)
    s.rect('Dining chair south', 9.00, 5.62, 9.40, 5.82, 0.04, 'fabric', 0.44)
    s.rect('Dining chair south back', 9.00, 5.82, 9.40, 5.85, 0.40, 'wood', 0.44)
    s.rect('Dining chair west', 8.32, 4.79, 8.52, 5.19, 0.04, 'fabric', 0.44)
    s.rect('Dining chair west back', 8.29, 4.79, 8.32, 5.19, 0.40, 'wood', 0.44)
    s.rect('Dining chair east', 9.87, 4.79, 10.07, 5.19, 0.04, 'fabric', 0.44)
    s.rect('Dining chair east back', 10.07, 4.79, 10.10, 5.19, 0.40, 'wood', 0.44)

    # -- living room ---------------------------------------------------------------------
    s.rect('Living rug', 6.16, 5.43, 8.50, 7.80, 0.018, 'rug')
    s.rect('Sofa base', 6.02, 5.63, 6.90, 7.45, 0.30, 'wood')
    s.rect('Sofa back', 6.02, 5.63, 6.16, 7.45, 0.78, 'fabric')
    for z in (5.68, 6.28, 6.88):
        s.rect('Sofa cushion', 6.18, z, 6.86, z + 0.52, 0.18, 'fabric', 0.30)
    s.rect('Sofa north arm', 6.02, 5.51, 6.90, 5.63, 0.62, 'fabric')
    s.rect('Sofa south arm', 6.02, 7.45, 6.90, 7.57, 0.62, 'fabric')
    s.rect('Coffee table top', 7.12, 6.00, 7.81, 7.27, 0.05, 'wood', 0.36)
    for z in (6.05, 7.17):
        s.rect('Coffee table leg', 7.16, z, 7.21, z + 0.05, 0.36, 'dark')
        s.rect('Coffee table leg', 7.72, z, 7.77, z + 0.05, 0.36, 'dark')
    s.rect('Media console', 7.90, 7.55, 9.60, 7.95, 0.45, 'wood')
    s.rect('TV panel', 8.30, 7.91, 9.20, 7.95, 0.62, 'dark', 0.55)
    for x in (8.43, 9.03):
        s.rect('TV stand', x, 7.76, x + 0.04, 7.95, 0.10, 'dark', 0.45)

    # -- terrace set ---------------------------------------------------------------------------
    s.oval('Terrace table top', 12.40, 3.40, 0.80, 0.80, 0.71, 0.05, 'wood')
    s.rect('Terrace table stem', 12.30, 3.30, 12.50, 3.50, 0.71, 'dark')
    s.oval('Terrace table foot', 12.40, 3.40, 0.40, 0.40, 0.0, 0.05, 'dark')
    for angle in range(6):
        a = angle * math.tau / 6 + 0.3
        cx, cz = 12.40 + 1.25 * math.cos(a), 3.40 + 1.25 * math.sin(a)
        s.oval('Terrace chair', cx, cz, 0.24, 0.24, 0.44, 0.05, 'fabric')
        s.oval('Terrace chair base', cx, cz, 0.07, 0.07, 0.0, 0.44, 'dark')
    s.rect('Terrace lounger', 11.90, 6.40, 12.70, 8.40, 0.36, 'fabric')
    s.rect('Terrace planter', 13.90, 1.20, 14.40, 1.70, 0.55, 'tile')
    s.rect('Terrace planter', 13.90, 6.00, 14.40, 6.50, 0.55, 'tile')

    return s
