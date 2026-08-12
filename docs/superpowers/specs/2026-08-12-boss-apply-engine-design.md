# BOSS 自动化求职增长引擎 — 设计文档

日期: 2026-08-12
状态: Draft
仓库: `~/Documents/redbook/tools/auto-zhipin`

## 1. 目标（第一性原理）

把 BOSS 求职做成一个**每天自动运转的增长引擎**，闭环：

```
扫描职位 → 筛选 → 拟人化投递 → 消息跟进 → 复盘日报(飞书)
```

关键约束（用户明确决策）：

| 维度 | 决策 |
|------|------|
| 自主程度 | 全自动无人值守，仅异常时人工介入 |
| 日投递量 | **120 为上限**，风控自动降速 |
| 操作边界 | 真实 Chrome + userscript 模拟点击，**零 CDP/Playwright/DOM 快照** |
| 运行形态 | Chrome 常驻 + gate 服务器常驻；**仅工作日**投递，其他时间监看+扫描 |
| 职位来源 | **仅 BOSS 推荐流**，零自动导航/搜索/翻页 |
| 消息分拣 | 自动分类（面试邀约/报价/沟通中/垃圾），面试邀约→飞书推送 |
| 复盘报告 | 日报 → 飞书多维表格（lark-cli base） |
| 通知渠道 | 飞书消息推送（lark-cli im） |

## 2. 现状问题（要解决的）

### 2.1 定时任务体系失效（4 套全坏）
- `com.redbook.boss-chatlist`（每 2h）：日志停在 4/6
- `com.redbook.boss-daily-apply`（9:03+14:03）：日志停在 3/30，Extension 未连接
- `com.redbook.daily-zhipin-apply`（9:00，非 repo 内）：7/29 仍报 `Operation not permitted`
- `com.redbook.daily-x`（7:00，X.com）：与 BOSS 无关但同源

**根因**：旧定时任务全部指向已废弃的 opencli 架构，未适配新的 userscript-gate 架构。

### 2.2 投递需人工（Alt+A）
- userscript 每 5s 扫描自动，但投递需人工按 Alt+A
- 与"全自动无人值守"目标不符

### 2.3 缺拟人化反检测
- 现有投递是 `button.click()`，无鼠标轨迹/事件链模拟，是风控识别自动化的高风险特征

### 2.4 缺风控自动降速的检测触发
- 无"检测到验证码/限流弹窗 → 自动暂停降速"机制

### 2.5 缺消息分拣
- `chat_triage.js` 只识别拒绝/站外邮箱/大厂，无面试邀约分类

### 2.6 缺复盘报告
- 台账数据完整但无自动汇总，无飞书整合

## 3. 目标架构

```
┌──────────────────────────────────────────────────────────┐
│  调度中枢 supervisor（launchd 重构）                       │
│  Chrome常驻 · gate常驻 · 仅工作日 · 3时段内投递             │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ ① 投递引擎    │  │ ② 消息分拣    │  │ ③ 日报引擎     │  │
│  │ userscript    │  │ 分类器       │  │ ledger→飞书    │  │
│  │ 扫描→gate→    │  │ 面试→飞书推送 │  │ base多维表格   │  │
│  │ 拟人化点击     │  │              │  │               │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 组件职责
- **调度中枢**：管理 gate 服务器生命周期、投递时段控制、风控状态机、日志
- **投递引擎**（userscript）：扫描推荐流 → gate 决策 → 拟人化点击 → 记账
- **消息分拣**（新）：分类聊天消息 → 面试邀约推送飞书
- **日报引擎**（新）：从 ledger 汇总 → lark-cli 写飞书多维表格

## 4. 组件设计

### 4.1 投递引擎（userscript 升级）

**改造点：从"Alt+A 人工"到"gate 通过自动点击"**

当前流程（保留骨架）：
```
扫描(5s) → 提取岗位 → POST /gate → gate.allow? → button.click() → 记账
```

新增/改造：
1. **自动投递开关**（config 控制）：gate.allow 且未投递过 → 自动执行拟人化点击，不再等 Alt+A
2. **节流**：默认 1 个/45s（config `apply.intervalSeconds`），时段内累计，日上限 120
3. **拟人化点击层**（移植 `boss-auto-apply` anti-detection.js）：
   - 贝塞尔曲线鼠标轨迹 + Fitts' Law 移动时间
   - 完整点击事件链 `pointerdown→mousedown→pointerup→mouseup→click` + pressure/tilt
   - isTrusted 绕过、时间戳单调性保护
   - 疲劳模型 + 随机休息
4. **风控弹窗检测**（移植 `boss-auto-apply` automation.js）：
   - MutationObserver 监控弹窗，识别关键词：`验证码/安全检测/操作太快/休息一下/频繁/人机验证/封禁/限制/请先`
   - 命中 → 暂停投递，上报 supervisor，等待人工/冷却
5. **投递时段控制**：仅工作日 9-11/14-17/20-22 执行投递；非时段只扫描监看
6. **保留现有保护**：页面风险检测（登录/受限/403）、详情漂移校验、去重、证据验证

### 4.2 消息分拣（新增）

**目标**：自动分类聊天消息，面试邀约等重要消息推送飞书。

- 新建 `lib/chat_classifier.js`，扩展 `chat_triage.js`：
  - **面试邀约**：`面试|面谈|约个时间|您看什么时间方便|聊聊岗位|电话面试|线下面试|视频面试|面试官`
  - **报价/沟通中**：现有 REJECTION/OFFSITE/BIG_COMPANY 逻辑保留
  - **垃圾**：广告、营销关键词
- 面试邀约 → 推送飞书消息（`lark-cli im`），其余归档台账
- 触发：新建 `scripts/chat_monitor_feishu.js`，由 supervisor 每 15 分钟轮询聊天列表（复用 `chat_triage.js` 的意图识别），仅处理**新消息**（按 ledger 去重，避免重复推送）

### 4.3 日报引擎（新增）

**目标**：每日从 ledger/events 汇总 → 飞书多维表格。

- 新建 `scripts/daily_report_feishu.js`：
  - 读取 `data/ledger.json` / `data/events.jsonl`
  - 汇总：当日投递数、沟通数、回复数、面试邀约数、转化率
  - 用 `lark-cli base` 写飞书多维表格（字段：日期/投递/沟通/回复/面试/转化率）
  - 用 `lark-cli im` 推送日报摘要消息

### 4.4 调度中枢（launchd 重构）

**删除 3 套失效旧任务**（boss-chatlist、boss-daily-apply、daily-zhipin-apply）：
```bash
launchctl unload ~/Library/LaunchAgents/com.redbook.boss-chatlist.plist
launchctl unload ~/Library/LaunchAgents/com.redbook.boss-daily-apply.plist
launchctl unload ~/Library/LaunchAgents/com.redbook.daily-zhipin-apply.plist
rm ~/Library/LaunchAgents/com.redbook.daily-zhipin-apply.plist  # 非repo内的孤儿
```

**新建 1 套常驻 supervisor**（`com.redbook.boss-supervisor.plist`）：
- 启动时拉起：gate 服务器（`node scripts/userscript_gate_server.js`）+ 消息分拣轮询
- 保证 Chrome 常驻（或检测 Chrome 关闭后重启）
- 投递时段逻辑在 gate 服务器内实现（工作日 3 时段）

**修复权限问题**：`Operation not permitted` 的根因是 launchd 对 `~/Documents/redbook` 的访问权限。需在 plist 设置 `WorkingDirectory` + 正确 `HOME`，并用 `~` 绝对路径。

## 5. 参考项目（research/ 保留）

克隆于 `~/Documents/oc1/research/`，Apache-2.0 可复用：

| 项目 | 复用点 |
|------|--------|
| `boss-auto-apply` | `anti-detection.js`(拟人化点击)、`automation.js`(风控弹窗检测)、`selectors.js`(新 BOSS 类名) |
| `boss_agent` | `set_autorun_blocked` 暂停机制、模型评分思路 |
| `Boss-helper` | 投递统计面板、反反爬虫思路 |

## 6. 数据流

```
推荐流卡片 → extractJob → POST /gate → allow? 
  → 拟人化点击 → POST /applied → events.jsonl → ledger.json
  → (每日) daily_report_feishu.js → 飞书多维表格 + 消息
聊天消息 → chat_classifier → 面试邀约? → 飞书推送
                               → 其他 → events.jsonl
```

## 7. 错误处理与风控

- **风控弹窗**（验证码/安全检测/操作太快/休息一下）→ 暂停投递 → 上报 → 等待冷却
- **登录失效/受限/403/回退** → 立即停止投递，通知用户（飞书）
- **gate 服务器离线** → userscript 不投递，显示 offline
- **模型/网络错误** → 跳过当前岗位，不用不可靠决策（参考 boss_agent）
- 所有异常事件写 events.jsonl，日报可追溯

## 8. 测试

- userscript 拟人化点击：单元测试事件链构造、节流、弹窗检测
- gate 决策：现有测试保留
- chat_classifier：分类正则测试
- daily_report：汇总逻辑测试（mock ledger）
- 现有 161 测试保持通过

## 9. 范围界定

**本次实施包含：**
- 投递引擎拟人化 + 自动点击 + 风控降速
- 消息分拣 + 飞书推送
- 日报引擎 + 飞书多维表格
- launchd 重构（删旧建新）

**不包含（后续）：**
- CDP/Playwright 自动化（明确禁用）
- 自动搜索/翻页/导航（只用推荐流）
- 猎聘/拉勾等平台支持
- 面试准备材料自动生成

## 10. 决策记录

| 决策 | 依据 |
|------|------|
| 120/天上限 + 风控自动降速 | 用户明确；BOSS 风控现实，量级偏激进 |
| 真实 Chrome + 拟人化点击 | 保风控优先；README 硬边界 |
| 仅工作日 3 时段 | 用户明确 |
| 仅推荐流 | 用户明确；零导航最低风控 |
| 复用 lark-cli 接入飞书 | 已安装、auto-x 有先例 |
| 移植 Apache-2.0 参考代码 | 合法复用，标注出处 |
