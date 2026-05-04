"""Generate MTG Life icons: a die showing 20 pips arranged as a d20 hint, simplified to a chunky 6-pip face on a dark rounded square."""
from PIL import Image, ImageDraw, ImageFont

BG = (10, 10, 10, 255)
FACE = (246, 243, 236, 255)
PIP = (26, 26, 26, 255)


def make_icon(size: int, path: str, rounded: bool = True):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    radius = int(size * 0.22) if rounded else 0
    if rounded:
        d.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=BG)
    else:
        d.rectangle((0, 0, size - 1, size - 1), fill=BG)

    # A bold "20" centered. Falls back to a thick stroke shape if no font.
    cx, cy = size / 2, size / 2

    text = "20"
    font = None
    for candidate in (
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ):
        try:
            font = ImageFont.truetype(candidate, int(size * 0.62))
            break
        except OSError:
            continue
    if font is None:
        font = ImageFont.load_default()

    bbox = d.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    x = cx - w / 2 - bbox[0]
    y = cy - h / 2 - bbox[1] - size * 0.02
    d.text((x, y), text, fill=FACE, font=font)

    img.save(path, "PNG")
    print(f"wrote {path} ({size}x{size})")


if __name__ == "__main__":
    # apple-touch-icon should be solid (no transparency) and not rounded —
    # iOS applies the rounding itself.
    make_icon(180, "icon-180.png", rounded=False)
    make_icon(192, "icon-192.png", rounded=True)
    make_icon(512, "icon-512.png", rounded=True)
