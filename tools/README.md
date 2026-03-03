# Redbook 工具箱

## 🎯 工具矩阵

### 按功能分类

| 功能 | 推荐方式 | 备选方式 | 状态 |
|------|---------|---------|------|
| **X.com 研究** | `/x-collect` skill | `bash tools/daily.sh` (自动化) | ✅ 主推 |
| **X.com 创作** | `/x-create` skill | 手动写作 | ✅ 主推 |
| **X.com 发布** | `/baoyu-post-to-x` skill | ❌ ~~`auto-x/publish_x.sh`~~ | ✅ 唯一 |
| **小红书图文** | `/baoyu-xhs-images` skill | ❌ ~~`auto-redbook/render_simple.sh`~~ | ✅ 唯一 |
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
├── x-skills/             # X.com Claude Skills
│   ├── x-collect/        ✅ 研究工具（交互式）
│   ├── x-create/         ✅ 创作工具
│   ├── x-filter/         ✅ 筛选工具
│   └── x-publish/        ⚠️ 已被 /baoyu-post-to-x 替代
│
├── reddit_hack.py        ✅ Reddit 痛点挖掘（唯一）
│
└── aws-proxy/            ✅ 代理基础设施（独立项目）
```

---

## 🔧 工具详解

### 1. X.com 工具链

#### ✅ **推荐：Skills 方式**（交互式）

**`/x-collect`** - 研究收集
- **用途**：话题搜索、趋势分析、痛点提取
- **优势**：交互式、实时反馈、灵活调整
- **适用场景**：需要深度挖掘某个话题时
- **调用方式**：直接说「研究 X」或「X 话题研究」

**`/x-create`** - 内容创作
- **用途**：生成病毒式推文、Thread、长文
- **优势**：智能优化、自动排版
- **适用场景**：需要创作高质量推文时
- **调用方式**：说「写推文」或「创作 X 内容」

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
- **输出位置**：
  - 综合报告：`05-选题研究/X-每日日程-{日期}.md`
  - 自动追加到：`01-内容生产/选题管理/00-选题记录.md`
- **手动运行**：
  ```bash
  bash tools/daily.sh
  ```

**launchd 定时任务管理**：
```bash
# 启用定时任务
launchctl load ~/Library/LaunchAgents/com.redbook.daily-x.plist

# 停用定时任务
launchctl unload ~/Library/LaunchAgents/com.redbook.daily-x.plist

# 手动触发一次
launchctl start com.redbook.daily-x
```

#### ⚠️ **已集成/弃用**（仅用于调试）

以下脚本已集成到每日自动化中，**不建议单独使用**：
- `search_x.py` - 话题搜索（内部模块）
- `trending_topics.py` - 热门趋势（内部模块）
- `scrape_following.py` - 关注列表抓取（内部模块）
- `analyze_following.py` - 关注者分析（内部模块）
- `publish_x.sh` - 发布脚本（已被 `/baoyu-post-to-x` 替代）

---

### 2. 小红书工具链

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

### 3. Reddit 工具

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

## 🎯 使用决策树

```
需要做什么？
├─ 研究 X.com 话题
│  ├─ 定时自动化 → ✅ bash tools/daily.sh（已配置）
│  └─ 手动深挖 → ✅ /x-collect skill
│
├─ 创作 X 推文
│  └─ ✅ /x-create skill
│
├─ 发布到 X.com
│  └─ ✅ /baoyu-post-to-x skill
│
├─ 制作小红书图文
│  └─ ✅ /baoyu-xhs-images skill
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
- 手动：说「研究 X」调用 `/x-collect`
- Reddit：`python3 tools/reddit_hack.py <url>`

**创作阶段**：
- X 推文：说「创作 X 内容」
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
