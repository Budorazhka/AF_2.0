"""Massing of the whole Aurum Fort building for the 3D selector (/flats-3d).

Reads the same ArchiCAD export the apartment models come from
(assets/docs/aurum-fort-floor-plans.pdf) and writes:

  assets/data/building-3d.json        floors, walls, glazing, zones, windows
  assets/residences/plans/floor-N.webp line drawing laid on each floor slab

    python building.py

How the geometry is recovered
-----------------------------
ArchiCAD exports rooms as half-transparent "zone" polygons whose areas match the
floor tables (70.1 / 51.7 / 38.9 ...), terraces as opaque fills and 40x40 cm
columns as small squares. Walls are only line work, so they are rebuilt as the
gaps between zones: every polygon is rasterised on a 5 cm grid, the union is
closed (fills gaps narrower than 60 cm) and whatever lies inside the footprint
but outside every zone is wall. A wall cell between an apartment and the
outside or a terrace becomes glazing, a cell between a terrace and the outside
becomes a glass railing, the rest stays solid.

Sheets III..roof are drawn 9.8 / -5.0 pt off the I-II sheets; the offset is
recovered from the columns (or the red lift shaft on the roof sheet).
"""
import hashlib
import io
import json
import math
import re
from pathlib import Path

import fitz
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
SITE = ROOT.parent
PDF = SITE / 'assets' / 'docs' / 'aurum-fort-floor-plans.pdf'
OUT_JSON = SITE / 'assets' / 'data' / 'building-3d.json'
OUT_PLANS = SITE / 'assets' / 'residences' / 'plans'

S = 0.0985                 # metres per PDF point (40 cm column = 4.06 pt)
RES = 0.05                 # raster cell, metres
REGION = (180, 40, 600, 430)   # building window on the I/II sheets, points
REF_PAGE = 3               # 0-based index of the II floor sheet

# sheet index (0-based) -> level
LEVELS = [
    dict(page=1, level=-1, kind='spa', height=4.0),
    dict(page=2, level=1, kind='lobby', height=3.6),
    dict(page=3, level=2, kind='residential', height=3.3),
    dict(page=4, level=3, kind='residential', height=3.3),
    dict(page=5, level=4, kind='residential', height=3.3),
    dict(page=6, level=5, kind='residential', height=3.3),
    dict(page=7, level=6, kind='residential', height=3.3),
    dict(page=8, level=7, kind='residential', height=3.3),
    dict(page=9, level=8, kind='roof', height=3.0),
]

# total area on the site -> interior area on the drawing
INTERIOR = {81.8: 70.1, 26.1: 21.6, 48.5: 38.9, 66: 51.7, 40.5: 35.7, 28.3: 26.1, 113.7: 65.2, 107.1: 59.4}
# plan image on the site -> 3D model folder (mirrors js/residence-media.js PLANS)
PLAN_TO_SLUG = {
    '/assets/img/plans/26,1.webp': '26-1', '/assets/img/plans/28,3.webp': '28-3',
    '/assets/img/plans/40,5.png': '40-5', '/assets/img/plans/48,5-corrected.png': '48-5',
    '/assets/img/plans/66.png': '66', '/assets/img/plans/81,8-corrected.png': '81-8',
    '/assets/img/plans/107,1.png': '107-1', '/assets/img/plans/113,7.png': '113-7',
}

GW = int((REGION[2] - REGION[0]) * S / RES)
GH = int((REGION[3] - REGION[1]) * S / RES)


def rgb(c):
    return None if c is None else tuple(round(v, 2) for v in c)


def points(dr):
    pts = []
    for it in dr['items']:
        if it[0] == 'l':
            pts += [(it[1].x, it[1].y), (it[2].x, it[2].y)]
        elif it[0] == 'c':
            pts += [(it[1].x, it[1].y), (it[4].x, it[4].y)]
        elif it[0] == 're':
            r = it[1]
            pts += [(r.x0, r.y0), (r.x1, r.y0), (r.x1, r.y1), (r.x0, r.y1)]
        elif it[0] == 'qu':
            q = it[1]
            pts += [(q.ul.x, q.ul.y), (q.ur.x, q.ur.y), (q.lr.x, q.lr.y), (q.ll.x, q.ll.y)]
    out = []
    for p in pts:
        if not out or abs(out[-1][0] - p[0]) + abs(out[-1][1] - p[1]) > 1e-3:
            out.append(p)
    if len(out) > 2 and abs(out[0][0] - out[-1][0]) + abs(out[0][1] - out[-1][1]) < 1e-3:
        out.pop()
    return out


def area(pts):
    return abs(sum(pts[i][0] * pts[i - 1][1] - pts[i - 1][0] * pts[i][1] for i in range(len(pts)))) / 2


def columns(page):
    out = []
    for dr in page.get_drawings():
        r, f = dr['rect'], rgb(dr.get('fill'))
        if f and f[0] in (0.85, 0.86) and 3.6 < r.width < 4.6 and 3.6 < r.height < 4.6:
            out.append(((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2))
    return out


def shaft(page):
    rs = [dr['rect'] for dr in page.get_drawings() if rgb(dr.get('fill')) == (0.66, 0.06, 0.01)]
    return min(r.x0 for r in rs), min(r.y0 for r in rs)


def sheet_offset(doc, index):
    """Translation that puts a sheet onto the II floor sheet."""
    ref, own = columns(doc[REF_PAGE]), columns(doc[index])
    votes = {}
    for a in ref:
        for b in own:
            key = (round((a[0] - b[0]) * 2) / 2, round((a[1] - b[1]) * 2) / 2)
            votes[key] = votes.get(key, 0) + 1
    if votes and max(votes.values()) >= 12:
        best = max(votes, key=votes.get)
        near = [(k, v) for k, v in votes.items() if abs(k[0] - best[0]) <= 0.5 and abs(k[1] - best[1]) <= 0.5]
        n = sum(v for _, v in near)
        return sum(k[0] * v for k, v in near) / n, sum(k[1] * v for k, v in near) / n
    rx, ry = shaft(doc[REF_PAGE])
    ox, oy = shaft(doc[index])
    return rx - ox, ry - oy


# -- raster helpers -------------------------------------------------------
def to_m(p, off):
    return ((p[0] + off[0] - REGION[0]) * S, (p[1] + off[1] - REGION[1]) * S)


def raster(polys):
    img = Image.new('L', (GW, GH), 0)
    d = ImageDraw.Draw(img)
    for poly in polys:
        if len(poly) >= 3:
            d.polygon([(x / RES, z / RES) for x, z in poly], fill=1)
    return np.array(img, dtype=bool)


def dilate(m, r):
    out = m.copy()
    for _ in range(r):
        grown = out.copy()
        grown[1:, :] |= out[:-1, :]
        grown[:-1, :] |= out[1:, :]
        grown[:, 1:] |= out[:, :-1]
        grown[:, :-1] |= out[:, 1:]
        out = grown
    return out


def erode(m, r):
    return ~dilate(~m, r)


def fill_holes(m):
    """Everything not reachable from the sheet border counts as inside (corridors, stair halls)."""
    pad = Image.new('L', (GW + 2, GH + 2), 255)
    pad.paste(Image.fromarray(np.where(m, 0, 255).astype(np.uint8)), (1, 1))
    ImageDraw.floodfill(pad, (0, 0), 128)
    return np.array(pad)[1:-1, 1:-1] != 128


def colour_mask(page, off, test):
    """Pixels of the rendered sheet, on the 5 cm grid, that pass a colour test.

    Decks are drawn only as board lines and the roof pool as a pattern fill, so
    they are easier to pick up from the picture than from the vector data.
    """
    zoom = S / RES
    clip = fitz.Rect(REGION[0] - off[0], REGION[1] - off[1], REGION[2] - off[0], REGION[3] - off[1])
    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), clip=clip, alpha=False)
    a = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3].astype(int)
    out = np.zeros((GH, GW), bool)
    h, w = min(GH, a.shape[0]), min(GW, a.shape[1])
    out[:h, :w] = test(a[:h, :w, 0], a[:h, :w, 1], a[:h, :w, 2])
    return out


def decks(page, off):
    boards = colour_mask(page, off, lambda r, g, b: (r < 90) & (g > 150) & (b > 150))
    region = erode(fill_holes(erode(dilate(boards, 10), 10)), 1)
    return region if region.sum() * RES * RES > 4 else np.zeros_like(region)


def rects(mask, min_cells=2):
    """Greedy cover of a mask with axis-aligned rectangles (metres)."""
    m = mask.copy()
    out = []
    h, w = m.shape
    for z in range(h):
        x = 0
        row = m[z]
        while x < w:
            if not row[x]:
                x += 1
                continue
            x1 = x
            while x1 < w and row[x1]:
                x1 += 1
            z1 = z + 1
            while z1 < h and m[z1, x:x1].all():
                z1 += 1
            m[z:z1, x:x1] = False
            if (x1 - x) * (z1 - z) >= min_cells:
                out.append([round(x * RES, 2), round(z * RES, 2), round(x1 * RES, 2), round(z1 * RES, 2)])
            x = x1
    return out


def apartments_by_floor():
    text = (SITE / 'assets' / 'data' / 'apartments.js').read_text(encoding='utf8')
    data = json.loads(text[text.index('['):text.rindex(']') + 1])
    floors = {}
    for a in data:
        floors.setdefault(a['floor'], []).append(a)
    return floors


def unit_floor_min(slug):
    objs = json.loads((ROOT / 'units-out' / slug / 'scene.json').read_text(encoding='utf8'))
    pts = [v for o in objs if o['group'] == 'floor' and max(p[1] for p in o['v']) > -0.01 for v in o['v']]
    return (min(p[0] for p in pts), min(p[2] for p in pts), max(p[0] for p in pts), max(p[2] for p in pts))


# -- per level ------------------------------------------------------------
def outline(mask, tolerance=0.2):
    """Outer contour of the largest region as a simplified polygon (metres).

    Moore-neighbour tracing over the 5 cm grid, then Douglas–Peucker: slanted
    roof edges come out as straight slanted lines instead of 5 cm steps, so the
    roof balustrade can be built from a handful of clean glass panels.
    """
    h, w = mask.shape
    ys, xs = np.nonzero(mask)
    k = np.argmin(ys * w + xs)
    start = (int(ys[k]), int(xs[k]))
    nbr = [(0, -1), (-1, -1), (-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1)]
    pts, cur, back = [start], start, (start[0], start[1] - 1)
    for _ in range(400000):
        d = nbr.index((back[0] - cur[0], back[1] - cur[1]))
        for j in range(1, 9):
            dy, dx = nbr[(d + j) % 8]
            ny, nx = cur[0] + dy, cur[1] + dx
            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx]:
                py, px = nbr[(d + j - 1) % 8]
                back, cur = (cur[0] + py, cur[1] + px), (ny, nx)
                break
        else:
            break
        if cur == start:
            break
        pts.append(cur)
    poly = [((c + 0.5) * RES, (r + 0.5) * RES) for r, c in pts]

    def simplify(p):
        if len(p) < 3:
            return p
        (ax, az), (bx, bz) = p[0], p[-1]
        L = math.hypot(bx - ax, bz - az) or 1e-9
        dist = [abs((bx - ax) * (az - z) - (ax - x) * (bz - az)) / L for x, z in p[1:-1]]
        i = int(np.argmax(dist)) + 1
        if dist[i - 1] > tolerance:
            return simplify(p[:i + 1])[:-1] + simplify(p[i:])
        return [p[0], p[-1]]

    far = max(range(len(poly)), key=lambda i: (poly[i][0] - poly[0][0]) ** 2 + (poly[i][1] - poly[0][1]) ** 2)
    ring = simplify(poly[:far + 1])[:-1] + simplify(poly[far:] + [poly[0]])[:-1]
    return [[round(x, 2), round(z, 2)] for x, z in ring]


def roof_geometry(doc, spec, below):
    """Roof: the VII floor outline as slab, stair/lift housing, pool, decks, parapet glass."""
    page = doc[spec['page']]
    off = sheet_offset(doc, spec['page'])
    housing = []
    for dr in page.get_drawings():
        f, r = rgb(dr.get('fill')), dr['rect']
        if f in ((0.66, 0.06, 0.01), (0.5, 0.5, 0.5)) or f == (1.0, 1.0, 1.0) and (dr.get('fill_opacity') or 1) < 0.9:
            pts = [to_m(p, off) for p in points(dr)]
            if len(pts) >= 3:
                housing.append(pts)
    structures = dilate(raster(housing), 2) & below
    pool = colour_mask(page, off, lambda r, g, b: (b > 190) & (b - r > 70) & (g > 90)) & below
    pool = dilate(erode(pool, 3), 3)
    deck = decks(page, off) & below & ~pool
    rail = below & dilate(~below, 3) & ~structures
    return dict(
        level=spec['level'], kind='roof', height=spec['height'],
        slab=rects(below, 4), walls=rects(structures), glass=[], rails=rects(rail),
        pool=rects(pool, 20), decks=rects(deck, 20), columns=[], common=[], halls=[], units=[],
        outline=outline(erode(below, 2)),
    )


def level_geometry(doc, spec, flats, core=None):
    page = doc[spec['page']]
    off = sheet_offset(doc, spec['page'])
    inside = lambda r: REGION[0] < r.x0 + off[0] and r.x1 + off[0] < REGION[2] and REGION[1] < r.y0 + off[1] and r.y1 + off[1] < REGION[3]

    fills, solid, cols = [], [], []
    for dr in page.get_drawings():
        f, r = rgb(dr.get('fill')), dr['rect']
        if f is None or f == (1.0, 1.0, 1.0) and (dr.get('fill_opacity') or 1) > 0.9 or not inside(r):
            continue
        pts = [to_m(p, off) for p in points(dr)]
        if len(pts) < 3:
            continue
        a = area(pts)
        if f[0] in (0.85, 0.86) and 3.6 < r.width < 4.6 and 3.6 < r.height < 4.6:
            cols.append(pts)
        elif f in ((0.66, 0.06, 0.01), (0.5, 0.5, 0.5)):
            solid.append(pts)
        elif f == (0.0, 0.0, 0.0):
            continue
        elif a > 0.6:
            fills.append(dict(pts=pts, area=a, fill=f))

    # apartments: one interior zone per flat, matched on area
    units = []
    taken = set()
    for flat in sorted(flats, key=lambda a: -a['areaTotal']):
        target = INTERIOR[flat['areaTotal']]
        best = min((abs(z['area'] - target), i) for i, z in enumerate(fills) if i not in taken)
        if best[0] > target * 0.035:
            raise SystemExit(f"floor {spec['level']}: no zone for {flat['apartmentNumber']} ({target} m², closest off by {best[0]:.1f})")
        taken.add(best[1])
        units.append(dict(flat=flat, zone=fills[best[1]]))

    apt_masks = {u['flat']['apartmentNumber']: raster([u['zone']['pts']]) for u in units}
    apt_any = np.zeros((GH, GW), bool)
    for m in apt_masks.values():
        apt_any |= m

    # leftovers: terraces/balconies touching one flat, everything else is common space
    outdoor, common = [], []
    for i, z in enumerate(fills):
        if i in taken:
            continue
        m = raster([z['pts']])
        owners = [n for n, am in apt_masks.items() if (dilate(am, 12) & m).any()]
        is_outdoor = spec['kind'] == 'roof' or (owners and z['area'] < 50 and z['fill'] != (0.8, 0.8, 0.8) or owners and z['area'] < 6)
        if spec['kind'] == 'residential' and is_outdoor and len(owners) >= 1:
            best = max(owners, key=lambda n: (dilate(apt_masks[n], 12) & m).sum())
            outdoor.append(dict(pts=z['pts'], owner=best, area=z['area'], mask=m))
        elif spec['kind'] == 'roof' and z['fill'] == (0.55, 0.79, 1.0):
            common.append(dict(pts=z['pts'], area=z['area'], kind='pool', mask=m))
        else:
            common.append(dict(pts=z['pts'], area=z['area'], kind='common', mask=m))

    # board-line decks (penthouse terraces) belong to the flat they touch
    deck = decks(page, off) & ~apt_any
    for n, am in apt_masks.items():
        if (dilate(am, 24) & deck).any():
            outdoor.append(dict(pts=None, owner=n, area=float(deck.sum() * RES * RES), mask=deck & dilate(am, 160)))
            deck = deck & ~dilate(am, 160)

    out_any = np.zeros((GH, GW), bool)
    for o in outdoor:
        out_any |= o['mask']
    common_any = raster([c['pts'] for c in common])
    col_m = raster(cols)
    solid_m = raster(solid) | col_m
    zones = apt_any | out_any | common_any
    everything = zones | solid_m

    # Corridors and stair halls are not zones. The drawn wall lines (within 1 m of a
    # zone, so dimension chains stay out) close them; fill_holes then takes them in
    # and an opening strips the thin line ends that stick out of the outline.
    lines = colour_mask(page, off, lambda r, g, b: ((r + g + b) < 480) & (abs(r - g) < 40) & (abs(g - b) < 40))
    lines &= dilate(everything, 20)
    if core is not None:
        # the lift/stair core and corridor stack is the same on every residential
        # floor; upper sheets leave the corridor open to a terrace, so borrow it
        everything_closed = everything | lines | (core & ~dilate(apt_any | out_any, 2))
    else:
        everything_closed = everything | lines
    footprint = fill_holes(erode(dilate(everything_closed, 6), 6))   # close wall gaps < 60 cm
    footprint = dilate(erode(footprint, 6), 6)                        # drop line ends sticking out
    footprint = dilate(footprint, 2) | dilate(everything, 4)          # exterior wall / slab edge
    gaps = footprint & ~zones & ~col_m

    # gaps thicker than 50 cm are corridors and stair halls, not walls; only their
    # 20 cm rim against flats, common rooms or the outside stays solid
    thick = dilate(erode(gaps, 5), 5) & gaps
    rim = thick & (dilate(zones, 4) | dilate(~footprint, 4))
    walls = (gaps & ~thick) | rim | (solid_m & ~col_m)
    halls = thick & ~rim & ~solid_m

    near_apt = dilate(apt_any, 7)
    near_out = dilate(out_any, 7)
    near_outside = dilate(~footprint, 7)
    glass = walls & near_apt & (near_outside | near_out) & ~solid_m
    rail = walls & near_out & near_outside & ~near_apt & ~solid_m
    solid_walls = walls & ~glass & ~rail

    for u in units:
        u['windows'] = windows(glass, apt_masks[u['flat']['apartmentNumber']])

    # solid walls on the envelope are the dark cladding of the renders; inner ones stay light
    shell = solid_walls & near_outside
    geo = dict(
        level=spec['level'], kind=spec['kind'], height=spec['height'],
        slab=rects(footprint, 4), halls=rects(halls, 20),
        walls=rects(solid_walls & ~shell), shell=rects(shell),
        glass=owned(glass, [dilate(apt_masks[u['flat']['apartmentNumber']], 7) for u in units]),
        rails=rects(rail),
        facade=facade_edges(units, outdoor, footprint) if spec['kind'] == 'residential' else [],
        # hover volume: the floor's outline grown by the depth of the facade frames
        glow=outline(dilate(footprint, 18), 0.3) if spec['kind'] == 'residential' else None,
        columns=[[round(min(p[0] for p in c), 2), round(min(p[1] for p in c), 2),
                  round(max(p[0] for p in c), 2), round(max(p[1] for p in c), 2)] for c in cols],
        common=[dict(kind=c['kind'], area=round(c['area'], 1), poly=[[round(x, 2), round(z, 2)] for x, z in c['pts']]) for c in common],
        units=[],
    )

    for u in units:
        n = u['flat']['apartmentNumber']
        pts = u['zone']['pts']
        xs, zs = [p[0] for p in pts], [p[1] for p in pts]
        model = None
        slug = PLAN_TO_SLUG.get(u['flat']['planImageUrl'])
        if slug:
            fx0, fz0, fx1, fz1 = unit_floor_min(slug)
            dw, dd = (max(xs) - min(xs)) - (fx1 - fx0), (max(zs) - min(zs)) - (fz1 - fz0)
            if abs(dw) < 0.45 and abs(dd) < 0.45:
                model = dict(slug=slug, offset=[round(min(xs) - fx0 + dw / 2, 2), round(min(zs) - fz0 + dd / 2, 2)])
            else:
                print(f'  {n}: model {slug} does not fit its zone ({dw:+.2f}, {dd:+.2f} m), shown as massing only')
        geo['units'].append(dict(
            number=n,
            area=round(u['zone']['area'], 1),
            poly=[[round(x, 2), round(z, 2)] for x, z in pts],
            outdoor=[[[round(x, 2), round(z, 2)] for x, z in o['pts']] for o in outdoor if o['owner'] == n and o['pts']],
            decks=[r for o in outdoor if o['owner'] == n and not o['pts'] for r in rects(o['mask'], 20)],
            windows=u['windows'],
            model=model,
        ))
    geo['_halls'] = halls
    return geo, footprint, off


def parking(doc):
    """Parking bays drawn on the lobby sheet: brown bay outlines, 12 places in two rows.

    The right-hand row lies outside the building window, so this part of the
    sheet is rendered on its own. Returns [[x0, z0, x1, z1]] in plan metres.
    """
    page = doc[2]
    off = sheet_offset(doc, 2)
    clip = fitz.Rect(320, 270, 700, 380)
    zoom = S / RES
    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), clip=clip, alpha=False)
    a = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3].astype(int)
    brown = (abs(a[:, :, 0] - 122) < 30) & (abs(a[:, :, 1] - 102) < 30) & (abs(a[:, :, 2] - 69) < 30)
    cols = brown.sum(axis=0)
    rows = np.nonzero(brown.sum(axis=1) > brown.sum(axis=1).max() * 0.25)[0]
    z0, z1 = rows.min(), rows.max()
    lines = np.nonzero(cols > (z1 - z0) * 0.5)[0]
    centres, run = [], [lines[0]]
    for c in lines[1:]:
        if c - run[-1] <= 2:
            run.append(c)
        else:
            centres.append(sum(run) / len(run)); run = [c]
    centres.append(sum(run) / len(run))
    to_x = lambda px: (clip.x0 + px / zoom + off[0] - REGION[0]) * S
    to_z = lambda py: (clip.y0 + py / zoom + off[1] - REGION[1]) * S
    inner = [(l, r) for l, r in zip(centres, centres[1:]) if 2.0 < (r - l) * RES < 2.9]
    # the end bays of each row are closed by the row outline, which is drawn
    # fainter than the dividers: add one bay of the same pitch at each end
    rows_of_bays, row = [], [inner[0]]
    for bay in inner[1:]:
        if abs(bay[0] - row[-1][1]) < 3:
            row.append(bay)
        else:
            rows_of_bays.append(row); row = [bay]
    rows_of_bays.append(row)
    bays = []
    for row in rows_of_bays:
        pitch = (row[-1][1] - row[0][0]) / len(row)
        for l, r in [(row[0][0] - pitch, row[0][0])] + row + [(row[-1][1], row[-1][1] + pitch)]:
            bays.append([round(to_x(l), 2), round(to_z(z0), 2), round(to_x(r), 2), round(to_z(z1), 2)])
    return bays


def facade_edges(units, outdoor, footprint):
    """Outer edges of the flats' facades, where the white faceted frames go.

    Terrace and balcony fronts come straight from the drawing's polygons (their
    slanted edges included); glazing that faces the street directly comes from the
    window list. Returns [[x0, z0, x1, z1, nx, nz, terrace]] with the normal pointing
    out; terrace = 1 for a terrace or balcony front (it gets a glass balustrade).
    """
    def outside(x, z):
        i, j = int(z / RES), int(x / RES)
        return not (0 <= i < GH and 0 <= j < GW) or not footprint[i, j]

    edges = []
    def add(ax, az, bx, bz, nx, nz, terrace):
        mx, mz, length = (ax + bx) / 2, (az + bz) / 2, math.hypot(bx - ax, bz - az)
        for e in edges:   # the window list repeats staggered strips of one facade
            if e[4] * nx + e[5] * nz > 0.95 and math.hypot((e[0] + e[2]) / 2 - mx, (e[1] + e[3]) / 2 - mz) < 0.5:
                return
        edges.append([round(ax, 2), round(az, 2), round(bx, 2), round(bz, 2), round(nx, 3), round(nz, 3), terrace])

    for o in outdoor:
        pts = o['pts']
        if not pts:
            continue
        for a, b in zip(pts, pts[1:] + pts[:1]):
            length = math.hypot(b[0] - a[0], b[1] - a[1])
            if length < 0.9:
                continue
            tx, tz = (b[0] - a[0]) / length, (b[1] - a[1]) / length
            nx, nz = tz, -tx
            mx, mz = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
            if outside(mx + nx * 0.45, mz + nz * 0.45):
                add(a[0], a[1], b[0], b[1], nx, nz, 1)
            elif outside(mx - nx * 0.45, mz - nz * 0.45):
                add(a[0], a[1], b[0], b[1], -nx, -nz, 1)

    for u in units:
        n = u['flat']['apartmentNumber']
        for x, z, nx, nz, length in u['windows']:
            if outside(x + nx * 0.5, z + nz * 0.5):
                tx, tz = -nz, nx
                ox, oz = x + nx * 0.1, z + nz * 0.1
                add(ox - tx * length / 2, oz - tz * length / 2, ox + tx * length / 2, oz + tz * length / 2, nx, nz, 0)
    return edges


def owned(glass, masks):
    """Glazing boxes tagged with the index of their flat (-1: common parts).

    A facade strip runs past several flats, so the mask is split per flat
    before it is covered with boxes.
    """
    out, left = [], glass.copy()
    for k, m in enumerate(masks):
        part = left & m
        left &= ~m
        out += [r + [k] for r in rects(part)]
    return out + [r + [-1] for r in rects(left)]


def windows(glass, apt):
    """Glazed wall segments of one flat with their outward normal: [x, z, nx, nz, length]."""
    touching = glass & dilate(apt, 6)
    out = []
    for x0, z0, x1, z1 in rects(touching, 6):
        cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
        length = max(x1 - x0, z1 - z0)
        if length < 0.6:
            continue
        horizontal = (x1 - x0) >= (z1 - z0)
        probe = 0.45
        def inside(x, z):
            i, j = int(z / RES), int(x / RES)
            return 0 <= i < apt.shape[0] and 0 <= j < apt.shape[1] and apt[i, j]
        if horizontal:
            nz = 1 if inside(cx, cz - probe) else -1 if inside(cx, cz + probe) else 0
            n = (0, nz)
        else:
            nx = 1 if inside(cx - probe, cz) else -1 if inside(cx + probe, cz) else 0
            n = (nx, 0)
        if n == (0, 0):
            continue
        out.append([round(cx, 2), round(cz, 2), n[0], n[1], round(length, 2)])
    return out


def plan_overlay(doc, spec, footprint, off, level):
    """Line drawing of the sheet, clipped to the building, transparent background."""
    src = doc[spec['page']]
    tmp = fitz.open()
    page = tmp.new_page(width=src.rect.width, height=src.rect.height)
    shape = page.new_shape()
    grown = dilate(footprint, 2)
    kept = 0
    for dr in src.get_drawings():
        col = dr.get('color')
        if dr['type'] != 's' or col is None or max(col) > 0.45:
            continue
        r = dr['rect']
        cx, cz = to_m(((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2), off)
        i, j = int(cz / RES), int(cx / RES)
        if not (0 <= i < GH and 0 <= j < GW and grown[i, j]):
            continue
        for it in dr['items']:
            if it[0] == 'l':
                shape.draw_line(it[1], it[2])
            elif it[0] == 'c':
                shape.draw_bezier(it[1], it[2], it[3], it[4])
            elif it[0] == 're':
                shape.draw_rect(it[1])
            elif it[0] == 'qu':
                shape.draw_quad(it[1])
        shape.finish(color=(0.17, 0.2, 0.26), width=max(0.22, (dr.get('width') or 0.1) * 1.4), closePath=False)
        kept += 1
    shape.commit()
    px_per_m = 40
    zoom = px_per_m * S
    clip = fitz.Rect(REGION[0] - off[0], REGION[1] - off[1], REGION[2] - off[0], REGION[3] - off[1])
    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), clip=clip, alpha=True)
    img = Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGBA')
    OUT_PLANS.mkdir(parents=True, exist_ok=True)
    path = OUT_PLANS / f'floor-{level}.webp'
    buf = io.BytesIO()
    img.save(buf, 'WEBP', quality=82, method=6)
    path.write_bytes(buf.getvalue())
    return f'/assets/residences/plans/{path.name}', kept, hashlib.md5(buf.getvalue()).hexdigest()[:8]


def main():
    doc = fitz.open(PDF)
    flats = apartments_by_floor()
    levels = []
    footprint = core = None
    for spec in LEVELS:
        if spec['kind'] == 'roof':
            geo = roof_geometry(doc, spec, footprint)
            levels.append(geo)
            print(f"level {spec['level']:>2} roof        slab {len(geo['slab']):>4}  housing {len(geo['walls'])}  pool {len(geo['pool'])}  decks {len(geo['decks'])}  rails {len(geo['rails'])}")
            continue
        residential = spec['kind'] == 'residential'
        geo, footprint, off = level_geometry(doc, spec, flats.get(spec['level'], []) if residential else [],
                                             core if residential and spec['level'] > 2 else None)
        halls = geo.pop('_halls')
        if residential and spec['level'] == 2:
            core = halls
        if spec['kind'] in ('residential', 'lobby', 'spa'):
            url, kept, rev = plan_overlay(doc, spec, footprint, off, spec['level'])
            geo['plan'] = f'{url}?v={rev}'
        levels.append(geo)
        print(f"level {spec['level']:>2} {spec['kind']:<11} slab {len(geo['slab']):>4}  walls {len(geo['walls']):>4}  glass {len(geo['glass']):>4}"
              f"  rails {len(geo['rails']):>3}  units {', '.join(u['number'] + ('*' if u['model'] else '') for u in geo['units'])}")

    data = dict(
        source='aurum-fort-floor-plans.pdf (ArchiCAD), see apartment-3d/building.py',
        size=[round(GW * RES, 2), round(GH * RES, 2)],
        planPxPerMetre=40,
        # The drawing is not north-up. Sheet "down" (+Z) faces the sea, i.e. west:
        # 201's terrace and the 204-206 balconies look at the sea, 202 (sheet left)
        # at Batumi to the north, 204 (sheet right) at the mountains to the south.
        # Azimuth of +Z, degrees clockwise from north.
        planDownAzimuth=270,
        parking=parking(doc),       # on the lobby level (1), left row on the spa roof
        levels=levels,
    )
    OUT_JSON.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
    print(f'{OUT_JSON.relative_to(SITE)}: {OUT_JSON.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
