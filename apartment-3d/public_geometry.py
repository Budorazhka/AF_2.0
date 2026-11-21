"""Batched, textured GLBs for the public spaces. Dimensions and UV periods are metres."""

import io
import json
import math
import struct
from collections import defaultdict

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter
from lib import ROOT, Scene

MATERIALS = ROOT.parent / "assets/residences/materials"
# sRGB tint, roughness, metalness, texture, repeat width and height in metres.
FINISH = {
    "nero": ("#dfdde0", 0.26, 0.10, "common/nero", 1.0, 1.9),
    "basalt": ("#666973", 0.46, 0.07, "black-sea-modern/travertine", 1.2, 0.75),
    "travertine": ("#fae2c7", 0.47, 0.02, "black-sea-modern/travertine", 1.3, 2.6),
    "ivory": ("#fff3e4", 0.56, 0, "art-deco/lime-plaster", 2.4, 2.4),
    "limestone": ("#f2ece0", 0.45, 0.03, "black-sea-modern/travertine", 1.4, 1.4),
    "oak": ("#c69a6e", 0.49, 0, "black-sea-modern/oak-veneer", 1, 1.8),
    "linen": ("#fff4df", 0.89, 0, "art-deco/linen", 0.5, 0.5),
    "sign": ("#ffffff", 0.86, 0, "common/reception-sign", 1, 1),
    "glass": ("#dbeef0", 0.09, 0.15, None, 1, 1),
    "crystal": ("#edf3ed", 0.055, 0.34, None, 1, 1),
    "frame": ("#27292a", 0.33, 0.40, None, 1, 1),
    "bronze": ("#b08a55", 0.28, 0.64, None, 1, 1),
    "chrome": ("#c5ccd2", 0.17, 0.82, None, 1, 1),
    "leaf": ("#517048", 0.46, 0.01, None, 1, 1),
    "light": ("#fff2d9", 0.4, 0, None, 1, 1),
    "water": ("#549ca4", 0.14, 0.28, None, 1, 1),
    "satin": ("#c6c0b7", 0.24, 0.42, None, 1, 1),
    "mosaic": ("#709598", 0.34, 0.07, "black-sea-modern/travertine", 0.13, 0.13),
    "teak": ("#bfa88f", 0.60, 0, "black-sea-modern/oak-veneer", 1.2, 4.0),
    "walnut": ("#886247", 0.39, 0, "black-sea-modern/oak-veneer", 0.85, 1.6),
    "leather": ("#746251", 0.65, 0.02, "art-deco/linen", 0.23, 0.23),
    "slate": ("#948c83", 0.54, 0.04, "common/nero", 1.5, 2.1),
    "dining-stone": ("#ffffff", 0.35, 0.13, None, 2.1, 1.45),
    "bottle": ("#566448", 0.16, 0.23, None, 1, 1),
    "porcelain": ("#f6eee2", 0.24, 0.02, None, 1, 1),
    "pool-tile": ("#4e969d", 0.39, 0.02, "black-sea-modern/travertine", 0.5, 0.5),
    "kitchen-tile": ("#d5ccc0", 0.4, 0.02, "black-sea-modern/travertine", 0.60, 0.60),
}


class PublicScene(Scene):
    def __init__(self, height):
        super().__init__()
        self.height = height
        self.floors, self.barriers, self.views = [], [], []
        self.floor_triangles = []

    def part(self, finish, x, z, w, d, y, h, *, solid=False):
        if solid:
            self.barriers.append([x, z, x + w, z + d])
        return self.box(finish, x, y, z, w, d, h, "#ffffff")

    def floor(self, x, z, x2, z2, finish):
        self.floors.append([x, z, x2, z2])
        self.part(finish, x, z, x2 - x, z2 - z, -0.14, 0.14)
        self.part("ivory", x, z, x2 - x, z2 - z, self.height, 0.10)

    def partition(self, x, z, x2, z2, finish="ivory"):
        self.part(finish, x, z, x2 - x, z2 - z, 0, self.height, solid=True)

    def tube(self, finish, a, b, radius):
        dx, dy, dz = (v - u for u, v in zip(a, b))
        length = math.hypot(dx, dy, dz)
        axis = (dx / length, dy / length, dz / length)
        horizontal = math.hypot(dx, dz)
        u = (dz / horizontal, 0, -dx / horizontal) if horizontal else (1, 0, 0)
        v = (axis[1] * u[2], axis[2] * u[0] - axis[0] * u[2], -axis[1] * u[0])
        pts = [
            [
                p[k] + radius * (u[k] * math.cos(t * math.tau / 12) + v[k] * math.sin(t * math.tau / 12))
                for k in range(3)
            ]
            for p in (a, b)
            for t in range(12)
        ]
        tri = []
        for i in range(12):
            j = (i + 1) % 12
            tri.extend((i, j, i + 12, j, j + 12, i + 12))
        self.mesh(finish, pts, tri, "#ffffff")

    def view(self, title, eye, target, pitch=-0.09, render=None, key=None):
        self.views.append(dict(title=title, eye=eye, target=target, pitch=pitch, render=render))
        if key:
            self.views[-1]["key"] = key

    def export(self):
        # Keep one draw call per finish while preserving individual collisions.
        merged = Scene()
        batches = defaultdict(list)
        for obj in self.objects:
            batches[obj["name"]].append(obj)
        for name, objects in batches.items():
            points, indices = [], []
            for obj in objects:
                indices.extend(i + len(points) for i in obj["i"])
                points.extend(obj["v"])
            merged.mesh(name, points, indices, "#ffffff")
        raw = merged.glb()
        (size,) = struct.unpack_from("<I", raw, 12)
        g = json.loads(raw[20 : 20 + size])
        buf = bytearray(raw[28 + size :])
        g.update(
            images=[], textures=[], samplers=[dict(magFilter=9729, minFilter=9987, wrapS=10497, wrapT=10497)]
        )
        g["scenes"][0]["extras"] = dict(views=self.views, floorRects=self.floors, barriers=self.barriers)
        if self.floor_triangles:
            g["scenes"][0]["extras"]["floorTriangles"] = self.floor_triangles
        for mesh, mat in zip(g["meshes"], g["materials"]):
            name = mesh["name"]
            tint, rough, metal, path, w, h = FINISH[name]
            pbr = mat["pbrMetallicRoughness"]
            tint_linear = [(int(tint[i : i + 2], 16) / 255) ** 2.2 for i in (1, 3, 5)]
            opacity = {"glass": 0.075, "crystal": 0.34, "water": 0.84}.get(name, 1)
            pbr.update(
                baseColorFactor=tint_linear + [opacity],
                roughnessFactor=rough,
                metallicFactor=metal,
            )
            if opacity < 1:
                mat["alphaMode"] = "BLEND"
            if name == "light":
                mat["emissiveFactor"] = [1, 0.87, 0.68]
            attr = mesh["primitives"][0]["attributes"]

            def triples(key):
                accessor = g["accessors"][attr[key]]
                start = g["bufferViews"][accessor["bufferView"]]["byteOffset"]
                return list(struct.iter_unpack("<3f", buf[start : start + accessor["count"] * 12]))

            pts = triples("POSITION")
            normals = triples("NORMAL")
            if name == "sign":
                sign_right = max(p[0] for p in pts)
                sign_bottom = min(p[1] for p in pts)
                sign_width = sign_right - min(p[0] for p in pts)
                sign_height = max(p[1] for p in pts) - sign_bottom
            uv = []
            for (x, y, z), (nx, ny, nz) in zip(pts, normals):
                if name == "sign":
                    u, v = (sign_right - x) / sign_width, (y - sign_bottom) / sign_height
                elif abs(ny) >= max(abs(nx), abs(nz)):
                    u, v = x, z
                elif abs(nx) > abs(nz):
                    u, v = z, y
                else:
                    u, v = x, y
                uv.extend((u / w, 1 - v / h))
            start = len(buf)
            buf.extend(struct.pack("<" + "f" * len(uv), *uv))
            attr["TEXCOORD_0"] = len(g["accessors"])
            g["accessors"].append(
                dict(bufferView=len(g["bufferViews"]), componentType=5126, count=len(pts), type="VEC2")
            )
            g["bufferViews"].append(dict(buffer=0, byteOffset=start, byteLength=len(buf) - start, target=34962))
            if path or name == "dining-stone":
                if name == "dining-stone":
                    # Unobstructed stone surface above the tables in the project's dining reference.
                    with Image.open(ROOT.parent / "assets/img/24_upscaled.webp") as reference:
                        im = reference.crop((123, 12, 825, 312)).convert("RGB")
                else:
                    im = Image.open(MATERIALS / (path + ".webp")).convert("RGB")
                im.thumbnail((768, 768))
                if name == "teak":
                    seams = ImageDraw.Draw(im)
                    for i in range(8):
                        x = i * im.width // 8
                        z = (i * 3 % 8) * im.height // 8
                        seams.line((x, 0, x, im.height), fill="#77614e", width=2)
                        seams.line((x, z, x + im.width // 8, z), fill="#887969", width=1)
                if name == "leather":
                    im = ImageEnhance.Contrast(im.filter(ImageFilter.GaussianBlur(1.2))).enhance(0.4)
                if name == "kitchen-tile":
                    grout = ImageDraw.Draw(im)
                    for i in range(2):
                        x = i * im.width // 2
                        y = i * im.height // 2
                        grout.line((x, 0, x, im.height), fill="#a7a29a", width=3)
                        grout.line((0, y, im.width, y), fill="#a7a29a", width=3)
                if name in ("basalt", "limestone", "mosaic", "pool-tile"):
                    ink = ImageDraw.Draw(im)
                    ink.line((0, 0, im.width, 0), fill="#8e8a84", width=2)
                    ink.line((0, 0, 0, im.height), fill="#8e8a84", width=2)
                stream = io.BytesIO()
                im.save(stream, format="JPEG", quality=86)
                data = stream.getvalue()
                g["images"].append(dict(bufferView=len(g["bufferViews"]), mimeType="image/jpeg"))
                g["bufferViews"].append(dict(buffer=0, byteOffset=len(buf), byteLength=len(data)))
                buf.extend(data)
                buf.extend(bytes(-len(buf) % 4))
                pbr["baseColorTexture"] = dict(index=len(g["textures"]))
                g["textures"].append(dict(sampler=0, source=len(g["images"]) - 1))
        g["buffers"][0]["byteLength"] = len(buf)
        js = json.dumps(g, separators=(",", ":")).encode()
        js += b" " * (-len(js) % 4)
        return (
            struct.pack("<III", 0x46546C67, 2, 28 + len(js) + len(buf))
            + struct.pack("<I4s", len(js), b"JSON")
            + js
            + struct.pack("<I4s", len(buf), b"BIN\0")
            + buf
        )
