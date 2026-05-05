# GPT Image 2 封面 / 自媒体配图研究

> 日期：2026-05-05
> 目的：修正 `baoyu-image-gen` 这个 Codex 图片生成 skill，而不是泛化改整套内容工作流。

## 来源

- OpenAI image docs：图像输入/生成能力强，但小字、复杂视觉元素、精确空间定位仍有局限；因此封面 prompt 必须控制文字预算和版式复杂度。
- OpenAI Cookbook GPT Image 示例：官方示例把外观、材质、颜色、行为等拆成明确字段，说明模型能吃详细结构化提示。
- X 搜索 `GPT-image2 封面 提示词`：热门样本强调 Prompt as Code、海报排版、信息图、产品/建筑/摄影等类别。
- X 搜索 `GPT Image 2 自媒体 封面 prompt`：热门样本集中在书籍排版、角色资产卡、人物九宫格、PSD/分层、提示词库。
- 用户粘贴的 @xiaoxiaodong01 长帖：最有价值的方法是“汤底 + 佐料”，即稳定底层审美 + 可替换风格模块。

## 对我们原方式的判断

原本 `baoyu-image-gen` 有三点是对的：

- 已经把默认模型路由到 Tuzi `gpt-image-2.0`。
- 已经有 `x-card` / `blog-hero` / `article-elegant` 等 editorial preset。
- 已经反对紫蓝 AI glow、机器人、3D blob、密集小字等低质科技图。

但有四个问题：

1. `x-card` 文档示例改成了 `16:9`，脚本默认仍是 `3:4`，容易造成 X 配图比例错误。
2. preset 只有泛 editorial prompt，没有把“汤底 + 佐料 + 变量”变成机器可执行字段。
3. 图内文字没有显式预算，只靠一句 “at most one short headline”，对封面/信息卡不够。
4. 没有区分“封面卡”和“信息卡”：前者要强标题和单一视觉主体，后者可以 3-5 个结构块。

## 本轮修正

- 新增 `social-cover` preset：用于自媒体封面、推荐卡片、观点封面。
- 新增 `info-card` preset：用于结构化说明图、方法卡、轻量信息图。
- 新增 `--broth`、`--seasoning`、`--title`、`--subtitle`、`--text-mode` 参数。
- 把 prompt preset 改成 Prompt-as-Code 结构：Output artifact / Visual recipe / Content variables / Typography / Composition / Content brief。
- 默认所有 editorial/social preset 使用 `16:9`，小红书或竖图必须显式传 `--ar 3:4`。

## 后续原则

- 封面不是一次性 prompt，而是可复用视觉系统。
- 文字必须通过参数显式传入，不让模型自由发明大标题。
- 一个内容包只允许一个主佐料，避免“风格词炖汤”。
- 生成后仍需视觉 QA：缩略图可读、文字不糊、主体不压字、不是 moodboard/拼贴。
