import unittest

from units import u113_7


class Terrace604Test(unittest.TestCase):
    def test_terrace_furniture_leaves_a_landing_by_the_door(self):
        scene = u113_7.build()
        intrusions = []
        for mesh in scene.objects:
            if mesh['group'] != 'furniture':
                continue
            x0, _, z0, x1, _, z1 = scene.bounds(mesh)
            if min(x1, 9.66) > max(x0, 8.41) and min(z1, 4.80) > max(z0, 3.80):
                intrusions.append(mesh['name'])
        self.assertEqual(intrusions, [])
