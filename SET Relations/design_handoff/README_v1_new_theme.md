# Handoff: SET Relations — UI Redesign (Version 1: New Dark Theme)

## Overview
Complete redesign of the SET Relations app — a Thai stock exchange (SET) relationship graph explorer with a bilingual news feed. This handoff replaces the existing UI with a new **"Command Center" dark theme** while preserving all existing graph logic (Sigma.js, Graphology, ForceAtlas2) and data pipeline.

## About the Design Files
The files in `design_handoff/` are **HTML prototypes** — high-fidelity design references showing intended layout, colors, typography, and interactions. Your task is to **recreate these in the existing React 18 + Vite codebase** using its established patterns (Sigma.js, Graphology, React state). Do not ship the HTML files directly.

**Reference file:** `SET Relations.html` (main prototype), with supporting files `graph-view.jsx`, `panels.jsx`, `news-page.jsx`, `mock-data.js`.

## Fidelity
**High-fidelity.** Recreate pixel-precisely using the design tokens below. The prototype shows final colors, typography, spacing, hover states, and interactions.

---

## Layout Architecture

```
┌─────────────────────────────────────────────────────────┐
│  TOP NAV (38px)  — logo · tabs · breadcrumb · ticker    │
├────┬──────┬────────────────────────────┬────────────────┤
│Icon│Side  │   Graph Canvas (flex:1)    │  Node Detail   │
│Rail│Panel │   or News Page             │  (218px)       │
│40px│196px │                            │                │
└────┴──────┴────────────────────────────┴────────────────┘
```
- Total sidebar = 40px icon rail + 196px panel = 236px
- NodeDetail right drawer = 218px, hidden when nothing selected
- News page replaces Graph Canvas + NodeDetail (full width minus sidebar)
- All panels use `overflow: hidden` + `flexShrink: 0`

---

## Design Tokens

### Colors
```css
--bg-base:        #0c0c0f;   /* page background */
--bg-panel:       #111215;   /* sidebar, node detail */
--bg-rail:        #0c0c0f;   /* icon rail */
--bg-canvas:      #0c0c10;   /* graph canvas */
--bg-elevated:    #1a1a20;   /* inputs, hover rows */
--bg-selected:    #141c2e;   /* selected list item */
--bg-accent:      #1a2640;   /* active icon, active pill */

--border:         #1e2025;
--border-subtle:  #16161e;
--border-accent:  #2d4060;

--text-primary:   #dce4f0;
--text-secondary: #8a9ab0;
--text-dim:       #383848;
--text-muted:     #252530;
--text-accent:    #6b9fd4;   /* blue accent */

--accent:         #6b9fd4;
--accent-dark:    #3d5080;

--positive:       #4caf76;
--positive-bg:    #122218;
--negative:       #e05252;
--negative-bg:    #221212;
--neutral:        #6a7a8a;
--neutral-bg:     #181820;
```

### EGO_COLORS (relation type → node/edge color)
```js
COMPETITOR:         '#c87840'
SUPPLY_CHAIN:       '#508060'
FINANCIAL_RELATION: '#904080'
EQUITY_HOLDING:     '#4a6fa5'
MACRO_FACTOR:       '#708888'
```

### Typography
- **Font family:** `'DM Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif`
- **Graph labels:** Keep existing `Libre Baskerville, Georgia, serif` (Sigma setting)
- Weights used: 400, 500, 600, 700, 800
- Import: `https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800`

### Spacing & Radius
- Panel padding: 10–14px horizontal, 7–11px vertical
- Border radius: 2–4px (very subtle, near-square)
- Section headers: 7px, 700 weight, 0.12em letter-spacing, uppercase, color `#3a3a4a`

---

## Components

### Top Nav (38px height, background #090910)
- **Logo:** "SET" in `#6b9fd4`, 10.5px, 800 weight, 0.18em tracking. "Relations" in `#1e1e2a`, 9px
- **Page tabs:** "GRAPH" / "NEWS" — 8.5px, 700 weight, uppercase. Active: `#c0c8d8`, 2px bottom border `#6b9fd4`. Inactive: `#282838`
- **Breadcrumb:** 8px text, clickable history crumbs in `#303045`, current in `#6b9fd4` 600 weight. Separator › in `#252530`
- **Ticker tape:** Scrolling animation, stock ID in `#3a4055` 600w, change % in `#2d6644` (pos) or `#6a2828` (neg), 8px
- **Live indicator:** 5px green pulsing dot + "LIVE · SET" label in `#252530`

### Icon Rail (40px wide, background #0c0c0f)
Three icon buttons: Search (⌕), Chains (⬡), Scenario (◈)
- Button size: 30×30px, border-radius 4px
- Active: background `#1a2640`, color `#6b9fd4`
- Inactive: transparent background, color `#303040`

### Sidebar Panel (196px, background #111215)
**Search section:**
- Input: background `#1a1a20`, border `#2a2a35`, 9px text, color `#c0c8d8`, border-radius 3px, padding 5px 8px
- Result rows: 7px 12px padding, hover `#181820`, stock ID in `#8faad4`, name in `#3a3a50` 7.5px

**Chains section:**
- Mode switcher: 3-button row (Overview/Chain/Ego). Active: bg `#1a2640`, color `#6b9fd4`, outline `#2d4060`. Inactive: `#181820`/`#303040`
- Chain list rows: 6px 12px padding, active: bg `#141c2e`, left border 2px `#3d5080`, text `#8faad4`. Inactive: `#404055`
- Member preview: 7px text, color `#252530`

**Scenario section:**
- Same row style as chains
- Impact preview: positive tickers in `#4caf76`, negative in `#e05252`, 8px 700w

### Graph Canvas
- Background `#0c0c10`
- Watermark: bottom-left, 7px, `#1e1e28`, uppercase: "{mode} · sigma.js"
- Zoom controls: bottom-right, 22×22px buttons, bg `#12121a`, border `#1e1e28`, color `#282838`
- Scanline texture overlay on body: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 3px)`

### Node Detail Panel (218px, background #0f1014, border-left #1a1a22)
Empty state: centered text "Click a node / to inspect" in `#1e1e28`, 8px uppercase

**Stock header:**
- Stock ID: 17px, 800w, `#dce4f0`, -0.02em tracking
- Company name: 8px, `#383848`
- Price: 11px, 700w, `#c0c8d8` · Change: 9px, 700w, pos/neg color
- Section dividers: 1px `#1a1a22`

**Metrics table:** key 7.5px `#2c2c3c`, value 8px `#606070` 600w, 4px bottom margin

**Relations breakdown:**
- Colored dot (8px circle) + label (8px `#333345`) + bar chart (height 3px, colored) + count (7.5px `#28283a`)
- Bar width = count × 7px, opacity 0.6

**Action buttons:**
- Primary (FOCUS EGO / EXPLORE CHAIN): bg `#142030`, border `#1e3050`, color `#6b9fd4`, 8px 700w
- Secondary (VIEW NEWS): bg `#16161e`, border `#222230`, color `#383848`
- Full width, 5px padding, border-radius 2px

---

## Graph Rendering Changes (Sigma.js)

Update `SIGMA_SETTINGS` in `App.jsx` and `NewsGraphView.jsx`:
```js
labelFont: "'DM Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif",
labelColor: { color: '#8a9ab0' },   // was #121212
labelSize: 11,
labelWeight: '500',
```

Node colors — update `EGO_COLORS` in `GraphController.jsx`:
```js
COMPETITOR:         '#c87840',
SUPPLY_CHAIN:       '#508060',
FINANCIAL_RELATION: '#904080',
EQUITY_HOLDING:     '#4a6fa5',
MACRO_FACTOR:       '#708888',
```
Center stock node: color `#c8d4e8`, size 20.
SupplyChain nodes: color `#6b9fd4`.
GlobalMacro nodes: use macro colors above.

Edge colors: stock→category `rgba(150,150,150,0.35)`, category→peer use EGO_COLORS[relType] + 'bb'.

Graph canvas background: set `background: #0c0c10` on the Sigma container div.

---

## Sidebar Redesign (Sidebar.jsx)

Replace the existing Sidebar with a **two-column layout**: icon rail (40px) + collapsible panel (196px).

State:
```js
const [section, setSection] = useState('chains'); // 'search' | 'chains' | 'scenario'
```

The section determines which panel content is shown. The icon rail toggles it.

Keep existing props interface (`activeChainId`, `setActiveChainId`, `activeStockId`, `setActiveStockId`, etc.) unchanged so `App.jsx` wiring is unaffected.

---

## NodeDetail Redesign (NodeDetail.jsx)

Replace as a right drawer with `width: 218px`, `flexShrink: 0`. Show/hide by whether `selectedNode` is non-null.

Handle all node types: Stock, Category, Chain, GhostChain, Macro, GlobalMacroRoot, SupplyChain — see prototype `panels.jsx` for per-type rendering logic.

---

## News Page Redesign (NewsPage.jsx + NewsListPanel.jsx + NewsGraphView.jsx)

Layout: full-width flex row
```
┌───────────────┬────────────────────────────────────────┐
│ Article List  │  Article Detail + Impact Graph         │
│ (310px)       │  (flex:1)                              │
└───────────────┴────────────────────────────────────────┘
```

**Article list items:**
- Selected: bg `#121a2c`, left border 2px `#3d5080`
- Sentiment badge: 7.5px, padding 1px 5px, border-radius 2px, colored bg/text per sentiment
- Title: 8.5px, 2-line clamp, selected `#9ab0c8`, unselected `#404055`

**Article detail:**
- Title: 14px, 700w, `#c8d4e8`, line-height 1.35
- Summary: 8.5px, `#3a3a50`, line-height 1.6
- Sentiment score bar: colored fill (pos `#4caf76`, neg `#e05252`, neu `#6a7a8a`), height 3px
- Affected stock chips: bg `#141420`, border 1px colored at 30% opacity, ticker 8.5px 700w colored

**Impact graph (NewsGraphView.jsx):**
- News center node: color `#3d5080`, radius 13
- Stock nodes: `#4caf76` (pos), `#e05252` (neg), `#6a7a8a` (neu)
- Node size scales with impact_weight: r = 8 + weight × 5
- Edge opacity 0.25 idle, 0.6 on hover; strokeWidth = weight × 1.5

---

## Interactions & Navigation

### Back Navigation
Maintain `navHistory` array of snapshots `{ label, mode, stockId, chainId }`.
- Breadcrumb in nav renders clickable history items
- Escape key goes back one step
- "Focus Ego View" / "Explore Chain" action buttons push to history

### Node click flow
1. Click graph node → update `selectedNode` state → NodeDetail panel updates
2. Click "FOCUS EGO VIEW" in NodeDetail → push to navHistory, switch mode to 'ego', set activeStockId
3. Click stock chip in News article detail → switch to graph page, push ego view for that stock

---

## CSS / index.css Changes

Replace existing styles with dark theme. Key global rules:
```css
body {
  background: #0c0c0f;
  color: #c0c8d8;
  font-family: 'DM Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
}
/* Scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-thumb { background: #2a2a35; border-radius: 2px; }
/* Scanline overlay */
body::after {
  content: '';
  position: fixed; inset: 0;
  background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 3px);
  pointer-events: none; z-index: 9999;
}
```
