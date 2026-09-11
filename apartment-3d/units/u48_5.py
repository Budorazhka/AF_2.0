"""Residence 48.5 m² (plan N403, 1+1) — 38.9 m² interior, 4.6 + 5.0 m² balconies.

Interior outline from the IV floor plan: main body 1.46..6.91 x 0.00..6.01 with a
west wing 0.00..1.46 x 0.00..3.80 and a 0.30 m bump east of 6.91 below Z 3.75.
A single wall at X 3.70..3.90 splits the bedroom and bathroom (west) from the
living room (east); the entrance comes off the corridor through the south wall.
"""
from lib import Scene, CEILING

UNIT = dict(
    slug='48-5',
    title='Квартира 48,5 м²',
    eyebrow='AURUM FORT / РЕЗИДЕНЦИЯ 48,5',
    summary='38,9 м² интерьер · балконы 4,6 и 5,0 м²<br>Объёмная реконструкция · метры',
    notes=('<p>Контур снят с поэтажного плана IV этажа (резиденция №403). Внутренняя площадь 38,9 м², '
           'два балкона 4,6 и 5,0 м², общая 48,5 м².</p>'
           '<p>Высота потолков 2,80 м, дверей 2,20 м. Несущие колонны 40×40 см, внешние стены 20 см.</p>'
           '<p>Изолированная спальня с выходом на западный балкон, санузел с душевой, гостиная '
           'с кухонным фронтом в юго-восточном углу и выходом на восточный балкон.</p>'),
)

FOOTPRINT = [
    (0.00, 0.00, 3.70, 3.80),   # bedroom
    (1.46, 3.80, 3.70, 6.01),   # bathroom
    (3.90, 0.00, 7.21, 6.01),   # living room + kitchen
    (-1.40, 0.00, -0.20, 3.80),  # west balcony
    (7.11, 0.00, 8.51, 3.60),   # east balcony
]


def build():
    s = Scene()

    # -- floors ----------------------------------------------------------
    s.rect('Bedroom floor', 0.00, 0.00, 3.70, 3.80, 0.16, 'floor', -0.16, 'floor')
    s.rect('Bathroom tile floor', 1.46, 4.00, 3.70, 6.01, 0.16, 'tile', -0.16, 'floor')
    s.rect('Living room floor', 3.90, 0.00, 6.91, 6.01, 0.16, 'floor', -0.16, 'floor')
    s.rect('Kitchen bay floor', 6.91, 3.75, 7.21, 6.01, 0.16, 'floor', -0.16, 'floor')
    s.rect('West balcony slab', -1.40, 0.00, -0.20, 3.80, 0.18, 'tile', -0.20, 'floor')
    s.rect('East balcony slab', 7.11, 0.00, 8.51, 3.60, 0.18, 'tile', -0.20, 'floor')

    # -- structure -------------------------------------------------------
    s.column('North Column', 2.10, -0.20, 2.50, 0.20)
    s.column('South Column', 2.10, 6.01, 2.50, 6.41)
    s.column('NW balcony Column', -1.40, -0.20, -1.00, 0.20)
    s.column('NE balcony Column', 8.11, -0.20, 8.51, 0.20)

    s.wall('North exterior west', 0.00, -0.20, 2.10, 0.00)
    s.wall('North exterior east', 2.50, -0.20, 6.91, 0.00)
    s.wall('West exterior north', -0.20, 0.20, 0.00, 2.62)
    s.wall('West exterior south', -0.20, 3.37, 0.00, 3.80)
    s.lintel('West balcony lintel', -0.20, 2.62, 0.00, 3.37)
    s.wall('West wing south wall', -0.20, 3.80, 1.46, 4.00)

    s.wall('East exterior north', 6.91, 0.20, 7.11, 2.62)
    s.lintel('East balcony lintel', 6.91, 2.62, 7.11, 3.37)
    s.wall('East exterior stub', 6.91, 3.37, 7.11, 3.75)
    s.wall('Kitchen bay north wall', 7.11, 3.55, 7.41, 3.75)
    s.wall('East exterior bay', 7.21, 3.75, 7.41, 6.01)

    s.wall('South wall west', 1.46, 6.01, 4.05, 6.21)
    s.lintel('Entrance lintel', 4.05, 6.01, 4.96, 6.21)
    s.wall('South wall east', 4.96, 6.01, 7.41, 6.21)
    s.door_leaf('Entrance open door', 4.07, 5.12, 4.11, 5.99)

    # bedroom / living divider with two openings
    s.wall('Divider north', 3.70, 0.00, 3.90, 2.94)
    s.lintel('Bedroom door lintel', 3.70, 2.94, 3.90, 3.64)
    s.wall('Divider mid', 3.70, 3.64, 3.90, 5.03)
    s.lintel('Bathroom door lintel', 3.70, 5.03, 3.90, 5.88)
    s.wall('Divider south', 3.70, 5.88, 3.90, 6.01)
    s.door_leaf('Bedroom open door', 3.92, 2.96, 3.96, 3.62)
    s.door_leaf('Bathroom open door', 3.66, 5.05, 3.70, 5.86, 'white')

    s.wall('Bathroom north wall', 1.46, 3.80, 3.70, 4.00)
    s.wall('Bathroom west wall', 1.26, 4.00, 1.46, 6.01)

    # -- glazing and balconies --------------------------------------------
    s.glazing('West glazing', -0.15, 0.20, -0.05, 2.62, mullions=[0.20, 1.05, 1.85, 2.58])
    s.rect('West balcony open door', -0.03, 2.66, 0.01, 3.35, 2.20, 'metal', group='glazing')
    s.glazing('East glazing', 6.96, 0.20, 7.06, 2.62, mullions=[0.20, 1.05, 1.85, 2.58])
    s.rect('East balcony open door', 6.94, 2.66, 6.98, 3.35, 2.20, 'metal', group='glazing')

    for x0, z0, z1, name in [(-1.38, 0.25, 1.85, 'West'), (-1.38, 1.95, 3.55, 'West'),
                             (8.49, 0.25, 1.85, 'East'), (8.49, 1.95, 3.35, 'East')]:
        s.glass_panel(f'{name} balcony glass', [(x0, z0), (x0 + 0.02, z0), (x0 + 0.02, z1), (x0, z1)])
    s.rect('West balcony handrail', -1.40, 0.20, -1.34, 3.60, 0.025, 'metal', 1.10, 'rail')
    s.rect('East balcony handrail', 8.45, 0.20, 8.51, 3.40, 0.025, 'metal', 1.10, 'rail')
    s.glass_panel('West balcony end glass', [(-1.38, 3.62), (-0.25, 3.62), (-0.25, 3.64), (-1.38, 3.64)])
    s.glass_panel('East balcony end glass', [(7.20, 3.42), (8.49, 3.42), (8.49, 3.44), (7.20, 3.44)])

    s.rect('West white fascia', -1.52, -0.10, -1.36, 3.72, 0.24, 'white', -0.24, 'facade')
    s.rect('East white fascia', 8.47, -0.10, 8.63, 3.52, 0.24, 'white', -0.24, 'facade')
    s.rect('West balcony soffit', -1.52, -0.10, -1.36, 3.72, 0.24, 'white', CEILING, 'facade')
    s.rect('East balcony soffit', 8.47, -0.10, 8.63, 3.52, 0.24, 'white', CEILING, 'facade')
    s.rect('West facade pier', -1.54, 3.54, -1.36, 3.72, CEILING, 'white', group='facade')
    s.rect('East facade pier', 8.45, 3.34, 8.63, 3.52, CEILING, 'white', group='facade')

    # -- bedroom -----------------------------------------------------------
    s.rect('Bed frame', 1.66, 0.55, 3.56, 2.15, 0.32, 'wood')
    s.rect('Headboard', 3.56, 0.50, 3.68, 2.20, 1.05, 'fabric')
    s.rect('Mattress', 1.71, 0.60, 3.52, 2.10, 0.24, 'white', 0.32)
    s.rect('Duvet', 1.73, 0.62, 3.10, 2.08, 0.08, 'fabric', 0.56)
    s.rect('Pillow north', 3.14, 0.68, 3.46, 1.30, 0.13, 'white', 0.56)
    s.rect('Pillow south', 3.14, 1.40, 3.46, 2.02, 0.13, 'white', 0.56)
    s.rect('Nightstand north', 3.16, 0.06, 3.56, 0.46, 0.48, 'wood')
    s.rect('Nightstand south', 3.16, 2.24, 3.56, 2.64, 0.48, 'wood')
    s.rect('Wardrobe', 0.20, 3.16, 3.00, 3.76, 2.40, 'white')
    s.rect('Wardrobe seam A', 1.12, 3.16, 1.14, 3.74, 2.38, 'dark', 0.01)
    s.rect('Wardrobe seam B', 2.06, 3.16, 2.08, 3.74, 2.38, 'dark', 0.01)
    s.oval('Bedroom rug', 1.60, 1.35, 0.95, 1.05, 0.0, 0.018, 'rug')

    # -- bathroom ----------------------------------------------------------
    s.rect('Shower tray', 2.69, 4.01, 3.65, 4.87, 0.06, 'white')
    s.rect('Shower screen side', 2.65, 4.01, 2.69, 4.87, 1.95, 'glass', 0.06, 'glazing')
    s.rect('Shower screen front', 2.69, 4.87, 3.65, 4.91, 1.95, 'glass', 0.06, 'glazing')
    s.rect('Shower mixer', 3.61, 4.30, 3.65, 4.55, 0.30, 'metal', 1.05)
    s.rect('WC cistern', 1.46, 4.22, 1.64, 4.62, 0.78, 'white')
    s.oval('WC pedestal', 1.86, 4.42, 0.18, 0.14, 0.0, 0.38, 'white')
    s.oval('WC seat', 1.89, 4.42, 0.22, 0.16, 0.38, 0.055, 'white')
    s.oval('WC opening', 1.90, 4.42, 0.15, 0.10, 0.436, 0.005, 'dark')
    s.rect('Vanity', 1.46, 5.11, 1.96, 5.70, 0.75, 'wood')
    s.oval('Washbasin', 1.71, 5.40, 0.18, 0.22, 0.75, 0.12, 'white')
    s.rect('Mirror', 1.47, 5.11, 1.49, 5.70, 0.85, 'glass', 1.15)
    s.rect('Washing machine', 2.70, 5.35, 3.30, 5.95, 0.85, '#dcd8cf')
    s.rect('Washer porthole', 2.85, 5.31, 3.15, 5.35, 0.30, 'dark', 0.30)

    # -- living room --------------------------------------------------------
    s.rect('Sofa base', 3.90, 0.56, 4.78, 2.52, 0.30, 'wood')
    s.rect('Sofa back', 3.90, 0.56, 4.04, 2.52, 0.78, 'fabric')
    for z in (0.68, 1.30, 1.92):
        s.rect('Sofa cushion', 4.06, z, 4.73, z + 0.55, 0.18, 'fabric', 0.30)
    s.rect('Sofa north arm', 3.90, 0.44, 4.78, 0.56, 0.62, 'fabric')
    s.rect('Sofa south arm', 3.90, 2.52, 4.78, 2.64, 0.62, 'fabric')
    s.rect('Living rug', 4.60, 0.45, 6.55, 2.75, 0.018, 'rug')
    s.oval('Coffee table top', 5.35, 1.55, 0.45, 0.45, 0.38, 0.045, 'wood')
    s.rect('Coffee table stem', 5.30, 1.50, 5.40, 1.60, 0.38, 'dark')
    s.oval('Coffee table foot', 5.35, 1.55, 0.24, 0.24, 0.0, 0.04, 'dark')
    s.rect('TV console', 6.55, 0.90, 6.91, 2.30, 0.42, 'wood')
    s.rect('TV panel', 6.85, 1.05, 6.89, 2.15, 0.62, 'dark', 0.52)

    # -- dining ---------------------------------------------------------------
    s.rect('Dining table top', 5.00, 3.10, 6.30, 3.90, 0.04, 'wood', 0.74)
    for x in (5.04, 6.22):
        for z in (3.14, 3.82):
            s.rect('Table leg', x, z, x + 0.04, z + 0.04, 0.74, 'dark')
    for x in (5.15, 5.80):
        s.rect('Chair seat north', x, 2.82, x + 0.40, 3.02, 0.04, 'fabric', 0.44)
        s.rect('Chair back north', x, 2.79, x + 0.40, 2.82, 0.40, 'wood', 0.44)
        s.rect('Chair seat south', x, 3.98, x + 0.40, 4.18, 0.04, 'fabric', 0.44)
        s.rect('Chair back south', x, 4.18, x + 0.40, 4.21, 0.40, 'wood', 0.44)

    # -- kitchen in the south-east bay ------------------------------------------
    s.rect('Kitchen cabinet base', 6.61, 3.95, 7.21, 5.30, 0.86, 'wood')
    s.rect('Kitchen countertop', 6.59, 3.93, 7.21, 5.32, 0.045, 'white', 0.86)
    s.rect('Kitchen return base', 6.50, 5.30, 7.21, 5.90, 0.86, 'wood')
    s.rect('Kitchen return top', 6.48, 5.28, 7.21, 5.92, 0.045, 'white', 0.86)
    s.rect('Appliance front', 6.57, 3.99, 6.61, 4.57, 0.78, '#dcd8cf', 0.04)
    s.rect('Appliance porthole', 6.53, 4.14, 6.57, 4.42, 0.28, 'dark', 0.30)
    s.rect('Cooktop', 6.71, 4.60, 7.15, 5.06, 0.015, 'dark', 0.905)
    for bz, r in [(4.72, 0.07), (4.94, 0.06)]:
        s.oval('Burner', 6.93, bz, r, r, 0.92, 0.005, 'metal')
    s.rect('Sink rim', 6.68, 5.38, 7.14, 5.84, 0.016, 'metal', 0.905)
    s.rect('Sink bowl', 6.72, 5.42, 7.10, 5.70, 0.019, 'dark', 0.92)
    s.rect('Kitchen tap', 7.10, 5.54, 7.14, 5.58, 0.24, 'metal', 0.92)
    s.rect('Refrigerator', 5.85, 5.25, 6.50, 5.95, 2.00, '#dcd8cf')
    s.rect('Fridge handle', 5.83, 5.32, 5.85, 5.36, 0.55, 'metal', 0.95)

    return s
