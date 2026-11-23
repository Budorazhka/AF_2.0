"""The public-floor tour must spawn on a dry floor and outside its obstacles."""

import json
import struct
import unittest
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

from public_floors import build, SPA_POOL


class PublicFloorTests(unittest.TestCase):
    def test_side_stair_entrance_is_clear_and_flight_returns(self):
        for level in (-1, 1):
            scene = build(level)
            for x in (9.7, 9.37, 9.0, 8.85):
                self.assertFalse(any(a - 0.22 < x < c + 0.22 and b - 0.22 < 14.7 < d + 0.22
                                     for a, b, c, d in scene.barriers), (level, x))
            self.assertTrue(any(obj['name'] == 'limestone'
                                and 5.3 <= scene.bounds(obj)[0] < 8.5
                                and 15.2 <= scene.bounds(obj)[2] < 16.4
                                and scene.bounds(obj)[4] >= scene.height - 0.20
                                for obj in scene.objects), level)

    def test_spa_outdoor_terrace_is_accessible_around_pool(self):
        scene = build(-1)
        def free(x, z):
            return (any(a <= x <= c and b <= z <= d for a, b, c, d in scene.floors)
                    and not any(a - 0.22 < x < c + 0.22 and b - 0.22 < z < d + 0.22
                                for a, b, c, d in scene.barriers))

        for z in (30.3, 30.73, 31.1):
            self.assertTrue(free(23.95, z), (23.95, z))
        self.assertTrue(free(21.7, 34.0))
        self.assertFalse(free(16.0, 34.0))
        mask = Image.new('L', (660, 800))
        draw = ImageDraw.Draw(mask)
        for a, b, c, d in scene.floors:
            draw.rectangle((round(a * 20), round(b * 20), round(c * 20), round(d * 20)), fill=255)
        for a, b, c, d in scene.barriers:
            draw.rectangle((round(a * 20), round(b * 20), round(c * 20), round(d * 20)), fill=0)
        mask = mask.filter(ImageFilter.MinFilter(11))
        ImageDraw.floodfill(mask, (round(28.04 * 20), round(20.35 * 20)), 128)
        self.assertEqual(mask.getpixel((round(21.7 * 20), round(34.0 * 20))), 128)

    def test_spa_door_is_clear_of_poolside_column(self):
        scene = build(-1)
        # The 25.72 m structural column must not overlap the doorway at z=18.06.
        for x, z in [(24.85, 17.70), (24.85, 18.06), (24.85, 18.40)]:
            self.assertFalse(any(a - 0.22 < x < c + 0.22 and b - 0.22 < z < d + 0.22
                                 for a, b, c, d in scene.barriers), (x, z))

    def test_lobby_terrace_railing_reaches_reception_wall(self):
        scene = build(1)
        for z in (28.4, 29.2, 30.1):
            self.assertTrue(any(a <= 13.45 <= c and b <= z <= d
                                for a, b, c, d in scene.barriers), z)
            self.assertTrue(any(obj['name'] == 'basalt'
                                and scene.bounds(obj)[0] <= 13.45 <= scene.bounds(obj)[3]
                                and scene.bounds(obj)[2] <= z <= scene.bounds(obj)[5]
                                and scene.bounds(obj)[4] >= 0.70
                                for obj in scene.objects), z)

    def test_lobby_ceiling_clears_second_storey_slab(self):
        scene = build(1)
        data = json.loads((Path(__file__).resolve().parent.parent /
                           'assets/data/building-3d.json').read_text(encoding='utf-8'))
        lobby = next(level for level in data['levels'] if level['level'] == 1)
        slab_bottom = lobby['height'] - 0.30
        for x, z in [(9.0, 24.0), (20.0, 12.0), (8.0, 12.0), (16.5, 8.0)]:
            ceilings = [scene.bounds(obj) for obj in scene.objects if obj['name'] == 'ivory'
                        and scene.bounds(obj)[0] < x < scene.bounds(obj)[3]
                        and scene.bounds(obj)[2] < z < scene.bounds(obj)[5]
                        and slab_bottom - 0.15 <= scene.bounds(obj)[1] <= slab_bottom]
            self.assertTrue(ceilings, (x, z))
            for ceiling in ceilings:
                self.assertLessEqual(ceiling[1], slab_bottom - 0.02, (x, z, ceiling))

    def test_lobby_stairs_and_terrace_do_not_block_their_entrances(self):
        scene = build(1)

        def clear(x, z):
            return not any(a - 0.22 < x < c + 0.22 and b - 0.22 < z < d + 0.22
                           for a, b, c, d in scene.barriers)

        # Door from the restaurant opens under the high end of the return flight.
        for z in (10.2, 9.94, 9.5):
            self.assertTrue(clear(18.0, z), (18.0, z))
        for obj in scene.objects:
            a, y0, b, c, y1, d = scene.bounds(obj)
            if a < 18.0 < c and b < 9.2 < d and len(obj['v']) == 8:
                left = min(v[1] for v in obj['v'] if abs(v[0] - a) < 1e-6)
                right = min(v[1] for v in obj['v'] if abs(v[0] - c) < 1e-6)
                y0 = left + (right - left) * (18.0 - a) / (c - a)
            self.assertFalse(a < 18.0 < c and b < 9.2 < d and y0 < 2.1 and y1 > 0.05,
                             (obj['name'], scene.bounds(obj)))
        # Reception-to-terrace doorway and the paved area beyond it.
        for x in (10.9, 11.36, 11.8, 12.3):
            self.assertTrue(clear(x, 21.0), (x, 21.0))
            self.assertTrue(any(a <= x <= c and b <= 21.0 <= d for a, b, c, d in scene.floors))

        # The side stair has a return flight reaching the next floor.
        self.assertTrue(any(obj['name'] == 'limestone' and
                            5.3 <= scene.bounds(obj)[0] < 8.5 and
                            15.2 <= scene.bounds(obj)[2] < 16.4 and
                            scene.bounds(obj)[4] >= 3.1
                            for obj in scene.objects))

    def test_treadmill_bases_reach_the_gym_floor(self):
        scene = build(-1)
        for x in (6.5, 8.35, 10.2):
            bases = [
                scene.bounds(obj)
                for obj in scene.objects
                if obj["name"] == "frame"
                and abs(scene.bounds(obj)[0] - (x - 0.4)) < 0.001
                and abs(scene.bounds(obj)[2] - 24.35) < 0.001
            ]
            self.assertEqual(len(bases), 1)
            self.assertAlmostEqual(bases[0][1], 0)

    def test_walking_routes_connect_public_viewpoints(self):
        # Check the connecting passages with 25 cm clearance for the 22 cm avatar.
        def pixel(x, z):
            return round(x * 20), round(z * 20)

        for level in (1, 8):
            scene = build(level)
            mask = Image.new("L", (660, 650))
            draw = ImageDraw.Draw(mask)
            for a, b, c, d in scene.floors:
                draw.rectangle([pixel(a, b), pixel(c, d)], fill=255)
            for a, b, c, d, e, f in scene.floor_triangles:
                draw.polygon([pixel(a, b), pixel(c, d), pixel(e, f)], fill=255)
            for a, b, c, d in scene.barriers:
                draw.rectangle([pixel(a, b), pixel(c, d)], fill=0)
            mask = mask.filter(ImageFilter.MinFilter(11))
            start = pixel(*scene.views[0]["eye"])
            self.assertEqual(mask.getpixel(start), 255)
            ImageDraw.floodfill(mask, start, 128)
            for view in scene.views:
                self.assertEqual(mask.getpixel(pixel(*view["eye"])), 128, view["title"])
            if level == 1:
                self.assertEqual(mask.getpixel(pixel(12.3, 21.0)), 128, "terrace entrance")
                self.assertEqual(mask.getpixel(pixel(15.0, 25.0)), 128, "terrace tables")
                for x, z in [(22.6, 17.5), (22.6, 18.07), (22.6, 18.7)]:
                    self.assertEqual(mask.getpixel(pixel(x, z)), 128, "restaurant terrace door")

    def test_roof_pool_and_drop_are_outside_the_walkable_deck(self):
        roof = build(8)
        self.assertGreaterEqual(len(roof.views), 3)

        def on_deck(x, z):
            for ax, az, bx, bz, cx, cz in roof.floor_triangles:
                sides = [
                    (bx - ax) * (z - az) - (bz - az) * (x - ax),
                    (cx - bx) * (z - bz) - (cz - bz) * (x - bx),
                    (ax - cx) * (z - cz) - (az - cz) * (x - cx),
                ]
                if min(sides) >= -1e-8 or max(sides) <= 1e-8:
                    return True
            return False

        for x, z in [(18, 17), (17.42, 19.44), (14.5, 23), (12, 31)]:
            self.assertFalse(on_deck(x, z), (x, z))
        for view in roof.views:
            x, z = view["eye"]
            self.assertTrue(on_deck(x, z))
            self.assertFalse(
                any(a - 0.22 < x < c + 0.22 and b - 0.22 < z < d + 0.22 for a, b, c, d in roof.barriers)
            )

    def test_dining_room_and_open_kitchen_have_distinct_accessible_views(self):
        scene = build(1)
        views = {v.get("key"): v for v in scene.views}
        for key in ("restaurant", "kitchen"):
            self.assertIn(key, views)
        self.assertNotEqual(views["restaurant"]["eye"], views["kitchen"]["eye"])
        # Door in the partition between the dining room and service hall.
        self.assertFalse(
            any(a - 0.22 < 17.29 < c + 0.22 and b - 0.22 < 12.95 < d + 0.22 for a, b, c, d in scene.barriers)
        )

    def test_models_preserve_viewpoints_textures_and_walkable_pool_surround(self):
        for level in (-1, 1):
            scene = build(level)
            raw = scene.export()
            (length,) = struct.unpack_from("<I", raw, 12)
            gltf = json.loads(raw[20 : 20 + length])
            self.assertTrue(gltf["images"])
            self.assertTrue(all("TEXCOORD_0" in mesh["primitives"][0]["attributes"] for mesh in gltf["meshes"]))
            meta = gltf["scenes"][0]["extras"]

            def dry(x, z):
                return any(a <= x <= c and b <= z <= d for a, b, c, d in meta["floorRects"])

            for view in meta["views"]:
                x, z = view["eye"]
                self.assertTrue(dry(x, z), view)
                for a, b, c, d in meta["barriers"]:
                    self.assertFalse(a - 0.22 < x < c + 0.22 and b - 0.22 < z < d + 0.22, view)
            if level == -1:
                a, b, c, d = SPA_POOL
                self.assertFalse(dry((a + c) / 2, (b + d) / 2))
                self.assertTrue(dry(a - 0.5, (b + d) / 2))
                self.assertTrue(dry(c + 0.5, (b + d) / 2))
                self.assertIn(list(SPA_POOL), meta["barriers"])
                self.assertNotIn("stairOpenings", meta)
            else:
                def cut_out(x, z):
                    return any(a < x < c and b < z < d for a, b, c, d in meta["stairOpenings"])

                self.assertTrue(cut_out(7.5, 15.7))
                self.assertTrue(cut_out(18.2, 9.2))
                self.assertFalse(cut_out(8.9, 15.7))  # Upper landing
                self.assertFalse(cut_out(22.6, 17.0))  # Restaurant ceiling


if __name__ == "__main__":
    unittest.main()
