"""Geometry primitives and glTF export shared by every Aurum Fort apartment model.

Coordinates are metres: X east, Z south, Y up. Origin is the interior north-west
corner of each unit, matching the structural grid of the IV floor plan
(aurum-fort-floor-plans.pdf, 0.40 m columns = scale reference).
"""
import json
import math
import re
import struct
from pathlib import Path

CEILING = 2.80
DOOR_H = 2.20

COLORS = {
    'wall': '#ece8df',
    'column': '#ded8cc',
    'floor': '#c5a783',
    'wood': '#947657',
    'fabric': '#a7b1a3',
    'white': '#faf7ef',
    'dark': '#3b4547',
    'metal': '#798d90',
    'tile': '#d2d8d4',
    'glass': '#a9c6cb',
    'rug': '#ddd6c6',
    'blue_glass': '#163e59',
}

ROOT = Path(__file__).resolve().parent


class Scene:
    def __init__(self):
        self.objects = []

    # -- primitives -------------------------------------------------------
    def mesh(self, name, v, idx, c, group='furniture'):
        self.objects.append(dict(name=name, v=v, i=idx, c=COLORS.get(c, c), group=group))
        return self.objects[-1]

    def box(self, name, x, y, z, w, d, h, c, group='furniture'):
        v = [
            [x, y, z], [x + w, y, z], [x + w, y, z + d], [x, y, z + d],
            [x, y + h, z], [x + w, y + h, z], [x + w, y + h, z + d], [x, y + h, z + d],
        ]
        order = [
            0, 2, 1, 0, 3, 2,
            4, 5, 6, 4, 6, 7,
            0, 1, 5, 0, 5, 4,
            1, 2, 6, 1, 6, 5,
            2, 3, 7, 2, 7, 6,
            3, 0, 4, 3, 4, 7,
        ]
        flipped = [q for k in range(0, len(order), 3) for q in (order[k], order[k + 2], order[k + 1])]
        return self.mesh(name, v, flipped, c, group)

    def rect(self, name, x1, z1, x2, z2, h, c='wall', y=0.0, group='furniture'):
        return self.box(name, min(x1, x2), y, min(z1, z2), abs(x2 - x1), abs(z2 - z1), h, c, group)

    def wall(self, name, x1, z1, x2, z2, h=CEILING, c='wall'):
        return self.rect(name, x1, z1, x2, z2, h, c, 0, 'walls')

    def column(self, name, x1, z1, x2, z2):
        return self.rect(name, x1, z1, x2, z2, CEILING, 'column', 0, 'walls')

    def lintel(self, name, x1, z1, x2, z2, door=DOOR_H):
        """Wall stub above a door opening."""
        return self.rect(name, x1, z1, x2, z2, CEILING - door, 'wall', door, 'walls')

    def door_leaf(self, name, x1, z1, x2, z2, c='wood'):
        return self.rect(name, x1, z1, x2, z2, DOOR_H, c, 0, 'furniture')

    def slab(self, name, pts, y, h, c, group='floor'):
        n = len(pts)
        v = [[x, yy, z] for yy in (y, y + h) for x, z in pts]
        idx = []
        for j in range(1, n - 1):
            idx.extend([n, n + j + 1, n + j, 0, j, j + 1])
        for j in range(n):
            k = (j + 1) % n
            idx.extend([j, k, n + k, j, n + k, n + j])
        return self.mesh(name, v, idx, c, group)

    def band(self, name, pts, width, y, h, c, group='facade'):
        """Follow a polyline with a constant-width strip.

        slab() fans its cap triangles from the first vertex, which is only valid for
        convex outlines, so a long thin band has to be emitted segment by segment.
        """
        for a, b in zip(pts, pts[1:]):
            dx, dz = b[0] - a[0], b[1] - a[1]
            length = math.hypot(dx, dz) or 1
            nx, nz = -dz / length * width, dx / length * width
            self.slab(name, [(a[0], a[1]), (b[0], b[1]), (b[0] + nx, b[1] + nz), (a[0] + nx, a[1] + nz)],
                      y, h, c, group)

    def oval(self, name, x, z, rx, rz, y, h, c, segments=32):
        pts = [(x + rx * math.cos(t * math.tau / segments), z + rz * math.sin(t * math.tau / segments))
               for t in range(segments)]
        return self.slab(name, pts, y, h, c, 'furniture')

    def glass_panel(self, name, pts, y=0.08, h=1.02):
        o = self.slab(name, pts, y, h, COLORS['blue_glass'], 'rail')
        o['alpha'] = 0.82
        return o

    def glazing(self, name, x1, z1, x2, z2, mullions=(), thickness=0.10):
        """Floor-to-ceiling window band with a base rail, top rail and mullions."""
        horizontal = abs(x2 - x1) >= abs(z2 - z1)
        self.rect(name + ' base', x1, z1, x2, z2, 0.10, 'dark', 0, 'glazing')
        self.rect(name + ' head', x1, z1, x2, z2, 0.06, 'dark', CEILING - 0.06, 'glazing')
        for m in mullions:
            if horizontal:
                self.rect(name + ' mullion', m, z1, m + 0.04, z2, CEILING, 'dark', 0, 'glazing')
            else:
                self.rect(name + ' mullion', x1, m, x2, m + 0.04, CEILING, 'dark', 0, 'glazing')

    # -- checks -----------------------------------------------------------
    def bounds(self, o):
        xs = [p[0] for p in o['v']]
        ys = [p[1] for p in o['v']]
        zs = [p[2] for p in o['v']]
        return (min(xs), min(ys), min(zs), max(xs), max(ys), max(zs))

    def clashes(self, tolerance=0.02, min_volume=0.004):
        """Furniture that pushes into structure. Catches 'a column stands in the cooktop'."""
        structural = [o for o in self.objects if o['group'] in ('walls', 'glazing')]
        loose = [o for o in self.objects if o['group'] == 'furniture']
        out = []
        for a in loose:
            ax0, ay0, az0, ax1, ay1, az1 = self.bounds(a)
            for b in structural:
                bx0, by0, bz0, bx1, by1, bz1 = self.bounds(b)
                ox = min(ax1, bx1) - max(ax0, bx0) - tolerance
                oy = min(ay1, by1) - max(ay0, by0) - tolerance
                oz = min(az1, bz1) - max(az0, bz0) - tolerance
                if ox > 0 and oy > 0 and oz > 0 and ox * oy * oz > min_volume:
                    out.append((a['name'], b['name'], round(ox, 3), round(oz, 3), round(ox * oy * oz, 4)))
        return out

    def outside(self, footprint, margin=0.05):
        """Furniture whose centre falls outside the habitable footprint polygons."""
        out = []
        for o in self.objects:
            if o['group'] != 'furniture':
                continue
            x0, _, z0, x1, _, z1 = self.bounds(o)
            cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
            if not any(px0 - margin <= cx <= px1 + margin and pz0 - margin <= cz <= pz1 + margin
                       for px0, pz0, px1, pz1 in footprint):
                out.append((o['name'], round(cx, 2), round(cz, 2)))
        return out

    # -- export -----------------------------------------------------------
    def glb(self):
        def rgb(c):
            return [int(c[i:i + 2], 16) / 255 for i in (1, 3, 5)]

        def flat(o):
            pos, norm = [], []
            for k in range(0, len(o['i']), 3):
                a, b, c = (o['v'][j] for j in o['i'][k:k + 3])
                u = [b[j] - a[j] for j in range(3)]
                w = [c[j] - a[j] for j in range(3)]
                n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
                length = math.sqrt(sum(t * t for t in n)) or 1
                n = [t / length for t in n]
                for p in (a, b, c):
                    pos.extend(p)
                    norm.extend(n)
            return pos, norm

        g = dict(
            asset={'version': '2.0', 'generator': 'Apartment plan reconstruction'},
            scene=0, scenes=[{'nodes': []}], nodes=[], meshes=[], materials=[],
            accessors=[], bufferViews=[], buffers=[],
        )
        buf = bytearray()

        def accessor(values):
            start = len(buf)
            buf.extend(struct.pack('<' + 'f' * len(values), *values))
            g['bufferViews'].append(dict(buffer=0, byteOffset=start, byteLength=len(buf) - start, target=34962))
            g['accessors'].append(dict(
                bufferView=len(g['bufferViews']) - 1, componentType=5126, count=len(values) // 3, type='VEC3',
                min=[min(values[i::3]) for i in range(3)], max=[max(values[i::3]) for i in range(3)],
            ))
            return len(g['accessors']) - 1

        for o in self.objects:
            p, n = flat(o)
            pa, na = accessor(p), accessor(n)
            j = len(g['meshes'])
            g['materials'].append(dict(
                name=o['name'],
                pbrMetallicRoughness=dict(
                    baseColorFactor=rgb(o['c']) + [o.get('alpha', 1)],
                    metallicFactor=0.15 if 'alpha' in o else 0,
                    roughnessFactor=0.16 if 'alpha' in o else 0.82,
                ),
                doubleSided=True,
                alphaMode='BLEND' if 'alpha' in o else 'OPAQUE',
            ))
            g['meshes'].append(dict(name=o['name'], primitives=[dict(attributes={'POSITION': pa, 'NORMAL': na}, material=j)]))
            g['nodes'].append(dict(name=o['name'], mesh=j, extras={'group': o['group']}))
            g['scenes'][0]['nodes'].append(j)

        g['buffers'] = [{'byteLength': len(buf)}]
        js = json.dumps(g, separators=(',', ':')).encode()
        js += b' ' * ((-len(js)) % 4)
        header = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(buf))
        return header + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(buf), 0x004E4942) + buf


def export(scene, unit):
    """Write GLB + standalone viewer + the embedded viewer used by the website."""
    work = ROOT / 'units-out' / unit['slug']
    work.mkdir(parents=True, exist_ok=True)
    data = scene.glb()
    (work / 'apartment.glb').write_bytes(data)
    (work / 'scene.json').write_text(json.dumps(scene.objects), encoding='utf8')

    template = (ROOT / 'viewer-template.html').read_text(encoding='utf8')
    page = (template
            .replace('__TITLE__', unit['title'])
            .replace('__EYEBROW__', unit['eyebrow'])
            .replace('__SUMMARY__', unit['summary'])
            .replace('__NOTES__', unit['notes'])
            .replace('__SCENE__', json.dumps(scene.objects)))
    (work / 'index.html').write_text(page, encoding='utf8')

    embed = re.sub(r'<header>.*?</header>', '', page, flags=re.S)
    embed = re.sub(r'<aside>.*?</aside>', '', embed, flags=re.S)
    embed = re.sub(r'<a href="apartment\.glb".*?</a>', '', embed)
    embed = embed.replace('</style>', (
        'nav{bottom:12px;width:calc(100% - 24px);max-width:600px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;padding:5px;white-space:nowrap}'
        'nav button{min-width:0;padding:10px 4px;font-size:12px;white-space:nowrap}'
        '.hint{bottom:76px;font-size:11px}'
        '@media(max-width:700px){nav{bottom:12px}.hint{bottom:76px}}'
        '@media(max-width:380px){nav{width:calc(100% - 12px);gap:3px;padding:4px}nav button{padding:9px 2px;font-size:10px}.hint{bottom:70px;font-size:10px}}</style>'))

    res = ROOT.parent / 'assets' / 'residences' / unit['slug']
    res.mkdir(parents=True, exist_ok=True)
    (res / 'model.html').write_text(embed, encoding='utf8')
    (res / 'apartment.glb').write_bytes(data)
    return len(scene.objects), len(data), res
