# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Python pipeline (run in order)
```bash
python build_graph.py          # → frontend/public/graph-data.json
python market_pipeline.py      # → frontend/public/market_data.json (also injects into graph-data.json)
python news_pipeline.py        # → frontend/public/news_data.json
```

### Backend
```bash
pip install -r requirements.txt
uvicorn server:app --reload    # FastAPI on http://localhost:8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev     # Vite dev server on http://localhost:3000
npm run build   # Production build to frontend/dist/
```

## Architecture

**Static-JSON-first:** React fetches only from `/public/*.json` — never from a live API. The FastAPI backend at `localhost:8000` is optional; it provides live technical/fundamental analysis on demand (node clicks) but the graph renders without it.

### Data flow

```
build_graph.py  →  graph-data.json   (graph topology: nodes + edges)
market_pipeline.py → market_data.json (prices, macro, alpha scores)
                  + injects market_cap/pe/alpha_score into graph-data.json stock nodes
news_pipeline.py → news_data.json    (bilingual news, sentiment, affected_stocks)

React fetches all three on load, falls back gracefully when files are missing.
```

### Three-tier data priority (prices/macro in React)
1. `market_data.json` (from `market_pipeline.py`)
2. Backend `/prices` endpoint (yfinance live, runs only when server is up)
3. Static fallback values

### Backend endpoints (`server.py`)
- `GET /prices?tickers=A,B` — live yfinance prices + change_pct + sparklines
- `GET /sparklines?tickers=A,B` — 30-day history
- `GET /correlations?tickers=A,B` — correlation matrix
- `GET /analyse?ticker=X` — full fundamental + technical analysis (runs agents)
- `GET /startup-data` — macro/sector/market-risk precomputed at boot

### Frontend structure
```
App.jsx                    — root: theme, data fetches, breadcrumb nav, layout
components/
  Sidebar.jsx              — left panel: market pulse, macro overlay, ranked list
  NodeDetail.jsx           — right panel: stock detail, relations, news
  GraphController.jsx      — Sigma.js graph (3D via Three.js/react-three-fiber)
  InstitutionalHeader.jsx  — top nav bar: breadcrumbs, ticker tape, search
  MacroRegimePanel.jsx     — macro regime widget
  QuantFundamentalsPanel.jsx
pages/NewsPage.jsx         — bottom news strip (newspaper grid layout)
```

### Theme system
Two themes: **dark** (default) and **paper**. Each component defines its own token object (`DK`/`PP` in Sidebar, `RP`/`PP` in NodeDetail, `DARK` in App). Token names are consistent: `txt`, `txt2`, `txt3`, `txt4`, `accent`, `pos`, `neg`, `border`, `elevated`, `selected`.

Current dark `txt3` is `#707888` (muted blue-grey for secondary labels).

### Graph data contracts
- `graph-data.json`: `{ nodes: [{ id, nodeType, ticker, label, market_cap, pe, alpha_score }], edges: [{ relType, source, target }] }`
- `market_data.json`: `{ generated_at, macro: { SET, OIL, GOLD: { price, change_pct, sparkline } }, stocks: { "TICKER.BK": { price, change_pct, market_cap, pe, alpha_score, sparkline } } }`
- `news_data.json`: `{ news: [{ id, ticker_source, title, sentiment, affected_stocks: [{ ticker, impact_weight, impact_direction }], published_at (unix ts) } ] }`

### Key node/edge types
Node types: `Stock`, `SupplyChain`, `MacroFactor`, `Category`, `RootCategory`
Edge `relType` values: `CHAIN_MEMBER`, `SUPPLY_CHAIN`, `COMPETITOR`, `FINANCIAL_RELATION`, `EQUITY_HOLDING`, `MACRO_FACTOR`, `FEEDS_INTO`

`SKIP_REL` in NodeDetail excludes structural edges from the peer list: `CHAIN_MEMBER`, `FEEDS_INTO`, `MACRO_CHAIN`, `ROOT_CAT`, `CAT_MACRO`, `CAT_CHAIN`, `ROOT_MACRO`.

### Universes
`universes/SET100.json`, `SP500.json`, `WATCHLIST.json` — sector-grouped ticker lists imported directly into `Sidebar.jsx` at build time (no fetch). `RANKED_TICKERS` exported from Sidebar is the flat list used for TickerTape and backend price fetches.

### Python agents (`src/agents/`)
Called by `backend/analysis.py` on `/analyse` requests. Not invoked at static build time. `market_risk.py` has a known async issue. `sentiment.py` is a placeholder.
