"""Residence 113.7 m² (plan N604, 2+1) — 65.2 m² interior, 43.7 m² terrace, 4.8 m² balcony.

Interior outline from the VI floor plan: 0.00..8.41 x 0.00..8.00 with the corridor
biting a 1.00 x 2.00 notch out of the north-west corner. The terrace wraps the whole
east side and returns along the south; the small balcony belongs to the west bedroom.
"""
from lib import Scene, CEILING

UNIT = dict(
    slug='113-7',
    title='Квартира 113,7 м²',
    eyebrow='AURUM FORT / РЕЗИДЕНЦИЯ 113,7',
    summary='65,2 м² интерьер · терраса 43,7 м² · балкон 4,8 м²<br>Объёмная реконструкция · метры',
    notes=('<p>Контур снят с поэтажного плана VI этажа (резиденция №604). Внутренняя площадь 65,2 м², '
           'терраса 43,7 м², балкон 4,8 м², общая 113,7 м².</p>'
           '<p>Высота потолков 2,80 м, дверей 2,20 м. Несущие колонны 40×40 см, внешние стены 20 см.</p>'
           '<p>Две изолированные спальни, санузел с душевой между ними, кухонный фронт спиной к северной '
           'спальне. Терраса 43,7 м² идёт вдоль всей восточной стены и заворачивает на юг — выходы '
           'из гостиной с двух сторон.</p>'),
)

FOOTPRINT = [
    (1.00, 0.00, 8.41, 2.00),
    (0.00, 2.00, 8.41, 8.00),
    (0.00, 8.00, 4.08, 9.30),     # balcony
    (4.21, 8.00, 12.62, 9.70),    # terrace south arm
    (8.41, -0.20, 12.62, 9.30),   # terrace east arm
]


def build():
    s = Scene()

    # -- floors ----------------------------------------------------------
    s.rect('Entrance hall floor', 1.00, 0.00, 4.20, 1.80, 0.16, 'floor', -0.16, 'floor')
    s.rect('Bedroom 1 floor', 4.40, 0.00, 8.41, 3.02, 0.16, 'floor', -0.16, 'floor')
    s.rect('Bathroom tile floor', 0.00, 2.00, 2.84, 4.02, 0.16, 'tile', -0.16, 'floor')
    s.rect('Bedroom 2 floor', 0.00, 4.22, 2.84, 8.00, 0.16, 'floor', -0.16, 'floor')
    s.rect('Hall floor', 2.84, 1.80, 4.40, 3.22, 0.16, 'floor', -0.16, 'floor')
    s.rect('Living room floor', 3.04, 3.22, 8.41, 8.00, 0.16, 'floor', -0.16, 'floor')
    s.slab('Balcony slab', [(0.00, 8.20), (4.03, 8.20), (4.03, 9.30), (0.00, 9.14)], -0.20, 0.18, 'tile')
    # L-shaped terrace, split so each cap stays convex
    s.slab('Terrace slab east', [(8.61, -0.20), (12.62, -0.20), (12.62, 9.11), (8.61, 9.55)], -0.20, 0.18, 'tile')
    s.slab('Terrace slab south', [(4.21, 8.20), (8.61, 8.20), (8.61, 9.55), (4.21, 9.11)], -0.20, 0.18, 'tile')

    # -- structure -------------------------------------------------------
    for name, x, z in [('NW', -0.40, -0.20), ('N-Mid', 4.01, -0.20), ('NE', 8.21, -0.20),
                       ('W-Mid', -0.40, 1.80), ('Mid', 4.01, 1.80), ('E-Mid', 8.21, 1.80),
                       ('SW', -0.40, 7.81), ('S-Mid', 4.01, 7.81), ('SE', 8.21, 7.81)]:
        s.column(f'{name} Column', x, z, x + 0.40, z + 0.40)

    s.wall('North exterior west', 1.00, -0.20, 4.01, 0.00)
    s.wall('North exterior east', 4.41, -0.20, 8.21, 0.00)
    s.wall('Corridor notch wall', 0.80, 0.00, 1.00, 0.30)
    s.lintel('Entrance lintel', 0.80, 0.30, 1.00, 1.15)
    s.wall('Corridor notch wall south', 0.80, 1.15, 1.00, 1.80)
    s.wall('Notch return wall', 0.00, 1.80, 1.00, 2.00)
    s.door_leaf('Entrance open door', 1.00, 0.32, 1.04, 1.13)

    s.wall('West exterior north', -0.20, 2.00, 0.00, 7.81)
    s.wall('East exterior north', 8.41, 0.00, 8.61, 3.90)
    s.lintel('Terrace east door lintel', 8.41, 3.90, 8.61, 4.70)
    s.wall('East exterior south', 8.41, 4.70, 8.61, 7.81)
    s.door_leaf('Terrace east open door', 8.37, 3.92, 8.41, 4.68, 'metal')

    s.wall('South exterior west', 0.00, 8.00, 0.80, 8.20)
    s.lintel('Balcony door lintel', 0.80, 8.00, 1.70, 8.20)
    s.wall('South exterior mid', 1.70, 8.00, 4.60, 8.20)
    s.lintel('Terrace south door lintel', 4.60, 8.00, 5.50, 8.20)
    s.wall('South exterior east', 5.50, 8.00, 8.41, 8.20)
    s.door_leaf('Balcony open door', 0.82, 7.96, 1.68, 8.00, 'metal')
    s.door_leaf('Terrace south open door', 4.62, 7.96, 5.48, 8.00, 'metal')

    # interior partitions
    s.wall('Hall south wall', 1.00, 1.80, 2.84, 2.00)
    s.wall('Bathroom east wall north', 2.84, 2.00, 3.04, 2.40)
    s.lintel('Bathroom door lintel', 2.84, 2.40, 3.04, 3.20)
    s.wall('Bathroom east wall south', 2.84, 3.20, 3.04, 6.90)
    s.lintel('Bedroom 2 door lintel', 2.84, 6.90, 3.04, 7.70)
    s.wall('Bedroom 2 east stub', 2.84, 7.70, 3.04, 8.00)
    s.door_leaf('Bathroom open door', 2.80, 2.42, 2.84, 3.18, 'white')
    s.door_leaf('Bedroom 2 open door', 2.04, 6.92, 2.08, 7.68)
    s.wall('Bathroom south wall', 0.00, 4.02, 3.04, 4.22)

    s.wall('Bedroom 1 west wall north', 4.20, 0.00, 4.40, 2.10)
    s.lintel('Bedroom 1 door lintel', 4.20, 2.10, 4.40, 2.90)
    s.wall('Bedroom 1 west stub', 4.20, 2.90, 4.40, 3.22)
    s.door_leaf('Bedroom 1 open door', 4.42, 2.12, 4.46, 2.88)
    s.wall('Kitchen back wall', 4.40, 3.02, 8.41, 3.22)

    # -- glazing ---------------------------------------------------------
    s.glazing('Bedroom 1 east window', 8.46, 0.30, 8.56, 2.60, mullions=[0.30, 1.10, 1.90, 2.56])
    s.glazing('Living east glazing', 8.46, 4.90, 8.56, 7.70, mullions=[4.90, 5.80, 6.70, 7.66])
    s.glazing('Living south glazing', 5.60, 8.05, 8.30, 8.15, mullions=[5.60, 6.50, 7.40, 8.26])

    # balcony rail
    s.glass_panel('Balcony glass', [(0.10, 9.14), (3.95, 9.28), (3.95, 9.30), (0.10, 9.16)])
    s.glass_panel('Balcony side glass', [(0.04, 8.30), (0.06, 8.30), (0.06, 9.14), (0.04, 9.14)])
    s.band('Balcony handrail', [(0.08, 9.13), (3.97, 9.27)], 0.03, 1.10, 0.025, 'metal', 'rail')
    s.band('Balcony fascia', [(0.02, 9.18), (4.03, 9.32)], 0.14, -0.24, 0.24, 'white')
    s.band('Balcony soffit', [(0.02, 9.18), (4.03, 9.32)], 0.14, CEILING, 0.24, 'white')
    s.rect('Balcony divider', 4.03, 8.20, 4.17, 9.34, CEILING, 'white', group='facade')

    # terrace rail follows the faceted outer edge
    edge = [(12.62, -0.20), (12.62, 9.11), (8.41, 9.60), (4.21, 9.11)]
    for a, b in zip(edge, edge[1:]):
        s.glass_panel('Terrace glass', [(a[0], a[1]), (b[0], b[1]), (b[0] - 0.03, b[1] - 0.03), (a[0] - 0.03, a[1] - 0.03)])
    s.band('Terrace handrail', edge, -0.04, 1.10, 0.025, 'metal', 'rail')
    s.band('Terrace fascia', edge, 0.15, -0.24, 0.24, 'white')
    s.band('Terrace soffit', edge, 0.15, CEILING, 0.24, 'white')
    s.rect('Terrace facade pier', 12.44, -0.20, 12.62, -0.02, CEILING, 'white', group='facade')

    # -- bedroom 1 (north-east) --------------------------------------------
    s.rect('Bed 1 frame', 5.83, 0.02, 7.57, 1.97, 0.32, 'wood')
    s.rect('Bed 1 headboard', 5.78, 0.02, 7.62, 0.12, 1.05, 'fabric')
    s.rect('Bed 1 mattress', 5.88, 0.12, 7.52, 1.92, 0.24, 'white', 0.32)
    s.rect('Bed 1 duvet', 5.90, 0.52, 7.50, 1.90, 0.08, 'fabric', 0.56)
    s.rect('Bed 1 pillow left', 5.98, 0.16, 6.62, 0.46, 0.13, 'white', 0.56)
    s.rect('Bed 1 pillow right', 6.78, 0.16, 7.42, 0.46, 0.13, 'white', 0.56)
    s.rect('Bed 1 nightstand left', 5.43, 0.02, 5.83, 0.42, 0.48, 'wood')
    s.rect('Bed 1 nightstand right', 7.57, 0.02, 7.97, 0.42, 0.48, 'wood')
    s.rect('Wardrobe 1', 4.44, 0.20, 5.04, 1.90, 2.40, 'white')
    s.rect('Wardrobe 1 seam', 4.46, 1.04, 5.04, 1.06, 2.38, 'dark', 0.01)
    s.oval('Bedroom 1 rug', 6.70, 1.60, 1.35, 0.95, 0.0, 0.018, 'rug')

    # -- bedroom 2 (west) ----------------------------------------------------
    s.rect('Bed 2 frame', 0.06, 5.13, 2.07, 6.87, 0.32, 'wood')
    s.rect('Bed 2 headboard', 0.06, 5.08, 0.18, 6.92, 1.05, 'fabric')
    s.rect('Bed 2 mattress', 0.18, 5.18, 2.02, 6.82, 0.24, 'white', 0.32)
    s.rect('Bed 2 duvet', 0.60, 5.20, 2.00, 6.80, 0.08, 'fabric', 0.56)
    s.rect('Bed 2 pillow north', 0.26, 5.26, 0.58, 5.92, 0.13, 'white', 0.56)
    s.rect('Bed 2 pillow south', 0.26, 6.06, 0.58, 6.72, 0.13, 'white', 0.56)
    s.rect('Bed 2 nightstand north', 0.06, 4.65, 0.46, 5.05, 0.48, 'wood')
    s.rect('Bed 2 nightstand south', 0.06, 6.95, 0.46, 7.35, 0.48, 'wood')
    s.rect('Wardrobe 2', 2.24, 4.30, 2.84, 5.90, 2.40, 'white')
    s.rect('Wardrobe 2 seam', 2.26, 5.09, 2.84, 5.11, 2.38, 'dark', 0.01)

    # -- entrance hall --------------------------------------------------------
    s.rect('Hall wardrobe', 1.10, 0.05, 2.30, 0.65, 2.40, 'white')
    s.rect('Hall bench', 2.60, 0.10, 3.60, 0.55, 0.45, 'wood')
    s.rect('Hall mirror', 3.90, 0.30, 3.92, 1.40, 1.30, 'glass', 0.90)

    # -- bathroom --------------------------------------------------------------
    s.rect('Vanity', 0.00, 2.40, 0.56, 3.05, 0.75, 'wood')
    s.oval('Washbasin', 0.28, 2.72, 0.17, 0.22, 0.75, 0.12, 'white')
    s.rect('Mirror', 0.01, 2.40, 0.03, 3.05, 0.85, 'glass', 1.15)
    s.rect('WC cistern', 0.00, 3.45, 0.18, 3.85, 0.78, 'white')
    s.oval('WC pedestal', 0.40, 3.65, 0.18, 0.14, 0.0, 0.38, 'white')
    s.oval('WC seat', 0.43, 3.65, 0.22, 0.16, 0.38, 0.055, 'white')
    s.oval('WC opening', 0.44, 3.65, 0.15, 0.10, 0.436, 0.005, 'dark')
    s.rect('Shower tray', 1.45, 3.05, 2.40, 4.00, 0.06, 'white')
    s.rect('Shower screen side', 1.41, 3.05, 1.45, 4.00, 1.95, 'glass', 0.06, 'glazing')
    s.rect('Shower screen front', 1.45, 3.01, 2.40, 3.05, 1.95, 'glass', 0.06, 'glazing')
    s.rect('Shower mixer', 2.36, 3.45, 2.40, 3.65, 0.30, 'metal', 1.05)
    s.rect('Washing machine', 2.20, 2.10, 2.80, 2.70, 0.85, '#dcd8cf')
    s.rect('Washer porthole', 2.35, 2.70, 2.65, 2.74, 0.30, 'dark', 0.30)

    # -- kitchen backing onto bedroom 1 -------------------------------------------
    s.rect('Kitchen cabinet base', 4.60, 3.22, 8.05, 3.82, 0.86, 'wood')
    s.rect('Kitchen countertop', 4.58, 3.22, 8.07, 3.84, 0.045, 'white', 0.86)
    s.rect('Appliance front', 5.13, 3.78, 5.76, 3.82, 0.78, '#dcd8cf', 0.04)
    s.rect('Appliance porthole', 5.30, 3.82, 5.58, 3.86, 0.26, 'dark', 0.30)
    s.rect('Cooktop', 5.97, 3.28, 6.66, 3.78, 0.015, 'dark', 0.905)
    for bx, bz, r in [(6.14, 3.42, 0.07), (6.14, 3.63, 0.06), (6.46, 3.42, 0.07), (6.46, 3.63, 0.06)]:
        s.oval('Burner', bx, bz, r, r, 0.92, 0.005, 'metal')
    s.rect('Sink rim', 6.95, 3.28, 7.75, 3.78, 0.016, 'metal', 0.905)
    s.rect('Sink bowl 1', 6.99, 3.33, 7.35, 3.62, 0.019, 'dark', 0.92)
    s.rect('Sink bowl 2', 7.39, 3.33, 7.71, 3.62, 0.019, 'dark', 0.92)
    s.rect('Kitchen tap', 7.33, 3.30, 7.37, 3.34, 0.26, 'metal', 0.92)
    s.rect('Refrigerator', 7.76, 3.22, 8.41, 3.95, 2.05, '#dcd8cf')
    s.rect('Fridge handle', 7.74, 3.30, 7.76, 3.34, 0.60, 'metal', 0.95)

    # -- dining --------------------------------------------------------------------
    s.rect('Dining table top', 3.57, 5.27, 4.55, 6.38, 0.04, 'wood', 0.74)
    for x in (3.61, 4.47):
        for z in (5.31, 6.30):
            s.rect('Table leg', x, z, x + 0.04, z + 0.04, 0.74, 'dark')
    s.rect('Dining chair north', 3.76, 4.93, 4.16, 5.13, 0.04, 'fabric', 0.44)
    s.rect('Dining chair north back', 3.76, 4.90, 4.16, 4.93, 0.40, 'wood', 0.44)
    s.rect('Dining chair south', 3.76, 6.52, 4.16, 6.72, 0.04, 'fabric', 0.44)
    s.rect('Dining chair south back', 3.76, 6.72, 4.16, 6.75, 0.40, 'wood', 0.44)
    s.rect('Dining chair west', 3.19, 5.63, 3.39, 6.03, 0.04, 'fabric', 0.44)
    s.rect('Dining chair west back', 3.16, 5.63, 3.19, 6.03, 0.40, 'wood', 0.44)
    s.rect('Dining chair east', 4.73, 5.63, 4.93, 6.03, 0.04, 'fabric', 0.44)
    s.rect('Dining chair east back', 4.93, 5.63, 4.96, 6.03, 0.40, 'wood', 0.44)

    # -- living room -------------------------------------------------------------------
    s.rect('Living rug', 5.90, 4.70, 8.30, 7.30, 0.018, 'rug')
    s.rect('Sofa base', 7.43, 4.89, 8.34, 6.87, 0.30, 'wood')
    s.rect('Sofa back', 8.20, 4.89, 8.34, 6.87, 0.78, 'fabric')
    for z in (5.00, 5.66, 6.32):
        s.rect('Sofa cushion', 7.48, z, 8.16, z + 0.58, 0.18, 'fabric', 0.30)
    s.rect('Sofa north arm', 7.43, 4.77, 8.34, 4.89, 0.62, 'fabric')
    s.rect('Sofa south arm', 7.43, 6.87, 8.34, 6.99, 0.62, 'fabric')
    s.rect('Coffee table top', 6.57, 5.35, 7.16, 6.41, 0.05, 'wood', 0.36)
    for z in (5.40, 6.31):
        s.rect('Coffee table leg', 6.61, z, 6.66, z + 0.05, 0.36, 'dark')
        s.rect('Coffee table leg', 7.07, z, 7.12, z + 0.05, 0.36, 'dark')
    s.rect('Armchair base', 6.43, 6.97, 7.23, 7.73, 0.30, 'wood')
    s.rect('Armchair seat', 6.49, 7.03, 7.17, 7.67, 0.16, 'fabric', 0.30)
    s.rect('Armchair back', 6.43, 7.61, 7.23, 7.73, 0.72, 'fabric')

    # -- terrace set ----------------------------------------------------------------------
    s.rect('Terrace table top', 9.60, 2.60, 11.00, 4.40, 0.05, 'wood', 0.73)
    for x in (9.66, 10.89):
        for z in (2.66, 4.29):
            s.rect('Terrace table leg', x, z, x + 0.05, z + 0.05, 0.73, 'dark')
    for z in (2.85, 3.45, 4.05):
        s.rect('Terrace chair west', 9.12, z, 9.52, z + 0.40, 0.04, 'fabric', 0.44)
        s.rect('Terrace chair west back', 9.09, z, 9.12, z + 0.40, 0.42, 'wood', 0.44)
        s.rect('Terrace chair east', 11.08, z, 11.48, z + 0.40, 0.04, 'fabric', 0.44)
        s.rect('Terrace chair east back', 11.48, z, 11.51, z + 0.40, 0.42, 'wood', 0.44)

    return s
