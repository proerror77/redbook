# Dirty Worktree Cleanup - 2026-05-25

> 来源：`git status --short --untracked-files=all` | 最后更新：2026-05-25

## 本轮已整理

- 将根目录履历材料归位到 `06-业务运营/求职/`：
  - `2026-05-13-企业AI-Agent版.md`
  - `2026-05-13-企业AI-Agent版.html`
  - `2026-05-13-企业AI-Agent版.pdf`
  - `2026-05-13-企业AI-Agent版-preview.png`
  - `2026-05-13-企业主短评-Agentic-Engineer.md`
- 将明显临时/生成物移到已忽略的 `tmp/`：
  - `tmp/fonts/font-Bold.ttf`
  - `tmp/fonts/font-Medium.ttf`
  - `tmp/fonts/font-Regular.ttf`
  - `tmp/singbox/singbox_fixed.json.pre-ilovevc-v26-20260512_064235`
  - `tmp/x-replies-2026-05-13/_draft_replies_batch2.py`
- 保留内容、研究、发布和工具证据在原目录，没有删除数据。

## 当前 Dirty 分类

### A. 可作为内容/发布证据提交

- `01-内容生产/02-制作中的选题/2026-05-12-AI重写组织形态/`
  - `X短评.md`
  - `图文分镜.md`
- `01-内容生产/02-制作中的选题/2026-05-13-claude-for-legal-workflow-os/`
  - `short-post.md`
  - `发布记录.md`
- `04-内容数据统计/publish-records.jsonl`
  - 新增一条 `2026-05-13-x-ai-claude-for-legal-t0` 发布记录。
- `06-业务运营/求职/2026-05-13-*`
  - 本轮从根目录归位的履历/求职材料。

### B. 可作为每日研究证据提交

- `05-选题研究/HN-每日热点-2026-05-13.md`
- `05-选题研究/Reddit-每日监控-2026-05-13.md`
- `05-选题研究/X-timeline-*-2026-05-13.*`
- `05-选题研究/X-互动队列-2026-05-13.*`
- `05-选题研究/X-互动回复批次-2026-05-13*.json`
- `05-选题研究/X-互动回复记录-2026-05-13.*`
- `05-选题研究/X-互动回复验证-2026-05-13.*`

### C. 可作为 Wiki / Harness 证据提交

- `docs/reports/wiki-ingest-2026-05-13.md`
- `docs/reports/wiki-lint-2026-05-13.md`
- `docs/reports/wiki-query-ai-agent企业导入与协作-2026-05-12.md`
- `docs/reports/wiki-query-ai工具与效率-2026-05-12.md`
- `tasks/harness/runs/20260512-022902-llm-wiki-query-ai-agent企业导入与协作-2026-05-12-0ff01f.json`
- `tasks/harness/runs/20260512-022905-llm-wiki-query-ai工具与效率-2026-05-12-49e663.json`
- `tasks/harness/runs/20260512-214838-llm-wiki-ingest-2026-05-13-6f3876.json`
- `tasks/harness/runs/20260512-214838-llm-wiki-lint-2026-05-13-d6e68c.json`

### D. 需要确认后再处理

- `singbox_fixed.json`
  - 大幅配置改动，包含代理/网络配置上下文；不建议混入 Redbook 内容提交。
  - 建议三选一：保留本地不提交、移出 repo、或明确确认后单独提交。
- `tools/auto-x/scripts/post_replies_cdp.mjs`
  - CDP 回复自动化实验脚本；近期问题已经定位到账户限制，而不是纯 DOM 输入问题。
  - 建议单独决定：保留为实验工具并补文档，或移到 `tmp/`。

## 提交建议

建议拆成 4 个独立 commit，避免把内容证据、运营履历、工具实验和网络配置混在一起：

1. `Add May 13 content and publish evidence`
2. `Add May 13 daily research artifacts`
3. `Add wiki ingest and lint evidence`
4. `Organize May 13 job application materials`

`singbox_fixed.json` 和 `post_replies_cdp.mjs` 不应进入上述 commit，除非用户单独确认。

## 验证

- 根目录的 `font-*.ttf`、`履历-*`、`企业主短评-*`、`singbox_fixed.json.pre-*` 已不再出现在 repo 根目录。
- `tmp/fonts/`、`tmp/singbox/`、`tmp/x-replies-2026-05-13/` 均被 `.gitignore` 的 `/tmp/` 规则忽略。
- 整理后 `git status --short --untracked-files=all` 仍保留内容/研究/发布证据，未做 destructive cleanup。
