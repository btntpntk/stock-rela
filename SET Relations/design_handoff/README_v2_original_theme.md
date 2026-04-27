# Handoff: SET Relations — UI Redesign (Version 2: Original Theme Preserved)

## Overview
Layout and UX restructure of the SET Relations app using the **existing visual identity** (NYT editorial style, Libre Baskerville, black-on-white palette). The existing `index.css` color palette and typography are kept — only the **layout architecture, information hierarchy, and navigation flow** are changed.

## About the Design Files
The files in `design_handoff/` are **HTML prototypes** — design references showing intended layout and interactions. Your task is to **recreate the layout structure in the existing React 18 + Vite codebase**, applying the original `index.css` design tokens (colors, fonts, spacing) rather than the dark theme shown in the HTML prototype.

**Reference file:** `SET Relations.html` (use for layout/interaction reference only — ignore dark colors). The existing `frontend/src/index.css` defines all colors and typography to use.

## Fidelity
**High-fidelity layout, original visual system.** The layout structure, panel widths, section hierarchy, and interaction patterns should match the prototype exactly. Colors, fonts, and decorative styles should come from the existing codebase's design system.

---

## What Changes vs. What Stays

### KEEP (do not change)
- `index.css` color palette (blacks, whites, cream tones — NYT editorial)
- `Libre Baskerville, Georgia, serif` for graph labels (Sigma setting)
- `EGO_COLORS` hex values in `GraphController.jsx` (relation type colors)
- Sigma.js settings (`labelColor: { color: '#121212' }`, etc.)
- All Python pipeline scripts, data schemas, JSON formats
- `build_graph.py`, `news_pipeline.py`, `supply_chains.json`

### CHANGE (layout & UX only)
- Navigation architecture → Command Center shell
- Sidebar structure → icon rail + collapsible panel
- NodeDetail → right drawer
- News page → two-column (list + detail)
- Breadcrumb navigation in top nav
- Back/Escape navigation with history stack

---

## Layout Architecture

```
┌─────────────────────────────────────────────────────────┐
│  TOP NAV (44px)  — logo · tabs · breadcrumb · ticker    │
├────┬──────┬────────────────────────────┬────────────────┤
│Icon│Side  │   Graph Canvas (flex:1)    │  Node Detail   │
│Rail│Panel │   or News Page             │  (228px)       │
│44px│200px │                            │                │
└────┴──────┴────────────────────────────┴────────────────┘
```

Same structural proportions as Version 1, but with light background panels.

---

## Design Token Mapping (Original Theme)

Translate the prototype's dark tokens to the original light palette:

| Prototype token     | Original theme equivalent            |
|---------------------|--------------------------------------|
| `--bg-base: #0c0c0f` | `#ffffff` or existing body bg       |
| `--bg-panel: #111215` | `#fafaf8` (cream/off-white)        |
| `--bg-rail: #0c0c0f` | `#f5f4f0` (light grey-cream)       |
| `--bg-elevated: #1a1a20` | `#f0ede8` (input bg)            |
| `--bg-selected: #141c2e` | `#eef2fa` (selected row bg)     |
| `--border: #1e2025` | `#e0ddd8` (existing border color)   |
| `--text-primary: #dce4f0` | `#121212` (existing body text)  |
| `--text-secondary: #8a9ab0` | `#666660` (secondary text)    |
| `--text-dim: #383848` | `#999990` (dim labels)             |
| `--text-accent: #6b9fd4` | `#1a3a6a` (dark blue accent)   |
| Active border/pill  | `#121212` or `#1a3a6a`             |
| Positive `#4caf76` | Keep — `#2a7a4a` (slightly darker)  |
| Negative `#e05252` | Keep — `#c03030`                    |

**Typography:** Keep existing font stack. Use `Libre Baskerville` for headings inside panels (stock name in NodeDetail, article title in NewsPage), sans-serif for UI labels and metadata.

---

## Sidebar Redesign (Sidebar.jsx)

Replace with icon rail + panel, same structure as Version 1 but using original palette.

**Icon rail (44px, bg from original nav/sidebar color):**
- Active button: background `#eef2fa` or `#1a3a6a`, border-radius 4px
- Inactive: transparent

**Panel sections (Search / Chains / Scenario):**

*Mode switcher pills:*
- Active: border-bottom 2px `#121212`, text `#121212` 700w
- Inactive: text `#999990`
- Style as text tabs, not filled buttons — consistent with NYT editorial

*Chain list rows:*
- Active: left border 2px `#121212`, background `#f0ede8`, text `#121212` 700w
- Inactive: text `#666660`, hover `#fafaf8`

*Search results:*
- Stock ID: 9px, 700w, `#1a3a6a`
- Company name: 7.5px, `#999990`

---

## NodeDetail Redesign (NodeDetail.jsx)

Right drawer, 228px wide, background matching existing sidebar panel color.

**Stock header block:**
- Stock ID: use `Libre Baskerville` or existing heading font, 18px, black
- Company name: 8.5px, `#999990`
- Price + change: use existing number styling from current NodeDetail

**Relations breakdown:**
- Colored dot (EGO_COLORS — keep as-is) + label + horizontal bar + count
- Bar: height 3px, colored fill, opacity 0.6, width proportional to count

**Action buttons:**
- Primary: black background `#121212`, white text — same as existing CTA style
- Secondary: outlined, border `#e0ddd8`, text `#999990`

---

## Navigation Shell (App.jsx)

### Top Nav restructure
Current nav likely has page toggle. Extend it to include:
1. **Breadcrumb trail** (clickable) showing navigation history
2. **Ticker tape** with live % changes (scrolling marquee, 8px)
3. All existing elements (logo, page toggle) kept

### navHistory state
```js
const [navHistory, setNavHistory] = useState([
  { label: 'Overview', mode: 'overview', stockId: null, chainId: null }
]);
```
Push a new snapshot on every mode change / node focus navigation.
Pop on Escape key or breadcrumb click.

### navigate() helper
```js
const navigate = (mode, stockId, chainId, label) => {
  setMode(mode);
  if (stockId) setActiveStockId(stockId);
  if (chainId)  setActiveChainId(chainId);
  setSelectedNode(null);
  setNavHistory(h => [...h, { label, mode, stockId, chainId }]);
};
```

---

## News Page Redesign (NewsPage.jsx)

Two-column layout (same as Version 1):
- Left column (310px): article list with filter tabs
- Right column (flex:1): selected article detail + impact graph

**Filter tabs (original style):**
Render as horizontal tab strip using existing tab styling from `index.css` — underline-style active tab with `#121212` border-bottom. Labels: All / ▲ Pos / ▼ Neg / — Neu + EN/TH language toggle.

**Article list items (original style):**
- Sentiment badge: small colored tag; use existing badge/pill component if present, or `font-size: 7.5px`, `padding: 2px 5px`, colored text only (no filled backgrounds if not in existing system)
- Title: 9px, existing body font, 2-line clamp
- Source + time: 7.5px, `#999990`

**Article detail:**
- Title: `Libre Baskerville` or existing article-heading style, ~15px, `#121212`
- Body: existing body text style, 9px, line-height 1.6

**Sentiment score bar:**
- Thin bar, 3px height, same as Version 1 but using theme-appropriate background `#e0ddd8`

**Affected stock chips:**
- Original style: small bordered tags, existing border/background from `index.css`
- Click navigates to ego graph (same as Version 1)

---

## Impact Graph (NewsGraphView.jsx)

Keep existing Sigma.js implementation. Visual changes:
- News center node: color `#1a3a6a` (dark blue)
- Positive stocks: `#2a7a4a`, Negative: `#c03030`, Neutral: `#888880`
- Edge opacity: 0.3 idle, 0.6 hovered
- Canvas background: existing light background

---

## Interactions & Navigation

Identical to Version 1 — see that README's "Interactions & Navigation" section. All interaction logic is theme-agnostic.

---

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/App.jsx` | Add nav shell, navHistory, breadcrumb, navigate() helper, ticker tape |
| `frontend/src/components/Sidebar.jsx` | Replace with icon rail + panel layout |
| `frontend/src/components/NodeDetail.jsx` | Replace with right drawer |
| `frontend/src/pages/NewsPage.jsx` | Two-column layout |
| `frontend/src/components/NewsListPanel.jsx` | Updated filter tabs + list items |
| `frontend/src/components/NewsGraphView.jsx` | Updated node colors only |
| `frontend/src/index.css` | Add layout rules (flex shell, panel widths, scrollbar). Do NOT change color variables |

Do **not** modify:
- `frontend/src/components/GraphController.jsx` (graph logic)
- `build_graph.py`, `news_pipeline.py`
- `frontend/public/graph-data.json`, `news_data.json`
