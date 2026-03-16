
// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — Product Stack by Market Tier
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.offWhite };
  box(s, 0, 0, 13.33, 1.0, C.navy);
  txt(s, "产品堆叠逻辑：不同市场层级，卖不同产品组合", 0.4, 0.15, 12.5, 0.7,
    { font: "Georgia", fs: 22, color: C.white, bold: true });
  pageNum(s, 6);

  const tiers = [
    { tier: "自由型", markets: "SG · HK · AU · NZ", color: C.green, layers: [
      { name: "流动性层", items: "notional / physical pool\ncross-border sweep\nFX center / hedging" },
      { name: "效率层", items: "POBO / ROBO\nvirtual account\nauto reconciliation" },
      { name: "基础层", items: "multi-currency account\nreal-time payments\nAPI / H2H connectivity" },
    ]},
    { tier: "管理型", markets: "MY · TH · PH · TW", color: C.orange, layers: [
      { name: "流动性层", items: "selective sweep\nFCA / FCD accounts\nonshore FX hedging" },
      { name: "效率层", items: "document validation\npayment purpose coding\nbatch payments" },
      { name: "基础层", items: "local collection\nlocal clearing (DuitNow\nPromptPay / InstaPay)" },
    ]},
    { tier: "控制型", markets: "ID · VN", color: C.red, layers: [
      { name: "流动性层", items: "in-country pool\ndividend-loan calendar\ntrapped cash dashboard" },
      { name: "效率层", items: "pre-screened payments\nexport proceeds monitor\nvirtual sub-accounts" },
      { name: "基础层", items: "designated accounts\nunderlying doc workflow\nLCT / CNY corridor" },
    ]},
    { tier: "高风险", markets: "MM", color: "6C3483", layers: [
      { name: "治理层", items: "country rule engine\nbank contingency\nlimit management" },
      { name: "控制层", items: "payment-only\nprefunding model\nring-fencing" },
      { name: "基础层", items: "correspondent banking\naudit trail\nsanctions screening" },
    ]},
  ];

  tiers.forEach(({ tier, markets, color, layers }, i) => {
    const x = 0.3 + i * 3.2;
    box(s, x, 1.1, 3.0, 0.7, color);
    txt(s, tier, x, 1.1, 3.0, 0.4, { fs: 16, color: C.white, bold: true, align: "center" });
    txt(s, markets, x, 1.5, 3.0, 0.3, { fs: 10, color: C.white, align: "center" });
    layers.forEach(({ name, items }, j) => {
      const y = 2.0 + j * 1.7;
      const bg = j === 0 ? color : (j === 1 ? C.ltBlue : C.ltGray);
      box(s, x, y, 3.0, 1.5, bg, C.ltGray);
      txt(s, name, x + 0.1, y + 0.05, 2.8, 0.35, { fs: 11, color: j === 0 ? C.white : C.navy, bold: true });
      txt(s, items, x + 0.1, y + 0.4, 2.8, 1.0, { fs: 10, color: j === 0 ? C.white : C.gray, valign: "top" });
    });
  });

  box(s, 0.3, 7.0, 12.7, 0.4, C.ltGray);
  txt(s, "最容易被低估的产品不是现金池，而是 virtual account + 对账 + rule engine。",
    0.3, 7.0, 12.7, 0.4, { fs: 11, color: C.navy, bold: true, align: "center" });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — Recommended Architecture Diagram
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.offWhite };
  box(s, 0, 0, 13.33, 1.0, C.navy);
  txt(s, "推荐架构：区域中心 + 多个本地规则适配层", 0.4, 0.15, 12.5, 0.7,
    { font: "Georgia", fs: 22, color: C.white, bold: true });
  pageNum(s, 7);

  // China HQ
  box(s, 0.3, 1.2, 2.5, 1.5, C.navy);
  txt(s, "中国总部", 0.3, 1.2, 2.5, 0.5, { fs: 14, color: C.gold, bold: true, align: "center" });
  txt(s, "资金中心\n政策 / 额度\n组内借贷框架", 0.3, 1.7, 2.5, 1.0, { fs: 10, color: C.ltBlue, align: "center" });

  // Arrow to SG
  s.addShape(pptx.ShapeType.line, { x: 2.8, y: 1.95, w: 1.0, h: 0, line: { color: C.gold, width: 2 } });
  txt(s, "CNH/CNY ▶", 2.85, 1.7, 0.9, 0.25, { fs: 9, color: C.gold, align: "center" });

  // Singapore RTC
  box(s, 3.9, 1.0, 3.0, 1.9, C.green);
  txt(s, "推荐主中枢", 3.9, 1.0, 3.0, 0.35, { fs: 10, color: C.white, align: "center" });
  txt(s, "新加坡", 3.9, 1.35, 3.0, 0.5, { font: "Georgia", fs: 18, color: C.white, bold: true, align: "center" });
  txt(s, "区域财资中心\nRTC / POBO / ROBO\n多币种流动性管理\n区域 FX 与对冲", 3.9, 1.85, 3.0, 1.0, { fs: 10, color: C.white, align: "center" });

  // Arrow to AU/NZ
  s.addShape(pptx.ShapeType.line, { x: 6.9, y: 1.95, w: 1.0, h: 0, line: { color: C.gold, width: 2 } });
  txt(s, "AUD/NZD ▶", 6.95, 1.7, 0.9, 0.25, { fs: 9, color: C.gold, align: "center" });

  // AU/NZ
  box(s, 8.0, 1.0, 2.5, 1.9, "007DBA");
  txt(s, "第二核心", 8.0, 1.0, 2.5, 0.35, { fs: 10, color: C.white, align: "center" });
  txt(s, "澳大利亚/新西兰", 8.0, 1.35, 2.5, 0.5, { font: "Georgia", fs: 14, color: C.white, bold: true, align: "center" });
  txt(s, "本地融资、收付\n对冲与 reporting\nNPP / Osko", 8.0, 1.85, 2.5, 1.0, { fs: 10, color: C.white, align: "center" });

  // HK
  box(s, 10.7, 1.0, 2.3, 1.9, C.teal);
  txt(s, "CNH 枢纽", 10.7, 1.0, 2.3, 0.35, { fs: 10, color: C.white, align: "center" });
  txt(s, "香港", 10.7, 1.35, 2.3, 0.5, { font: "Georgia", fs: 16, color: C.white, bold: true, align: "center" });
  txt(s, "离岸人民币中心\nCIPS 直连\nCNH ↔ USD", 10.7, 1.85, 2.3, 1.0, { fs: 10, color: C.white, align: "center" });

  // Vertical line from SG down
  s.addShape(pptx.ShapeType.line, { x: 5.4, y: 2.9, w: 0, h: 0.8, line: { color: C.green, width: 2 } });

  // Managed markets row
  box(s, 0.3, 3.8, 6.2, 1.5, C.ltOrange, C.orange);
  txt(s, "管理型市场：MY / TH / PH / TW / KH", 0.4, 3.85, 6.0, 0.4, { fs: 12, color: C.orange, bold: true });
  txt(s, "可择优归集\nFCA/FCD / supporting docs / selective sweep / local treasury center\n文件驱动 + 规则内自动化", 0.4, 4.3, 6.0, 0.9, { fs: 10, color: C.gray, valign: "top" });

  // Controlled markets row
  box(s, 6.7, 3.8, 6.3, 1.5, C.ltRed, C.red);
  txt(s, "控制型市场：ID / VN", 6.8, 3.85, 6.0, 0.4, { fs: 12, color: C.red, bold: true });
  txt(s, "计划性释放\nin-country pool / dividend-loan calendar / trade-backed release / LCS-CNY\n先境内池、再定期释放", 6.8, 4.3, 6.0, 0.9, { fs: 10, color: C.gray, valign: "top" });

  // Arrows from SG to managed/controlled
  s.addShape(pptx.ShapeType.line, { x: 3.4, y: 3.7, w: 0, h: 0.1, line: { color: C.orange, width: 1.5 } });
  s.addShape(pptx.ShapeType.line, { x: 9.8, y: 3.7, w: 0, h: 0.1, line: { color: C.red, width: 1.5 } });

  // Bottom summary
  box(s, 0.3, 5.5, 12.7, 1.2, C.ltGray);
  txt(s, "结构口诀", 0.4, 5.55, 2.0, 0.4, { fs: 13, color: C.navy, bold: true });
  const rules = [
    { tier: "自由型", rule: "做「池」", color: C.green },
    { tier: "管理型", rule: "做「带文件的池」", color: C.orange },
    { tier: "控制型", rule: "做「带日历的池」", color: C.red },
    { tier: "高风险", rule: "做「带护城河的支付工厂」", color: "6C3483" },
  ];
  rules.forEach(({ tier, rule, color }, i) => {
    const x = 0.4 + i * 3.15;
    box(s, x, 6.0, 3.0, 0.55, color);
    txt(s, `${tier} → ${rule}`, x, 6.0, 3.0, 0.55, { fs: 11, color: C.white, bold: true, align: "center" });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 8 — Case Studies
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.offWhite };
  box(s, 0, 0, 13.33, 1.0, C.navy);
  txt(s, "公开案例启示：先把中心、账户、对账和规则搭起来", 0.4, 0.15, 12.5, 0.7,
    { font: "Georgia", fs: 22, color: C.white, bold: true });
  pageNum(s, 8);

  const cases = [
    { title: "制造业出海 × 渣打", type: "公开案例",
      scenario: "中资电子制造企业在越南+泰国+马来西亚设立生产基地，需要区域资金归集。",
      approach: "新加坡 RTC + 各国 USD 外币账户每日扫账 + 本地货币余额保留本地。",
      takeaway: "合规先行：提前 6 个月启动各国合规申请；分阶段实施，先自由市场再管制市场。" },
    { title: "科技企业 × HSBC", type: "公开案例",
      scenario: "中资 SaaS 企业在新加坡设立亚太区总部，需要多币种流动性管理。",
      approach: "新加坡 RTC + MAS 财资中心激励（税率 8%）+ 虚拟资金池 + HSBCnet 统一平台。",
      takeaway: "虚拟池规避了日韩外汇管制；MAS 激励计划申请需提前 6 个月准备。" },
    { title: "贸易企业 × HSBC", type: "公开案例",
      scenario: "中资大宗商品贸易企业，内地采购用人民币，东南亚销售用美元，汇率风险大。",
      approach: "香港 CNH 枢纽 + 新加坡 USD 区域池 + CIPS 直连内地 + 实时 FX 对冲。",
      takeaway: "香港是人民币跨境结算最优枢纽；CNH 与 CNY 汇差可创造套利机会。" },
    { title: "矿产贸易 × ANZ", type: "公开案例",
      scenario: "中资矿产企业进入澳新市场，需要本地即时收付和 AUSTRAC 合规。",
      approach: "ANZ Transactive Global + PayID 企业收款 + Osko 即时到账 + 澳新合并资金池。",
      takeaway: "ANZ 是澳新市场中资企业最佳合作伙伴；PayID 显著提升本地收款效率。" },
  ];

  cases.forEach(({ title, type, scenario, approach, takeaway }, i) => {
    const x = i < 2 ? 0.3 : 6.8;
    const y = i % 2 === 0 ? 1.1 : 4.2;
    box(s, x, y, 6.2, 2.9, C.white, C.ltGray);
    // Header
    box(s, x, y, 6.2, 0.5, C.teal);
    txt(s, title, x + 0.1, y + 0.05, 4.5, 0.4, { fs: 13, color: C.white, bold: true });
    txt(s, type, x + 4.8, y + 0.05, 1.3, 0.4, { fs: 10, color: C.gold, align: "right" });
    // Content
    txt(s, "场景", x + 0.1, y + 0.55, 0.8, 0.3, { fs: 10, color: C.navy, bold: true });
    txt(s, scenario, x + 0.9, y + 0.55, 5.1, 0.6, { fs: 10, color: C.gray, valign: "top" });
    txt(s, "做法", x + 0.1, y + 1.2, 0.8, 0.3, { fs: 10, color: C.navy, bold: true });
    txt(s, approach, x + 0.9, y + 1.2, 5.1, 0.6, { fs: 10, color: C.gray, valign: "top" });
    txt(s, "启示", x + 0.1, y + 1.85, 0.8, 0.3, { fs: 10, color: C.navy, bold: true });
    txt(s, takeaway, x + 0.9, y + 1.85, 5.1, 0.8, { fs: 10, color: C.green, valign: "top" });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 9 — ANZ NPP + Transactive Global + Bank Comparison
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.offWhite };
  box(s, 0, 0, 13.33, 1.0, "007DBA");
  txt(s, "ANZ 产品聚焦：Transactive Global + NPP 即时支付", 0.4, 0.15, 12.5, 0.7,
    { font: "Georgia", fs: 22, color: C.white, bold: true });
  pageNum(s, 9);

  // NPP stats
  const stats = [
    { num: "7×24", label: "全天候即时到账" },
    { num: "< 60s", label: "通常到账时间" },
    { num: "AUD 500", label: "跨境入境近实时上限" },
    { num: "400+", label: "已接入国际银行" },
  ];
  stats.forEach(({ num, label }, i) => {
    const x = 0.3 + i * 3.2;
    box(s, x, 1.1, 3.0, 1.0, C.navy);
    txt(s, num, x, 1.1, 3.0, 0.6, { font: "Georgia", fs: 24, color: C.gold, bold: true, align: "center" });
    txt(s, label, x, 1.7, 3.0, 0.4, { fs: 10, color: C.ltBlue, align: "center" });
  });

  // Transactive Global
  box(s, 0.3, 2.3, 6.2, 2.5, C.ltBlue, C.teal);
  txt(s, "ANZ Transactive Global", 0.4, 2.35, 6.0, 0.4, { fs: 14, color: C.navy, bold: true });
  txt(s, "• 多币种账户管理（单一平台）\n• 跨境付款：支持 30+ 货币\n• 实时汇率查询和 FX 交易\n• 批量付款：CSV 批量上传\n• 付款审批工作流：多级授权\n• API 集成：RESTful API，支持 ERP 直连\n• 市场：AU、NZ、CN、HK、IN、SG、VN、PH",
    0.4, 2.8, 6.0, 1.9, { fs: 10, color: C.gray, valign: "top" });

  // NPP detail
  box(s, 6.7, 2.3, 6.3, 2.5, C.ltBlue, C.teal);
  txt(s, "NPP 新支付平台（2024 年跨境新功能）", 6.8, 2.35, 6.0, 0.4, { fs: 14, color: C.navy, bold: true });
  txt(s, "• PayID：用手机号/邮箱/ABN 收款，无需账号\n• Osko：即时到账（< 60 秒），7×24 全天候\n• 2024.7：ANZ 首家通过 NPP 结算跨境交易\n• 2024.12：扩展至所有 AUD 清算服务客户\n• 跨境入境 AUD 500 以内近实时到账\n• 意义：跨境汇款速度接近国内转账体验",
    6.8, 2.8, 6.0, 1.9, { fs: 10, color: C.gray, valign: "top" });

  // Bank comparison table
  txt(s, "五家银行横向对比", 0.3, 5.0, 12.7, 0.4, { fs: 14, color: C.navy, bold: true });
  const bankRows = [
    ["银行", "覆盖市场", "核心平台", "亚太优势", "适合客群"],
    ["HSBC", "200+ 国家", "HSBCnet + API", "亚太最强本地网络，CNH 领先", "大型跨国企业"],
    ["渣打", "50+ 市场", "Straight2Bank", "新兴市场深耕，本地合规强", "中型企业，新兴市场"],
    ["花旗", "160+ 国家", "TreasuryVision", "全球覆盖最广，技术领先", "超大型跨国企业"],
    ["摩根大通", "120+ 货币", "ACCESS + JPM Coin", "机构级服务，信用评级最高", "机构级大型企业"],
    ["ANZ", "澳新+东南亚", "Transactive Global", "澳新市场份额最大，NPP 领先", "澳新业务中型企业"],
  ];
  bankRows.forEach((row, i) => {
    const y = 5.4 + i * 0.35;
    const bg = i === 0 ? C.teal : (i % 2 === 0 ? C.ltBlue : C.white);
    const fg = i === 0 ? C.white : C.gray;
    row.forEach((cell, j) => {
      const x = 0.3 + j * 2.54;
      box(s, x, y, 2.54, 0.35, bg, C.ltGray);
      txt(s, cell, x + 0.05, y, 2.44, 0.35, { fs: 9, color: fg, bold: i === 0 });
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 10 — 90-Day Roadmap
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.offWhite };
  box(s, 0, 0, 13.33, 1.0, C.navy);
  txt(s, "给一线和产品经理的 90 天推进法：先打地基，再试点，再扩展", 0.4, 0.15, 12.5, 0.7,
    { font: "Georgia", fs: 20, color: C.white, bold: true });
  pageNum(s, 10);

  const phases = [
    { num: "1", title: "0–30 天：把流向画出来", color: C.teal,
      items: "• 主体结构、账户、币种、收付路径\n• 监管限制、单证、注册、贷款/分红路径\n• 先定义哪些钱能动、哪些钱会困住",
      deliverable: "交付物：资金地图 + country matrix" },
    { num: "2", title: "31–60 天：先上基础层与效率层", color: C.green,
      items: "• SG/AU/NZ + MY/TH/PH 先 pilot\n• 账户开立、API/H2H、virtual account、自动对账\n• 单证模板、payment purpose 与 screening 固化",
      deliverable: "交付物：pilot 收付与对账上线" },
    { num: "3", title: "61–90 天：分层做流动性", color: C.gold,
      items: "• 自由型上 cross-border sweep / RTC\n• 控制型上 in-country pool + release calendar\n• 建立 country rule engine，给后续规模化留接口",
      deliverable: "交付物：分层流动性方案与规则引擎" },
  ];

  phases.forEach(({ num, title, color, items, deliverable }, i) => {
    const x = 0.3 + i * 4.3;
    // Number circle
    box(s, x + 1.5, 1.1, 0.7, 0.7, color);
    txt(s, num, x + 1.5, 1.1, 0.7, 0.7, { font: "Georgia", fs: 24, color: C.white, bold: true, align: "center" });
    // Arrow between phases
    if (i < 2) {
      s.addShape(pptx.ShapeType.line, { x: x + 3.9, y: 1.45, w: 0.7, h: 0, line: { color: C.gold, width: 2 } });
      txt(s, "▶", x + 4.3, 1.3, 0.3, 0.3, { fs: 14, color: C.gold });
    }
    // Content card
    box(s, x, 1.9, 4.1, 3.5, C.white, C.ltGray);
    box(s, x, 1.9, 4.1, 0.5, color);
    txt(s, title, x + 0.1, 1.95, 3.9, 0.4, { fs: 12, color: C.white, bold: true });
    txt(s, items, x + 0.1, 2.5, 3.9, 2.0, { fs: 10, color: C.gray, valign: "top" });
    box(s, x + 0.1, 4.6, 3.9, 0.6, C.ltBlue);
    txt(s, deliverable, x + 0.2, 4.6, 3.7, 0.6, { fs: 10, color: C.navy, bold: true });
  });

  // Red lines
  txt(s, "三条红线", 0.3, 5.6, 2.0, 0.4, { fs: 14, color: C.red, bold: true });
  const redLines = [
    "不要用「全区域一池」去卖控制型市场。",
    "不要把 TP / WHT / 关联借贷 / 净额结算意见留到最后。",
    "不要低估 sanctions / AML / 银行 KYC 对开户和付款时效的影响。",
  ];
  redLines.forEach((line, i) => {
    const x = 0.3 + i * 4.3;
    box(s, x, 6.0, 4.1, 0.8, C.ltRed, C.red);
    txt(s, `红线 ${i + 1}`, x + 0.1, 6.0, 1.0, 0.3, { fs: 10, color: C.red, bold: true });
    txt(s, line, x + 0.1, 6.3, 3.9, 0.5, { fs: 10, color: C.red, valign: "top" });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 11 — Summary & Close
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.darkBg };
  box(s, 0, 5.5, 13.33, 2.0, C.teal);

  txt(s, "总结", 0.7, 0.5, 12, 0.7, { font: "Georgia", fs: 32, color: C.white, bold: true });

  const points = [
    { title: "先分层，再配产品", body: "区域不是一个规则集，而是四层市场。同一套 cash pool 逻辑硬套到所有国家，通常就是项目翻车的开端。" },
    { title: "枢纽策略", body: "新加坡做区域财资中心，香港做人民币枢纽，澳新做开放型收付节点。管制市场用本地适配层。" },
    { title: "银行组合", body: "单一银行无法覆盖所有市场。HSBC/渣打覆盖亚太，ANZ 覆盖澳新，花旗/摩根大通覆盖全球。" },
    { title: "合规先行", body: "最好的跨境产品经理，不是把规则背下来的人；而是能把规则做进流程、参数和例外管理的人。" },
  ];
  points.forEach(({ title, body }, i) => {
    const y = 1.3 + i * 1.0;
    box(s, 0.6, y + 0.1, 0.35, 0.35, C.gold);
    txt(s, `${i + 1}`, 0.6, y + 0.1, 0.35, 0.35, { fs: 12, color: C.navy, bold: true, align: "center" });
    txt(s, title, 1.1, y + 0.05, 2.5, 0.4, { fs: 13, color: C.gold, bold: true });
    txt(s, body, 3.7, y + 0.05, 9.2, 0.4, { fs: 12, color: "A8C8E8" });
  });

  txt(s, "如有问题，请联系跨境业务团队", 0.7, 5.7, 8, 0.4, { fs: 13, color: C.white });
  txt(s, "基于公开监管文件与官方 FAQ 整理；实务请以当地银行、最新监管口径及法律/税务意见为准。",
    0.7, 6.2, 12, 0.4, { fs: 10, color: "A8C8E8", italic: true });
  pageNum(s, 11);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAVE
// ═══════════════════════════════════════════════════════════════════════════════
pptx.writeFile({ fileName: "/Users/proerror/Documents/redbook/docs/plans/cross-border-banking-v2.pptx" })
  .then(() => console.log("DONE: cross-border-banking-v2.pptx"))
  .catch(err => console.error("ERROR:", err));
