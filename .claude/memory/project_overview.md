---
name: Project overview & stack
description: What stock-rela is, its tech stack, data flow, and how to run it
type: project
---

SET (Thai stock exchange) relationship graph visualization + bilingual news feed.
No backend server — pure Python preprocessing + static JSON served by Vite.

**Why:** Obsidian-style graph explorer for Thai stocks (SET), with supply chain drill-downs, macro scenario overlays, and a news page showing sentiment + stock impact weights.

**How to apply:** When suggesting architecture or new features, keep it static-JSON-first. No database, no API server needed.

## Stack
- Python: `yfinance` (EN news) + `gnews` (TH news), stdlib only for graph build
- Graph: Sigma.js v3 + Graphology (`graphology`, `@react-sigma/core`)
- Layout: ForceAtlas2 web worker
- UI: React 18 + Vite

## Data flow
```
Relation/*.json (98 stock JSONs)  →  build_graph.py  →  frontend/public/graph-data.json
yfinance + gnews                  →  news_pipeline.py →  frontend/public/news_data.json
```
Both JSON files are loaded at runtime by React (`fetch("/graph-data.json")`).

## Run commands
```bash
python build_graph.py        # regenerate graph-data.json
python news_pipeline.py      # fetch & score news → news_data.json
cd frontend && npm run dev   # http://localhost:5173
```

## Pages
- **Graph page** (`page === "graph"`): 3-mode graph (overview / chain / ego)
- **News page** (`page === "news"`): article list + Sigma impact graph per article
