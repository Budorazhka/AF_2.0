"""Residence 66.0 m² (plan N404) — 51.7 m² interior, 9.5 m² terrace, 4.8 m² balcony.

Interior outline from the IV floor plan: a north band 0.20..8.21 x 0..1.80,
an east band 4.20..8.21 x 1.80..5.00 and a full-width south band 0..8.21 x 5.00..8.00.
"""
from lib import Scene, CEILING

UNIT = dict(
    slug='66',
    title='Квартира 66,0 м²',
    eyebrow='AURUM FORT / РЕЗИДЕНЦИЯ 66',
    summary='51,7 м² интерьер · терраса 9,5 м² · балкон 4,8 м²<br>Объёмная реконструкция · метры',
    notes=('<p>Контур и размещение мебели перенесены с поэтажного плана (резиденции №204, 304, 404, 504). '
           'Внутренняя площадь: 51,7 м², терраса: 9,5 м², балкон: 4,8 м², общая: 66,0 м².</p>'
           '<p>Высота потолков 2,80 м, дверей 2,20 м. Несущие колонны 40×40 см (оси 8, 9, 10), внешние стены 20 см.</p>'
           '<p>Остекление террасы и балкона тонированное синее с металлической планкой и белым граненым '
           'оригами-обрамлением фасада Aurum Fort.</p>'),
)

FOOTPRINT = [
    (0.00, 0.00, 8.20, 2.00),
    (4.20, 2.00, 8.20, 5.00),
    (0.00, 4.85, 8.20, 8.00),
    (0.00, 8.00, 9.90, 9.90),   # balcony + terrace
]


def build():
    s = Scene()

    # -- floors ----------------------------------------------------------
    s.rect('Corridor floor', 0.00, 0.00, 4.20, 2.00, 0.16, 'floor', -0.16, 'floor')
    s.rect('North kitchen hall floor', 4.20, 0.00, 8.20, 2.00, 0.16, 'floor', -0.16, 'floor')
    s.rect('Kitchen & walkway floor', 5.75, 2.00, 8.20, 5.00, 0.16, 'floor', -0.16, 'floor')
    s.rect('Living room floor', 4.20, 5.00, 8.20, 8.00, 0.16, 'floor', -0.16, 'floor')
    s.rect('Bathroom tile floor', 4.20, 2.00, 5.75, 5.00, 0.16, 'tile', -0.16, 'floor')
    s.rect('Bedroom floor', 0.00, 4.80, 4.20, 8.00, 0.16, 'floor', -0.16, 'floor')

    s.slab('Bedroom balcony slab', [(0.00, 8.00), (4.20, 8.00), (4.20, 9.20), (0.00, 9.10)], -0.20, 0.18, 'tile')
    s.slab('Living terrace slab',
           [(4.20, 8.00), (8.20, 8.00), (9.80, 8.20), (9.90, 9.35), (7.20, 9.85), (4.20, 9.75)], -0.20, 0.18, 'tile')

    # -- structure -------------------------------------------------------
    for name, x, z in [('NW', -0.20, -0.20), ('N-Mid', 4.00, -0.20), ('NE', 8.00, -0.20),
                       ('Mid-West', -0.20, 1.80), ('Center', 4.00, 1.80), ('Mid-East', 8.00, 1.80),
                       ('Bedroom-NW', -0.20, 4.60), ('SW', -0.20, 7.80), ('S-Mid', 4.00, 7.80), ('SE', 8.00, 7.80)]:
        s.column(f'{name} Column', x, z, x + 0.40, z + 0.40)

    s.wall('North exterior corridor', 0.20, -0.20, 4.00, 0.00)
    s.wall('North exterior kitchen', 4.40, -0.20, 8.00, 0.00)
    s.wall('West corridor stub', -0.20, 1.10, 0.00, 1.80)
    s.lintel('Entrance lintel', -0.20, 0.20, 0.00, 1.10)
    s.door_leaf('Entrance open door', 0.00, 0.25, 0.04, 1.05)
    s.wall('Corridor core wall', 0.20, 1.80, 4.00, 2.00)
    s.wall('East exterior north', 8.20, 0.20, 8.40, 1.80)
    s.wall('East exterior mid', 8.20, 2.20, 8.40, 7.80)

    # bathroom
    s.wall('Bathroom north stub west', 4.40, 1.80, 4.55, 2.00)
    s.lintel('Bathroom door lintel', 4.55, 1.80, 5.45, 2.00)
    s.wall('Bathroom north stub east', 5.45, 1.80, 5.75, 2.00)
    s.door_leaf('Bathroom open door', 5.56, 2.02, 5.60, 2.85, 'white')
    s.wall('Bathroom east wall', 5.60, 1.80, 5.75, 5.00)
    s.wall('Bathroom south wall', 4.20, 4.85, 5.75, 5.00)
    s.wall('Bathroom west wall', 4.05, 2.20, 4.20, 4.85)

    # bedroom
    s.wall('Bedroom north wall', 0.20, 4.65, 4.05, 4.85)
    s.wall('West exterior bedroom', -0.20, 5.00, 0.00, 7.80)
    s.wall('Bedroom divider wall', 4.05, 4.85, 4.20, 7.05)
    s.lintel('Bedroom door lintel', 4.05, 7.05, 4.20, 7.85)
    s.door_leaf('Bedroom open door', 3.35, 7.80, 4.05, 7.84)
    s.wall('Balcony divider wall', 4.10, 8.20, 4.30, 9.25)

    # -- glazing ---------------------------------------------------------
    s.glazing('Bedroom glazing', 0.20, 7.95, 4.00, 8.05, mullions=[0.20, 1.30, 2.65, 4.00])
    s.rect('Bedroom balcony open door', 1.30, 7.25, 1.34, 7.95, 2.20, 'metal', group='glazing')
    s.glazing('Living glazing', 4.40, 7.95, 8.00, 8.05, mullions=[4.40, 5.60, 6.80, 8.00])
    s.rect('Living balcony sliding door', 6.80, 7.90, 7.80, 7.94, 2.20, 'metal', group='glazing')

    for j in range(3):
        x1 = 0.30 + j * 1.25
        x2 = x1 + 1.20
        z1 = 9.10 + (x1 / 4.20) * 0.10
        z2 = 9.10 + (x2 / 4.20) * 0.10
        s.glass_panel('Bedroom balcony glass', [(x1, z1), (x2, z2), (x2, z2 + 0.02), (x1, z1 + 0.02)])
    s.glass_panel('Bedroom side glass', [(0.05, 8.20), (0.07, 8.20), (0.07, 9.10), (0.05, 9.10)])
    s.rect('Bedroom side handrail', 0.04, 8.20, 0.08, 9.10, 0.025, 'metal', 1.10, 'rail')
    s.slab('Bedroom front handrail', [(0.25, 9.10), (4.15, 9.20), (4.15, 9.23), (0.25, 9.13)], 1.10, 0.025, 'metal', 'rail')

    front = [
        (4.40, 9.75), (5.80, 9.79), (5.80, 9.81), (4.40, 9.77),
        (5.85, 9.79), (7.20, 9.85), (7.20, 9.87), (5.85, 9.81),
        (7.25, 9.85), (8.60, 9.60), (8.60, 9.62), (7.25, 9.87),
        (8.65, 9.60), (9.85, 9.35), (9.85, 9.37), (8.65, 9.62),
    ]
    for k in range(0, len(front), 4):
        s.glass_panel('Living terrace glass', front[k:k + 4])
    s.glass_panel('Living terrace side glass', [(9.78, 8.25), (9.80, 8.25), (9.88, 9.30), (9.86, 9.30)])
    s.band('Living terrace front rail', [(4.35, 9.76), (7.20, 9.86), (9.85, 9.36)], 0.03, 1.10, 0.025, 'metal', 'rail')
    s.slab('Living terrace side rail', [(9.77, 8.25), (9.87, 9.35), (9.90, 9.35), (9.80, 8.25)], 1.10, 0.025, 'metal', 'rail')

    # -- facade ----------------------------------------------------------
    s.slab('White fascia bedroom', [(-0.05, 9.05), (4.25, 9.15), (4.25, 9.25), (-0.05, 9.15)], -0.24, 0.24, 'white', 'facade')
    terrace_edge = [(4.20, 9.74), (7.22, 9.84), (9.92, 9.34), (9.82, 8.10)]
    s.band('White fascia living', terrace_edge, 0.14, -0.24, 0.24, 'white')
    for x, z, dx, dz in [(9.82, 8.20, 0.15, -0.10), (9.88, 9.32, -0.15, 0.12)]:
        o = s.rect('Angled facade pier', x, z, x + 0.18, z + 0.18, CEILING, 'white', group='facade')
        for v in o['v']:
            if v[1] > 2:
                v[0] += dx
                v[2] += dz
    s.band('Upper white facade band', terrace_edge, 0.14, CEILING, 0.24, 'white')
    s.rect('Left balcony soffit', 0.00, 8.00, 0.35, 9.10, 0.24, 'white', CEILING, 'facade')
    s.rect('Right terrace soffit', 9.60, 8.00, 9.90, 9.30, 0.24, 'white', CEILING, 'facade')

    # -- bedroom furniture ------------------------------------------------
    s.rect('Bed frame', 1.10, 4.90, 2.70, 6.85, 0.32, 'wood')
    s.rect('Headboard', 1.05, 4.85, 2.75, 4.95, 1.05, 'fabric')
    s.rect('Mattress', 1.15, 4.95, 2.65, 6.80, 0.24, 'white', 0.32)
    s.rect('Duvet', 1.17, 5.30, 2.63, 6.78, 0.08, 'fabric', 0.56)
    s.rect('Pillow left', 1.25, 4.99, 1.85, 5.28, 0.13, 'white', 0.56)
    s.rect('Pillow right', 1.95, 4.99, 2.55, 5.28, 0.13, 'white', 0.56)
    s.rect('Nightstand left', 0.55, 4.88, 0.95, 5.28, 0.48, 'wood')
    s.rect('Nightstand right', 2.85, 4.88, 3.25, 5.28, 0.48, 'wood')
    s.rect('Wardrobe closet', 3.50, 5.05, 4.03, 6.75, 2.40, 'white')
    s.rect('Wardrobe seam', 3.76, 5.05, 3.78, 6.75, 2.38, 'dark', 0.01)

    # -- bathroom ---------------------------------------------------------
    s.rect('Vanity', 4.20, 2.20, 4.70, 2.75, 0.75, 'wood')
    s.oval('Washbasin', 4.45, 2.48, 0.18, 0.22, 0.75, 0.12, 'white')
    s.rect('Mirror', 4.21, 2.20, 4.23, 2.75, 0.85, 'glass', 1.15)
    s.rect('WC cistern', 4.20, 2.95, 4.38, 3.35, 0.78, 'white')
    s.oval('WC pedestal', 4.60, 3.15, 0.18, 0.14, 0, 0.38, 'white')
    s.oval('WC seat', 4.63, 3.15, 0.22, 0.16, 0.38, 0.055, 'white')
    s.oval('WC opening', 4.64, 3.15, 0.15, 0.10, 0.436, 0.005, 'dark')
    s.wall('Pipe chase', 4.20, 3.65, 4.55, 4.15)
    s.rect('Bath apron', 4.20, 4.20, 5.55, 4.85, 0.56, 'white')
    s.rect('Bath shadow', 4.26, 4.26, 5.48, 4.79, 0.012, 'metal', 0.56)
    s.rect('Bath interior', 4.30, 4.30, 5.44, 4.75, 0.016, 'white', 0.572)

    # -- kitchen ----------------------------------------------------------
    # The Mid-East column protrudes 0.20 m into the room at Z 1.80..2.20, so the
    # run is notched around it and the appliances stay clear of that band.
    s.rect('Refrigerator', 7.55, 0.30, 8.20, 1.05, 2.05, '#dcd8cf')
    s.rect('Fridge handle', 7.53, 0.35, 7.55, 0.39, 0.60, 'metal', 0.90)

    s.rect('Kitchen cabinet base north', 7.60, 1.05, 8.20, 1.80, 0.86, 'wood')
    s.rect('Kitchen cabinet base column', 7.60, 1.80, 8.00, 2.20, 0.86, 'wood')
    s.rect('Kitchen cabinet base south', 7.60, 2.20, 8.20, 3.80, 0.86, 'wood')
    s.rect('Kitchen countertop north', 7.58, 1.03, 8.20, 1.80, 0.045, 'white', 0.86)
    s.rect('Kitchen countertop column', 7.58, 1.80, 8.00, 2.20, 0.045, 'white', 0.86)
    s.rect('Kitchen countertop south', 7.58, 2.20, 8.20, 3.82, 0.045, 'white', 0.86)

    s.rect('Cooktop', 7.65, 2.35, 8.15, 2.95, 0.015, 'dark', 0.905)
    for i, (bx, bz, r) in enumerate([(7.78, 2.50, 0.07), (7.78, 2.80, 0.07), (8.02, 2.50, 0.06), (8.02, 2.80, 0.06)]):
        s.oval(f'Burner {i + 1}', bx, bz, r, r, 0.92, 0.005, 'metal')

    s.rect('Sink rim', 7.65, 3.10, 8.15, 3.75, 0.016, 'metal', 0.905)
    s.rect('Sink bowl 1', 7.69, 3.15, 8.11, 3.40, 0.019, 'dark', 0.92)
    s.rect('Sink bowl 2', 7.69, 3.45, 8.11, 3.70, 0.019, 'dark', 0.92)
    s.rect('Kitchen tap', 8.12, 3.43, 8.16, 3.47, 0.26, 'metal', 0.92)
    s.wall('Kitchen partition stub', 7.35, 3.90, 8.20, 4.05)

    # dining
    s.rect('Dining table top', 7.10, 4.30, 7.90, 5.00, 0.04, 'wood', 0.74)
    for x in (7.14, 7.82):
        for z in (4.34, 4.92):
            s.rect('Table leg', x, z, x + 0.04, z + 0.04, 0.74, 'dark')
    s.rect('Chair seat North', 7.30, 4.06, 7.70, 4.26, 0.04, 'fabric', 0.44)
    s.rect('Chair back North', 7.30, 4.06, 7.70, 4.09, 0.40, 'wood', 0.44)
    s.rect('Chair seat South', 7.30, 5.04, 7.70, 5.24, 0.04, 'fabric', 0.44)
    s.rect('Chair back South', 7.30, 5.24, 7.70, 5.27, 0.40, 'wood', 0.44)
    s.rect('Chair seat West', 6.70, 4.45, 7.05, 4.85, 0.04, 'fabric', 0.44)
    s.rect('Chair back West', 6.67, 4.45, 6.70, 4.85, 0.40, 'wood', 0.44)
    s.rect('Chair seat East', 7.95, 4.45, 8.15, 4.85, 0.04, 'fabric', 0.44)
    s.rect('Chair back East', 8.15, 4.45, 8.18, 4.85, 0.40, 'wood', 0.44)

    # -- living room ------------------------------------------------------
    s.rect('Sofa long base', 4.30, 5.16, 5.10, 6.95, 0.30, 'wood')
    s.rect('Sofa long back', 4.22, 5.16, 4.36, 6.95, 0.78, 'fabric')
    for z in (5.80, 6.40):
        s.rect('Sofa cushion', 4.38, z, 5.05, z + 0.55, 0.18, 'fabric', 0.30)
    s.rect('Sofa south arm', 4.22, 6.95, 5.10, 7.08, 0.62, 'fabric')
    s.rect('Sofa return base', 4.30, 5.16, 5.65, 5.86, 0.30, 'wood')
    s.rect('Sofa return back', 4.30, 5.00, 5.65, 5.16, 0.78, 'fabric')
    for x in (4.45, 5.05):
        s.rect('Sofa return cushion', x, 5.19, x + 0.55, 5.79, 0.18, 'fabric', 0.30)
    s.rect('Sofa east arm', 5.60, 5.00, 5.72, 5.86, 0.62, 'fabric')
    s.rect('Living rug', 4.70, 5.45, 6.60, 7.35, 0.018, 'rug')
    s.rect('Coffee table top', 5.35, 6.05, 6.00, 6.70, 0.045, 'wood', 0.38)
    for x in (5.39, 5.92):
        for z in (6.09, 6.62):
            s.rect('Coffee table leg', x, z, x + 0.035, z + 0.035, 0.38, 'dark')

    return s
