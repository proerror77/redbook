# QA 报告

## 事实核验

- [x] Microsoft 来源已核验：`Create your AI strategy` 强调 AI use cases 应产生可衡量业务价值，并配套数据治理和 Responsible AI。
- [x] NIST 来源已核验：AI RMF Core 的四类功能为 Govern、Map、Measure、Manage。
- [x] Google Cloud 来源已核验：Vertex AI / generative AI data governance 文档强调客户数据边界、训练限制、数据保留和安全控制。
- [x] ISO 来源已核验：ISO/IEC 42001:2023 是 AI management systems 标准，要求建立、实施、维护并持续改进 AI 管理体系。

## 账号主线检查

- [x] 文章服务账号主线：AI 在企业里如何真正落地，尤其是 agent、workflow、ROI、权限、review、审计、回滚、组织记忆和管理者判断。
- [x] 没有写成模型新闻、工具清单或标准摘要。
- [x] 有清晰核心命题：AI Ready 是管理系统问题。
- [x] 有企业读者任务：用 8 维评分和 10 个问题判断导入阶段。

## 冷读审稿

Persona：

> 我是那个把 AI / agent / workflow 翻译成企业经营判断的人。

受益人：

> 正在考虑导入 AI / Agent 的老板、业务负责人、数字化负责人，以及想把 AI 服务从工具交付升级成咨询交付的服务商。

### 最可能划走的 3 处

1. 原文：开头连续列举模型、知识库、Copilot、数字员工。
   问题：如果后面不马上给反常识判断，会像普通 AI 咨询开场。
   改法：第二屏前明确给出“第一问应该是流程能不能被 AI 接管”。

2. 原文：官方来源如果逐条解释太多。
   问题：读者会觉得像标准文档摘要。
   改法：每个来源只支撑一个管理判断，不展开标准细节。

3. 原文：8 维评分表和 10 个问题信息量大。
   问题：长文读者能接受，小红书读者会被压垮。
   改法：长文保留完整框架，小红书拆成评分卡和诊断问题两张卡。

冷读方式：独立上下文审稿。

## X Article 审稿

- [x] 使用 Markdown inline image，图片跟随对应段落。
- [x] 未使用普通 X 主帖多图 gallery 结构。
- [x] 参考来源集中放在文末，正文只保留必要来源锚点。
- [x] 结尾有可转发判断公式。
- [x] 风险：正式发布前需要确认 X Article 后台是否可用；如果只能发普通 X，应改成 thread-per-image。

## 小红书审稿

- [x] 每张卡都绑定企业读者任务。
- [x] 不做开发者工具新闻搬运。
- [x] 覆盖业务场景、判断标准、ROI/风险、流程影响和行动建议。
- [x] 适合收藏：评分表、10 个问题、三阶段路径。
- [x] 风险：卡 6 信息密度高，生成时需要保持两列清单和足够留白。

## 配图审稿

- [x] 图片职责明确：封面、框架、评分、路线图。
- [x] 图文分镜已区分 X 16:9 和小红书 3:4。
- [x] 选择 `infographic-engine` 模板，不用泛科技插画。
- [x] Prompt 约束了标题、文字预算、安全边距和禁用元素。
- [x] 实际图片已生成并人工检查：4 张 PNG 均为 1920x1080，非空白，未发现明显错字、随机小字或主体文字重叠。
- [x] 生成 API 状态已记录：Tuzi token 失效，Google image quota 用尽；本轮改用本地 HTML/CSS 信息图渲染成 PNG，保留 GPT-Image2 prompt 供后续重生。

## 发布状态

- [ ] 用户尚未明确说“发布 / 直接发”，所以不能 submit。
- [ ] 待用户确认发布后，X 需走 `tools/redbookctl x-login` + X Article / thread 载体确认。
- [ ] 小红书需走 `tools/redbookctl xhs-health` 并回读平台侧证据。
