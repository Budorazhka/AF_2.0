import importlib
import unittest

from build import MODULES


class WalkSurfaces(unittest.TestCase):
    def test_interior_floor_finishes_do_not_overlap(self):
        for module in MODULES:
            scene = importlib.import_module('units.' + module).build()
            floors = [o for o in scene.objects if o['group'] == 'floor'
                      and scene.bounds(o)[4] == 0 and len(o['v']) == 8]
            for i, first in enumerate(floors):
                a = scene.bounds(first)
                for second in floors[i + 1:]:
                    b = scene.bounds(second)
                    with self.subTest(module=module, pair=(first['name'], second['name'])):
                        self.assertTrue(any(min(a[k+3], b[k+3]) - max(a[k], b[k]) < 1e-6
                                            for k in (0, 2)))

    def test_appliance_faces_do_not_share_the_cabinet_front(self):
        for module in ('u28_3', 'u107_1', 'u113_7'):
            scene = importlib.import_module('units.' + module).build()
            parts = {o['name']: scene.bounds(o) for o in scene.objects}
            panel = parts['Appliance front']
            for o in scene.objects:
                if not o['name'].startswith('Kitchen cabinet base'):
                    continue
                b = scene.bounds(o)
                overlap = all(min(panel[k+3], b[k+3]) - max(panel[k], b[k]) > 1e-6 for k in (0, 1))
                self.assertFalse(overlap and abs(panel[5] - b[5]) < 1e-6, module)

    def test_panorama_has_support_across_its_full_width(self):
        from units import u81_8
        scene = u81_8.build()
        for z in (2.06, 3.4, 4.77):
            supports = [scene.bounds(o) for o in scene.objects if o['group'] != 'furniture']
            self.assertTrue(any(b[0] <= 7.035 <= b[3] and b[2] <= z <= b[5]
                                and b[1] < 0 <= b[4] for b in supports))

    def test_wardrobe_details_are_on_the_outside(self):
        for module in MODULES:
            scene = importlib.import_module('units.' + module).build()
            for seam in (o for o in scene.objects if 'wardrobe' in o['name'].lower()
                         and 'seam' in o['name'].lower()):
                name = seam['name'].split(' seam')[0]
                body = next(o for o in scene.objects if o['name'] in (name, name + ' closet'))
                a, b = scene.bounds(body), scene.bounds(seam)
                with self.subTest(module=module, seam=seam['name']):
                    self.assertTrue(any(b[k+3] <= a[k]+1e-6 or b[k] >= a[k+3]-1e-6 for k in (0, 2)))

    def test_corner_countertops_meet_at_the_edge(self):
        from units import u48_5
        scene = u48_5.build()
        parts = {o['name']: scene.bounds(o) for o in scene.objects}
        self.assertAlmostEqual(parts['Kitchen countertop'][5], parts['Kitchen return top'][2])


if __name__ == '__main__':
    unittest.main()
