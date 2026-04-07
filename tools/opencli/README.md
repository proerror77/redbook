# Redbook OpenCLI Wrapper

这个目录把本机 `opencli` 修复沉淀成仓库内可重复流程。

它现在做 4 件事：

1. 固化已经验证过的 `opencli 1.6.8` 本地补丁。
2. 提供一个仓库内统一入口 `redbook-opencli`。
3. 用锁文件强制串行执行浏览器命令，避免 automation window/tab 串页。
4. 为 BOSS 提供与 `auto-zhipin` 共用的 low-level browser core 和 CLI 面。

## 定位

- 它是 **跨站点只读抓取 / 环境验证层**，外加 **BOSS low-level browser core**。
- 它不是现有发布 skill 的替代品。
- X、小红书、BOSS 的写操作主链路仍然分别保留在：
  - `/baoyu-post-to-x`
  - `/baoyu-xhs-images` / `/post-to-xhs`
  - `tools/auto-zhipin`（supervisor / ledger / dedupe / breaker）

## 先决条件

1. 主 Chrome 已安装 `opencli Browser Bridge` unpacked extension。
2. 需要使用的站点已经在主 Chrome 登录：
   - `x.com`
   - `creator.xiaohongshu.com`
   - `www.xiaohongshu.com`
   - `www.zhipin.com`
3. 不要并行启动多个 `opencli` 浏览器命令；仓库 wrapper 会默认加锁。

## 安装与补丁

安装或修补全局 `@jackwener/opencli@1.6.8`：

```bash
node tools/opencli/scripts/install.js
```

如果你已经装好了 `1.6.8`，只想重放仓库里的补丁：

```bash
node tools/opencli/scripts/install.js --skip-install
```

脚本会：

- 检测全局安装目录
- 必要时安装 `@jackwener/opencli@1.6.8`
- 备份原始文件到 `.redbook-opencli-backup/`
- 覆盖为仓库里的 canonical patched files
- 写入 `.redbook-opencli-patches.json`
- 如果 npm 包本身不带 Browser Bridge 扩展，会自动从 GitHub Releases 下载 `opencli-extension.zip` 到 `tools/opencli/data/browser-bridge/`
- 自动把全局包里的 `extension` 路径修成指向该缓存目录的 symlink，兼容旧 Chrome profile 中已经记住的 unpacked-extension 路径

## 统一入口

直接调用 wrapper：

```bash
node tools/opencli/bin/redbook-opencli.js doctor
node tools/opencli/bin/redbook-opencli.js twitter search AI --limit 3 -f json
node tools/opencli/bin/redbook-opencli.js xiaohongshu creator-notes --limit 3 -f json
node tools/opencli/bin/redbook-opencli.js boss search "AI Agent" --city 上海 --limit 3 -f json
node tools/opencli/bin/redbook-opencli.js boss chat-list --limit 3 -f json
```

元命令：

```bash
node tools/opencli/bin/redbook-opencli.js install
node tools/opencli/bin/redbook-opencli.js verify
```

## 验证

跑一轮串行 smoke：

```bash
node tools/opencli/scripts/verify.js
```

注意：

- `opencli 1.6.8` 的 `doctor` 即使在 `[MISSING] Extension` / `[FAIL] Connectivity` 时也可能返回退出码 `0`。
- 仓库里的 `verify.js` 已改成读取 `doctor` 正文；只有同时看到 `[OK] Daemon`、`[OK] Extension`、`[OK] Connectivity` 才算通过。
- 安装脚本现在会自动准备 Browser Bridge 扩展目录；如果 `verify.js` 仍报 `Browser Bridge 未连接`，优先重启一次主 Chrome，或启动仓库维护的 bridge profile 再重跑。

它会串行验证：

- `doctor`
- `twitter search`
- `xiaohongshu search`
- `xiaohongshu creator-notes`
- `xiaohongshu creator-note-detail`
- `boss search`
- `boss detail`
- `boss chat-list`
- `boss chat-thread`（如果当前账号有会话）

## 当前补丁集

### 1. `xiaohongshu search`

- 识别 public-site 登录墙
- 未登录时显式报 `HTTP 401`
- 避免把鉴权失败伪装成空数组

### 2. `xiaohongshu creator-notes`

- 避开脆弱的重型 `page.evaluate` 解析
- 从 `data-impression` 提取 `noteId`
- 回填 `url`

### 3. `twitter search`

- 改成直达 `x.com/search?...&f=top`
- 从结果页 DOM 提取数据
- 不再依赖 explore 搜索框 + synthetic Enter

### 4. `boss` 统一核心与 CLI 面

- 新增共享 `boss core`：`chat-browser`、`job-browser`
- `tools/auto-zhipin` 的 Playwright / current-tab worker 改成 direct import 同一套 core
- 新增命令：
  - `boss chat-list`
  - `boss chat-thread`
  - `boss send-message`
  - `boss send-resume`
  - `boss apply`
- `install.js` 会自动把这些命令 merge 进全局 `cli-manifest.json`

## 约束

- 当前补丁只针对 `@jackwener/opencli@1.6.8`。
- 这个 wrapper 默认把浏览器命令当成单会话共享资源来处理，所以会加锁等待。
- 如果要升级 upstream 版本，先重新验证补丁兼容性，再更新 `vendor/` 和 installer 的固定版本。
- `boss send-message / send-resume / apply` 是低层动作原语；批量投递、去重、台账、熔断仍归 `tools/auto-zhipin`。
