import unittest

from units import u107_1


class Penthouse704Test(unittest.TestCase):
    def setUp(self):
        self.scene = u107_1.build()

    def covers(self, mesh, x, y, z):
        x0, y0, z0, x1, y1, z1 = self.scene.bounds(mesh)
        return x0 <= x <= x1 and y0 <= y <= y1 and z0 <= z <= z1

    def shell_at(self, x, y, z):
        return [mesh for mesh in self.scene.objects
                if (mesh['group'] == 'walls' or (mesh['group'] == 'glazing' and 'alpha' in mesh))
                and self.covers(mesh, x, y, z)]

    def test_second_bedroom_has_a_clear_route_to_the_balcony(self):
        for i in range(50, 81):
            z = i / 10
            for x in (5.06, 5.27, 5.48):
                with self.subTest(x=x, z=z):
                    self.assertFalse(self.shell_at(x, 1.6, z))
                    for mesh in self.scene.objects:
                        if mesh['group'] == 'furniture':
                            self.assertFalse(self.covers(mesh, x, 0.32, z), mesh['name'])
        self.assertFalse(any(mesh['name'].startswith('Wardrobe 2') for mesh in self.scene.objects))

    def test_first_bedroom_entrance_is_free_of_furniture(self):
        for i in range(24, 37):
            z = i / 10
            with self.subTest(z=z):
                self.assertFalse(self.shell_at(6.69, 1.6, z))
                for mesh in self.scene.objects:
                    if mesh['group'] == 'furniture':
                        self.assertFalse(self.covers(mesh, 6.69, 1.6, z), mesh['name'])

    def test_east_wall_has_a_window_and_a_door_in_the_rooms_on_the_plan(self):
        self.assertTrue(self.shell_at(10.31, 1.6, 4.92), 'solid dining room wall')
        self.assertFalse(self.shell_at(10.31, 1.6, 2.65), 'bedroom terrace door')
        east_window = self.shell_at(10.31, 1.6, 6.47)
        self.assertEqual([mesh['group'] for mesh in east_window], ['glazing'])

    def test_south_boundary_is_sealed_except_at_balcony_and_terrace_doors(self):
        for i in range(21, 102):
            x = i / 10
            with self.subTest(x=x):
                is_door = 4.87 < x < 5.60 or 9.24 < x < 10.00
                self.assertEqual(bool(self.shell_at(x, 1.6, 8.10)), not is_door)
                self.assertTrue(self.shell_at(x, 2.45, 8.10))

    def test_fixed_glazing_meets_the_finished_floor(self):
        for x, z in [(3.40, 8.02), (7.50, 8.02), (10.23, 6.47)]:
            with self.subTest(x=x, z=z):
                self.assertTrue(any(mesh['group'] == 'glazing' and self.covers(mesh, x, -0.01, z)
                                    for mesh in self.scene.objects))

    def test_entrance_threshold_meets_the_hall_floor(self):
        for x in (1.41, 1.80, 2.19):
            with self.subTest(x=x):
                self.assertTrue(self.shell_at(x, -0.01, 1.995))
