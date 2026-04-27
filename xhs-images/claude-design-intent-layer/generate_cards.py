#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

WIDTH = 960
HEIGHT = 1280
MARGIN = 72
CARD_RADIUS = 36

ROOT = Path(__file__).resolve().parent

FONT_CANDIDATES = [
    "/System/Library/AssetsV2/com_apple_MobileAsset_Font8/86ba2c91f017a3749571a82f2c6d890ac7ffb2fb.asset/AssetData/PingFang.ttc",
    "/System/Library/Fonts/STHeiti Medium.ttc",
]

PAGES = [
    {
        "filename": "01-cover-claude-design.png",
        "eyebrow": "NEWS + TAKE",
        "title": ["Claude Design", "值得关注的", "不是会不会做图"],
        "subtitle": "它在把表达意图这件事变便宜",
        "chips": ["Claude Design", "AI design", "沟通成本"],
        "accent": "#A8D4F0",
    },
    {
        "filename": "02-content-what-is-new.png",
        "eyebrow": "WHAT CHANGED",
        "title": ["这次值钱的", "不是会做图"],
        "subtitle": "而是更快把模糊想法变成可讨论的原型",
        "bullets": [
            "一句模糊描述",
            "快速变成原型",
            "团队可以立刻讨论和修改",
        ],
        "accent": "#F9E79F",
    },
    {
        "filename": "03-content-hidden-cost.png",
        "eyebrow": "HIDDEN COST",
        "title": ["团队里最贵的", "其实不是设计本身"],
        "subtitle": "而是反复把意图讲清楚的成本",
        "bullets": [
            "反复开会",
            "反复对齐",
            "反复改到自己都说不清",
        ],
        "accent": "#FADBD8",
    },
    {
        "filename": "04-content-why-matters.png",
        "eyebrow": "WHY IT MATTERS",
        "title": ["AI 设计工具", "第一阶段最强的价值"],
        "subtitle": "不是会不会替代谁，而是减少团队摩擦",
        "bullets": [
            "让表达意图更便宜",
            "让沟通更快收敛",
            "让推进不再卡在‘说不清’",
        ],
        "accent": "#A8D4F0",
    },
    {
        "filename": "05-ending-intent-layer.png",
        "eyebrow": "MY TAKE",
        "title": ["以后更值钱的", "不是会不会做图"],
        "subtitle": "而是表达意图这件事，会不会越来越便宜",
        "cta": "你觉得这类产品会先替代谁？",
        "accent": "#F9E79F",
    },
]


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    for candidate in FONT_CANDIDATES:
        path = Path(candidate)
        if not path.exists():
            continue
        for index in ((8, 6, 2, 0) if bold else (2, 0, 8, 6)):
            try:
                return ImageFont.truetype(str(path), size=size, index=index)
            except Exception:
                continue
        try:
            return ImageFont.truetype(str(path), size=size)
        except Exception:
            continue
    return ImageFont.load_default()


TITLE_FONT = load_font(76, bold=True)
SUBTITLE_FONT = load_font(42, bold=False)
BODY_FONT = load_font(40, bold=False)
SMALL_FONT = load_font(26, bold=True)


def rounded_rectangle(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: str, outline: str | None = None) -> None:
    draw.rounded_rectangle(box, radius=CARD_RADIUS, fill=fill, outline=outline, width=3 if outline else 1)


def draw_chip(draw: ImageDraw.ImageDraw, x: int, y: int, text: str, fill: str) -> int:
    bbox = draw.textbbox((0, 0), text, font=SMALL_FONT)
    width = bbox[2] - bbox[0] + 36
    rounded_rectangle(draw, (x, y, x + width, y + 44), fill=fill)
    draw.text((x + 18, y + 8), text, font=SMALL_FONT, fill="#1A1A1A")
    return width


def wrap_lines(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    if draw.textbbox((0, 0), text, font=font)[2] <= max_width:
        return [text]
    lines: list[str] = []
    current = ""
    for char in text:
        candidate = current + char
        if draw.textbbox((0, 0), candidate, font=font)[2] <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = char
    if current:
        lines.append(current)
    return lines


def draw_title(draw: ImageDraw.ImageDraw, x: int, y: int, lines: list[str]) -> int:
    current_y = y
    for line in lines:
        draw.text((x, current_y), line, font=TITLE_FONT, fill="#1A1A1A")
        current_y += 94
    return current_y


def page_image(spec: dict) -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), "#FAFAFA")
    draw = ImageDraw.Draw(image)

    rounded_rectangle(draw, (28, 28, WIDTH - 28, HEIGHT - 28), fill="#FFFFFF", outline="#EAEAEA")
    draw.line((MARGIN, 140, WIDTH - MARGIN, 140), fill="#ECECEC", width=4)
    draw.text((MARGIN, 88), spec["eyebrow"], font=SMALL_FONT, fill="#4A4A4A")

    title_end = draw_title(draw, MARGIN, 188, spec["title"])
    subtitle_lines = wrap_lines(draw, spec["subtitle"], SUBTITLE_FONT, WIDTH - 2 * MARGIN)
    subtitle_y = title_end + 12
    for line in subtitle_lines:
        draw.text((MARGIN, subtitle_y), line, font=SUBTITLE_FONT, fill="#303030")
        subtitle_y += 56

    accent = spec["accent"]
    rounded_rectangle(draw, (MARGIN, subtitle_y + 24, WIDTH - MARGIN, subtitle_y + 210), fill="#FFFFFF", outline="#E8E8E8")
    draw.rectangle((MARGIN + 24, subtitle_y + 48, MARGIN + 40, subtitle_y + 184), fill=accent)

    content_y = subtitle_y + 44
    if "chips" in spec:
        chip_x = MARGIN + 68
        for chip in spec["chips"]:
            chip_x += draw_chip(draw, chip_x, content_y, chip, accent) + 12
        content_y += 92
        draw.text((MARGIN + 68, content_y), "重要的不是会不会做图，而是能不能更快把想法讲清楚。", font=BODY_FONT, fill="#1A1A1A")
    elif "bullets" in spec:
        bullet_y = content_y
        for bullet in spec["bullets"]:
            draw.ellipse((MARGIN + 70, bullet_y + 15, MARGIN + 86, bullet_y + 31), fill=accent)
            for line in wrap_lines(draw, bullet, BODY_FONT, WIDTH - 220):
                draw.text((MARGIN + 112, bullet_y), line, font=BODY_FONT, fill="#1A1A1A")
                bullet_y += 48
            bullet_y += 22
    elif "cta" in spec:
        cta_y = content_y + 10
        for line in wrap_lines(draw, spec["cta"], BODY_FONT, WIDTH - 180):
            draw.text((MARGIN + 68, cta_y), line, font=BODY_FONT, fill="#1A1A1A")
            cta_y += 54

    note_y = HEIGHT - 180
    rounded_rectangle(draw, (MARGIN, note_y, WIDTH - MARGIN, HEIGHT - 88), fill=accent)
    draw.text((MARGIN + 28, note_y + 26), "Smileyface / AI design / workflow", font=SMALL_FONT, fill="#1A1A1A")
    draw.text((MARGIN + 28, note_y + 72), "这类产品第一阶段更重要的，是降低团队对齐成本。", font=BODY_FONT, fill="#1A1A1A")
    return image


def main() -> None:
    for spec in PAGES:
        output = ROOT / spec["filename"]
        page_image(spec).save(output)
        print(output)


if __name__ == "__main__":
    main()
