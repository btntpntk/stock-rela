# SET Relations

Interactive knowledge graph for SET-listed stocks — relationships, supply chains, macro factors, and live quant analysis.

**No database required.** Graph and news are flat JSON files. The backend is optional; the graph renders without it and degrades gracefully if the server is not running.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser  (React 18 + Sigma.js + Graphology)            │
│  Vite dev server  →  http://localhost:5173               │
└─────────┬────────────────────────┬──────────────────────┘
          │ /graph-data.json        │ POST /analyse
          │ /news_data.json         │ GET  /health
          │ (static files)          │ GET  /startup-data
          ▼                         ▼
┌─────────────────┐    ┌────────────────────────────────┐
│  Static files   │    │  FastAPI server  (server.py)   │
│  frontend/      │    │  http://localhost:8000          │
│  public/        │    └──────────┬─────────────────────┘
└─────────────────┘               │
                         ┌────────┴──────────┐
                         │   src/agents/     │
                         │  global_macro.py  │  ← runs once at startup
                         │  market_risk.py   │  ← runs once at startup
                         │  sector_screener  │  ← runs once at startup
                         │  fundamental.py   │  ← per click
                         │  technical.py     │  ← per click
                         │  calculator.py    │
                         └────────┬──────────┘
                                  │
                         ┌────────┴──────────┐
                         │  src/data/        │
                         │  providers.py     │  ← yfinance aggregator
                         └───────────────────┘
```

### Data flow summary

| Source | Pipeline | Output |
|---|---|---|
| `Relation/*.json` + `supply_chains.json` | `build_graph.py` | `frontend/public/graph-data.json` |
| yfinance + gnews | `news_pipeline.py` | `frontend/public/news_data.json` |
| yfinance (global macro, 8 signals) | `server.py` startup | `GET /startup-data` (in-memory) |
| yfinance (per ticker) | `POST /analyse` | `AnalysisResponse` JSON |

---

## Stack

| Layer | Tech |
|---|---|
| Graph renderer | Sigma.js v3 + Graphology |
| Layout | ForceAtlas2 (web worker) |
| UI framework | React 18 + Vite |
| Backend | FastAPI + uvicorn |
| Quant data | yfinance |
| News | yfinance + gnews (optional) |

---

## Quick Start

### 1 — Install Python dependencies

```bash
pip install -r requirements.txt
# fastapi  uvicorn  yfinance  pandas  numpy
```

For news fetching also install:
```bash
pip install gnews
```

### 2 — Build static data (one-time or on schedule)

```bash
# Graph topology
python build_graph.py
# → frontend/public/graph-data.json

# Bilingual news + sentiment
python news_pipeline.py
# → frontend/public/news_data.json
```

### 3 — Start the backend (optional but unlocks live analysis)

```bash
python server.py
# → http://localhost:8000
```

The server runs three startup analyses concurrently (global macro, market fragility, sector screener). `/health` returns `{ "ready": false }` until they finish — the frontend polls this automatically.

### 4 — Start the frontend

```bash
cd frontend
npm install   # first time only
npm run dev
# → http://localhost:5173
```

Open the URL. The graph loads immediately from the static JSON. When the backend is ready, clicking any **Stock** node triggers a full quant analysis (5–15 s) and populates the right panel.

---

## Features

### Graph view

- **Overview ring** — Global Macro root → 6 macro categories → 22 supply chains
- **Chain drill-down** — click a chain to see its member stocks and upstream/downstream feeds
- **Stock ego view** — click any stock to see all relationship types radiating as spokes
- **Impact scenario** — pick a macro factor to colour connected stocks green/red by proportionality
- **Breadcrumb nav** — Overview → Chain → Stock, with Back button and Escape key
- **Stock search** — type ticker or company name; camera animates to that node
- **ForceAtlas2 layout** — same algorithm as Obsidian, runs in a web worker
- **Hover highlighting** — dims unconnected nodes (Obsidian-style)

### Right panel — per-stock analysis

| Tab | Content |
|---|---|
| All | Summary of all sections |
| Rels | Relationship breakdown by type with mini bar chart |
| News | Latest 4 articles from `news_data.json`, with sentiment badge |
| Rank (Analysis) | Live quant output — Score, Verdict, Entry, TP, SL, Strategy |

When the backend is running and you click a Stock node the **Rank** tab triggers `POST /analyse` and shows:

- **Alpha score** (0–100 composite) and **verdict** (FUND / TECH / FAIL)
- **Entry / TP / SL** prices from technical strategy selection
- **Strategy** chosen by rolling-Sharpe optimiser (MOMENTUM / MEAN_REVERSION / BREAKOUT)
- A spinner during the 5–15 s fetch; inline error on 404/500

### Left panel

- **Market Regime** card — populated from `GET /startup-data` when the backend is ready; falls back to last static values if not
- **Market Data** — SET Index / Crude Oil / Gold sparklines
- **Top Ranked** — sortable, filterable stock list (static scan data)
- **Supply Chains** — navigate to any chain view
- **Macro Overlay** — highlight affected stocks for any macro factor

### News page

- Bilingual feed (EN + TH), deduplicated, 600 + articles
- Rule-based sentiment — POSITIVE / NEGATIVE / NEUTRAL
- News impact mini-graph — news node at centre, affected stocks around it
- Filter by sentiment + language, free-text search
- Cross-navigation: clicking a stock in the news graph opens its ego view

---

## API Reference

Server runs on `http://localhost:8000`. CORS is open to `localhost:5173`, `localhost:3000`, and `localhost:4173`.

### `GET /health`

```json
{ "ready": true, "startup_error": null }
```

`ready` is `false` until the three startup analyses complete. The frontend polls this every 3 seconds.

### `GET /startup-data`

Returns the full in-memory startup state. Used to populate the Market Regime card.

```json
{
  "macro":           { "composite_macro_risk": 48.5, "macro_regime": "NEUTRAL_GROWTH", ... },
  "market_risk":     { "composite": { "composite_risk": 44.2, "regime_label": "MODERATE" }, ... },
  "sector_screener": { "ranked_sectors": [...], "top_sectors": ["TECH", "FINANCIALS"], ... }
}
```

### `POST /analyse`

**Body:** `{ "ticker": "PTT.BK" }`

Returns `AnalysisResponse` (example):

```json
{
  "ticker": "PTT.BK",
  "fundamental": {
    "signal":       "BUY",
    "alpha_score":  72.5,
    "roic":         0.142,
    "wacc":         0.089,
    "roic_wacc_spread": 0.053,
    "moat":         "NARROW",
    "sloan_ratio":  0.031,
    "fcf_quality":  0.87,
    "altman_z":     3.21,
    "altman_zone":  "SAFE",
    "asset_turnover": 0.61,
    "cash_conversion_cycle": 42.1,
    "sortino":      1.34,
    "beta":         0.92
  },
  "technical": {
    "strategy":        "MOMENTUM",
    "regime_fit":      "ADX=31.2 — strong directional trend",
    "entry_price":     38.50,
    "tp_price":        41.20,
    "sl_price":        36.80,
    "rr_ratio":        2.12,
    "signal_strength": 75,
    "atr_14":          0.82,
    "indicators":      { "price_regime": "TRENDING", "adx": 31.2 }
  },
  "macro_context": {
    "composite_macro_risk": 48.5,
    "macro_regime":         "NEUTRAL_GROWTH",
    "cycle_quadrant":       "GOLDILOCKS",
    "macro_bias_summary":   "NEUTRAL — sector selection is the alpha driver",
    "sector_adj":           3,
    "sector_name":          "ENERGY"
  },
  "market_risk": {
    "composite_risk":  44.2,
    "regime_label":    "MODERATE",
    "confidence":      71.0
  }
}
```

**Error responses:**
- `503` — server still initialising
- `404` — ticker has no price history in yfinance

---

## Agent Pipeline

All agents live in `src/agents/`. None are modified by the backend wiring — they run as-is.

### Startup (runs once, concurrently)

```
run_global_macro_analysis()   →  8 cross-asset signals, composite risk, sector adjustments
        │
        ├──parallel──▶  run_fragility_monitor()    →  3-layer fragility (regime/breadth/trigger)
        └──parallel──▶  run_sector_screener()      →  sector ranking with macro alignment
```

Results stored in `backend/state.startup_state` (in-memory, no disk I/O).

### Per click

```
fetch_all_data(ticker)         →  prices, returns, financials, info (yfinance)
        │
        ├──parallel──▶  fundamental_agent(state)        →  ROIC, WACC, Altman-Z, alpha score
        └──parallel──▶  run_technical_analysis(ticker)  →  regime detect, Sharpe-optimal strategy
```

### Agent catalogue

| File | Purpose |
|---|---|
| `global_macro.py` | 8 cross-asset signals (yields, DXY, oil, copper, gold, EM flows, China) |
| `market_risk.py` | Three-layer fragility monitor (regime / breadth / trigger) |
| `sector_screener.py` | Sector momentum, RS vs benchmark, breadth, volume flow |
| `fundamental_agent.py` | ROIC, WACC, Sloan, FCF quality, Altman-Z, alpha score |
| `technical.py` | Momentum / mean-reversion / breakout strategies, rolling-Sharpe optimiser |
| `calculator.py` | All individual metric functions |
| `sentiment.py` | Placeholder — not called |
| `risk_manager.py` | Excluded — not called |

### Universe files

`universes/` contains ticker lists extracted from `sector_screener.py`. Used at startup to pass `breadth_universe` to the fragility monitor.

| File | Contents |
|---|---|
| `SET100.json` | ~70 Thai large-cap tickers across 11 sectors |
| `WATCHLIST.json` | Personal watchlist |
| `SP500.json` | 110 US large-cap tickers across 11 GICS sectors |

---

## Graph Schema

### Node types

| Type | Description |
|---|---|
| `Stock` | SET-listed company |
| `Entity` | External institution or partner |
| `MacroFactor` | Macro / commodity driver |
| `GlobalMacroRoot` | Central hub of the overview ring |
| `GlobalMacro` | One of 6 macro categories |
| `SupplyChain` | One of 22 industry supply chains |
| `News` | News article node (news page only) |

### Edge types

| Type | Key attributes |
|---|---|
| `FINANCIAL_RELATION` | relation, proportionality, note |
| `SUPPLY_CHAIN` | relation, proportionality, sensitivity_index |
| `EQUITY_HOLDING` | ownership_pct, holding_type, proportionality |
| `COMPETITOR` | market_share_overlap, proportionality |
| `MACRO_FACTOR` | proportionality, impact_lag, logic |
| `FEEDS_INTO` | relation, sensitivity_index |
| `CHAIN_MEMBER` | relation="Member" |
| `NEWS_IMPACT` | impact_direction, impact_weight, impact_reason |

---

## Project Structure

```
stock-rela/
├── Relation/                  # Source data — one JSON per stock (~98 files)
├── supply_chains.json         # Supply chain topology + macro categories
├── build_graph.py             # Pipeline: Relation/ → graph-data.json
├── news_pipeline.py           # Pipeline: yfinance + gnews → news_data.json
├── server.py                  # FastAPI entry point — python server.py
├── requirements.txt           # fastapi uvicorn yfinance pandas numpy
│
├── universes/                 # Ticker universes for sector screener
│   ├── SET100.json
│   ├── WATCHLIST.json
│   └── SP500.json
│
├── src/
│   ├── agents/
│   │   ├── calculator.py        # All metric functions (ROIC, WACC, Altman-Z …)
│   │   ├── fundamental_agent.py # Fundamental analysis node
│   │   ├── global_macro.py      # 8-signal macro layer
│   │   ├── market_risk.py       # 3-layer fragility monitor
│   │   ├── sector_screener.py   # Sector ranking + universe definitions
│   │   ├── technical.py         # Technical strategy engine
│   │   └── sentiment.py         # Placeholder (unused)
│   └── data/
│       └── providers.py         # fetch_all_data() — yfinance aggregator
│
├── backend/
│   ├── state.py                 # startup_state dict (in-memory)
│   ├── startup.py               # Runs macro → (market_risk ‖ sector_screener)
│   └── analysis.py              # run_analysis() — per-ticker endpoint logic
│
└── frontend/
    ├── public/
    │   ├── graph-data.json      # Generated by build_graph.py
    │   └── news_data.json       # Generated by news_pipeline.py
    └── src/
        ├── App.jsx              # Root — health polling, analysis fetch, layout
        ├── index.css
        ├── pages/
        │   └── NewsPage.jsx     # News strip (ticker tape at bottom)
        └── components/
            ├── GraphController.jsx   # Sigma graph, node actions
            ├── NodeDetail.jsx        # Right panel — relations / news / analysis
            ├── Sidebar.jsx           # Left panel — market data / ranked list
            ├── NewsListPanel.jsx     # News page list
            └── NewsGraphView.jsx     # News page impact mini-graph
```

---

## News Pipeline Detail

### Sources

| Source | Library | Language | Coverage |
|---|---|---|---|
| Yahoo Finance | yfinance | English | Per-ticker company news (98 tickers) |
| Google News | gnews | Thai | Per-ticker Thai news (98 tickers) |
| Google News | gnews | Thai + English | 10 macro market queries |

### Sentiment

Articles are scored by keyword voting:

- **English** — ~60 positive terms, ~60 negative terms (word-split match)
- **Thai** — 20 positive, 20 negative Thai financial terms (substring match, e.g. `เพิ่มขึ้น`, `กำไร`, `ลดลง`, `ขาดทุน`)

Ratio ≥ 0.60 → `POSITIVE` · Ratio ≤ 0.40 → `NEGATIVE` · Otherwise → `NEUTRAL`

### Deduplication

Two shared sets across sources — `seen_urls` and `seen_titles` (normalised). Title normalisation is the primary cross-source dedup mechanism because gnews returns Google redirect URLs that differ from yfinance canonical URLs.

### Scheduling updates (Windows)

```bat
schtasks /create /tn "StockNews-AM"   /tr "python C:\path\news_pipeline.py" /sc DAILY /st 08:00
schtasks /create /tn "StockNews-Noon" /tr "python C:\path\news_pipeline.py" /sc DAILY /st 12:00
schtasks /create /tn "StockNews-PM"   /tr "python C:\path\news_pipeline.py" /sc DAILY /st 18:00
```

> gnews is optional. The pipeline falls back to yfinance-only mode if it is not installed.

---

## Known Limitations

- **`market_risk.py` startup failure** — `fetch_all_data` is `async def` but `market_risk.py` calls it synchronously (legacy code, not modified). The startup catches the resulting `TypeError`, logs it in `startup_error`, and continues. The `composite_risk` defaults to `50.0` for per-ticker analysis. Everything else works normally.
- **No authentication** — CORS is open to localhost only. Do not expose `server.py` to the public internet.
- **`sentiment.py`** — placeholder file; imports a non-existent module and is not called anywhere.
- **`risk_manager.py`** — excluded from the backend wiring; not called anywhere.
- **Static scan data** — the Top Ranked list in the left panel uses static mock data from `Sidebar.jsx`. It is not updated by the backend.
