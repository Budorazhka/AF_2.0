import json, struct, math
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'working' / 'aurum-handoff' / 'apartment-3d'
# Fallback to direct path if needed:
if not OUT.exists():
    OUT = Path(r'c:\Users\Александр\Desktop\IT\working\aurum-handoff\apartment-3d')

objects = []

colors = {
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

def mesh(name, v, idx, c, group='furniture'):
    objects.append(dict(name=name, v=v, i=idx, c=colors.get(c, c), group=group))

def box(name, x, y, z, w, d, h, c, group='furniture'):
    v = [
        [x, y, z], [x + w, y, z], [x + w, y, z + d], [x, y, z + d],
        [x, y + h, z], [x + w, y + h, z], [x + w, y + h, z + d], [x, y + h, z + d]
    ]
    indices = [
        0, 2, 1,  0, 3, 2,
        4, 5, 6,  4, 6, 7,
        0, 1, 5,  0, 5, 4,
        1, 2, 6,  1, 6, 5,
        2, 3, 7,  2, 7, 6,
        3, 0, 4,  3, 4, 7
    ]
    mesh(name, v, [q for k in range(0, len(indices), 3) for q in [indices[k], indices[k + 2], indices[k + 1]]], c, group)

def rect(name, x1, z1, x2, z2, h, c='wall', y=0, group='furniture'):
    box(name, x1, y, z1, x2 - x1, z2 - z1, h, c, group)

def wall(name, x1, z1, x2, z2):
    rect(name, x1, z1, x2, z2, 2.80, 'wall', 0, group='walls')

def column(name, x1, z1, x2, z2):
    rect(name, x1, z1, x2, z2, 2.80, 'column', 0, group='walls')

def slab(name, pts, y, h, c, group='floor'):
    n = len(pts)
    v = [[x, yy, z] for yy in [y, y + h] for x, z in pts]
    idx = []
    for j in range(1, n - 1):
        idx.extend([n, n + j + 1, n + j, 0, j, j + 1])
    for j in range(n):
        k = (j + 1) % n
        idx.extend([j, k, n + k, j, n + k, n + j])
    mesh(name, v, idx, c, group)

def oval(name, x, z, rx, rz, y, h, c):
    slab(name, [(x + rx * math.cos(t * math.tau / 32), z + rz * math.sin(t * math.tau / 32)) for t in range(32)], y, h, c, 'furniture')

def glass_panel(name, pts, y=0.08, h=1.02):
    slab(name, pts, y, h, '#163e59', 'rail')
    objects[-1]['alpha'] = 0.82

# ==========================================
# 1. FLOORS AND BALCONIES
# ==========================================
# Entrance hallway & main corridor
rect('Corridor floor', 0.00, 0.00, 4.20, 2.00, 0.16, 'floor', -0.16, 'floor')
rect('North kitchen hall floor', 4.20, 0.00, 8.20, 2.00, 0.16, 'floor', -0.16, 'floor')
rect('Kitchen & walkway floor', 5.75, 2.00, 8.20, 5.00, 0.16, 'floor', -0.16, 'floor')
rect('Living room floor', 4.20, 5.00, 8.20, 8.00, 0.16, 'floor', -0.16, 'floor')

# Bathroom tiled floor
rect('Bathroom tile floor', 4.20, 2.00, 5.75, 5.00, 0.16, 'tile', -0.16, 'floor')

# Bedroom floor
rect('Bedroom floor', 0.00, 4.80, 4.20, 8.00, 0.16, 'floor', -0.16, 'floor')

# Balcony 1 (Bedroom, 4.8 m²)
pts_b1 = [(0.00, 8.00), (4.20, 8.00), (4.20, 9.20), (0.00, 9.10)]
slab('Bedroom balcony slab', pts_b1, -0.20, 0.18, 'tile')

# Balcony 2 (Living room terrace, 9.5 m² with Aurum Fort faceted origami flare)
pts_b2 = [(4.20, 8.00), (8.20, 8.00), (9.80, 8.20), (9.90, 9.35), (7.20, 9.85), (4.20, 9.75)]
slab('Living terrace slab', pts_b2, -0.20, 0.18, 'tile')

# ==========================================
# 2. STRUCTURAL COLUMNS (40x40 cm)
# ==========================================
column('NW Column', -0.20, -0.20, 0.20, 0.20)
column('N-Mid Column', 4.00, -0.20, 4.40, 0.20)
column('NE Column', 8.00, -0.20, 8.40, 0.20)

column('Mid-West Column', -0.20, 1.80, 0.20, 2.20)
column('Center Column', 4.00, 1.80, 4.40, 2.20) # Top-left of bathroom
column('Mid-East Column', 8.00, 1.80, 8.40, 2.20)

column('Bedroom-NW Column', -0.20, 4.60, 0.20, 5.00)
column('SW Column', -0.20, 7.80, 0.20, 8.20)
column('S-Mid Column', 4.00, 7.80, 4.40, 8.20)
column('SE Column', 8.00, 7.80, 8.40, 8.20)

# ==========================================
# 3. EXTERIOR & DEMISING WALLS (20 cm)
# ==========================================
# North perimeter
wall('North exterior corridor', 0.20, -0.20, 4.00, 0.00)
wall('North exterior kitchen', 4.40, -0.20, 8.00, 0.00)

# West perimeter & entrance
wall('West corridor stub', -0.20, 1.10, 0.00, 1.80)
rect('Entrance lintel', -0.20, 0.20, 0.00, 1.10, 0.60, 'wall', 2.20, 'walls')
rect('Entrance open door', 0.00, 0.25, 0.04, 1.05, 2.20, 'wood')

# Corridor core south wall
wall('Corridor core wall', 0.20, 1.80, 4.00, 2.00)

# East perimeter
wall('East exterior north', 8.20, 0.20, 8.40, 1.80)
wall('East exterior mid', 8.20, 2.20, 8.40, 7.80)

# ==========================================
# 4. BATHROOM WALLS & DOOR (CORRECTED: NORTH DOOR)
# ==========================================
# North wall with bathroom door:
wall('Bathroom north stub west', 4.40, 1.80, 4.55, 2.00)
rect('Bathroom door lintel', 4.55, 1.80, 5.45, 2.00, 0.60, 'wall', 2.20, 'walls')
wall('Bathroom north stub east', 5.45, 1.80, 5.75, 2.00)
rect('Bathroom open door', 5.56, 2.02, 5.60, 2.85, 2.20, 'white') # hinged east, open into bathroom

# East wall: CONTINUOUS SOLID WALL (NO DOORS)
wall('Bathroom east wall', 5.60, 1.80, 5.75, 5.00)

# South wall
wall('Bathroom south wall', 4.20, 4.85, 5.75, 5.00)

# West wall (shared with core/bedroom)
wall('Bathroom west wall', 4.05, 2.20, 4.20, 4.85)

# ==========================================
# 5. BEDROOM WALLS & DOOR
# ==========================================
wall('Bedroom north wall', 0.20, 4.65, 4.05, 4.85)
wall('West exterior bedroom', -0.20, 5.00, 0.00, 7.80)
wall('Bedroom divider wall', 4.05, 4.85, 4.20, 7.05)
rect('Bedroom door lintel', 4.05, 7.05, 4.20, 7.85, 0.60, 'wall', 2.20, 'walls')
rect('Bedroom open door', 3.35, 7.80, 4.05, 7.84, 2.20, 'wood') # opens into bedroom
wall('Balcony divider wall', 4.10, 8.20, 4.30, 9.25)

# ==========================================
# 6. BALCONY GLAZING & DOORS
# ==========================================
# Bedroom balcony glazing
rect('Bedroom glazing base', 0.20, 7.95, 4.00, 8.05, 0.10, 'dark', group='glazing')
for x in [0.20, 1.30, 2.65, 4.00]:
    rect('Bedroom mullion', x, 7.95, x + 0.04, 8.05, 2.80, 'dark', group='glazing')
rect('Bedroom glazing top', 0.20, 7.95, 4.00, 8.05, 0.06, 'dark', 2.74, 'glazing')
rect('Bedroom balcony open door', 1.30, 7.25, 1.34, 7.95, 2.20, 'metal', group='glazing')

# Living terrace glazing
rect('Living glazing base', 4.40, 7.95, 8.00, 8.05, 0.10, 'dark', group='glazing')
for x in [4.40, 5.60, 6.80, 8.00]:
    rect('Living mullion', x, 7.95, x + 0.04, 8.05, 2.80, 'dark', group='glazing')
rect('Living glazing top', 4.40, 7.95, 8.00, 8.05, 0.06, 'dark', 2.74, 'glazing')
rect('Living balcony sliding door', 6.80, 7.90, 7.80, 7.94, 2.20, 'metal', group='glazing')

# Balcony railings (tinted blue glass)
for j in range(3):
    x1 = 0.30 + j * 1.25
    x2 = x1 + 1.20
    z1 = 9.10 + (x1 / 4.20) * 0.10
    z2 = 9.10 + (x2 / 4.20) * 0.10
    glass_panel('Bedroom balcony glass', [(x1, z1), (x2, z2), (x2, z2 + 0.02), (x1, z1 + 0.02)])

glass_panel('Bedroom side glass', [(0.05, 8.20), (0.07, 8.20), (0.07, 9.10), (0.05, 9.10)])
rect('Bedroom side handrail', 0.04, 8.20, 0.08, 9.10, 0.025, 'metal', 1.10, 'rail')
slab('Bedroom front handrail', [(0.25, 9.10), (4.15, 9.20), (4.15, 9.23), (0.25, 9.13)], 1.10, 0.025, 'metal', 'rail')

pts_front = [
    (4.40, 9.75), (5.80, 9.79), (5.80, 9.81), (4.40, 9.77),
    (5.85, 9.79), (7.20, 9.85), (7.20, 9.87), (5.85, 9.81),
    (7.25, 9.85), (8.60, 9.60), (8.60, 9.62), (7.25, 9.87),
    (8.65, 9.60), (9.85, 9.35), (9.85, 9.37), (8.65, 9.62)
]
for k in range(0, len(pts_front), 4):
    glass_panel('Living terrace glass', pts_front[k:k+4])

glass_panel('Living terrace side glass', [(9.78, 8.25), (9.80, 8.25), (9.88, 9.30), (9.86, 9.30)])
slab('Living terrace front rail', [(4.35, 9.76), (7.20, 9.86), (9.85, 9.36), (9.85, 9.39), (7.20, 9.89), (4.35, 9.79)], 1.10, 0.025, 'metal', 'rail')
slab('Living terrace side rail', [(9.77, 8.25), (9.87, 9.35), (9.90, 9.35), (9.80, 8.25)], 1.10, 0.025, 'metal', 'rail')

# ==========================================
# 7. FACADE ORIGAMI PORTAL (Aurum Fort signature)
# ==========================================
slab('White fascia bedroom', [(-0.05, 9.05), (4.25, 9.15), (4.25, 9.25), (-0.05, 9.15)], -0.24, 0.24, 'white', 'facade')
slab('White fascia living', [(4.20, 9.70), (7.25, 9.80), (9.95, 9.30), (9.85, 8.15), (9.95, 8.15), (10.05, 9.35), (7.30, 9.90), (4.20, 9.80)], -0.24, 0.24, 'white', 'facade')

for x, z, dx, dz in [(9.82, 8.20, 0.15, -0.10), (9.88, 9.32, -0.15, 0.12)]:
    rect('Angled facade pier', x, z, x + 0.18, z + 0.18, 2.80, 'white', group='facade')
    for v in objects[-1]['v']:
        if v[1] > 2:
            v[0] += dx
            v[2] += dz

slab('Upper white facade band', [(4.20, 9.60), (7.20, 9.70), (9.80, 9.25), (9.80, 9.42), (7.20, 9.86), (4.20, 9.76)], 2.80, 0.24, 'white', 'facade')
rect('Left balcony soffit', 0.00, 8.00, 0.35, 9.10, 0.24, 'white', 2.80, 'facade')
rect('Right terrace soffit', 9.60, 8.00, 9.90, 9.30, 0.24, 'white', 2.80, 'facade')

# ==========================================
# 8. BEDROOM FURNITURE
# ==========================================
rect('Bed frame', 1.10, 4.90, 2.70, 6.85, 0.32, 'wood')
rect('Headboard', 1.05, 4.82, 2.75, 4.92, 1.05, 'fabric')
rect('Mattress', 1.15, 4.92, 2.65, 6.80, 0.24, 'white', 0.32)
rect('Duvet', 1.17, 5.30, 2.63, 6.78, 0.08, 'fabric', 0.56)
rect('Pillow left', 1.25, 4.96, 1.85, 5.25, 0.13, 'white', 0.56)
rect('Pillow right', 1.95, 4.96, 2.55, 5.25, 0.13, 'white', 0.56)

rect('Nightstand left', 0.55, 4.85, 0.95, 5.25, 0.48, 'wood')
rect('Nightstand right', 2.85, 4.85, 3.25, 5.25, 0.48, 'wood')
rect('Wardrobe closet', 3.50, 5.05, 4.10, 6.75, 2.40, 'white')
rect('Wardrobe seam', 3.79, 5.05, 3.81, 6.75, 2.38, 'dark', 0.01)

# ==========================================
# 9. BATHROOM FIXTURES (WEST WALL & SOUTH END)
# ==========================================
# Vanity & Washbasin on west wall
rect('Vanity', 4.20, 2.20, 4.70, 2.75, 0.75, 'wood')
oval('Washbasin', 4.45, 2.48, 0.18, 0.22, 0.75, 0.12, 'white')
rect('Mirror', 4.21, 2.20, 4.23, 2.75, 0.85, 'glass', 1.15)

# Toilet on west wall
rect('WC cistern', 4.20, 2.95, 4.38, 3.35, 0.78, 'white')
oval('WC pedestal', 4.60, 3.15, 0.18, 0.14, 0, 0.38, 'white')
oval('WC seat', 4.63, 3.15, 0.22, 0.16, 0.38, 0.055, 'white')
oval('WC opening', 4.64, 3.15, 0.15, 0.10, 0.436, 0.005, 'dark')

# Pipe chase
wall('Pipe chase', 4.20, 3.65, 4.55, 4.15)

# Bathtub at south end
rect('Bath apron', 4.20, 4.20, 5.55, 4.85, 0.56, 'white')
rect('Bath shadow', 4.26, 4.26, 5.48, 4.79, 0.012, 'metal', 0.56)
rect('Bath interior', 4.30, 4.30, 5.44, 4.75, 0.016, 'white', 0.572)

# ==========================================
# 10. KITCHEN & DINING (ALONG EAST WALL - COMPLETELY OPEN PASSAGE)
# ==========================================
# Refrigerator in NE corner
rect('Refrigerator', 7.55, 0.05, 8.20, 0.80, 2.05, '#dcd8cf')
rect('Fridge handle', 7.53, 0.10, 7.55, 0.14, 0.60, 'metal', 0.90)

# Kitchen counter along East wall
rect('Kitchen cabinet base', 7.60, 0.80, 8.20, 3.80, 0.86, 'wood')
rect('Kitchen countertop', 7.58, 0.78, 8.20, 3.82, 0.045, 'white', 0.86)

# 4-burner cooktop
rect('Cooktop', 7.65, 1.50, 8.15, 2.10, 0.015, 'dark', 0.905)
oval('Burner 1', 7.78, 1.65, 0.07, 0.07, 0.92, 0.005, 'metal')
oval('Burner 2', 7.78, 1.95, 0.07, 0.07, 0.92, 0.005, 'metal')
oval('Burner 3', 8.02, 1.65, 0.06, 0.06, 0.92, 0.005, 'metal')
oval('Burner 4', 8.02, 1.95, 0.06, 0.06, 0.92, 0.005, 'metal')

# Double-bowl sink
rect('Sink rim', 7.65, 2.65, 8.15, 3.30, 0.016, 'metal', 0.905)
rect('Sink bowl 1', 7.69, 2.70, 8.11, 2.95, 0.019, 'dark', 0.92)
rect('Sink bowl 2', 7.69, 3.00, 8.11, 3.25, 0.019, 'dark', 0.92)
rect('Kitchen tap', 8.12, 2.98, 8.16, 3.02, 0.26, 'metal', 0.92)

# Partition wall stub (separates counter from dining table)
wall('Kitchen partition stub', 7.35, 3.80, 8.20, 3.95)

# Dining table & 4 chairs (neatly tucked against wall stub and east wall)
rect('Dining table top', 7.10, 4.20, 7.90, 4.90, 0.04, 'wood', 0.74)
for x in [7.14, 7.82]:
    for z in [4.24, 4.82]:
        rect('Table leg', x, z, x + 0.04, z + 0.04, 0.74, 'dark')

# 4 Chairs
rect('Chair seat North', 7.30, 3.96, 7.70, 4.16, 0.04, 'fabric', 0.44)
rect('Chair back North', 7.30, 3.93, 7.70, 3.96, 0.40, 'wood', 0.44)

rect('Chair seat South', 7.30, 4.94, 7.70, 5.14, 0.04, 'fabric', 0.44)
rect('Chair back South', 7.30, 5.14, 7.70, 5.17, 0.40, 'wood', 0.44)

rect('Chair seat West', 6.70, 4.35, 7.05, 4.75, 0.04, 'fabric', 0.44)
rect('Chair back West', 6.67, 4.35, 6.70, 4.75, 0.40, 'wood', 0.44)

rect('Chair seat East', 7.95, 4.35, 8.15, 4.75, 0.04, 'fabric', 0.44)
rect('Chair back East', 8.15, 4.35, 8.18, 4.75, 0.40, 'wood', 0.44)

# ==========================================
# 11. LIVING ROOM FURNITURE (SPACIOUS & UNCLUTTERED)
# ==========================================
# L-shaped sectional sofa along bedroom wall & bathroom south wall
# 1. Main body along bedroom wall (X = 4.30 to 5.10, Z = 5.05 to 6.95)
rect('Sofa long base', 4.30, 5.05, 5.10, 6.95, 0.30, 'wood')
rect('Sofa long back', 4.22, 5.05, 4.36, 6.95, 0.78, 'fabric')
for z in [5.75, 6.35]:
    rect('Sofa cushion', 4.38, z, 5.05, z + 0.55, 0.18, 'fabric', 0.30)
rect('Sofa south arm', 4.22, 6.95, 5.10, 7.08, 0.62, 'fabric')

# 2. Return section along bathroom south wall (X = 4.30 to 5.65, Z = 5.05 to 5.75)
rect('Sofa return base', 4.30, 5.05, 5.65, 5.75, 0.30, 'wood')
rect('Sofa return back', 4.30, 4.90, 5.65, 5.06, 0.78, 'fabric')
for x in [4.45, 5.05]:
    rect('Sofa return cushion', x, 5.08, x + 0.55, 5.68, 0.18, 'fabric', 0.30)
rect('Sofa east arm', 5.60, 4.90, 5.72, 5.75, 0.62, 'fabric')

# Cozy living rug
rect('Living rug', 4.70, 5.35, 6.60, 7.25, 0.018, 'rug')

# Coffee table
rect('Coffee table top', 5.35, 5.95, 6.00, 6.60, 0.045, 'wood', 0.38)
for x in [5.39, 5.92]:
    for z in [5.99, 6.52]:
        rect('Coffee table leg', x, z, x + 0.035, z + 0.035, 0.38, 'dark')

# (NOTICE: NO TV console or kitchen peninsula blocking the corridor!
# The central walkway between bathroom east wall (5.75) and dining area (6.70)
# and through to bedroom door is 100% wide open and uncluttered!)

# ==========================================
# 12. GLTF / GLB EXPORT
# ==========================================
def rgb(c):
    return [int(c[i:i + 2], 16) / 255 for i in [1, 3, 5]]

def flat(o):
    pos = []
    norm = []
    for k in range(0, len(o['i']), 3):
        a, b, c = [o['v'][j] for j in o['i'][k:k + 3]]
        u = [b[j] - a[j] for j in range(3)]
        v = [c[j] - a[j] for j in range(3)]
        n = [
            u[1] * v[2] - u[2] * v[1],
            u[2] * v[0] - u[0] * v[2],
            u[0] * v[1] - u[1] * v[0]
        ]
        l = math.sqrt(sum(t * t for t in n)) or 1
        n = [t / l for t in n]
        for p in [a, b, c]:
            pos.extend(p)
            norm.extend(n)
    return pos, norm

g = dict(
    asset={'version': '2.0', 'generator': 'Apartment plan reconstruction'},
    scene=0,
    scenes=[{'nodes': []}],
    nodes=[],
    meshes=[],
    materials=[],
    accessors=[],
    bufferViews=[],
    buffers=[]
)

buf = bytearray()

def accessor(values):
    start = len(buf)
    buf.extend(struct.pack('<' + 'f' * len(values), *values))
    vi = len(g['bufferViews'])
    g['bufferViews'].append(dict(buffer=0, byteOffset=start, byteLength=len(buf) - start, target=34962))
    ai = len(g['accessors'])
    g['accessors'].append(dict(
        bufferView=vi,
        componentType=5126,
        count=len(values) // 3,
        type='VEC3',
        min=[min(values[i::3]) for i in range(3)],
        max=[max(values[i::3]) for i in range(3)]
    ))
    return ai

for o in objects:
    p, n = flat(o)
    pa = accessor(p)
    na = accessor(n)
    j = len(g['meshes'])
    g['materials'].append(dict(
        name=o['name'],
        pbrMetallicRoughness=dict(
            baseColorFactor=rgb(o['c']) + [o.get('alpha', 1)],
            metallicFactor=0.15 if 'alpha' in o else 0,
            roughnessFactor=0.16 if 'alpha' in o else 0.82
        ),
        doubleSided=True,
        alphaMode='BLEND' if 'alpha' in o else 'OPAQUE'
    ))
    g['meshes'].append(dict(name=o['name'], primitives=[dict(attributes={'POSITION': pa, 'NORMAL': na}, material=j)]))
    g['nodes'].append(dict(name=o['name'], mesh=j, extras={'group': o['group']}))
    g['scenes'][0]['nodes'].append(j)

g['buffers'] = [{'byteLength': len(buf)}]
js = json.dumps(g, separators=(',', ':')).encode()
js += b' ' * ((-len(js)) % 4)
glb = struct.pack('<III', 0x46546c67, 2, 12 + 8 + len(js) + 8 + len(buf)) + struct.pack('<II', len(js), 0x4e4f534a) + js + struct.pack('<II', len(buf), 0x004e4942) + buf

(OUT / 'apartment.glb').write_bytes(glb)
(OUT / 'scene.json').write_text(json.dumps(objects), encoding='utf8')
template = (OUT / 'viewer-template.html').read_text(encoding='utf8')
(OUT / 'index.html').write_text(template.replace('__SCENE__', json.dumps(objects)), encoding='utf8')

print(f'Generated {len(objects)} objects; GLB {len(glb):,} bytes.')

# ==========================================
# 13. EXPORT TO RESIDENCES (66)
# ==========================================
import re
res_dir = OUT.parent / 'assets' / 'residences' / '66'
res_dir.mkdir(parents=True, exist_ok=True)
viewer = (OUT / 'index.html').read_text(encoding='utf8')
viewer = re.sub(r'<header>.*?</header>', '', viewer, flags=re.S)
viewer = re.sub(r'<aside>.*?</aside>', '', viewer, flags=re.S)
viewer = re.sub(r'<a href="apartment.glb".*?</a>', '', viewer)
viewer = viewer.replace('</style>', 'nav{bottom:12px;max-width:96vw;justify-content:center;gap:4px;padding:5px}nav button{padding:10px 11px;font-size:12px}.hint{bottom:76px;font-size:11px}@media(max-width:700px){nav{bottom:12px}.hint{bottom:108px}}' + '</style>')
(res_dir / 'model.html').write_text(viewer, encoding='utf8')
(res_dir / 'apartment.glb').write_bytes(glb)
print(f'Customer model written to {res_dir}')
