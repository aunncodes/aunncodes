import base64
import html
import re
from io import BytesIO
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from PIL import Image, ImageDraw, ImageFont


USERNAME = "aunncodes"
NAME = "Aunn"

README_SVG = Path("assets/readme.svg")

WIDTH, HEIGHT = 1584, 396

TOTAL_RE = re.compile(r"([\d,]+)\s+contributions?\s+in\s+the\s+last\s+year", re.I)
MONTHS = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")

BG = (10, 18, 29, 255)
TEXT = (238, 246, 255, 180)
MUTED = (146, 169, 193, 255)
LINE = (255, 255, 255, 18)
LEVELS = (
    (26, 36, 50),
    (32, 78, 112),
    (40, 113, 160),
    (59, 153, 214),
    (114, 209, 255),
)

VISITOR_BADGE_URL = "https://api.visitorbadge.io/api/visitors?path=github.com%2Faunncodes&countColor=%23263759"

STATS_CARD_URL = "https://personal-readme-stats.vercel.app/api?username=aunncodes&show_icons=true&theme=blue_navy&disable_animations=true"


def font(size, bold=False):
    candidates = [
        "/usr/share/fonts/inter/InterVariable.ttf",
        "/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf" if bold else "/usr/share/fonts/opentype/inter/InterDisplay-Regular.otf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica.ttc",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
    ]

    for path in candidates:
        if Path(path).exists():
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                pass

    return ImageFont.load_default()


def parse_rects(soup):
    cells = []

    for rect in soup.find_all("rect"):
        if rect.has_attr("data-date") and rect.has_attr("data-count"):
            cells.append({
                "x": int(float(rect.get("x", "0"))),
                "y": int(float(rect.get("y", "0"))),
                "date": rect["data-date"],
                "level": max(0, min(4, int(rect.get("data-level", "0")))),
            })

    return cells


def parse_table(soup):
    cells = []

    for row_index, row in enumerate(soup.select("table.ContributionCalendar-grid tr")):
        for col_index, cell in enumerate(row.select("td.ContributionCalendar-day")):
            date = cell.get("data-date")

            if date:
                cells.append({
                    "x": col_index,
                    "y": max(0, row_index - 1),
                    "date": date,
                    "level": max(0, min(4, int(cell.get("data-level", "0")))),
                })

    return cells


def generate_contribution_png():
    response = requests.get(
        f"https://github.com/users/{USERNAME}/contributions",
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; ContributionImageBot/1.0)",
            "Accept-Language": "en-US,en;q=0.9",
        },
        timeout=20,
    )
    response.raise_for_status()

    page = response.text
    soup = BeautifulSoup(page, "html.parser")

    total_match = TOTAL_RE.search(page)
    total = int(total_match.group(1).replace(",", "")) if total_match else 0

    cells = parse_rects(soup) or parse_table(soup)

    if not cells:
        raise SystemExit(f"Could not parse contributions for {USERNAME}.")

    xs = sorted({cell["x"] for cell in cells})
    ys = sorted({cell["y"] for cell in cells})

    x_index = {x: i for i, x in enumerate(xs)}
    y_index = {y: i for i, y in enumerate(ys)}

    grid = [[0 for _ in xs] for _ in ys]
    dates = [["" for _ in xs] for _ in ys]

    for cell in cells:
        row = y_index[cell["y"]]
        col = x_index[cell["x"]]
        grid[row][col] = cell["level"]
        dates[row][col] = cell["date"]

    months = []

    for col in range(len(xs)):
        date = next((dates[row][col] for row in range(len(ys)) if dates[row][col]), "")
        months.append(MONTHS[int(date[5:7]) - 1] if date else "")

    image = Image.new("RGBA", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image, "RGBA")

    draw.line((64, 318, WIDTH - 64, 318), fill=LINE, width=1)
    draw.text((72, 96), NAME, font=font(35, True), fill=TEXT)
    draw.text(
        (72, 142),
        f"{total:,} contributions" if total else "GitHub activity",
        font=font(18),
        fill=MUTED,
    )

    origin_x, origin_y = 300, 128
    cell_size, gap = 18, 5
    previous_month = None

    for col, month in enumerate(months):
        if month and month != previous_month:
            x = origin_x + col * (cell_size + gap)
            draw.text((x, origin_y - 32), month, font=font(16), fill=MUTED)
            previous_month = month

    for row, values in enumerate(grid):
        for col, level in enumerate(values):
            x = origin_x + col * (cell_size + gap)
            y = origin_y + row * (cell_size + gap)

            draw.rounded_rectangle(
                (x, y, x + cell_size, y + cell_size),
                radius=5,
                fill=(*LEVELS[level], 255),
            )

    output = BytesIO()
    image.convert("RGB").save(output, format="PNG", optimize=True)
    return output.getvalue()


def fetch(url):
    response = requests.get(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; ReadmeAssetInliner/1.0)",
            "Accept": "image/svg+xml,image/*,*/*",
        },
        timeout=20,
    )
    response.raise_for_status()
    return response.content


def data_uri(data, mime):
    encoded = base64.b64encode(data).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def replace_href(svg, image_id, href):
    href = html.escape(href, quote=True)

    pattern = (
        rf'(<image\b(?=[^>]*\bid="{re.escape(image_id)}")[^>]*\bhref=")'
        rf'[^"]*'
        rf'("[^>]*>)'
    )

    svg, count = re.subn(pattern, rf"\1{href}\2", svg, count=1)

    if count != 1:
        raise SystemExit(f'Could not find image with id="{image_id}".')

    return svg


def main():
    svg = README_SVG.read_text(encoding="utf-8")

    contributions = data_uri(generate_contribution_png(), "image/png")
    visitors = data_uri(fetch(VISITOR_BADGE_URL), "image/svg+xml")
    stats = data_uri(fetch(STATS_CARD_URL), "image/svg+xml")

    svg = replace_href(svg, "contributions-img", contributions)
    svg = replace_href(svg, "visitor-badge", visitors)
    svg = replace_href(svg, "stats-card", stats)

    README_SVG.write_text(svg, encoding="utf-8")

    print(f"Updated {README_SVG}")


if __name__ == "__main__":
    main()