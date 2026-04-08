#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import io
import json
import time
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


CANVAS_W = 960
CANVAS_H = 1280


SPECS = [
    {
        "raw": "01-cover",
        "title": "AI办公进入代做时代",
        "subtitle": "别再卷提示词了",
        "body": [
            "真正拉开差距的，",
            "是资料库和工作流。",
        ],
        "accent": ("#FF7447", "#FFD07A"),
    },
    {
        "raw": "02-shift",
        "title": "重点已经变了",
        "subtitle": "不是模型更强",
        "body": [
            "而是 AI 开始帮你",
            "把一段工作做完。",
        ],
        "accent": ("#0FB7A4", "#A2F1E7"),
    },
    {
        "raw": "03-advantages",
        "title": "真正拉开差距的 3 件事",
        "subtitle": "资料库 / 流程 / 反馈",
        "body": [
            "1. 资料够干净",
            "2. 流程够清楚",
            "3. 结果有反馈",
        ],
        "accent": ("#6A5BFF", "#C6BCFF"),
    },
    {
        "raw": "04-action",
        "title": "普通人今天就能做的 3 步",
        "subtitle": "先把 AI 能接手的部分整理出来",
        "body": [
            "把资料放到固定目录",
            "把重复工作拆成步骤",
            "把结果和反馈记下来",
        ],
        "accent": ("#FF4D6D", "#FFB3C1"),
    },
    {
        "raw": "05-ending",
        "title": "以后比的不是谁更会问",
        "subtitle": "而是谁先把信息流整理成 AI 能干活的形状",
        "body": [
            "模型会越来越像，",
            "流程壁垒会越来越大。",
        ],
        "accent": ("#FF8C42", "#FFE0B2"),
    },
]


def read_token_from_stdin() -> str:
    token = sys.stdin.readline().strip()
    if not token:
        raise SystemExit("Missing token on stdin")
    return token


def post_json(url: str, token: str, payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        return json.loads(resp.read().decode("utf-8"))


def post_google_image(token: str, prompt: str) -> bytes:
    url = "https://api.tu-zi.com/v1beta/models/gemini-3-pro-image-preview:generateContent"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": "3:4", "imageSize": "1K"},
        },
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=240) as resp:
        result = json.loads(resp.read().decode("utf-8"))
    candidates = result.get("candidates", [])
    for candidate in candidates:
        content = candidate.get("content", {})
        for part in content.get("parts", []):
            inline = part.get("inlineData") or part.get("inline_data")
            if inline and inline.get("data"):
                return base64.b64decode(inline["data"])
    raise RuntimeError("No inline image data returned")


def generate_with_retry(token: str, prompt: str, retries: int = 3) -> bytes:
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            return post_google_image(token, prompt)
        except Exception as exc:
            last_error = exc
            if attempt < retries:
                time.sleep(2)
    raise RuntimeError(str(last_error) if last_error else "Unknown image generation error")


def download_bytes(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=180) as resp:
        return resp.read()


def resolve_image_bytes(value: str) -> bytes:
    if value.startswith("http://") or value.startswith("https://"):
        return download_bytes(value)
    if value.startswith("data:"):
        _, encoded = value.split(",", 1)
        return base64.b64decode(encoded)
    return base64.b64decode(value)


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Light.ttc",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    ]
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            try:
                return ImageFont.truetype(str(path), size=size, index=2 if bold else 0)
            except Exception:
                try:
                    return ImageFont.truetype(str(path), size=size)
                except Exception:
                    pass
    return ImageFont.load_default()


def wrap_lines(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for ch in text:
        candidate = current + ch
        if draw.textbbox((0, 0), candidate, font=font)[2] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = ch
    if current:
        lines.append(current)
    return lines


def draw_gradient(canvas: Image.Image, top_color: str, bottom_color: str) -> None:
    draw = ImageDraw.Draw(canvas)
    r1, g1, b1 = ImageColor_getrgb(top_color)
    r2, g2, b2 = ImageColor_getrgb(bottom_color)
    for y in range(CANVAS_H):
        t = y / max(CANVAS_H - 1, 1)
        r = int(r1 + (r2 - r1) * t)
        g = int(g1 + (g2 - g1) * t)
        b = int(b1 + (b2 - b1) * t)
        draw.line([(0, y), (CANVAS_W, y)], fill=(r, g, b))


def ImageColor_getrgb(color: str) -> tuple[int, int, int]:
    color = color.lstrip("#")
    return tuple(int(color[i:i + 2], 16) for i in (0, 2, 4))


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def blend(color_a: str, color_b: str, t: float) -> tuple[int, int, int]:
    a = ImageColor_getrgb(color_a)
    b = ImageColor_getrgb(color_b)
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def draw_card(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill, radius: int = 28, outline=None) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=3 if outline else 1)


def draw_line_stack(draw: ImageDraw.ImageDraw, x: int, y: int, widths: list[int], fill) -> None:
    for idx, width in enumerate(widths):
        draw.rounded_rectangle((x, y + idx * 28, x + width, y + idx * 28 + 12), radius=6, fill=fill)


def draw_arrow(draw: ImageDraw.ImageDraw, start: tuple[int, int], end: tuple[int, int], fill, width: int = 10) -> None:
    draw.line((start, end), fill=fill, width=width)
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    if dx == 0 and dy == 0:
        return
    if abs(dx) >= abs(dy):
        sign = 1 if dx >= 0 else -1
        pts = [end, (end[0] - 28 * sign, end[1] - 18), (end[0] - 28 * sign, end[1] + 18)]
    else:
        sign = 1 if dy >= 0 else -1
        pts = [end, (end[0] - 18, end[1] - 28 * sign), (end[0] + 18, end[1] - 28 * sign)]
    draw.polygon(pts, fill=fill)


def draw_person(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float, *, jacket, shirt, skin, hair) -> None:
    head_r = int(30 * scale)
    body_w = int(92 * scale)
    body_h = int(132 * scale)
    shoulder_y = y + head_r * 2 + int(8 * scale)
    draw.ellipse((x - head_r, y, x + head_r, y + head_r * 2), fill=skin)
    draw.pieslice((x - head_r - 8, y - 6, x + head_r + 8, y + head_r * 2), start=180, end=360, fill=hair)
    draw.rounded_rectangle((x - body_w // 2, shoulder_y, x + body_w // 2, shoulder_y + body_h), radius=int(22 * scale), fill=jacket)
    draw.polygon(
        [
            (x - int(18 * scale), shoulder_y),
            (x, shoulder_y + int(42 * scale)),
            (x + int(18 * scale), shoulder_y),
            (x + int(10 * scale), shoulder_y + int(78 * scale)),
            (x - int(10 * scale), shoulder_y + int(78 * scale)),
        ],
        fill=shirt,
    )
    arm_y = shoulder_y + int(48 * scale)
    draw.line((x - int(45 * scale), arm_y, x - int(90 * scale), arm_y + int(40 * scale)), fill=jacket, width=int(18 * scale))
    draw.line((x + int(45 * scale), arm_y, x + int(98 * scale), arm_y + int(34 * scale)), fill=jacket, width=int(18 * scale))
    leg_y = shoulder_y + body_h
    draw.line((x - int(18 * scale), leg_y, x - int(28 * scale), leg_y + int(78 * scale)), fill="#2D3748", width=int(16 * scale))
    draw.line((x + int(18 * scale), leg_y, x + int(32 * scale), leg_y + int(78 * scale)), fill="#2D3748", width=int(16 * scale))


def draw_desk(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, *, top, leg) -> None:
    draw.rounded_rectangle((x, y, x + w, y + 24), radius=12, fill=top)
    draw.rectangle((x + 24, y + 20, x + 40, y + h), fill=leg)
    draw.rectangle((x + w - 40, y + 20, x + w - 24, y + h), fill=leg)


def add_background_glow(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill) -> None:
    draw.ellipse(box, fill=fill)


def compose_card(raw_path: Path, out_path: Path, spec: dict) -> None:
    top_color, bottom_color = spec["accent"]
    canvas = Image.new("RGB", (CANVAS_W, CANVAS_H), "#FFF9F2")
    draw_gradient(canvas, "#FFF8F1", "#FFF2E6")

    raw = Image.open(raw_path).convert("RGB")
    hero = ImageOps.fit(raw, (840, 540), method=Image.Resampling.LANCZOS)
    hero_mask = rounded_mask(hero.size, 42)
    canvas.paste(hero, (60, 50), hero_mask)

    draw = ImageDraw.Draw(canvas)
    title_font = load_font(56, bold=True)
    subtitle_font = load_font(34, bold=False)
    body_font = load_font(30, bold=False)
    chip_font = load_font(24, bold=True)

    draw.rounded_rectangle((68, 630, 260, 678), radius=22, fill=top_color)
    draw.text((94, 643), "今日主题", font=chip_font, fill="white")

    title_y = 720
    for line in wrap_lines(draw, spec["title"], title_font, 800):
        draw.text((72, title_y), line, font=title_font, fill="#1F1F1F")
        title_y += 66

    subtitle_y = title_y + 8
    for line in wrap_lines(draw, spec["subtitle"], subtitle_font, 800):
        draw.text((72, subtitle_y), line, font=subtitle_font, fill="#4B4B4B")
        subtitle_y += 44

    panel_top = subtitle_y + 28
    draw.rounded_rectangle((60, panel_top, 900, 1180), radius=30, fill="white")
    draw.rounded_rectangle((60, panel_top, 900, panel_top + 10), radius=10, fill=bottom_color)

    body_y = panel_top + 40
    bullet_color = top_color
    for paragraph in spec["body"]:
        lines = wrap_lines(draw, paragraph, body_font, 720)
        draw.ellipse((88, body_y + 10, 102, body_y + 24), fill=bullet_color)
        first = True
        for line in lines:
            x = 120 if first else 120
            draw.text((x, body_y), line, font=body_font, fill="#222222")
            body_y += 42
            first = False
        body_y += 10

    # Decorative accent bars
    draw.rounded_rectangle((720, 730, 860, 752), radius=11, fill=top_color)
    draw.rounded_rectangle((760, 766, 860, 782), radius=8, fill=bottom_color)

    canvas.save(out_path)


def create_local_hero(spec: dict) -> Image.Image:
    top_color, bottom_color = spec["accent"]
    img = Image.new("RGB", (1082, 760), "#FFF8F1")
    draw = ImageDraw.Draw(img)
    r1, g1, b1 = ImageColor_getrgb(top_color)
    r2, g2, b2 = ImageColor_getrgb(bottom_color)
    for y in range(img.height):
        t = y / max(img.height - 1, 1)
        r = int(r1 + (r2 - r1) * t)
        g = int(g1 + (g2 - g1) * t)
        b = int(b1 + (b2 - b1) * t)
        draw.line([(0, y), (img.width, y)], fill=(r, g, b))

    paper = "#FFFDFC"
    soft_ink = "#24313F"
    soft_line = blend(top_color, "#FFFFFF", 0.45)
    sand = blend("#FFF3E6", top_color, 0.15)
    blue_paper = blend("#F1F6FF", bottom_color, 0.18)
    warm_shadow = blend("#EBDAC8", top_color, 0.12)
    pale = blend("#FFFFFF", bottom_color, 0.12)
    pale_warm = blend("#FFFFFF", top_color, 0.1)

    add_background_glow(draw, (-140, -80, 260, 240), (255, 255, 255))
    add_background_glow(draw, (820, -40, 1160, 260), blend("#FFFFFF", bottom_color, 0.2))
    add_background_glow(draw, (620, 420, 980, 760), blend("#FFFFFF", top_color, 0.25))

    if spec["raw"] == "01-cover":
        draw_card(draw, (130, 138, 372, 458), paper)
        draw_card(draw, (430, 90, 738, 332), pale)
        draw_card(draw, (700, 378, 950, 590), paper)
        draw_card(draw, (238, 512, 522, 638), pale_warm)
        draw_line_stack(draw, 176, 184, [112, 136, 92], blend("#D8DEE6", top_color, 0.08))
        draw_line_stack(draw, 478, 140, [144, 188, 116], blend("#D8DEE6", bottom_color, 0.12))
        draw_line_stack(draw, 746, 430, [124, 162, 102], blend("#D8DEE6", top_color, 0.1))
        draw_card(draw, (178, 300, 276, 384), sand, radius=20)
        draw_card(draw, (292, 300, 340, 384), sand, radius=20)
        draw_card(draw, (500, 218, 694, 268), blend("#FFFFFF", top_color, 0.18), radius=18)
        draw_card(draw, (286, 546, 474, 604), blend("#FFFFFF", bottom_color, 0.14), radius=18)
        draw_arrow(draw, (372, 250), (430, 210), fill=soft_ink, width=12)
        draw_arrow(draw, (736, 332), (782, 378), fill=soft_ink, width=12)
        draw_arrow(draw, (568, 332), (568, 512), fill=soft_line, width=10)
        draw.rounded_rectangle((828, 126, 912, 210), radius=24, fill=blend("#FFFFFF", bottom_color, 0.1))
        draw.ellipse((850, 148, 876, 174), fill=top_color)
        draw.ellipse((888, 148, 914, 174), fill=bottom_color)
    elif spec["raw"] == "02-shift":
        draw.rounded_rectangle((84, 102, 472, 598), radius=42, fill=blend("#F1D8C5", top_color, 0.18))
        draw.rounded_rectangle((610, 102, 998, 598), radius=42, fill=blend("#EDF8F7", bottom_color, 0.16))
        for box in [(128, 150, 306, 228), (196, 246, 424, 326), (118, 356, 272, 434), (296, 388, 438, 510)]:
            draw_card(draw, box, paper, radius=20)
        for box in [(660, 150, 928, 230), (660, 262, 928, 342), (660, 374, 928, 454)]:
            draw_card(draw, box, paper, radius=20)
        draw_line_stack(draw, 164, 180, [82, 116], blend("#D8DEE6", top_color, 0.1))
        draw_line_stack(draw, 236, 276, [128, 90], blend("#D8DEE6", top_color, 0.12))
        draw_line_stack(draw, 152, 386, [80, 106], blend("#D8DEE6", top_color, 0.1))
        draw_line_stack(draw, 334, 418, [64, 84], blend("#D8DEE6", top_color, 0.1))
        for y in [182, 294, 406]:
            draw_line_stack(draw, 700, y, [140, 178], blend("#D8DEE6", bottom_color, 0.12))
            draw.rounded_rectangle((670, y + 4, 694, y + 28), radius=12, fill=bottom_color)
        draw_arrow(draw, (500, 350), (584, 350), fill=soft_ink, width=12)
        draw.rounded_rectangle((540, 318, 630, 382), radius=28, fill=paper)
        draw.rounded_rectangle((716, 490, 900, 544), radius=18, fill=blend("#FFFFFF", bottom_color, 0.14))
    elif spec["raw"] == "03-advantages":
        cols = [
            (94, 116, 318, 492, paper, sand),
            (360, 116, 584, 492, pale, blue_paper),
            (626, 116, 850, 492, paper, blend("#FFF4F6", top_color, 0.12)),
        ]
        for x1, y1, x2, y2, bg, chip in cols:
            draw_card(draw, (x1, y1, x2, y2), bg)
            draw_line_stack(draw, x1 + 28, y1 + 44, [110, 140, 92], blend("#D8DEE6", top_color, 0.1))
            draw_card(draw, (x1 + 30, y1 + 184, x1 + 106, y1 + 250), chip, radius=18)
            draw_card(draw, (x1 + 122, y1 + 184, x1 + 198, y1 + 250), chip, radius=18)
            draw_card(draw, (x1 + 30, y1 + 284, x1 + 198, y1 + 336), blend("#FFFFFF", bottom_color, 0.12), radius=16)
        draw_arrow(draw, (318, 302), (360, 302), fill=soft_line, width=10)
        draw_arrow(draw, (584, 302), (626, 302), fill=soft_line, width=10)
        draw_card(draw, (884, 150, 990, 230), blend("#FFFFFF", top_color, 0.12), radius=20)
        draw_card(draw, (884, 266, 1016, 356), blend("#FFFFFF", bottom_color, 0.12), radius=20)
        draw_card(draw, (884, 392, 1004, 468), blend("#FFFFFF", top_color, 0.12), radius=20)
        draw_arrow(draw, (850, 190), (884, 190), fill=soft_ink, width=8)
        draw_arrow(draw, (850, 310), (884, 310), fill=soft_ink, width=8)
        draw_arrow(draw, (850, 430), (884, 430), fill=soft_ink, width=8)
    elif spec["raw"] == "04-action":
        draw_card(draw, (128, 120, 390, 286), paper)
        draw_line_stack(draw, 166, 158, [126, 162, 104], blend("#D8DEE6", top_color, 0.1))
        draw_card(draw, (162, 216, 300, 246), blend("#FFFFFF", top_color, 0.14), radius=15)
        step_boxes = [
            (126, 352, 332, 494, sand, "1"),
            (392, 352, 598, 494, blue_paper, "2"),
            (658, 352, 864, 494, pale_warm, "3"),
        ]
        for x1, y1, x2, y2, bg, _ in step_boxes:
            draw_card(draw, (x1, y1, x2, y2), bg, radius=28)
            draw.rounded_rectangle((x1 + 28, y1 + 30, x1 + 70, y1 + 72), radius=16, fill=top_color if x1 != 392 else bottom_color)
            draw_line_stack(draw, x1 + 86, y1 + 40, [72, 98], blend("#D8DEE6", top_color, 0.1))
            draw_card(draw, (x1 + 28, y1 + 90, x1 + 88, y1 + 120), paper, radius=15)
            draw_card(draw, (x1 + 98, y1 + 90, x1 + 170, y1 + 120), paper, radius=15)
        draw_arrow(draw, (332, 422), (392, 422), fill=soft_ink, width=10)
        draw_arrow(draw, (598, 422), (658, 422), fill=soft_ink, width=10)
        draw_card(draw, (706, 134, 972, 286), paper)
        draw_line_stack(draw, 742, 168, [144, 176, 124], blend("#D8DEE6", bottom_color, 0.12))
        draw_card(draw, (734, 228, 814, 256), pale_warm, radius=14)
        draw_card(draw, (826, 228, 920, 256), blue_paper, radius=14)
    else:
        for box, fill in [
            ((110, 156, 226, 240), sand),
            ((168, 280, 300, 374), pale_warm),
            ((124, 416, 260, 514), blue_paper),
        ]:
            draw_card(draw, box, fill, radius=22)
        draw_card(draw, (408, 110, 636, 250), paper)
        draw_card(draw, (698, 140, 964, 272), paper)
        draw_card(draw, (636, 330, 962, 462), pale)
        draw_card(draw, (578, 508, 904, 620), paper)
        draw_line_stack(draw, 454, 148, [118, 154], blend("#D8DEE6", top_color, 0.1))
        draw_line_stack(draw, 742, 178, [136, 168], blend("#D8DEE6", bottom_color, 0.12))
        draw_line_stack(draw, 680, 370, [184, 154, 118], blend("#D8DEE6", bottom_color, 0.12))
        draw_line_stack(draw, 620, 540, [192, 132], blend("#D8DEE6", top_color, 0.1))
        draw_arrow(draw, (300, 210), (408, 180), fill=soft_line, width=10)
        draw_arrow(draw, (300, 330), (698, 206), fill=soft_line, width=10)
        draw_arrow(draw, (300, 460), (636, 396), fill=soft_line, width=10)
        draw_arrow(draw, (636, 462), (742, 508), fill=soft_ink, width=10)

    return img


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--content-dir", required=True)
    parser.add_argument("--api-base", default="https://api.tu-zi.com")
    parser.add_argument("--only", nargs="*", default=None)
    args = parser.parse_args()

    token = read_token_from_stdin()
    content_dir = Path(args.content_dir).resolve()
    prompts_dir = content_dir / "prompts"
    raw_dir = content_dir / "images" / "raw"
    final_dir = content_dir / "images" / "final"
    raw_dir.mkdir(parents=True, exist_ok=True)
    final_dir.mkdir(parents=True, exist_ok=True)

    wanted = set(args.only or [])
    specs = [spec for spec in SPECS if not wanted or spec["raw"] in wanted]

    for spec in specs:
        prompt_path = prompts_dir / f"{spec['raw']}.md"
        prompt = prompt_path.read_text(encoding="utf-8")
        raw_path = raw_dir / f"{spec['raw']}.png"
        try:
            raw_path.write_bytes(generate_with_retry(token, prompt))
        except Exception as exc:
            print(f"[fallback] {spec['raw']}: {exc}", file=sys.stderr)
            create_local_hero(spec).save(raw_path)
        final_path = final_dir / f"{spec['raw']}.png"
        compose_card(raw_path, final_path, spec)
        print(final_path)


if __name__ == "__main__":
    main()
