# Work Tree 整理清单（2026-04-13）

## 已完成的低风险整理

- `AGENTS.md` 与 `CLAUDE.md` 已逐字对齐
- 已新增 `.gitignore` 规则：
  - `tasks/harness/locks/`
  - `session.tw_session`
- 已清理本地空壳运行时锁文件与会话临时文件
- 已把这次对齐规则写入 `tasks/lessons.md`

## 当前剩余改动分组

### 1. 内容迁移 / 发布归档

这些更像“应保留的内容成果”，后续适合单独一个 commit：

- `01-内容生产/03-已发布的选题/2026-04-11-用AI越多大脑越废.md`
- `01-内容生产/03-已发布的选题/2026-04-11-用AI越多大脑越废-article.md`
- `01-内容生产/03-已发布的选题/2026-04-12-团队AI化后真正缺的不是Prompt，是Harness Engineering.md`
- 对应的旧路径删除：
  - `01-内容生产/02-制作中的选题/2026-04-05-*`
  - `01-内容生产/02-制作中的选题/2026-04-10-*`

### 2. 研究 / 报告产物

这些是本轮与最近两天生成的研究与报告，是否纳入版本库取决于你的偏好：

- `05-选题研究/*2026-04-11*.md`
- `05-选题研究/*2026-04-12*.md`
- `docs/reports/2026-04-12-*.md`
- `docs/reports/wiki-*-2026-04-11.md`
- `docs/reports/wiki-*-2026-04-12.md`
- `x-to-markdown/`

### 3. 任务板 / wiki / 对齐文档

这些是本轮知识沉淀和规范对齐，通常应随内容改动一起保留：

- `AGENTS.md`
- `CLAUDE.md`
- `.gitignore`
- `tasks/todo.md`
- `tasks/progress.md`
- `tasks/lessons.md`
- `wiki/log.md`
- `wiki/选题/*.md`

### 4. 既有工具链改动（需单独判断）

这些看起来不是本轮“内容发布”主线的一部分，建议后续单独 review：

- `.agents/skills/zhipin/SKILL.md`
- `tools/auto-x/README.md`
- `tools/auto-x/data/following.json`
- `tools/auto-x/scripts/x_utils.py`
- `tools/opencli/README.md`
- `tools/post_thread.py`
- `tools/auto-x/data/following_audit_latest.json`
- `tools/auto-x/data/twikit_cookies.json`
- `tools/auto-x/scripts/test_twikit.py`
- `docs/plans/2026-04-13-browser-unification-proposal.md`
- `docs/reports/2026-04-13-browser-stack-inventory.md`
- `docs/reports/2026-04-13-browser-stack-smoke-test.md`
- `docs/standards/`

## 推荐整理顺序

1. 先把“内容迁移 / 发布归档 + 任务板 / wiki / 对齐文档”视为一个清晰批次
2. 再决定“研究 / 报告产物”哪些要保留进 git，哪些只做运行痕迹
3. 最后单独审 `既有工具链改动`，不要和内容发布混在一起

## 原则

- 不回滚任何你已有的未归档内容改动
- 不把“工具链调整”和“内容发布”混成一个提交面
- 先缩小批次，再做提交策略
