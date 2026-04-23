import { useMemo } from "react";

const REL_LABELS = {
  FINANCIAL_RELATION: "Financial",
  SUPPLY_CHAIN:       "Supply Chain",
  EQUITY_HOLDING:     "Equity Holdings",
  COMPETITOR:         "Competitors",
  MACRO_FACTOR:       "Macro Drivers",
  FEEDS_INTO:         "Feeds Into",
  CHAIN_MEMBER:       "Member Stocks",
};

const REL_COLORS = {
  FINANCIAL_RELATION: "#4f8ef7",
  SUPPLY_CHAIN:       "#f7a24f",
  EQUITY_HOLDING:     "#bb6bd9",
  COMPETITOR:         "#eb5757",
  MACRO_FACTOR:       "#6fcf97",
  FEEDS_INTO:         "#ffc567",
  CHAIN_MEMBER:       "#64dca0",
};

const SKIP_REL = new Set(["CHAIN_MEMBER", "FEEDS_INTO", "MACRO_CHAIN", "ROOT_CAT", "CAT_MACRO", "CAT_CHAIN", "ROOT_MACRO"]);

// ── Shared sub-components ─────────────────────────────────────────────────────

function PropBadge({ value }) {
  if (!value) return null;
  const inv = value.toLowerCase().includes("invers");
  return (
    <span className={`prop-badge ${inv ? "inverse" : "proportional"}`}>
      {inv ? "↓ Inverse" : "↑ Proportional"}
    </span>
  );
}

function SensitivityBar({ value }) {
  if (value == null) return null;
  const pct   = Math.round(value * 100);
  const color = value > 0.7 ? "#eb5757" : value > 0.4 ? "#f7a24f" : "#6fcf97";
  return (
    <div className="sens-bar-wrap">
      <div className="sens-bar-labels">
        <span>Sensitivity</span><span>{pct}%</span>
      </div>
      <div className="sens-bar-track">
        <div className="sens-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Global Macro Root detail ──────────────────────────────────────────────────

function GlobalMacroRootDetail({ rawData }) {
  const macros = useMemo(() =>
    rawData?.nodes.filter(n => n.nodeType === "GlobalMacro") ?? [], [rawData]);

  return (
    <div>
      <div className="detail-name">Global Macro</div>
      <span className="detail-label" style={{ background: "#1a1a2e22", color: "#1a1a2e" }}>
        Root Node
      </span>

      <div className="rel-group">
        <div className="rel-group-title" style={{ color: "#ffc567" }}>
          Macro Categories ({macros.length})
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {macros.map(macro => (
            <div className="rel-card" key={macro.id}>
              <div className="rc-name">
                <span style={{
                  display: "inline-block", width: 10, height: 10, borderRadius: "50%",
                  background: macro.color ?? "#888", marginRight: 8, flexShrink: 0,
                }} />
                <strong>{macro.label}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Global Macro detail ───────────────────────────────────────────────────────

function GlobalMacroDetail({ node, rawData }) {
  const chains = useMemo(() => {
    if (!rawData) return [];
    return rawData.edges
      .filter(e => e.relType === "CAT_CHAIN" && e.source === node.id)
      .map(e => rawData.nodes.find(n => n.id === e.target))
      .filter(Boolean);
  }, [node, rawData]);

  return (
    <div>
      <div className="detail-name">{node.label}</div>
      <span className="detail-label" style={{ background: (node.color ?? "#888") + "28", color: node.color ?? "#888" }}>
        Global Macro
      </span>

      <div className="rel-group">
        <div className="rel-group-title" style={{ color: "#ffc567" }}>Supply Chains ({chains.length})</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {chains.map(chain => (
            <div className="rel-card" key={chain.id}>
              <div className="rc-name">
                <span style={{
                  display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                  background: chain.color ?? "#888", marginRight: 6, flexShrink: 0,
                }} />
                {chain.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Supply Chain detail ───────────────────────────────────────────────────────

function SupplyChainDetail({ node, rawData }) {
  const members = useMemo(() =>
    rawData?.edges
      .filter(e => e.relType === "CHAIN_MEMBER" && e.source === node.id)
      .map(e => rawData.nodes.find(n => n.id === e.target))
      .filter(Boolean) ?? [], [node, rawData]);

  const feedsInto = useMemo(() =>
    rawData?.edges
      .filter(e => e.relType === "FEEDS_INTO" && e.source === node.id)
      .map(e => ({ chain: rawData.nodes.find(n => n.id === e.target), edge: e }))
      .filter(x => x.chain) ?? [], [node, rawData]);

  const receivesFrom = useMemo(() =>
    rawData?.edges
      .filter(e => e.relType === "FEEDS_INTO" && e.target === node.id)
      .map(e => ({ chain: rawData.nodes.find(n => n.id === e.source), edge: e }))
      .filter(x => x.chain) ?? [], [node, rawData]);

  return (
    <div>
      <div className="detail-name">{node.label}</div>
      <span className="detail-label">
        Supply Chain · {members.length} stocks
      </span>

      {receivesFrom.length > 0 && (
        <div className="rel-group">
          <div className="rel-group-title" style={{ color: "#ffc567" }}>← Receives From</div>
          {receivesFrom.map(({ chain, edge }) => (
            <div className="rel-card" key={chain.id}>
              <div className="rc-name">
                <span className="chain-color-dot" />
                {chain.label}
              </div>
              {edge.relation && <div className="rc-note">{edge.relation}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="rel-group">
        <div className="rel-group-title" style={{ color: "#64dca0" }}>Member Companies</div>
        <div className="chip-wrap">
          {members.map(s => (
            <span key={s.id} className="stock-chip" title={s.name}>{s.ticker}</span>
          ))}
        </div>
      </div>

      {feedsInto.length > 0 && (
        <div className="rel-group">
          <div className="rel-group-title" style={{ color: "#ffc567" }}>→ Feeds Into</div>
          {feedsInto.map(({ chain, edge }) => (
            <div className="rel-card" key={chain.id}>
              <div className="rc-name">
                <span className="chain-color-dot" />
                {chain.label}
              </div>
              {edge.sensitivity_index != null && <SensitivityBar value={edge.sensitivity_index} />}
              {edge.relation && <div className="rc-note">{edge.relation}</div>}
              {edge.note && <div className="rc-note">{edge.note}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Macro Factor detail ───────────────────────────────────────────────────────

function MacroFactorDetail({ node, rawData, onScenarioActivate }) {
  const { proportional, inverse } = useMemo(() => {
    if (!rawData) return { proportional: [], inverse: [] };
    const prop = [], inv = [];
    rawData.edges
      .filter(e => e.relType === "MACRO_FACTOR" && e.target === node.id)
      .forEach(e => {
        const stock = rawData.nodes.find(n => n.id === e.source);
        if (!stock) return;
        (e.proportionality?.toLowerCase().includes("invers") ? inv : prop).push({ stock, edge: e });
      });
    return { proportional: prop, inverse: inv };
  }, [node, rawData]);

  return (
    <div>
      <div className="detail-name">{node.factor ?? node.id}</div>
      <span className="detail-label" style={{ background: "rgba(111,207,151,.18)", color: "#6fcf97" }}>
        Macro Factor
      </span>

      <button className="scenario-activate-btn" onClick={() => onScenarioActivate(node.id)}>
        🔦 Show Impact on Graph
      </button>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, marginTop: 4 }}>
        <div className="impact-stat impact-stat-green">
          <div className="impact-stat-num">{proportional.length}</div>
          <div className="impact-stat-label">Benefit</div>
        </div>
        <div className="impact-stat impact-stat-red">
          <div className="impact-stat-num">{inverse.length}</div>
          <div className="impact-stat-label">Suffer</div>
        </div>
      </div>

      {proportional.length > 0 && (
        <div className="rel-group">
          <div className="rel-group-title" style={{ color: "#6fcf97" }}>↑ Benefits ({proportional.length})</div>
          <div className="chip-wrap">
            {proportional.map(({ stock }) => (
              <span key={stock.id} className="stock-chip stock-chip-green" title={stock.name}>
                {stock.ticker}
              </span>
            ))}
          </div>
        </div>
      )}

      {inverse.length > 0 && (
        <div className="rel-group">
          <div className="rel-group-title" style={{ color: "#eb5757" }}>↓ Suffers ({inverse.length})</div>
          <div className="chip-wrap">
            {inverse.map(({ stock }) => (
              <span key={stock.id} className="stock-chip stock-chip-red" title={stock.name}>
                {stock.ticker}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stock / Entity detail ─────────────────────────────────────────────────────

function StockDetail({ node, rawData }) {
  const grouped = useMemo(() => {
    if (!node || !rawData) return {};
    const result = {};
    for (const edge of rawData.edges) {
      if (SKIP_REL.has(edge.relType)) continue;
      const isOut = edge.source === node.id;
      const isIn  = edge.target === node.id;
      if (!isOut && !isIn) continue;
      const peerId   = isOut ? edge.target : edge.source;
      const peerNode = rawData.nodes.find(n => n.id === peerId);
      const peerName = peerNode?.name ?? peerNode?.ticker ?? peerNode?.factor ?? peerId;
      if (!result[edge.relType]) result[edge.relType] = [];
      result[edge.relType].push({ edge, isOut, peerId, peerName });
    }
    return result;
  }, [node, rawData]);

  const chainNode = useMemo(() => {
    if (!rawData || !node) return null;
    const cEdge = rawData.edges.find(e => e.relType === "CHAIN_MEMBER" && e.target === node.id);
    return cEdge ? rawData.nodes.find(n => n.id === cEdge.source) : null;
  }, [node, rawData]);

  return (
    <div>
      <div className="detail-name">{node.name ?? node.ticker ?? node.id}</div>
      {node.ticker && node.name && <div className="detail-ticker">{node.ticker}</div>}
      <span className="detail-label">
        {node.nodeType}
      </span>

      {chainNode && (
        <div className="chain-badge">
          ⛓ {chainNode.label}
        </div>
      )}

      {Object.entries(grouped).map(([relType, items]) => (
        <div className="rel-group" key={relType}>
          <div className="rel-group-title" style={{ color: REL_COLORS[relType] ?? "#aaa" }}>
            {REL_LABELS[relType] ?? relType} ({items.length})
          </div>
          {items.map(({ edge, isOut, peerName }, i) => (
            <div className="rel-card" key={i}>
              <div className="rc-name">
                <span style={{ color: "var(--text-muted)", marginRight: 4 }}>{isOut ? "→" : "←"}</span>
                <strong>{peerName}</strong>
              </div>
              <div className="rc-prop">
                <PropBadge value={edge.proportionality} />
                {edge.relation && <span>{edge.relation}</span>}
                {edge.ownership_pct != null && <span>{edge.ownership_pct}% owned · </span>}
                {edge.market_share_overlap && <span>Overlap: {edge.market_share_overlap}</span>}
                {edge.impact_lag && <span> · Lag: {edge.impact_lag}</span>}
              </div>
              {edge.sensitivity_index != null && <SensitivityBar value={edge.sensitivity_index} />}
              {edge.note  && <div className="rc-note">{edge.note}</div>}
              {edge.logic && <div className="rc-note">{edge.logic}</div>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Empty state by mode ───────────────────────────────────────────────────────

function EmptyState({ mode }) {
  const content = {
    overview: { icon: "🌏", title: "Supply Chain Map",  body: "Click a chain cluster to explore · Click a macro factor to see impact" },
    chain:    { icon: "⛓",  title: "Industry View",    body: "Click a stock to open its full relationship web" },
    ego:      { icon: "🔍", title: "Stock Focus",       body: "Hover nodes to highlight connections · Click any node to explore" },
  }[mode] ?? { icon: "●", title: "Select a node", body: "" };

  return (
    <div className="detail-empty">
      <div className="empty-icon">{content.icon}</div>
      <strong>{content.title}</strong>
      {content.body && <div style={{ marginTop: 8 }}>{content.body}</div>}
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

export default function NodeDetail({ node, rawData, mode, onScenarioActivate }) {
  if (!node) return <EmptyState mode={mode} />;

  if (node.nodeType === "GlobalMacroRoot") return <GlobalMacroRootDetail rawData={rawData} />;
  if (node.nodeType === "GlobalMacro")     return <GlobalMacroDetail node={node} rawData={rawData} />;
  if (node.nodeType === "SupplyChain")  return <SupplyChainDetail node={node} rawData={rawData} />;
  if (node.nodeType === "MacroFactor")  return <MacroFactorDetail node={node} rawData={rawData} onScenarioActivate={onScenarioActivate} />;
  return <StockDetail node={node} rawData={rawData} />;
}
