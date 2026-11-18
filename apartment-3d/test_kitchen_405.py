import unittest

from units import u40_5


class Kitchen405Test(unittest.TestCase):
    def setUp(self):
        self.scene = u40_5.build()

    def at(self, x, y, z, group):
        names = []
        for mesh in self.scene.objects:
            if mesh['group'] != group:
                continue
            x0, y0, z0, x1, y1, z1 = self.scene.bounds(mesh)
            if x0 < x < x1 and y0 < y < y1 and z0 < z < z1:
                names.append(mesh['name'])
        return names

    def test_sink_leg_is_open_toward_kitchen_and_backed_by_bathroom_wall(self):
        for z in (1.48, 1.74, 1.99):
            self.assertEqual(self.at(5.96, 1.35, z, 'walls'), [])
            self.assertEqual(self.at(6.58, 1.35, z, 'walls'), ['Bathroom west'])
        self.assertEqual(self.at(6.20, 1.35, 1.29, 'walls'), ['Bathroom service enclosure'])

    def test_sink_is_recessed_into_worktop_with_a_tap_above(self):
        self.assertIn('Kitchen return countertop', self.at(6.40, .88, 1.74, 'furniture'))
        self.assertFalse(any('countertop' in name for name in self.at(6.16, .88, 1.74, 'furniture')))
        self.assertIn('Sink bowl bottom', self.at(6.16, .75, 1.74, 'furniture'))
        self.assertTrue(any('Tap' in name for name in self.at(6.24, 1.11, 1.74, 'furniture')))
