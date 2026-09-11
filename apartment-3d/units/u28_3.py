"""Studio 28.3 m² (plan N406) — 26.1 m² interior, 2.2 m² balcony.

Interior outline from the IV floor plan: main room 1.80..5.80 x 0.00..6.00 plus a
north-west alcove 0.00..1.80 x 0.00..1.40 whose outer corner is cut at 45°.
Entrance is in the north wall; the bathroom occupies the north-east corner with the
kitchen run directly below it; the south wall is fully glazed onto the balcony.
"""
from lib import Scene, CEILING

UNIT = dict(
    slug='28-3',
    title='Студия 28,3 м²',
    eyebrow='AURUM FORT / РЕЗИДЕНЦИЯ 28,3',
    summary='26,1 м² интерьер · балкон 2,2 м²<br>Объёмная реконструкция · метры',
    notes=('<p>Контур снят с поэтажного плана IV этажа (резиденция №406). Внутренняя площадь 26,1 м², '
           'балкон 2,2 м², общая 28,3 м².</p>'
           '<p>Высота потолков 2,80 м, дверей 2,20 м. Несущие колонны 40×40 см, внешние стены 20 см.</p>'
           '<p>Северо-западная ниша со скошенным углом отведена под гардероб. Санузел с ванной — '
           'в северо-восточном углу, кухонный фронт идёт под ним. Южная стена остеклена на всю ширину.</p>'),
)

FOOTPRINT = [
    (1.80, 0.00, 5.80, 6.00),   # main room
    (0.00, 0.00, 1.80, 1.40),   # wardrobe alcove
    (4.00, 6.00, 5.80, 7.70),   # balcony
]


def build():
    s = Scene()

    # -- floors ----------------------------------------------------------
    s.rect('Studio floor west', 1.80, 0.00, 3.56, 6.00, 0.16, 'floor', -0.16, 'floor')
    s.rect('Studio floor east', 3.56, 1.50, 5.80, 6.00, 0.16, 'floor', -0.16, 'floor')
    s.slab('Wardrobe alcove floor', [(0.58, 0.00), (1.80, 0.00), (1.80, 1.40), (0.00, 1.40), (0.00, 0.59)],
           -0.16, 0.16, 'floor')
    s.rect('Bathroom tile floor', 3.56, 0.00, 5.80, 1.50, 0.16, 'tile', -0.16, 'floor')
    s.slab('Balcony slab', [(4.00, 6.20), (5.80, 6.20), (5.80, 7.65), (4.00, 7.06)], -0.20, 0.18, 'tile')

    # -- structure -------------------------------------------------------
    s.column('NE Column', 5.60, -0.20, 6.00, 0.20)
    s.column('SE Column', 5.60, 5.80, 6.00, 6.20)

    # north wall, entrance opening at 2.00..2.93
    s.wall('North wall west', 0.58, -0.20, 2.00, 0.00)
    s.lintel('Entrance lintel', 2.00, -0.20, 2.93, 0.00)
    s.wall('North wall east', 2.93, -0.20, 5.60, 0.00)
    s.door_leaf('Entrance open door', 2.02, 0.00, 2.06, 0.90)

    # chamfered north-west corner
    s.slab('Chamfer wall', [(0.00, 0.59), (0.58, 0.00), (0.58, -0.20), (-0.20, 0.72)], 0.0, CEILING, 'wall', 'walls')
    s.wall('West alcove wall', -0.20, 0.72, 0.00, 1.40)
    s.wall('Alcove south wall', 0.00, 1.40, 1.80, 1.60)
    s.wall('West party wall', 1.60, 1.60, 1.80, 6.00)

    s.wall('East wall north', 5.80, 0.00, 6.00, 1.70)
    s.wall('East shaft wall', 5.40, 1.70, 6.00, 2.20)
    s.wall('East wall south', 5.80, 2.20, 6.00, 5.80)
    s.wall('South wall west', 1.80, 6.00, 1.90, 6.20)

    # bathroom shell, door in its west wall at 0.00..0.87
    s.lintel('Bathroom door lintel', 3.36, 0.00, 3.56, 0.87)
    s.wall('Bathroom west wall', 3.36, 0.87, 3.56, 1.70)
    s.wall('Bathroom south wall', 3.36, 1.50, 5.08, 1.70)
    s.door_leaf('Bathroom open door', 3.58, 0.02, 4.42, 0.06, 'white')

    # -- glazing ---------------------------------------------------------
    s.glazing('South glazing', 1.90, 6.05, 5.60, 6.15, mullions=[1.90, 2.85, 3.80, 4.70, 5.56])
    s.rect('Balcony open door', 5.58, 5.30, 5.62, 6.05, 2.20, 'metal', group='glazing')

    for x0, x1 in [(4.10, 5.05), (5.15, 5.75)]:
        z0 = 7.06 + (x0 - 4.00) / 1.80 * 0.59
        z1 = 7.06 + (x1 - 4.00) / 1.80 * 0.59
        s.glass_panel('Balcony glass', [(x0, z0), (x1, z1), (x1, z1 + 0.02), (x0, z0 + 0.02)])
    s.glass_panel('Balcony side glass', [(4.02, 6.30), (4.04, 6.30), (4.04, 7.05), (4.02, 7.05)])
    s.slab('Balcony handrail', [(4.05, 7.08), (5.78, 7.65), (5.78, 7.68), (4.05, 7.11)], 1.10, 0.025, 'metal', 'rail')
    s.rect('Balcony side rail', 4.00, 6.30, 4.06, 7.08, 0.025, 'metal', 1.10, 'rail')

    s.slab('White balcony fascia', [(3.95, 7.02), (5.82, 7.63), (5.82, 7.77), (3.95, 7.16)], -0.24, 0.24, 'white', 'facade')
    s.slab('Balcony soffit', [(3.95, 7.02), (5.82, 7.63), (5.82, 7.77), (3.95, 7.16)], CEILING, 0.24, 'white', 'facade')
    s.rect('Angled facade pier', 5.66, 7.55, 5.84, 7.73, CEILING, 'white', group='facade')
    s.rect('Balcony divider', 3.92, 6.20, 4.06, 7.12, CEILING, 'white', group='facade')

    # -- wardrobe alcove ---------------------------------------------------
    s.rect('Wardrobe carcass north', 0.66, 0.02, 1.76, 0.62, 2.40, 'white')
    s.rect('Wardrobe rail north', 0.72, 0.30, 1.70, 0.34, 0.04, 'metal', 1.75)
    for x in (0.78, 1.06, 1.34):
        s.rect('Hanging clothes', x, 0.16, x + 0.20, 0.50, 0.95, 'fabric', 0.72)
    s.rect('Wardrobe carcass west', 0.02, 0.76, 0.62, 1.38, 2.40, 'white')
    s.rect('Wardrobe rail west', 0.30, 0.82, 0.34, 1.32, 0.04, 'metal', 1.75)
    for z in (0.86, 1.14):
        s.rect('Hanging clothes', 0.16, z, 0.50, z + 0.20, 0.95, 'fabric', 0.72)
    s.rect('Shoe bench', 0.80, 0.92, 1.76, 1.34, 0.45, 'wood')

    # -- sleeping area ------------------------------------------------------
    s.rect('Bed frame', 1.80, 3.65, 3.75, 5.35, 0.32, 'wood')
    s.rect('Headboard', 1.80, 3.60, 1.92, 5.40, 1.05, 'fabric')
    s.rect('Mattress', 1.92, 3.70, 3.70, 5.30, 0.24, 'white', 0.32)
    s.rect('Duvet', 2.30, 3.72, 3.68, 5.28, 0.08, 'fabric', 0.56)
    s.rect('Pillow near', 1.96, 3.80, 2.24, 4.42, 0.13, 'white', 0.56)
    s.rect('Pillow far', 1.96, 4.55, 2.24, 5.17, 0.13, 'white', 0.56)
    s.rect('Bedside cabinet', 1.82, 2.95, 2.22, 3.35, 0.48, 'wood')
    s.rect('Bench at bed foot', 3.80, 3.85, 4.20, 5.15, 0.44, 'fabric')

    # -- seating by the east wall --------------------------------------------
    s.oval('Seating rug', 4.85, 3.90, 0.95, 0.95, 0.0, 0.018, 'rug')
    for z in (3.15, 4.45):
        s.oval('Armchair seat', 5.25, z + 0.30, 0.34, 0.34, 0.38, 0.12, 'fabric')
        s.rect('Armchair back', 5.52, z, 5.76, z + 0.60, 0.68, 'fabric')
        s.oval('Armchair base', 5.25, z + 0.30, 0.28, 0.28, 0.0, 0.38, 'wood')
    s.oval('Side table top', 4.55, 3.90, 0.28, 0.28, 0.42, 0.05, 'wood')
    s.rect('Side table stem', 4.51, 3.86, 4.59, 3.94, 0.42, 'dark')

    # -- kitchen run below the bathroom ---------------------------------------
    s.rect('Kitchen cabinet base', 3.46, 1.70, 5.15, 2.30, 0.86, 'wood')
    s.rect('Kitchen countertop', 3.44, 1.68, 5.15, 2.32, 0.045, 'white', 0.86)
    s.rect('Appliance front', 3.50, 2.26, 4.03, 2.30, 0.78, '#dcd8cf', 0.04)
    s.rect('Appliance porthole', 3.64, 2.28, 3.90, 2.32, 0.26, 'dark', 0.30)
    s.rect('Cooktop', 4.13, 1.76, 4.52, 2.26, 0.015, 'dark', 0.905)
    s.oval('Burner 1', 4.32, 1.90, 0.07, 0.07, 0.92, 0.005, 'metal')
    s.oval('Burner 2', 4.32, 2.13, 0.06, 0.06, 0.92, 0.005, 'metal')
    s.rect('Sink rim', 4.60, 1.78, 5.10, 2.22, 0.016, 'metal', 0.905)
    s.rect('Sink bowl', 4.64, 1.82, 5.06, 2.12, 0.019, 'dark', 0.92)
    s.rect('Kitchen tap', 4.83, 1.80, 4.87, 1.84, 0.24, 'metal', 0.92)
    s.rect('Refrigerator', 5.14, 2.30, 5.80, 3.00, 2.00, '#dcd8cf')
    s.rect('Fridge handle', 5.12, 2.38, 5.14, 2.42, 0.55, 'metal', 0.95)

    # -- bathroom fittings -----------------------------------------------------
    s.rect('Bath apron', 5.10, 0.25, 5.80, 1.65, 0.56, 'white')
    s.rect('Bath shadow', 5.16, 0.31, 5.74, 1.59, 0.012, 'metal', 0.56)
    s.rect('Bath interior', 5.20, 0.35, 5.70, 1.55, 0.016, 'white', 0.572)
    s.rect('Vanity', 3.56, 1.10, 4.12, 1.50, 0.75, 'wood')
    s.oval('Washbasin', 3.84, 1.30, 0.22, 0.17, 0.75, 0.12, 'white')
    s.rect('Mirror', 3.56, 1.47, 4.12, 1.49, 0.85, 'glass', 1.15)
    s.rect('WC cistern', 4.45, 1.32, 4.85, 1.50, 0.78, 'white')
    s.oval('WC pedestal', 4.65, 1.14, 0.18, 0.14, 0.0, 0.38, 'white')
    s.oval('WC seat', 4.65, 1.11, 0.22, 0.16, 0.38, 0.055, 'white')
    s.oval('WC opening', 4.65, 1.10, 0.15, 0.10, 0.436, 0.005, 'dark')
    s.rect('Towel rail', 5.02, 0.30, 5.06, 0.70, 0.04, 'metal', 1.25)

    return s
