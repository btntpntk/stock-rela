import { useState, useEffect, useCallback, Component } from "react";
import { SigmaContainer } from "@react-sigma/core";
import "@react-sigma/core/lib/style.css";
import GraphController from "./components/GraphController";
import Sidebar from "./components/Sidebar";
import NodeDetail from "./components/NodeDetail";
import NewsPage from "./pages/NewsPage";

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <div className="overlay" style={{ flexDirection: "column", gap: 8 }}>
        <span style={{ color: "#eb5757", fontWeight: 700 }}>Graph error</span>
        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{this.state.error.message}</span>
      </div>
    );
    return this.props.children;
  }
}

const SIGMA_SETTINGS = {
  defaultNodeType:            "circle",
  defaultEdgeType:            "arrow",
  renderEdgeLabels:           false,
  labelFont:                  "Libre Baskerville, Georgia, serif",
  labelSize:                  12,
  labelWeight:                "600",
  labelColor:                 { color: "#121212" },
  labelDensity:               1.0,
  labelGridCellSize:          100,
  labelRenderedSizeThreshold: 4,
  zoomingRatio:               1.5,
  minCameraRatio:             0.001,
  maxCameraRatio:             20,
  allowInvalidContainer:      true,
};

const MODE_HINTS = {
  overview: "Inner ring = Global Macro  ·  Outer ring = Supply Chains  ·  Click any node to explore",
  chain:    "Click a stock to open its full relationship web",
  ego:      "Hover to highlight connections  ·  Click any node to explore",
};

// ── Breadcrumb navigation ────────────────────────────────────────────────────

function Breadcrumb({ mode, activeChainId, activeStockId, rawData, onNavigate }) {
  const chainNode = rawData?.nodes.find(n => n.id === activeChainId);
  const stockNode = rawData?.nodes.find(n => n.id === activeStockId);

  return (
    <nav className="breadcrumb">
      <button
        className={`bc-item ${mode === "overview" ? "bc-active" : ""}`}
        onClick={() => onNavigate("overview")}
      >
        Overview
      </button>

      {chainNode && (
        <button
          className={`bc-item ${mode === "chain" ? "bc-active" : ""}`}
          onClick={() => onNavigate("chain", activeChainId)}
        >
          {chainNode.label}
        </button>
      )}

      {stockNode && (
        <span className="bc-item bc-active bc-stock">
          {stockNode.ticker ?? activeStockId}
        </span>
      )}

      <div className="bc-spacer" />
      <div className="bc-mode-label">{
        mode === "overview" ? "Supply Chain Map" :
        mode === "chain"    ? "Industry View" :
                              "Stock Focus"
      }</div>
    </nav>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [rawData,          setRawData]          = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState(null);

  // Top-level page
  const [page,             setPage]             = useState("graph"); // "graph" | "news"

  // Navigation
  const [mode,             setMode]             = useState("overview");
  const [activeChainId,    setActiveChainId]    = useState(null);
  const [activeStockId,    setActiveStockId]    = useState(null);

  // Selection for detail panel
  const [selectedNode,     setSelectedNode]     = useState(null);

  // Scenario overlay (macro factor id)
  const [scenarioFactorId, setScenarioFactorId] = useState(null);

  // Navigation history for Back button
  const [navHistory,       setNavHistory]       = useState([]);

  useEffect(() => {
    fetch("/graph-data.json")
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(d => { setRawData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  function snapshot() {
    return { mode, activeChainId, activeStockId, selectedNode, scenarioFactorId };
  }

  function pushHistory() {
    setNavHistory(prev => [...prev, snapshot()]);
  }

  function goBack() {
    setNavHistory(prev => {
      if (!prev.length) return prev;
      const entry = prev[prev.length - 1];
      setMode(entry.mode);
      setActiveChainId(entry.activeChainId);
      setActiveStockId(entry.activeStockId);
      setSelectedNode(entry.selectedNode);
      setScenarioFactorId(entry.scenarioFactorId);
      return prev.slice(0, -1);
    });
  }

  // Escape to go back one history step
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") goBack();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navHistory]);

  const handleNodeAction = useCallback((action) => {
    const { type, nodeId, nodeType, attrs } = action;
    if (type === "clickStage") { setSelectedNode(null); return; }

    if (type === "click") {
      if (nodeType === "SupplyChain") {
        pushHistory();
        navigateTo("chain", nodeId);
      } else if (nodeType === "Stock") {
        pushHistory();
        setMode("ego");
        setActiveStockId(nodeId);
        setSelectedNode({ id: nodeId, ...attrs });
      } else if (nodeType === "MacroFactor") {
        setSelectedNode({ id: nodeId, ...attrs });
        setScenarioFactorId(prev => prev === nodeId ? null : nodeId);
      } else if (nodeType === "GlobalMacroRoot") {
        setSelectedNode({ id: nodeId, ...attrs });
      } else if (nodeType === "GlobalMacro") {
        setSelectedNode({ id: nodeId, ...attrs });
      } else {
        setSelectedNode({ id: nodeId, ...attrs });
      }
    }
  }, [mode, activeChainId, activeStockId, selectedNode, scenarioFactorId]);

  function navigateTo(toMode, chainId = null, stockId = null) {
    setMode(toMode);
    setActiveChainId(chainId);
    if (toMode !== "ego") setActiveStockId(stockId);
    if (toMode === "overview") {
      setSelectedNode(null);
      setScenarioFactorId(null);
      setNavHistory([]);
    }
  }

  function handleStockSearch(stockId) {
    if (!stockId || !rawData) { navigateTo("overview"); return; }
    const chainEdge = rawData.edges.find(e => e.relType === "CHAIN_MEMBER" && e.target === stockId);
    const stock = rawData.nodes.find(n => n.id === stockId);
    setActiveChainId(chainEdge?.source ?? null);
    setActiveStockId(stockId);
    setMode("ego");
    setSelectedNode(stock ? { id: stockId, ...stock } : null);
  }

  function handleStockFromNews(stockId) {
    setPage("graph");
    // Small timeout so graph page mounts before navigation state is set
    setTimeout(() => handleStockSearch(stockId), 60);
  }

  return (
    <div className="app-root">
      {/* ── Top navigation bar ── */}
      <nav className="top-nav">
        <div className="top-nav-brand">SET Relations</div>
        <button
          className={`top-nav-tab${page === "graph" ? " active" : ""}`}
          onClick={() => setPage("graph")}
        >
          Graph
        </button>
        <button
          className={`top-nav-tab${page === "news" ? " active" : ""}`}
          onClick={() => setPage("news")}
        >
          News
        </button>
      </nav>

      {page === "news" ? (
        <NewsPage rawData={rawData} onStockSelect={handleStockFromNews} />
      ) : (
    <div className="layout">
      <Sidebar
        rawData={rawData}
        mode={mode}
        activeChainId={activeChainId}
        selectedNode={selectedNode}
        scenarioFactorId={scenarioFactorId}
        onScenarioSelect={(id) => setScenarioFactorId(prev => prev === id ? null : id)}
        onNavigate={navigateTo}
        onStockSearch={handleStockSearch}
      />

      <div className="canvas-wrap">
        {!loading && !error && rawData && (
          <Breadcrumb
            mode={mode}
            activeChainId={activeChainId}
            activeStockId={activeStockId}
            rawData={rawData}
            onNavigate={(toMode, chainId) => { pushHistory(); navigateTo(toMode, chainId); }}
          />
        )}

        {loading && (
          <div className="overlay">
            <div className="spinner" />
            <span style={{ color: "var(--text-muted)" }}>Building graph…</span>
          </div>
        )}
        {error && (
          <div className="overlay">
            <span style={{ color: "#eb5757" }}>
              Could not load graph-data.json — run <code>python build_graph.py</code> first.
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{error}</span>
          </div>
        )}

        {!loading && !error && (
          <ErrorBoundary>
            <SigmaContainer
              settings={SIGMA_SETTINGS}
              style={{ width: "100%", height: "100%", background: "transparent" }}
            >
              <GraphController
                rawData={rawData}
                mode={mode}
                activeChainId={activeChainId}
                activeStockId={activeStockId}
                scenarioFactorId={scenarioFactorId}
                onNodeAction={handleNodeAction}
              />
            </SigmaContainer>
          </ErrorBoundary>
        )}

        {!loading && !error && navHistory.length > 0 && (
          <button className="back-btn" onClick={goBack}>
            ← Back
          </button>
        )}

        {!loading && !error && (
          <div className="mode-hint">{MODE_HINTS[mode]}</div>
        )}
      </div>

      <div className="panel right">
        <div className="panel-header"><h2>Details</h2></div>
        <div className="panel-body">
          <NodeDetail
            node={selectedNode}
            rawData={rawData}
            mode={mode}
            onScenarioActivate={(id) => setScenarioFactorId(prev => prev === id ? null : id)}
          />
        </div>
      </div>
    </div>
      )}
    </div>
  );
}
