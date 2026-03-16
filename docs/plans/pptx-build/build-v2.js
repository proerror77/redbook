const PptxGenJS = require("pptxgenjs");
const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 inches

// ─── Color Palette ────────────────────────────────────────────────────────────
const C = {
  navy:    "1B3A6B",
  teal:    "1C7293",
  ltBlue:  "D6E8F5",
  white:   "FFFFFF",
  offWhite:"F4F7FB",
  gold:    "C9A84C",
  gray:    "5A6A7A",
  ltGray:  "E8EEF4",
  green:   "1A7A4A",
  ltGreen: "D4EDDA",
  orange:  "D4680A",
  ltOrange:"FDE8D0",
  red:     "C0392B",
  ltRed:   "FADBD8",
  darkBg:  "0D1B2A",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const box = (s, x, y, w, h, fill, line) =>
  s.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: fill }, line: line ? { color: line, pt: 1 } : { color: fill } });

const txt = (s, text, x, y, w, h, opts = {}) =>
  s.addText(text, { x, y, w, h, fontFace: opts.font || "Calibri", fontSize: opts.fs || 12,
    color: opts.color || C.gray, bold: opts.bold || false, italic: opts.italic || false,
    align: opts.align || "left", valign: opts.valign || "middle", wrap: true, ...opts });

const hdr = (s, text, x, y, w, h, opts = {}) =>
  txt(s, text, x, y, w, h, { font: "Georgia", fs: 28, color: C.navy, bold: true, ...opts });

const pageNum = (s, n, total = 44) =>
  txt(s, `${n} / ${total}`, 12.0, 7.1, 1.2, 0.3, { fs: 9, color: C.gray, align: "right" });

const divider = (s, ch, title, sub, n) => {
  s.background = { color: C.darkBg };
  box(s, 0, 3.5, 13.33, 0.06, C.gold);
  txt(s, `第 ${ch} 章`, 0.7, 1.6, 12, 0.5, { fs: 16, color: C.gold, bold: true });
  txt(s, title, 0.7, 2.1, 12, 1.0, { font: "Georgia", fs: 38, color: C.white, bold: true });
  txt(s, sub, 0.7, 3.2, 12, 0.5, { fs: 15, color: "A8C8E8" });
  pageNum(s, n);
};

// Tier badge
const tierBadge = (s, x, y, tier) => {
  const map = {
    "自由型":   { bg: C.green,  fg: C.white },
    "管理型":   { bg: C.orange, fg: C.white },
    "控制型":   { bg: C.red,    fg: C.white },
    "高风险":   { bg: "6C3483", fg: C.white },
  };
  const { bg, fg } = map[tier] || { bg: C.gray, fg: C.white };
  box(s, x, y, 1.4, 0.38, bg);
  txt(s, tier, x, y, 1.4, 0.38, { fs: 11, color: fg, bold: true, align: "center" });
};

// Market matrix row
const matrixRow = (s, y, market, tier, restriction, poolMeaning, products, position, tierColor) => {
  const cols = [0.3, 1.8, 3.5, 5.8, 8.5, 10.8];
  const widths = [1.4, 1.6, 2.2, 2.6, 2.2, 2.3];
  [market, tier, restriction, poolMeaning, products, position].forEach((cell, i) => {
    box(s, cols[i], y, widths[i], 0.82, i === 0 ? tierColor : (i % 2 === 0 ? C.ltBlue : C.offWhite), C.ltGray);
    txt(s, cell, cols[i] + 0.05, y + 0.04, widths[i] - 0.1, 0.74,
      { fs: i === 0 ? 12 : 10, color: i === 0 ? C.white : C.gray, bold: i === 0, valign: "top" });
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — Cover
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.darkBg };
  // Gold accent bar
  box(s, 0, 5.6, 13.33, 0.08, C.gold);
  // Title
  txt(s, "跨境收付款合规与资金池管理", 0.7, 1.0, 12, 1.1,
    { font: "Georgia", fs: 40, color: C.white, bold: true });
  txt(s, "东南亚 · 香港 · 台湾 · 澳大利亚 · 新西兰", 0.7, 2.2, 12, 0.6,
    { fs: 22, color: C.gold });
  txt(s, "Cross-Border Payments & Cash Pooling — Internal Training", 0.7, 2.9, 12, 0.5,
    { fs: 15, color: "A8C8E8", italic: true });
  // Bottom bar
  box(s, 0, 5.7, 13.33, 1.8, C.teal);
  txt(s, "适用对象：跨境业务专员 · 产品经理", 0.7, 5.85, 8, 0.4,
    { fs: 13, color: C.white });
  txt(s, "2026 年 3 月", 0.7, 6.3, 4, 0.35, { fs: 12, color: "D6E8F5" });
  txt(s, "基于公开监管文件与官方 FAQ 整理", 9.0, 6.3, 4.0, 0.35,
    { fs: 10, color: "D6E8F5", italic: true, align: "right" });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — Executive Summary (5 key judgments)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.offWhite };
  box(s, 0, 0, 13.33, 1.0, C.navy);
  txt(s, "一页看懂：给银行前台与产品经理的 5 个判断", 0.4, 0.15, 12.5, 0.7,
    { font: "Georgia", fs: 22, color: C.white, bold: true });
  pageNum(s, 2);

  const points = [
    { n: "1", title: "区域财资中心优先放新加坡", body: "新加坡无外汇管制，MAS 监管透明，税务优惠，是中资企业亚太区资金池的首选枢纽。澳洲/新西兰更适合承接开放型收付、融资与 FX hub。" },
    { n: "2", title: "马来西亚、泰国可做区域运营，但需文件驱动", body: "MYR 不可离岸交割，THB 有用途限制。需把用途证明、FX notices、银行审核写进标准流程，不能粗暴复制新加坡模板。" },
    { n: "3", title: "印尼、越南不是不能做，而是不能用开放市场模板", body: "IDR 本地化强制要求，VND 不可自由兑换。更适合先做境内集中与定期释放，不适合承诺每日自动跨境 sweep。" },
    { n: "4", title: "香港是离岸人民币的核心枢纽", body: "全球最大 CNH 中心，CIPS 直连内地，跨境人民币资金池可行。中资企业出海的人民币结算首选地。" },
    { n: "5", title: "资金池的价值不只是归集", body: "账户可视、净额结算、授信与避险一体化才是真正的价值。最容易被低估的产品是 virtual account + 对账 + rule engine。" },
  ];
  points.forEach(({ n, title, body }, i) => {
    const x = i < 3 ? 0.3 : 6.8;
    const y = i < 3 ? 1.1 + i * 1.9 : 1.1 + (i - 3) * 1.9;
    box(s, x, y, 6.1, 1.7, C.white, C.ltGray);
    box(s, x, y, 0.5, 1.7, C.navy);
    txt(s, n, x, y, 0.5, 1.7, { fs: 20, color: C.gold, bold: true, align: "center" });
    txt(s, title, x + 0.6, y + 0.1, 5.3, 0.45, { fs: 13, color: C.navy, bold: true });
    txt(s, body, x + 0.6, y + 0.6, 5.3, 1.0, { fs: 11, color: C.gray, valign: "top" });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — Market Tier Framework (Visual)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.offWhite };
  box(s, 0, 0, 13.33, 1.0, C.navy);
  txt(s, "区域分层：监管强度 × 资金池可行性 — 两条不同坐标轴", 0.4, 0.15, 12.5, 0.7,
    { font: "Georgia", fs: 20, color: C.white, bold: true });
  pageNum(s, 3);

  // Y-axis label
  txt(s, "区域资金池可行性 ↑", 0.1, 1.5, 0.5, 4.5,
    { fs: 10, color: C.gray, align: "center" });

  // X-axis label
  txt(s, "监管 / 外汇限制强度 →", 1.5, 7.0, 10, 0.35,
    { fs: 10, color: C.gray, align: "center" });

  // Quadrant backgrounds
  box(s, 0.7, 1.1, 5.8, 2.8, C.ltGreen, C.green);   // top-left: free
  box(s, 6.7, 1.1, 6.3, 2.8, C.ltOrange, C.orange); // top-right: managed
  box(s, 0.7, 4.1, 5.8, 2.7, C.ltOrange, C.orange); // bottom-left: managed
  box(s, 6.7, 4.1, 6.3, 2.7, C.ltRed, C.red);       // bottom-right: controlled

  // Quadrant labels
  txt(s, "自由型：可以上 full toolkit", 0.9, 1.15, 5.4, 0.4,
    { fs: 12, color: C.green, bold: true });
  txt(s, "RTC / POBO / ROBO / notional / physical sweep / FX center", 0.9, 1.55, 5.4, 0.5,
    { fs: 10, color: C.green });
  txt(s, "管理型：文件驱动", 6.9, 1.15, 5.9, 0.4,
    { fs: 12, color: C.orange, bold: true });
  txt(s, "supporting docs / FCA-FCD / selective sweep / local rules first", 6.9, 1.55, 5.9, 0.5,
    { fs: 10, color: C.orange });
  txt(s, "管理型：先境内、后跨境", 0.9, 4.15, 5.4, 0.4,
    { fs: 12, color: C.orange, bold: true });
  txt(s, "in-country pool / dividend-loan calendar / LCS-CNY / trapped cash", 0.9, 4.55, 5.4, 0.5,
    { fs: 10, color: C.orange });
  txt(s, "控制型：先活着回款", 6.9, 4.15, 5.9, 0.4,
    { fs: 12, color: C.red, bold: true });
  txt(s, "payment-only / prefunding / contingency banking / ring-fencing", 6.9, 4.55, 5.9, 0.5,
    { fs: 10, color: C.red });

  // Market bubbles
  const markets = [
    { name: "SG", x: 1.5, y: 2.0, color: C.green },
    { name: "AU", x: 2.5, y: 2.3, color: C.green },
    { name: "NZ", x: 3.3, y: 2.6, color: C.green },
    { name: "HK", x: 4.2, y: 1.8, color: C.green },
    { name: "BN", x: 5.2, y: 3.2, color: C.green },
    { name: "MY", x: 7.5, y: 1.8, color: C.orange },
    { name: "TH", x: 8.5, y: 2.2, color: C.orange },
    { name: "PH", x: 9.5, y: 2.6, color: C.orange },
    { name: "KH", x: 10.5, y: 3.0, color: C.orange },
    { name: "TW", x: 7.0, y: 4.8, color: C.orange },
    { name: "ID", x: 8.0, y: 5.2, color: C.red },
    { name: "VN", x: 9.2, y: 5.5, color: C.red },
    { name: "LA", x: 10.3, y: 5.8, color: C.red },
    { name: "MM", x: 11.3, y: 6.0, color: "6C3483" },
  ];
  markets.forEach(({ name, x, y, color }) => {
    box(s, x - 0.3, y - 0.22, 0.6, 0.44, color);
    txt(s, name, x - 0.3, y - 0.22, 0.6, 0.44,
      { fs: 11, color: C.white, bold: true, align: "center" });
  });

  // Note
  txt(s, "读图要点：AU/NZ 与 SG 同属高可行性，但实操关注点从「外汇限制」转向 AML/sanctions/tax。ID/VN/LA 更适合先做境内集中与定期释放。",
    0.7, 6.6, 12.3, 0.5, { fs: 10, color: C.gray, italic: true });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — Market Matrix I: SG / HK / TW / AU / NZ
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.offWhite };
  box(s, 0, 0, 13.33, 1.0, C.navy);
  txt(s, "国家快照 I：自由型市场 — 新加坡、香港、台湾、澳大利亚、新西兰", 0.4, 0.15, 12.5, 0.7,
    { font: "Georgia", fs: 19, color: C.white, bold: true });
  pageNum(s, 4);

  // Table header
  const headers = ["市场", "监管层级", "主要限制 / Policy", "对资金池的含义", "银行可卖产品", "建议定位"];
  const cols = [0.3, 1.75, 3.4, 6.0, 9.0, 11.2];
  const widths = [1.35, 1.55, 2.5, 2.9, 2.1, 2.0];
  headers.forEach((h, i) => {
    box(s, cols[i], 1.05, widths[i], 0.42, C.teal);
    txt(s, h, cols[i] + 0.05, 1.05, widths[i] - 0.1, 0.42,
      { fs: 11, color: C.white, bold: true, align: "center" });
  });

  const rows = [
    { market: "新加坡\nSG", tier: C.green,
      restriction: "无外汇管制；PSA 2019 规范支付机构；AML/CTF 严格",
      pool: "最适合作区域财资中心、header account、内部 netting 与多币种流动性管理",
      products: "多币种账户\nnotional/physical pool\nPOBO/ROBO\nRMB/FX 套保",
      position: "RTC / Header\n区域枢纽" },
    { market: "香港\nHK", tier: C.green,
      restriction: "港元联系汇率；无外汇管制；全球最大 CNH 中心；CIPS 直连内地",
      pool: "离岸人民币结算首选；内地-香港跨境人民币资金池可行（需 SAFE 批准）",
      products: "CNH 账户\n跨境人民币池\nFPS 转数快\nCIPS 直连",
      position: "CNH 枢纽\n人民币结算" },
    { market: "台湾\nTW", tier: C.orange,
      restriction: "TWD 受管制；居民年度汇出上限 USD 5,000 万；OBU 账户不受限",
      pool: "通过 OBU 账户操作跨境资金，规避新台币管制；中资背景需注意投资审查",
      products: "OBU 多币种账户\n跨境汇款\nFX 套保",
      position: "OBU 通道\n规则内操作" },
    { market: "澳大利亚\nAU", tier: C.green,
      restriction: "无外汇管制；AUSTRAC AML/CTF 严格；AUD 10,000+ 跨境须 IFTI 报告",
      pool: "最适合承接开放型 sweep、融资、区域授信与套保；NPP 即时支付基础设施领先",
      products: "cash concentration\nNPP/PayID/Osko\n应付工厂\n授信/套保",
      position: "开放节点\nANZ 首选" },
    { market: "新西兰\nNZ", tier: C.green,
      restriction: "无外汇管制；与澳洲高度互通；Trans-Tasman 协议；AML/CFT 要求",
      pool: "与澳洲组合设计最自然，可作为 ANZ 子区域开放节点，方便 dividend、loan servicing",
      products: "ANZ 一体化账户\n开放型归集\n批量付款",
      position: "澳新一体化\n子区域节点" },
  ];

  rows.forEach(({ market, tier, restriction, pool, products, position }, i) => {
    const y = 1.52 + i * 1.05;
    const rowBg = i % 2 === 0 ? C.white : C.ltBlue;
    [market, "", restriction, pool, products, position].forEach((cell, j) => {
      box(s, cols[j], y, widths[j], 1.0, j === 0 ? tier : rowBg, C.ltGray);
      txt(s, cell, cols[j] + 0.05, y + 0.04, widths[j] - 0.1, 0.92,
        { fs: j === 0 ? 12 : 9.5, color: j === 0 ? C.white : C.gray, bold: j === 0, valign: "top" });
    });
  });

  txt(s, "截至 2026 年 3 月公开监管与银行披露；落地以当地银行 KYC / 制裁 / 最新监管口径为准。",
    0.3, 7.1, 12.7, 0.3, { fs: 9, color: C.gray, italic: true });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — Market Matrix II: MY / TH / ID / VN / PH
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.offWhite };
  box(s, 0, 0, 13.33, 1.0, C.navy);
  txt(s, "国家快照 II：管理型 & 控制型市场 — 马来西亚、泰国、印尼、越南、菲律宾", 0.4, 0.15, 12.5, 0.7,
    { font: "Georgia", fs: 18, color: C.white, bold: true });
  pageNum(s, 5);

  const headers = ["市场", "监管层级", "主要限制 / Policy", "对资金池的含义", "银行可卖产品", "建议定位"];
  const cols = [0.3, 1.75, 3.4, 6.0, 9.0, 11.2];
  const widths = [1.35, 1.55, 2.5, 2.9, 2.1, 2.0];
  headers.forEach((h, i) => {
    box(s, cols[i], 1.05, widths[i], 0.42, C.teal);
    txt(s, h, cols[i] + 0.05, 1.05, widths[i] - 0.1, 0.42,
      { fs: 11, color: C.white, bold: true, align: "center" });
  });

  const rows = [
    { market: "马来西亚\nMY", tier: C.orange,
      restriction: "MYR 不可离岸交割；FEP 管理经常项；居民年度对外投资上限 MYR 5,000 万",
      pool: "可做区域运营与本地归集，但需把 borrowing/guarantee/hedging 规则嵌入流程；不能完全自由 sweep",
      products: "本地收付\n文档校验\nonshore FX\n贸易融资",
      position: "规则内自动化\n本地归集" },
    { market: "泰国\nTH", tier: C.orange,
      restriction: "THB 受管制；超 USD 50,000 需 FET 表格；FCD 账户有使用限制；资金汇出需证明文件",
      pool: "适合做本地 FCD + 区域付款中心；不宜把泰国账户当成完全自由的跨实体 cash hub",
      products: "FCD 账户\n批量付款\n本地清算接入\nFX 套保",
      position: "半集中\n文件驱动" },
    { market: "印度尼西亚\nID", tier: C.red,
      restriction: "IDR 本地化强制；2024 年新外汇法加强管控；资源类出口回款须 100% 存放 12 个月",
      pool: "更适合 ring-fenced liquidity；先做可视化与净额结算，再谈集中归集；矿业客户需分行业处理",
      products: "预审付款\n出口收入监测\n虚拟子账\nLCT corridor",
      position: "Ring-fenced\n境内池优先" },
    { market: "越南\nVN", tier: C.red,
      restriction: "VND 不可自由兑换；FIE 资本账户 + 经常账户分离；USD 1,000+ 须向 SBV 报告",
      pool: "不宜假设自由归集；更适合"专户 + 真实性单证 + 资金用途映射"；区域池应把越南作为受控节点",
      products: "资本金账户支持\n预审式付款\nODI 路径设计\nFX 风险管理",
      position: "受控节点\n定期释放" },
    { market: "菲律宾\nPH", tier: C.orange,
      restriction: "PHP 跨境转移超 PHP 50,000 需 BSP 授权；对外投资超 USD 6,000 万需事先批准",
      pool: "可做区域营业收付与批量付款，但本币跨境限制意味着 pool 更适合以外币/镜像账户方式设计",
      products: "本地 ACH/InstaPay\n外币账户\n批量付款\nFX purchase workflow",
      position: "镜像池/外币\n区域收付" },
  ];

  rows.forEach(({ market, tier, restriction, pool, products, position }, i) => {
    const y = 1.52 + i * 1.05;
    const rowBg = i % 2 === 0 ? C.white : C.ltBlue;
    [market, "", restriction, pool, products, position].forEach((cell, j) => {
      box(s, cols[j], y, widths[j], 1.0, j === 0 ? tier : rowBg, C.ltGray);
      txt(s, cell, cols[j] + 0.05, y + 0.04, widths[j] - 0.1, 0.92,
        { fs: j === 0 ? 12 : 9.5, color: j === 0 ? C.white : C.gray, bold: j === 0, valign: "top" });
    });
  });

  txt(s, "截至 2026 年 3 月公开监管与银行披露；落地以当地银行 KYC / 制裁 / 最新监管口径为准。",
    0.3, 7.1, 12.7, 0.3, { fs: 9, color: C.gray, italic: true });
}
