import { useEffect } from "react";
import { SigmaContainer, useSigma, useLoadGraph, useRegisterEvents } from "@react-sigma/core";
import Graphology from "graphology";

const MultiDirectedGraph = Graphology.MultiDirectedGraph;

const SIGMA_SETTINGS = {
  defaultNodeType:            "circle",
  defaultEdgeType:            "arrow",
  renderEdgeLabels:           false,
  labelFont:                  "Libre Baskerville, Georgia, serif",
  labelSize:                  13,
  labelWeight:                "700",
  labelColor:                 { color: "#121212" },
  labelDensity:               1.2,
  labelGridCellSize:          80,
  labelRenderedSizeThreshold: 3,
  zoomingRatio:               1.5,
  minCameraRatio:             0.01,
  maxCameraRatio:             10,
  allowInvalidContainer:      true,
};

function formatTimeAgo(unixTs) {
  if (!unixTs) return "";
  const diff = Math.floor(Date.now() / 1000) - unixTs;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Inner graph controller (must live inside SigmaContainer) ──────────────────

function NewsGraphController({ selectedNews, rawData, onStockClick }) {
  const sigma          = useSigma();
  const loadGraph      = useLoadGraph();
  const registerEvents = useRegisterEvents();

  // Build and load graph whenever selected article changes
  useEffect(() => {
    if (!selectedNews) return;

    const graph    = new MultiDirectedGraph();
    const newsId   = `News:${selectedNews.id}`;
    const sentColor =
      selectedNews.sentiment === "POSITIVE" ? "#6fcf97" :
      selectedNews.sentiment === "NEGATIVE" ? "#eb5757" : "#AAAAAA";

    // News node at origin
    graph.addNode(newsId, {
      nodeType: "News",
      label:    selectedNews.title.length > 38
        ? selectedNews.title.slice(0, 36) + "…"
        : selectedNews.title,
      size:  22,
      color: sentColor,
      x: 0, y: 0,
    });

    // Affected stock nodes arranged in a circle
    const affected = selectedNews.affected_stocks ?? [];
    const R = affected.length <= 3 ? 240 : affected.length <= 6 ? 320 : 420;

    affected.forEach(({ ticker, impact_direction, impact_weight }, i) => {
      const angle     = (i / Math.max(affected.length, 1)) * 2 * Math.PI - Math.PI / 2;
      const stockNode = rawData?.nodes.find(n => n.id === ticker);
      const edgeColor =
        impact_direction === "POSITIVE" ? "#6fcf97cc" :
        impact_direction === "NEGATIVE" ? "#eb5757cc" : "#AAAAAA88";
      const nodeSize  = impact_weight >= 0.9 ? 14 : impact_weight >= 0.6 ? 11 : 9;

      if (!graph.hasNode(ticker)) {
        graph.addNode(ticker, {
          nodeType: "Stock",
          label:    (stockNode?.ticker ?? ticker).replace(".BK", "").replace(".TH", ""),
          name:     stockNode?.name ?? ticker,
          ticker:   ticker,
          size:     nodeSize,
          color:    "#121212",
          x: Math.cos(angle) * R,
          y: Math.sin(angle) * R,
        });
      }

      graph.addEdge(newsId, ticker, {
        color:            edgeColor,
        size:             Math.max(1.5, impact_weight * 9),
        relType:          "NEWS_IMPACT",
        impact_direction: impact_direction,
        impact_weight:    impact_weight,
      });
    });

    loadGraph(graph);
    setTimeout(() => {
      try { sigma.getCamera().animatedReset({ duration: 420 }); } catch {}
    }, 60);
    sigma.refresh();
  }, [selectedNews]);

  // Hover highlight
  useEffect(() => {
    registerEvents({
      enterNode: ({ node }) => {
        const g = sigma.getGraph();
        const neighbors = new Set(g.neighbors(node));
        sigma.setSettings({
          nodeReducer: (n, data) => {
            if (n === node || neighbors.has(n)) return { ...data, zIndex: 1 };
            return { ...data, color: "#DDDBD6", label: "", zIndex: 0 };
          },
          edgeReducer: (edge, data) => {
            const [s, t] = g.extremities(edge);
            if (s === node || t === node) return { ...data, size: data.size * 2, zIndex: 1 };
            return { ...data, hidden: true };
          },
        });
      },
      leaveNode: () => {
        sigma.setSettings({ nodeReducer: null, edgeReducer: null });
      },
      clickNode: ({ node }) => {
        const attrs = sigma.getGraph().getNodeAttributes(node);
        if (attrs.nodeType === "Stock") onStockClick(node);
      },
    });
  }, [registerEvents, sigma, onStockClick]);

  return null;
}

// ── Legend ────────────────────────────────────────────────────────────────────

function ImpactLegend({ sentiment }) {
  return (
    <div className="news-graph-legend">
      <span className="legend-item">
        <span className="legend-dot" style={{ background: sentiment === "POSITIVE" ? "#6fcf97" : sentiment === "NEGATIVE" ? "#eb5757" : "#AAAAAA" }} />
        News ({sentiment})
      </span>
      <span className="legend-item">
        <span className="legend-line" style={{ background: "#6fcf97" }} />
        Positive impact
      </span>
      <span className="legend-item">
        <span className="legend-line" style={{ background: "#eb5757" }} />
        Negative impact
      </span>
      <span className="legend-note">Edge width = impact weight · Click stock to open graph</span>
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

export default function NewsGraphView({ selectedNews, rawData, onStockClick }) {
  if (!selectedNews) {
    return (
      <div className="news-graph-empty">
        <div className="news-graph-empty-icon">◈</div>
        <strong>Select an article</strong>
        <div>Click a news item to see which stocks are affected and how</div>
      </div>
    );
  }

  return (
    <div className="news-graph-wrap">
      {/* Article header */}
      <div className="news-graph-header">
        <div className="news-graph-article-title">{selectedNews.title}</div>
        <div className="news-graph-meta">
          <span>{selectedNews.source || "—"}</span>
          <span>·</span>
          <span>{formatTimeAgo(selectedNews.published_at)}</span>
          {selectedNews.url && (
            <a
              href={selectedNews.url}
              target="_blank"
              rel="noopener noreferrer"
              className="news-ext-link"
            >
              ↗ Read article
            </a>
          )}
        </div>
        {selectedNews.summary && (
          <div className="news-graph-summary">{selectedNews.summary}</div>
        )}
      </div>

      {/* Sigma graph — key forces fresh Sigma instance per article */}
      <SigmaContainer
        key={selectedNews.id}
        settings={SIGMA_SETTINGS}
        style={{ flex: 1, background: "transparent" }}
      >
        <NewsGraphController
          selectedNews={selectedNews}
          rawData={rawData}
          onStockClick={onStockClick}
        />
      </SigmaContainer>

      <ImpactLegend sentiment={selectedNews.sentiment} />
    </div>
  );
}
