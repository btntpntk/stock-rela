// GraphView — SVG interactive graph, 3 modes: overview / chain / ego

const { useState: useStateGV, useEffect: useEffectGV, useMemo: useMemoGV, useRef: useRefGV } = React;

/* ── helpers ────────────────────────────────────────────── */
const polar = (cx, cy, r, angle) => ({
  x: cx + r * Math.cos(angle),
  y: cy + r * Math.sin(angle),
});
const TWO_PI = Math.PI * 2;
const HALF_PI = Math.PI / 2;

const stockById = id => (window.STOCKS || []).find(s => s.id === id) || { id, name: id, change: 0 };

/* ── colour helpers ─────────────────────────────────────── */
const SCENARIO_C = { pos: '#4caf76', neg: '#e05252' };
function nodeScenarioColor(id, scenarioId) {
  if (!scenarioId) return null;
  const sa = (window.SCENARIO_AFFECTED || {})[scenarioId] || {};
  if ((sa.pos || []).includes(id)) return SCENARIO_C.pos;
  if ((sa.neg || []).includes(id)) return SCENARIO_C.neg;
  return null;
}

/* Arrow marker defs */
const ArrowDefs = () => (
  <defs>
    {Object.entries(window.EGO_COLORS || {}).map(([k, c]) => (
      <marker key={k} id={`arr-${k}`} markerWidth="7" markerHeight="7"
        refX="6" refY="3.5" orient="auto">
        <polygon points="0 0, 7 3.5, 0 7" fill={c} opacity="0.7" />
      </marker>
    ))}
    <marker id="arr-grey" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
      <polygon points="0 0, 7 3.5, 0 7" fill="rgba(160,160,160,0.4)" />
    </marker>
    <marker id="arr-ghost" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <polygon points="0 0, 6 3, 0 6" fill="rgba(80,80,80,0.3)" />
    </marker>
  </defs>
);

/* ── EGO GRAPH ──────────────────────────────────────────── */
function buildEgoNodes(stockId, cx, cy) {
  const rels = (window.EGO_RELATIONS || {})[stockId] || window.EGO_GENERIC || {};
  const cats = Object.keys(window.EGO_COLORS || {});
  const activeCats = cats.filter(c => (rels[c] || []).length > 0);
  const R1 = 155, R2 = 295;
  const nodes = [{ id: stockId, x: cx, y: cy, r: 14, color: '#c8d4e8', label: stockId, nodeType: 'Stock', isCenter: true }];
  const edges = [];

  activeCats.forEach((cat, ci) => {
    const angle = -HALF_PI + ci * (TWO_PI / activeCats.length);
    const { x: cx1, y: cy1 } = polar(cx, cy, R1, angle);
    const catColor = window.EGO_COLORS[cat];
    nodes.push({ id: `__cat__${cat}`, x: cx1, y: cy1, r: 9, color: catColor, label: window.CAT_LABELS[cat], nodeType: 'Category', relType: cat });
    edges.push({ from: stockId, to: `__cat__${cat}`, color: 'rgba(150,150,150,0.35)', marker: 'arr-grey', width: 1 });

    const peers = rels[cat] || [];
    const spread = Math.min(0.6 * Math.PI, peers.length * 0.27);
    peers.forEach((peerId, pi) => {
      const peerAngle = angle + (peers.length === 1 ? 0 : -spread / 2 + pi * spread / (peers.length - 1));
      const { x: px, y: py } = polar(cx, cy, R2, peerAngle);
      const sc = nodeScenarioColor(peerId, null);
      nodes.push({ id: peerId, x: px, y: py, r: 7, color: sc || '#6a7a8a', label: peerId, nodeType: 'Stock', relType: cat });
      edges.push({ from: `__cat__${cat}`, to: peerId, color: catColor + 'bb', marker: `arr-${cat}`, width: 1.2, relType: cat });
    });
  });
  return { nodes, edges };
}

/* ── CHAIN GRAPH ────────────────────────────────────────── */
function buildChainNodes(chainId, cx, cy) {
  const chain = (window.CHAINS || []).find(c => c.id === chainId);
  if (!chain) return { nodes: [], edges: [] };
  const members = chain.members || [];
  const R1 = 145, R2 = 230;
  const nodes = [{ id: chainId, x: cx, y: cy, r: 16, color: '#6b9fd4', label: chain.label, nodeType: 'Chain', isCenter: true }];
  const edges = [];

  members.forEach((sid, i) => {
    const angle = -HALF_PI + i * (TWO_PI / members.length);
    const { x, y } = polar(cx, cy, R1, angle);
    nodes.push({ id: sid, x, y, r: 8, color: '#8a9ab0', label: sid, nodeType: 'Stock' });
    edges.push({ from: chainId, to: sid, color: 'rgba(107,159,212,0.35)', marker: 'arr-grey', width: 1 });
  });

  (chain.adj || []).forEach((adjId, i) => {
    const adjChain = (window.CHAINS || []).find(c => c.id === adjId);
    if (!adjChain) return;
    const angle = -HALF_PI + Math.PI / 4 + i * (Math.PI / 2.5);
    const { x, y } = polar(cx, cy, R2, angle);
    nodes.push({ id: adjId, x, y, r: 10, color: '#2a3a4a', label: adjChain.label, nodeType: 'GhostChain' });
    edges.push({ from: chainId, to: adjId, color: 'rgba(80,80,80,0.2)', marker: 'arr-ghost', width: 0.8 });
  });

  return { nodes, edges };
}

/* ── OVERVIEW GRAPH ─────────────────────────────────────── */
function buildOverviewNodes(cx, cy) {
  const macros = ['Energy', 'Finance', 'Retail', 'Materials', 'Telecom', 'Food'];
  const macroColors = ['#708888', '#4a6fa5', '#c87840', '#508060', '#6a4a90', '#904040'];
  const R1 = 100, R2 = 210;
  const nodes = [{ id: '__root__', x: cx, y: cy, r: 14, color: '#c8d4e8', label: 'SET', nodeType: 'Root', isCenter: true }];
  const edges = [];

  macros.forEach((m, i) => {
    const angle = -HALF_PI + i * (TWO_PI / macros.length);
    const { x, y } = polar(cx, cy, R1, angle);
    const id = `__macro__${m}`;
    nodes.push({ id, x, y, r: 10, color: macroColors[i], label: m, nodeType: 'Macro' });
    edges.push({ from: '__root__', to: id, color: macroColors[i] + '50', marker: 'arr-grey', width: 0.8 });

    // 2 stocks per macro ring
    const stockSamples = {
      Energy: ['PTT', 'GULF'], Finance: ['KBANK', 'SCB'], Retail: ['CPALL', 'MAKRO'],
      Materials: ['SCC', 'DELTA'], Telecom: ['ADVANC', 'TRUE'], Food: ['CPF', 'TU'],
    };
    (stockSamples[m] || []).forEach((sid, si) => {
      const sa = nodeScenarioColor(sid, null);
      const spreadA = angle + (si === 0 ? -0.28 : 0.28);
      const { x: sx, y: sy } = polar(cx, cy, R2, spreadA);
      nodes.push({ id: sid, x: sx, y: sy, r: 7, color: sa || '#5a6a7a', label: sid, nodeType: 'Stock' });
      edges.push({ from: id, to: sid, color: macroColors[i] + '40', marker: 'arr-grey', width: 0.7 });
    });
  });

  return { nodes, edges };
}

/* ── MAIN COMPONENT ─────────────────────────────────────── */
function GraphView({ mode, activeStockId, activeChainId, scenarioId, onNodeClick, width = 640, height = 500 }) {
  const [hovered, setHovered] = useStateGV(null);
  const svgRef = useRefGV(null);

  const cx = width / 2, cy = height / 2;

  const { nodes, edges } = useMemoGV(() => {
    if (mode === 'ego') return buildEgoNodes(activeStockId || 'CPALL', cx, cy);
    if (mode === 'chain') return buildChainNodes(activeChainId || 'energy', cx, cy);
    return buildOverviewNodes(cx, cy);
  }, [mode, activeStockId, activeChainId, cx, cy]);

  // Apply scenario colours live
  const themedNodes = useMemoGV(() => {
    if (!scenarioId) return nodes;
    return nodes.map(n => {
      const sc = nodeScenarioColor(n.id, scenarioId);
      return sc ? { ...n, color: sc } : n;
    });
  }, [nodes, scenarioId]);

  // Adjacency map for hover dimming
  const adjMap = useMemoGV(() => {
    const m = {};
    edges.forEach(e => {
      if (!m[e.from]) m[e.from] = new Set();
      if (!m[e.to]) m[e.to] = new Set();
      m[e.from].add(e.to);
      m[e.to].add(e.from);
    });
    return m;
  }, [edges]);

  const isAdj = (a, b) => !hovered || a === hovered || b === hovered || (adjMap[hovered] && adjMap[hovered].has(a === hovered ? b : a));
  const nodeOpacity = id => !hovered || id === hovered || (adjMap[hovered] && adjMap[hovered].has(id)) ? 1 : 0.15;
  const edgeOpacity = (f, t) => !hovered || f === hovered || t === hovered || (adjMap[hovered] && (adjMap[hovered].has(f) && t === hovered || adjMap[hovered].has(t) && f === hovered)) ? 1 : 0.07;

  return (
    <svg ref={svgRef} width={width} height={height} viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', cursor: 'default' }}>
      <ArrowDefs />

      {/* edges */}
      {edges.map((e, i) => {
        const fn = themedNodes.find(n => n.id === e.from);
        const tn = themedNodes.find(n => n.id === e.to);
        if (!fn || !tn) return null;
        // shorten line so it ends at node border
        const dx = tn.x - fn.x, dy = tn.y - fn.y;
        const len = Math.sqrt(dx*dx + dy*dy) || 1;
        const shrink = tn.r + 6;
        const ex = tn.x - dx / len * shrink;
        const ey = tn.y - dy / len * shrink;
        const sx = fn.x + dx / len * (fn.r + 2);
        const sy = fn.y + dy / len * (fn.r + 2);
        return (
          <line key={i} x1={sx} y1={sy} x2={ex} y2={ey}
            stroke={e.color} strokeWidth={hovered && (fn.id === hovered || tn.id === hovered) ? e.width * 2.2 : e.width}
            opacity={edgeOpacity(e.from, e.to)}
            markerEnd={`url(#${e.marker})`}
            style={{ transition: 'opacity 0.15s, stroke-width 0.1s' }} />
        );
      })}

      {/* nodes */}
      {themedNodes.map(n => {
        const isHov = hovered === n.id;
        const opacity = nodeOpacity(n.id);
        const isGhost = n.nodeType === 'GhostChain';
        const isCat = n.nodeType === 'Category';

        return (
          <g key={n.id} style={{ cursor: isGhost ? 'default' : 'pointer', transition: 'opacity 0.15s' }}
            opacity={opacity}
            onMouseEnter={() => setHovered(n.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => !isGhost && onNodeClick && onNodeClick(n)}>

            {/* glow ring on hover */}
            {isHov && !isGhost && (
              <circle cx={n.x} cy={n.y} r={n.r + 5} fill="none"
                stroke={n.color} strokeWidth="1.5" opacity="0.35" />
            )}

            {/* node circle */}
            <circle cx={n.x} cy={n.y} r={isHov ? n.r * 1.12 : n.r}
              fill={isGhost ? 'none' : n.color}
              stroke={isGhost ? '#2a3a4a' : (isCat ? n.color : 'rgba(255,255,255,0.08)')}
              strokeWidth={isGhost ? 1.5 : (n.isCenter ? 2 : 1)}
              strokeDasharray={isGhost ? '3 2' : 'none'}
              style={{ transition: 'r 0.1s' }} />

            {/* center ring accent */}
            {n.isCenter && (
              <circle cx={n.x} cy={n.y} r={n.r - 4} fill="none"
                stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            )}

            {/* label */}
            {!isGhost && (
              <text x={n.x} y={n.y + n.r + 11}
                textAnchor="middle" fontSize={isCat ? 8 : 7.5}
                fontWeight={n.isCenter ? '700' : '500'}
                fontFamily="Helvetica Neue, Helvetica, Arial, sans-serif"
                fill={isHov ? '#e0e8f0' : '#6a7a8a'}
                style={{ pointerEvents: 'none', transition: 'fill 0.1s' }}>
                {n.label.length > 14 ? n.label.slice(0, 13) + '…' : n.label}
              </text>
            )}
            {isGhost && (
              <text x={n.x} y={n.y + n.r + 10}
                textAnchor="middle" fontSize={7}
                fontFamily="Helvetica Neue, Helvetica, Arial, sans-serif"
                fill="#2a3a4a" style={{ pointerEvents: 'none' }}>
                {n.label.length > 12 ? n.label.slice(0, 11) + '…' : n.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

Object.assign(window, { GraphView });
