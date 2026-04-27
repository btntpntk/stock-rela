# SET Relations — Coding Agent Handoff

## Overview
Implement the SET Relations UI redesign in the existing React 18 + Vite codebase.
This is a Thai stock exchange (SET) relationship graph explorer with bilingual news.
The attached HTML prototype (`SET Relations v6.html`) is the source of truth — read
it and all referenced `.jsx` files before touching any code.

## Step 0 — Read the prototype files first
Before writing a single line, read these files in order:
1. `SET Relations v6.html` — main shell, layout, state management, theme switching
2. `left-panel.jsx` — dark theme left panel (Market Pulse, Ranking, Chains, Scenario)
3. `right-panel.jsx` — dark theme right panel (context panel, quote modal)
4. `left-panel-paper.jsx` — newspaper theme left panel
5. `right-panel-paper.jsx` — newspaper theme right panel
6. `graph-view.jsx` — SVG graph reference (3 modes: overview/chain/ego)
7. `mock-data.js` — data schemas (mirrors real JSON pipeline output)

Extract exact hex colors, font sizes, spacing, component structure, and interaction
logic before making any changes.

---

## What to implement

### 1. Unified workspace layout (replace current tab/page switching)
```
┌──────────────────────────────────────────────────────────────┐
│  NAV (42px dark bar) — logo · mode pills · breadcrumb ·     │
│  search · ticker tape · theme toggle · live dot              │
├────────────┬─────────────────────────────────┬───────────────┤
│ LEFT PANEL │  GRAPH CANVAS (flex:1)          │ RIGHT PANEL   │
│ (var width)│                                  │ (264px fixed) │
│            ├─────────────────────────────────┤               │
│            │  NEWS STRIP (collapsible 90px)  │               │
└────────────┴─────────────────────────────────┴───────────────┘
```

### 2. Two complete themes — switchable at runtime
The app ships with both themes. Users toggle via:
- A `◑ DARK / ◐ PAPER` pill in the top-right nav
- A floating Settings panel (bottom-right)

**Dark theme tokens:**
```js
bg:'#0c0c0f', panel:'#111215', rail:'#090910',
border:'#1e2025', border2:'#16161e',
accent:'#6b9fd4', accent2:'#3d5080',
txt:'#dce4f0', txt2:'#8a9ab0', txt3:'#383848', txt4:'#252530',
pos:'#4caf76', neg:'#e05252', gold:'#c8a040',
elevated:'#1a1a20', selected:'#141c2e',
navBg:'#090910', graphBg:'#0c0c10',
headingFont:"'DM Sans',sans-serif",
```

**Newspaper (paper) theme tokens:**
```js
bg:'#FFF8F2', panel:'#FFF8F2', rail:'#F5EDE0',
border:'#C8B8A8', border2:'#D8C8B8',
accent:'#0A2540', accent2:'#1A3A5A',
txt:'#111111', txt2:'#3A3530', txt3:'#6A6058', txt4:'#A09080',
pos:'#1A5C32', neg:'#A80000', gold:'#7A5A10',
elevated:'#F5EDE0', selected:'#E6EEF8',
navBg:'#0F0F0F', graphBg:'#F8F4EE',
headingFont:"'Libre Baskerville',Georgia,serif",
bodyFont:"'DM Sans',sans-serif",
```

Import fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
```

### 3. Left panel (214px default, user-adjustable 180–280px)
Four collapsible accordion sections with `max-height` transition:
- **Market Pulse** — SET/Oil/Gold index cards with sparklines + Market Regime score bar
- **Top Ranked** — top 10 stocks from quant scan, with "Full ↗" button that expands
  full ranking table (sortable columns, filter by FUND/TECH/FAIL, search)
- **Supply Chains** — list of chains; click → graph switches to chain mode
- **Macro Overlay** — scenario selector; highlights affected nodes green/red in graph

Two versions: dark (`LeftPanel`) and paper (`LeftPanelPaper`). Swap on theme change.
See `left-panel.jsx` and `left-panel-paper.jsx` for exact rendering logic.

### 4. Right panel (264px, context-driven)
Updates instantly when any graph node is clicked. Shows:
- Stock ticker (serif heading in paper mode), price, % change
- Sparkline with area fill (238px wide)
- Key metrics grid (Market Cap, P/E, Score)
- Four inner tabs: All / Relations / News / Rank
- Relations: colored dot + label + proportional bar + count; click → navigates to peer
- News: 3 latest articles for this stock with sentiment badges
- Rank: Entry / TP / SL / Strategy / Verdict in a bordered table
- **Fade transition** (120ms opacity) when switching stocks
- **"Focus Ego View"** — navigates graph to ego mode for selected stock
- **"Open Full Quote ↗"** — opens a modal overlay with candlestick chart

Empty state: centered hex icon + "Click any node to begin analysis"

Two versions: dark (`RightPanel`) and paper (`RightPanelPaper`). Swap on theme change.
See `right-panel.jsx` and `right-panel-paper.jsx` for exact rendering logic.

### 5. Bottom news strip (collapsible)
- Height: 90px open, 26px collapsed
- Toggle bar: live pulse dot, "Market News" label, 4 ticker+sentiment previews, ▲ chevron
- Content: horizontally scrollable pills (222px each)
- Each pill: sentiment color left border, ticker, headline (2-line clamp), lang + time
- Hover: brightens headline text
- Click pill → selects that stock → graph + right panel update simultaneously
- Can be hidden entirely via Settings panel toggle
- Adapts to both themes (dark bg vs cream bg, ink border weight)

### 6. Top nav (42px, always dark `#0F0F0F`)
From left to right:
- **Logo**: "SET Relations" in heading font; paper mode adds date line below
- **Mode pills**: Overview / Chain / Ego — active pill inverts bg/text
- **Breadcrumb**: clickable history trail; updates on every navigation
- **Search**: dark input with ⌕ icon; dropdown shows stock results on type
- **Ticker tape**: scrolling animation, all stocks, pos/neg colored changes
- **Theme toggle pill**: "◑ DARK" / "◐ PAPER" — single click swaps themes
- **Live dot**: pulsing green circle

### 7. Navigation & state
```js
// Navigate helper — always push to history
const navigate = (mode, stockId, chainId, label) => {
  setGraphMode(mode);
  if (stockId !== undefined) setActiveStockId(stockId);
  if (chainId  !== undefined) setActiveChainId(chainId);
  setNavHistory(h => [...h, { label, mode, stockId, chainId }]);
};

// Select stock — updates graph + right panel simultaneously
const selectStock = ticker => {
  setSelectedStock(ticker);
  navigate('ego', ticker, undefined, ticker);
};
```
- Escape key: close search dropdown → then go back one nav step
- Node click: Stock → setSelectedStock + right panel; Chain → navigate chain mode
- "Focus Ego" in right panel → navigate ego for that stock
- Clicking relation bar peer → selectStock(peer)
- News pill click → selectStock(affected[0].ticker)
- Left panel Top Ranked row → selectStock(ticker)
- Left panel chain row → navigate chain mode

### 8. Settings panel (floating, bottom-right)
Use a floating panel (fixed position, bottom:16px right:16px) with:
- **Theme**: radio — dark / paper
- **News strip**: toggle show/hide
- **Default graph mode**: radio — overview / chain / ego
- **Left panel width**: slider 180–280px (step 4)
- **Accent colour**: colour picker (dark theme only)

Persist settings to localStorage. Read on load.

---

## Graph (Sigma.js — keep existing logic)

**Do NOT rewrite** `GraphController.jsx`. Only update these values:

In `App.jsx` Sigma settings:
```js
// Dark theme
labelFont: "'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif",
labelColor: { color: '#8a9ab0' },
labelSize: 11, labelWeight: '500',

// Paper theme
labelFont: "'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif",
labelColor: { color: '#6A6058' },
labelSize: 11, labelWeight: '600',
```

Sigma container background:
- Dark: `background: #0c0c10`
- Paper: `background: #F8F4EE`

Node colors in `GraphController.jsx` — keep `EGO_COLORS` unchanged.
Center stock node: dark `#c8d4e8`, paper `#1a3a6a`.

---

## Files to modify
| File | What changes |
|---|---|
| `App.jsx` | Full restructure — unified workspace, theme state, nav, settings |
| `Sidebar.jsx` | Replace with `LeftPanel` / `LeftPanelPaper` |
| `NodeDetail.jsx` | Replace with `RightPanel` / `RightPanelPaper` |
| `index.css` | Theme variables, scrollbar, font imports, body class switching |
| `NewsPage.jsx` | Embed as news strip (bottom bar) instead of separate page |

## Files to NOT touch
- `GraphController.jsx`
- `build_graph.py`, `news_pipeline.py`
- `supply_chains.json`, `Relation/*.json`
- `frontend/public/graph-data.json`, `news_data.json`

---

## Current user settings (from prototype)
The user has configured the following in the prototype — match these as defaults:
```json
{
  "theme": "paper",
  "defaultMode": "overview",
  "newsStrip": true,
  "accentDark": "#ffdd00"
}
```
