# 2026-04-30 BOSS 去重与候选摘要

## 当前会话状态

- 浏览器：普通 Chrome 独立 profile
- CDP：`http://127.0.0.1:9224`
- chat 页面：`https://www.zhipin.com/web/geek/chat`
- jobs 页面：`https://www.zhipin.com/web/geek/jobs?ka=header-jobs`

## 今日刷新结果

### Chat triage

- 输出文件：`tools/auto-zhipin/data/opencli-chat-triage-latest.json`
- 来源：`cdp_chat_page`
- 生成时间：`2026-04-30T01:20:05.623Z`
- blockedEntries：`14`
- followupCandidates：`8`
- conversations：`20`

代表性 blocked 项：

- `战丽倍通数据集团招聘者` -> `big_company_ignore`
- `徐怡菲上海耀素创始人助理` -> `offsite_email`
- `陈先生潜链科技CEO` -> `offsite_email`
- `贺女士SHEIN招聘HR负责人` -> `explicit_rejection`
- `周玉OPPO高级招聘经理` -> `explicit_rejection`
- `张世哲吉利研究院云解决方案架构负责人` -> `big_company_ignore`

### Ledger 现状

- 输出文件：`tools/auto-zhipin/data/ledger.json`
- applications：`474`
- applied：`403`
- skipped：`70`
- matched：`1`
- jobs：`2270`
- conversations：`12`

## 联合创始人 tab 采集

- 输出文件：`tools/auto-zhipin/data/cdp-collect-current-jobs-latest.json`
- 生成时间：`2026-04-30T01:23:08.759Z`
- 当前 sourceUrl：`https://www.zhipin.com/web/geek/jobs?_security_check=1_1777511295781`
- totalJobs：`17`
- matchedCount：`3`
- skippedCount：`14`

当前候选：

1. `【灵光】Agent工程师-上海/杭州`
   - URL: `https://www.zhipin.com/job_detail/499669deaf608f2a0nd839m9FFpW.html`
   - 地点：`上海·浦东新区·陆家嘴`
2. `工业大模型平台技术负责人`
   - URL: `https://www.zhipin.com/job_detail/df5a3491d8f88d990nd83Nq0EFNS.html`
   - 地点：`上海·嘉定区·嘉定新城`
3. `AIGC算法（图像/视频/多模态方向）`
   - URL: `https://www.zhipin.com/job_detail/e4cec719c07ff4900nRy3di5E1NX.html`
   - 地点：`上海·长宁区·仙霞`

## 当前阻塞

- `jobs` 页 URL 带 `_security_check=1`
- 在未解除 security check 前，不应继续 live apply
- 当前职位卡抽取仍有 `company` 为空的问题，因此 apply 前必须进详情页做二次校验
