# Redbook 工具箱

## 🎯 工具矩阵

### 按功能分类

| 功能 | 推荐方式 | 备选方式 | 状态 |
|------|---------|---------|------|
| **X.com 研究** | `bash tools/daily.sh` + `wiki_workflow.py query` | `tools/x-skills/x-collect` legacy local reference | ✅ 主推 |
| **X.com 创作** | `/x-mastery-mentor` + 账号风格手写/改写 | `tools/x-skills/x-create` legacy local reference | ✅ 主推 |
| **X.com 发布** | `/baoyu-post-to-x` skill | ❌ ~~`auto-x/publish_x.sh`~~ | ✅ 唯一 |
| **小红书图文** | `/baoyu-xhs-images` skill | ❌ ~~`auto-redbook/render_simple.sh`~~ | ✅ 唯一 |
| **小红书视频/数据/搜索** | `RedBookSkills` | 历史 `/post-to-xhs` 文档 | ✅ 主推 |
| **发布数据记录** | `record_publish.py` + `publish-records.jsonl` | `04-内容数据统计/数据统计表.md` 手工补视图 | ✅ 主推 |
| **跨站点只读抓取 / 环境验证** | `tools/opencli/` | 现有 skills / 手工浏览器 | ✅ 辅助层 |
| **内部工作台自然语言试点** | `tools/page-agent-console/` | 无 | ✅ 试点 |
| **Reddit 痛点** | `reddit_hack.py` | 无 | ✅ 唯一 |

---

## 📁 目录结构

```
tools/
├── auto-redbook/         # 小红书工具（已弃用大部分）
│   ├── scripts/
│   │   ├── render_simple.sh      ❌ 已弃用 → 用 /baoyu-xhs-images
│   │   └── publish_xhs.py        ❌ 已弃用 → 用 /baoyu-xhs-images
│   └── requirements.txt
│
├── auto-x/               # X.com 自动化工具
│   ├── scripts/
│   │   ├── daily_schedule.py     ✅ 每日自动化报告（主要）
│   │   ├── daily_research.py     ✅ 研究模块（被 daily_schedule 复用）
│   │   ├── search_x.py           ⚠️ 已集成到 daily_research
│   │   ├── trending_topics.py    ⚠️ 已集成到 daily_research
│   │   ├── scrape_following.py   ⚠️ 已集成到 daily_research
│   │   ├── analyze_following.py  ⚠️ 已集成到 daily_research
│   │   ├── run_daily.sh          ✅ 定时任务启动器
│   │   └── x_utils.py            ✅ 工具库
│   ├── data/
│   │   ├── following.json        # 关注列表缓存
│   │   └── daily/                # 每日研究归档
│   └── com.redbook.daily-x.plist  ✅ launchd 定时任务配置
│
├── opencli/              # opencli 安装/补丁/串行 wrapper（跨站点只读 + BOSS low-level core）
│   ├── bin/
│   ├── scripts/
│   ├── vendor/           # 已验证的 opencli 1.0.1 patched files
│   └── README.md
│
├── page-agent-console/   # Page Agent 内部工作台试点（本地控制台 + harness 包装）
│   ├── public/
│   ├── server.mjs
│   └── README.md
│
├── x-skills/             # X.com Claude Skills
│   ├── x-collect/        ⚠️ legacy local reference（主流程不用）
│   ├── x-create/         ⚠️ legacy local reference（主流程不用）
│   ├── x-filter/         ⚠️ legacy local reference（主流程不用）
│   └── x-publish/        ⚠️ 已被 /baoyu-post-to-x 替代
│
├── reddit_hack.py        ✅ Reddit 痛点挖掘（唯一）
├── record_publish.py     ✅ 发布数据 JSONL 主账本追加工具
│
└── aws-proxy/            ✅ 代理基础设施（独立项目）
```

---

## 🔧 工具详解

### 1. X.com 工具链

#### ✅ **推荐：当前主流程**

当前可用入口以 [`docs/reference/skills-manifest.md`](../docs/reference/skills-manifest.md) 为准。

**研究**：
- 默认入口：`bash tools/daily.sh`
- 显式 wiki 查询：`python3 tools/wiki_workflow.py query --topic "主题" --date YYYY-MM-DD`
- `tools/x-skills/x-collect` 仅作为 legacy local reference，不再作为默认 skill 入口。

**创作 / 审稿**：
- 默认入口：`/x-mastery-mentor`
- 用它做 Hook、结构、算法层、内容层、CTA 层审稿。
- `tools/x-skills/x-create` 仅作为 legacy local reference，不再作为默认 skill 入口。

**`/baoyu-post-to-x`** - 发布推文
- **用途**：自动发布推文（文本/图片/视频）
- **优势**：Chrome CDP 全自动、无需手动操作
- **适用场景**：发布任何类型的推文
- **调用方式**：说「发布到 X」或「发布推文」

#### ✅ **推荐：自动化方式**（定时任务）

**`tools/daily.sh`** - 每日自动化唯一入口
- **运行时间**：每日 7:00 AM（launchd 自动）
- **执行内容**：
  1. 生成发布提醒（扫描待深化/制作中）
  2. 回顾最近发布数据（从数据统计表提取）
  3. 生成每日研究（X.com + HN/Reddit）
- **运行模式**：
  - `bash tools/daily.sh`：本机完整模式（需要 Chrome + actionbook + X 登录态）
  - `bash tools/daily.sh --skip-x`：无浏览器模式（仅 HN/Reddit，适合 GitHub Actions/CI）
- **输出位置**：
  - 综合报告：`05-选题研究/X-每日日程-{日期}.md`
  - 推荐选题保留在日报内；用户或 agent 明确选中后再写入 `01-内容生产/选题管理/00-选题记录.md`
- **手动运行**：
  ```bash
  bash tools/daily.sh
  bash tools/daily.sh --skip-x
  ```

**launchd 定时任务管理**：
```bash
# 将仓库里的 plist 同步到 ~/Library/LaunchAgents 并重载
bash tools/reload_daily_launch_agent.sh
```

**GitHub Actions（无浏览器子集）**：
- workflow：`.github/workflows/daily-browser-free.yml`
- 调度时间：每天 `23:00 UTC`（北京时间次日 `07:00`）
- 用途：生成无浏览器日报并自动提交到 `main`

**早晨同步**：
```bash
bash tools/morning_sync.sh
```
- 只在 worktree 干净时执行 `git pull --ff-only`
- 同步后列出当天日报路径

### 2. 发布数据记录

**`tools/record_publish.py`** - 追加结构化发布记录
- 主账本：`04-内容数据统计/publish-records.jsonl`
- Schema：`04-内容数据统计/publish-records.schema.md`
- 阶段：`T+0` 记录状态 URL / note id / 初始 views；`T+1` 和 `T+3` 追加后续指标与复盘结论。

示例：
```bash
python3 tools/record_publish.py \
  --stage T+0 \
  --platform x.com \
  --title "short title" \
  --published-at "2026-04-28T05:42:00+08:00" \
  --status-url "https://x.com/..." \
  --views 2
```

#### ⚠️ **已集成/弃用**（仅用于调试）

以下脚本已集成到每日自动化中，**不建议单独使用**：
- `search_x.py` - 话题搜索（内部模块）
- `trending_topics.py` - 热门趋势（内部模块）
- `scrape_following.py` - 关注列表抓取（内部模块）
- `analyze_following.py` - 关注者分析（内部模块）
- `publish_x.sh` - 发布脚本（已被 `/baoyu-post-to-x` 替代）

---

### 3. 小红书工具链

#### ✅ **唯一推荐：`/baoyu-xhs-images` Skill**

**功能**：
- 图文生成（10 种风格 x 8 种布局）
- 自动发布到小红书
- 内容分析 + 大纲生成

**使用方式**：
- 说「生成小红书图文」或「制作小红书卡片」

**优势**：
- 全自动流程，无需手动操作
- 视觉效果专业
- 一键生成 + 发布

#### ❌ **已弃用**

- `auto-redbook/render_simple.sh` → 用 `/baoyu-xhs-images` 替代
- `auto-redbook/publish_xhs.py` → 用 `/baoyu-xhs-images` 替代

**弃用原因**：
- Skills 更稳定、功能更强
- 本地渲染依赖复杂（agent-browser）
- 发布流程需要手动操作

---

### 4. Reddit 工具

#### ✅ **`reddit_hack.py`** - 痛点挖掘工具

**用途**：从 Reddit 讨论中提取创业机会

**使用方式**：
```bash
python3 tools/reddit_hack.py <reddit_url> [output_file]
```

**示例**：
```bash
python3 tools/reddit_hack.py \
  "https://www.reddit.com/r/SaaS/comments/xxx/yyy/" \
  "05-选题研究/Reddit-痛点-SaaS-2026-02-13.md"
```

**输出内容**：
- 统计摘要：痛点总数、高价值痛点数
- Top 5 创业机会（点赞 > 10）
- 完整痛点列表（按点赞排序）

**适用场景**：
- 发现创业机会
- 验证市场需求
- 寻找内容选题

---

### 5. OpenCLI 适配层

#### ✅ **`tools/opencli/`** - Browser Bridge 辅助层 + BOSS 统一核心

**定位**：
- 固化本机 `@jackwener/opencli@1.0.1` 的已验证补丁
- 提供仓库内统一入口
- 强制串行执行浏览器命令，避免 automation window/tab 串页
- 为 `tools/auto-zhipin` 提供共享的 `boss core`

**适用场景**：
- 验证 `opencli` 环境是否健康
- 只读抓取 `X / 小红书 / BOSS`
- 直接调用 BOSS low-level 动作原语（聊天列表、读线程、发消息、发简历、单次 apply）
- 复用用户主 Chrome 的真实登录态做 smoke / 取数

**不适用场景**：
- 不替代现有发布 skills
- 不承担 X / 小红书 / 微信写操作主链路
- 不承担 BOSS 的 supervisor / ledger / dedupe / breaker

**常用命令**：
```bash
node tools/opencli/scripts/install.js
node tools/opencli/bin/redbook-opencli.js doctor
node tools/opencli/bin/redbook-opencli.js twitter search --query AI --limit 3 -f json
node tools/opencli/bin/redbook-opencli.js xiaohongshu creator-notes --limit 3 -f json
node tools/opencli/bin/redbook-opencli.js boss search --query "AI Agent" --city 上海 --limit 3 -f json
node tools/opencli/bin/redbook-opencli.js boss chat-list --limit 3 -f json
node tools/opencli/bin/redbook-opencli.js boss apply --url "<job_url>" --dry_run true -f json
node tools/opencli/scripts/verify.js
```

**注意**：
- 这套 wrapper 默认串行，不能并行跑多个浏览器命令
- 主 Chrome 里必须手动安装 `opencli Browser Bridge`
- 小红书 `creator.xiaohongshu.com` 和 `www.xiaohongshu.com` 需要分别登录

### 6. Page Agent 内部工作台试点

#### ✅ **`tools/page-agent-console/`** - 内部控制台 + 自然语言代理试点

**定位**：
- 为 redbook 提供一个本地 `localhost` 控制台
- 验证 `page-agent` 是否适合作为“内部工作台代理层”
- 只覆盖内部任务板 / harness / 研究报告，不替代发布主链路

**当前能力**：
- 展示 `tasks/todo.md` 摘要
- 展示 `tasks/progress.md` 近期会话
- 展示最新 harness runs
- 新建 run、查看单个 run、设置 run check
- 预览 `05-选题研究/` 最新 Markdown 报告
- 如果用户安装了 `Page Agent Extension`，可以在页面内直接发自然语言任务

**启动**：
```bash
node tools/page-agent-console/server.mjs
```

**访问地址**：
```text
http://127.0.0.1:4318
```

**边界**：
- 只适合本机 localhost
- 不接 X / 小红书 / 微信发布
- 不替代 `/baoyu-post-to-x`、`/baoyu-xhs-images`、`/baoyu-post-to-wechat`
- 当前只包装最小 harness 命令：`new-run`、`show-run`、`set-check`

---

## 🎯 使用决策树

```
需要做什么？
├─ 研究 X.com 话题
│  ├─ 定时自动化 → ✅ bash tools/daily.sh（已配置）
│  └─ 手动深挖 → ✅ tools/wiki_workflow.py query + 当前 X Timeline 检索
│
├─ 创作 X 推文
│  └─ ✅ /x-mastery-mentor + 账号风格手写/改写
│
├─ 发布到 X.com
│  └─ ✅ /baoyu-post-to-x skill
│
├─ 制作小红书图文
│  └─ ✅ /baoyu-xhs-images skill
│
├─ 小红书视频 / 数据 / 搜索
│  └─ ✅ RedBookSkills
│
├─ 跨站点只读抓取 / 环境验证
│  └─ ✅ tools/opencli/
│
└─ 挖掘 Reddit 痛点
   └─ ✅ reddit_hack.py
```

---

## 🚀 快速开始

### 第一次使用

1. **确认 Python 环境**（macOS 上使用 `python3`）：
   ```bash
   python3 --version  # 应该显示 Python 3.x
   ```

2. **安装依赖**：
   ```bash
   cd tools/auto-x
   pip3 install -r requirements.txt
   ```

3. **配置 actionbook**（已完成）：
   - 位置：`~/.local/bin/actionbook`
   - 配置：`~/Library/Application Support/actionbook/config.toml`

4. **启用定时任务**（已完成）：
   ```bash
   launchctl load ~/Library/LaunchAgents/com.redbook.daily-x.plist
   ```

### 日常使用

**研究阶段**：
- 自动：等待每日 7:00 AM 的研究报告
- 手动：用 `tools/wiki_workflow.py query` 查询 wiki，并按需查看当前 X Timeline
- Reddit：`python3 tools/reddit_hack.py <url>`

**创作阶段**：
- X 推文：用 `/x-mastery-mentor` 做结构、Hook 和审稿
- 小红书图文：说「生成小红书图文」

**发布阶段**：
- X：说「发布到 X」
- 小红书：`/baoyu-xhs-images` 已包含发布功能

---

## 🛠 故障排查

### 每日自动化未运行（tools/daily.sh）

**检查定时任务状态**：
```bash
launchctl list | grep daily-x
```

**查看日志**：
```bash
cat /Users/proerror/Library/Logs/redbook/launchd-stdout.log
cat /Users/proerror/Library/Logs/redbook/launchd-stderr.log
```

**手动运行测试**：
```bash
cd /Users/proerror/Documents/redbook
bash tools/daily.sh --skip-research
```

### actionbook 连接失败

**检查 Chrome 调试端口**：
```bash
# Headed 模式（端口 9222）
lsof -i :9222

# Headless 模式（端口 9223）
lsof -i :9223
```

**手动启动 Chrome**（headless）：
```bash
bash tools/daily.sh
```

---

## 📝 更新日志

**2026-02-13**：
- ✅ 采用方案 A：Skills 为主，脚本为辅
- ✅ 弃用 `auto-redbook` 渲染/发布脚本
- ✅ 弃用 `auto-x/publish_x.sh`
- ✅ 明确 `tools/daily.sh` 为自动化唯一入口
- ✅ 确立 `/baoyu-*` skills 为发布唯一方式

**2026-02-10**：
- 切换浏览器引擎：`agent-browser` → `actionbook`
- 增加 headless 模式支持
- 配置 launchd 定时任务

**2026-02-07**：
- 创建 `auto-x` 工具套件
- 集成 `x-skills` 到项目
