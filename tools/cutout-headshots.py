#!/usr/bin/env python3
"""Cuts every pictured headshot out of its background and frames all of them the same
way, writing the masters tools/encode-images.mjs reads for the Who We Are tiles:

  source-material/image-sources/team/<slug>.*         the photo as received   (read)
  source-material/image-sources/team-cutout/<slug>.webp  768px RGBA, framed    (written)

  python3 tools/cutout-headshots.py                    everyone pictured
  python3 tools/cutout-headshots.py --only=abby-petre  one person, e.g. someone new

Who is pictured is read off index.html (every assets/team/<slug>.webp it references),
so a person is added by giving them a card first. The output carries no colour
treatment: it is the person, lifted off their background, at a shared scale and
position, and the duotone is applied by the encoder. That split is deliberate. This
step needs a 973 MB model and ~40 s an image; the look needs neither, and should be
changeable in a minute without anyone re-running a neural network.

The encoder is Node and this is Python because the model runs under onnxruntime and
the face detection is OpenCV's, and neither has a Node binding that sharp's users
would already have. Like sharp, none of it is a repo dependency and CI never runs it:
the outputs are committed. The environment it was run in, pinned because the matte,
the resample and the WebP encoder all change between versions:

  python3 -m venv .venv
  .venv/bin/pip install onnxruntime==1.30.0 opencv-python-headless==4.14.0.94 \\
                        pillow==12.3.0 numpy==2.4.6

opencv-python-headless must stay below 5: OpenCV 5 dropped CascadeClassifier, which is
the face and eye detection below.

THE MODEL is BiRefNet-portrait (MIT), as exported to ONNX by onnx-community. It is not
committed — 973 MB is the size of this whole repository several times over — so fetch
it once:

  curl -L -o ~/.cache/augmented/birefnet-portrait.onnx \\
    https://huggingface.co/onnx-community/BiRefNet-portrait-ONNX/resolve/dd7167f6a8b54ff7efc29a4c988938d79866464f/onnx/model.onnx

or point BIREFNET_ONNX at a copy. Its sha256 is checked below. It was chosen against
MODNet on the 24 photographs then on the page, both rendered and compared at 2x tile size: MODNet
is a sixth of the size and a trimap-free portrait matte too, but it left background
in Nikki's and Mohammed's hair and cut into Sarah's shoulder, and BiRefNet did not.

At its 1024x1024 input it holds ~14 GB with onnxruntime's default CPU memory arena and
was OOM-killed on the second image of a run, so the arena is off and every image is
matted in its own process (~7.6 GB peak). The raw model output is cached per master,
keyed on the master's bytes, so re-framing never re-runs the model.

THE FRAMING is one rule for everybody, and that is the point of it. The photographs
arrived as everything from a 190px thumbnail cropped at the eyebrows to a 4121px studio
frame from the waist up, and before this the tile showed each at whatever scale its
photographer chose: face heights measured 26% to 71% of the tile. Now:

  - scale:  every face (OpenCV's frontal-face box) is FACE of the tile's height.
  - height: every eye line is at EYE of the tile, measured from the top. The eyes are
            found inside the face box; where they are not, the line is placed at
            EYE_IN_BOX of the box, which is where it measured on everyone else, and the
            report says so.
  - across: the face box is centred.

Nothing is zoomed to suit a photograph. The first version of this did that — it raised
the scale for anyone whose photo was cropped too tight to fill the square, so four
people got bigger faces than everyone else — and it read as unfair once all 24 were
side by side.

The shoulders then run straight off the bottom and sides of the tile, the way a
photographed headshot's do. There is no fade on the figure except one, and it is not
chosen per person.

THE EDGE FADE is one rule applied to everyone: wherever a photograph's own edge cuts
through the person, the figure fades to nothing over EDGE_FADE as it approaches that
cut. It only does anything where a source is cropped tighter than the framing, and seven
are, noticeably: Ryan's photo ends across his chest at 77% of the tile, 23% above its
bottom edge, and stops at his hairline at the top; Andrew's and Byungyeon's end at 82%, and
Byungyeon's shoulders are cut 18% in from both sides; Sonia's photo ends 15% above the
bottom, and Raquel's, Blair's and Aarav's up to 10% in. Abby, Ben and Sarah are cut by 1-3%,
where the fade is barely there. The
fade is measured from the cut itself — the stretch of the border the matte actually
touches — not from the whole edge, so a photo cut at the shoulder does not also fade
the cheek above it.

So the seven do look different from the other eighteen at the bottom of the tile, and
that is the one inequality left. Two shared fades were tried to hide it and both went:
- A single vignette tuned so every one of those cuts fell where it had already faded
  out. Ryan's chest and Byungyeon's shoulders force it to finish just below everybody's
  chin, which kept 4-13% of anyone's shoulders — 24 floating heads, with the curve cutting
  through Angela's, Nikki's and Mohammed's hair.
- A soft U at the shoulders for everyone, on top of the edge fade. It shipped briefly in
  September 2026. A feather below the shoulders reads as a floating bust, and on the
  seventeen photos that are not cropped short it was a fade with nothing to hide.
Nor can scale close the gap: measured, even a face share of 58% leaves Ryan's, Andrew's
and Byungyeon's photos ending inside the tile. Better originals for those seven are the
fix, and nothing here needs to change when they arrive.

THE EDGE CLAMP handles the photos that only just stop short. Sarah's ends 1% above the
bottom of the tile, Abby's and Aarav's 1% in from the side, Ben's 3%: faded, each of those
grew a 12% feather along a whole edge to hide a gap of a few pixels, which is the look
this framing exists to avoid. Where a photo stops within
EDGE_CLAMP of the tile's bottom or side edge, its last row or column is repeated out to
the edge instead — at most 8 CSS px of clothing at the tile's 197, which reads as
nothing. Never at the top, where repeated hair looks like exactly what it is, and never
further in than that; everything deeper is the fade's.

If a fade would reach into someone's face, the report warns. That is the check for
anyone added later: a photograph that trips it is too tight for the shared framing and
wants a looser original, not a special case.

THE GRADE is the same white-point rule as the rest of the site's photography (see THE
GRADE in tools/encode-images.mjs): the subject's p99.8 luminance is lifted towards 250,
lift only, capped at +8%. It is measured over the head — everything in the tile above the
bottom of the face box — not the whole figure, so a white shirt running off the bottom of
the tile does not decide the exposure of a face."""
import glob, hashlib, os, re, subprocess, sys
import numpy as np
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'source-material/image-sources/team')
OUT = os.path.join(ROOT, 'source-material/image-sources/team-cutout')
CACHE = os.environ.get('AUG_CUTOUT_CACHE', os.path.expanduser('~/.cache/augmented/cutout'))
MODEL = os.environ.get('BIREFNET_ONNX', os.path.expanduser('~/.cache/augmented/birefnet-portrait.onnx'))
MODEL_SHA256 = '1ba1c8ff5a7bbfadc8d8d13fb11d7be793f91f23d9d466549e37a854f6668f99'

T = 768           # the master's side. The tile ships at 512 (tools/encode-images.mjs); the
                  # headroom lets that change without re-running this.
FACE = 0.46       # face-box height, as a fraction of the tile
EYE = 0.38        # eye line, from the top, as a fraction of the tile
EYE_IN_BOX = 0.39 # where the eye line sits in the face box, for anyone whose eyes are not found
DETECT = 1400     # longest side the detectors run at; the cascades were tuned there

EDGE_FADE = 0.12  # THE EDGE FADE's length, from a cut in a source to full opacity
EDGE_CLAMP = 0.04 # THE EDGE CLAMP: how short of the tile's bottom or sides a photo may stop
                  # and be extended to it rather than faded


def pictured():
    html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    return sorted(set(re.findall(r'assets/team/([a-z0-9-]+)\.webp', html)))


def master(slug):
    found = glob.glob(os.path.join(SRC, slug + '.*'))
    if len(found) != 1:
        sys.exit(f'{slug}: expected one master in {os.path.relpath(SRC, ROOT)}/, found {len(found)}')
    return found[0]


def load(slug):
    """The master as RGB, upright, with any transparency flattened onto white. Four of
    the PNGs arrive with an alpha channel, opaque everywhere, and the model expects RGB."""
    im = ImageOps.exif_transpose(Image.open(master(slug)))
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA')
        flat = Image.new('RGBA', im.size, (255, 255, 255, 255))
        flat.alpha_composite(im)
        im = flat
    return im.convert('RGB')


def cached(slug):
    digest = hashlib.sha256(open(master(slug), 'rb').read()).hexdigest()[:16]
    return os.path.join(CACHE, f'{slug}-{digest}.npy')


def matte(slug):
    """Runs the model on one master and caches its raw 1024x1024 output. Called in a
    child process of its own — see THE MODEL above for why."""
    import onnxruntime as ort
    opts = ort.SessionOptions()
    opts.enable_cpu_mem_arena = False
    opts.enable_mem_pattern = False
    sess = ort.InferenceSession(MODEL, opts, providers=['CPUExecutionProvider'])
    x = np.asarray(load(slug).resize((1024, 1024), Image.BILINEAR), dtype=np.float32) / 255.0
    x = (x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]  # ImageNet, as BiRefNet was trained
    y = sess.run(None, {'input_image': x.transpose(2, 0, 1)[None].astype(np.float32)})[0][0, 0]
    os.makedirs(CACHE, exist_ok=True)
    np.save(cached(slug), (1 / (1 + np.exp(-y))).astype(np.float16))


def alpha_of(slug, size):
    m = np.load(cached(slug)).astype(np.float32)
    return np.asarray(Image.fromarray(m, 'F').resize(size, Image.BILINEAR)).clip(0, 1)


def detect(rgb, alpha):
    """Face box and eye line in master pixels. Runs on a copy no longer than DETECT, which
    is where the cascade parameters were tuned; a face must sit on the person's matte, and
    the largest one wins."""
    import cv2
    k = min(1.0, DETECT / max(rgb.size))
    small = rgb.resize((round(rgb.width * k), round(rgb.height * k)), Image.LANCZOS) if k < 1 else rgb
    g = cv2.cvtColor(np.asarray(small), cv2.COLOR_RGB2GRAY)
    w = g.shape[1]
    face = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    faces = [f for f in face.detectMultiScale(g, scaleFactor=1.05, minNeighbors=6, minSize=(max(24, w // 12),) * 2)
             if alpha[int((f[1] + f[3] / 2) / k), int((f[0] + f[2] / 2) / k)] > 0.5]
    if not faces:
        return None
    fx, fy, fw, fh = max(faces, key=lambda f: f[2] * f[3])
    # Eyes: one either side of the box's centre line, in its upper half, level with each
    # other. The plain cascade, not the glasses-tolerant one, although fourteen of the 24
    # then pictured wear glasses: measured on them, the plain one pairs 23 and the other 22, with the
    # same spread where both succeed.
    eye = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
    roi = g[fy:fy + fh * 3 // 5, fx:fx + fw]
    found = eye.detectMultiScale(roi, scaleFactor=1.05, minNeighbors=4, minSize=(max(8, int(fw) // 10),) * 2,
                                 maxSize=(int(fw) // 3,) * 2)
    centres = [(ex + ew / 2, ey + eh / 2) for ex, ey, ew, eh in found if 0.2 * fh < ey + eh / 2 < 0.55 * fh]
    left = [c for c in centres if c[0] < 0.5 * fw]
    right = [c for c in centres if c[0] > 0.5 * fw]
    pairs = [(a, b) for a in left for b in right if abs(a[1] - b[1]) < 0.08 * fw]
    if pairs:
        a, b = min(pairs, key=lambda p: abs(p[0][1] - p[1][1]))
        eye_y, how = fy + (a[1] + b[1]) / 2, 'eyes'
    else:
        eye_y, how = fy + EYE_IN_BOX * fh, 'face box'
    return [v / k for v in (fx, fy, fw, fh)], eye_y / k, how


def frame(slug):
    rgb = load(slug)
    W, H = rgb.size
    a = alpha_of(slug, (W, H))
    found = detect(rgb, a)
    if found is None:
        sys.exit(f'{slug}: no face found on the matte')
    (fx, fy, fw, fh), eye_y, how = found
    s = FACE * T / fh

    def place():
        ox, oy = T / 2 - (fx + fw / 2) * s, EYE * T - eye_y * s
        return max(1, round(W * s)), max(1, round(H * s)), round(ox), round(oy)
    nw, nh, px, py = place()

    # THE EDGE CLAMP. Pad in source pixels, far enough that the padded edge lands past the
    # tile (the +2) so the edge fade below never sees it as a cut.
    # Only where the person reaches the photo's edge: an edge that is all background leaves
    # nothing to clamp, and would only make the report claim an extension that isn't there.
    gaps = {'bottom': T - (py + nh), 'left': px, 'right': T - (px + nw)}
    touches = {'bottom': a[-1, :], 'left': a[:, 0], 'right': a[:, -1]}
    grow = {k: int(np.ceil((g + 2) / s)) for k, g in gaps.items()
            if 0 < g <= EDGE_CLAMP * T and (touches[k] > 0.5).any()}
    if grow:
        pads = ((0, grow.get('bottom', 0)), (grow.get('left', 0), grow.get('right', 0)))
        rgb = Image.fromarray(np.pad(np.asarray(rgb), pads + ((0, 0),), mode='edge'))
        a = np.pad(a, pads, mode='edge')
        fx += grow.get('left', 0)
        W, H = rgb.size
        nw, nh, px, py = place()
    extended = {k: gaps[k] / T for k in grow}

    # Resample premultiplied, in float: an unpremultiplied resize drags the background's
    # colour out along every soft edge of the matte, which is the halo this is meant to lose.
    src = np.asarray(rgb, np.float32) / 255
    planes = [src[..., i] * a for i in range(3)] + [a]
    planes = [np.asarray(Image.fromarray(p, 'F').resize((nw, nh), Image.LANCZOS)) for p in planes]
    big = np.stack(planes, -1).clip(0, 1)
    c = np.zeros((T, T, 4), np.float32)
    x0, y0, x1, y1 = max(px, 0), max(py, 0), min(px + nw, T), min(py + nh, T)
    c[y0:y1, x0:x1] = big[y0 - py:y1 - py, x0 - px:x1 - px]
    A = c[..., 3].copy()
    rgbf = np.where(A[..., None] > 1e-4, c[..., :3] / np.maximum(A, 1e-4)[..., None], 0).clip(0, 1)

    # THE EDGE FADE. Mark every tile pixel where a source edge lands with the person on
    # it — the border's own alpha, resampled along the edge's length in the tile — then
    # fade by distance to the nearest mark. An edge that lands outside the tile is the
    # tile's own edge doing the cropping, and needs nothing.
    cut = np.zeros((T, T), bool)
    depth = {}
    for k, row, at in (('top', a[0, :], py), ('bottom', a[-1, :], py + nh - 1),
                       ('left', a[:, 0], px), ('right', a[:, -1], px + nw - 1)):
        if not 0 <= at < T:
            continue
        span = np.arange(max(px if k in ('top', 'bottom') else py, 0),
                         min((px + nw) if k in ('top', 'bottom') else (py + nh), T))
        start = px if k in ('top', 'bottom') else py
        hit = np.interp((span + 0.5 - start) / s - 0.5, np.arange(row.size), row) > 0.5
        if hit.any():
            if k in ('top', 'bottom'):
                cut[at, span[hit]] = True
            else:
                cut[span[hit], at] = True
            depth[k] = (at if k in ('top', 'left') else T - 1 - at) / T
    fade = np.ones((T, T), np.float32)
    if cut.any():
        import cv2
        t = np.clip(cv2.distanceTransform((~cut).astype(np.uint8), cv2.DIST_L2, 5) / (EDGE_FADE * T), 0, 1)
        fade = t * t * (3 - 2 * t)
    A = A * fade
    # The fade may not reach the face: the middle of the face box, inset by a sixth on each
    # side so the check is about features, not the box's loose corners.
    fx0, fy0 = px + (fx + fw / 6) * s, py + (fy + fh / 6) * s
    core = fade[max(0, round(fy0)):round(fy0 + fh * s * 2 / 3), max(0, round(fx0)):round(fx0 + fw * s * 2 / 3)]
    face_kept = float(core.min()) if core.size else 0.0

    # THE GRADE, over the head: the figure above the bottom of the face box.
    shown = A > 0.8
    shown[max(0, round(py + (fy + fh) * s)):] = False
    lum = (rgbf[..., 0] * 0.2126 + rgbf[..., 1] * 0.7152 + rgbf[..., 2] * 0.0722)[shown] * 255
    p = float(np.percentile(lum, 99.8)) if lum.size else 250.0
    lift = min(1.08, max(1.0, 250 / max(p, 1)))
    rgbf = (rgbf * lift).clip(0, 1)

    out = np.dstack([rgbf, A]) * 255
    out = np.rint(out).astype(np.uint8)
    out[out[..., 3] == 0, :3] = 0
    os.makedirs(OUT, exist_ok=True)
    Image.fromarray(out, 'RGBA').save(os.path.join(OUT, slug + '.webp'), lossless=True, quality=100, method=6, exact=False)
    return {
        'source': f'{W}x{H}', 'face_px': round(fh), 'eye_line': how, 'scale': round(s * 512 / T, 2),
        'cuts': depth, 'extended': extended, 'face_kept': round(face_kept, 3), 'white_point': round(p), 'lift': round(lift, 3),
    }


def main():
    args = sys.argv[1:]
    if args and args[0].startswith('--matte='):
        return matte(args[0].split('=', 1)[1])
    slugs = pictured()
    only = [s for a in args if a.startswith('--only=') for s in a.split('=', 1)[1].split(',')]
    if only:
        unknown = sorted(set(only) - set(slugs))
        if unknown:
            sys.exit(f'not pictured in index.html: {", ".join(unknown)}')
        slugs = only
    todo = [s for s in slugs if not os.path.exists(cached(s))]
    if todo:
        if not os.path.exists(MODEL):
            sys.exit(__doc__[__doc__.index('THE MODEL'):__doc__.index('At its 1024')])
        h = hashlib.sha256()
        with open(MODEL, 'rb') as f:
            for chunk in iter(lambda: f.read(1 << 24), b''):
                h.update(chunk)
        if h.hexdigest() != MODEL_SHA256:
            sys.exit(f'{MODEL} is not the model this was run with (sha256 {h.hexdigest()})')
        for s in todo:
            print(f'matting {s}', flush=True)
            subprocess.run([sys.executable, __file__, f'--matte={s}'], check=True)
    warn = []
    # scale is against the 512 the tile ships at, so anything over 1 is a photograph being
    # enlarged; "faded" is how far inside the tile each source edge that cuts the person
    # lands, and "extended" the ones close enough to the tile's edge to be clamped out to it.
    print(f"\n{'':22}{'source':>11} {'face':>5} {'eye line':>9} {'scale':>6}  {'faded':28}{'extended':24}lift")
    for s in slugs:
        r = frame(s)
        pct = lambda d: ', '.join(f'{k} {v:.0%}' for k, v in sorted(d.items(), key=lambda kv: -kv[1])) or '-'
        print(f"{s:22}{r['source']:>11} {r['face_px']:>5} {r['eye_line']:>9} {r['scale']:>5}x  "
              f"{pct(r['cuts']):28}{pct(r['extended']):24}{r['lift']:.3f}")
        if r['face_kept'] < 0.95:
            warn.append(f"{s} ({r['face_kept']:.0%})")
    if warn:
        print(f'\na fade reaches into the face: {", ".join(warn)}. That photograph is too tight for the '
              'shared framing; ask for a looser one rather than special-casing it.')


if __name__ == '__main__':
    main()
