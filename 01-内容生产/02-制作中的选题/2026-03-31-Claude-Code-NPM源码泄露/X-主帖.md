Claude Code 这次最离谱的，不是一个功能 bug。

是直接把源码打进了 npm 包。

现在已经有人把代码扒出来，单独存成 repo 了：
https://github.com/instructkr/claude-code

这事对所有做 AI 工具的人都是提醒：

- 不要把 npm 当成“半公开”
- publish 前先把白名单锁死
- CLI 里只要带了 agent 编排、prompt、tool 调度，进包基本就等于公开

所以以后真正有价值的壁垒，可能也不是“源码别被看到”。

而是：

- 产品迭代速度
- 工作流设计
- 用户习惯
- 分发能力

源码会越来越难藏。
真正难抄的，是你让用户留下来的行为路径。
