# Stock Relation Graph

Obsidian-style interactive graph visualization for SET stock relationships.
**No database required** — pure Python preprocessing + Sigma.js/Graphology frontend.

## Stack

| Layer | Tech |
|-------|------|
| Data pipeline | Python (stdlib only) |
| Graph renderer | Sigma.js v3 + Graphology |
| Layout | ForceAtlas2 (web worker) |
| UI framework | React 18 + Vite |

## Quick Start

### 1. Build the graph data

```bash
python build_graph.py
# → frontend/public/graph-data.json  (~100 stocks, ~1000+ nodes)
```

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

That's it. No Neo4j, no backend server.

---

## Features

- **ForceAtlas2 layout** — same algorithm as Obsidian, runs in a web worker
- **Hover highlighting** — dims all unconnected nodes (Obsidian-style)
- **Click to inspect** — right panel shows full relationship details with notes
- **Relationship toggles** — show/hide any of the 5 relationship types
- **Search & fly-to** — type a ticker → camera animates to that node

## Graph Schema

**Node types**
- `Stock` (blue, large) — SET-listed company
- `Entity` (orange, small) — external institution / partner
- `MacroFactor` (green, small) — macro / commodity driver

**Edge types**
- `FINANCIAL_RELATION` — regulator, shareholder, JV
- `SUPPLY_CHAIN` — upstream / downstream partner
- `EQUITY_HOLDING` — subsidiary / equity stake (with %)
- `COMPETITOR` — direct competitor
- `MACRO_FACTOR` — macro driver with proportionality & impact lag
