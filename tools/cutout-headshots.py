#!/usr/bin/env python3
"""Cuts every pictured headshot out of its background and frames all of them the same
way, writing the masters tools/encode-images.mjs reads for the Who We Are tiles:

  source-material/image-sources/team/<slug>.*         the photo as received   (read)
  source-material/image-sources/team-cutout/<slug>.webp  768px RGBA, framed    (written)

  python3 tools/cutout-headshots.py                    everyone pictured
  python3 tools/cutout-headshots.py --only=abby-petre  one person, e.g. someone new

Who is pictured is read off index.html (every assets/team/<slug>.webp it references),
whose tiles tools/build-team.mjs writes from the roster, source-material/team/people.json:
a person is added there, with a group and a photo, and their card follows. The output
carries no colour treatment: it is the person, lifted off their background, at a shared scale and
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

Nothing is zoomed to suit a photograph beyond what THE REACH below allows, and that is
bounded on purpose. The first version of this zoomed without a limit — it raised the scale
for anyone whose photo was cropped too tight to fill the square, so four people got bigger
faces than everyone else — and it read as unfair once all 24 were side by side.

The shoulders then run straight off the bottom and sides of the tile, the way a
photographed headshot's do. Where a photograph is cropped tighter than that, its own edge
lands inside the tile and would leave the figure ending in mid-air, and three rules deal
with it, in order.

THE EDGE STRETCH handles a photo that stops a little short. Where it stops within
EDGE_STRETCH of the tile's bottom or side edge, the band of it nearest that edge, STRETCH_BAND
times the gap deep, is resampled to cover the gap as well. That is the last few percent of a
shirt, lengthened by a quarter at most, and never at the top, where stretched hair looks like
what it is. Until September 2026 this repeated the photo's last row or column instead, for
gaps up to 4%. That was invisible on plain cloth, but it drew a barcode of vertical streaks
down Andrew's striped shirt and Ryan's tweed and left a flat block on Ben's shoulder.
Stretched, all three read as cloth.

The band must never reach THE FACE KEEP: the face box grown by FACE_KEEP of its size on every
side, so the jaw, the ears and a little of the neck are inside it. So the stretch covers at
most a quarter of the room between that and the photo's edge, as well as EDGE_STRETCH. The
first version had only the 8% limit, and on the tightest photos the band reached up past
the chin. A judge measuring Byungyeon's tile found his lip-to-chin 28% longer than in his
photo, and Andrew's, Sonia's and Ryan's jaws and necks had grown the same way; at the sides,
Tom Peterson's, Raquel's and Blair's cheeks had widened. No judge looking only at the grid
had noticed. Checked since: inside every face keep, the stretched cut-out and the same
framing unstretched agree to under a pixel.

A side is stretched, or reached for, only where the person meets it below the chin. A side
met above the chin is hair, or someone standing beside them: Allison's photo has a
neighbour's shoulder and hair at its left edge, which the matte keeps joined to her.
Stretching that edge carried a strip of someone else's hair to the tile's edge, so it keeps
the fade, as it always had.

THE REACH handles a photo that stops further in than the stretch can cover. Its eye line is
lowered by up to REACH_DROP of the tile and its face enlarged by up to REACH_ZOOM, each by the
same fraction of its limit, and by the least that brings the photo's edge within the stretch.
Sharing it is what keeps it from showing. Enlarging alone pushes a tall head of hair off the
top of the tile (Andrew's, at 1.34x). Lowering alone sinks a head below everyone else's
(Sonia's crown sat 14% down at 8%, against 2-8% for everyone else). Half of each barely
moves the crown.
- The sides are reached by enlarging alone, since lowering does nothing for them.
- A photo cut at the top is lowered no further than keeps that cut above the tile.
- An edge the limits cannot reach is not reached at all, and if that edge is the bottom,
  nothing is: a figure that still floats gains nothing from a larger face.
The limits were set by eye, on sheets of each person's options beside people framed
normally, by independent judges looking at colour and duotone at 200 and 400px. Faces up to
about 1.2x and eye lines up to 6% lower read as the same crop; 8% lower read as a sunken head,
and 1.34x as a cramped passport photo with the crown cut off.

Where it landed in September 2026:
- enlarged 1.03x and 1% lower: Aarav's photo;
- enlarged 1.15-1.21x: Blair's, Raquel's and Tom Peterson's (cut at the sides);
- enlarged 1.16x and 4% lower: Sonia's;
- enlarged 1.22x and 5% lower: Andrew's, and at 2.4x his 203px original, one of the softest
  tiles on the page.
Byungyeon's is grounded the same way, but his passport photo cuts his shoulders 18% in from
both sides, and reaching them would take more than the limit, so his sides still fade.
Ryan's 190px photo is cut at the hairline and across the chest, and cannot be grounded
within the limits without stretching his chin, so it is left exactly as it was. A 1.29x
framing that grounded him was preferred by every judge to the floating bust, but its
stretch reached his jaw, and that is not a trade this makes on someone's face.

THE EDGE FADE is what is left: wherever a photograph's own edge still cuts through the
person, the figure fades to nothing over EDGE_FADE as it approaches that cut. The fade is
measured from the cut itself — the stretch of the border the matte actually touches — not
from the whole edge, so a photo cut at the shoulder does not also fade the cheek above it.
Before the stretch and the reach, nine photos faded like this, and they looked different
from everyone else. Three still do, as described above: Ryan's, Byungyeon's sides and
Allison's left edge. Two shared fades were tried to hide that, and both went:
- A single vignette tuned so every one of those cuts fell where it had already faded
  out. Ryan's chest and Byungyeon's shoulders force it to finish just below everybody's
  chin, which kept 4-13% of anyone's shoulders — 24 floating heads, with the curve cutting
  through Angela's, Nikki's and Mohammed's hair.
- A soft U at the shoulders for everyone, on top of the edge fade. It shipped briefly in
  September 2026. A feather below the shoulders reads as a floating bust, and on the
  seventeen photos that are not cropped short it was a fade with nothing to hide.
Better originals remain the real fix for everyone the reach enlarges or leaves fading, and
nothing here needs to change when they arrive: a photograph loose enough for the framing
is not touched by any of this. The report names every edge still fading.

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
EDGE_STRETCH = 0.08 # THE EDGE STRETCH: how short of the tile's bottom or sides a photo may
                    # stop and be stretched to it rather than faded
STRETCH_BAND = 4  # how deep a band the stretch resamples, in multiples of the gap it covers,
                  # so the clothing it lengthens is lengthened by a quarter at most
FACE_KEEP = 0.10  # THE FACE KEEP: the face box grown by this much of its size on every side,
                  # which the stretch may never reach into
REACH_DROP = 0.06 # THE REACH's limits: how far below EYE an eye line may be lowered, as a
REACH_ZOOM = 1.25 # fraction of the tile, and how much larger than FACE a face may be made


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
    eye = EYE

    # Which edges of the photo the person runs into. A side the person meets above the chin
    # is not their shoulder but their hair, or someone standing beside them; neither is
    # stretched or reached for, and the edge fade below deals with it as it always has.
    chin = int(fy + fh)
    touches = {'top': a[0, :], 'bottom': a[-1, :], 'left': a[:, 0], 'right': a[:, -1]}
    touches = {k: bool((v > 0.5).any()) for k, v in touches.items()}
    shoulder = {'bottom': touches['bottom'],
                'left': touches['left'] and not (a[:chin, 0] > 0.5).any(),
                'right': touches['right'] and not (a[:chin, -1] > 0.5).any()}

    def edges(z, d):
        # tile pixels: how far inside the tile each edge of the photo lands, and how far that
        # edge is from THE FACE KEEP (the face box grown by FACE_KEEP of its size)
        sz = s * z
        ox, oy = T / 2 - (fx + fw / 2) * sz, (EYE + d) * T - eye_y * sz
        kx, ky = FACE_KEEP * fw * sz, FACE_KEEP * fh * sz
        gap = {'bottom': T - (oy + H * sz), 'left': ox, 'right': T - (ox + W * sz)}
        room = {'bottom': (oy + H * sz) - (oy + (fy + fh) * sz + ky),
                'left': (ox + fx * sz - kx) - ox,
                'right': (ox + W * sz) - (ox + (fx + fw) * sz + kx)}
        return gap, room

    def stretchable(k, z, d, slack=0):
        # THE EDGE STRETCH's limit at this edge: EDGE_STRETCH, and never so far that its band
        # (STRETCH_BAND times the gap) would reach the face keep
        gap, room = edges(z, d)
        return gap[k] <= min(EDGE_STRETCH * T, max(0.0, room[k]) / STRETCH_BAND) - slack

    # THE REACH. Where the person runs into an edge of the photo that lands further inside
    # the tile than the stretch can cover, lower the eye line and enlarge, each by the same
    # fraction of its limit, until it no longer does. The sides are reached by enlarging
    # alone, since lowering does nothing for them, and a photo cut at the top is lowered no
    # further than keeps that cut above the tile. An edge the limits cannot reach is left to
    # the fade and costs the face nothing. Every test is a pixel inside its limit (slack),
    # so the rounding in place() cannot push an edge back over it.
    fits = lambda k, z, d: stretchable(k, z, d, slack=1)

    def least(ok):
        # the smallest fraction of the limits that satisfies ok, which holds at 1
        lo, hi = 0.0, 1.0
        for _ in range(30):
            lo, hi = (lo, (lo + hi) / 2) if ok((lo + hi) / 2) else ((lo + hi) / 2, hi)
        return hi
    zoom_at = lambda t: 1 + (REACH_ZOOM - 1) * t

    def drop_at(t, z):
        d = REACH_DROP * t
        if touches['top']:
            # the photo's top edge sits at (EYE + d) * T - eye_y * s * z; keep it two pixels
            # above the tile, so rounding cannot land it on the first row and fade the crown
            d = min(d, max(0.0, (eye_y * s * z - 2) / T - EYE))
        return d
    short = [k for k in ('bottom', 'left', 'right') if shoulder[k] and not fits(k, 1, 0)]
    unreached = [k for k in short if not fits(k, REACH_ZOOM, drop_at(1, REACH_ZOOM) if k == 'bottom' else 0)]
    if 'bottom' in unreached:
        # A figure that still floats gains nothing from a larger face: reach nothing.
        unreached = short
    sides = [k for k in short if k != 'bottom' and k not in unreached]
    z = zoom_at(least(lambda t: all(fits(k, zoom_at(t), 0) for k in sides))) if sides else 1.0
    d = 0.0
    if 'bottom' in short and 'bottom' not in unreached:
        tb = least(lambda t: fits('bottom', max(z, zoom_at(t)), drop_at(t, max(z, zoom_at(t)))))
        z = max(z, zoom_at(tb))
        # With the zoom settled (the sides may have asked for more), lower no further than
        # the bottom still needs.
        most = drop_at(tb, z)
        d = most * least(lambda u: fits('bottom', z, most * u))
    stretch_ok = {k: shoulder[k] and stretchable(k, z, d) for k in ('bottom', 'left', 'right')}
    s, eye = s * z, EYE + d
    reach = {'zoom': round(z, 3), 'drop': round(d, 4), 'unreached': unreached}

    def place():
        ox, oy = T / 2 - (fx + fw / 2) * s, eye * T - eye_y * s
        return max(1, round(W * s)), max(1, round(H * s)), round(ox), round(oy)
    nw, nh, px, py = place()

    # THE EDGE STRETCH. Grow the photo in source pixels, far enough that the new edge lands
    # past the tile (the +2) so the edge fade below never sees it as a cut, by resampling
    # the band nearest that edge — STRETCH_BAND times the gap deep — to cover the gap too.
    # Only where the person reaches the photo's edge: an edge that is all background leaves
    # nothing to stretch, and would only make the report claim an extension that isn't there.
    gaps = {'bottom': T - (py + nh), 'left': px, 'right': T - (px + nw)}
    grow = {k: int(np.ceil((g + 2) / s)) for k, g in gaps.items() if 0 < g and stretch_ok[k]}
    if grow:
        def stretch(p, n, side):
            h, w = p.shape
            b = min(h if side == 'bottom' else w, max(STRETCH_BAND * n, 8))
            rs = lambda band, size: np.asarray(Image.fromarray(np.ascontiguousarray(band), 'F').resize(size, Image.BICUBIC))
            if side == 'bottom':
                return np.concatenate([p[:h - b], rs(p[h - b:], (w, b + n))], 0)
            if side == 'left':
                return np.concatenate([rs(p[:, :b], (b + n, h)), p[:, b:]], 1)
            return np.concatenate([p[:, :w - b], rs(p[:, w - b:], (b + n, h))], 1)
        src = np.asarray(rgb, np.float32)
        planes = [src[..., i] for i in range(3)] + [a]
        for k in ('bottom', 'left', 'right'):
            if k in grow:
                planes = [stretch(p, grow[k], k) for p in planes]
        rgb = Image.fromarray(np.rint(np.stack(planes[:3], -1)).clip(0, 255).astype(np.uint8))
        a = planes[3].clip(0, 1)
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
        **reach,
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
    warn, loose = [], []
    # scale is against the 512 the tile ships at, so anything over 1 is a photograph being
    # enlarged; "reach" is THE REACH's enlargement of the face and lowering of the eye line;
    # "faded" is how far inside the tile each source edge that still cuts the person lands,
    # and "stretched" the ones close enough to the tile's edge to be stretched out to it.
    print(f"\n{'':22}{'source':>11} {'face':>5} {'eye line':>9} {'scale':>6}  {'reach':16}{'faded':22}{'stretched':30}lift")
    for s in slugs:
        r = frame(s)
        pct = lambda d: ', '.join(f'{k} {v:.0%}' for k, v in sorted(d.items(), key=lambda kv: -kv[1])) or '-'
        reach = (f"{r['zoom']:.2f}x" + (f", eye -{r['drop']:.0%}" if r['drop'] >= 0.005 else '')) if r['zoom'] > 1 else '-'
        print(f"{s:22}{r['source']:>11} {r['face_px']:>5} {r['eye_line']:>9} {r['scale']:>5}x  "
              f"{reach:16}{pct(r['cuts']):22}{pct(r['extended']):30}{r['lift']:.3f}")
        if r['face_kept'] < 0.95:
            warn.append(f"{s} ({r['face_kept']:.0%})")
        if r['unreached']:
            loose.append(f"{s} ({', '.join(r['unreached'])})")
    if loose:
        print(f'\nbeyond the reach, so still fading: {", ".join(loose)}. A looser original is the fix.')
    if warn:
        print(f'\na fade reaches into the face: {", ".join(warn)}. That photograph is too tight for the '
              'shared framing; ask for a looser one rather than special-casing it.')


if __name__ == '__main__':
    main()
