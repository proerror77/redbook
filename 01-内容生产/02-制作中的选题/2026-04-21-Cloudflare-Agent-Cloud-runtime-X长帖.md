# Cloudflare Agent Cloud runtime X 长帖

## x-mastery-mentor 发布前审稿

- 算法层：有主帖外链，触达可能受影响；但用户明确要求主体带链接，且官方链接增强可信度，可接受。
- Hook 层：通过。前两行有明确判断：不是功能发布，而是 agent production runtime。
- 内容层：通过。Project Think / Memory / Browser Run / AI Gateway / Registrar API / OpenAI Sandbox 六段推进清楚。
- CTA 层：弱。没有强互动引导，但这条是资料密集型观点长帖，优先保证可信度。
- 结论：可发布。

## 终稿

Cloudflare 这轮不是发了几个 agent 小功能。

更准确地说，它是在补一整套 agent production runtime。

官方 Project Think：
https://blog.cloudflare.com/project-think/

过去一周，CF 基本把 agent 生态里缺的几层都补了一遍：

1. Project Think

下一代 Agents SDK。

不是单纯 tool calling，而是给长时间运行的 agent 准备 primitives：

durable execution、fibers、checkpoint、keepalive、sub-agents、persistent sessions、sandboxed code execution。

核心是：agent 不应该一断线就死。

它应该能睡眠、恢复、继续跑。

2. Agent Memory

Cloudflare 的 memory 不是简单把历史记录塞进 prompt。

它把 conversation history 和 context memory 分开。

还有 readonly / writable / searchable / loadable skills 这些不同形态。

这更像是给 agent 管上下文的存储层，而不是“省 token 技巧”。

3. Browser Run

原来的 Browser Rendering 改成 Browser Run。

定位也变了：不是帮你截网页，而是给 agent 一个浏览器。

Live View、Human in the Loop、CDP endpoint、MCP client support、session recording。

这些东西很关键。

因为 agent 真要进入真实网页，就一定会遇到登录、风控、弹窗、失败状态和人类接管。

没有可观察、可接管、可复盘的浏览器层，agent 很难进生产。

4. AI Gateway

统一模型入口和观测层。

看 token、成本、错误，做 caching、rate limiting、retry、model fallback，多 provider 接入。

这层解决的不是“模型能不能用”，而是企业真的跑起来后，怎么管成本、稳定性和供应商切换。

5. Registrar API

Cloudflare 把域名注册也 API 化、agent 化了。

Search、Check、Register。

一个 agent 可以在 editor 或 terminal 里完成：想名字、查可用、确认价格、注册域名。

这不是大功能，但它说明一个趋势：

agent 的动作边界正在从“写代码”扩展到“真正替你操作基础设施”。

6. OpenAI / Sandbox

Cloudflare 现在也成了 OpenAI Agents SDK 的 sandbox partner。

也就是说，Codex harness / OpenAI Agents SDK 这类 agent，可以跑到 Cloudflare 的 sandbox 和 Agent Cloud 上。

这件事的含义很直接：

agent 不可能永远只跑在本地电脑上。

它需要一个安全、可扩展、能长期运行、能恢复状态的远程执行环境。

所以 Leo 那条判断是对的：

这已经不是“替 agent 省 token”。

这是在把 agent 运行时栈补齐。

记忆、浏览、推理、动作、沙箱、网关、注册、human-in-the-loop。

这些以前看起来像外围插件。

现在越来越像 agent 平台的基础设施。

我觉得这也是接下来 AI 产品最重要的分水岭：

模型会不会回答，已经不是唯一问题。

真正的问题是：

你能不能让一个 agent 长时间、安全、可控、可观察地跑完真实任务。

能做到这一点，才像平台。

做不到，就还是 demo。

## 发布记录

- 状态：已发布
- 主体链接：`https://blog.cloudflare.com/project-think/`
- 状态链接：https://x.com/0xcybersmile/status/2046579124765139445
- 验证：已在个人主页顶部确认新帖出现，主帖内显示 `blog.cloudflare.com/project-think/` 链接和预览卡片
