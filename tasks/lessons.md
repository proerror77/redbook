# Lessons Learned

## 记录模板
- 日期：YYYY-MM-DD
- 场景：
- 问题：
- 根因：
- 修正动作：
- 预防规则（Rule）：
- 下次触发信号：
- 验证结果：

---

## Lessons 列表

### Lesson 001
- 日期：2026-03-03
- 场景：运行每日入口 `bash tools/daily.sh`（全量）并自动追加选题到 `01-内容生产/选题管理/00-选题记录.md`
- 问题：
  1) 终端/日志长时间无输出，看起来像卡住
  2) 选题池被追加了无意义的统计字段（如 Deck 列数/推文数），且同日多次运行会重复追加
- 根因：
  1) `python ... | tee` 使 stdout 变为 pipe，Python 默认 block-buffer
  2) 选题抽取用全局 `**...**` 正则，覆盖了报告里的加粗统计标题；且缺少同日去重/插入逻辑
- 修正动作：
  1) `run_daily.sh` 改为 `PYTHONUNBUFFERED=1 python3 -u ... | tee`，保证实时输出
  2) `append_topics_to_record()` 只抽取“编号列表中的加粗 topic”，并在同日 section 内去重插入
- 预防规则（Rule）：
  1) 任何 `python ... | tee` 一律加 `-u` 或 `PYTHONUNBUFFERED=1`
  2) 从 Markdown 抽取结构化信息必须用结构化锚点/模式，禁止全局扫面式 regex
  3) 每日/定时任务必须幂等：同日重复运行不应污染数据
- 下次触发信号：脚本运行 30s+ 无输出；选题记录出现“列数/推文数/统计”字样；同一日期重复出现多段 “X 每日研究发现”
- 验证结果：`bash tools/daily.sh` 输出连续进度；2026-03-03 选题追加为 AI/code/openai/agent/rust，重复运行不会再重复追加
