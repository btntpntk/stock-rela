import { useEffect, useRef } from "react";
import Graphology from "graphology";
import { useSigma, useLoadGraph, useRegisterEvents } from "@react-sigma/core";

const MultiDirectedGraph = Graphology.MultiDirectedGraph;

// ── Scenario coloring ────────────────────────────────────────────────────────

function scenarioColor(nodeId, nodeType, rawData, scenarioFactorId) {
  if (!scenarioFactorId) return null;

  // Map stock → proportionality for the selected factor
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
    const inv  = affected.filter(m => stockProp[m].toLowerCase().includes("invers")).length;
    const prop = affected.length - inv;
    if (inv > prop) return "#eb5757";
    if (prop > inv) return "#6fcf97";
    return "#f4d03f";
  }

  return null;
}

// ── DAG level computation ─────────────────────────────────────────────────────

function computeDAGLevels(chains, feedsIntoEdges) {
  const ids = new Set(chains.map(c => c.id));
  const hasIncoming = new Set();
  feedsIntoEdges.forEach(e => { if (ids.has(e.target)) hasIncoming.add(e.target); });

  const levels = {};
  chains.forEach(c => { if (!hasIncoming.has(c.id)) levels[c.id] = 0; });

  // Longest-path propagation — handles DAGs and gracefully caps cycles
  for (let iter = 0; iter < chains.length * 2; iter++) {
    let changed = false;
    feedsIntoEdges.forEach(e => {
      if (!ids.has(e.source) || !ids.has(e.target)) return;
      if (levels[e.source] === undefined) return;
      const nl = levels[e.source] + 1;
      if (levels[e.target] === undefined || nl > levels[e.target]) {
        levels[e.target] = nl;
        changed = true;
      }
    });
    if (!changed) break;
  }
  chains.forEach(c => { if (levels[c.id] === undefined) levels[c.id] = 0; });
  return levels;
}

// ── Mode 1: Overview — 3-ring concentric circles ────────────────────────────
//   Ring 0 (center):  GlobalMacroRoot  — single node at origin
//   Ring 1 (middle):  GlobalMacro      — 6 nodes, evenly spaced
//   Ring 2 (outer):   SupplyChain      — grouped in their macro's 60° sector

function buildOverviewGraph(rawData, scenarioFactorId) {
  const graph    = new MultiDirectedGraph();
  const rootNode = rawData.nodes.find(n => n.nodeType === "GlobalMacroRoot");
  const macros   = rawData.nodes.filter(n => n.nodeType === "GlobalMacro");
  const chains   = rawData.nodes.filter(n => n.nodeType === "SupplyChain");
  const fiEdges  = rawData.edges.filter(e => e.relType === "FEEDS_INTO");
  const catEdges = rawData.edges.filter(e => e.relType === "CAT_CHAIN");

  const R_MID   = 230;   // GlobalMacro ring
  const R_OUTER = 560;   // SupplyChain ring
  const SECTOR  = (2 * Math.PI) / Math.max(macros.length, 1);

  // ── Ring 0: root ────────────────────────────────────────────────────────────
  if (rootNode) {
    graph.addNode(rootNode.id, {
      ...rootNode, label: rootNode.label,
      size: 30, color: rootNode.color ?? "#1a1a2e",
      x: 0, y: 0,
    });
  }

  // ── Build macro→chains lookup ────────────────────────────────────────────────
  const chainsByMacro = {};
  macros.forEach(m => { chainsByMacro[m.id] = []; });
  catEdges.forEach(e => {
    if (chainsByMacro[e.source]) chainsByMacro[e.source].push(e.target);
  });

  // ── Ring 1: GlobalMacro nodes (evenly spaced) ────────────────────────────────
  macros.forEach((macro, i) => {
    const angle = i * SECTOR - Math.PI / 2;
    graph.addNode(macro.id, {
      ...macro, label: macro.label,
      size: 20, color: macro.color ?? "#888888",
      x: Math.cos(angle) * R_MID,
      y: Math.sin(angle) * R_MID,
    });

    // Spoke: root → macro
    if (rootNode && graph.hasNode(rootNode.id)) {
      graph.addEdge(rootNode.id, macro.id, {
        color: "rgba(120,120,140,0.65)", size: 1.4, relType: "ROOT_MACRO",
      });
    }
  });

  // ── Ring 2: SupplyChain nodes — equal spacing, grouped by macro order ────────
  const orderedChains = [];
  macros.forEach(macro => {
    (chainsByMacro[macro.id] ?? [])
      .map(id => chains.find(c => c.id === id))
      .filter(Boolean)
      .forEach(chain => orderedChains.push(chain));
  });

  const total = orderedChains.length || 1;
  orderedChains.forEach((chain, i) => {
    const chainAngle  = (i / total) * 2 * Math.PI - Math.PI / 2;
    const memberCount = rawData.edges
      .filter(e => e.relType === "CHAIN_MEMBER" && e.source === chain.id).length;
    const sc = scenarioColor(chain.id, "SupplyChain", rawData, scenarioFactorId);

    graph.addNode(chain.id, {
      ...chain, label: chain.label,
      size:  8 + memberCount * 1.1,
      color: sc ?? chain.color ?? "#888888",
      x: Math.cos(chainAngle) * R_OUTER,
      y: Math.sin(chainAngle) * R_OUTER,
    });
  });

  // ── CAT_CHAIN spokes: macro → chain (macro-coloured) ────────────────────────
  catEdges.forEach((e, i) => {
    if (!graph.hasNode(e.source) || !graph.hasNode(e.target)) return;
    const macroNode = rawData.nodes.find(n => n.id === e.source);
    graph.addEdge(e.source, e.target, {
      id: `cat${i}`, color: (macroNode?.color ?? "#888") + "bb",
      size: 1.6, relType: "CAT_CHAIN",
    });
  });

  // ── FEEDS_INTO arrows between supply chains ───────────────────────────────────
  fiEdges.forEach((e, i) => {
    if (!graph.hasNode(e.source) || !graph.hasNode(e.target)) return;
    graph.addEdge(e.source, e.target, {
      id: `fi${i}`, color: "rgba(160,120,0,0.90)", size: 2.2,
      relType: "FEEDS_INTO", relation: e.relation ?? "", note: e.note ?? "",
    });
  });

  return graph;
}

// ── Mode 2: Chain — industry drill-down ──────────────────────────────────────

function buildChainGraph(rawData, chainId, scenarioFactorId) {
  const graph     = new MultiDirectedGraph();
  const chainNode = rawData.nodes.find(n => n.id === chainId);
  if (!chainNode) return graph;

  const memberIds = rawData.edges
    .filter(e => e.relType === "CHAIN_MEMBER" && e.source === chainId)
    .map(e => e.target);
  const memberSet = new Set(memberIds);

  const fiEdges = rawData.edges.filter(e =>
    e.relType === "FEEDS_INTO" && (e.source === chainId || e.target === chainId)
  );
  const adjIds  = fiEdges.map(e => e.source === chainId ? e.target : e.source);

  // Chain centrepiece
  graph.addNode(chainId, {
    ...chainNode, label: chainNode.label,
    size: 18, color: "#121212", x: 0, y: 0,
  });

  // Member stocks in a circle
  const R = memberIds.length <= 6 ? 340 : 430;
  memberIds.forEach((sId, i) => {
    const angle = (i / Math.max(memberIds.length, 1)) * 2 * Math.PI - Math.PI / 2;
    const sNode = rawData.nodes.find(n => n.id === sId);
    if (!sNode) return;
    const sc = scenarioColor(sId, "Stock", rawData, scenarioFactorId);
    graph.addNode(sId, {
      ...sNode, label: sNode.ticker ?? sId,
      size: 11, color: sc ?? "#121212",
      x: Math.cos(angle) * R, y: Math.sin(angle) * R,
    });
    graph.addEdge(chainId, sId, {
      color: "rgba(100,100,100,0.65)", size: 1.3, relType: "CHAIN_MEMBER",
    });
  });

  // Adjacent chains (ghost nodes)
  adjIds.forEach((cId, i) => {
    if (graph.hasNode(cId)) return;
    const ac = rawData.nodes.find(n => n.id === cId);
    if (!ac) return;
    const angle = (i / Math.max(adjIds.length, 1)) * 2 * Math.PI + Math.PI * 0.15;
    const R2 = R + 310;
    graph.addNode(cId, {
      ...ac, label: ac.label, size: 9,
      color: "#AAAAAA",
      x: Math.cos(angle) * R2, y: Math.sin(angle) * R2,
    });
  });

  // FEEDS_INTO edges
  fiEdges.forEach((e, i) => {
    if (!graph.hasNode(e.source) || !graph.hasNode(e.target)) return;
    graph.addEdge(e.source, e.target, {
      id: `fi${i}`, color: "rgba(160,120,0,0.80)", size: 1.8,
      relType: "FEEDS_INTO", relation: e.relation ?? "",
    });
  });

  // Intra-chain stock connections
  const seen = new Set();
  rawData.edges.filter(e =>
    memberSet.has(e.source) && memberSet.has(e.target) &&
    ["SUPPLY_CHAIN", "COMPETITOR", "EQUITY_HOLDING"].includes(e.relType)
  ).forEach(e => {
    if (!graph.hasNode(e.source) || !graph.hasNode(e.target)) return;
    const k = `${e.source}||${e.target}`;
    if (seen.has(k)) return;
    seen.add(k);
    const color = {
      SUPPLY_CHAIN:   "rgba(247,162,79,0.85)",
      COMPETITOR:     "rgba(235,87,87,0.85)",
      EQUITY_HOLDING: "rgba(187,107,217,0.85)",
    }[e.relType] ?? "rgba(100,100,100,0.65)";
    graph.addEdge(e.source, e.target, { color, size: 1.6, relType: e.relType, note: e.note ?? "" });
  });

  return graph;
}

// ── Mode 3: Ego — stock focus ─────────────────────────────────────────────────

const EGO_COLORS = {
  MACRO_FACTOR:       "#6fcf97",
  FINANCIAL_RELATION: "#4f8ef7",
  SUPPLY_CHAIN:       "#f7a24f",
  EQUITY_HOLDING:     "#bb6bd9",
  COMPETITOR:         "#eb5757",
};

const EGO_BASE_ANGLES = {
  MACRO_FACTOR:       -Math.PI / 2,          // top
  SUPPLY_CHAIN:        0,                    // right
  FINANCIAL_RELATION: -Math.PI / 4,          // top-right
  EQUITY_HOLDING:      Math.PI / 4,          // bottom-right
  COMPETITOR:          Math.PI,              // left
};

const SKIP_REL = new Set(["CHAIN_MEMBER", "FEEDS_INTO", "MACRO_CHAIN", "ROOT_CAT", "CAT_MACRO", "CAT_CHAIN", "ROOT_MACRO"]);

function buildEgoGraph(rawData, stockId, scenarioFactorId) {
  const graph     = new MultiDirectedGraph();
  const stockNode = rawData.nodes.find(n => n.id === stockId);
  if (!stockNode) return graph;

  const relEdges = rawData.edges.filter(e =>
    (e.source === stockId || e.target === stockId) && !SKIP_REL.has(e.relType)
  );

  // Center stock
  graph.addNode(stockId, {
    ...stockNode, label: stockNode.ticker ?? stockId,
    size: 20, color: "#121212", x: 0, y: 0,
  });

  // Group peers by relType
  const byType = {};
  relEdges.forEach(e => {
    const peerId = e.source === stockId ? e.target : e.source;
    if (!byType[e.relType]) byType[e.relType] = [];
    if (!byType[e.relType].find(x => x.id === peerId))
      byType[e.relType].push({ id: peerId, edge: e });
  });

  // Place peers in arcs by type
  Object.entries(byType).forEach(([relType, peers]) => {
    const base   = EGO_BASE_ANGLES[relType] ?? (Math.PI * 0.6);
    const spread = Math.min(Math.PI * 0.75, peers.length * 0.30);
    const r      = peers.length > 5 ? 560 : 380;

    peers.forEach(({ id }, i) => {
      if (graph.hasNode(id)) return;
      const angle = peers.length === 1 ? base
        : base - spread / 2 + (i / (peers.length - 1)) * spread;
      const peerNode = rawData.nodes.find(n => n.id === id);
      graph.addNode(id, {
        ...(peerNode ?? {}),
        label: peerNode?.ticker ?? peerNode?.factor ?? peerNode?.name ?? id,
        size:  relType === "MACRO_FACTOR" ? 8 : 6,
        color: "#121212",
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
      });
    });
  });

  // Edges — coloured by relationship type
  const seenE = new Set();
  relEdges.forEach(e => {
    if (!graph.hasNode(e.source) || !graph.hasNode(e.target)) return;
    const k = `${e.source}||${e.target}`;
    if (seenE.has(k)) return;
    seenE.add(k);
    const baseColor = EGO_COLORS[e.relType];
    const color = baseColor ? baseColor + "cc" : "rgba(90,90,90,0.80)";
    const size  = e.relType === "MACRO_FACTOR" ? 1.2 : 1.8;
    graph.addEdge(e.source, e.target, {
      color, size, relType: e.relType, ...e, type: "arrow",
    });
  });

  return graph;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GraphController({
  rawData, mode, activeChainId, activeStockId, scenarioFactorId, onNodeAction,
}) {
  const sigma          = useSigma();
  const loadGraph      = useLoadGraph();
  const registerEvents = useRegisterEvents();
  const hoveredRef     = useRef(null);

  // Rebuild graph when mode / selection / scenario changes
  useEffect(() => {
    if (!rawData) return;
    let graph;
    if      (mode === "overview")                        graph = buildOverviewGraph(rawData, scenarioFactorId);
    else if (mode === "chain"   && activeChainId)        graph = buildChainGraph(rawData, activeChainId, scenarioFactorId);
    else if (mode === "ego"     && activeStockId)        graph = buildEgoGraph(rawData, activeStockId, scenarioFactorId);
    else return;

    loadGraph(graph);
    // Smooth camera reset after graph is loaded
    setTimeout(() => {
      try { sigma.getCamera().animatedReset({ duration: 480 }); } catch {}
    }, 60);
    sigma.refresh();
  }, [rawData, mode, activeChainId, activeStockId, scenarioFactorId]);

  // Events: hover highlight + click routing
  useEffect(() => {
    registerEvents({
      enterNode: ({ node }) => {
        hoveredRef.current = node;
        const g = sigma.getGraph();
        const neighbors = new Set(g.neighbors(node));
        sigma.setSettings({
          nodeReducer: (n, data) => {
            if (n === node || neighbors.has(n)) return { ...data, zIndex: 1 };
            return { ...data, color: "#DDDBD6", label: "", zIndex: 0 };
          },
          edgeReducer: (edge, data) => {
            const [s, t] = g.extremities(edge);
            if (s === node || t === node) return { ...data, size: data.size * 2.5, zIndex: 1 };
            return { ...data, hidden: true };
          },
        });
      },
      leaveNode: () => {
        hoveredRef.current = null;
        sigma.setSettings({ nodeReducer: null, edgeReducer: null });
      },
      clickNode: ({ node }) => {
        const attrs = sigma.getGraph().getNodeAttributes(node);
        onNodeAction({ type: "click", nodeId: node, nodeType: attrs.nodeType, attrs });
      },
      clickStage: () => onNodeAction({ type: "clickStage" }),
    });
  }, [registerEvents, sigma, onNodeAction]);

  return null;
}
