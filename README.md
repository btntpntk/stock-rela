# Stock Relation Graph

Obsidian-style interactive graph visualization for SET stock relationships, with a bilingual live news feed (English + Thai) showing sentiment and market impact per article.
**No database required** — pure Python preprocessing + Sigma.js/Graphology frontend.

## Stack

| Layer | Tech |
|---|---|
| Data pipeline | Python (stdlib + yfinance + gnews) |
| Graph renderer | Sigma.js v3 + Graphology |
| Layout | ForceAtlas2 (web worker) |
| UI framework | React 18 + Vite |

## Quick Start

### 1. Install Python dependencies

```bash
pip install yfinance gnews
```

### 2. Build the graph data

```bash
python build_graph.py
# -> frontend/public/graph-data.json  (~100 stocks, 1000+ nodes)
```

### 3. Fetch the latest news

```bash
python news_pipeline.py
# -> frontend/public/news_data.json  (~600+ articles, EN + TH)
```

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
# -> http://localhost:5173
```

That's it. No Neo4j, no backend server.

---

## Features

### Graph Page

- **3-ring overview** — Global Macro root → 6 macro categories → 22 supply chains
- **Chain drill-down** — click a chain to see its member stocks and upstream/downstream feeds
- **Stock ego view** — click any stock to see all 5 relationship types as spokes
- **ForceAtlas2 layout** — same algorithm as Obsidian, runs in a web worker
- **Hover highlighting** — dims all unconnected nodes (Obsidian-style)
- **Impact scenario** — pick a macro factor to colour chains green/red by proportionality
- **Stock search** — type a ticker or company name, camera animates to that node
- **Breadcrumb nav** — Overview → Chain → Stock, with Back button and Escape key

### News Page

- **Bilingual news feed** — 600+ articles from two sources, English and Thai, deduplicated across all 98 tickers
- **Rule-based sentiment** — each article is classified `POSITIVE / NEGATIVE / NEUTRAL` by English keyword voting + Thai substring matching
- **Impact graph** — selecting an article opens a Sigma.js graph: news node at center, affected stocks around it; edge color = impact direction (green/red), edge width = impact weight
- **Filter & search** — filter by sentiment (Positive / Negative / Neutral) and language (EN / TH), plus free-text ticker/keyword search
- **TH badge** — Thai-language articles are labelled with a blue `TH` tag in the list
- **Cross-navigation** — clicking a stock in the news graph switches to the Graph page and opens that stock's ego view

---

## News Sources

| Source | Library | Language | Coverage |
|---|---|---|---|
| Yahoo Finance | `yfinance` | English | Per-ticker company news (98 tickers) |
| Google News | `gnews` | Thai | Per-ticker Thai news (98 tickers) |
| Google News | `gnews` | Thai + English | 10 macro market queries |

### Thai macro queries

| Query | Topic |
|---|---|
| `ตลาดหุ้น SET index` | SET market |
| `กนง อัตราดอกเบี้ย นโยบาย` | BOT interest rate |
| `เศรษฐกิจไทย GDP` | Thai economy |
| `ราคาน้ำมัน ไทย` | Oil price |
| `ค่าเงินบาท ดอลลาร์` | THB/USD |
| `นักท่องเที่ยว ไทย` | Tourism |
| `หุ้นไทย วันนี้` | Daily market |
| `SET Thailand stock market` | SET (EN) |
| `Thailand economy baht interest rate` | Macro (EN) |
| `Thailand stocks today` | Market (EN) |

### Sentiment analysis

Articles are scored by keyword voting across two languages:

- **English** — word-split match against ~60 positive and ~60 negative financial terms
- **Thai** — substring match against 20 positive and 20 negative Thai financial terms (e.g. `เพิ่มขึ้น`, `กำไร`, `ลดลง`, `ขาดทุน`)

Ratio ≥ 0.60 → `POSITIVE` · Ratio ≤ 0.40 → `NEGATIVE` · Otherwise → `NEUTRAL`

---

## Graph Schema

### Node types

| Type | Description |
|---|---|
| `Stock` | SET-listed company |
| `Entity` | External institution or partner |
| `MacroFactor` | Macro / commodity driver |
| `GlobalMacroRoot` | Central hub of the overview ring |
| `GlobalMacro` | One of 6 macro categories (Energy, Agriculture, …) |
| `SupplyChain` | One of 22 industry supply chains |
| `News` | News article node (News page only) |

### Edge types

| Type | Attributes |
|---|---|
| `FINANCIAL_RELATION` | relation, proportionality, note |
| `SUPPLY_CHAIN` | relation, proportionality, sensitivity_index, note |
| `EQUITY_HOLDING` | ownership_pct, holding_type, proportionality |
| `COMPETITOR` | market_share_overlap, proportionality, note |
| `MACRO_FACTOR` | proportionality, impact_lag, logic |
| `FEEDS_INTO` | relation, sensitivity_index, note |
| `CHAIN_MEMBER` | relation="Member" |
| `NEWS_IMPACT` | impact_direction, impact_weight, impact_reason |

---

## Data Pipeline

```
Relation/*.json  (98 stock JSON files)
      |
      v
build_graph.py + supply_chains.json
      |
      v
frontend/public/graph-data.json          <-- loaded by Graph page


Yahoo Finance (yfinance)  +  Google News (gnews)
      |                              |
      | EN, per-ticker               | TH, per-ticker + macro queries
      +------------------------------+
                     |
                     v
             news_pipeline.py
             (dedup by URL + title, sentiment scoring)
                     |
                     v
      frontend/public/news_data.json     <-- loaded by News page
```

### Deduplication

The pipeline maintains two shared sets across both sources — `seen_urls` and `seen_titles` (normalized). Because gnews returns Google News redirect URLs that differ from Yahoo Finance canonical URLs, title normalization is the primary cross-source dedup mechanism.

### Scheduling news updates (Windows)

Run `news_pipeline.py` 3x daily via Task Scheduler:

```bat
schtasks /create /tn "StockNews-Morning" /tr "python C:\path\to\news_pipeline.py" /sc DAILY /st 08:00
schtasks /create /tn "StockNews-Noon"    /tr "python C:\path\to\news_pipeline.py" /sc DAILY /st 12:00
schtasks /create /tn "StockNews-Evening" /tr "python C:\path\to\news_pipeline.py" /sc DAILY /st 18:00
```

> gnews is optional. If not installed, the pipeline falls back to yfinance-only mode and prints a warning.

---

## Project Structure

```
stock-rela/
├── Relation/               # 98 stock JSON files (source data)
├── supply_chains.json      # Supply chain topology & macro categories
├── build_graph.py          # Graph data pipeline -> graph-data.json
├── news_pipeline.py        # Bilingual news fetch & sentiment -> news_data.json
├── clean_tickers.py        # Ticker normalisation utility
└── frontend/
    ├── public/
    │   ├── graph-data.json # Generated by build_graph.py
    │   └── news_data.json  # Generated by news_pipeline.py
    └── src/
        ├── App.jsx
        ├── index.css
        ├── pages/
        │   └── NewsPage.jsx
        └── components/
            ├── GraphController.jsx
            ├── NodeDetail.jsx
            ├── Sidebar.jsx
            ├── NewsListPanel.jsx
            └── NewsGraphView.jsx
```
