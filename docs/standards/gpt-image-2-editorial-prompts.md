# GPT Image 2 Editorial Prompts

> 来源：OpenAI image generation docs、OpenAI Cookbook image prompting examples、PixelDojo GPT Image 2 guide、Hello Soya ChatGPT Images 2.0 guide | 最后更新：2026-04-29

## 适用范围

用于 X.com、blog、newsletter、文章配图和技术观点速评。默认审美是简洁、克制、elegant：目标不是“好看的 AI 图”，而是可发布、能解释观点、缩略图也能看懂的 article visual。

## Prompt 结构

每个 prompt 必须包含这些字段：

- Goal：这张图要帮内容完成什么任务。
- Audience：给谁看，例如 tech founders、AI builders、operators。
- Placement：X.com feed card、blog hero、newsletter header、article diagram。
- Image content：要视觉化的核心观点，不超过一个主隐喻。
- Composition：构图、主体、留白、裁切安全区。
- Style：minimal editorial / magazine / Swiss grid / quiet product diagram 等。
- Color palette：off-white / graphite / ink / soft gray + 一个精准点缀色，避免单一紫蓝科技渐变。
- Text inside image：默认无文字；必须出现时只允许短文本，并写明 headline、label、footer 等角色。
- Avoid：明确排除 generic AI glow、机器人吉祥物、Dribbble 3D、bokeh orbs、假 logo、水印、小字段落。
- Output requirements：比例、质量、可读性和平台尺寸。

## Redbook 默认审美

- X card：默认 `3:4`，主体大、信息少、适合时间线快速扫过。
- Blog hero：默认 `16:9`，横向构图、适合文章头图和 newsletter。
- 技术观点图：优先使用具体工作场景，例如浏览器、邮箱、代码图谱、terminal、dashboard、白板、operator desk，但画面保持留白和克制。
- Agent / AI 工具主题：不要画发光脑袋、机器人、紫色宇宙背景；用“后台工位”“工具接管流程”“人机协作界面”来表达。
- Crypto / AI 新闻速评：用 editorial poster 或 restrained product diagram，不做金融暴富感、不做赛博霓虹。

## X Card Template

```text
Create a polished X.com feed card for a tech founder audience.

Goal:
Make the post's main idea instantly understandable before the viewer reads the text.

Audience:
AI builders, indie hackers, product operators, and technical founders.

Placement:
X.com timeline image. Aspect ratio 3:4. Readable at thumbnail size.

Image content:
{one concrete visual metaphor for the idea}

Composition:
One strong focal point, Swiss grid, clean negative space, safe margins for social cropping.
Use foreground / midground / background separation. No collage of unrelated icons.

Style:
Simple elegant editorial technology design, modern magazine art direction, restrained palette,
precise hierarchy, polished but quiet.

Text inside the image:
At most one short quoted headline. No paragraphs. No fake UI labels unless they are essential.

Avoid:
generic blue-purple AI glow, robot mascots, glossy Dribbble 3D blobs, bokeh orbs,
fake logos, watermark, tiny unreadable text, decorative gradients that do not explain the idea.

Output requirements:
Final publishable editorial visual. Sharp, coherent, not stock-like.
```

## Blog Hero Template

```text
Create a polished blog hero image for a practical AI/product article.

Goal:
Set the frame for the article and make the topic feel concrete, useful, and current.

Audience:
Founders, AI builders, engineering managers, and operators.

Placement:
Blog / newsletter header. Aspect ratio 16:9.

Image content:
{article topic and one visual scene}

Composition:
Horizontal editorial layout, generous negative space, one main subject, balanced margins.
Leave room for optional title overlay outside the generated image.

Style:
Minimal editorial tech illustration or quiet workbench scene. Subtle texture, crisp forms,
professional color contrast, no loud neon, no decorative complexity.

Text inside the image:
Prefer no text. If text appears, use one short exact headline only.

Avoid:
busy infographic panels, unreadable labels, generic AI sparkle, fake brand logos, watermark,
one-note purple/blue palette, cyberpunk visual noise.

Output requirements:
Clean 16:9 hero image suitable for a blog cover and social preview.
```

## 修图指令

第一版太乱时直接用：

```text
Reduce information density by 50%.
Make the visual metaphor clearer.
Remove decorative glow, random icons, and unreadable text.
Increase negative space and make the focal point larger.
Keep the same core idea, but make it look like a simple elegant article illustration.
```

## 相关页面

- [[AI Agent 企业导入]] — Agent 主题图片应贴近真实工作流。
- [[X写作方法论]] — 图片必须服务 Hook，而不是装饰。
