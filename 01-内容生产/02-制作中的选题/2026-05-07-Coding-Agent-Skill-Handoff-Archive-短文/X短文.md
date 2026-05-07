# X 短文

今天 timeline 上两个信号放在一起看，很有意思。

一个是 keep-codex-fast：长任务里，Codex 不是“突然变笨”，而是上下文被不断塞满，压缩后失去原始目标，所以要 Handoff First、Archive、恢复现场。

另一个是 Addy Osmani 的 agent-skills：把资深工程师的 spec、plan、build、test、review、ship，包装成 AI coding agent 可以执行的技能。

这两件事其实都在说明同一个方向：

Coding Agent 的核心资产，正在从 prompt 迁移到 workflow。

以后真正拉开差距的，可能不是谁会写更长的提示词，而是谁能把自己的工程习惯沉淀成：

- skill
- handoff
- archive
- review gate
- rollback point
- verification loop

Prompt 是一次性的表达。
Skill 是可复用的操作系统。
Handoff 是长任务不断片的上下文胶水。
Review 是 agent 真正进入生产前的安全阀。

这也是为什么我现在越来越觉得，未来每个重度使用 Codex / Claude Code 的人，都要维护自己的 agent workbench。

不是收藏一堆 prompt。
而是持续沉淀：哪些任务怎么拆，哪些上下文必须保留，哪些输出必须验证，哪些失败必须归档。

Coding Agent 越强，人越需要工程化自己的工作方式。

源：
https://x.com/BTCqzy1/status/2052224539275428089
https://x.com/lxfater/status/2052230188830998865
