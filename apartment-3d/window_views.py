"""Window views for the 3D walk-through, cut from the promo drone film.

    python window_views.py "C:/path/to/af.mp4"

Writes assets/residences/views/{w-high,w-low,n,s,e}.webp. The film is 4K H.264,
which nothing in the Python toolchain here decodes, so frames are grabbed through
Microsoft Edge (Playwright, channel="msedge"). Every shot carries the promo
titles; they sit over sky and sea, so they are masked (near-white pixels inside
the title boxes) and filled from the surroundings (push-pull + diffusion). Shots
whose titles cross clouds are cropped below the titles instead.

hf in js/flats-3d/walk.js VIEWS is the horizon height in each output image and
must be updated if a crop changes.
"""
import base64
import io
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent.parent / 'assets' / 'residences' / 'views'
WIDTH = 2560

TITLE = [(0.02, 0.17, 0.62, 0.40), (0.085, 0.38, 0.115, 0.97), (0.04, 0.78, 0.40, 0.93), (0.865, 0.02, 0.965, 0.15, 'all')]
LINE = [(0.085, 0.38, 0.115, 0.97)]

# file, second in the film, crop (y0, y1[, x0, x1]) as fractions, boxes to retouch
SHOTS = [
    ('w-high.webp', 22.5, (0.12, 0.70), TITLE),          # from the roof: sea, Batumi to the right
    ('w-low.webp', 14.5, (0.16, 0.78), TITLE),           # just above the trees
    ('n.webp', 19.0, (0.16, 0.62, 0.0, 0.86), TITLE),    # Batumi; the house's own roof cut off on the right
    ('s.webp', 25.0, (0.40, 0.78), LINE),                # ridge down to the sea; titles over clouds, cropped below
    ('e.webp', 108.0, (0.42, 0.84), LINE),               # wood on the slope behind the house
]


def grab(video, seconds, width=None):
    """Frames at the given seconds as PIL images (full size, or `width` pixels wide)."""
    page_file = Path(__file__).with_name('_frame.html')
    page_file.write_text(f'<video id=v src="{Path(video).resolve().as_uri()}" muted preload=auto></video><canvas id=c></canvas>', encoding='utf8')
    frames = {}
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(channel='msedge', args=['--allow-file-access-from-files'])
            pg = b.new_page()
            pg.set_default_timeout(60000)
            pg.goto(page_file.as_uri())
            pg.wait_for_function('document.getElementById("v").readyState >= 1')
            for t in seconds:
                data = pg.evaluate("""([t, w]) => new Promise((res) => { const v = document.getElementById('v'), c = document.getElementById('c');
                  v.onseeked = () => { c.width = w || v.videoWidth; c.height = Math.round(c.width * v.videoHeight / v.videoWidth); c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); res(c.toDataURL(w ? 'image/jpeg' : 'image/png', 0.92)); };
                  v.currentTime = t; })""", [t, width or 0])
                frames[t] = Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGB')
            b.close()
    finally:
        page_file.unlink(missing_ok=True)
    return frames


def text_mask(a, boxes):
    h, w, _ = a.shape
    m = np.zeros((h, w), bool)
    lo, hi = a.min(axis=2), a.max(axis=2)
    for box in boxes:
        X0, Y0, X1, Y1 = int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h)
        if len(box) > 4:                 # the gold logo: take the whole box
            m[Y0:Y1, X0:X1] = True
            continue
        m[Y0:Y1, X0:X1] |= (lo[Y0:Y1, X0:X1] > 175) & ((hi - lo)[Y0:Y1, X0:X1] < 55)
    return np.array(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(11))) > 0


def inpaint(a, m, iters=400):
    known = (~m).astype(np.float32)
    acc = a.astype(np.float32) * known[..., None]
    levels, c, w = [], acc, known
    while min(w.shape) > 8:                              # pull: average known pixels down a pyramid
        levels.append((c, w))
        h2, w2 = w.shape[0] // 2 * 2, w.shape[1] // 2 * 2
        cc, ww = c[:h2, :w2], w[:h2, :w2]
        c = cc[0::2, 0::2] + cc[1::2, 0::2] + cc[0::2, 1::2] + cc[1::2, 1::2]
        w = ww[0::2, 0::2] + ww[1::2, 0::2] + ww[0::2, 1::2] + ww[1::2, 1::2]
    fill = c / np.maximum(w, 1e-6)[..., None]
    for c, w in reversed(levels):                        # push: fill holes from the coarser level
        up = np.repeat(np.repeat(fill, 2, 0), 2, 1)
        up = np.pad(up, ((0, c.shape[0] - up.shape[0]), (0, c.shape[1] - up.shape[1]), (0, 0)), mode='edge')
        alpha = np.clip(w, 0, 1)[..., None]
        fill = c / np.maximum(w, 1e-6)[..., None] * alpha + up * (1 - alpha)
    res = a.astype(np.float32)
    res[m] = fill[m]
    ys, xs = np.nonzero(m)
    y0, y1, x0, x1 = max(ys.min() - 2, 0), ys.max() + 3, max(xs.min() - 2, 0), xs.max() + 3
    sub, mm = res[y0:y1, x0:x1], m[y0:y1, x0:x1]
    for _ in range(iters):                               # smooth the blocky push-pull fill
        avg = (np.roll(sub, 1, 0) + np.roll(sub, -1, 0) + np.roll(sub, 1, 1) + np.roll(sub, -1, 1)) / 4
        sub[mm] = avg[mm]
    res[y0:y1, x0:x1] = sub
    return np.clip(res, 0, 255).astype(np.uint8)


def main(video):
    frames = grab(video, [s[1] for s in SHOTS])
    OUT.mkdir(parents=True, exist_ok=True)
    for name, t, crop, boxes in SHOTS:
        a = np.array(frames[t])
        if boxes:
            a = inpaint(a, text_mask(a, boxes))
        h, w, _ = a.shape
        x0, x1 = (int(crop[2] * w), int(crop[3] * w)) if len(crop) == 4 else (0, w)
        img = Image.fromarray(a[int(crop[0] * h):int(crop[1] * h), x0:x1])
        img = img.resize((WIDTH, round(WIDTH * img.height / img.width)), Image.LANCZOS)
        img.save(OUT / name, quality=84, method=6)
        print(f'{name}: {t}s -> {img.size[0]}x{img.size[1]}, {(OUT / name).stat().st_size // 1024} KB')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
