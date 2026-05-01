# X 发布清单：Agent 支付基础设施

## 当前状态

- 状态：已放入 X Article 草稿箱，待用户确认发布。
- 发布形态：X Article / 长文 + 1 张 16:9 主图。
- 主图：`images/x-agent-payment-permission-layer-codex.png`
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
