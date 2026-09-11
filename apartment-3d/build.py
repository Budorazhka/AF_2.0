"""Build the Aurum Fort apartment models.

    python build.py            # every unit
    python build.py 66 26-1    # selected units

Each model is checked for furniture pushing into structure before it is written,
so a column standing in the cooktop fails the build instead of shipping.
"""
import importlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib import export  # noqa: E402

MODULES = ['u26_1', 'u28_3', 'u40_5', 'u48_5', 'u66_0', 'u81_8', 'u107_1', 'u113_7']


def main(argv):
    wanted = set(argv)
    failed = []
    for name in MODULES:
        mod_path = Path(__file__).resolve().parent / 'units' / f'{name}.py'
        if not mod_path.exists():
            continue
        mod = importlib.import_module(f'units.{name}')
        if wanted and mod.UNIT['slug'] not in wanted:
            continue
        scene = mod.build()
        clashes = scene.clashes()
        stray = scene.outside(mod.FOOTPRINT)
        count, size, res = export(scene, mod.UNIT)
        status = 'ok'
        if clashes or stray:
            status = f'{len(clashes)} clash, {len(stray)} stray'
            failed.append(mod.UNIT['slug'])
        print(f"{mod.UNIT['slug']:>6}  {count:4d} objects  {size / 1024:7.0f} KB  -> {res.relative_to(res.parents[2])}  [{status}]")
        for c in clashes:
            print(f'         clash: {c[0]} x {c[1]}  ({c[2]}m by {c[3]}m)')
        for st in stray:
            print(f'         outside footprint: {st[0]} at ({st[1]}, {st[2]})')
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
