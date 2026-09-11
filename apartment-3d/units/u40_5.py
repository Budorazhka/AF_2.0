"""Studio 40.5 m² (plan N405) — 35.7 m² interior, 4.8 m² balcony.

This unit was modelled before the units/ layout existed and its geometry is the one
the published Art Deco renders were drawn against, so it is preserved verbatim in
u40_5.scene.json rather than re-derived. Everything downstream — GLB, viewer, site
embed — is regenerated from that scene like any other unit.
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


def build():
    s = Scene()
    s.objects = json.loads((Path(__file__).with_name('u40_5.scene.json')).read_text(encoding='utf8'))
    # the kitchen return ran 10 cm into the bathroom service enclosure (wall ends at 6.03)
    for o in s.objects:
        if o['name'] == 'Kitchen return':
            for v in o['v']:
                v[0] = max(v[0], 6.03)
    return s
