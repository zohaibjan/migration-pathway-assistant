#!/usr/bin/env python3
"""Generate Migration Assist app icons + splash assets.

Produces a small set of branded PNGs (paper-plane mark on the indigo->violet
brand gradient) so the app no longer ships the default Expo placeholder icons.

Run:  python3 scripts/generate_icons.py

This is a generated brand mark intended to unblock the store submission. It can
be replaced by a designer-supplied set later by overwriting the files in assets/
(keep the same filenames so app.json keeps resolving them).
"""
from PIL import Image, ImageDraw

# Brand palette (mirrors src/constants/index.ts COLORS).
INDIGO600 = (79, 70, 229)
VIOLET600 = (124, 58, 237)
INDIGO100 = (224, 231, 255)
WHITE = (255, 255, 255)

SS = 4  # supersample factor for smooth edges


def diagonal_gradient(size, top_left, bottom_right):
    """Vertical-ish diagonal gradient image."""
    base = Image.new("RGB", (size, size), top_left)
    px = base.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            r = round(top_left[0] + (bottom_right[0] - top_left[0]) * t)
            g = round(top_left[1] + (bottom_right[1] - top_left[1]) * t)
            b = round(top_left[2] + (bottom_right[2] - top_left[2]) * t)
            px[x, y] = (r, g, b)
    return base


def plane_polys(size):
    """Return the two paper-plane triangles scaled to `size` (0..100 art space)."""
    def p(x, y):
        return (x / 100 * size, y / 100 * size)

    nose = p(88, 16)
    left = p(12, 46)
    mid = p(44, 58)
    tail = p(54, 86)
    wing = [nose, left, mid]   # upper wing
    body = [nose, mid, tail]   # lower fold
    return wing, body


def draw_plane(img, color_wing, color_body, scale=1.0, offset=(0, 0)):
    size = img.size[0]
    art = size * scale
    ox = (size - art) / 2 + offset[0] * size
    oy = (size - art) / 2 + offset[1] * size
    wing, body = plane_polys(art)
    wing = [(x + ox, y + oy) for x, y in wing]
    body = [(x + ox, y + oy) for x, y in body]
    d = ImageDraw.Draw(img)
    d.polygon(body, fill=color_body)
    d.polygon(wing, fill=color_wing)


def make_icon(path, size=1024):
    # iOS app icons must be fully opaque (no alpha channel) or the App Store
    # rejects the build, so this one is flattened to RGB.
    s = size * SS
    img = diagonal_gradient(s, INDIGO600, VIOLET600).convert("RGBA")
    draw_plane(img, WHITE, INDIGO100, scale=0.62)
    img.convert("RGB").resize((size, size), Image.LANCZOS).save(path)
    print("wrote", path)


def make_adaptive(path, size=1024):
    """White mark on transparent, sized into the Android safe zone."""
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw_plane(img, WHITE, (224, 231, 255, 230), scale=0.46)
    img.resize((size, size), Image.LANCZOS).save(path)
    print("wrote", path)


def make_splash(path, size=1024):
    """Indigo mark on transparent for the light splash background."""
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw_plane(img, INDIGO600, VIOLET600, scale=0.40)
    img.resize((size, size), Image.LANCZOS).save(path)
    print("wrote", path)


def make_favicon(path, size=48):
    s = size * SS
    img = diagonal_gradient(s, INDIGO600, VIOLET600).convert("RGBA")
    draw_plane(img, WHITE, INDIGO100, scale=0.62)
    img.convert("RGB").resize((size, size), Image.LANCZOS).save(path)
    print("wrote", path)


if __name__ == "__main__":
    import os

    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assets = os.path.join(here, "assets")
    os.makedirs(assets, exist_ok=True)
    make_icon(os.path.join(assets, "icon.png"))
    make_adaptive(os.path.join(assets, "adaptive-icon.png"))
    make_splash(os.path.join(assets, "splash-icon.png"))
    make_favicon(os.path.join(assets, "favicon.png"))
