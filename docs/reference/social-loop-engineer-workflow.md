# Social Loop Engineer 工作流

> 目标：把定时资讯采集、LLM/Wiki 记忆维护、带图带链接的深度内容、分层审稿和用户确认发布收敛成一个可恢复的 Loop Engineer 控制面。

## 边界

Social Loop Engineer 复用 Redbook 已有的 daily、Wiki、`/x-mastery-mentor`、`/article-visual-storyboard`、`/baoyu-image-gen`、`/baoyu-post-to-x` 和 `RedBookSkills`。它负责协调和留证，不重复实现各个平台的采集或发布器。

自动阶段可以执行：

- 定时收集 X following chronological、Hacker News、Reddit，并保存当日研究报告、timeline 样本和互动候选队列。
- 在基础采集之后调用本地 Grok Builder 做只读研究增强，补充公开网页来源、原始 URL、已核实事实、不确定性和 Wiki 落点；Grok 没有形成 `READY` 报告时，来源门保持 blocked。
- 运行 Wiki daily-cycle、LLM ingest、lint，并以 `wiki/log.md`、lint 报告和研究报告作为记忆就绪证据。
- 在用户选定主题后 query Wiki，生成 X / 小红书平台版本、来源链接、视觉分镜、图片和发布清单。
- 分别执行事实、AI 味/真人感、平台和视觉四道审稿；审稿报告必须以最后一行 `结论：PASS` 收口。

禁止自动执行：

- 发布、回复、评论、点赞、关注、删除或修改账号资料。
- 用脚本 stdout 代替平台侧成功证据。
- 在 publish 状态不确定时重试，避免重复发帖。

## 状态机

```text
collection blocked
       │ daily + Wiki ingest/lint evidence complete
       ▼
collection_ready -> prepare -> awaiting_review -> review
                                      │ 四门均 PASS
                                      ▼
                          awaiting_user_confirmation
                                      │ 用户明确“发布”/“直接发”
                                      ▼
                    published_pending_verification -> verified
```

状态文件是 `tools/auto-x/data/social-loop/state.json`，每日证据报告是 `docs/reports/social-loop-YYYY-MM-DD.md`。`status` / `next` 只读现有状态和证据；定时任务显式调用 `record-collection` 写入新的收敛状态。

## 定时入口

现有 launchd job `com.redbook.daily-x` 仍在每天 07:00 调用 `tools/daily.sh`。每日顺序是：基础多源采集 → Grok Builder 只读研究增强 → Wiki daily-cycle / ingest / lint → Social Loop 状态回读。

Grok 研究增强也可以单独运行：

```bash
tools/redbookctl social-loop grok-research --date YYYY-MM-DD
tools/redbookctl social-loop record-collection --date YYYY-MM-DD
```

Grok 报告写入 `docs/reports/grok-research-YYYY-MM-DD.md`。如果本地 Builder 未登录、headless 调用超时、返回 `Cancelled`、没有原始 URL，报告会明确标记 `BLOCKED`；如果某个来源、Wiki ingest 或 lint 缺失，状态保持 `blocked`，并记录下一步，不会把旧报告冒充成当天完成。

## 内容包合同

每个包位于 `01-内容生产/02-制作中的选题/YYYY-MM-DD-social-loop-主题/`，至少包含：

- `核心命题.md`：账号主线、目标受益人和可验证判断。
- 目标含 X 时有 `X发布版.md`；目标含小红书时有 `小红书发布版.md`；每个启用的平台版本都必须包含真实来源 URL。
- `图文分镜.md`：为每个启用的平台分别规划 X 16:9 观点卡和/或小红书 3:4 / 1080x1440 卡片，不能直接复用最终裁切。
- 每个启用的平台都有服务观点的真实图片：X 为 `assets/X-01.png`，小红书为 `assets/XHS-01.png`；不接受占位图。
- `发布清单.md`：来源、平台、图片模型、图片路径、插入位置、风险和发布门。
- `审核/事实审稿.md`、`AI味审稿.md`、`平台审稿.md`、`视觉审稿.md`。

深度与去 AI 味不是一个口号门：草稿必须落到具体场景、取舍、失败、数字、来源和下一步动作；审稿需要指出空泛套话、伪第一人称、标题党因果和无证据判断，并在必要时直接改稿。

## 用户确认与平台验证

审稿全部通过后，Loop Engineer 只把内容包标成 `awaiting_user_confirmation`，把 run id、正文、图片、来源链接和四门审稿结果报告给用户。只有用户对这个具体包明确说“发布”或“直接发”，才能调用发布 skill。

当前 X adapter 通过 `/baoyu-post-to-x` 的 `x-browser.ts` 做登录、`expected_handle`、图片、提交和状态 URL 回读，再写入 `发布记录.md` 与 `04-内容数据统计/publish-records.jsonl`。XHS 先生成待发布包并交给 `/baoyu-xhs-images` / `RedBookSkills` 的既有发布与管理页验证链；未接入统一 submit adapter 前，不能假装已经发布。

如果 submit 可能发生但没有自己的状态 URL，状态必须是 `published_pending_verification`，下一步是人工回读平台，不得直接重试。

## 命令

```bash
tools/redbookctl social-loop status --json
tools/redbookctl social-loop next
tools/redbookctl social-loop record-collection --date YYYY-MM-DD
tools/redbookctl social-loop prepare --topic "主题" --platform x
tools/redbookctl social-loop review --run-id social-YYYY-MM-DD-主题
tools/redbookctl social-loop publish --run-id social-YYYY-MM-DD-主题 --confirm 发布
```

`prepare` 和 `review` 会调用 Codex 本地 agent，但 prompt 明确禁止外部平台副作用。`publish` 没有精确确认值会直接拒绝。
