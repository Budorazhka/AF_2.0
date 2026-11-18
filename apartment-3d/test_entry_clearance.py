import unittest

from units import u26_1, u28_3, u40_5, u48_5, u66_0, u81_8, u107_1, u113_7


# Rectangles in plan metres for the first 1.05 m inside each entrance.
LANDINGS = (
    (u26_1, (3.96, 3.15, 5.01, 4.05)),
    (u28_3, (2.00, 0.00, 2.93, 1.05)),
    (u40_5, (3.00, 0.00, 4.01, 1.05)),
    (u48_5, (4.05, 4.96, 4.96, 6.01)),
    (u66_0, (0.00, 0.20, 1.05, 1.10)),
    (u81_8, (3.09, 0.00, 4.08, 1.05)),
    (u107_1, (1.34, 2.00, 2.26, 3.05)),
    (u113_7, (1.00, 0.30, 2.05, 1.15)),
)


class EntryClearanceTest(unittest.TestCase):
    def furniture_in(self, scene, left, near, right, far):
        intrusions = []
        for mesh in scene.objects:
            if mesh['group'] != 'furniture' or 'door' in mesh['name'].lower():
                continue
            x0, _, z0, x1, height, z1 = scene.bounds(mesh)
            overlap_x = min(x1, right) - max(x0, left)
            overlap_z = min(z1, far) - max(z0, near)
            if height > 0.21 and overlap_x > 0.025 and overlap_z > 0.025:
                intrusions.append(mesh['name'])
        return intrusions

    def test_entrance_landings_are_free_of_furniture(self):
        for model, landing in LANDINGS:
            with self.subTest(plan=model.UNIT['slug']):
                self.assertEqual(self.furniture_in(model.build(), *landing), [])

    def test_48_5_bathroom_has_a_clear_landing(self):
        self.assertEqual(self.furniture_in(u48_5.build(), 3.18, 5.24, 3.70, 5.68), [])
