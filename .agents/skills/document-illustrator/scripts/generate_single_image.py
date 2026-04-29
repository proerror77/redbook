#!/usr/bin/env python3
"""
Document Illustrator - 单图片生成工具
由 Claude 负责文档分析和内容归纳，此脚本优先通过 Tuzi `gpt-image-2.0` 生成图片，未配置 Tuzi 时才 fallback 到 Gemini
"""

import os
import sys
import json
import base64
import argparse
from pathlib import Path
from urllib import error, request
from dotenv import load_dotenv


def find_and_load_env():
    """
    智能查找并加载 .env 文件
    优先级：
    1. 当前脚本所在目录的上一级（Skill 根目录）
    2. 当前工作目录
    3. 用户主目录下的 .baoyu-skills/.env
    4. 用户主目录下的 .claude/skills/document-illustrator/
    """
    # 获取脚本所在目录的上一级（Skill 根目录）
    skill_root = Path(__file__).parent.parent
    env_path = skill_root / ".env"

    if env_path.exists():
        load_dotenv(env_path, override=True)
        return True

    # 尝试当前工作目录
    if Path(".env").exists():
        load_dotenv(".env", override=True)
        return True

    # 复用 baoyu skills 的统一环境变量
    baoyu_env = Path.home() / ".baoyu-skills" / ".env"
    if baoyu_env.exists():
        load_dotenv(baoyu_env, override=True)
        return True

    # 尝试 Claude Code Skill 标准位置
    claude_skill_env = Path.home() / ".claude" / "skills" / "document-illustrator" / ".env"
    if claude_skill_env.exists():
        load_dotenv(claude_skill_env, override=True)
        return True

    # 如果都没找到，尝试默认加载
    load_dotenv(override=True)
    return False


# 智能加载环境变量
find_and_load_env()


def get_image_dimensions(aspect_ratio, resolution):
    """
    根据比例和分辨率返回图片尺寸

    参数：
    - aspect_ratio: "16:9" 或 "3:4"
    - resolution: "2K" 或 "4K"

    返回：(width, height)
    """
    dimensions = {
        "16:9": {
            "2K": (2560, 1440),
            "4K": (3840, 2160)
        },
        "3:4": {
            "2K": (1920, 2560),
            "4K": (2880, 3840)
        }
    }

    if aspect_ratio not in dimensions:
        raise ValueError(f"不支持的比例: {aspect_ratio}，请使用 '16:9' 或 '3:4'")

    if resolution not in dimensions[aspect_ratio]:
        raise ValueError(f"不支持的分辨率: {resolution}，请使用 '2K' 或 '4K'")

    return dimensions[aspect_ratio][resolution]


def build_gpt_image_2_prompt(title, content, style_prompt, aspect_ratio, is_cover=False):
    """
    GPT Image 2.0 更适合明确的 artifact、版式、文本角色和负面约束。
    这里统一包一层可发布图片的质量门槛，避免 prompt 退化成泛科技感海报。
    """
    image_role = "cover / hero image" if is_cover else "supporting article illustration"
    return f"""Create a simple, elegant {image_role} for X.com, blog, or newsletter use.

Image specifications:
- Aspect ratio: {aspect_ratio}
- Audience: tech founders, AI builders, product/operators
- Output quality: final publishable article visual, calm and readable at thumbnail size

Design rules:
- Use one clear visual metaphor, not a collage of unrelated icons.
- Use a mature minimal editorial composition: Swiss grid, strong focal point, generous negative space, clear hierarchy.
- Use an elegant restrained palette: off-white, graphite, ink black, soft gray, plus at most one precise accent color.
- Prefer concrete work scenes and product surfaces: browser, inbox, code graph, terminal, dashboard, whiteboard, operator desk.
- Prefer no visible text. If text appears, use only exact short strings from the title/content and render them sharply.
- Leave safe margins for social preview cropping.

Avoid:
- generic blue-purple AI glow, random robot mascots, glossy Dribbble 3D blobs, bokeh orbs, cyberpunk neon, fake logos, watermark
- cluttered infographic paragraphs, tiny unreadable UI labels, warped Chinese/English text
- loud gradients, one-note palette, decorative effects that do not explain the idea

Style brief:
{style_prompt}

Title:
{title}

Content to visualize:
{content}
"""


def generate_image_via_tuzi(prompt, output_path, api_key, aspect_ratio=None, resolution=None):
    """
    通过 Tuzi 中转站调用图像生成接口。
    """
    base_url = os.environ.get("TUZI_BASE_URL", "https://api.tu-zi.com/v1").rstrip("/")
    model = os.environ.get("TUZI_IMAGE_MODEL", "gpt-image-2.0")
    payload = {
        "model": model,
        "prompt": prompt,
        "response_format": "url",
    }
    if aspect_ratio == "3:4":
        payload["size"] = "3x4"
    # Do not pass an unverified compact 16:9 value to Tuzi. Keep 16:9 as a
    # prompt/layout instruction until the provider confirms the exact enum.
    if resolution == "4K":
        payload["quality"] = "4k"

    req = request.Request(
        f"{base_url}/images/generations",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=180) as resp:
            result = json.loads(resp.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        print(f"错误: Tuzi API 调用失败 - {detail}", file=sys.stderr)
        return None
    except Exception as exc:
        print(f"错误: Tuzi API 调用失败 - {exc}", file=sys.stderr)
        return None

    image_data = (result.get("data") or [{}])[0]
    image_url = image_data.get("url")
    image_b64 = image_data.get("b64_json")

    try:
        if image_url and image_url.startswith(("http://", "https://")):
            with request.urlopen(image_url, timeout=180) as resp:
                image_bytes = resp.read()
        elif image_url:
            image_bytes = base64.b64decode(image_url)
        elif image_b64:
            image_bytes = base64.b64decode(image_b64)
        else:
            print("错误: Tuzi 响应里没有可解析的图片数据", file=sys.stderr)
            return None

        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        output_file.write_bytes(image_bytes)
        return output_path
    except Exception as exc:
        print(f"错误: 保存 Tuzi 图片失败 - {exc}", file=sys.stderr)
        return None


def generate_image(title, content, style_prompt, output_path, aspect_ratio="16:9", resolution="2K", is_cover=False):
    """
    生成单张配图：优先 Tuzi，未配置 Tuzi 时 fallback 到 Gemini

    参数：
    - title: 图片标题
    - content: 图片内容文本
    - style_prompt: 风格提示词
    - output_path: 输出文件路径（包含文件名）
    - aspect_ratio: 宽高比 "16:9" 或 "3:4"
    - resolution: 分辨率 "2K" 或 "4K"
    - is_cover: 是否为封面图

    返回：成功返回图片路径，失败返回 None
    """
    full_prompt = build_gpt_image_2_prompt(
        title=title,
        content=content,
        style_prompt=style_prompt,
        aspect_ratio=aspect_ratio,
        is_cover=is_cover,
    )

    tuzi_api_key = os.environ.get("TUZI_API_KEY")
    if tuzi_api_key:
        return generate_image_via_tuzi(full_prompt, output_path, tuzi_api_key, aspect_ratio, resolution)

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        print("错误: 未安装 google-genai 库", file=sys.stderr)
        print("请运行: pip install google-genai", file=sys.stderr)
        sys.exit(1)

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("错误: 未设置 TUZI_API_KEY、GEMINI_API_KEY 或 GOOGLE_API_KEY 环境变量", file=sys.stderr)
        print("请优先配置 TUZI_API_KEY，或设置 GEMINI_API_KEY / GOOGLE_API_KEY", file=sys.stderr)
        sys.exit(1)

    try:
        # 调用 API
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model="gemini-3-pro-image-preview",  # Legacy fallback when Tuzi is unavailable
            contents=full_prompt,
            config=types.GenerateContentConfig(
                response_modalities=['IMAGE'],
                image_config=types.ImageConfig(
                    aspect_ratio=aspect_ratio,
                    image_size=resolution
                )
            )
        )

        # 检查响应是否有效
        if response is None:
            print(f"错误: API 返回空响应", file=sys.stderr)
            return None

        if not hasattr(response, 'parts') or response.parts is None:
            print(f"错误: API 响应中没有 parts 属性", file=sys.stderr)
            print(f"响应内容: {response}", file=sys.stderr)
            return None

        # 保存图片
        for part in response.parts:
            if part.inline_data is not None:
                image = part.as_image()

                # 确保输出目录存在
                output_dir = os.path.dirname(output_path)
                if output_dir:
                    os.makedirs(output_dir, exist_ok=True)

                image.save(output_path)
                return output_path

        print(f"警告: 图片生成失败 - 未收到图片数据", file=sys.stderr)
        return None

    except Exception as e:
        import traceback
        print(f"错误: 图片生成失败 - {e}", file=sys.stderr)
        print(f"详细错误信息:", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return None


def main():
    """主流程"""
    parser = argparse.ArgumentParser(
        description='Document Illustrator - 单图片生成工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  # 生成普通内容配图
  python generate_single_image.py \\
    --title "AI 工具演化" \\
    --content "从 Rules 到 Skills 的演化历程..." \\
    --style-file ../styles/ticket.md \\
    --output /path/to/output/image-01.png \\
    --ratio 16:9 \\
    --resolution 2K

  # 生成封面图
  python generate_single_image.py \\
    --title "AI 编程工具完全指南" \\
    --content "本文介绍..." \\
    --style-file ../styles/gradient-glass.md \\
    --output /path/to/output/cover.png \\
    --ratio 3:4 \\
    --resolution 2K \\
    --cover

环境变量:
  TUZI_API_KEY: 兔子图像 API 密钥（优先）
  TUZI_BASE_URL: 兔子接口地址（可选，默认 https://api.tu-zi.com/v1）
  TUZI_IMAGE_MODEL: 兔子图像模型（可选，默认 gpt-image-2.0）
  GEMINI_API_KEY / GOOGLE_API_KEY: Google AI API 密钥（fallback）
"""
    )

    parser.add_argument('--title', required=True, help='图片标题')
    parser.add_argument('--content', required=True, help='图片内容文本')
    parser.add_argument('--style-file', required=True, help='风格提示词文件路径')
    parser.add_argument('--output', required=True, help='输出文件路径（包含文件名）')
    parser.add_argument(
        '--ratio',
        choices=['16:9', '3:4'],
        default='16:9',
        help='宽高比（默认: 16:9）'
    )
    parser.add_argument(
        '--resolution',
        choices=['2K', '4K'],
        default='2K',
        help='分辨率（默认: 2K）'
    )
    parser.add_argument(
        '--cover',
        action='store_true',
        help='标记为封面图（会使用不同的提示词策略）'
    )

    args = parser.parse_args()

    # 读取风格提示词
    style_file_path = Path(args.style_file)
    if not style_file_path.exists():
        print(f"错误: 风格文件不存在: {args.style_file}", file=sys.stderr)
        sys.exit(1)

    with open(style_file_path, 'r', encoding='utf-8') as f:
        style_prompt = f.read()

    # 显示生成信息
    image_type = "封面图" if args.cover else "内容配图"
    print(f"正在生成{image_type}...")
    print(f"  标题: {args.title}")
    print(f"  比例: {args.ratio}")
    print(f"  分辨率: {args.resolution}")

    width, height = get_image_dimensions(args.ratio, args.resolution)
    print(f"  尺寸: {width}x{height}")

    # 生成图片
    result_path = generate_image(
        title=args.title,
        content=args.content,
        style_prompt=style_prompt,
        output_path=args.output,
        aspect_ratio=args.ratio,
        resolution=args.resolution,
        is_cover=args.cover
    )

    if result_path:
        print(f"✓ 已保存: {result_path}")
        sys.exit(0)
    else:
        print(f"✗ 生成失败", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
