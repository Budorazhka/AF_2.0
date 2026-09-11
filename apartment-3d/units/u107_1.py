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


def build():
    s = Scene()

    # -- floors ----------------------------------------------------------
    s.rect('Bedroom 1 floor', 6.82, 0.00, 10.21, 3.04, 0.16, 'floor', -0.16, 'floor')
    s.rect('Bathroom tile floor', 3.20, 2.00, 6.01, 4.14, 0.16, 'tile', -0.16, 'floor')
    s.rect('Hall floor', 1.80, 2.00, 3.20, 5.60, 0.16, 'floor', -0.16, 'floor')
    s.slab('Wardrobe alcove floor', [(0.00, 2.59), (0.58, 2.00), (1.80, 2.00), (1.80, 3.40), (0.00, 3.40)],
           -0.16, 0.16, 'floor')
    s.rect('Bedroom 2 floor', 1.80, 5.60, 5.06, 8.00, 0.16, 'floor', -0.16, 'floor')
    s.rect('Circulation floor', 6.01, 2.00, 6.82, 3.04, 0.16, 'floor', -0.16, 'floor')
    s.rect('Living floor north', 6.01, 3.04, 10.21, 4.34, 0.16, 'floor', -0.16, 'floor')
    s.rect('Living floor mid', 3.20, 4.34, 10.21, 5.60, 0.16, 'floor', -0.16, 'floor')
    s.rect('Living floor south', 5.26, 5.60, 10.21, 8.00, 0.16, 'floor', -0.16, 'floor')
    s.slab('Balcony slab', [(4.00, 8.20), (6.00, 8.20), (6.00, 9.40), (4.00, 9.11)], -0.20, 0.18, 'tile')
    # L-shaped terrace, split so each cap stays convex
    s.slab('Terrace slab east', [(10.41, -0.20), (14.61, -0.20), (14.61, 8.20), (10.41, 9.68)], -0.20, 0.18, 'tile')
    s.slab('Terrace slab south', [(6.00, 8.20), (10.41, 8.20), (10.41, 9.68), (6.00, 9.11)], -0.20, 0.18, 'tile')

    # -- structure -------------------------------------------------------
    for name, x, z in [('N-West', 6.62, -0.20), ('NE', 10.21, -0.20), ('Mid-West', 1.60, 1.80),
                       ('Mid', 6.62, 1.80), ('Mid-East', 10.21, 1.80), ('SW', 1.60, 7.81),
                       ('S-Mid', 6.00, 7.81), ('SE', 10.21, 7.81)]:
        s.column(f'{name} Column', x, z, x + 0.40, z + 0.40)

    s.wall('North exterior bedroom', 6.82, -0.20, 10.21, 0.00)
    s.wall('North wall west', 0.58, 1.80, 1.34, 2.00)
    s.lintel('Entrance lintel', 1.34, 1.80, 2.24, 2.00)
    s.wall('North wall mid', 2.24, 1.80, 6.62, 2.00)
    s.door_leaf('Entrance open door', 1.36, 2.00, 1.40, 2.86)

    s.slab('Chamfer wall', [(0.00, 2.59), (0.58, 2.00), (0.58, 1.80), (-0.20, 2.72)], 0.0, CEILING, 'wall', 'walls')
    s.wall('West alcove wall', -0.20, 2.72, 0.00, 3.40)
    s.wall('Alcove south wall', 0.00, 3.40, 1.80, 3.60)
    s.wall('West party wall', 1.60, 3.60, 1.80, 7.81)

    s.wall('East exterior north', 10.21, 0.20, 10.41, 1.80)
    s.wall('East exterior mid', 10.21, 2.20, 10.41, 4.60)
    s.lintel('Terrace east door lintel', 10.21, 4.60, 10.41, 5.45)
    s.wall('East exterior south', 10.21, 5.45, 10.41, 7.81)
    s.door_leaf('Terrace east open door', 10.17, 4.62, 10.21, 5.43, 'metal')

    s.wall('South exterior west', 1.80, 8.00, 4.20, 8.20)
    s.lintel('Balcony door lintel', 4.20, 8.00, 5.00, 8.20)
    s.wall('South exterior mid', 5.00, 8.00, 9.29, 8.20)
    s.lintel('Terrace south door lintel', 9.29, 8.00, 10.17, 8.20)
    s.wall('South exterior east', 10.17, 8.00, 10.41, 8.20)
    s.door_leaf('Balcony open door', 4.22, 7.96, 4.98, 8.00, 'metal')
    s.door_leaf('Terrace south open door', 9.31, 7.96, 10.15, 8.00, 'metal')

    # interior partitions
    s.wall('Bedroom 1 west wall north', 6.62, 0.00, 6.82, 2.20)
    s.lintel('Bedroom 1 door lintel', 6.62, 2.20, 6.82, 3.00)
    s.wall('Bedroom 1 west stub', 6.62, 3.00, 6.82, 3.24)
    s.door_leaf('Bedroom 1 open door', 6.84, 2.22, 6.88, 2.98)
    s.wall('Kitchen back wall', 6.82, 3.04, 10.21, 3.24)

    s.wall('Bathroom west wall north', 3.00, 2.00, 3.20, 2.80)
    s.lintel('Bathroom door lintel', 3.00, 2.80, 3.20, 3.60)
    s.wall('Bathroom west wall south', 3.00, 3.60, 3.20, 4.34)
    s.door_leaf('Bathroom open door', 3.22, 2.82, 3.26, 3.58, 'white')
    s.wall('Bathroom east wall', 6.01, 2.00, 6.21, 4.34)
    s.wall('Bathroom south wall', 3.20, 4.14, 6.21, 4.34)

    s.wall('Bedroom 2 north wall west', 1.80, 5.40, 4.20, 5.60)
    s.lintel('Bedroom 2 door lintel', 4.20, 5.40, 5.00, 5.60)
    s.wall('Bedroom 2 north stub', 5.00, 5.40, 5.26, 5.60)
    s.wall('Bedroom 2 east wall', 5.06, 5.60, 5.26, 8.00)
    s.door_leaf('Bedroom 2 open door', 4.22, 5.62, 4.98, 5.66)

    # -- glazing ---------------------------------------------------------
    s.glazing('Bedroom 1 east window', 10.26, 0.30, 10.36, 1.80, mullions=[0.30, 1.05, 1.76])
    s.glazing('Living east glazing', 10.26, 5.60, 10.36, 7.70, mullions=[5.60, 6.30, 7.00, 7.66])
    s.glazing('Living south glazing', 5.20, 8.05, 9.20, 8.15, mullions=[5.20, 6.50, 7.80, 9.16])

    # balcony rail
    s.glass_panel('Balcony glass', [(4.10, 9.13), (5.92, 9.39), (5.92, 9.41), (4.10, 9.15)])
    s.band('Balcony handrail', [(4.08, 9.12), (5.94, 9.39)], 0.03, 1.10, 0.025, 'metal', 'rail')
    s.band('Balcony fascia', [(4.00, 9.16), (6.00, 9.45)], 0.14, -0.24, 0.24, 'white')
    s.band('Balcony soffit', [(4.00, 9.16), (6.00, 9.45)], 0.14, CEILING, 0.24, 'white')
    s.rect('Balcony divider west', 3.86, 8.20, 4.00, 9.20, CEILING, 'white', group='facade')
    s.rect('Balcony divider east', 6.00, 8.20, 6.14, 9.48, CEILING, 'white', group='facade')

    # terrace rail
    edge = [(14.61, -0.20), (14.61, 8.20), (10.41, 9.68), (6.14, 9.15)]
    for a, b in zip(edge, edge[1:]):
        s.glass_panel('Terrace glass', [(a[0], a[1]), (b[0], b[1]), (b[0] - 0.03, b[1] - 0.03), (a[0] - 0.03, a[1] - 0.03)])
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
    s.rect('Wardrobe 1', 6.86, 2.30, 7.46, 3.00, 2.40, 'white')
    s.oval('Bedroom 1 rug', 8.45, 1.50, 1.35, 0.95, 0.0, 0.018, 'rug')

    # -- bedroom 2 (south-west) ----------------------------------------------
    s.rect('Bed 2 frame', 2.55, 5.62, 4.22, 7.50, 0.32, 'wood')
    s.rect('Bed 2 headboard', 2.50, 5.62, 4.27, 5.72, 1.05, 'fabric')
    s.rect('Bed 2 mattress', 2.60, 5.72, 4.17, 7.45, 0.24, 'white', 0.32)
    s.rect('Bed 2 duvet', 2.62, 6.10, 4.15, 7.43, 0.08, 'fabric', 0.56)
    s.rect('Bed 2 pillow left', 2.70, 5.76, 3.32, 6.04, 0.13, 'white', 0.56)
    s.rect('Bed 2 pillow right', 3.45, 5.76, 4.07, 6.04, 0.13, 'white', 0.56)
    s.rect('Bed 2 nightstand left', 2.05, 5.62, 2.45, 6.02, 0.48, 'wood')
    s.rect('Bed 2 nightstand right', 4.32, 5.62, 4.72, 6.02, 0.48, 'wood')
    s.rect('Wardrobe 2', 4.46, 6.40, 5.06, 7.90, 2.40, 'white')
    s.rect('Wardrobe 2 seam', 4.46, 7.14, 5.04, 7.16, 2.38, 'dark', 0.01)
    s.oval('Bedroom 2 rug', 3.30, 7.00, 1.10, 0.85, 0.0, 0.018, 'rug')

    # -- wardrobe alcove ------------------------------------------------------
    s.rect('Alcove wardrobe', 0.62, 2.05, 1.56, 2.65, 2.40, 'white')
    s.rect('Alcove rail', 0.68, 2.33, 1.50, 2.37, 0.04, 'metal', 1.75)
    for x in (0.74, 1.00, 1.26):
        s.rect('Hanging clothes', x, 2.19, x + 0.20, 2.53, 0.95, 'fabric', 0.72)
    s.rect('Alcove bench', 0.20, 2.95, 1.60, 3.35, 0.45, 'wood')

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
    s.rect('Refrigerator', 6.86, 3.24, 7.51, 3.97, 2.05, '#dcd8cf')
    s.rect('Fridge handle', 7.51, 3.32, 7.53, 3.36, 0.60, 'metal', 0.95)

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
    s.rect('Living rug', 5.60, 5.40, 8.30, 7.80, 0.018, 'rug')
    s.rect('Sofa base', 5.26, 5.60, 5.96, 7.80, 0.30, 'wood')
    s.rect('Sofa back', 5.26, 5.60, 5.40, 7.80, 0.78, 'fabric')
    for z in (5.72, 6.44, 7.16):
        s.rect('Sofa cushion', 5.42, z, 5.92, z + 0.62, 0.18, 'fabric', 0.30)
    s.rect('Sofa north arm', 5.26, 5.48, 5.96, 5.60, 0.62, 'fabric')
    s.rect('Sofa south arm', 5.26, 7.80, 5.96, 7.92, 0.62, 'fabric')
    s.rect('Coffee table top', 6.55, 6.00, 7.24, 7.27, 0.05, 'wood', 0.36)
    for z in (6.05, 7.17):
        s.rect('Coffee table leg', 6.59, z, 6.64, z + 0.05, 0.36, 'dark')
        s.rect('Coffee table leg', 7.15, z, 7.20, z + 0.05, 0.36, 'dark')
    s.rect('Media console', 7.90, 7.55, 9.60, 7.95, 0.45, 'wood')
    s.rect('TV panel', 8.30, 7.91, 9.20, 7.95, 0.62, 'dark', 0.55)

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
