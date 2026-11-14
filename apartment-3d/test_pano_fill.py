import unittest
import numpy as np
from pano_fill import VIEWS, camera_rays, pano_coordinates, project_directions, view_weight

class ProjectionTests(unittest.TestCase):
    def test_center_and_wrap(self):
        for az, pitch in [(270, 0), (45, -40), (0, -90)]:
            dirs = camera_rays(az, pitch, 3)
            u, v = pano_coordinates(dirs, 360, 180)
            self.assertAlmostEqual(float(v[1, 1]), (90-pitch)/180*180-0.5, places=4)
            if pitch != -90:
                self.assertAlmostEqual(float(u[1, 1]) % 360, ((270-az) % 360)-0.5 if az != 270 else 359.5, places=4)
            x, y, front = project_directions(dirs, az, pitch)
            self.assertTrue(np.all(front > 0))
            self.assertAlmostEqual(float(x[1,1]), 0, places=5)
            self.assertAlmostEqual(float(y[1,1]), 0, places=5)

    def test_weight_falls_to_zero_at_edge(self):
        weight = view_weight(np.array([0., .5, 1., 1.1]), np.zeros(4))
        self.assertGreater(weight[0], weight[1])
        self.assertEqual(weight[2], 0)
        self.assertEqual(weight[3], 0)

    def test_views_cover_full_requested_sphere(self):
        az = np.deg2rad(np.arange(360, dtype=np.float32))
        lat = np.deg2rad(np.arange(-89.5, 20, 1, dtype=np.float32))
        directions = np.empty((len(lat), len(az), 3), dtype=np.float32)
        directions[..., 0] = np.cos(lat)[:, None] * np.cos(az)[None, :]
        directions[..., 1] = np.cos(lat)[:, None] * np.sin(az)[None, :]
        directions[..., 2] = np.sin(lat)[:, None]
        weights = np.zeros(directions.shape[:2])
        for azimuth, pitch in VIEWS:
            x, y, front = project_directions(directions, azimuth, pitch)
            weights += view_weight(x, y) * (front > 0)
        self.assertTrue(np.all(weights > 0))

if __name__ == '__main__': unittest.main()
