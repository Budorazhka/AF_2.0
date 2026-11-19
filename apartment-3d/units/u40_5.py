"""Studio 40.5 m² (plan N405) — 35.7 m² interior, 4.8 m² balcony.

The original geometry is stored in u40_5.scene.json. Plan corrections are applied
before exporting the GLB and the embedded viewer.
"""
import json
from pathlib import Path

from lib import Scene

UNIT = dict(
    slug='40-5',
    title='Студия 40,5 м²',
    eyebrow='AURUM FORT / РЕЗИДЕНЦИЯ 40,5',
    summary='35,7 м² интерьер · балкон 4,8 м²<br>Объёмная реконструкция · метры',
    notes=('<p>Контур снят с поэтажного плана IV этажа (резиденция №405). Внутренняя площадь 35,7 м², '
           'балкон 4,8 м², общая 40,5 м².</p>'
           '<p>Высота потолков 2,80 м, дверей 2,20 м. Несущие колонны 40×40 см, внешние стены 20 см.</p>'
           '<p>Г-образная студия: спальная зона в северо-западном углу, санузел — в северо-восточном, '
           'кухня во внутреннем углу, гостиная выходит на балкон с тонированным синим остеклением.</p>'),
)

FOOTPRINT = [
    (0.00, 0.00, 8.21, 2.80),
    (0.00, 2.80, 4.01, 6.00),
    (0.00, 6.00, 4.01, 7.81),   # balcony
]


def add_kitchen_fittings(s):
    counter = next(o for o in s.objects if o['name'] == 'Kitchen countertop')
    tall = next(o for o in s.objects if o['name'] == 'Kitchen tall unit')
    end_of_tall_unit = s.bounds(tall)[3]
    for o in s.objects:
        if o['name'] in ('Kitchen lower run', 'Kitchen countertop'):
            for vertex in o['v']:
                vertex[0] = max(vertex[0], end_of_tall_unit)
    corner_z = s.bounds(counter)[2]
    top_x, back_x, end_z = 5.895, 6.50, 1.36
    sink_left, sink_right, sink_near, sink_far = 5.96, 6.37, 1.48, 2.00
    s.rect('Kitchen return', 5.918, end_z, 6.488, corner_z, .72, 'wood')
    for suffix, x1, z1, x2, z2 in (
        ('', sink_right, end_z, back_x, corner_z),
        (' front', top_x, end_z, sink_left, corner_z),
        (' end', sink_left, end_z, sink_right, sink_near),
        (' corner', sink_left, sink_far, sink_right, corner_z),
    ):
        s.rect('Kitchen return countertop' + suffix, x1, z1, x2, z2, .045, 'white', .86)
        s.rect('Kitchen return base' + suffix, max(x1, 5.918), z1, min(x2, 6.488), z2, .14, 'wood', .72)

    rim = [(sink_left, sink_near), (sink_right, sink_near), (sink_right, sink_far), (sink_left, sink_far)]
    bottom = [(6.01, 1.53), (6.32, 1.53), (6.32, 1.95), (6.01, 1.95)]
    vertices = [[x, .905, z] for x, z in rim] + [[x, .75, z] for x, z in bottom]
    faces = []
    for i in range(4):
        j = (i + 1) % 4
        faces.extend([i, j + 4, j, i, i + 4, j + 4])
    s.mesh('Sink bowl sides', vertices, faces, '#52595a')
    s.slab('Sink bowl bottom', bottom, .74, .012, '#52595a', 'furniture')
    s.oval('Sink drain', 6.16, 1.74, .027, .027, .752, .003, 'metal', segments=16)
    s.oval('Tap stem', 6.43, 1.74, .016, .016, .905, .22, 'metal', segments=16)
    s.box('Tap spout', 6.15, 1.102, 1.727, .284, .026, .024, 'metal')
    s.oval('Tap outlet', 6.16, 1.74, .013, .013, 1.079, .025, 'metal', segments=16)

    s.rect('Cabinet front', top_x, 1.39, 5.918, 2.15, .73, 'wood', .10)
    s.box('Sink cabinet handle', 5.875, .742, 1.68, .025, .016, .125, 'metal')
    for x1, x2 in ((4.849, 5.384), (5.442, 5.885)):
        s.rect('Cabinet front', x1, corner_z, x2, 2.209, .68, 'wood', .10)
    for y, height, handle_y in ((.10, .65, .54), (.758, 1.377, .84)):
        s.rect('Cabinet front', 4.225, 2.183, 4.81, 2.209, height, 'wood', y)
        s.box('Fridge handle', 4.751, handle_y, 2.159, .018, .16, .026, 'metal')


def build():
    s = Scene()
    s.objects = json.loads((Path(__file__).with_name('u40_5.scene.json')).read_text(encoding='utf8'))
    for o in s.objects:
        if o['name'] == 'Balcony slab':
            for v in o['v']:
                if abs(v[2] - 6.13) < 0.02:
                    v[2] = 6.00
        elif o['name'] in ('West exterior', 'Living east exterior'):
            for v in o['v']:
                if abs(v[2] - 6.00) < 0.02:
                    v[2] = 6.128
    # The unhatched edge on the plan is the sink cabinet front, not a wall.
    replaced = {'Bathroom service enclosure side', 'Kitchen return', 'Kitchen return countertop',
                'Cabinet front', 'Sink rim', 'Sink bowl', 'Tap', 'Entrance open door', 'Balcony open door'}
    s.objects = [o for o in s.objects if o['name'] not in replaced]
    add_kitchen_fittings(s)
    s.entrance_door()
    s.glazed_door_leaf('Balcony open door', 3.90, 5.33, 3.94, 5.98, 'metal')
    return s
