# 内容生产工作流升级 · 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 升级内容生产工作流：重组目录结构、迁移素材库到 Wiki、新增 wiki/素材/ 目录、升级早报模板、更新 CLAUDE.md

**Architecture:** 三条路径（每日研究/计划内容/热点速评）共用 Wiki 作为唯一知识底座。废弃独立素材库，迁移进 wiki/素材/。CLAUDE.md 作为工作流主文档全面更新。

**Tech Stack:** Markdown 文件操作、bash（daily.sh 升级）、git

---

### Task 1：创建 wiki/素材/ 目录并迁移素材库

**Files:**
- Create: `wiki/素材/金句库.md`
- Create: `wiki/素材/案例库.md`
- Create: `wiki/素材/框架库.md`
- Modify: `wiki/index.md`

- [ ] **Step 1: 读取现有素材库内容**

```bash
cat /Users/proerror/Documents/redbook/02-内容素材库/金句库/金句收集.md
ls /Users/proerror/Documents/redbook/02-内容素材库/案例库/
ls /Users/proerror/Documents/redbook/02-内容素材库/核心概念库/
ls /Users/proerror/Documents/redbook/02-内容素材库/爆款文稿库/
```

- [ ] **Step 2: 创建 wiki/素材/金句库.md**，迁移金句内容，格式：
```markdown
# 金句库

> 来源：02-内容素材库/金句库/ 迁移 | 最后更新：2026-04-17

## 分类索引
...（迁移原有内容）

## 相关页面
- [[框架库]] — 可复用表达框架
```

- [ ] **Step 3: 创建 wiki/素材/案例库.md**，迁移案例内容

- [ ] **Step 4: 创建 wiki/素材/框架库.md**，迁移核心概念库中的可复用框架

- [ ] **Step 5: 更新 wiki/index.md**，新增素材目录区块：
```markdown
## 素材

| 页面 | 摘要 | 最后更新 |
|------|------|----------|
| [金句库](素材/金句库.md) | 高质量表达，可直接复用 | 2026-04-17 |
| [案例库](素材/案例库.md) | 真实案例素材 | 2026-04-17 |
| [框架库](素材/框架库.md) | 可复用内容框架 | 2026-04-17 |
```

- [ ] **Step 6: 归档旧素材库**
```bash
mv /Users/proerror/Documents/redbook/02-内容素材库 /Users/proerror/Documents/redbook/02-内容素材库-archived
```

- [ ] **Step 7: 追加 wiki/log.md**
```markdown
## [2026-04-17] migrate | 素材库迁移至 wiki/素材/
触及页面：4个（金句库、案例库、框架库、index.md）
关键更新：废弃独立素材库，统一进 wiki 知识底座
```

- [ ] **Step 8: Commit**
```bash
git add wiki/素材/ wiki/index.md wiki/log.md
git mv 02-内容素材库 02-内容素材库-archived
git commit -m "refactor: migrate 素材库 into wiki/素材/, archive old directory"
```

---

### Task 2：升级早报模板和 daily.sh

**Files:**
- Create: `05-选题研究/早报模板.md`
- Modify: `tools/daily.sh`

- [ ] **Step 1: 创建早报模板** `05-选题研究/早报模板.md`：
```markdown
# 早报 YYYY-MM-DD

## Timeline 爆款 Top 3
| 帖子摘要 | 互动量 | Hook 类型 | 结构特点 |
|---------|--------|-----------|---------|
| | | | |

## 今日热点信号
- 

## 推荐选题
- [ ] [计划] 选题A — 角度说明，适合平台：X/小红书
- [ ] [速评] 选题B — 热点说明（时效：今日）
- [ ] [计划] 选题C — 角度说明

## 对标账号动态
| 账号 | 近期爆款 | 结构特点 |
|------|---------|---------|
| | | |
```

- [ ] **Step 2: 读取现有 daily.sh**
```bash
cat /Users/proerror/Documents/redbook/tools/daily.sh
```

- [ ] **Step 3: 更新 daily.sh**，输出文件名改为 `早报-YYYY-MM-DD.md`，并在末尾加入 wiki ingest 提示：
```bash
# 在 daily.sh 末尾追加
echo ""
echo "早报已生成：05-选题研究/早报-$(date +%Y-%m-%d).md"
echo "请运行 wiki ingest 更新知识库"
```

- [ ] **Step 4: Commit**
```bash
git add 05-选题研究/早报模板.md tools/daily.sh
git commit -m "feat: add 早报 template and update daily.sh output format"
```

---

### Task 3：更新 CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: 替换「标准化内容生产工作流」章节**，改为三条路径结构（路径0/1/2）

- [ ] **Step 2: 更新 Wiki Schema 章节**，新增 `wiki/素材/` 目录说明

- [ ] **Step 3: 更新「检索素材」步骤**，所有 `02-内容素材库/` 引用改为 `wiki/素材/` 和 `wiki/` query

- [ ] **Step 4: 更新 Definition of Done**，加入：
  - `wiki/素材/` 已提炼本篇金句/框架
  - 删除「素材库已检索（`02-内容素材库/`）」，改为「wiki 已 query」

- [ ] **Step 5: 修正发布链路**
  - `/x-create` 改为「可选辅助工具」
  - QA Agent 明确为「自检清单（事实/结构/AI痕迹/平台规则）」，不是子 agent

- [ ] **Step 6: 新增热点速评轻量路径说明**

- [ ] **Step 7: Commit**
```bash
git add CLAUDE.md
git commit -m "docs: upgrade CLAUDE.md with 3-path workflow, wiki-only knowledge base"
```

---

### Task 4：更新 memory 并补完本次会话收尾

**Files:**
- Modify: `memory/MEMORY.md`
- Modify: `memory/feedback_x_publish_workflow.md`
- Modify: `tasks/progress.md`
- Modify: `wiki/log.md`

- [ ] **Step 1: 更新 memory/feedback_x_publish_workflow.md**，反映新的三条路径工作流

- [ ] **Step 2: 更新 tasks/progress.md**，追加本次会话摘要

- [ ] **Step 3: 追加 wiki/log.md**，记录本次工作流升级

- [ ] **Step 4: 更新 wiki/选题/AI工具与效率.md**，新增 Opus 4.7 速评条目

- [ ] **Step 5: Final commit**
```bash
git add memory/ tasks/progress.md wiki/log.md wiki/选题/
git commit -m "chore: session wrap-up, workflow upgrade complete"
```
