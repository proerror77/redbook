Simon Willison 这篇最值得看的，不是“vibe coding 和 agentic engineering 边界模糊”这句话本身。

而是后面的不适感：

当 coding agent 越来越可靠，你会开始不再逐行 review 它写的每一行代码。

这时候问题就变了。

以前安全感来自：

我看过每一行。

以后安全感可能来自：

- 有清楚的 spec
- 有测试
- 有文档
- 有实际使用
- 有 trace
- 有 rollback
- 出问题能定位责任边界

这其实很像你信任另一个工程团队的服务。

你不会读完他们仓库里的每一行代码才调用 API。
你会看文档、看契约、看稳定性、看事故处理。

Coding Agent 进入生产后，真正的问题不是“你有没有亲眼看过所有代码”。

而是：

你有没有建立一套足够强的验收系统，让你可以在不逐行 review 的情况下，仍然对结果负责。

这也是 agentic engineering 和 vibe coding 真正的分界线。

不是 AI 写了多少代码。
而是人有没有设计验证、责任和回滚。

源：
https://simonwillison.net/2026/May/6/vibe-coding-and-agentic-engineering/
