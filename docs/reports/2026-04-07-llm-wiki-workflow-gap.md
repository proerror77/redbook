# LLM Wiki Workflow Gap

日期：2026-04-07

## 结论

redbook 当前已经具备 LLM Wiki 的规则层与结果层，但还没有独立、可追踪的工作流启动痕迹。

换句话说，现状是：

- 有规范
- 有零散执行
- 没有显式 workflow run

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

### 4. 运行层缺失

- `tasks/harness/runs/` 当前只有：
  - `20260406-131247-ai-已经从模型战争进入部署战争-7d8fbc.json`
  - `20260407-044025-page-agent-工作台试点-8f7d20.json`
- 没有任何一个 run 明确对应 `LLM Wiki ingest`、`LLM Wiki query` 或 `LLM Wiki lint`

## 影响

- 用户无法确认 LLM Wiki 是否真的被“启动过”
- wiki 更新看起来像顺手回填，不像一级工作流
- 结果可见，但流程不可见，无法验收、追踪、复盘

## 最小修复方案

1. 为 LLM Wiki 建立独立 harness run
2. 每次 ingest/query/lint 都至少留下一条 run 记录
3. 将 `wiki/log.md` 视为结果日志，而不是启动证据
4. 为 run 补最小 artifact：
   - `research_report`
   - `wiki_log`
   - 如有内容更新，再补对应页面路径

## 下一步

- 已创建一条显式审计 run：`20260407-050729-llm-wiki-ingest-显式化-a7fdd7`
- 已补自动入口：`tools/wiki_workflow.py start-daily-ingest --date YYYY-MM-DD`
- `tools/auto-x/scripts/run_daily.sh` 现会在日报完成后自动调用该入口
- 当日真实日报 run：`20260407-051553-llm-wiki-ingest-2026-04-07-90316a`
- 已补显式 query 入口：`tools/wiki_workflow.py query --topic "内容创作" --date YYYY-MM-DD`
- 已补显式 lint 入口：`tools/wiki_workflow.py lint --date YYYY-MM-DD`
- 真实验证：
  - query run：`20260407-065343-llm-wiki-query-内容创作-2026-04-07-064648`
  - lint run：`20260407-065343-llm-wiki-lint-2026-04-07-d9dee3`
  - lint 已帮助修复 `wiki/index.md` 和 `wiki/overview.md` 的陈旧问题
