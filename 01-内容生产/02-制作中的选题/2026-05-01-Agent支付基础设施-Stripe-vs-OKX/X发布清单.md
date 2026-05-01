# X 发布清单：Agent 支付基础设施

## 当前状态

- 状态：X 平台草稿箱已写入封面 + 正文 + 3 张正文中间插图；未发布。
- 发布形态：X Article / 长文 + 1 张 16:9 主图 + 3 张正文插图。
- 主图：`images/x-agent-payment-permission-layer-codex.png`
- 正文插图：
  - `images/inline-01-final-step.png`
  - `images/inline-02-two-rails.png`
  - `images/inline-03-bounded-agent.png`
- X Article 正文：`X-Article版.md`
- 审稿：`X审稿.md`

## 发布主帖建议

```text
Stripe 和 OKX 同时在补 Agent payment layer。

我觉得这不是钱包新闻，而是 Agent 从“建议系统”进入“执行系统”的信号。

真正重要的问题不是 AI 能不能付款，而是：
谁授权、额度多少、凭证怎么隔离、过程怎么审计、失败怎么追回。

写了一篇长文，讲 Stripe 和 OKX 这两条路线到底差在哪。
```

## 配图

文件：

```text
01-内容生产/02-制作中的选题/2026-05-01-Agent支付基础设施-Stripe-vs-OKX/images/x-agent-payment-permission-layer-codex.png
```

检查：

- PNG 真实产出。
- 尺寸：1672x941。
- 来源：Codex 原生 image_gen，原始文件保留在 `/Users/proerror/.codex/generated_images/019de182-abbd-7892-bad8-121ef711296c/`。
- 无 Stripe / OKX logo。
- 无真实银行卡号。
- 标题和主体无重叠。

## 草稿箱记录

- `tools/redbookctl x-login` 已通过，账号：`Smileyface @0xcybersmile`。
- 第一次 draft mode 正文写入成功，但封面路径被解析成重复相对路径，封面大概率未进入草稿。
- 第二次 draft mode 使用绝对封面路径，日志确认：
  - `Cover image applied, modal closed`
  - `Content inserted successfully (4434 chars)`
  - `Article composed (draft mode)`
- 未使用 `--submit`，没有发布。
- 2026-05-01 修复后重新写入草稿，当前草稿 preview URL：`https://x.com/compose/articles/edit/2050103269012484096/preview`。
- Browser DOM 回读确认 `pbs.twimg.com/media` 大图共 4 张：
  - 1 张 `alt="文章封面图片"`，尺寸 `1672x669`。
  - 3 张正文图 `alt="图像"`，尺寸均为 `1672x941`。
- 保存 payload 回读确认 `ArticleEntityUpdateContent` 最终包含 3 个 `atomic` blocks 和 3 个 `MEDIA` entity，media ids 分别写入 `entity_map`。
- 修复后的正文图插入路径：先聚焦正文编辑器，再点顶部正文工具栏 `插入 / 添加媒体内容`，随后点菜单项 `媒体`；不能点封面区域的 `添加照片或视频`。

## 发布前门槛

- 必须先跑：`tools/redbookctl x-login`
- 必须确认账号：`Smileyface @0xcybersmile`
- 必须用户明确说“发布 / 直接发”后才 submit。
- 发布后必须回读：
  - X Article / status URL
  - 主页或状态页可见证据
  - 发布时间
  - 发布记录写入

## 事实边界

- Stripe：写成用户确认 + 一次性支付凭证 + 真实支付信息隔离，不写成完全自动付款。
- OKX：escrow / dispute resolution 属于 roadmap / future capability，不写成已完整落地。
- 两者不是直接竞品：Stripe 偏现有法币/商户网络，OKX 偏链上 Agent-to-Agent commerce。

## 2026-05-01 Browser-trace 诊断结论

- trace run：`.o11y/x-article-inline-realclick-20260501-134237`
- 关键证据：X Article 保存请求 `ArticleEntityUpdateContent` 共 3 次，`content_state.blocks` 分别约 75 / 119 / 174 blocks，但 `entityMap` 均为空，blocks 类型只有 `unstyled` / `header-two` / `unordered-list-item`，没有 image/media entity。
- 同一 trace 中能看到 `media_upload:local_file:tweet_image` 成功日志和 mediaId，说明图片上传到 X media pipeline 成功，但没有绑定进 Article 正文内容模型。
- 预览页 DOM 验证：账号 `Smileyface @0xcybersmile`，草稿 URL 为 `/compose/articles/edit/2050088414528294913/preview`，`pbs.twimg.com/media` 大图只有 1 张，即封面；正文 3 张插图未持久化。
- 结论：当前 X Article 网页编辑器不可靠支持脚本方式插入正文图片；脚本 stdout 不能作为成功依据，必须以后置 preview media count / 保存 payload 验证为准。
- 修复动作：`x-article.ts` 已改为 preview 后 fail-closed；若正文图未持久化，会报错而不是声称草稿完成。headed 模式下 Chrome 也会 `unref()`，避免“浏览器留着导致脚本进程不退出”的假卡住。

## 2026-05-01 修复后 trace 结论

- trace run：`.o11y/x-article-body-menu-20260501-try2`
- 根因修正：正文图片不能全局点击 `添加照片或视频`，该按钮属于封面/header 区，会覆盖封面；正文插图入口是顶部编辑工具栏 `插入 / 添加媒体内容` -> 菜单项 `媒体`。
- trace DOM method 证据：
  - 封面路径：`HTMLElement.click` 命中 `aria-label="添加照片或视频"`，随后出现封面裁剪 modal 和 `data-testid="applyButton"`。
  - 正文路径：正文图上传时没有封面 modal；选择文件后直接异步生成 Article content atomic block。
- 保存 payload 证据：`ArticleEntityUpdateContent` 从 0 个 `atomic` block 增长到 3 个 `atomic` block，`entity_map` 从 0 个增长到 3 个 `MEDIA` entity。
- 预览 DOM 证据：`/compose/articles/edit/2050103269012484096/preview` 中 `pbs.twimg.com/media` 大图为 4 张，1 张封面 + 3 张正文图。
