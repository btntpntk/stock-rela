---
name: Key source files & roles
description: What every important file does, component responsibilities, and CSS locations
type: project
---

## Frontend entry points
- `frontend/src/App.jsx` — root component; page state ("graph"|"news"), nav bar, Sigma container for graph page, routes to NewsPage
- `frontend/src/index.css` — all CSS (NYT editorial style, graph layout, news page, top nav)
- `frontend/index.html` — Vite HTML entry

## Graph page components
- `frontend/src/components/GraphController.jsx` — builds Graphology graph for each mode and registers Sigma events
  - `buildOverviewGraph` — 3-ring: GlobalMacroRoot → GlobalMacro → SupplyChain
  - `buildChainGraph` — chain centrepiece + member stocks circle + adjacent chains
  - `buildEgoGraph` — **3-layer**: center stock → category nodes (R=220) → peer nodes (R=460); categories are COMPETITOR, FINANCIAL_RELATION, SUPPLY_CHAIN, EQUITY_HOLDING, MACRO_FACTOR
- `frontend/src/components/Sidebar.jsx` — left panel: stock search, chain list, scenario selector
- `frontend/src/components/NodeDetail.jsx` — right panel: detail view per node type (StockDetail, MacroFactorDetail, SupplyChainDetail, GlobalMacroDetail, GlobalMacroRootDetail, **CategoryDetail**)

## News page components
- `frontend/src/pages/NewsPage.jsx` — fetches `/news_data.json`, holds selectedNews + filter state, grid layout
- `frontend/src/components/NewsListPanel.jsx` — article list with sentiment tabs (ALL/POSITIVE/NEGATIVE/NEUTRAL), language tabs (ALL/EN/TH), ticker/keyword search
- `frontend/src/components/NewsGraphView.jsx` — Sigma impact graph for selected article; news node at center, affected stocks in circle; clicking stock → `onStockClick` → navigates main graph to ego view

## Data files (generated, not in git)
- `frontend/public/graph-data.json` — nodes + edges for all graph modes
- `frontend/public/news_data.json` — articles array with sentiment, affected_stocks, lang fields

## Python scripts
- `build_graph.py` — reads `Relation/*.json` + `supply_chains.json`, writes graph-data.json
- `news_pipeline.py` — yfinance (EN) + gnews (TH), dedup by URL+title, sentiment scoring, writes news_data.json
- `supply_chains.json` — supply chain topology + macro categories
- `Relation/*.json` — 98 stock JSON files (source data)

## Key constants (GraphController.jsx)
- `EGO_COLORS` — relType → hex color (same palette reused in NodeDetail REL_COLORS)
- `CATEGORY_LABELS` — relType → display name ("Competitors", "Financials", etc.)
- `CAT_ORDER` — fixed clockwise ordering: COMPETITOR, FINANCIAL_RELATION, SUPPLY_CHAIN, EQUITY_HOLDING, MACRO_FACTOR
- `SKIP_REL` — set of relTypes excluded from ego view (structural edges)

## App state (App.jsx)
- `page` — "graph" | "news"
- `mode` — "overview" | "chain" | "ego"
- `activeChainId`, `activeStockId`, `selectedNode`
- `scenarioFactorId` — macro factor overlay
- `navHistory` — array of snapshots for Back/Escape navigation
