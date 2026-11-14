"""360° window panoramas for the walk-through, one per residential floor.

    python panorama.py af.mp4 DJI_0975.MP4 DJI_0965.MP4

Writes assets/residences/views/pano-2.webp … pano-7.webp: 6144 x 3072
equirectangular images laid out for three.js SphereGeometry (column u looks at
azimuth 270° − 360°·u, row 0 is the zenith). Azimuth 270 is the sea facade of
the model (see planDownAzimuth in building-3d.json).

Three pieces of real footage, in order of priority:

1. Sea facade, per floor — DJI_0975: the drone climbs from the forest past the
   house to its roof, always facing the view the balconies have (hill on the
   left, sea, Batumi's towers on the right), camera tilt fixed (horizon at
   23.3 % of the frame). Each floor gets the frame from its own height; the
   unfinished house creeping into the left of the frame is replaced by the frame
   from 12.5 s, taken before the house came into view.
2. Everything round from there — DJI_0965, 57–102 s: the drone hangs above the
   roof and turns slowly left, from the wooded slope uphill through the hill
   with the cross and the bay to Batumi. The turn between frames is measured by
   phase correlation (horizontal shift → yaw, vertical shift → tilt), the sea
   horizon is measured on the frames that show it, and the turn is tied to (1)
   by the tall dark tower in Batumi that both show.
3. The remaining southern sector — af.mp4, 25 s, titles retouched.

Frames are projected by azimuth, horizon row and field of view, so they share
one horizon; where they overlap the frame closest to its own centre wins, with
a soft cross-fade. Sky overhead and ground below the footage are a plain
gradient in the footage's own colours.

Also writes apartment-3d/pano-work/pano-N.cover.png (white = real footage,
black = backdrop gradient): the mask for filling the gaps generatively.

A spherical panorama shot by the drone at each floor height (DJI "Sphere")
would replace these files one to one.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from window_views import grab, text_mask, inpaint, LINE

OUT = Path(__file__).resolve().parent.parent / 'assets' / 'residences' / 'views'
WORK = Path(__file__).resolve().parent / 'pano-work'
W, H = 6144, 3072
FOV_DJI = 82.0                  # horizontal field of the DJI camera
FOV_AF = 84.0
SEA_AZ = 270

# (1) DJI_0975
CLIMB_HORIZON = 0.233
CLIMB_CLEAN = 12.5
FLOORS = {2: (14.5, 0.08), 3: (15.4, 0.12), 4: (16.3, 0.15), 5: (17.2, 0.19), 6: (18.1, 0.23), 7: (19.0, 0.28)}
TOWER_X_CLIMB = 0.86            # the tall dark tower in the climb frames

# (2) DJI_0965
TURN = (57.0, 102.0)
TURN_STEP = 0.5
TURN_HORIZON = {86.0: 0.48, 90.0: 0.48, 94.0: 0.48, 98.0: 0.41, 102.0: 0.33}   # measured on the sea
TOWER_X_TURN = (102.0, 0.42)    # the same tower in the last turn frame
TURN_SPACING = 12.0             # degrees between the turn frames used

# (3) af.mp4
SOUTH = (25.0, 188, 0.465, (0.40, 0.78, 0.0, 1.0), LINE)


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def project(frame, az, hf, fov, region=(0.0, 1.0, 0.0, 1.0), core=None):
    """(columns, colour, weight) of one frame; only the columns it reaches."""
    src_w = int(round(W * fov / 360))
    img = frame.resize((src_w, round(src_w * frame.height / frame.width)), Image.LANCZOS)
    a = np.asarray(img, dtype=np.float32)
    sh, sw = a.shape[:2]
    deg_px = fov / sw
    u = (np.arange(W) + 0.5) / W
    dlon = (((270 - 360 * u) - az + 540) % 360) - 180
    idx = np.nonzero(np.abs(dlon) < fov / 2)[0]
    dlon = dlon[idx]
    lat = 90 - 180 * (np.arange(H) + 0.5) / H
    cols = 0.5 * sw + dlon / deg_px                       # azimuth grows to the right in the frame
    rows = hf * sh - lat / deg_px
    ci = np.clip(np.round(cols).astype(int), 0, sw - 1)
    ri = np.clip(np.round(rows).astype(int), 0, sh - 1)
    colour = a[ri[:, None], ci[None, :]]
    y0, y1, x0, x1 = region
    inside_x = (cols >= x0 * sw) & (cols < x1 * sw)
    inside_y = (rows >= y0 * sh) & (rows < y1 * sh)
    # weight peaks at the frame centre: where frames overlap, the most central one wins
    centre = np.clip(1 - np.abs(dlon) / (fov / 2), 0, 1) ** 1.5
    if core is not None:
        # a frame of a turn owns its own sector and only blends 3° either side of the
        # boundary; outside it, it still fills in what the neighbour does not cover
        centre = np.minimum(centre, 0.02 + smooth(core + 3, core - 3, np.abs(dlon)))
    if x0 > 0 or x1 < 1:
        centre = np.minimum(centre, np.minimum(np.clip((cols - x0 * sw) / (sw * 0.08), 0, 1), np.clip((x1 * sw - cols) / (sw * 0.08), 0, 1)))
    span = (y1 - y0) * sh
    edge_y = np.minimum(np.clip((rows - y0 * sh) / (span * 0.18), 0, 1), np.clip((y1 * sh - rows) / (span * 0.3), 0, 1))
    weight = (centre * inside_x)[None, :] * smooth(0, 1, edge_y * inside_y)[:, None]
    return idx, colour, weight


def background(colour, cover):
    """Plain backdrop that depends on height only: sky deepening to the zenith,
    hazy horizon, the slope darkening towards your feet."""
    lat = (90 - 180 * (np.arange(H) + 0.5) / H)[:, None, None]
    lat_map = np.broadcast_to(lat[:, :, 0], cover.shape)
    strong = cover > 0.95
    blue = (colour[..., 2] > colour[..., 0] + 40) & (colour[..., 2] > 150)
    sky_edge = colour[strong & blue & (lat_map > 4) & (lat_map < 20)].mean(axis=0)
    ground = colour[strong & (lat_map < -12) & (lat_map > -35)].mean(axis=0)
    haze = sky_edge * 0.6 + np.array([226, 236, 242], np.float32) * 0.4
    # the sky the footage actually shows, row by row, so frame tops melt into it
    prof = np.full((H, 3), np.nan, np.float32)
    for r in range(H // 2):
        m = strong[r] & blue[r]
        if m.sum() > W * 0.01:
            prof[r] = colour[r][m].mean(axis=0)
    rows_ok = np.nonzero(~np.isnan(prof[:, 0]))[0]
    top = rows_ok.min()
    zenith = prof[top] * np.array([0.88, 0.92, 1.0], np.float32)
    for ch in range(3):
        prof[:H // 2, ch] = np.interp(np.arange(H // 2), np.r_[0, rows_ok, H // 2 - 1], np.r_[zenith[ch], prof[rows_ok, ch], haze[ch]])
    k = np.exp(-0.5 * (np.arange(-60, 61) / 20) ** 2); k /= k.sum()
    for ch in range(3):
        prof[:H // 2, ch] = np.convolve(np.pad(prof[:H // 2, ch], 60, mode='edge'), k, mode='valid')
    up = np.zeros((H, 1, 3), np.float32)
    up[:H // 2, 0] = prof[:H // 2]
    up[H // 2:, 0] = haze
    dn_t = smooth(0, 16, -lat)
    dn = ((haze + ground) / 2 * (1 - dn_t) + ground * dn_t) * (1 - 0.5 * np.clip(-lat / 90, 0, 1))
    mix = smooth(-1.5, 1.5, lat)
    return (up * mix + dn * (1 - mix)).astype(np.float32)


def stitch(layers):
    """layers: [(image, azimuth, horizon row, fov, region, priority)]."""
    acc = np.zeros((H, W, 3), np.float32)
    wsum = np.zeros((H, W), np.float32)
    cover = np.zeros((H, W), np.float32)
    for img, az, hf, fov, region, priority, *core in layers:
        idx, c, w = project(img, az, hf, fov, region, core[0] if core else None)
        acc[:, idx] += c * (w * priority)[..., None]
        wsum[:, idx] += w * priority
        cover[:, idx] = np.maximum(cover[:, idx], np.clip(w * 3, 0, 1))
    colour = acc / np.maximum(wsum, 1e-6)[..., None]
    bg = background(colour, cover)
    return colour * cover[..., None] + bg * (1 - cover[..., None]), cover


def phase_shift(a, b):
    """Shift (dx, dy) that moves image b onto image a."""
    F = np.fft.fft2(a) * np.conj(np.fft.fft2(b))
    r = np.fft.ifft2(F / (np.abs(F) + 1e-6)).real
    y, x = np.unravel_index(np.argmax(r), r.shape)
    if y > r.shape[0] // 2:
        y -= r.shape[0]
    if x > r.shape[1] // 2:
        x -= r.shape[1]
    return x, y


def measure_turn(video):
    """Yaw (degrees, relative to the last frame) and horizon row of each turn frame."""
    times = [round(TURN[0] + k * TURN_STEP, 2) for k in range(int((TURN[1] - TURN[0]) / TURN_STEP) + 1)]
    small = grab(video, times, width=480)
    win = np.outer(np.hanning(270), np.hanning(480))
    prep = {t: (lambda a: (a - a.mean()) * win)(np.asarray(small[t].convert('L').resize((480, 270)), np.float32)) for t in times}
    yaw, rise = {times[-1]: 0.0}, {times[-1]: 0.0}
    for prev, cur in zip(reversed(times[:-1]), reversed(times[1:])):
        dx, dy = phase_shift(prep[prev], prep[cur])
        # dx < 0: content moved right between prev and cur, the drone turned left,
        # so the earlier frame looks further clockwise (larger azimuth)
        yaw[prev] = yaw[cur] - dx * FOV_DJI / 480
        rise[prev] = rise[cur] + dy / 270                 # dy > 0: content moved up, so earlier the horizon sat lower
    horizon = {}
    known = sorted(TURN_HORIZON)
    for t in times:
        if known[0] <= t <= known[-1]:
            horizon[t] = float(np.interp(t, known, [TURN_HORIZON[k] for k in known]))
        else:
            ref = known[0] if t < known[0] else known[-1]
            horizon[t] = TURN_HORIZON[ref] + (rise[t] - rise[ref])
    return times, yaw, horizon


def without_house(frame, clean, edge):
    a, c = np.asarray(frame, np.float32), np.asarray(clean.resize(frame.size), np.float32)
    x = (np.arange(a.shape[1]) + 0.5) / a.shape[1]
    t = smooth(edge + 0.04, edge + 0.10, x)[None, :, None]
    return Image.fromarray(np.clip(a * t + c * (1 - t), 0, 255).astype(np.uint8))


def main(af_video, climb_video, turn_video):
    times, yaw, horizon = measure_turn(turn_video)
    # tie the turn to the climb by the tower both frames show
    t_last, x_last = TOWER_X_TURN
    tower_az = SEA_AZ + (TOWER_X_CLIMB - 0.5) * FOV_DJI
    last_az = tower_az - (x_last - 0.5) * FOV_DJI
    picked, last = [], None
    for t in reversed(times):                             # from the tower back round to the slope
        if last is None or abs(yaw[t] - last) >= TURN_SPACING:
            picked.append(t)
            last = yaw[t]
    print(f'turn: {yaw[times[0]]:.0f}° over {times[0]}–{times[-1]} s, {len(picked)} frames, horizon {min(horizon.values()):.2f}–{max(horizon.values()):.2f}')
    turn_frames = grab(turn_video, picked)
    # the earliest frame is the end of the turn: no neighbour beyond it, so it keeps its soft edge
    turn_layers = [(turn_frames[t], (last_az + yaw[t]) % 360, horizon[t], FOV_DJI, (0.0, 1.0, 0.0, 1.0), 1.0, None if t == picked[-1] else TURN_SPACING / 2) for t in picked]

    t, az, hf, region, boxes = SOUTH
    a = np.array(grab(af_video, [t])[t])
    south = (Image.fromarray(inpaint(a, text_mask(a, boxes), iters=120)), az, hf, FOV_AF, region, 0.15)

    climb = grab(climb_video, sorted({CLIMB_CLEAN, *[v[0] for v in FLOORS.values()]}))
    OUT.mkdir(parents=True, exist_ok=True)
    WORK.mkdir(exist_ok=True)
    for floor, (t, edge) in FLOORS.items():
        sea = (without_house(climb[t], climb[CLIMB_CLEAN], edge), SEA_AZ, CLIMB_HORIZON, FOV_DJI, (0.0, 1.0, 0.0, 1.0), 25.0)
        out, cover = stitch([sea, *turn_layers, south])
        # where the footage is (white) and where the backdrop gradient is (black): input for pano_fill
        Image.fromarray((cover * 255).astype(np.uint8)).save(WORK / f'pano-{floor}.cover.png')
        name = f'pano-{floor}.webp'
        Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(OUT / name, quality=80, method=6)
        print(f'{name}: {(OUT / name).stat().st_size // 1024} KB')


if __name__ == '__main__':
    if len(sys.argv) < 4:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2], sys.argv[3])
