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
    "/System/Library/Fonts/Hiragino Sans GB.ttc",
]

PAGES = [
    {
        "filename": "01-cover-codex-update.png",
        "eyebrow": "NEWS + TAKE",
        "title": ["GPT Codex APP", "出了个很关键", "的新功能"],
        "subtitle": "AI 开始接手桌面工作了",
        "chips": ["computer use", "桌面执行", "workflow"],
        "accent": "#A8D4F0",
    },
    {
        "filename": "02-content-what-changed.png",
        "eyebrow": "WHAT CHANGED",
        "title": ["这次变的不是", "聊天能力"],
        "subtitle": "而是更容易在桌面上把整段事情跑完",
        "bullets": [
            "上线的是 computer use",
            "重点不是更会答",
            "重点是更容易拿来干活",
        ],
        "accent": "#F9E79F",
    },
    {
        "filename": "03-content-execution-layer.png",
        "eyebrow": "WHY IT MATTERS",
        "title": ["AI 工具竞争", "开始往执行层走"],
        "subtitle": "以后不只比谁更会回答",
        "bullets": [
            "聊天层：回答问题",
            "工具层：接一个动作",
            "执行层：跑一整段流程",
        ],
        "accent": "#FADBD8",
    },
    {
        "filename": "04-content-user-experience.png",
        "eyebrow": "USER FEELING",
        "title": ["真正重要的是", "用户体感变化"],
        "subtitle": "更顺手、更友善、更容易真的拿来干活",
        "bullets": [
            "少一点切换",
            "少一点别扭",
            "多一点真的能用",
        ],
        "accent": "#A8D4F0",
    },
    {
        "filename": "05-ending-workflow-judgment.png",
        "eyebrow": "MY TAKE",
        "title": ["未来比的不是", "谁更会问 AI"],
        "subtitle": "而是谁更早把 AI 接进自己的工作流",
        "cta": "你最想让 AI 接手哪一段桌面流程？",
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


def draw_doodle_arrow(draw: ImageDraw.ImageDraw, start: tuple[int, int], end: tuple[int, int], fill: str) -> None:
    draw.line((start, end), fill=fill, width=6)
    draw.polygon([end, (end[0] - 18, end[1] - 10), (end[0] - 10, end[1] + 18)], fill=fill)


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
    draw_doodle_arrow(draw, (WIDTH - 180, 96), (WIDTH - 112, 128), fill="#B3B3B3")

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
        draw.text((MARGIN + 68, content_y), "不是看起来更强，而是更容易真的拿来干活。", font=BODY_FONT, fill="#1A1A1A")
    elif "bullets" in spec:
        bullet_y = content_y
        for bullet in spec["bullets"]:
            draw.ellipse((MARGIN + 70, bullet_y + 15, MARGIN + 86, bullet_y + 31), fill=accent)
            for line in wrap_lines(draw, bullet, BODY_FONT, WIDTH - 220):
                draw.text((MARGIN + 112, bullet_y), line, font=BODY_FONT, fill="#1A1A1A")
                bullet_y += 48
            bullet_y += 22
    elif "cta" in spec:
        draw.text((MARGIN + 68, content_y), "我的判断：", font=BODY_FONT, fill="#1A1A1A")
        cta_y = content_y + 82
        for line in wrap_lines(draw, spec["cta"], BODY_FONT, WIDTH - 180):
            draw.text((MARGIN + 68, cta_y), line, font=BODY_FONT, fill="#1A1A1A")
            cta_y += 54

    note_y = HEIGHT - 180
    rounded_rectangle(draw, (MARGIN, note_y, WIDTH - MARGIN, HEIGHT - 88), fill=accent)
    draw.text((MARGIN + 28, note_y + 26), "Smileyface / AI tools / workflow", font=SMALL_FONT, fill="#1A1A1A")
    draw.text((MARGIN + 28, note_y + 72), "新闻之外，更重要的是它会不会顺手地接进真实工作流。", font=BODY_FONT, fill="#1A1A1A")
    return image


def main() -> None:
    for spec in PAGES:
        output = ROOT / spec["filename"]
        page_image(spec).save(output)
        print(output)


if __name__ == "__main__":
    main()
