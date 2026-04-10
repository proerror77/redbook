# LLM Wiki Workflow Gap

日期：2026-04-07

## 结论

这个 gap 已经补齐到“最小完整 workflow”。

当前状态是：

- 有规范
- 有显式 workflow run
- 有自动入口
- 有内容链路挂接点

## 证据

### 1. 规则层存在

- `CLAUDE.md` 已定义 `Wiki Schema（LLM 知识库维护规范）`
- 明确了 `Ingest / Query / Lint` 三类操作

### 2. Skill 层存在

- `tools/x-skills/x-collect/SKILL.md` 要求更新 `wiki/选题/`、`wiki/index.md`、`wiki/log.md`
- `tools/x-skills/x-create/SKILL.md` 要求创作后回填 `wiki/` 与 `wiki/log.md`

### 3. 结果层存在

- `wiki/log.md` 中已有多条 `ingest` / `query` 记录
- `wiki/选题/AI工具与效率.md` 中已经沉淀了 `LLM Wiki` 相关内容

### 4. 运行层已补齐

- 已存在独立 run：
  - `20260407-050729-llm-wiki-ingest-显式化-a7fdd7`
  - `20260407-051553-llm-wiki-ingest-2026-04-07-90316a`
  - `20260407-065343-llm-wiki-query-内容创作-2026-04-07-064648`
  - `20260407-065343-llm-wiki-lint-2026-04-07-d9dee3`
  - `20260407-134516-llm-wiki-query-本地-ai-2026-04-07-4eac53`
- 其中 query 已能直接挂接到内容 run：
  - `20260406-131247-ai-已经从模型战争进入部署战争-7d8fbc`
  - 已附加 artifact：`docs/reports/wiki-query-本地-ai-2026-04-07.md`

## 影响

- 用户现在可以用 `run / report / log` 三层证据确认 workflow 已执行
- 日报链路已不再只留研究文件，而会自动留下 wiki ingest + lint 运行痕迹
- 内容创作前的 wiki query 不再只能口头执行，已经能显式挂接到对应内容 run

## 已完成修复

1. 为 LLM Wiki 建立独立 harness run
2. 为 `ingest / query / lint` 全部补齐显式入口
3. 将日报自动链路升级为 `daily-cycle = ingest + lint`
4. 为 `query` 增加 `--attach-run-id`，可直接把检索报告挂接到内容 run

## 当前入口

- 已创建一条显式审计 run：`20260407-050729-llm-wiki-ingest-显式化-a7fdd7`
- 已补统一自动入口：`tools/wiki_workflow.py daily-cycle --date YYYY-MM-DD`
- `tools/auto-x/scripts/run_daily.sh` 现会在日报完成后自动调用该入口
- 当日真实日报 run：`20260407-051553-llm-wiki-ingest-2026-04-07-90316a`
- 已补显式 query 入口：`tools/wiki_workflow.py query --topic "内容创作" --date YYYY-MM-DD`
- 已补内容挂接入口：`tools/wiki_workflow.py query --topic "本地 AI" --date YYYY-MM-DD --attach-run-id <run_id>`
- 已补显式 lint 入口：`tools/wiki_workflow.py lint --date YYYY-MM-DD`
- 真实验证：
  - query run：`20260407-065343-llm-wiki-query-内容创作-2026-04-07-064648`
  - attached query run：`20260407-134516-llm-wiki-query-本地-ai-2026-04-07-4eac53`
  - lint run：`20260407-065343-llm-wiki-lint-2026-04-07-d9dee3`
  - lint 已帮助修复 `wiki/index.md` 和 `wiki/overview.md` 的陈旧问题

## 剩余增强项

- 还没有把 `query --attach-run-id` 自动接到 `x-create` 或其他内容创作快捷入口
- 还没有做“自动改写 wiki 页面内容”的编排；当前 workflow 负责显式运行、报告和挂接，不负责强制自动写回
