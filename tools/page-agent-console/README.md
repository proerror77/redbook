# Page Agent Console

本目录是 `page-agent` 的最小试点控制台。

目标不是替换现有 `/baoyu-*` 发布链路，而是验证它是否适合作为 redbook 的内部工作台代理层。

## 当前能力

- 浏览 `tasks/todo.md` 的任务板摘要
- 浏览 `tasks/progress.md` 的最近会话摘要
- 浏览最近的 harness runs
- 新建 harness run
- 查看单个 run 的 gate report
- 设置 run check
- 预览最近研究报告
- 调用 `Page Agent Extension` 在这个控制台内执行自然语言任务

## 启动

```bash
node tools/page-agent-console/server.mjs
```

默认地址：

```text
http://127.0.0.1:4318
```

## 使用 Page Agent

1. 安装 `Page Agent Extension`
2. 从 extension side panel 复制 auth token
3. 打开控制台页面
4. 填入：
   - `Extension Token`
   - `LLM Base URL`
   - `Model`
   - `API Key`
5. 输入自然语言任务后点击 `Run Task`

当前推荐测试指令：

- `查看最新的 harness run，找出还没通过的 gate。`
- `浏览最新研究报告列表，告诉我今天最值得推进成 draft 的选题。`
- `检查任务板摘要，说明当前最优先应该推进哪一个工程任务。`

## BOSS 页面只读探测

如果要让 `Page Agent` 尝试读取你已经打开的 BOSS 页面：

1. 把 BOSS 页面和控制台放在同一个 Chrome 窗口
2. 在控制台里勾选 `Allow multi-tab probe`
3. 使用这个 prompt：

```text
在同一浏览器窗口中查找 zhipin.com 的 BOSS 直聘标签页，读取当前职位标题、薪资、经验要求、公司名、职位描述前两段，并确认页面里是否存在“立即沟通”按钮。只读检查，不要点击任何按钮，也不要跳转页面。
```

建议第一轮只做读取，不做点击。

## 边界

- 这是内部控制台试点，不做真实发布
- 不接 X / 小红书 / 公众号写操作
- 后端只包装本地文件读取和 `tools.redbook_harness.cli` 的最小命令
- 当前没有鉴权；它只适合本机 localhost 使用
