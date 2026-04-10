# OpenCLI Repo Integration Design

**Date:** 2026-03-20
**Owner:** Codex

## Goal

把这轮在全局 `@jackwener/opencli@1.0.1` 上做过的 3 个本地修复固化到仓库里，并提供一个仓库内统一入口，保证后续 `opencli` 的浏览器命令默认串行执行，不再靠手工修补 `node_modules`。

## Scope

本轮只做 3 件事：

1. 在仓库里保存 `opencli 1.0.1` 的 canonical patched files。
2. 提供一个可重复执行的安装/补丁脚本，把这些文件同步到全局安装包。
3. 提供一个串行 wrapper 和 verify 脚本，供 `twitter / xiaohongshu / boss` 读链使用。

## Non-Goals

- 不替换现有 `/baoyu-post-to-x`、`/post-to-xhs`、`/baoyu-post-to-wechat` 等发布 skill。
- 不自动安装 Chrome unpacked extension；这一步仍保留手动安装。
- 不改 upstream `opencli` 仓库，也不在本轮发 PR。
- 不解决 `opencli` 自身的多会话隔离；仓库侧只做串行保护。

## Constraints

- 当前验证通过的上游版本固定为 `@jackwener/opencli@1.0.1`。
- `opencli` 浏览器命令共用同一个 automation window/tab，不能并行跑。
- 小红书存在 `creator.xiaohongshu.com` 与 `www.xiaohongshu.com` 双登录上下文。
- 这套接入优先服务“只读抓取/验证”，不接写操作主链路。

## Chosen Approach

### 1. Repo-managed replacement files

把已验证过的 6 个文件直接存到仓库：

- `src/clis/xiaohongshu/search.ts`
- `src/clis/xiaohongshu/creator-notes.ts`
- `src/clis/twitter/search.ts`
- `dist/clis/xiaohongshu/search.js`
- `dist/clis/xiaohongshu/creator-notes.js`
- `dist/clis/twitter/search.js`

理由：

- 这是当前最小、最稳定的固化方式。
- 不依赖 patch 命令、git 工作树或上游源码仓库。
- 可以直接覆盖全局安装包里的对应文件，适合本机长期使用。

### 2. Installer as the source of truth

新增 `tools/opencli/scripts/install.js`，负责：

- 检测全局 `@jackwener/opencli` 安装目录。
- 若未安装或版本不对，安装到 `1.0.1`。
- 首次覆盖前备份原始文件。
- 覆盖为仓库中的 canonical patched files。
- 写入本地 patch stamp，记录这次应用信息。

### 3. Serialized wrapper

新增 `tools/opencli/bin/redbook-opencli.js`，作为仓库内统一入口。

这个 wrapper 做两件事：

- 调用全局安装包里的 `opencli`。
- 在仓库 `tools/opencli/data/browser.lock` 上加文件锁，禁止并行浏览器命令。

### 4. Verify script

新增 `tools/opencli/scripts/verify.js`，串行执行已验证的真实 smoke：

- `doctor --live`
- `twitter search`
- `xiaohongshu search`
- `xiaohongshu creator-notes`
- `xiaohongshu creator-note-detail`（动态跟随前一步 note id）
- `boss search`
- `boss detail`（动态跟随前一步 security_id）

## Workflow Integration

### X / 小红书 / BOSS

- `opencli` 定位为“只读抓取/环境验证层”。
- 仓库内所有直接调用 `opencli` 的地方，默认都走 `redbook-opencli` wrapper。
- 现有写操作链路不迁移：
  - X 发布仍走 `/baoyu-post-to-x`
  - 小红书发布仍走 `/baoyu-xhs-images` / `/post-to-xhs`
  - BOSS 写操作仍走 `tools/auto-zhipin`

### Documentation

在 `tools/README.md` 增加 `opencli` 条目，明确：

- 它是“辅助只读层”，不是发布主链路。
- 必须串行。
- 需要主 Chrome 已安装 Browser Bridge 且站点已登录。

## Acceptance Criteria

满足以下条件即视为完成：

1. `node tools/opencli/scripts/install.js` 能在本机重放补丁。
2. `node tools/opencli/bin/redbook-opencli.js ...` 能串行调用全局 `opencli`。
3. `node tools/opencli/scripts/verify.js` 能串行完成 smoke。
4. `tools/README.md` 与 `tools/opencli/README.md` 都说明了定位、限制和用法。
