const PptxGenJS = require("pptxgenjs");
const pptx = new PptxGenJS();

// ─── Theme ───────────────────────────────────────────────────────────────────
const C = {
  navy:    "1B3A6B",
  teal:    "1C7293",
  ltBlue:  "D6E8F5",
  white:   "FFFFFF",
  offWhite:"F4F7FB",
  gold:    "C9A84C",
  gray:    "5A6A7A",
  ltGray:  "E8EEF4",
  red:     "C0392B",
  green:   "1A7A4A",
  orange:  "D4680A",
};

pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 inches

// ─── Helpers ─────────────────────────────────────────────────────────────────
function darkSlide(slide) {
  slide.background = { color: C.navy };
}
function lightSlide(slide) {
  slide.background = { color: C.offWhite };
}
function addTitle(slide, text, opts = {}) {
  slide.addText(text, {
    x: 0.4, y: opts.y ?? 0.25, w: 12.5, h: 0.7,
    fontSize: opts.fs ?? 32, bold: true,
    color: opts.color ?? C.navy,
    fontFace: "Georgia",
    ...opts,
  });
}
function addSubtitle(slide, text, opts = {}) {
  slide.addText(text, {
    x: 0.4, y: opts.y ?? 1.0, w: 12.5, h: 0.4,
    fontSize: opts.fs ?? 16, color: opts.color ?? C.gray,
    fontFace: "Calibri", italic: true,
    ...opts,
  });
}
function addBody(slide, text, opts = {}) {
  slide.addText(text, {
    x: 0.4, y: opts.y ?? 1.5, w: opts.w ?? 12.5, h: opts.h ?? 5.0,
    fontSize: opts.fs ?? 14, color: opts.color ?? C.gray,
    fontFace: "Calibri", valign: "top",
    ...opts,
  });
}
function addBullets(slide, items, opts = {}) {
  const rows = items.map(t => ({ text: t, options: { bullet: { type: "bullet" }, indentLevel: 0 } }));
  slide.addText(rows, {
    x: opts.x ?? 0.4, y: opts.y ?? 1.5, w: opts.w ?? 12.5, h: opts.h ?? 5.0,
    fontSize: opts.fs ?? 14, color: opts.color ?? C.gray,
    fontFace: "Calibri", valign: "top", lineSpacingMultiple: 1.3,
    ...opts,
  });
}
function sectionDivider(slide, chNum, chTitle, subtitle) {
  darkSlide(slide);
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 2.8, w: 13.33, h: 0.08, fill: { color: C.gold } });
  slide.addText(`第${chNum}章`, {
    x: 0.6, y: 1.5, w: 12, h: 0.6,
    fontSize: 18, color: C.gold, fontFace: "Calibri", bold: true,
  });
  slide.addText(chTitle, {
    x: 0.6, y: 2.1, w: 12, h: 1.0,
    fontSize: 36, color: C.white, fontFace: "Georgia", bold: true,
  });
  slide.addText(subtitle, {
    x: 0.6, y: 3.2, w: 12, h: 0.5,
    fontSize: 16, color: C.ltBlue, fontFace: "Calibri",
  });
}
function pageNum(slide, n) {
  slide.addText(`${n} / 46`, {
    x: 12.0, y: 7.1, w: 1.2, h: 0.3,
    fontSize: 9, color: C.gray, fontFace: "Calibri", align: "right",
  });
}
function colorBox(slide, x, y, w, h, color) {
  slide.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color }, line: { color } });
}
function infoCard(slide, x, y, w, h, title, body, bgColor) {
  colorBox(slide, x, y, w, h, bgColor ?? C.ltBlue);
  slide.addText(title, {
    x: x + 0.1, y: y + 0.08, w: w - 0.2, h: 0.35,
    fontSize: 12, bold: true, color: C.navy, fontFace: "Calibri",
  });
  slide.addText(body, {
    x: x + 0.1, y: y + 0.45, w: w - 0.2, h: h - 0.55,
    fontSize: 11, color: C.gray, fontFace: "Calibri", valign: "top", wrap: true,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — Cover
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  darkSlide(s);
  colorBox(s, 0, 5.8, 13.33, 1.7, C.teal);
  s.addText("跨境收付款合规与资金池管理", {
    x: 0.6, y: 1.2, w: 12, h: 1.2,
    fontSize: 40, bold: true, color: C.white, fontFace: "Georgia",
  });
  s.addText("东南亚 · 香港 · 台湾 · 澳大利亚 · 新西兰", {
    x: 0.6, y: 2.5, w: 12, h: 0.6,
    fontSize: 22, color: C.gold, fontFace: "Calibri",
  });
  s.addText("Cross-Border Payments & Cash Pooling — Internal Training", {
    x: 0.6, y: 3.2, w: 12, h: 0.5,
    fontSize: 16, color: C.ltBlue, fontFace: "Calibri", italic: true,
  });
  s.addText("适用对象：跨境业务专员 · 产品经理", {
    x: 0.6, y: 6.0, w: 8, h: 0.4,
    fontSize: 13, color: C.white, fontFace: "Calibri",
  });
  s.addText("2026 年 3 月", {
    x: 0.6, y: 6.5, w: 4, h: 0.35,
    fontSize: 12, color: C.ltBlue, fontFace: "Calibri",
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — Table of Contents
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  lightSlide(s);
  addTitle(s, "目录", { color: C.navy });
  pageNum(s, 2);
  const chapters = [
    ["第一章", "区域宏观概览", "Slides 3–7", C.navy],
    ["第二章", "10 个市场监管地图", "Slides 8–19", C.teal],
    ["第三章", "重点市场深度解析", "Slides 20–27", C.navy],
    ["第四章", "跨境资金池产品对比", "Slides 28–37", C.teal],
    ["第五章", "中资企业出海案例", "Slides 38–44", C.navy],
  ];
  chapters.forEach(([num, title, range, color], i) => {
    const y = 1.3 + i * 1.0;
    colorBox(s, 0.4, y, 0.08, 0.7, color);
    s.addText(num, { x: 0.6, y: y + 0.05, w: 1.5, h: 0.3, fontSize: 12, bold: true, color, fontFace: "Calibri" });
    s.addText(title, { x: 0.6, y: y + 0.32, w: 8, h: 0.35, fontSize: 18, bold: true, color: C.navy, fontFace: "Georgia" });
    s.addText(range, { x: 10.5, y: y + 0.32, w: 2.5, h: 0.35, fontSize: 12, color: C.gray, fontFace: "Calibri", align: "right" });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER 1 DIVIDER — Slide 3
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  sectionDivider(s, "一", "区域宏观概览", "为什么东南亚、香港、台湾、澳新是中资企业出海的核心战场？");
  pageNum(s, 3);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — Why These Markets?
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  lightSlide(s);
  addTitle(s, "中资企业出海：为什么是这些市场？");
  pageNum(s, 4);
  const cards = [
    ["东南亚 6 国", "总人口 6.8 亿，GDP 合计超 3.8 万亿美元。中国是最大贸易伙伴，RCEP 框架下关税持续降低，制造业转移和数字经济高速增长。"],
    ["香港", "全球最重要的离岸人民币中心，日均人民币外汇交易量超 1,500 亿元。中资企业出海的资金中转枢纽，OTC 衍生品和跨境融资首选地。"],
    ["台湾", "半导体供应链核心节点，OBU 离岸银行体系成熟，新台币管制下仍有灵活的跨境资金操作空间。"],
    ["澳大利亚 & 新西兰", "中澳贸易额超 2,000 亿澳元，矿产、农业、教育、房地产是主要领域。NPP 即时支付基础设施全球领先，合规要求严格但透明。"],
  ];
  cards.forEach(([title, body], i) => {
    const x = i < 2 ? 0.4 : 0.4;
    const col = i % 2 === 0 ? 0.4 : 6.8;
    const row = i < 2 ? 1.3 : 4.0;
    infoCard(s, col, row, 6.1, 2.4, title, body, i % 2 === 0 ? C.ltBlue : C.ltGray);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — 10-Market Overview Map (text-based)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  lightSlide(s);
  addTitle(s, "10 个市场概览");
  pageNum(s, 5);
  const markets = [
    ["新加坡", "自由港，无外汇管制，MAS 监管，资金池首选枢纽"],
    ["香港", "联系汇率，离岸人民币中心，HKMA 监管，高度自由"],
    ["台湾", "新台币管制，OBU 体系，FSC+CBC 双监管"],
    ["澳大利亚", "AUSTRAC 监管，AML/CTF 严格，NPP 即时支付"],
    ["新西兰", "FMA 监管，与澳洲高度互通，Trans-Tasman 协议"],
    ["马来西亚", "BNM 外汇管制，林吉特不可离岸交割"],
    ["泰国", "BOT 管制，泰铢管控，FCD 账户规则"],
    ["印度尼西亚", "BI+OJK 双监管，卢比本地化，GWM 准备金"],
    ["越南", "SBV 严格管制，越盾不可自由兑换，FIE 账户"],
    ["菲律宾", "BSP 监管，比索管制，USD 1 万申报门槛"],
  ];
  markets.forEach(([name, desc], i) => {
    const col = i < 5 ? 0.4 : 6.8;
    const row = 1.2 + (i % 5) * 1.1;
    colorBox(s, col, row, 0.06, 0.7, i < 5 ? C.navy : C.teal);
    s.addText(name, { x: col + 0.15, y: row + 0.05, w: 2.0, h: 0.3, fontSize: 13, bold: true, color: C.navy, fontFace: "Calibri" });
    s.addText(desc, { x: col + 0.15, y: row + 0.35, w: 5.8, h: 0.35, fontSize: 11, color: C.gray, fontFace: "Calibri" });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — Core Challenges
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  lightSlide(s);
  addTitle(s, "跨境资金管理的核心挑战");
  pageNum(s, 6);
  const challenges = [
    ["01", "外汇管制差异大", "10 个市场从完全自由（新加坡）到严格管制（越南）跨度极大，同一套方案无法通用。"],
    ["02", "合规成本高", "AML/CTF、FATF 要求、本地申报义务叠加，单笔跨境付款的合规审查成本持续上升。"],
    ["03", "资金分散，流动性低", "多国子公司各自持有本地货币余额，集团层面无法有效调配，资金利用率低。"],
    ["04", "技术对接复杂", "各国支付系统（NPP、PayNow、PromptPay、FAST）标准不统一，API 对接工作量大。"],
    ["05", "开户周期长", "部分市场（印尼、越南）外资企业开户需 3–6 个月，严重影响业务落地速度。"],
    ["06", "汇率风险", "多币种敞口管理难度高，缺乏统一的 FX 对冲平台导致汇兑损失。"],
  ];
  challenges.forEach(([num, title, body], i) => {
    const col = i < 3 ? 0.4 : 6.8;
    const row = 1.2 + (i % 3) * 1.9;
    colorBox(s, col, row, 5.9, 1.7, i % 2 === 0 ? C.ltBlue : C.ltGray);
    s.addText(num, { x: col + 0.15, y: row + 0.1, w: 0.6, h: 0.5, fontSize: 22, bold: true, color: C.teal, fontFace: "Georgia" });
    s.addText(title, { x: col + 0.8, y: row + 0.1, w: 4.8, h: 0.4, fontSize: 13, bold: true, color: C.navy, fontFace: "Calibri" });
    s.addText(body, { x: col + 0.15, y: row + 0.6, w: 5.5, h: 0.9, fontSize: 11, color: C.gray, fontFace: "Calibri", wrap: true });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — Training Objectives
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  lightSlide(s);
  addTitle(s, "本次培训学习目标");
  pageNum(s, 7);
  addBullets(s, [
    "掌握 10 个市场的外汇管制等级和核心合规要求",
    "了解各市场跨境收付款的主要限制和申报门槛",
    "熟悉 HSBC、渣打、花旗、摩根大通、ANZ 的跨境资金池产品特点",
    "了解 ANZ Transactive Global 和 NPP 的核心功能与适用场景",
    "通过 4 个真实案例，掌握中资企业出海资金池落地的关键路径",
    "能够为客户提供差异化的跨境资金管理方案建议",
  ], { y: 1.5, fs: 16, h: 4.5 });
  colorBox(s, 0.4, 6.3, 12.5, 0.08, C.gold);
  s.addText("培训时长约 1.5–2 小时，含 Q&A 环节", {
    x: 0.4, y: 6.5, w: 12.5, h: 0.35,
    fontSize: 12, color: C.gray, fontFace: "Calibri", italic: true,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER 2 DIVIDER — Slide 8
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  sectionDivider(s, "二", "10 个市场监管地图", "外汇管制等级 · 收付款限制 · 申报门槛 · 资金池可行性");
  pageNum(s, 8);
}

// ─── Helper: market slide ─────────────────────────────────────────────────────
function marketSlide(num, country, regulator, fxLevel, fxColor, bullets, notes) {
  const s = pptx.addSlide();
  lightSlide(s);
  // Header bar
  colorBox(s, 0, 0, 13.33, 1.1, C.navy);
  s.addText(country, { x: 0.4, y: 0.15, w: 7, h: 0.7, fontSize: 28, bold: true, color: C.white, fontFace: "Georgia" });
  s.addText(regulator, { x: 0.4, y: 0.72, w: 7, h: 0.3, fontSize: 12, color: C.ltBlue, fontFace: "Calibri" });
  // FX level badge
  colorBox(s, 10.5, 0.15, 2.5, 0.7, fxColor);
  s.addText(fxLevel, { x: 10.5, y: 0.15, w: 2.5, h: 0.7, fontSize: 14, bold: true, color: C.white, fontFace: "Calibri", align: "center", valign: "middle" });
  // Bullets
  const rows = bullets.map(t => ({ text: t, options: { bullet: { type: "bullet" }, indentLevel: 0 } }));
  s.addText(rows, {
    x: 0.4, y: 1.25, w: 8.5, h: 5.5,
    fontSize: 13, color: C.gray, fontFace: "Calibri", valign: "top", lineSpacingMultiple: 1.35,
  });
  // Notes box
  colorBox(s, 9.2, 1.25, 3.9, 5.5, C.ltBlue);
  s.addText("实操要点", { x: 9.3, y: 1.35, w: 3.7, h: 0.35, fontSize: 12, bold: true, color: C.navy, fontFace: "Calibri" });
  s.addText(notes, { x: 9.3, y: 1.75, w: 3.7, h: 4.8, fontSize: 11, color: C.gray, fontFace: "Calibri", valign: "top", wrap: true });
  pageNum(s, num);
}

// SLIDE 9 — Singapore
marketSlide(9, "新加坡", "监管机构：MAS（金融管理局）", "外汇管制：自由", C.green, [
  "无外汇管制，资金可自由进出，无需申报",
  "支付服务法（PSA 2019，2024 年修订）规范支付机构",
  "FAST（即时转账）、PayNow（实名支付）、SWIFT GPI",
  "跨境实时支付：已与泰国 PromptPay、马来西亚 DuitNow 互联",
  "AML/CTF 要求严格，单笔 S$5,000 以上需 CDD",
  "无资本管制，跨境资金池可完全自由运作",
  "企业开户：外资企业通常 2–4 周可完成",
  "新加坡是中资企业亚太区资金池的首选枢纽",
], "✅ 资金池可行性：高\n\n推荐结构：以新加坡为区域资金池中心，归集东南亚各子公司余额\n\n注意：需符合 MAS AML 要求，大额交易需留存交易目的文件");

// SLIDE 10 — Hong Kong
marketSlide(10, "香港", "监管机构：HKMA（香港金融管理局）", "外汇管制：自由", C.green, [
  "港元联系汇率制度（与美元挂钩，7.75–7.85），稳定性高",
  "无外汇管制，资金自由进出",
  "全球最大离岸人民币（CNH）中心，日均交易量超 1,500 亿元",
  "CHATS（即时支付）、FPS（转数快）、SWIFT",
  "跨境人民币业务：CIPS 直接参与行，人民币 RTGS",
  "内地-香港跨境资金池：受 SAFE 和 HKMA 双重监管",
  "企业开户：外资企业通常 4–8 周（KYC 要求较严）",
  "FATF 高风险国家客户需强化尽调（EDD）",
], "✅ 资金池可行性：高\n\n特色：离岸人民币结算首选地，内地企业可通过香港子公司做跨境人民币资金池\n\n注意：开户 KYC 趋严，需准备完整的 UBO 文件和业务证明");

// SLIDE 11 — Taiwan
marketSlide(11, "台湾", "监管机构：FSC（金融监督管理委员会）+ CBC（中央银行）", "外汇管制：半管制", C.orange, [
  "新台币（TWD）受管制，不可自由离岸交割",
  "居民企业：年度汇出上限 5,000 万美元（超额需 CBC 核准）",
  "非居民企业：通过 OBU（离岸银行单位）操作，不受上限限制",
  "OBU 账户：可持有多币种，不受外汇管制，是跨境操作核心工具",
  "跨境汇款：需提供交易证明文件（合同、发票等）",
  "SWIFT、本地 ACH（CIFS）",
  "企业开户：OBU 账户通常 2–4 周",
  "台湾是半导体供应链核心，中资企业需注意投资审查限制",
], "⚠️ 资金池可行性：中等\n\n推荐：通过 OBU 账户操作跨境资金，规避新台币管制\n\n注意：中资背景企业在台投资受《两岸人民关系条例》限制，需法律意见");

// SLIDE 12 — Australia
marketSlide(12, "澳大利亚", "监管机构：AUSTRAC（反洗钱监管机构）+ APRA（审慎监管）", "外汇管制：自由", C.green, [
  "无外汇管制，资金自由进出",
  "AML/CTF 法规严格：单笔 AUD 10,000 以上现金交易须申报（TTR）",
  "国际电汇：AUD 10,000 以上须提交国际资金转移指令报告（IFTI）",
  "NPP（新支付平台）：PayID + Osko，7×24 即时到账",
  "2024 年 7 月：ANZ 成为首家通过 NPP 结算跨境交易的主要银行",
  "SWIFT GPI、BECS（批量电子清算）",
  "企业开户：外资企业通常 2–4 周，需 ASIC 注册证明",
  "中澳贸易：矿产、农业、教育为主要领域",
], "✅ 资金池可行性：高\n\n推荐：利用 ANZ NPP 实现澳洲本地即时收付，配合 Transactive Global 做跨境资金管理\n\n注意：AUSTRAC 合规要求高，需建立完善的 AML 程序");

// SLIDE 13 — New Zealand
marketSlide(13, "新西兰", "监管机构：FMA（金融市场管理局）+ RBNZ（储备银行）", "外汇管制：自由", C.green, [
  "无外汇管制，资金自由进出",
  "AML/CFT 法规：与澳洲高度对齐，单笔 NZD 10,000 以上需申报",
  "Trans-Tasman 协议：澳新两国金融监管高度互通",
  "支付系统：SWIFT、本地 EFTPOS、即时支付（正在升级中）",
  "企业开户：外资企业通常 2–3 周",
  "中新贸易：农业、乳制品、旅游为主",
  "ANZ 在新西兰市场份额最大，是中资企业首选合作银行",
  "新西兰与澳洲可纳入同一区域资金池架构",
], "✅ 资金池可行性：高\n\n推荐：澳新合并为一个区域资金池，通过 ANZ Transactive Global 统一管理\n\n注意：新西兰 AML 执法趋严，2024 年起加强对高风险客户审查");

// SLIDE 14 — Malaysia
marketSlide(14, "马来西亚", "监管机构：BNM（国家银行）", "外汇管制：半管制", C.orange, [
  "林吉特（MYR）不可离岸交割（NDF 市场），是最重要的限制",
  "外汇政策（FEP）：居民企业年度对外投资上限 5,000 万林吉特",
  "非居民企业：可持有外币账户，跨境汇款需提供交易文件",
  "出口收入：须在 6 个月内汇回并兑换为林吉特（部分豁免）",
  "跨境资金池：需 BNM 特别批准，审批周期 3–6 个月",
  "支付系统：DuitNow（即时支付）、RENTAS（RTGS）、IBG",
  "DuitNow 已与新加坡 PayNow 实现跨境互联",
  "企业开户：外资企业通常 4–8 周",
], "⚠️ 资金池可行性：受限\n\n关键限制：林吉特不可离岸交割，资金池只能在境内运作\n\n推荐：在马来西亚设立本地资金池，通过外币账户与区域池对接\n\n注意：需提前申请 BNM 豁免，建议委托本地律所协助");

// SLIDE 15 — Thailand
marketSlide(15, "泰国", "监管机构：BOT（泰国银行）", "外汇管制：半管制", C.orange, [
  "泰铢（THB）受管制，大额跨境汇款需提供证明文件",
  "外汇管制：单笔超 USD 50,000 需提交外汇交易表格（FET）",
  "FCD 账户（外币存款账户）：企业可持有，但有使用限制",
  "资金汇出：需证明与贸易/投资相关，不得无故汇出",
  "跨境资金池：BOT 允许在特定条件下设立，需申请",
  "PromptPay：即时支付系统，已与新加坡 PayNow 互联",
  "BAHTNET（RTGS）、SWIFT",
  "企业开户：外资企业通常 4–8 周，需 BOI 或 DBD 注册证明",
], "⚠️ 资金池可行性：中等\n\n推荐：申请 BOT 跨境资金池许可，以新加坡为枢纽\n\n注意：每笔超 5 万美元的汇款需留存完整的交易证明文件，建议建立标准化文件管理流程");

// SLIDE 16 — Indonesia
marketSlide(16, "印度尼西亚", "监管机构：BI（印尼银行）+ OJK（金融服务管理局）", "外汇管制：严格", C.red, [
  "卢比（IDR）本地化要求：境内交易必须使用卢比结算",
  "外汇管制法（2024 年 12 月新规）：加强外汇流量管理",
  "GWM（法定准备金）：银行须按比例持有卢比准备金",
  "出口收入：须在规定期限内汇回（资源类出口要求更严）",
  "跨境汇款：超 USD 25,000 需提供底层交易文件",
  "跨境资金池：受严格限制，需 BI 特别批准",
  "BIFAST（即时支付）、BI-RTGS",
  "企业开户：外资企业通常 3–6 个月，是东南亚最慢的市场之一",
], "🔴 资金池可行性：受严格限制\n\n关键挑战：卢比本地化 + 开户周期长 + 外汇管制新规\n\n推荐：优先完成本地合规，再考虑与区域池对接\n\n注意：2024 年新外汇法规定，违规汇款可被没收，务必严格合规");

// SLIDE 17 — Vietnam
marketSlide(17, "越南", "监管机构：SBV（越南国家银行）", "外汇管制：严格", C.red, [
  "越盾（VND）不可自由兑换，严格管制",
  "FIE 账户（外商投资企业账户）：分为资本账户和经常账户",
  "资本账户：用于注册资本汇入/汇出，需 SBV 登记",
  "经常账户：用于日常经营收付，汇出需提供合同/发票",
  "跨境汇款：USD 1,000 以上须向 SBV 报告（2024 年新规）",
  "离岸贷款：中长期需向 SBV 登记，短期延期超 1 年也需登记",
  "跨境资金池：实际操作极为困难，几乎不可行",
  "企业开户：外资企业通常 2–4 个月",
], "🔴 资金池可行性：极受限\n\n关键限制：越盾不可自由兑换，资金汇出需逐笔提供证明\n\n推荐：在越南设立独立本地账户，通过外币账户（USD/EUR）与区域池对接\n\n注意：越南合规要求持续收紧，建议配备本地合规团队");

// SLIDE 18 — Philippines
marketSlide(18, "菲律宾", "监管机构：BSP（菲律宾中央银行）", "外汇管制：半管制", C.orange, [
  "比索（PHP）受管制，大额跨境汇款需申报",
  "外汇申报：携带超 USD 10,000 出入境须申报",
  "企业汇款：超 USD 50,000 需 BSP 事先通知",
  "对外投资：超 USD 6,000 万需 BSP 事先批准",
  "ITRS（国际交易报告系统）：银行须报告所有跨境交易",
  "InstaPay（即时支付）、PESONet（批量清算）、SWIFT",
  "跨境资金池：可行，但需满足 BSP 文件要求",
  "企业开户：外资企业通常 4–8 周",
], "⚠️ 资金池可行性：中等\n\n推荐：通过菲律宾本地银行账户操作，配合新加坡区域池\n\n注意：BSP 2024 年更新 FX 报告指引，需确保 ITRS 报告合规");

// SLIDE 19 — 10-Market Comparison Table
{
  const s = pptx.addSlide();
  lightSlide(s);
  addTitle(s, "10 个市场横向对比", { fs: 26 });
  pageNum(s, 19);
  const rows = [
    [
      { text: "市场", options: { bold: true, color: C.white, fill: C.navy } },
      { text: "外汇管制", options: { bold: true, color: C.white, fill: C.navy } },
      { text: "主要货币", options: { bold: true, color: C.white, fill: C.navy } },
      { text: "申报门槛", options: { bold: true, color: C.white, fill: C.navy } },
      { text: "资金池可行性", options: { bold: true, color: C.white, fill: C.navy } },
      { text: "推荐银行", options: { bold: true, color: C.white, fill: C.navy } },
    ],
    [{ text: "新加坡" }, { text: "自由" }, { text: "SGD/USD" }, { text: "无" }, { text: "高" }, { text: "HSBC/渣打/花旗" }],
    [{ text: "香港" }, { text: "自由" }, { text: "HKD/CNH" }, { text: "无" }, { text: "高" }, { text: "HSBC/渣打" }],
    [{ text: "台湾" }, { text: "半管制" }, { text: "TWD/USD" }, { text: "USD 5,000万/年" }, { text: "中（OBU）" }, { text: "渣打/花旗" }],
    [{ text: "澳大利亚" }, { text: "自由" }, { text: "AUD" }, { text: "AUD 10,000" }, { text: "高" }, { text: "ANZ/HSBC" }],
    [{ text: "新西兰" }, { text: "自由" }, { text: "NZD" }, { text: "NZD 10,000" }, { text: "高" }, { text: "ANZ" }],
    [{ text: "马来西亚" }, { text: "半管制" }, { text: "MYR（不可离岸）" }, { text: "MYR 5,000万/年" }, { text: "受限" }, { text: "HSBC/渣打" }],
    [{ text: "泰国" }, { text: "半管制" }, { text: "THB" }, { text: "USD 50,000" }, { text: "中" }, { text: "渣打/花旗" }],
    [{ text: "印度尼西亚" }, { text: "严格" }, { text: "IDR（本地化）" }, { text: "USD 25,000" }, { text: "极受限" }, { text: "HSBC/渣打" }],
    [{ text: "越南" }, { text: "严格" }, { text: "VND（不可兑换）" }, { text: "USD 1,000" }, { text: "极受限" }, { text: "渣打/ANZ" }],
    [{ text: "菲律宾" }, { text: "半管制" }, { text: "PHP" }, { text: "USD 10,000" }, { text: "中" }, { text: "花旗/渣打" }],
  ];
  s.addTable(rows, {
    x: 0.3, y: 1.0, w: 12.7, h: 6.0,
    fontSize: 10, fontFace: "Calibri",
    border: { type: "solid", color: C.ltGray, pt: 0.5 },
    rowH: 0.52,
    colW: [1.5, 1.5, 1.8, 1.8, 1.8, 2.3],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER 3 DIVIDER — Slide 20
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  sectionDivider(s, "三", "重点市场深度解析", "新加坡 · 香港 · 澳大利亚 · 印度尼西亚 · 马来西亚 · 越南 · 台湾 · 实操 Q&A");
  pageNum(s, 20);
}

// SLIDE 21 — Singapore Deep Dive
{
  const s = pptx.addSlide();
  lightSlide(s);
  colorBox(s, 0, 0, 13.33, 1.0, C.navy);
  s.addText("新加坡：中资企业出海的首选枢纽", { x: 0.4, y: 0.15, w: 12, h: 0.7, fontSize: 26, bold: true, color: C.white, fontFace: "Georgia" });
  pageNum(s, 21);
  infoCard(s, 0.4, 1.1, 5.9, 2.5, "为什么选新加坡？",
    "• 全球营商环境排名前三\n• 企业税率 17%，有效税率更低\n• 无资本利得税、无股息预扣税\n• 与 90+ 国家签订双边税收协定\n• 亚太区总部首选，超 4,000 家跨国公司设立区域总部", C.ltBlue);
  infoCard(s, 6.5, 1.1, 6.5, 2.5, "资金池架构建议",
    "• 在新加坡设立区域财资中心（RTC）\n• 申请 MAS 财资中心激励计划（税率可降至 8%）\n• 以新加坡为主池，归集东南亚各子公司余额\n• 推荐银行：HSBC、渣打、花旗（均有完整亚太池方案）", C.ltGray);
  infoCard(s, 0.4, 3.8, 5.9, 2.8, "支付基础设施",
    "• FAST：7×24 即时转账，上限 SGD 200,000\n• PayNow：实名即时支付（手机号/NRIC/UEN）\n• SWIFT GPI：跨境汇款追踪\n• 跨境互联：泰国 PromptPay、马来西亚 DuitNow、印度 UPI", C.ltBlue);
  infoCard(s, 6.5, 3.8, 6.5, 2.8, "合规要点",
    "• PSA 2019（2024 修订）：支付机构须持牌\n• AML/CTF：单笔 SGD 5,000+ 需 CDD\n• 制裁筛查：OFAC、UN、MAS 制裁名单\n• 实益所有人（UBO）：须申报至 ACRA\n• 建议：建立标准化 KYC 文件包", C.ltGray);
}

// SLIDE 22 — Hong Kong Deep Dive
{
  const s = pptx.addSlide();
  lightSlide(s);
  colorBox(s, 0, 0, 13.33, 1.0, C.navy);
  s.addText("香港：离岸人民币中心与跨境资金通道", { x: 0.4, y: 0.15, w: 12, h: 0.7, fontSize: 26, bold: true, color: C.white, fontFace: "Georgia" });
  pageNum(s, 22);
  infoCard(s, 0.4, 1.1, 6.1, 2.8, "离岸人民币（CNH）优势",
    "• 全球最大 CNH 中心，日均交易量超 1,500 亿元\n• CNH 与 CNY 汇率独立，可对冲人民币风险\n• 人民币 RTGS：实时大额人民币结算\n• CIPS 直接参与行：可直接接入内地支付系统\n• 点心债、人民币贷款市场成熟", C.ltBlue);
  infoCard(s, 6.7, 1.1, 6.3, 2.8, "内地-香港跨境资金池",
    "• 跨境双向人民币资金池：SAFE 批准，上限按净资产比例\n• 跨境资金池利率：参考 LPR，需在 SAFE 登记\n• 香港子公司可作为内地集团的离岸资金池中心\n• 推荐银行：HSBC（最强 CNH 能力）、渣打", C.ltGray);
  infoCard(s, 0.4, 4.1, 6.1, 2.6, "开户注意事项",
    "• KYC 趋严：需提供完整 UBO 链条文件\n• 高风险行业（加密、博彩）开户极难\n• 建议提前准备：公司章程、股权结构图、业务证明\n• 开户周期：4–8 周，部分银行更长", C.ltBlue);
  infoCard(s, 6.7, 4.1, 6.3, 2.6, "FPS 转数快",
    "• 7×24 即时支付，支持港元和人民币\n• 可通过手机号、邮箱、FPS ID 收款\n• 跨境：香港-内地实时人民币转账（部分银行已开通）\n• 企业收款：可申请企业 FPS ID，提升收款效率", C.ltGray);
}

// SLIDE 23 — Australia Deep Dive
{
  const s = pptx.addSlide();
  lightSlide(s);
  colorBox(s, 0, 0, 13.33, 1.0, C.navy);
  s.addText("澳大利亚：AUSTRAC 合规与 NPP 即时支付", { x: 0.4, y: 0.15, w: 12, h: 0.7, fontSize: 26, bold: true, color: C.white, fontFace: "Georgia" });
  pageNum(s, 23);
  infoCard(s, 0.4, 1.1, 6.1, 2.8, "AUSTRAC 合规要点",
    "• 现金交易报告（TTR）：AUD 10,000+ 现金须申报\n• 国际资金转移指令（IFTI）：AUD 10,000+ 跨境汇款须报告\n• AML/CTF 计划：所有汇报实体须制定并执行\n• 制裁筛查：DFAT 制裁名单\n• 违规处罚：最高数亿澳元罚款（2024 年 Star Entertainment 案）", C.ltBlue);
  infoCard(s, 6.7, 1.1, 6.3, 2.8, "NPP 新支付平台",
    "• 2018 年上线，澳洲最先进支付基础设施\n• PayID：用手机号/邮箱/ABN 收款，无需账号\n• Osko：即时到账（通常 < 60 秒），7×24\n• 2024 年 7 月：ANZ 首家通过 NPP 结算跨境交易\n• 跨境 NPP：入境 AUD 500 以内可近实时到账", C.ltGray);
  infoCard(s, 0.4, 4.1, 6.1, 2.6, "中澳贸易实操",
    "• 主要领域：铁矿石、煤炭、天然气、农产品、教育\n• 结算货币：主要为 AUD 和 USD\n• 汇款文件：合同、发票、提单（银行可能要求）\n• 税务：预扣税 10%（股息），利息/特许权使用费需查税协定", C.ltBlue);
  infoCard(s, 6.7, 4.1, 6.3, 2.6, "常见踩坑",
    "• 低估 AUSTRAC 合规成本：需专职合规人员\n• 忽视 IFTI 报告：每笔跨境汇款都需报告\n• 开户材料不全：需 ASIC 注册证明 + 董事护照\n• 汇率风险：AUD 波动大，建议使用远期合约对冲", C.ltGray);
}

// SLIDE 24 — Indonesia Deep Dive
{
  const s = pptx.addSlide();
  lightSlide(s);
  colorBox(s, 0, 0, 13.33, 1.0, C.red);
  s.addText("印度尼西亚：最大但最复杂的东南亚市场", { x: 0.4, y: 0.15, w: 12, h: 0.7, fontSize: 26, bold: true, color: C.white, fontFace: "Georgia" });
  pageNum(s, 24);
  infoCard(s, 0.4, 1.1, 6.1, 2.8, "核心挑战",
    "• 卢比本地化：境内所有交易必须用 IDR 结算\n• 2024 年 12 月新外汇法：加强外汇流量管控\n• GWM 准备金：银行须持有 IDR 准备金，影响流动性\n• 出口收入：资源类出口须在 3 个月内汇回\n• 开户周期：3–6 个月，是东南亚最慢的市场", C.ltBlue);
  infoCard(s, 6.7, 1.1, 6.3, 2.8, "合规路径",
    "• 设立 PT PMA（外商投资有限公司）\n• 在 OJK 注册，获取营业执照（NIB）\n• 开立 IDR 账户 + 外币账户（USD/EUR）\n• 外汇交易：须通过 BI 授权银行，提供底层文件\n• 跨境汇款：超 USD 25,000 需提交 ULN 报告", C.ltGray);
  infoCard(s, 0.4, 4.1, 6.1, 2.6, "资金池建议",
  "• 短期：在印尼设立独立本地账户，不纳入区域池\n• 中期：通过外币账户（USD）与新加坡区域池对接\n• 长期：申请 BI 跨境资金池特别许可（需 1–2 年）\n• 推荐银行：HSBC、渣打（本地合规能力强）", C.ltBlue);
  infoCard(s, 6.7, 4.1, 6.3, 2.6, "实操建议",
    "• 提前 6 个月启动开户流程\n• 聘请本地法律顾问协助 OJK 注册\n• 建立完整的外汇交易文件档案\n• 关注 BI 新规动态（2024–2025 年变化频繁）", C.ltGray);
}

// SLIDE 25 — Malaysia Deep Dive
{
  const s = pptx.addSlide();
  lightSlide(s);
  colorBox(s, 0, 0, 13.33, 1.0, C.orange);
  s.addText("马来西亚：林吉特管制下的资金运作", { x: 0.4, y: 0.15, w: 12, h: 0.7, fontSize: 26, bold: true, color: C.white, fontFace: "Georgia" });
  pageNum(s, 25);
  addBullets(s, [
    "林吉特（MYR）不可离岸交割：这是最核心的限制，所有 MYR 交易必须在马来西亚境内完成",
    "外汇政策（FEP）：居民企业年度对外投资上限 5,000 万林吉特，超额需 BNM 核准",
    "出口收入：须在 6 个月内汇回（部分行业有豁免，如制造业出口商）",
    "跨境资金池：需向 BNM 申请特别豁免，审批周期 3–6 个月，成功率取决于企业规模和业务性质",
    "DuitNow 跨境：已与新加坡 PayNow 实现互联，支持 SGD/MYR 即时转账（上限 MYR 5,000）",
    "推荐架构：马来西亚本地资金池（MYR）+ 外币账户（USD/SGD）与新加坡区域池对接",
    "BNM 豁免申请：需提供集团架构图、资金流向说明、预期资金规模，建议委托本地律所协助",
  ], { y: 1.2, fs: 13, h: 5.5 });
  pageNum(s, 25);
}

// SLIDE 26 — Vietnam Deep Dive
{
  const s = pptx.addSlide();
  lightSlide(s);
  colorBox(s, 0, 0, 13.33, 1.0, C.red);
  s.addText("越南：FIE 账户与资金汇出合规路径", { x: 0.4, y: 0.15, w: 12, h: 0.7, fontSize: 26, bold: true, color: C.white, fontFace: "Georgia" });
  pageNum(s, 26);
  infoCard(s, 0.4, 1.1, 6.1, 2.8, "FIE 账户体系",
    "• FDI 资本账户：用于注册资本汇入/汇出，须在 SBV 登记\n• 经常账户（VND）：日常经营收付，汇出需提供合同/发票\n• 经常账户（外币）：可持有 USD/EUR，用于跨境收付\n• 账户开立：需营业执照 + 投资证书 + SBV 登记证明", C.ltBlue);
  infoCard(s, 6.7, 1.1, 6.3, 2.8, "资金汇出路径",
    "• 利润汇出：年度审计完成后，凭审计报告汇出\n• 股息汇出：需完税证明 + 审计报告\n• 服务费汇出：需合同 + 发票 + 完税证明\n• 贷款还款：需 SBV 登记的贷款合同\n• 所有汇出：USD 1,000+ 须向 SBV 报告（2024 新规）", C.ltGray);
  infoCard(s, 0.4, 4.1, 6.1, 2.6, "实操建议",
    "• 建立完整的交易文件档案（合同、发票、完税证明）\n• 提前规划利润汇出时间（年度审计后才能汇出）\n• 考虑通过香港子公司作为中间层，简化资金流转\n• 推荐银行：渣打、ANZ（越南本地合规能力强）", C.ltBlue);
  infoCard(s, 6.7, 4.1, 6.3, 2.6, "2024 年新规要点",
    "• Decree 52：加强对支付服务提供商的监管\n• 跨境报告门槛降至 USD 1,000\n• 离岸贷款：中长期须向 SBV 登记\n• 短期贷款延期超 1 年也需登记\n• 建议：定期关注 SBV 政策更新", C.ltGray);
}

// SLIDE 27 — Taiwan Deep Dive
{
  const s = pptx.addSlide();
  lightSlide(s);
  colorBox(s, 0, 0, 13.33, 1.0, C.teal);
  s.addText("台湾：OBU 账户与新台币管制下的跨境操作", { x: 0.4, y: 0.15, w: 12, h: 0.7, fontSize: 26, bold: true, color: C.white, fontFace: "Georgia" });
  pageNum(s, 27);
  addBullets(s, [
    "OBU（离岸银行单位）：台湾最重要的跨境资金工具，不受外汇管制，可持有多币种",
    "OBU 账户特点：免税（利息所得免税）、无外汇限制、可与境外账户自由转账",
    "新台币管制：居民企业年度汇出上限 5,000 万美元，超额需 CBC 核准",
    "非居民企业：通过 OBU 操作，不受新台币汇出限制",
    "跨境汇款：需提供交易证明文件（合同、发票），银行会进行 AML 审查",
    "台湾 RMB 业务：台湾是重要的离岸人民币中心，CBC 公布月度 RMB 业务数据",
    "中资背景注意：《两岸人民关系条例》对中资在台投资有限制，需法律意见",
    "推荐银行：渣打台湾、花旗台湾（OBU 业务经验丰富）",
  ], { y: 1.2, fs: 13, h: 5.5 });
}

// SLIDE 28 — Q&A Summary
{
  const s = pptx.addSlide();
  lightSlide(s);
  addTitle(s, "实操 Q&A：银行专员最常遇到的问题");
  pageNum(s, 28);
  const qas = [
    ["Q1", "客户问：我在新加坡和马来西亚都有子公司，能建一个统一的资金池吗？",
     "A：可以，但马来西亚部分需要 BNM 豁免。建议以新加坡为主池，马来西亚通过外币账户（USD）对接，MYR 余额留在本地。"],
    ["Q2", "客户问：越南子公司的利润怎么汇回中国？",
     "A：需完成年度审计，凭审计报告和完税证明，通过 FDI 资本账户汇出。建议提前 3 个月规划，避免年底资金紧张。"],
    ["Q3", "客户问：澳大利亚每笔跨境汇款都要报告吗？",
     "A：是的，AUD 10,000 以上的跨境汇款（IFTI）须向 AUSTRAC 报告，这是银行的法定义务，客户无需额外操作，但需配合提供交易目的。"],
    ["Q4", "客户问：香港开户为什么这么难？",
     "A：2020 年后 HKMA 加强 AML 要求，银行对高风险客户（含中资背景）审查趋严。建议提前准备完整的 UBO 文件、业务证明和资金来源说明。"],
  ];
  qas.forEach(([q, question, answer], i) => {
    const y = 1.2 + i * 1.45;
    colorBox(s, 0.4, y, 0.5, 1.2, C.teal);
    s.addText(q, { x: 0.4, y: y + 0.35, w: 0.5, h: 0.5, fontSize: 13, bold: true, color: C.white, fontFace: "Calibri", align: "center" });
    s.addText(question, { x: 1.05, y: y + 0.05, w: 11.8, h: 0.45, fontSize: 12, bold: true, color: C.navy, fontFace: "Calibri" });
    s.addText(answer, { x: 1.05, y: y + 0.55, w: 11.8, h: 0.65, fontSize: 11, color: C.gray, fontFace: "Calibri", wrap: true });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER 4 DIVIDER — Slide 29
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  sectionDivider(s, "四", "跨境资金池产品对比", "HSBC · 渣打 · 花旗 · 摩根大通 · ANZ · Transactive Global · NPP");
  pageNum(s, 29);
}

// SLIDE 30 — Cash Pool Concepts
{
  const s = pptx.addSlide();
  lightSlide(s);
  addTitle(s, "跨境资金池基础概念");
  pageNum(s, 30);
  infoCard(s, 0.4, 1.1, 3.9, 2.8, "实体池（Physical Pooling）",
    "资金实际归集到主账户。子公司余额每日自动扫入主池，集团统一调配。\n\n优点：资金利用率最高\n缺点：需满足各国外汇管制要求", C.ltBlue);
  infoCard(s, 4.5, 1.1, 3.9, 2.8, "虚拟池（Notional Pooling）",
    "资金不实际移动，银行在计算利息时将各账户余额合并计算。\n\n优点：规避外汇管制限制\n缺点：部分国家不允许（如德国）", C.ltGray);
  infoCard(s, 8.6, 1.1, 4.4, 2.8, "混合池（Hybrid）",
    "自由市场用实体池，管制市场用虚拟池，通过主账户统一管理。\n\n优点：灵活应对不同市场\n缺点：架构复杂，管理成本高", C.ltBlue);
  infoCard(s, 0.4, 4.1, 3.9, 2.6, "单币种池", "所有账户使用同一货币（如 USD）。结构简单，适合贸易型企业。", C.ltGray);
  infoCard(s, 4.5, 4.1, 3.9, 2.6, "多币种池", "支持多种货币，银行提供 FX 转换服务。适合跨国集团，需关注汇率风险。", C.ltBlue);
  infoCard(s, 8.6, 4.1, 4.4, 2.6, "区域池 vs 全球池", "区域池：覆盖特定地区（如亚太）\n全球池：覆盖全球，通常需要大型跨国银行支持", C.ltGray);
}

// SLIDE 31 — HSBC
{
  const s = pptx.addSlide();
  lightSlide(s);
  colorBox(s, 0, 0, 13.33, 1.0, "DB0011"); // HSBC red
  s.addText("HSBC — Global Liquidity and Cash Management", { x: 0.4, y: 0.15, w: 12, h: 0.7, fontSize: 24, bold: true, color: C.white, fontFace: "Georgia" });
  pageNum(s, 31);
  infoCard(s, 0.4, 1.1, 6.1, 2.8, "核心产品",
    "• HSBCnet：全球统一网银平台，支持 200+ 国家\n• Global Liquidity Solutions：实体池 + 虚拟池\n• 亚太区多币种资金池：覆盖 15+ 亚太市场\n• FX 解决方案：即时 FX、远期合约、期权\n• API Banking：实时余额查询、付款发起", C.ltBlue);
  infoCard(s, 6.7, 1.1, 6.3, 2.8, "亚太区优势",
    "• 亚太区最强的本地网络（14 个市场有本地牌照）\n• 离岸人民币（CNH）业务全球领先\n• 2024 年 Euromoney 评选：全球最佳支付与财资银行\n• 中资企业服务经验丰富，有专属中资企业团队\n• 新加坡财资中心激励计划申请支持", C.ltGray);
  infoCard(s, 0.4, 4.1, 6.1, 2.6, "适合客群",
    "• 大型中资跨国企业（年营收 5 亿美元以上）\n• 需要全球资金池的集团\n• 有离岸人民币需求的企业\n• 在东南亚多国有子公司的企业", C.ltBlue);
  infoCard(s, 6.7, 4.1, 6.3, 2.6, "注意事项",
    "• 最低规模要求较高（通常需要较大资金量）\n• 开户 KYC 严格，周期较长\n• 费用结构复杂，需仔细谈判\n• 建议：要求 HSBC 提供亚太区专属方案报价", C.ltGray);
}

// SLIDE 32 — Standard Chartered
{
  const s = pptx.addSlide();
  lightSlide(s);
  colorBox(s, 0, 0, 13.33, 1.0, "00A0D2"); // SCB blue
  s.addText("渣打银行 — Straight2Bank & 新兴市场优势", { x: 0.4, y: 0.15, w: 12, h: 0.7, fontSize: 24, bold: true, color: C.white, fontFace: "Georgia" });
  pageNum(s, 32);
  infoCard(s, 0.4, 1.1, 6.1, 2.8, "Straight2Bank 平台",
    "• 统一网银平台，覆盖 50+ 市场\n• 实时余额查询、付款发起、FX 交易\n• API 集成：支持 ERP 系统直连（SAP、Oracle）\n• 虚拟账户：为每个客户/供应商生成唯一账号\n• 与 Wise Platform 合作：提升跨境支付速度和透明度", C.ltBlue);
  infoCard(s, 6.7, 1.1, 6.3, 2.8, "新兴市场优势",
    "• 东南亚本地化最强：在越南、印尼、缅甸等市场有深厚积累\n• 非洲、中东、南亚覆盖广（HSBC 和花旗相对弱）\n• 本地合规团队：熟悉各国外汇管制规则\n• 中资企业出海：提供一站式开户和合规支持\n• 越南、印尼市场：渣打是中资企业首选银行之一", C.ltGray);
  infoCard(s, 0.4, 4.1, 6.1, 2.6, "适合客群",
    "• 在新兴市场（东南亚、非洲、中东）有业务的企业\n• 需要本地化合规支持的中资企业\n• 中型跨国企业（年营收 1–10 亿美元）\n• 供应链金融需求较强的企业", C.ltBlue);
  infoCard(s, 6.7, 4.1, 6.3, 2.6, "注意事项",
    "• 全球池能力弱于 HSBC 和花旗\n• 欧美市场覆盖相对有限\n• 建议：渣打 + 另一家全球银行组合使用\n• 优势场景：东南亚多国资金归集", C.ltGray);
}

// SLIDE 33 — Citi
{
  const s = pptx.addSlide();
  lightSlide(s);
  colorBox(s, 0, 0, 13.33, 1.0, "003B70"); // Citi blue
  s.addText("花旗银行 — TreasuryVision & 全球现金池", { x: 0.4, y: 0.15, w: 12, h: 0.7, fontSize: 24, bold: true, color: C.white, fontFace: "Georgia" });
  pageNum(s, 33);
  infoCard(s, 0.4, 1.1, 6.1, 2.8, "TreasuryVision 平台",
    "• 全球统一财资管理平台，覆盖 160+ 国家\n• 实时全球余额可视化（单一视图）\n• 预测性现金流分析（AI 驱动）\n• 多币种实体池 + 虚拟池\n• CitiConnect API：与 ERP/TMS 系统深度集成\n• 全球支付追踪：SWIFT GPI 全程可视", C.ltBlue);
  infoCard(s, 6.7, 1.1, 6.3, 2.8, "全球现金池优势",
    "• 全球最大的现金管理银行之一\n• 覆盖市场最广：160+ 国家，包括许多其他银行不覆盖的市场\n• 技术领先：API 能力和数字化程度最高\n• 机构级服务：主要服务大型跨国企业和金融机构\n• 亚太区：在新加坡、香港、台湾有强大的财资中心业务", C.ltGray);
  infoCard(s, 0.4, 4.1, 6.1, 2.6, "适合客群",
    "• 大型跨国企业（年营收 10 亿美元以上）\n• 需要全球统一资金池的集团\n• 技术驱动型企业（需要 API 集成）\n• 在多个大洲有业务的企业", C.ltBlue);
  infoCard(s, 6.7, 4.1, 6.3, 2.6, "注意事项",
    "• 门槛最高，中小企业难以获得优质服务\n• 费用较高，需要较大资金规模才能摊薄成本\n• 部分新兴市场（如越南）本地化能力弱于渣打\n• 建议：适合已有全球业务布局的大型中资企业", C.ltGray);
}

// SLIDE 34 — JP Morgan
{
  const s = pptx.addSlide();
  lightSlide(s);
  colorBox(s, 0, 0, 13.33, 1.0, "003087"); // JPM blue
  s.addText("摩根大通 — ACCESS & 机构级服务", { x: 0.4, y: 0.15, w: 12, h: 0.7, fontSize: 24, bold: true, color: C.white, fontFace: "Georgia" });
  pageNum(s, 34);
  infoCard(s, 0.4, 1.1, 6.1, 2.8, "ACCESS 平台",
    "• 全球统一现金管理平台\n• 实时余额查询、付款发起、流动性管理\n• 多币种账户管理\n• 全球支付网络：覆盖 120+ 货币\n• 2024 年 Coalition Greenwich 亚洲质量领导奖\n• 区块链支付：JPM Coin 用于机构间即时结算", C.ltBlue);
  infoCard(s, 6.7, 1.1, 6.3, 2.8, "机构级优势",
    "• 全球最大的银行之一，资产负债表最强\n• 机构级服务：主要服务大型企业和金融机构\n• 亚太区：在新加坡、香港有强大的财资业务\n• 跨境支付网络：全球最广泛的代理行网络之一\n• 创新能力：区块链、AI 在支付领域的应用领先", C.ltGray);
  infoCard(s, 0.4, 4.1, 6.1, 2.6, "适合客群",
    "• 超大型跨国企业和金融机构\n• 需要最高信用评级银行合作的企业\n• 有复杂衍生品和融资需求的企业\n• 在美国有重要业务的中资企业", C.ltBlue);
  infoCard(s, 6.7, 4.1, 6.3, 2.6, "注意事项",
    "• 门槛极高，通常只服务大型机构客户\n• 东南亚新兴市场本地化能力弱于 HSBC 和渣打\n• 中资企业合规审查严格（美国监管背景）\n• 建议：适合有美国业务或需要顶级信用背书的大型中资企业", C.ltGray);
}

// SLIDE 35 — ANZ
{
  const s = pptx.addSlide();
  lightSlide(s);
  colorBox(s, 0, 0, 13.33, 1.0, "007DBA"); // ANZ blue
  s.addText("ANZ — 亚太走廊与中资企业专属方案", { x: 0.4, y: 0.15, w: 12, h: 0.7, fontSize: 24, bold: true, color: C.white, fontFace: "Georgia" });
  pageNum(s, 35);
  infoCard(s, 0.4, 1.1, 6.1, 2.8, "亚太区优势",
    "• 澳大利亚和新西兰市场份额最大的银行\n• 亚太走廊：澳新 ↔ 东南亚（新加坡、越南、菲律宾、印尼）\n• 中资企业专属团队：提供中文服务和本地化支持\n• 澳新资金池：澳大利亚 + 新西兰合并资金池\n• 矿产、农业、教育领域深厚积累", C.ltBlue);
  infoCard(s, 6.7, 1.1, 6.3, 2.8, "跨境支付能力",
    "• ANZ Transactive Global：多币种跨境支付平台\n• NPP：澳洲即时支付，2024 年首家实现跨境 NPP 结算\n• SWIFT GPI：全程追踪跨境汇款\n• 实时 FX：支持 30+ 货币即时兑换\n• API Banking：与企业 ERP 系统集成", C.ltGray);
  infoCard(s, 0.4, 4.1, 6.1, 2.6, "适合客群",
    "• 在澳大利亚/新西兰有业务的中资企业\n• 矿产、农业、教育、房地产领域企业\n• 需要澳新 ↔ 东南亚资金走廊的企业\n• 中型企业（年营收 5,000 万–5 亿美元）", C.ltBlue);
  infoCard(s, 6.7, 4.1, 6.3, 2.6, "注意事项",
    "• 全球覆盖不如 HSBC/花旗广\n• 欧美市场能力相对有限\n• 优势场景：澳新 + 东南亚区域资金管理\n• 建议：澳新业务首选 ANZ，配合 HSBC/渣打覆盖其他市场", C.ltGray);
}

// SLIDE 36 — ANZ Transactive Global
{
  const s = pptx.addSlide();
  lightSlide(s);
  colorBox(s, 0, 0, 13.33, 1.0, "005B99");
  s.addText("ANZ Transactive Global — 跨境支付平台详解", { x: 0.4, y: 0.15, w: 12, h: 0.7, fontSize: 24, bold: true, color: C.white, fontFace: "Georgia" });
  pageNum(s, 36);
  infoCard(s, 0.4, 1.1, 4.0, 5.5, "核心功能",
    "• 多币种账户管理（单一平台）\n• 跨境付款：支持 30+ 货币\n• 实时汇率查询和 FX 交易\n• 批量付款：支持 CSV 批量上传\n• 付款审批工作流：多级授权\n• 账户余额实时查询\n• 交易历史和对账报告\n• 支持市场：澳大利亚、新西兰、中国、香港、印度、新加坡、越南、菲律宾", C.ltBlue);
  infoCard(s, 4.6, 1.1, 4.0, 5.5, "技术特点",
    "• Web 端 + 移动端（iOS/Android）\n• API 集成：RESTful API，支持 ERP 直连\n• SWIFT GPI：跨境汇款全程追踪\n• 安全：多因素认证（MFA）、IP 白名单\n• 审批框架：可设置金额限制和授权层级\n• 报告：可定制化财务报告和对账单\n• 2025 年 9 月更新：越南付款支持更多特殊字符", C.ltGray);
  infoCard(s, 8.8, 1.1, 4.2, 5.5, "与竞品对比",
    "• vs HSBC HSBCnet：ANZ 在澳新市场更强，HSBC 全球覆盖更广\n• vs 渣打 S2B：ANZ 技术平台更现代，渣打新兴市场更强\n• vs 花旗 TreasuryVision：花旗全球覆盖更广，ANZ 澳新本地化更好\n\n最佳使用场景：\n澳新 ↔ 东南亚资金走廊\n中资企业澳洲本地收付款\n多币种账户统一管理", C.ltBlue);
}

// SLIDE 37 — ANZ NPP
{
  const s = pptx.addSlide();
  lightSlide(s);
  colorBox(s, 0, 0, 13.33, 1.0, "005B99");
  s.addText("ANZ NPP — 澳洲新支付平台（New Payments Platform）", { x: 0.4, y: 0.15, w: 12, h: 0.7, fontSize: 24, bold: true, color: C.white, fontFace: "Georgia" });
  pageNum(s, 37);
  const stats = [
    ["7×24", "全天候即时到账"],
    ["< 60秒", "通常到账时间"],
    ["AUD 500", "跨境入境近实时上限"],
    ["400+", "已接入国际银行数量"],
  ];
  stats.forEach(([num, label], i) => {
    const x = 0.4 + i * 3.2;
    colorBox(s, x, 1.1, 2.9, 1.5, C.navy);
    s.addText(num, { x, y: 1.2, w: 2.9, h: 0.8, fontSize: 28, bold: true, color: C.gold, fontFace: "Georgia", align: "center" });
    s.addText(label, { x, y: 2.0, w: 2.9, h: 0.5, fontSize: 11, color: C.white, fontFace: "Calibri", align: "center" });
  });
  infoCard(s, 0.4, 2.9, 4.0, 3.8, "PayID",
    "• 用手机号、邮箱或 ABN 收款\n• 无需提供 BSB + 账号\n• 企业可申请企业 PayID（ABN）\n• 降低收款错误率\n• 适合：电商收款、供应商付款", C.ltBlue);
  infoCard(s, 4.6, 2.9, 4.0, 3.8, "Osko 即时支付",
    "• 基于 NPP 的即时支付服务\n• 7×24 全天候，包括节假日\n• 通常 60 秒内到账\n• 支持附言（280 字符）\n• 适合：工资发放、紧急付款、供应商结算", C.ltGray);
  infoCard(s, 8.8, 2.9, 4.2, 3.8, "跨境 NPP（2024 年新功能）",
    "• ANZ 首家通过 NPP 结算跨境交易（2024 年 7 月）\n• 入境 AUD 500 以内：近实时到账\n• 已接入 400+ 国际银行\n• 2024 年 12 月：扩展至所有 AUD 清算服务客户\n• 意义：跨境汇款速度大幅提升，接近国内转账体验", C.ltBlue);
}

// SLIDE 38 — Product Comparison Table
{
  const s = pptx.addSlide();
  lightSlide(s);
  addTitle(s, "六家银行横向对比", { fs: 26 });
  pageNum(s, 38);
  const rows = [
    [
      { text: "银行/平台", options: { bold: true, color: C.white, fill: C.navy } },
      { text: "覆盖市场", options: { bold: true, color: C.white, fill: C.navy } },
      { text: "池类型", options: { bold: true, color: C.white, fill: C.navy } },
      { text: "技术平台", options: { bold: true, color: C.white, fill: C.navy } },
      { text: "适合客群", options: { bold: true, color: C.white, fill: C.navy } },
    ],
    [{ text: "HSBC" }, { text: "200+ 国家，亚太最强" }, { text: "实体+虚拟+多币种" }, { text: "HSBCnet + API" }, { text: "大型跨国企业" }],
    [{ text: "渣打" }, { text: "50+ 市场，新兴市场强" }, { text: "实体+虚拟" }, { text: "Straight2Bank + API" }, { text: "中型企业，新兴市场" }],
    [{ text: "花旗" }, { text: "160+ 国家，全球最广" }, { text: "实体+虚拟+全球池" }, { text: "TreasuryVision + API" }, { text: "超大型跨国企业" }],
    [{ text: "摩根大通" }, { text: "120+ 货币" }, { text: "实体+虚拟" }, { text: "ACCESS + JPM Coin" }, { text: "机构级大型企业" }],
    [{ text: "ANZ" }, { text: "澳新+东南亚走廊" }, { text: "实体+区域池" }, { text: "Transactive Global" }, { text: "澳新业务中型企业" }],
    [{ text: "ANZ Transactive Global" }, { text: "澳新+8个亚太市场" }, { text: "多币种账户管理" }, { text: "Web+API+移动端" }, { text: "澳新↔东南亚企业" }],
    [{ text: "ANZ NPP" }, { text: "澳大利亚（跨境扩展中）" }, { text: "即时支付基础设施" }, { text: "PayID+Osko" }, { text: "澳洲本地+跨境入境" }],
  ];
  s.addTable(rows, {
    x: 0.3, y: 1.0, w: 12.7, h: 6.0,
    fontSize: 10, fontFace: "Calibri",
    border: { type: "solid", color: C.ltGray, pt: 0.5 },
    rowH: 0.72,
    colW: [2.2, 2.8, 2.2, 2.2, 3.3],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER 5 DIVIDER — Slide 39
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  sectionDivider(s, "五", "中资企业出海案例", "制造业 · 科技企业 · 贸易企业 · 澳新市场");
  pageNum(s, 39);
}

// SLIDE 40 — Case Overview
{
  const s = pptx.addSlide();
  lightSlide(s);
  addTitle(s, "案例概览：选案标准与覆盖范围");
  pageNum(s, 40);
  const cases = [
    ["案例 1", "制造业出海", "越南 + 泰国 + 马来西亚", "东南亚三国区域资金池", C.navy],
    ["案例 2", "科技企业", "新加坡区域总部", "亚太虚拟资金池", C.teal],
    ["案例 3", "贸易企业", "香港 + 新加坡", "跨境人民币结算", C.navy],
    ["案例 4", "澳新市场", "澳大利亚 + 新西兰", "ANZ Transactive Global 落地", C.teal],
  ];
  cases.forEach(([num, type, market, solution, color], i) => {
    const col = i < 2 ? 0.4 : 0.4;
    const x = i % 2 === 0 ? 0.4 : 6.8;
    const y = i < 2 ? 1.3 : 4.2;
    colorBox(s, x, y, 6.1, 2.6, color);
    s.addText(num, { x: x + 0.2, y: y + 0.15, w: 1.0, h: 0.4, fontSize: 14, bold: true, color: C.gold, fontFace: "Georgia" });
    s.addText(type, { x: x + 1.2, y: y + 0.15, w: 4.5, h: 0.4, fontSize: 16, bold: true, color: C.white, fontFace: "Georgia" });
    s.addText(`市场：${market}`, { x: x + 0.2, y: y + 0.65, w: 5.5, h: 0.35, fontSize: 12, color: C.ltBlue, fontFace: "Calibri" });
    s.addText(`方案：${solution}`, { x: x + 0.2, y: y + 1.05, w: 5.5, h: 0.35, fontSize: 12, color: C.ltBlue, fontFace: "Calibri" });
    s.addText("→ 查看详情", { x: x + 0.2, y: y + 1.5, w: 3, h: 0.35, fontSize: 11, color: C.gold, fontFace: "Calibri", italic: true });
  });
}

// SLIDE 41 — Case 1: Manufacturing SEA
{
  const s = pptx.addSlide();
  lightSlide(s);
  colorBox(s, 0, 0, 13.33, 1.0, C.navy);
  s.addText("案例 1：制造业出海 — 东南亚三国区域资金池", { x: 0.4, y: 0.15, w: 12, h: 0.7, fontSize: 22, bold: true, color: C.white, fontFace: "Georgia" });
  pageNum(s, 41);
  infoCard(s, 0.4, 1.1, 3.8, 5.6, "企业背景",
    "行业：电子制造业\n规模：年营收约 8 亿美元\n布局：\n• 越南：主要生产基地\n• 泰国：区域分销中心\n• 马来西亚：研发中心\n• 新加坡：区域总部（财资中心）\n\n痛点：\n• 三国子公司各自持有本地货币余额\n• 集团无法统一调配资金\n• 每月跨境汇款手续费超 50 万美元\n• 越南利润汇出流程繁琐", C.ltBlue);
  infoCard(s, 4.4, 1.1, 4.4, 5.6, "解决方案",
    "合作银行：渣打银行\n\n架构设计：\n1. 新加坡设立主资金池（USD）\n2. 越南：外币账户（USD）每日扫账至新加坡\n3. 泰国：FCD 账户（USD）每日扫账\n4. 马来西亚：外币账户（USD）每日扫账\n5. 各国 MYR/THB/VND 余额保留本地\n\n关键合规动作：\n• 越南：SBV 登记 + 逐笔文件\n• 泰国：BOT 跨境资金池申请\n• 马来西亚：BNM 豁免申请", C.ltGray);
  infoCard(s, 9.0, 1.1, 4.0, 5.6, "成果",
    "✅ 资金利用率提升 35%\n✅ 跨境汇款成本降低 60%\n✅ 集团层面实现统一资金视图\n✅ 越南利润汇出流程标准化\n\n关键经验：\n• 合规先行：提前 6 个月启动各国合规申请\n• 分阶段实施：先新加坡+泰国，再加入越南和马来西亚\n• 本地团队：每个市场配备本地合规专员\n• 文件管理：建立标准化交易文件模板", C.ltBlue);
}

// SLIDE 42 — Case 2: Tech Company Singapore
{
  const s = pptx.addSlide();
  lightSlide(s);
  colorBox(s, 0, 0, 13.33, 1.0, C.teal);
  s.addText("案例 2：科技企业 — 新加坡区域总部亚太虚拟资金池", { x: 0.4, y: 0.15, w: 12, h: 0.7, fontSize: 22, bold: true, color: C.white, fontFace: "Georgia" });
  pageNum(s, 42);
  infoCard(s, 0.4, 1.1, 3.8, 5.6, "企业背景",
    "行业：SaaS 软件企业\n规模：年营收约 3 亿美元\n布局：\n• 新加坡：亚太区总部\n• 中国：研发中心\n• 日本、韩国、澳大利亚：销售子公司\n• 印度：技术支持中心\n\n痛点：\n• 多国子公司余额分散，无法统一管理\n• 外汇风险敞口大（JPY/KRW/AUD/INR）\n• 集团内部资金调拨效率低\n• 缺乏统一的财资可视化工具", C.ltBlue);
  infoCard(s, 4.4, 1.1, 4.4, 5.6, "解决方案",
    "合作银行：HSBC\n\n架构设计：\n1. 新加坡设立区域财资中心（RTC）\n2. 申请 MAS 财资中心激励计划（税率 8%）\n3. 虚拟资金池：各子公司账户余额合并计息\n4. HSBCnet：统一财资管理平台\n5. FX 对冲：通过 HSBC 做多币种远期合约\n\n关键功能：\n• 实时全球余额可视化\n• 自动 FX 对冲触发\n• 集团内部贷款（Intercompany Loan）管理", C.ltGray);
  infoCard(s, 9.0, 1.1, 4.0, 5.6, "成果",
    "✅ 资金利用率提升 28%\n✅ FX 对冲成本降低 40%\n✅ 财资团队人员减少 30%（自动化）\n✅ 获得 MAS 财资中心激励，税率从 17% 降至 8%\n\n关键经验：\n• 新加坡 RTC 是亚太区最优架构\n• 虚拟池规避了日本、韩国的外汇管制\n• MAS 激励计划申请需提前 6 个月准备\n• HSBC 的 CNH 能力支持了中国子公司的人民币管理", C.ltBlue);
}

// SLIDE 43 — Case 3: Trading Company HK+SG RMB
{
  const s = pptx.addSlide();
  lightSlide(s);
  colorBox(s, 0, 0, 13.33, 1.0, C.navy);
  s.addText("案例 3：贸易企业 — 香港+新加坡跨境人民币结算", { x: 0.4, y: 0.15, w: 12, h: 0.7, fontSize: 22, bold: true, color: C.white, fontFace: "Georgia" });
  pageNum(s, 43);
  infoCard(s, 0.4, 1.1, 3.8, 5.6, "企业背景",
    "行业：大宗商品贸易\n规模：年营收约 15 亿美元\n布局：\n• 中国内地：采购中心\n• 香港：贸易结算中心\n• 新加坡：区域销售中心\n• 东南亚多国：客户\n\n痛点：\n• 内地采购用人民币，东南亚销售用美元\n• 汇率风险大，每年汇兑损失超 500 万美元\n• 香港-内地资金调拨效率低\n• 缺乏人民币跨境结算能力", C.ltBlue);
  infoCard(s, 4.4, 1.1, 4.4, 5.6, "解决方案",
    "合作银行：HSBC（香港+内地）\n\n架构设计：\n1. 香港设立离岸人民币（CNH）账户\n2. 内地-香港跨境人民币资金池（SAFE 批准）\n3. 新加坡设立 USD 区域资金池\n4. 香港作为 CNH ↔ USD 转换枢纽\n5. 人民币跨境结算：通过 CIPS 直接与内地对接\n\n关键功能：\n• CNH/CNY 套利管理\n• 跨境人民币资金池（双向）\n• 实时 FX 对冲（CNH/USD）", C.ltGray);
  infoCard(s, 9.0, 1.1, 4.0, 5.6, "成果",
    "✅ 汇兑损失减少 70%（FX 对冲）\n✅ 内地-香港资金调拨 T+0 实现\n✅ 人民币结算比例从 20% 提升至 55%\n✅ 融资成本降低（利用 CNH 市场低利率）\n\n关键经验：\n• 香港是人民币跨境结算的最优枢纽\n• SAFE 跨境资金池申请需要集团层面协调\n• CNH 与 CNY 汇差可以创造套利机会\n• HSBC 的 CIPS 直接参与行资格是关键", C.ltBlue);
}

// SLIDE 44 — Case 4: ANZ AU/NZ
{
  const s = pptx.addSlide();
  lightSlide(s);
  colorBox(s, 0, 0, 13.33, 1.0, "007DBA");
  s.addText("案例 4：澳新市场 — ANZ Transactive Global 合规落地", { x: 0.4, y: 0.15, w: 12, h: 0.7, fontSize: 22, bold: true, color: C.white, fontFace: "Georgia" });
  pageNum(s, 44);
  infoCard(s, 0.4, 1.1, 3.8, 5.6, "企业背景",
    "行业：矿产资源贸易\n规模：年营收约 5 亿澳元\n布局：\n• 中国内地：总部\n• 澳大利亚：矿产采购和本地运营\n• 新西兰：农产品采购\n• 新加坡：区域财资中心\n\n痛点：\n• 澳洲 AUSTRAC 合规要求不熟悉\n• 澳新两国账户分散，无法统一管理\n• 跨境汇款到中国速度慢（T+2 到 T+3）\n• 缺乏澳洲本地即时收款能力", C.ltBlue);
  infoCard(s, 4.4, 1.1, 4.4, 5.6, "解决方案",
    "合作银行：ANZ\n\n架构设计：\n1. ANZ Transactive Global：统一管理澳新账户\n2. PayID 注册：用 ABN 作为企业 PayID\n3. Osko 即时收款：供应商付款即时到账\n4. 澳新合并资金池：AUD + NZD 统一管理\n5. 跨境 NPP：入境 AUD 500 以内近实时\n6. AUSTRAC 合规：ANZ 协助建立 AML/CTF 计划\n\n关键合规动作：\n• AUSTRAC 注册为汇报实体\n• 建立 AML/CTF 计划\n• IFTI 报告流程自动化", C.ltGray);
  infoCard(s, 9.0, 1.1, 4.0, 5.6, "成果",
    "✅ AUSTRAC 合规 100% 达标\n✅ 澳新资金统一可视化\n✅ 本地收款时间从 T+1 缩短至即时\n✅ 跨境汇款成本降低 45%\n✅ 通过 NPP 实现部分跨境近实时到账\n\n关键经验：\n• ANZ 是澳新市场中资企业的最佳合作伙伴\n• AUSTRAC 合规需要专职人员，不可忽视\n• PayID 显著提升了本地收款效率\n• 澳新合并资金池是最优架构", C.ltBlue);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 45 — Summary & Action Items (was 43)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  darkSlide(s);
  colorBox(s, 0, 5.5, 13.33, 2.0, C.teal);
  s.addText("总结与行动建议", { x: 0.6, y: 0.5, w: 12, h: 0.8, fontSize: 32, bold: true, color: C.white, fontFace: "Georgia" });
  const points = [
    ["合规先行", "在任何市场开展业务前，先完成外汇管制研究和合规架构设计"],
    ["枢纽策略", "以新加坡（东南亚）和香港（人民币）为区域资金池枢纽"],
    ["分层架构", "自由市场用实体池，管制市场用外币账户对接，严格管制市场独立运作"],
    ["银行组合", "单一银行无法覆盖所有市场，建议 HSBC/渣打 + ANZ 组合"],
    ["技术投入", "API 集成和统一财资平台是降低运营成本的关键"],
  ];
  points.forEach(([title, body], i) => {
    const y = 1.5 + i * 0.8;
    colorBox(s, 0.5, y + 0.1, 0.35, 0.35, C.gold);
    s.addText(`${i + 1}`, { x: 0.5, y: y + 0.1, w: 0.35, h: 0.35, fontSize: 12, bold: true, color: C.navy, fontFace: "Calibri", align: "center", valign: "middle" });
    s.addText(title, { x: 1.0, y: y + 0.05, w: 2.5, h: 0.35, fontSize: 13, bold: true, color: C.gold, fontFace: "Calibri" });
    s.addText(body, { x: 3.6, y: y + 0.05, w: 9.3, h: 0.35, fontSize: 12, color: C.ltBlue, fontFace: "Calibri" });
  });
  s.addText("如有问题，请联系跨境业务团队", { x: 0.6, y: 5.7, w: 8, h: 0.4, fontSize: 13, color: C.white, fontFace: "Calibri" });
  pageNum(s, 45);
}

// fix pageNum helper to show total as 46


// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 46 — References
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  lightSlide(s);
  addTitle(s, "参考资料");
  pageNum(s, 46);
  addBullets(s, [
    "MAS（新加坡金融管理局）：mas.gov.sg — 支付服务法、AML/CTF 指引",
    "HKMA（香港金融管理局）：hkma.gov.hk — 跨境人民币业务指引",
    "BNM（马来西亚国家银行）：bnm.gov.my — 外汇政策（FEP）",
    "BOT（泰国银行）：bot.or.th — 外汇管制规则",
    "Bank Indonesia：bi.go.id — 外汇管理法规（2024 年新规）",
    "SBV（越南国家银行）：sbv.gov.vn — 外商投资企业账户规定",
    "BSP（菲律宾中央银行）：bsp.gov.ph — FX 报告指引",
    "AUSTRAC：austrac.gov.au — AML/CTF 法规、IFTI 报告要求",
    "ANZ：anz.com/institutional/transactive — Transactive Global 平台",
    "ANZ NPP：anz.com.au/newsroom — 跨境 NPP 新闻稿（2024 年 7 月）",
    "CBC（台湾中央银行）：cbc.gov.tw — OBU 月度数据",
    "HSBC Global Banking：gbm.hsbc.com — 亚太区现金管理解决方案",
  ], { y: 1.3, fs: 12, h: 5.5 });
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISUAL SLIDES (inserted after slide 46)
// ═══════════════════════════════════════════════════════════════════════════════

// VISUAL 1 — FX Control Heatmap (Slide 47)
{
  const s = pptx.addSlide();
  lightSlide(s);
  addTitle(s, "10 个市场外汇管制等级示意图", { fs: 26 });
  pageNum(s, 47);

  // Legend
  const levels = [
    { label: "自由", color: "1A7A4A", desc: "无管制" },
    { label: "半管制", color: "D4680A", desc: "有限制" },
    { label: "严格", color: "C0392B", desc: "严格管制" },
  ];
  levels.forEach(({ label, color, desc }, i) => {
    const x = 0.4 + i * 2.2;
    colorBox(s, x, 1.1, 1.8, 0.5, color);
    s.addText(`${label}  ${desc}`, { x: x + 0.05, y: 1.15, w: 1.7, h: 0.4, fontSize: 11, bold: true, color: C.white, fontFace: "Calibri", align: "center" });
  });

  // Market cards in 2 rows x 5 cols
  const markets = [
    { name: "新加坡", color: "1A7A4A", detail: "MAS\n无管制\n资金池：✅ 高" },
    { name: "香港", color: "1A7A4A", detail: "HKMA\n联系汇率\n资金池：✅ 高" },
    { name: "澳大利亚", color: "1A7A4A", detail: "AUSTRAC\nAML严格\n资金池：✅ 高" },
    { name: "新西兰", color: "1A7A4A", detail: "FMA\n与澳互通\n资金池：✅ 高" },
    { name: "台湾", color: "D4680A", detail: "FSC+CBC\nOBU可用\n资金池：⚠️ 中" },
    { name: "马来西亚", color: "D4680A", detail: "BNM\nMYR不可离岸\n资金池：⚠️ 受限" },
    { name: "泰国", color: "D4680A", detail: "BOT\nFCD账户\n资金池：⚠️ 中" },
    { name: "菲律宾", color: "D4680A", detail: "BSP\nUSD 1万申报\n资金池：⚠️ 中" },
    { name: "印度尼西亚", color: "C0392B", detail: "BI+OJK\nIDR本地化\n资金池：🔴 极受限" },
    { name: "越南", color: "C0392B", detail: "SBV\nVND不可兑换\n资金池：🔴 极受限" },
  ];
  markets.forEach(({ name, color, detail }, i) => {
    const col = i % 5;
    const row = Math.floor(i / 5);
    const x = 0.3 + col * 2.6;
    const y = 1.85 + row * 2.5;
    colorBox(s, x, y, 2.4, 2.2, color);
    s.addText(name, { x: x + 0.1, y: y + 0.1, w: 2.2, h: 0.45, fontSize: 14, bold: true, color: C.white, fontFace: "Georgia", align: "center" });
    s.addShape(pptx.ShapeType.line, { x: x + 0.2, y: y + 0.58, w: 2.0, h: 0, line: { color: "FFFFFF", width: 0.5, transparency: 50 } });
    s.addText(detail, { x: x + 0.1, y: y + 0.65, w: 2.2, h: 1.45, fontSize: 10, color: C.white, fontFace: "Calibri", align: "center", valign: "top" });
  });
}

// VISUAL 2 — Cash Pool Architecture Diagram (Slide 48)
{
  const s = pptx.addSlide();
  lightSlide(s);
  addTitle(s, "跨境资金池架构示意图", { fs: 26 });
  pageNum(s, 48);

  // Left side: Physical Pool
  colorBox(s, 0.3, 1.1, 5.8, 0.45, C.navy);
  s.addText("实体池（Physical Pooling）", { x: 0.3, y: 1.1, w: 5.8, h: 0.45, fontSize: 14, bold: true, color: C.white, fontFace: "Calibri", align: "center", valign: "middle" });

  // Master account
  colorBox(s, 1.8, 1.7, 2.8, 0.7, C.teal);
  s.addText("主账户（Master Account）\n新加坡 / 香港", { x: 1.8, y: 1.7, w: 2.8, h: 0.7, fontSize: 11, bold: true, color: C.white, fontFace: "Calibri", align: "center", valign: "middle" });

  // Arrows down from master
  const subAccounts = [
    { label: "越南子公司\nUSD账户", x: 0.3 },
    { label: "泰国子公司\nUSD账户", x: 2.15 },
    { label: "马来西亚\nUSD账户", x: 4.0 },
  ];
  subAccounts.forEach(({ label, x }) => {
    s.addShape(pptx.ShapeType.line, { x: x + 0.7, y: 2.4, w: 0, h: 0.6, line: { color: C.teal, width: 1.5 } });
    colorBox(s, x, 3.0, 1.8, 0.7, C.ltBlue);
    s.addText(label, { x, y: 3.0, w: 1.8, h: 0.7, fontSize: 10, color: C.navy, fontFace: "Calibri", align: "center", valign: "middle" });
    // Arrow up label
    s.addText("每日扫账 ↑", { x: x + 0.1, y: 2.45, w: 1.6, h: 0.3, fontSize: 9, color: C.teal, fontFace: "Calibri", align: "center", italic: true });
  });

  // Local currency stays
  colorBox(s, 0.3, 3.9, 5.8, 0.5, C.ltGray);
  s.addText("本地货币余额（VND / THB / MYR）保留本地，不纳入主池", { x: 0.3, y: 3.9, w: 5.8, h: 0.5, fontSize: 11, color: C.gray, fontFace: "Calibri", align: "center", valign: "middle", italic: true });

  // Right side: Notional Pool
  colorBox(s, 7.0, 1.1, 5.8, 0.45, C.navy);
  s.addText("虚拟池（Notional Pooling）", { x: 7.0, y: 1.1, w: 5.8, h: 0.45, fontSize: 14, bold: true, color: C.white, fontFace: "Calibri", align: "center", valign: "middle" });

  // Bank header
  colorBox(s, 8.5, 1.7, 2.8, 0.7, C.teal);
  s.addText("银行合并计息\n（资金不移动）", { x: 8.5, y: 1.7, w: 2.8, h: 0.7, fontSize: 11, bold: true, color: C.white, fontFace: "Calibri", align: "center", valign: "middle" });

  const notionalAccounts = [
    { label: "日本子公司\nJPY账户", x: 7.0 },
    { label: "韩国子公司\nKRW账户", x: 8.85 },
    { label: "澳洲子公司\nAUD账户", x: 10.7 },
  ];
  notionalAccounts.forEach(({ label, x }) => {
    s.addShape(pptx.ShapeType.line, { x: x + 0.7, y: 2.4, w: 0, h: 0.6, line: { color: C.teal, width: 1.5, dashType: "dash" } });
    colorBox(s, x, 3.0, 1.8, 0.7, C.ltBlue);
    s.addText(label, { x, y: 3.0, w: 1.8, h: 0.7, fontSize: 10, color: C.navy, fontFace: "Calibri", align: "center", valign: "middle" });
    s.addText("虚拟合并 ↕", { x: x + 0.1, y: 2.45, w: 1.6, h: 0.3, fontSize: 9, color: C.teal, fontFace: "Calibri", align: "center", italic: true });
  });

  colorBox(s, 7.0, 3.9, 5.8, 0.5, C.ltGray);
  s.addText("各账户余额合并计息，利息优化后分配，资金实际不移动", { x: 7.0, y: 3.9, w: 5.8, h: 0.5, fontSize: 11, color: C.gray, fontFace: "Calibri", align: "center", valign: "middle", italic: true });

  // Comparison row
  const comparisons = [
    { label: "实体池", pros: "资金利用率最高\n集团统一调配", cons: "需满足各国外汇管制\n操作复杂度高", x: 0.3 },
    { label: "虚拟池", pros: "规避外汇管制\n无需实际转账", cons: "部分国家不允许\n利息计算复杂", x: 6.7 },
  ];
  comparisons.forEach(({ label, pros, cons, x }) => {
    colorBox(s, x, 4.6, 6.0, 1.8, C.ltBlue);
    s.addText(label, { x: x + 0.1, y: 4.65, w: 2.0, h: 0.4, fontSize: 13, bold: true, color: C.navy, fontFace: "Calibri" });
    s.addText(`✅ ${pros}`, { x: x + 0.1, y: 5.1, w: 2.8, h: 0.9, fontSize: 11, color: "1A7A4A", fontFace: "Calibri", valign: "top" });
    s.addText(`⚠️ ${cons}`, { x: x + 3.0, y: 5.1, w: 2.8, h: 0.9, fontSize: 11, color: "D4680A", fontFace: "Calibri", valign: "top" });
  });
}

// VISUAL 3 — Chinese Enterprise Overseas Fund Flow (Slide 49)
{
  const s = pptx.addSlide();
  lightSlide(s);
  addTitle(s, "中资企业出海资金流向示意图", { fs: 26 });
  pageNum(s, 49);

  // China HQ box
  colorBox(s, 0.3, 1.2, 2.5, 1.2, C.navy);
  s.addText("中国总部", { x: 0.3, y: 1.2, w: 2.5, h: 0.5, fontSize: 14, bold: true, color: C.white, fontFace: "Georgia", align: "center", valign: "middle" });
  s.addText("注册资本 / 股东贷款\n利润汇回 / 管理费", { x: 0.3, y: 1.7, w: 2.5, h: 0.7, fontSize: 10, color: C.ltBlue, fontFace: "Calibri", align: "center" });

  // Arrow right to HK
  s.addShape(pptx.ShapeType.line, { x: 2.8, y: 1.8, w: 1.2, h: 0, line: { color: C.gold, width: 2 } });
  s.addText("CNH/CNY", { x: 2.85, y: 1.55, w: 1.1, h: 0.25, fontSize: 9, color: C.gold, fontFace: "Calibri", align: "center", italic: true });

  // HK box
  colorBox(s, 4.0, 1.0, 2.5, 1.6, C.teal);
  s.addText("香港枢纽", { x: 4.0, y: 1.0, w: 2.5, h: 0.5, fontSize: 14, bold: true, color: C.white, fontFace: "Georgia", align: "center", valign: "middle" });
  s.addText("离岸人民币中心\nCNH ↔ USD 转换\nCIPS 直连内地", { x: 4.0, y: 1.5, w: 2.5, h: 1.1, fontSize: 10, color: C.white, fontFace: "Calibri", align: "center" });

  // Arrow right to SG
  s.addShape(pptx.ShapeType.line, { x: 6.5, y: 1.8, w: 1.2, h: 0, line: { color: C.gold, width: 2 } });
  s.addText("USD/多币种", { x: 6.55, y: 1.55, w: 1.1, h: 0.25, fontSize: 9, color: C.gold, fontFace: "Calibri", align: "center", italic: true });

  // Singapore box
  colorBox(s, 7.7, 1.0, 2.5, 1.6, C.navy);
  s.addText("新加坡主池", { x: 7.7, y: 1.0, w: 2.5, h: 0.5, fontSize: 14, bold: true, color: C.white, fontFace: "Georgia", align: "center", valign: "middle" });
  s.addText("区域财资中心\n多币种资金池\nFX 对冲平台", { x: 7.7, y: 1.5, w: 2.5, h: 1.1, fontSize: 10, color: C.ltBlue, fontFace: "Calibri", align: "center" });

  // Arrow right to AU/NZ
  s.addShape(pptx.ShapeType.line, { x: 10.2, y: 1.8, w: 1.2, h: 0, line: { color: C.gold, width: 2 } });
  s.addText("AUD/NZD", { x: 10.25, y: 1.55, w: 1.1, h: 0.25, fontSize: 9, color: C.gold, fontFace: "Calibri", align: "center", italic: true });

  // AU/NZ box
  colorBox(s, 11.4, 1.0, 1.6, 1.6, "007DBA");
  s.addText("澳新\n子公司", { x: 11.4, y: 1.0, w: 1.6, h: 0.8, fontSize: 12, bold: true, color: C.white, fontFace: "Georgia", align: "center", valign: "middle" });
  s.addText("ANZ\nNPP", { x: 11.4, y: 1.8, w: 1.6, h: 0.8, fontSize: 10, color: C.white, fontFace: "Calibri", align: "center" });

  // SEA subsidiaries below Singapore
  const seaCountries = [
    { name: "越南", color: "C0392B", note: "FIE账户\nUSD汇出" },
    { name: "泰国", color: "D4680A", note: "FCD账户\nUSD汇出" },
    { name: "马来西亚", color: "D4680A", note: "外币账户\nUSD汇出" },
    { name: "印尼", color: "C0392B", note: "IDR本地\n受限汇出" },
  ];
  seaCountries.forEach(({ name, color, note }, i) => {
    const x = 0.3 + i * 3.2;
    const y = 4.5;
    // Arrow up to SG
    s.addShape(pptx.ShapeType.line, { x: x + 0.9, y: y, w: 0, h: -1.0, line: { color, width: 1.5, dashType: i > 1 ? "dash" : "solid" } });
    s.addText(i > 1 ? "受限 ↑" : "每日扫账 ↑", { x: x + 0.1, y: y - 0.7, w: 1.6, h: 0.3, fontSize: 9, color, fontFace: "Calibri", align: "center", italic: true });
    colorBox(s, x, y, 2.8, 1.5, color);
    s.addText(name, { x, y: y + 0.1, w: 2.8, h: 0.45, fontSize: 14, bold: true, color: C.white, fontFace: "Georgia", align: "center" });
    s.addText(note, { x, y: y + 0.6, w: 2.8, h: 0.8, fontSize: 10, color: C.white, fontFace: "Calibri", align: "center" });
  });

  // Connect SG to SEA with vertical line
  s.addShape(pptx.ShapeType.line, { x: 8.95, y: 2.6, w: 0, h: 1.9, line: { color: C.teal, width: 1.5 } });
  s.addShape(pptx.ShapeType.line, { x: 1.7, y: 4.5, w: 7.25, h: 0, line: { color: C.teal, width: 1.5 } });

  // Legend
  colorBox(s, 0.3, 6.3, 12.7, 0.5, C.ltGray);
  s.addText("实线 = 自由汇出    虚线 = 受限汇出（需合规文件）    金色箭头 = 主要资金流向", {
    x: 0.3, y: 6.3, w: 12.7, h: 0.5, fontSize: 11, color: C.gray, fontFace: "Calibri", align: "center", valign: "middle",
  });
}

// VISUAL 4 — ANZ NPP Payment Flow (Slide 50)
{
  const s = pptx.addSlide();
  lightSlide(s);
  colorBox(s, 0, 0, 13.33, 1.0, "007DBA");
  s.addText("ANZ NPP 支付流程示意图", { x: 0.4, y: 0.15, w: 12, h: 0.7, fontSize: 26, bold: true, color: C.white, fontFace: "Georgia" });
  pageNum(s, 50);

  // Domestic NPP flow (top)
  s.addText("澳洲境内即时支付（Osko）", { x: 0.4, y: 1.1, w: 12, h: 0.35, fontSize: 13, bold: true, color: C.navy, fontFace: "Calibri" });

  const domesticSteps = [
    { label: "付款方\n（企业/个人）", sub: "输入 PayID\n或 BSB+账号" },
    { label: "ANZ\n网银/APP", sub: "实时验证\nPayID" },
    { label: "NPP\n基础设施", sub: "路由 & 结算\n< 60 秒" },
    { label: "收款方银行", sub: "任意 NPP\n成员银行" },
    { label: "收款方\n账户到账", sub: "7×24\n即时到账" },
  ];
  domesticSteps.forEach(({ label, sub }, i) => {
    const x = 0.4 + i * 2.55;
    colorBox(s, x, 1.55, 2.2, 1.1, i === 2 ? C.navy : C.teal);
    s.addText(label, { x, y: 1.55, w: 2.2, h: 0.6, fontSize: 11, bold: true, color: C.white, fontFace: "Calibri", align: "center", valign: "middle" });
    s.addText(sub, { x, y: 2.15, w: 2.2, h: 0.5, fontSize: 9, color: C.white, fontFace: "Calibri", align: "center" });
    if (i < 4) {
      s.addShape(pptx.ShapeType.line, { x: x + 2.2, y: 2.1, w: 0.35, h: 0, line: { color: C.gold, width: 2 } });
      s.addText("▶", { x: x + 2.45, y: 1.95, w: 0.2, h: 0.3, fontSize: 12, color: C.gold, fontFace: "Calibri" });
    }
  });

  // Cross-border NPP flow (middle)
  s.addText("跨境入境支付（2024 年新功能）", { x: 0.4, y: 2.9, w: 12, h: 0.35, fontSize: 13, bold: true, color: C.navy, fontFace: "Calibri" });

  const crossSteps = [
    { label: "海外汇款方", sub: "400+ 国际\n合作银行" },
    { label: "SWIFT/\n国际网络", sub: "跨境路由" },
    { label: "ANZ\n国际清算", sub: "AUD 转换\n& 合规审查" },
    { label: "NPP\n网络结算", sub: "AUD ≤500\n近实时" },
    { label: "澳洲收款方\n即时到账", sub: "7×24\n全天候" },
  ];
  crossSteps.forEach(({ label, sub }, i) => {
    const x = 0.4 + i * 2.55;
    colorBox(s, x, 3.35, 2.2, 1.1, i === 2 ? "007DBA" : C.navy);
    s.addText(label, { x, y: 3.35, w: 2.2, h: 0.6, fontSize: 11, bold: true, color: C.white, fontFace: "Calibri", align: "center", valign: "middle" });
    s.addText(sub, { x, y: 3.95, w: 2.2, h: 0.5, fontSize: 9, color: C.white, fontFace: "Calibri", align: "center" });
    if (i < 4) {
      s.addShape(pptx.ShapeType.line, { x: x + 2.2, y: 3.9, w: 0.35, h: 0, line: { color: C.gold, width: 2 } });
      s.addText("▶", { x: x + 2.45, y: 3.75, w: 0.2, h: 0.3, fontSize: 12, color: C.gold, fontFace: "Calibri" });
    }
  });

  // PayID explanation
  s.addText("PayID 收款标识符", { x: 0.4, y: 4.65, w: 12, h: 0.35, fontSize: 13, bold: true, color: C.navy, fontFace: "Calibri" });
  const payids = [
    { type: "手机号", example: "+61 4XX XXX XXX", use: "个人收款" },
    { type: "邮箱", example: "finance@company.com", use: "个人/企业" },
    { type: "ABN", example: "12 345 678 901", use: "企业首选" },
    { type: "组织ID", example: "自定义标识符", use: "大型机构" },
  ];
  payids.forEach(({ type, example, use }, i) => {
    const x = 0.4 + i * 3.2;
    colorBox(s, x, 5.1, 2.9, 1.2, C.ltBlue);
    s.addText(type, { x, y: 5.1, w: 2.9, h: 0.4, fontSize: 13, bold: true, color: C.navy, fontFace: "Calibri", align: "center", valign: "middle" });
    s.addText(example, { x, y: 5.5, w: 2.9, h: 0.35, fontSize: 10, color: C.teal, fontFace: "Calibri", align: "center" });
    s.addText(use, { x, y: 5.85, w: 2.9, h: 0.35, fontSize: 10, color: C.gray, fontFace: "Calibri", align: "center", italic: true });
  });
}
pptx.writeFile({ fileName: "/Users/proerror/Documents/redbook/docs/plans/cross-border-banking-presentation.pptx" })
  .then(() => console.log("✅ PPTX saved successfully!"))
  .catch(err => console.error("❌ Error:", err));
