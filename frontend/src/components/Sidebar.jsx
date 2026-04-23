import { useState, useMemo, useRef } from "react";

// Categorise macro factor labels into scenario groups
const MACRO_CATS = [
  { key: "energy",   label: "Energy & Commodities", keywords: ["crude", "brent", "oil", "gas", "lng", "mops", "coal", "petroleum", "refin", "palm", "rubber"] },
  { key: "fx",       label: "Currency & FX",         keywords: ["usd", "thb", "exchange", "baht", "forex", "dollar", "currency"] },
  { key: "rates",    label: "Interest Rates",         keywords: ["rate", "bot policy", "policy rate", "mrr", "mlr", "mdr", "lending", "deposit"] },
  { key: "economy",  label: "Economy & Growth",       keywords: ["gdp", "inflation", "cpi", "ppi", "pmi", "trade balance", "export", "import"] },
  { key: "consumer", label: "Consumer & Tourism",     keywords: ["consumer", "tourist", "tourism", "retail sales", "same-store", "footfall"] },
  { key: "credit",   label: "Credit & Debt",          keywords: ["npl", "credit cost", "loan growth", "household debt", "non-performing"] },
  { key: "agri",     label: "Agriculture",            keywords: ["rice", "sugar", "chicken", "shrimp", "pork", "soybean", "corn", "fishmeal", "tapioca", "poultry", "feedmill"] },
];

function categorizeMacro(factor) {
  const lower = (factor ?? "").toLowerCase();
  for (const cat of MACRO_CATS) {
    if (cat.keywords.some(k => lower.includes(k))) return cat.key;
  }
  return "other";
}

export default function Sidebar({
  rawData, mode, activeChainId, selectedNode,
  scenarioFactorId, onScenarioSelect, onNavigate, onStockSearch,
}) {
  const [query,      setQuery]      = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef(null);

  // ── Derived data ───────────────────────────────────────────────────────────

  const chains = useMemo(() =>
    rawData?.nodes.filter(n => n.nodeType === "SupplyChain") ?? [], [rawData]);

  const activeChain = useMemo(() =>
    rawData?.nodes.find(n => n.id === activeChainId) ?? null, [rawData, activeChainId]);

  const chainMemberCounts = useMemo(() => {
    if (!rawData) return {};
    const counts = {};
    rawData.edges.filter(e => e.relType === "CHAIN_MEMBER").forEach(e => {
      counts[e.source] = (counts[e.source] ?? 0) + 1;
    });
    return counts;
  }, [rawData]);

  // Macro factors grouped by category
  const macroGroups = useMemo(() => {
    if (!rawData) return [];
    const mfs = rawData.nodes.filter(n => n.nodeType === "MacroFactor");
    const grouped = {};
    mfs.forEach(mf => {
      const cat = categorizeMacro(mf.factor ?? mf.id);
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(mf);
    });
    const result = MACRO_CATS.filter(c => grouped[c.key]?.length).map(c => ({
      ...c, factors: grouped[c.key],
    }));
    if (grouped["other"]?.length) result.push({ key: "other", label: "Other Factors", factors: grouped["other"] });
    return result;
  }, [rawData]);

  const suggestions = useMemo(() => {
    if (!query.trim() || !rawData) return [];
    const q = query.toLowerCase();
    return rawData.nodes
      .filter(n => n.nodeType === "Stock" &&
        (n.ticker?.toLowerCase().includes(q) || n.name?.toLowerCase().includes(q)))
      .slice(0, 16);
  }, [query, rawData]);

  // Scenario: which chains are affected by the selected macro factor
  const scenarioImpact = useMemo(() => {
    if (!rawData || !scenarioFactorId) return {};
    const stockProp = {};
    rawData.edges
      .filter(e => e.relType === "MACRO_FACTOR" && e.target === scenarioFactorId)
      .forEach(e => { stockProp[e.source] = e.proportionality ?? ""; });

    const impact = {};
    chains.forEach(chain => {
      const members = rawData.edges
        .filter(e => e.relType === "CHAIN_MEMBER" && e.source === chain.id)
        .map(e => e.target).filter(m => stockProp[m]);
      if (!members.length) { impact[chain.id] = "neutral"; return; }
      const inv  = members.filter(m => stockProp[m].toLowerCase().includes("invers")).length;
      const prop = members.length - inv;
      impact[chain.id] = inv > prop ? "negative" : prop > inv ? "positive" : "mixed";
    });
    return impact;
  }, [rawData, scenarioFactorId, chains]);

  const scenarioFactor = rawData?.nodes.find(n => n.id === scenarioFactorId);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleSelect(node) {
    setQuery(node.ticker ?? "");
    setSearchOpen(false);
    onStockSearch(node.id);
  }

  function handleClear() {
    setQuery("");
    setSearchOpen(false);
    onStockSearch(null);
    inputRef.current?.focus();
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Intelligence Panel</h2>
      </div>
      <div className="panel-body">

        {/* Search */}
        <div className="section-title" style={{ marginTop: 0 }}>Find a Stock</div>
        <div className="search-wrap">
          <input
            ref={inputRef}
            placeholder="Ticker or company name…"
            value={query}
            onChange={e => { setQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => suggestions.length && setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
          />
          {searchOpen && suggestions.length > 0 && (
            <ul className="search-suggestions">
              {suggestions.map(s => (
                <li key={s.id} onMouseDown={() => handleSelect(s)}>
                  <span className="ticker">{s.ticker}</span>{" "}
                  <span className="sname">{s.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {query && <button className="clear-btn" onClick={handleClear}>✕ Clear</button>}

        {/* ── Scenario panel ── */}
        <div className="section-title">Impact Scenario</div>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.6 }}>
          Pick a macro factor to highlight which supply chains benefit (
          <span style={{ color: "#6fcf97" }}>green</span>) or suffer (
          <span style={{ color: "#eb5757" }}>red</span>).
        </p>

        {scenarioFactor && (
          <div className="scenario-active">
            <span className="scenario-label">{scenarioFactor.factor}</span>
            <button className="scenario-clear" onClick={() => onScenarioSelect(null)}>✕</button>
          </div>
        )}

        {macroGroups.map(group => (
          <div key={group.key} style={{ marginBottom: 12 }}>
            <div className="factor-group-label">{group.label}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {group.factors.map(mf => (
                <button
                  key={mf.id}
                  title={mf.factor}
                  className={`factor-chip ${scenarioFactorId === mf.id ? "factor-chip-active" : ""}`}
                  onClick={() => onScenarioSelect(mf.id)}
                >
                  {(mf.factor ?? "").length > 22
                    ? (mf.factor ?? "").slice(0, 20) + "…"
                    : (mf.factor ?? "")}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* ── Scenario impact list (when active) ── */}
        {scenarioFactorId && (
          <>
            <div className="section-title">Chain Exposure</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {chains
                .filter(c => scenarioImpact[c.id] !== "neutral")
                .sort((a, b) => {
                  const order = { positive: 0, mixed: 1, negative: 2 };
                  return (order[scenarioImpact[a.id]] ?? 3) - (order[scenarioImpact[b.id]] ?? 3);
                })
                .map(chain => {
                  const imp = scenarioImpact[chain.id];
                  const dot = imp === "positive" ? "#6fcf97" : imp === "negative" ? "#eb5757" : "#f4d03f";
                  return (
                    <button
                      key={chain.id}
                      className="chain-impact-row"
                      onClick={() => onNavigate("chain", chain.id)}
                    >
                      <span className="impact-dot" style={{ background: dot }} />
                      <span style={{ flex: 1, fontSize: 11 }}>{chain.label}</span>
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                        {chainMemberCounts[chain.id] ?? 0}
                      </span>
                    </button>
                  );
                })}
            </div>
          </>
        )}

        {/* ── Chain index in overview mode ── */}
        {mode === "overview" && !scenarioFactorId && (
          <>
            <div className="section-title">Supply Chain Index</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {chains.map(chain => (
                <button
                  key={chain.id}
                  className="chain-index-item"
                  onClick={() => onNavigate("chain", chain.id)}
                >
                  <span className="chain-dot" style={{ background: chain.color ?? "#888" }} />
                  <span className="chain-name">{chain.label}</span>
                  <span className="chain-count">{chainMemberCounts[chain.id] ?? 0}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Chain members in chain mode ── */}
        {mode === "chain" && activeChain && (
          <>
            <div className="section-title">In This Chain</div>
            <div className="chain-card" style={{ borderColor: activeChain.color ?? "var(--border)" }}>
              <div className="chain-card-name" style={{ color: activeChain.color ?? "var(--text)" }}>
                {activeChain.label}
              </div>
              <div className="chain-card-sub">
                {chainMemberCounts[activeChain.id] ?? 0} member companies
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
              {rawData?.edges
                .filter(e => e.relType === "CHAIN_MEMBER" && e.source === activeChain.id)
                .map(e => {
                  const s = rawData.nodes.find(n => n.id === e.target);
                  return s ? (
                    <button
                      key={s.id}
                      className="stock-chip"
                      onClick={() => onStockSearch(s.id)}
                      title={s.name}
                    >
                      {s.ticker}
                    </button>
                  ) : null;
                })}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
