"""Prepare perspective inpainting views and assemble cached edits into panoramas.

Run `python apartment-3d/pano_fill.py prepare`, edit the numbered views using
views/*.mask.png (white = edit), save them as edits/<view-name>.png, then run
`python apartment-3d/pano_fill.py compose`. Generation is an external step;
the cached edits, not a random seed, make composition repeatable.
"""
import argparse
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / 'apartment-3d' / 'pano-work'
OUT = ROOT / 'assets' / 'residences' / 'views'
SIZE = 1024
VIEWS = [(a, p) for p in (0, -40) for a in range(0, 360, 45)] + [(0, -90)]


def basis(az, pitch):
    a, p = np.deg2rad([az, pitch])
    return (np.array([np.cos(p)*np.cos(a), np.cos(p)*np.sin(a), np.sin(p)], np.float32),
            np.array([-np.sin(a), np.cos(a), 0.], np.float32),
            np.array([-np.sin(p)*np.cos(a), -np.sin(p)*np.sin(a), np.cos(p)], np.float32))


def camera_rays(az, pitch, size):
    f, r, up = basis(az, pitch)
    q = (2 * (np.arange(size, dtype=np.float32) + .5) / size - 1)
    d = f + q[None, :, None]*r - q[:, None, None]*up
    return d / np.linalg.norm(d, axis=-1, keepdims=True)


def pano_coordinates(d, width, height):
    az = np.arctan2(d[..., 1], d[..., 0])
    lat = np.arcsin(np.clip(d[..., 2], -1, 1))
    return ((270 - np.rad2deg(az)) % 360) / 360 * width - .5, (90 - np.rad2deg(lat)) / 180 * height - .5


def project_directions(d, az, pitch):
    f, r, up = basis(az, pitch)
    z = d @ f
    safe = np.maximum(z, 1e-8)
    return d @ r / safe, -(d @ up) / safe, z


def view_weight(x, y):
    edge = np.maximum(np.abs(x), np.abs(y))
    t = np.clip(1-edge, 0, 1)
    return t*t*(3-2*t)


def sample(image, x, y, wrap=False):
    h, w = image.shape[:2]
    x0 = np.floor(x).astype(np.int32); y0 = np.floor(y).astype(np.int32)
    dx = x - x0; dy = y - y0
    x1 = x0 + 1; y1 = y0 + 1
    if wrap:
        x0 %= w; x1 %= w
    else:
        x0 = np.clip(x0, 0, w-1); x1 = np.clip(x1, 0, w-1)
    y0 = np.clip(y0, 0, h-1); y1 = np.clip(y1, 0, h-1)
    if image.ndim == 3:
        dx = dx[..., None]; dy = dy[..., None]
    return ((image[y0, x0]*(1-dx) + image[y0, x1]*dx)*(1-dy) +
            (image[y1, x0]*(1-dx) + image[y1, x1]*dx)*dy)


def name(az, pitch):
    return f'az{az:03d}_pitch{pitch:+03d}'


def raw_path(floor):
    return WORK / f'pano-{floor}.raw.webp'


def match_nadir(edits):
    """Match the bottom view to its neighbors using their shared directions."""
    lat = np.deg2rad(np.arange(-75, -48, dtype=np.float32))
    az = np.deg2rad(np.arange(0, 360, 2, dtype=np.float32))
    d = np.empty((len(lat), len(az), 3), np.float32)
    d[..., 0] = np.cos(lat)[:, None] * np.cos(az)
    d[..., 1] = np.cos(lat)[:, None] * np.sin(az)
    d[..., 2] = np.sin(lat)[:, None]
    bottom = next((image for azimuth, pitch, image in edits if pitch == -90), None)
    if bottom is None:
        return edits
    x, y, _ = project_directions(d, 0, -90)
    center = sample(bottom, (x+1)*SIZE/2-.5, (y+1)*SIZE/2-.5)
    accum = np.zeros_like(center)
    weights = np.zeros(d.shape[:2])
    for azimuth, pitch, image in edits:
        if pitch != -40:
            continue
        x, y, front = project_directions(d, azimuth, pitch)
        weight = view_weight(x, y) * (front > 0)
        selected = weight > 0
        accum[selected] += sample(image, (x[selected]+1)*SIZE/2-.5,
                                  (y[selected]+1)*SIZE/2-.5) * weight[selected, None]
        weights += weight
    selected = weights > 0
    if not np.any(selected):
        return edits
    accum[selected] /= weights[selected, None]
    ratio = np.clip(accum[selected].mean(0) / np.maximum(center[selected].mean(0), 1), .5, 1.5)
    corrected = np.uint8(np.clip(np.rint(bottom * ratio), 0, 255))
    return [(a, p, corrected if p == -90 else image) for a, p, image in edits]


def prepare():
    WORK.mkdir(exist_ok=True)
    views = WORK / 'views'; views.mkdir(exist_ok=True)
    (WORK / 'edits').mkdir(exist_ok=True)
    for floor in range(2, 8):
        raw = raw_path(floor)
        if not raw.exists():
            shutil.copy2(OUT / f'pano-{floor}.webp', raw)
    cover = np.asarray(Image.open(WORK / 'pano-7.cover.png').convert('L'))
    for floor in range(2, 7):
        other = np.asarray(Image.open(WORK / f'pano-{floor}.cover.png').convert('L'))
        if not np.array_equal(cover, other):
            raise RuntimeError(f'Floor {floor} cover differs: prepare floor-specific edits before composing.')
    raw = np.asarray(Image.open(raw_path(7)).convert('RGB'))
    h, w = cover.shape
    for az, pitch in VIEWS:
        u, v = pano_coordinates(camera_rays(az, pitch, SIZE), w, h)
        photo = np.uint8(np.clip(np.rint(sample(raw, u, v, True)), 0, 255))
        mask = np.uint8(sample(cover, u, v, True) < .95*255) * 255
        mask = Image.fromarray(mask).filter(ImageFilter.MaxFilter(21))
        stem = name(az, pitch)
        Image.fromarray(photo).save(views / f'{stem}.png')
        mask.save(views / f'{stem}.mask.png')
        print(stem, 'edit' if mask.getbbox() else 'skip', flush=True)


def compose(output_dir=OUT):
    cover = np.asarray(Image.open(WORK / 'pano-7.cover.png').convert('L'))
    h, w = cover.shape
    edits = []
    for az, pitch in VIEWS:
        stem = name(az, pitch)
        mask = Image.open(WORK / 'views' / f'{stem}.mask.png')
        if not mask.getbbox():
            continue
        path = WORK / 'edits' / f'{stem}.png'
        if not path.exists():
            raise FileNotFoundError(f'Missing generated edit: {path}')
        im = Image.open(path).convert('RGB')
        if im.width != im.height:
            raise ValueError(f'{path}: expected a square image, got {im.size}')
        if im.size != (SIZE, SIZE):
            im = im.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
        edits.append((az, pitch, np.asarray(im)))
    edits = match_nadir(edits)
    accum = np.zeros((h, w, 3), np.float32)
    weights = np.zeros((h, w), np.float32)
    lon = np.deg2rad(270 - 360 * (np.arange(w, dtype=np.float32)+.5)/w)
    first_row = int(np.ceil(h * (90-20) / 180))
    for start in range(first_row, h, 64):
        end = min(start+64, h)
        lat = np.deg2rad(90 - 180*(np.arange(start, end, dtype=np.float32)+.5)/h)
        d = np.empty((end-start, w, 3), np.float32)
        d[..., 0] = np.cos(lat)[:, None]*np.cos(lon)[None, :]
        d[..., 1] = np.cos(lat)[:, None]*np.sin(lon)[None, :]
        d[..., 2] = np.sin(lat)[:, None]
        for az, pitch, image in edits:
            x, y, front = project_directions(d, az, pitch)
            weight = (view_weight(x, y) * (front > 0) * (lat[:, None] <= np.deg2rad(20))).astype(np.float32)
            selected = weight > 0
            if not np.any(selected):
                continue
            px = (x[selected]+1)*SIZE/2-.5; py = (y[selected]+1)*SIZE/2-.5
            accum[start:end][selected] += sample(image, px, py) * weight[selected, None]
            weights[start:end][selected] += weight[selected]
        print(f'projected {end}/{h}', flush=True)
    target = (cover < 255) & (np.arange(h)[:, None] >= h*(90-20)/180)
    if np.any(target & (weights <= 0)):
        raise RuntimeError('Some target pixels have no generated coverage')
    filled = np.zeros_like(accum)
    np.divide(accum, weights[..., None], out=filled, where=weights[..., None] > 0)
    del accum, weights
    output_dir.mkdir(parents=True, exist_ok=True)
    for floor in range(2, 8):
        other = np.asarray(Image.open(WORK / f'pano-{floor}.cover.png').convert('L'))
        if not np.array_equal(cover, other):
            raise RuntimeError(f'Floor {floor} mask differs; refusing to reuse edits')
        raw = np.asarray(Image.open(raw_path(floor)).convert('RGB'))
        latitude = 90 - 180 * (np.arange(h, dtype=np.float32) + .5) / h
        sky_fade = np.clip((20 - latitude) / 15, 0, 1)
        sky_fade = sky_fade * sky_fade * (3 - 2 * sky_fade)
        alpha = np.where(target, (255-cover)/255., 0).astype(np.float32) * sky_fade[:, None]
        result = np.uint8(np.clip(np.rint(raw*(1-alpha[..., None]) + filled*alpha[..., None]), 0, 255))
        path = output_dir / f'pano-{floor}.webp'
        # lossy like the rest of the site's images: lossless came to ~10 MB per floor
        Image.fromarray(result).save(path, 'WEBP', quality=82, method=6)
        # the footage itself must be unchanged (up to compression)
        if not np.array_equal(result[cover == 255], raw[cover == 255]):
            raise RuntimeError(f'Original pixels changed in {path}')
        restored = np.asarray(Image.open(path).convert('RGB'))
        drift = np.abs(restored[cover == 255].astype(np.int16) - raw[cover == 255]).mean()
        if drift > 4:
            raise RuntimeError(f'{path}: footage drifted by {drift:.1f} after compression')
        print(f'Saved {path}', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['prepare', 'compose'])
    parser.add_argument('--output-dir', type=Path, default=OUT)
    args = parser.parse_args()
    if args.command == 'prepare':
        prepare()
    else:
        compose(args.output_dir)
