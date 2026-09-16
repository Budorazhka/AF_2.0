"""Residence 81.8 m² (plan N401, 2+1) — 70.1 m² interior, 10.7 m² terrace, 1.0 m² balcony.

Interior outline from the IV floor plan: 0.00..7.01 x 0.00..5.91, widening east to
7.81 below Z 5.91, with the south-west corner cut back to Z 8.71. A central hallway
runs south from the entrance between the two bedrooms; the terrace wraps the
south-east corner.
"""
import math

from lib import Scene, CEILING

UNIT = dict(
    slug='81-8',
    title='Квартира 81,8 м²',
    eyebrow='AURUM FORT / РЕЗИДЕНЦИЯ 81,8',
    summary='70,1 м² интерьер · терраса 10,7 м² · балкон 1,0 м²<br>Объёмная реконструкция · метры',
    notes=('<p>Основа контура — поэтажный план IV этажа (резиденция №401). Проёмы уточняются по фотосъёмке; реконструкция ещё проходит сверку, расположение гардеробной не подтверждено. Внутренняя площадь 70,1 м², '
           'терраса 10,7 м², балкон 1,0 м², общая 81,8 м².</p>'
           '<p>Для модели приняты высота потолков 2,80 м, дверей 2,20 м, колонны 40×40 см и внешние стены 20 см. '
           'Размеры проёмов и мебели ориентировочные: это визуализация, не обмерный проект.</p>'
           '<p>Две изолированные спальни выходят в центральный холл, санузел с окном — между первой '
           'спальней и кухней. У первой спальни есть малый балкон со стороны склона, у второй — широкое '
           'панорамное остекление. Гостиная раскрыта на угловую террасу двумя большими проёмами.</p>'),
)

FOOTPRINT = [
    (0.00, 0.00, 7.01, 5.91),
    (0.00, 5.91, 7.81, 8.71),
    (1.80, 8.71, 7.81, 9.91),
    (-0.82, 0.21, -0.20, 1.75),   # west balcony
    (5.55, 5.71, 9.71, 11.62),    # terrace
]


def build():
    s = Scene()

    # -- floors ----------------------------------------------------------
    s.rect('Bedroom 1 floor', 0.00, 0.00, 2.70, 3.64, 0.16, 'floor', -0.16, 'floor')
    s.rect('Bathroom tile floor', 0.00, 3.84, 2.70, 5.53, 0.16, 'tile', -0.16, 'floor')
    s.rect('Hallway floor', 2.70, 0.00, 4.32, 5.73, 0.16, 'floor', -0.16, 'floor')
    s.rect('Bedroom 2 floor', 4.32, 0.00, 7.01, 5.53, 0.16, 'floor', -0.16, 'floor')
    s.rect('Living room floor', 0.00, 5.73, 7.81, 8.71, 0.16, 'floor', -0.16, 'floor')
    s.rect('Living south bay floor', 1.80, 8.71, 7.81, 9.91, 0.16, 'floor', -0.16, 'floor')
    s.rect('West balcony slab', -0.82, 0.21, -0.20, 1.75, 0.18, 'tile', -0.20, 'floor')
    # L-shaped terrace, split so each cap stays convex
    s.slab('Terrace slab east', [(8.01, 5.71), (9.71, 5.71), (9.11, 11.02), (8.01, 11.21)], -0.20, 0.18, 'tile')
    s.slab('Terrace slab south', [(5.55, 10.11), (8.01, 10.11), (8.01, 11.21), (5.55, 11.62)], -0.20, 0.18, 'tile')

    # -- structure -------------------------------------------------------
    for name, x, z in [('NW', -0.20, -0.20), ('NE', 6.81, -0.20), ('West-mid', -0.20, 5.51),
                       ('West-south', -0.20, 8.51), ('South-west', 1.60, 9.71), ('South-east', 7.61, 9.71),
                       ('Step', 6.81, 5.51)]:
        s.column(f'{name} Column', x, z, x + 0.40, z + 0.40)

    s.wall('North exterior west', 0.20, -0.20, 3.09, 0.00)
    s.lintel('Entrance lintel', 3.09, -0.20, 4.08, 0.00)
    s.wall('North exterior east', 4.08, -0.20, 6.81, 0.00)
    s.door_leaf('Entrance open door', 3.11, 0.00, 3.15, 0.95)

    s.wall('West exterior north', -0.20, 0.20, 0.00, 0.30)
    # Photo 0075: when looking west, the door is on the RIGHT (north),
    # followed southward by three window panels above a solid sill.
    s.lintel('West bedroom opening lintel', -0.20, 0.30, 0.00, 3.34)
    s.rect('West bedroom window sill', -0.20, 1.05, 0.00, 3.34, 0.92, 'wall', 0, 'walls')
    s.wall('West exterior bedroom', -0.20, 3.34, 0.00, 3.64)
    # Photo 0080: one high window near the north corner, not at floor level.
    s.wall('West exterior bathroom north', -0.20, 3.84, 0.00, 3.95)
    s.lintel('Bathroom window lintel', -0.20, 3.95, 0.00, 4.57, 2.05)
    s.rect('Bathroom window sill', -0.20, 3.95, 0.00, 4.57, 1.18, 'wall', 0, 'walls')
    s.wall('West exterior bathroom south', -0.20, 4.57, 0.00, 5.51)
    s.wall('West exterior south', -0.20, 5.91, 0.00, 8.51)

    s.wall('East exterior bedroom north', 7.01, 0.20, 7.21, 2.05)
    s.wall('East exterior bedroom south', 7.01, 4.78, 7.21, 5.51)
    s.wall('Step wall', 7.21, 5.71, 7.81, 5.91)
    s.wall('East exterior living north', 7.81, 5.91, 8.01, 6.42)
    s.lintel('Terrace slider lintel', 7.81, 6.42, 8.01, 8.22)
    s.wall('East exterior living south', 7.81, 8.22, 8.01, 9.71)

    s.wall('South exterior west', 2.00, 9.91, 3.52, 10.11)
    s.lintel('Living panorama lintel', 3.52, 9.91, 7.47, 10.11)
    s.wall('South exterior east', 7.47, 9.91, 7.61, 10.11)
    s.wall('South-west return', 1.60, 8.91, 1.80, 9.71)
    s.wall('South-west wall', 0.00, 8.71, 1.60, 8.91)

    # interior partitions
    # Photo 0077 looks towards the bathroom-side end with west windows on right:
    # the hall opening is on the left, at the SOUTH end of the east partition.
    s.wall('Bedroom 1 east wall', 2.70, 0.00, 2.85, 2.80)
    s.lintel('Bedroom 1 door lintel', 2.70, 2.80, 2.85, 3.64)
    s.wall('Bedroom 1 south wall', 0.00, 3.64, 2.70, 3.84)
    s.door_leaf('Bedroom 1 open door', 1.88, 3.60, 2.70, 3.64)

    s.wall('Bathroom east wall north', 2.70, 3.84, 2.85, 4.00)
    s.lintel('Bathroom door lintel', 2.70, 4.00, 2.85, 4.80)
    s.wall('Bathroom east wall south', 2.70, 4.80, 2.85, 5.73)
    s.wall('Bathroom south wall', 0.00, 5.53, 2.70, 5.73)
    s.door_leaf('Bathroom open door', 1.92, 4.00, 2.70, 4.04, 'white')

    s.lintel('Bedroom 2 door lintel', 4.17, 0.00, 4.32, 1.00)
    s.wall('Bedroom 2 west wall', 4.17, 1.00, 4.32, 5.73)
    s.wall('Bedroom 2 south wall', 4.32, 5.53, 7.21, 5.73)
    s.door_leaf('Bedroom 2 open door', 4.32, 0.02, 5.32, 0.06)

    # -- glazing ---------------------------------------------------------
    s.glazing('Bedroom 2 panorama', 7.06, 2.05, 7.16, 4.78, mullions=[2.05, 2.94, 3.84, 4.74])
    s.glazing('Living south panorama', 3.52, 9.96, 7.47, 10.06, mullions=[3.52, 4.49, 5.47, 6.45, 7.43])
    s.rect('Living south transom', 3.52, 9.95, 7.47, 10.07, 0.045, 'dark', 2.22, 'glazing')
    s.glazing('Terrace two-panel slider', 7.86, 6.42, 7.96, 8.22, mullions=[6.42, 7.31, 8.18])
    def west_frame(name, z1, z2, bottom, top, divisions):
        # Local helper: unlike panorama glazing, these frames stop at their lintels.
        s.rect(name + ' base', -.15, z1, -.05, z2, .04, 'dark', bottom, 'glazing')
        s.rect(name + ' head', -.15, z1, -.05, z2, .04, 'dark', top - .04, 'glazing')
        for z in divisions:
            s.rect(name + ' mullion', -.15, z, -.05, z + .035, top - bottom, 'dark', bottom, 'glazing')

    west_frame('West bedroom balcony door', .30, 1.05, .02, 2.20, [.30, 1.015])
    # Open glazed leaf lies alongside the north wall, not across the threshold.
    s.rect('Balcony open leaf bottom', -.05, .30, .69, .34, .04, 'dark', .04, 'glazing')
    s.rect('Balcony open leaf top', -.05, .30, .69, .34, .04, 'dark', 2.14, 'glazing')
    s.rect('Balcony open leaf edge', .65, .30, .69, .34, 2.10, 'dark', .04, 'glazing')
    west_frame('West bedroom window', 1.05, 3.34, .92, 2.20, [1.05, 1.81, 2.57, 3.305])
    west_frame('Bathroom window', 3.95, 4.57, 1.18, 2.05, [3.95, 4.535])

    # west balcony rail
    s.glass_panel('West balcony glass', [(-0.80, 0.25), (-0.78, 0.25), (-0.78, 1.71), (-0.80, 1.71)])
    s.glass_panel('West balcony north glass', [(-0.80, 0.23), (-0.22, 0.23), (-0.22, 0.25), (-0.80, 0.25)])
    s.glass_panel('West balcony south glass', [(-0.80, 1.71), (-0.22, 1.71), (-0.22, 1.73), (-0.80, 1.73)])
    s.rect('West balcony handrail', -0.84, 0.22, -0.76, 1.74, 0.025, 'metal', 1.10, 'rail')
    s.rect('West balcony fascia', -0.94, 0.15, -0.78, 1.81, 0.24, 'white', -0.24, 'facade')
    s.rect('West balcony soffit', -0.94, 0.15, -0.78, 1.81, 0.24, 'white', CEILING, 'facade')

    # terrace rail follows the faceted edge
    edge = [(9.71, 5.71), (9.11, 11.02), (5.55, 11.62)]
    for a, b in zip(edge, edge[1:]):
        s.glass_panel('Terrace glass', [(a[0], a[1]), (b[0], b[1]), (b[0] - 0.03, b[1] - 0.03), (a[0] - 0.03, a[1] - 0.03)])
    s.band('Terrace handrail', edge, -0.04, 1.10, 0.025, 'metal', 'rail')
    s.band('Terrace white fascia', edge, 0.15, -0.24, 0.24, 'white')
    s.band('Terrace soffit', edge, 0.15, CEILING, 0.24, 'white')
    s.rect('Terrace facade pier', 9.60, 5.68, 9.78, 5.86, CEILING, 'white', group='facade')

    # -- bedroom 1 ---------------------------------------------------------
    # Proposed furniture, not as-built evidence: clear the south entry and west
    # approach to the existing balcony. Do not invent a wardrobe location.
    s.rect('Bed 1 frame', 0.70, 1.10, 2.68, 2.68, 0.32, 'wood')
    s.rect('Bed 1 headboard', 2.56, 1.05, 2.68, 2.73, 1.05, 'fabric')
    s.rect('Bed 1 mattress', 0.75, 1.15, 2.56, 2.63, 0.24, 'white', 0.32)
    s.rect('Bed 1 duvet', 0.77, 1.17, 2.12, 2.61, 0.08, 'fabric', 0.56)
    s.rect('Bed 1 pillow north', 2.16, 1.23, 2.48, 1.83, 0.13, 'white', 0.56)
    s.rect('Bed 1 pillow south', 2.16, 1.95, 2.48, 2.55, 0.13, 'white', 0.56)
    s.rect('Bed 1 nightstand north', 2.28, 0.65, 2.68, 1.05, 0.48, 'wood')
    s.oval('Bedroom 1 rug', 1.45, 1.92, 1.05, 0.95, 0.0, 0.018, 'rug')

    # -- bedroom 2 ---------------------------------------------------------
    s.rect('Bed 2 frame', 4.37, 2.14, 6.46, 3.73, 0.32, 'wood')
    s.rect('Bed 2 headboard', 4.37, 2.09, 4.49, 3.78, 1.05, 'fabric')
    s.rect('Bed 2 mattress', 4.49, 2.19, 6.41, 3.68, 0.24, 'white', 0.32)
    s.rect('Bed 2 duvet', 5.05, 2.21, 6.39, 3.66, 0.08, 'fabric', 0.56)
    s.rect('Bed 2 pillow north', 4.57, 2.27, 4.89, 2.87, 0.13, 'white', 0.56)
    s.rect('Bed 2 pillow south', 4.57, 3.00, 4.89, 3.60, 0.13, 'white', 0.56)
    s.rect('Bed 2 nightstand north', 4.37, 1.66, 4.77, 2.06, 0.48, 'wood')
    s.rect('Bed 2 nightstand south', 4.37, 3.81, 4.77, 4.21, 0.48, 'wood')
    s.rect('Wardrobe 2', 6.41, 0.28, 7.01, 1.62, 2.40, 'white')
    s.rect('Wardrobe 2 seam', 6.43, 0.94, 7.01, 0.96, 2.38, 'dark', 0.01)
    s.oval('Bedroom 2 rug', 5.55, 2.95, 1.05, 0.95, 0.0, 0.018, 'rug')

    # -- bathroom ------------------------------------------------------------
    # Furnishing concept follows the south-wall fixture row in the supplied plan.
    # The shell photos show ONE rectangular room; there are no interior partitions.
    tub_arc = [(0.95 * math.cos(t * math.pi / 24), 5.53 - 0.95 * math.sin(t * math.pi / 24)) for t in range(13)]
    basin_arc = [(0.12 + 0.70 * math.cos(t * math.pi / 24), 5.41 - 0.70 * math.sin(t * math.pi / 24)) for t in range(13)]
    outer = list(reversed([(0.00, 5.53)] + tub_arc))
    inner = list(reversed([(0.12, 5.41)] + basin_arc))
    s.slab('Corner bathtub shell', outer, 0.00, 0.12, 'white', 'furniture')
    for i in range(len(outer)):
        j = (i + 1) % len(outer)
        s.slab('Corner bathtub rim', [outer[i], outer[j], inner[j], inner[i]], .12, .43, 'white', 'furniture')
    s.slab('Corner bathtub basin', inner, .12, .025, 'tile', 'furniture')
    s.rect('Bathtub mixer', 0.03, 5.07, 0.08, 5.29, 0.22, 'metal', 0.54)
    s.rect('WC cistern', 1.10, 5.35, 1.48, 5.53, 0.78, 'white')
    s.oval('WC pedestal', 1.29, 5.17, 0.18, 0.14, 0.0, 0.38, 'white')
    s.oval('WC seat', 1.29, 5.11, 0.22, 0.23, 0.38, 0.055, 'white')
    s.oval('WC opening', 1.29, 5.10, 0.15, 0.15, 0.436, 0.005, 'dark')
    s.rect('Vanity', 1.90, 5.03, 2.66, 5.53, 0.75, 'wood')
    s.oval('Washbasin', 2.28, 5.28, 0.22, 0.17, 0.75, 0.12, 'white')
    s.rect('Mirror', 1.90, 5.50, 2.66, 5.52, 0.85, 'glass', 1.15)

    # -- kitchen -------------------------------------------------------------
    s.rect('Kitchen north base', 0.25, 5.73, 2.70, 6.33, 0.86, 'wood')
    s.rect('Kitchen north top', 0.23, 5.71, 2.70, 6.35, 0.045, 'white', 0.86)
    s.rect('Kitchen west base', 0.00, 6.35, 0.60, 7.55, 0.86, 'wood')
    s.rect('Kitchen west top', 0.00, 6.33, 0.62, 7.57, 0.045, 'white', 0.86)
    s.rect('Cooktop', 1.63, 5.80, 2.26, 6.26, 0.015, 'dark', 0.905)
    for bx, bz, r in [(1.79, 5.94, 0.07), (1.79, 6.13, 0.06), (2.10, 5.94, 0.07), (2.10, 6.13, 0.06)]:
        s.oval('Burner', bx, bz, r, r, 0.92, 0.005, 'metal')
    s.rect('Sink rim', 0.05, 6.60, 0.55, 7.30, 0.016, 'metal', 0.905)
    s.rect('Sink bowl 1', 0.09, 6.65, 0.51, 6.92, 0.019, 'dark', 0.92)
    s.rect('Sink bowl 2', 0.09, 6.98, 0.51, 7.25, 0.019, 'dark', 0.92)
    s.rect('Kitchen tap', 0.07, 6.93, 0.11, 6.97, 0.26, 'metal', 0.92)
    s.rect('Refrigerator', 0.00, 7.60, 0.68, 8.35, 2.05, '#dcd8cf')
    s.rect('Fridge handle', 0.68, 7.66, 0.70, 7.70, 0.60, 'metal', 0.95)

    # -- dining ---------------------------------------------------------------
    s.oval('Dining table top', 1.85, 7.35, 0.58, 0.58, 0.72, 0.04, 'wood')
    s.rect('Dining table stem', 1.78, 7.28, 1.92, 7.42, 0.72, 'dark')
    s.oval('Dining table foot', 1.85, 7.35, 0.30, 0.30, 0.0, 0.04, 'dark')
    for dx, dz in [(1.85, 6.62), (1.85, 8.08), (1.12, 7.35), (2.58, 7.35)]:
        s.oval('Dining chair', dx, dz, 0.22, 0.22, 0.44, 0.05, 'fabric')
        s.oval('Dining chair base', dx, dz, 0.06, 0.06, 0.0, 0.44, 'dark')

    # -- living room ------------------------------------------------------------
    s.rect('Living rug', 2.55, 6.72, 6.82, 9.18, 0.018, 'rug')
    s.rect('Sofa base', 3.59, 8.30, 5.63, 9.15, 0.30, 'wood')
    s.rect('Sofa back', 3.59, 9.01, 5.63, 9.15, 0.78, 'fabric')
    for x in (3.66, 4.33, 5.00):
        s.rect('Sofa cushion', x, 8.35, x + 0.60, 8.99, 0.18, 'fabric', 0.30)
    s.rect('Sofa west arm', 3.47, 8.30, 3.59, 9.15, 0.62, 'fabric')
    s.rect('Sofa east arm', 5.63, 8.30, 5.75, 9.15, 0.62, 'fabric')
    s.rect('Coffee table top', 3.93, 7.38, 5.19, 7.82, 0.05, 'wood', 0.36)
    for x in (3.97, 5.11):
        s.rect('Coffee table leg', x, 7.42, x + 0.05, 7.47, 0.36, 'dark')
        s.rect('Coffee table leg', x, 7.73, x + 0.05, 7.78, 0.36, 'dark')
    for ax in (2.58, 5.92):
        s.rect('Armchair base', ax, 7.30, ax + 0.75, 8.09, 0.30, 'wood')
        s.rect('Armchair seat', ax + 0.06, 7.36, ax + 0.69, 8.03, 0.16, 'fabric', 0.30)
    s.rect('Armchair back west', 2.58, 7.30, 2.70, 8.09, 0.72, 'fabric')
    s.rect('Armchair back east', 6.55, 7.30, 6.67, 8.09, 0.72, 'fabric')
    s.rect('Media console', 4.58, 5.73, 6.68, 6.05, 0.45, 'wood')
    s.rect('TV panel', 5.12, 5.73, 6.38, 5.77, 0.72, 'dark', 0.55)

    return s
