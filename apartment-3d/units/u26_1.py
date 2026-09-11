"""Studio 26.1 m² (plan N402) — 21.6 m² interior, 4.5 m² balcony.

Interior outline from the IV floor plan: main room 0.00..5.01 x 2.21..5.61 with a
bathroom wing 3.51..5.66 x 0.00..2.01 pushed north-east. Daylight comes only from
the west glazing onto the balcony; north, east and south are party walls.
"""
from lib import Scene, CEILING

UNIT = dict(
    slug='26-1',
    title='Студия 26,1 м²',
    eyebrow='AURUM FORT / РЕЗИДЕНЦИЯ 26,1',
    summary='21,6 м² интерьер · балкон 4,5 м²<br>Объёмная реконструкция · метры',
    notes=('<p>Контур снят с поэтажного плана IV этажа (резиденция №402). Внутренняя площадь 21,6 м², '
           'балкон 4,5 м², общая 26,1 м².</p>'
           '<p>Высота потолков 2,80 м, дверей 2,20 м. Несущие колонны 40×40 см, внешние стены 20 см.</p>'
           '<p>Единственный источник дневного света — панорамное остекление на запад. Санузел вынесен '
           'в северо-восточное крыло: душевой поддон, унитаз и раковина вдоль восточной стены.</p>'),
)

FOOTPRINT = [
    (0.00, 2.21, 5.01, 5.61),    # main room
    (3.51, 0.00, 5.66, 2.01),    # bathroom wing
    (-1.40, 2.01, -0.20, 5.81),  # balcony
]


def build():
    s = Scene()

    # -- floors ----------------------------------------------------------
    s.rect('Studio floor', 0.00, 2.21, 5.01, 5.61, 0.16, 'floor', -0.16, 'floor')
    s.rect('Bathroom tile floor', 3.51, 0.00, 5.66, 2.01, 0.16, 'tile', -0.16, 'floor')
    s.slab('Balcony slab', [(-1.40, 2.01), (-0.20, 2.01), (-0.20, 5.61), (-0.70, 5.61), (-0.70, 5.81), (-1.40, 5.81)],
           -0.20, 0.18, 'tile')

    # -- structure -------------------------------------------------------
    s.column('NW Column', -0.20, 2.01, 0.20, 2.41)
    s.column('Inner corner Column', 3.31, 2.01, 3.71, 2.41)
    s.column('SW Column', -0.20, 5.41, 0.20, 5.81)
    s.column('SE Column', 4.96, 5.41, 5.36, 5.81)

    s.wall('North party wall', 0.20, 2.01, 3.31, 2.21)
    s.wall('South party wall', 0.20, 5.61, 4.96, 5.81)
    s.wall('West pier north', -0.20, 2.41, 0.00, 2.55)
    s.wall('West pier south', -0.20, 5.27, 0.00, 5.41)

    # east wall of the main room, entrance opening at 3.15..4.05
    s.wall('East wall north', 5.01, 2.21, 5.21, 3.15)
    s.lintel('Entrance lintel', 5.01, 3.15, 5.21, 4.05)
    s.wall('East wall south', 5.01, 4.05, 5.21, 5.41)
    s.door_leaf('Entrance open door', 4.20, 3.11, 4.24, 3.98)

    # bathroom shell
    s.wall('Bathroom west wall', 3.31, 0.00, 3.51, 2.01)
    s.wall('Bathroom north wall', 3.31, -0.20, 5.86, 0.00)
    s.wall('Bathroom east wall', 5.66, 0.00, 5.86, 2.21)
    s.lintel('Bathroom door lintel', 3.71, 2.01, 4.57, 2.21)
    s.wall('Bathroom south wall', 4.57, 2.01, 5.66, 2.21)
    s.door_leaf('Bathroom open door', 3.75, 1.15, 3.79, 1.99, 'white')

    # -- glazing and balcony ---------------------------------------------
    s.glazing('West glazing', -0.15, 2.55, -0.05, 5.27, mullions=[2.55, 3.45, 4.40, 5.23])
    s.rect('Balcony open door', -0.03, 4.45, 0.01, 5.27, 2.20, 'metal', group='glazing')

    for z0, z1 in [(2.15, 3.35), (3.45, 4.65), (4.75, 5.70)]:
        s.glass_panel('Balcony glass', [(-1.38, z0), (-1.36, z0), (-1.36, z1), (-1.38, z1)])
    s.glass_panel('Balcony north glass', [(-1.38, 2.06), (-0.25, 2.06), (-0.25, 2.08), (-1.38, 2.08)])
    s.glass_panel('Balcony south glass', [(-1.38, 5.74), (-0.75, 5.74), (-0.75, 5.76), (-1.38, 5.76)])
    s.rect('Balcony handrail', -1.40, 2.05, -1.34, 5.78, 0.025, 'metal', 1.10, 'rail')
    s.rect('Balcony north rail', -1.40, 2.05, -0.25, 2.11, 0.025, 'metal', 1.10, 'rail')
    s.rect('Balcony south rail', -1.40, 5.72, -0.75, 5.78, 0.025, 'metal', 1.10, 'rail')

    s.rect('White balcony fascia', -1.50, 1.95, -1.36, 5.88, 0.24, 'white', -0.24, 'facade')
    s.rect('Balcony soffit', -1.50, 1.95, -1.36, 5.88, 0.24, 'white', CEILING, 'facade')
    s.rect('Angled facade pier north', -1.52, 1.95, -1.34, 2.13, CEILING, 'white', group='facade')
    s.rect('Angled facade pier south', -1.52, 5.70, -1.34, 5.88, CEILING, 'white', group='facade')

    # -- sleeping area ----------------------------------------------------
    s.oval('Room rug', 2.05, 3.45, 1.45, 1.15, 0.0, 0.018, 'rug')
    s.rect('Bed frame', 1.25, 2.21, 2.85, 4.21, 0.32, 'wood')
    s.rect('Headboard', 1.20, 2.21, 2.90, 2.31, 1.05, 'fabric')
    s.rect('Mattress', 1.30, 2.31, 2.80, 4.16, 0.24, 'white', 0.32)
    s.rect('Duvet', 1.32, 2.70, 2.78, 4.14, 0.08, 'fabric', 0.56)
    s.rect('Pillow left', 1.40, 2.35, 1.98, 2.63, 0.13, 'white', 0.56)
    s.rect('Pillow right', 2.10, 2.35, 2.68, 2.63, 0.13, 'white', 0.56)
    s.oval('Nightstand left', 1.05, 2.48, 0.20, 0.20, 0.0, 0.46, 'wood')
    s.oval('Nightstand right', 3.05, 2.48, 0.20, 0.20, 0.0, 0.46, 'wood')

    # -- wardrobe between bathroom wall and entrance -----------------------
    s.rect('Wardrobe', 4.41, 2.25, 5.01, 3.05, 2.40, 'white')
    s.rect('Wardrobe seam', 4.41, 2.64, 4.99, 2.66, 2.38, 'dark', 0.01)

    # -- kitchen along the south wall --------------------------------------
    s.rect('Kitchen cabinet base', 3.10, 5.01, 4.96, 5.61, 0.86, 'wood')
    s.rect('Kitchen countertop', 3.08, 4.99, 4.96, 5.61, 0.045, 'white', 0.86)
    s.rect('Appliance front', 3.18, 4.98, 3.78, 5.02, 0.78, '#dcd8cf', 0.04)
    s.rect('Appliance porthole', 3.36, 4.96, 3.60, 4.99, 0.24, 'dark', 0.31)
    s.rect('Cooktop', 3.93, 5.05, 4.29, 5.57, 0.015, 'dark', 0.905)
    s.oval('Burner 1', 4.11, 5.19, 0.07, 0.07, 0.92, 0.005, 'metal')
    s.oval('Burner 2', 4.11, 5.44, 0.06, 0.06, 0.92, 0.005, 'metal')
    s.rect('Sink rim', 4.44, 5.10, 4.92, 5.52, 0.016, 'metal', 0.905)
    s.rect('Sink bowl', 4.48, 5.14, 4.88, 5.44, 0.019, 'dark', 0.92)
    s.rect('Kitchen tap', 4.66, 5.50, 4.70, 5.54, 0.24, 'metal', 0.92)

    # -- service shaft in the south-east corner ----------------------------
    s.wall('Service enclosure', 4.39, 4.18, 5.01, 4.38)
    s.wall('Service enclosure side', 4.39, 4.38, 4.59, 5.01)
    s.rect('Boiler', 4.62, 4.42, 5.00, 4.92, 0.80, '#dcd8cf', 1.10)

    # -- small round dining table -----------------------------------------
    s.oval('Dining table top', 2.20, 4.82, 0.45, 0.45, 0.72, 0.04, 'wood')
    s.rect('Dining table stem', 2.15, 4.77, 2.25, 4.87, 0.72, 'dark')
    s.oval('Dining table foot', 2.20, 4.82, 0.22, 0.22, 0.0, 0.04, 'dark')
    s.oval('Dining chair west', 1.52, 4.82, 0.22, 0.22, 0.44, 0.05, 'fabric')
    s.rect('Dining chair west back', 1.28, 4.60, 1.33, 5.04, 0.42, 'wood', 0.49)
    s.oval('Dining chair east', 2.88, 4.82, 0.22, 0.22, 0.44, 0.05, 'fabric')
    s.rect('Dining chair east back', 3.07, 4.60, 3.12, 5.04, 0.42, 'wood', 0.49)

    # -- bathroom fittings --------------------------------------------------
    s.rect('Shower tray', 3.51, 0.00, 4.39, 0.91, 0.06, 'white')
    s.rect('Shower screen', 4.39, 0.00, 4.43, 0.91, 1.95, 'glass', 0.06, 'glazing')
    s.rect('Shower screen front', 3.51, 0.87, 4.43, 0.91, 1.95, 'glass', 0.06, 'glazing')
    s.rect('Shower mixer', 3.53, 0.35, 3.57, 0.55, 0.30, 'metal', 1.05)
    s.rect('WC cistern', 5.48, 0.27, 5.66, 0.62, 0.78, 'white')
    s.oval('WC pedestal', 5.36, 0.44, 0.14, 0.18, 0.0, 0.38, 'white')
    s.oval('WC seat', 5.33, 0.44, 0.16, 0.22, 0.38, 0.055, 'white')
    s.oval('WC opening', 5.32, 0.44, 0.10, 0.15, 0.436, 0.005, 'dark')
    s.rect('Vanity', 5.16, 1.24, 5.66, 1.79, 0.75, 'wood')
    s.oval('Washbasin', 5.41, 1.51, 0.18, 0.22, 0.75, 0.12, 'white')
    s.rect('Mirror', 5.63, 1.24, 5.65, 1.79, 0.85, 'glass', 1.15)
    s.rect('Towel rail', 4.62, 1.97, 5.02, 1.99, 0.04, 'metal', 1.25)

    return s
