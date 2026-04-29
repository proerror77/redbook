# GPT Image 2 Editorial Prompts

> 来源：OpenAI image generation docs、OpenAI Cookbook image prompting examples、PixelDojo GPT Image 2 guide、Hello Soya ChatGPT Images 2.0 guide、X article `xiaoxiaodong01/status/2048443572119330853` | 最后更新：2026-04-29

## 适用范围

用于 X.com、blog、newsletter、文章配图和技术观点速评。默认审美是简洁、克制、elegant：目标不是“好看的 AI 图”，而是可发布、能解释观点、缩略图也能看懂的 article visual。

## 文内插图规划

生成正文插图前先写 visual metaphor map。每张图不是“段落摘要配图”，而是把文章里的一个短句、关键词或核心判断视觉化。

每张图必须先明确：

- Anchor phrase：文章中被这张图服务的短句 / 关键词，优先 2-8 个中文词或一个短英文短语。
- Semantic read：这个短句的字面含义、情绪气质、隐含张力和读者应感受到的判断。
- Visual metaphor：用什么具体场景、物体关系、人物关系、界面关系或尺度反差表达它。
- Composition：承载面、主体数量、前中后景、留白、安全裁切区。
- Text-image integration：是否把 anchor phrase 做成画面骨架；如果放字，文字要参与构图，不做后贴标题。
- Avoid：这张图专门禁止什么，例如泛机器人、抽象光效、无意义小字、随机图标、假 logo。
- Placement：插入在哪一节哪一段之后，为什么此处需要图。

可用构图模式：

- Concept poster：大字作为结构，少量主体和文字发生关系，适合强观点和 X card。
- Editorial scene：真实工作台、浏览器、IDE、邮箱、dashboard 等具体场景承载抽象概念，适合 AI / Agent / SaaS 文章。
- Quiet diagram：少量节点和箭头解释工作流、取舍或系统边界，适合方法论段落。
- Comparison card：两边对照或前后变化，适合反常识判断。

硬规则：如果找不到 anchor phrase 和视觉隐喻，这张图先不要生成。宁可少一张，也不要补一张装饰图。

## 图文分镜与排版

图文内容不能直接继承文章段落结构。文章结构负责线性论证，图文结构负责视觉叙事。生成任何小红书卡片组、X 配图系列或公众号文内插图前，先产出 `图文分镜.md` 或等价分镜表。

分镜表必须包含：

- Card role：封面冲突、关键判断、视觉隐喻、框架图、案例画面、行动建议、结尾 CTA 等。
- Reader task：这张图让读者完成什么动作，例如停下、看懂、比较、记住、转发、行动。
- Anchor phrase：图内核心短句；不要把整段话搬进图。
- Visual metaphor：这张图的单一视觉隐喻。
- Layout spec：比例、网格、标题区、主体区、留白、安全边距。
- Text budget：主标题、可选副标题、标签数量和每个字段的字数上限。
- Hierarchy：第一眼看什么，第二眼看什么，第三眼看什么。
- QA result：缩略图可读、文字不重叠、主体不遮挡、没有无意义装饰。

默认卡片结构：

- X card：1 张强概念图，最多 1 个短标题，图服务主帖 Hook。
- 小红书图文：5-7 张；封面制造冲突，2-4 张展开判断/框架/案例，最后 1 张收束行动建议。
- 公众号/长文：3-5 张文内插图，插在关键论证后面，不做成小红书卡片。

排版硬规则：

- 一张图只承担一个读者任务。
- 主标题不超过 12 个中文字符；副标题不超过 18 个中文字符；标签不超过 4 个，每个不超过 6 个中文字符。
- 文字必须有明确层级：主标题、辅助信息、装饰性信息不能同权重。
- 四周保留至少 8% 安全边距，主体和文字不能贴边。
- 不允许文字压住人物脸、核心物体、关键线条或 UI 主体。
- 不允许小字段落、随机编号、假坐标、假 logo、无意义英文小字。
- 生成后如果缩略图看不懂、文字粘连、主体遮挡、字像后贴标题，必须改 prompt 或重生。

## Prompt 结构

每个 prompt 必须包含这些字段：

- Goal：这张图要帮内容完成什么任务。
- Audience：给谁看，例如 tech founders、AI builders、operators。
- Placement：X.com feed card、blog hero、newsletter header、article diagram。
- Card role：这张图在图文分镜里的职责。
- Reader task：读者看完这张图应该完成的动作。
- Anchor phrase：来自文章的短句 / 关键词；正文插图必须有。
- Semantic read：这句话的含义、情绪、张力和读者感受。
- Image content：要视觉化的核心观点，不超过一个主隐喻。
- Composition：构图、主体、留白、裁切安全区。
- Layout spec：网格、标题区、主体区、安全边距、文字预算。
- Text-image integration：文字是否进入画面；进入时必须与主体、空间、承载面咬合。
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

Card role:
{cover conflict / key judgment / concept poster}

Reader task:
{make the viewer stop and understand the main claim before reading}

Anchor phrase:
{short phrase from the post/article}

Semantic read:
{literal meaning, emotional tone, hidden tension, and intended viewer feeling}

Image content:
{one concrete visual metaphor for the idea}

Composition:
One strong focal point, Swiss grid, clean negative space, safe margins for social cropping.
Use foreground / midground / background separation. No collage of unrelated icons.
If the anchor phrase appears in the image, make it part of the spatial structure rather than a pasted label.

Layout spec:
3:4 vertical grid. Reserve at least 8% safe margin on all sides.
Use one dominant headline zone and one visual subject zone. No dense paragraphs.
Thumbnail must still show the focal point and the anchor phrase clearly.

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

Card role:
{hero / section opener / explanatory diagram}

Reader task:
{set context / make one abstract point concrete}

Anchor phrase:
{article title or core phrase}

Semantic read:
{what this phrase means and what emotion/stance the hero should establish}

Image content:
{article topic and one visual scene}

Composition:
Horizontal editorial layout, generous negative space, one main subject, balanced margins.
Leave room for optional title overlay outside the generated image.

Layout spec:
16:9 horizontal grid. Keep the main subject away from edges.
If title text is inside the image, use one short line only and preserve clear hierarchy.

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
