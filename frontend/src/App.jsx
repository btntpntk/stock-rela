import { useState, useEffect, useCallback, Component } from "react";
import { SigmaContainer } from "@react-sigma/core";
import "@react-sigma/core/lib/style.css";
import GraphController from "./components/GraphController";
import Sidebar from "./components/Sidebar";
import NodeDetail from "./components/NodeDetail";

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
  labelFont:                  "Inter, sans-serif",
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
  overview: "Click a chain to drill in  ·  Click a macro factor chip to see impact  ·  Scroll to zoom",
  chain:    "Click a stock to open its full relationship web  ·  Esc to go back",
  ego:      "Hover to highlight connections  ·  Click any node to explore  ·  Esc to go back",
};

// ── Breadcrumb navigation ────────────────────────────────────────────────────

function Breadcrumb({ mode, activeChainId, activeStockId, rawData, onNavigate }) {
  const chainNode = rawData?.nodes.find(n => n.id === activeChainId);
  const stockNode = rawData?.nodes.find(n => n.id === activeStockId);

  return (
    <nav className="breadcrumb">
      <button
        className={`bc-btn ${mode === "overview" ? "bc-active" : ""}`}
        onClick={() => onNavigate("overview")}
      >
        🌏 Overview
      </button>

      {chainNode && (
        <>
          <span className="bc-sep">›</span>
          <button
            className={`bc-btn ${mode === "chain" ? "bc-active" : ""}`}
            onClick={() => onNavigate("chain", activeChainId)}
          >
            {chainNode.label}
          </button>
        </>
      )}

      {stockNode && (
        <>
          <span className="bc-sep">›</span>
          <span className="bc-btn bc-active">{stockNode.ticker ?? activeStockId}</span>
        </>
      )}
    </nav>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [rawData,          setRawData]          = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState(null);

  // Navigation
  const [mode,             setMode]             = useState("overview");
  const [activeChainId,    setActiveChainId]    = useState(null);
  const [activeStockId,    setActiveStockId]    = useState(null);

  // Selection for detail panel
  const [selectedNode,     setSelectedNode]     = useState(null);

  // Scenario overlay (macro factor id)
  const [scenarioFactorId, setScenarioFactorId] = useState(null);

  useEffect(() => {
    fetch("/graph-data.json")
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(d => { setRawData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  // Escape to go up one level
  useEffect(() => {
    function onKey(e) {
      if (e.key !== "Escape") return;
      if (mode === "ego")   navigateTo("chain", activeChainId);
      else if (mode === "chain") navigateTo("overview");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, activeChainId]);

  const handleNodeAction = useCallback((action) => {
    const { type, nodeId, nodeType, attrs } = action;
    if (type === "clickStage") { setSelectedNode(null); return; }

    setSelectedNode({ id: nodeId, ...attrs });

    if (type === "click") {
      if (nodeType === "SupplyChain") {
        navigateTo("chain", nodeId);
      } else if (nodeType === "Stock") {
        // Keep activeChainId for breadcrumb continuity
        setMode("ego");
        setActiveStockId(nodeId);
      } else if (nodeType === "MacroFactor") {
        setScenarioFactorId(prev => prev === nodeId ? null : nodeId);
      }
    }
  }, []);

  function navigateTo(toMode, chainId = null, stockId = null) {
    setMode(toMode);
    setActiveChainId(chainId);
    if (toMode !== "ego") setActiveStockId(stockId);
    if (toMode === "overview") {
      setSelectedNode(null);
      setScenarioFactorId(null);
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

  return (
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
            onNavigate={navigateTo}
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
  );
}
