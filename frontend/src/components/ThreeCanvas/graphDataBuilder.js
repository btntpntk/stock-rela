// graphDataBuilder.js — pure functions converting rawData into NodeDatum[] / EdgeDatum[]
// Ported from GraphController.jsx; returns plain arrays instead of Graphology objects.

function gaussianJitter(scale = 80) {
  // Box-Muller transform
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * scale;
}

function scenarioColor(nodeId, nodeType, rawData, scenarioFactorId) {
  if (!scenarioFactorId) return null;
  const stockProp = {};
  rawData.edges
    .filter(e => e.relType === "MACRO_FACTOR" && e.target === scenarioFactorId)
    .forEach(e => { stockProp[e.source] = e.proportionality ?? ""; });

  if (nodeType === "Stock") {
    const p = stockProp[nodeId];
    if (!p) return null;
    return p.toLowerCase().includes("invers") ? "#eb5757" : "#6fcf97";
  }
  if (nodeType === "SupplyChain") {
    const members = rawData.edges
      .filter(e => e.relType === "CHAIN_MEMBER" && e.source === nodeId)
      .map(e => e.target);
    const affected = members.filter(m => stockProp[m]);
    if (!affected.length) return null;
    const inv = affected.filter(m => stockProp[m].toLowerCase().includes("invers")).length;
    const prop = affected.length - inv;
    if (inv > prop) return "#eb5757";
    if (prop > inv) return "#6fcf97";
    return "#f4d03f";
  }
  return null;
}

// ── Overview ─────────────────────────────────────────────────────────────────

export function buildOverviewData(rawData, scenarioFactorId) {
  const nodes = [];
  const edges = [];

  const rootNode = rawData.nodes.find(n => n.nodeType === "GlobalMacroRoot");
  const macros   = rawData.nodes.filter(n => n.nodeType === "GlobalMacro");
  const chains   = rawData.nodes.filter(n => n.nodeType === "SupplyChain");
  const fiEdges  = rawData.edges.filter(e => e.relType === "FEEDS_INTO");
  const catEdges = rawData.edges.filter(e => e.relType === "CAT_CHAIN");

  const R_MID   = 230;
  const R_OUTER = 560;
  const SECTOR  = (2 * Math.PI) / Math.max(macros.length, 1);

  if (rootNode) {
    nodes.push({ id: rootNode.id, nodeType: rootNode.nodeType, label: rootNode.label,
      x: 0, y: 0, z: 0, size: 30, color: rootNode.color ?? "#1a1a2e" });
  }

  const chainsByMacro = {};
  macros.forEach(m => { chainsByMacro[m.id] = []; });
  catEdges.forEach(e => { if (chainsByMacro[e.source]) chainsByMacro[e.source].push(e.target); });

  macros.forEach((macro, i) => {
    const angle = i * SECTOR - Math.PI / 2;
    nodes.push({ id: macro.id, nodeType: macro.nodeType, label: macro.label,
      x: Math.cos(angle) * R_MID, y: Math.sin(angle) * R_MID, z: gaussianJitter(40),
      size: 20, color: macro.color ?? "#888888" });
    if (rootNode) {
      edges.push({ source: rootNode.id, target: macro.id,
        color: "rgba(120,120,140,0.85)", thickness: 2.2, relType: "ROOT_MACRO", dashed: false });
    }
  });

  const orderedChains = [];
  macros.forEach(macro => {
    (chainsByMacro[macro.id] ?? [])
      .map(id => chains.find(c => c.id === id)).filter(Boolean)
      .forEach(chain => orderedChains.push(chain));
  });

  const total = orderedChains.length || 1;
  orderedChains.forEach((chain, i) => {
    const chainAngle  = (i / total) * 2 * Math.PI - Math.PI / 2;
    const memberCount = rawData.edges.filter(e => e.relType === "CHAIN_MEMBER" && e.source === chain.id).length;
    const sc = scenarioColor(chain.id, "SupplyChain", rawData, scenarioFactorId);
    nodes.push({ id: chain.id, nodeType: chain.nodeType, label: chain.label,
      x: Math.cos(chainAngle) * R_OUTER, y: Math.sin(chainAngle) * R_OUTER, z: gaussianJitter(60),
      size: 8 + memberCount * 1.1, color: sc ?? chain.color ?? "#888888" });
  });

  catEdges.forEach((e, i) => {
    const macroNode = rawData.nodes.find(n => n.id === e.source);
    edges.push({ source: e.source, target: e.target, id: `cat${i}`,
      color: (macroNode?.color ?? "#888") + "bb", thickness: 2.2,
      relType: "CAT_CHAIN", dashed: false });
  });

  fiEdges.forEach((e, i) => {
    edges.push({ source: e.source, target: e.target, id: `fi${i}`,
      color: "rgba(160,120,0,0.75)", thickness: 0.5,
      relType: "FEEDS_INTO", dashed: true,
      relation: e.relation ?? "", note: e.note ?? "" });
  });

  return { nodes, edges };
}

// ── Chain ─────────────────────────────────────────────────────────────────────

export function buildChainData(rawData, chainId, scenarioFactorId) {
  const nodes = [];
  const edges = [];
  const addedIds = new Set();

  const chainNode = rawData.nodes.find(n => n.id === chainId);
  if (!chainNode) return { nodes, edges };

  const memberIds = rawData.edges
    .filter(e => e.relType === "CHAIN_MEMBER" && e.source === chainId)
    .map(e => e.target);
  const memberSet = new Set(memberIds);

  const fiEdges = rawData.edges.filter(e =>
    e.relType === "FEEDS_INTO" && (e.source === chainId || e.target === chainId));
  const adjIds = fiEdges.map(e => e.source === chainId ? e.target : e.source);

  nodes.push({ id: chainId, nodeType: chainNode.nodeType, label: chainNode.label,
    x: 0, y: 0, z: 0, size: 18, color: "#121212" });
  addedIds.add(chainId);

  const R = memberIds.length <= 6 ? 340 : 430;
  memberIds.forEach((sId, i) => {
    const angle = (i / Math.max(memberIds.length, 1)) * 2 * Math.PI - Math.PI / 2;
    const sNode = rawData.nodes.find(n => n.id === sId);
    if (!sNode) return;
    const sc = scenarioColor(sId, "Stock", rawData, scenarioFactorId);
    nodes.push({ id: sId, nodeType: sNode.nodeType, label: sNode.ticker ?? sId,
      x: Math.cos(angle) * R, y: Math.sin(angle) * R, z: gaussianJitter(80),
      size: 11, color: sc ?? "#121212", ticker: sNode.ticker });
    addedIds.add(sId);
    edges.push({ source: chainId, target: sId,
      color: "rgba(100,100,100,0.65)", thickness: 1.3, relType: "CHAIN_MEMBER", dashed: false });
  });

  adjIds.forEach((cId, i) => {
    if (addedIds.has(cId)) return;
    const ac = rawData.nodes.find(n => n.id === cId);
    if (!ac) return;
    const angle = (i / Math.max(adjIds.length, 1)) * 2 * Math.PI + Math.PI * 0.15;
    const R2 = R + 310;
    nodes.push({ id: cId, nodeType: ac.nodeType, label: ac.label,
      x: Math.cos(angle) * R2, y: Math.sin(angle) * R2, z: gaussianJitter(80),
      size: 9, color: "#AAAAAA" });
    addedIds.add(cId);
  });

  fiEdges.forEach((e, i) => {
    if (!addedIds.has(e.source) || !addedIds.has(e.target)) return;
    edges.push({ source: e.source, target: e.target, id: `fi${i}`,
      color: "rgba(160,120,0,0.80)", thickness: 1.8,
      relType: "FEEDS_INTO", dashed: true, relation: e.relation ?? "" });
  });

  const seen = new Set();
  rawData.edges.filter(e =>
    memberSet.has(e.source) && memberSet.has(e.target) &&
    ["SUPPLY_CHAIN", "COMPETITOR", "EQUITY_HOLDING"].includes(e.relType)
  ).forEach(e => {
    if (!addedIds.has(e.source) || !addedIds.has(e.target)) return;
    const k = `${e.source}||${e.target}`;
    if (seen.has(k)) return;
    seen.add(k);
    const color = {
      SUPPLY_CHAIN:   "rgba(247,162,79,0.85)",
      COMPETITOR:     "rgba(235,87,87,0.85)",
      EQUITY_HOLDING: "rgba(187,107,217,0.85)",
    }[e.relType] ?? "rgba(100,100,100,0.65)";
    edges.push({ source: e.source, target: e.target,
      color, thickness: 1.6, relType: e.relType, dashed: false, note: e.note ?? "" });
  });

  return { nodes, edges };
}

// ── Ego ───────────────────────────────────────────────────────────────────────

export const EGO_COLORS = {
  MACRO_FACTOR:       "#6fcf97",
  FINANCIAL_RELATION: "#4f8ef7",
  SUPPLY_CHAIN:       "#f7a24f",
  EQUITY_HOLDING:     "#bb6bd9",
  COMPETITOR:         "#eb5757",
};

const CATEGORY_LABELS = {
  COMPETITOR:         "Competitors",
  FINANCIAL_RELATION: "Financials",
  SUPPLY_CHAIN:       "Supply Chain",
  EQUITY_HOLDING:     "Equity Holdings",
  MACRO_FACTOR:       "Macro Drivers",
};

const CAT_ORDER = ["COMPETITOR", "FINANCIAL_RELATION", "SUPPLY_CHAIN", "EQUITY_HOLDING", "MACRO_FACTOR"];
const SKIP_REL  = new Set(["CHAIN_MEMBER", "FEEDS_INTO", "MACRO_CHAIN", "ROOT_CAT", "CAT_MACRO", "CAT_CHAIN", "ROOT_MACRO"]);

export function buildEgoData(rawData, stockId, scenarioFactorId) {
  const nodes = [];
  const edges = [];
  const addedIds = new Set();

  const stockNode = rawData.nodes.find(n => n.id === stockId);
  if (!stockNode) return { nodes, edges };

  const relEdges = rawData.edges.filter(e =>
    (e.source === stockId || e.target === stockId) && !SKIP_REL.has(e.relType));

  nodes.push({ id: stockId, nodeType: stockNode.nodeType, label: stockNode.ticker ?? stockId,
    x: 0, y: 0, z: 0, size: 20, color: "#121212", ticker: stockNode.ticker, isEgo: true });
  addedIds.add(stockId);

  const byType = {};
  relEdges.forEach(e => {
    const peerId = e.source === stockId ? e.target : e.source;
    if (!byType[e.relType]) byType[e.relType] = [];
    if (!byType[e.relType].find(x => x.id === peerId))
      byType[e.relType].push({ id: peerId, edge: e });
  });

  const activeCategories = CAT_ORDER.filter(rt => byType[rt]?.length > 0);
  const catCount = activeCategories.length || 1;
  const R1 = 220;
  const R2 = 460;

  activeCategories.forEach((relType, catIdx) => {
    const peers     = byType[relType];
    const catAngle  = (catIdx / catCount) * 2 * Math.PI - Math.PI / 2;
    const catColor  = EGO_COLORS[relType] ?? "#888888";
    const catNodeId = `__cat__${relType}`;

    nodes.push({ id: catNodeId, nodeType: "Category", catRelType: relType,
      label: CATEGORY_LABELS[relType] ?? relType, size: 13, color: catColor,
      x: Math.cos(catAngle) * R1, y: Math.sin(catAngle) * R1, z: gaussianJitter(30) });
    addedIds.add(catNodeId);

    edges.push({ source: stockId, target: catNodeId,
      color: "rgba(170,170,170,0.85)", thickness: 1.2, relType: "CAT_LINK", dashed: false });

    const fanSpread = Math.min(Math.PI * 0.65, peers.length * 0.28);
    peers.forEach(({ id, edge }, i) => {
      const peerAngle = peers.length === 1
        ? catAngle
        : catAngle - fanSpread / 2 + (i / (peers.length - 1)) * fanSpread;

      if (!addedIds.has(id)) {
        const peerNode = rawData.nodes.find(n => n.id === id);
        nodes.push({ id, nodeType: peerNode?.nodeType ?? "Stock",
          label: peerNode?.ticker ?? peerNode?.factor ?? peerNode?.name ?? id,
          x: Math.cos(peerAngle) * R2, y: Math.sin(peerAngle) * R2, z: gaussianJitter(80),
          size: relType === "MACRO_FACTOR" ? 8 : 9, color: "#121212",
          ticker: peerNode?.ticker });
        addedIds.add(id);
      }

      edges.push({
        source: catNodeId, target: id,
        color: catColor + "cc", thickness: relType === "MACRO_FACTOR" ? 1.2 : 1.8,
        relType: edge.relType, dashed: edge.relType === "GRANGER_CAUSALITY",
        proportionality: edge.proportionality, relation: edge.relation,
        ownership_pct: edge.ownership_pct, note: edge.note, logic: edge.logic,
      });
    });
  });

  return { nodes, edges };
}

// ── Router ────────────────────────────────────────────────────────────────────

export function buildGraphData(mode, rawData, { activeChainId, activeStockId, scenarioFactorId } = {}) {
  if (!rawData) return { nodes: [], edges: [] };
  if (mode === "chain" && activeChainId)
    return buildChainData(rawData, activeChainId, scenarioFactorId);
  if (mode === "ego" && activeStockId)
    return buildEgoData(rawData, activeStockId, scenarioFactorId);
  return buildOverviewData(rawData, scenarioFactorId);
}
