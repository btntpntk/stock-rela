# Alpha Terminal — WebGL Refactor Workplan

**Date:** 2026-04-28  
**Author:** Lead Quant Software Engineer  
**Status:** CONFIRMED — all decisions signed off 2026-04-28, implementation in progress

---

## 1. Audit Summary — What Exists

### 1.1 Current Stack
| Layer | Technology | File(s) |
|---|---|---|
| Graph renderer | Sigma.js 3 + Graphology | `GraphController.jsx`, `App.jsx` (SigmaContainer) |
| Layout | Static concentric + ego fan (hand-computed xy) | `GraphController.jsx` |
| State | React `useState` / `useMemo` / `useCallback` (no external lib) | `App.jsx` |
| Left panel | Market Pulse, Top Ranked, Universe selector | `Sidebar.jsx` (LeftPanel) |
| Right panel | Stock analysis, relations, news, full quant detail | `NodeDetail.jsx` (RightPanel) |
| Data fetch | `/graph-data.json`, `/market_data.json`, `/prices`, `/sparklines`, `/analyse` | `App.jsx` |
| News strip | Impact-weighted newspaper grid | `NewsPage.jsx` |

### 1.2 Reuse — MUST NOT duplicate
| Asset | Location | Why it's reused |
|---|---|---|
| `rawData` fetch & state | `App.jsx:361-372` | Entire graph is built from this |
| `marketData`, `marketPrices`, `sparklines` | `App.jsx` state | All price/quant data lives here |
| `fetchAnalysis()` + `analysisData` state | `App.jsx:335-357` | Backend quant pipeline, expensive call |
| `selectStock()`, `navigate()`, `goBack()` | `App.jsx` callbacks | Navigation state machine |
| `useMacroItems()` | `Sidebar.jsx:30-52` | Macro price + sparkline derivation |
| `useActiveRanked()`, `usePanelData()` | `Sidebar.jsx:54-138` | Universe-filtered ranked list |
| `buildAllRanked()`, `RANKED_TICKERS` | `Sidebar.jsx:80-93` | Universe → ticker registry |
| Graph topology builders | `GraphController.jsx:73-368` | Node positions + relationship geometry — adapted, not replaced |
| `LeftPanel` | `Sidebar.jsx` | Keep as-is; only enrich left-panel data props |
| `RightPanel` | `NodeDetail.jsx` | Keep as-is; will add Z-score + sentiment props |
| `NewsStrip` | `NewsPage.jsx` | Unchanged |
| `SettingsPanel` | `App.jsx` | Add bloom/physics toggles |

### 1.3 Replace / Remove
| Current | Replacement | Reason |
|---|---|---|
| `SigmaContainer` (@react-sigma/core) | `<Canvas>` (@react-three/fiber) | WebGL acceleration + 3D |
| `GraphController.jsx` (Sigma events/loader) | `ThreeGraph.jsx` (Three.js scene) | New renderer |
| Graphology graph objects (internal) | Plain `{nodes[], edges[]}` arrays | Three.js doesn't use Graphology |
| `sigmaSettings` in App.jsx | Three.js scene config | Sigma-specific |
| `@react-sigma/*` packages | `@react-three/fiber`, `three`, `d3-force-3d` | Stack swap |

---

## 2. New Package List

### Add
```
three
@react-three/fiber        # React renderer for Three.js
@react-three/drei         # OrbitControls, Text, Billboard, useFrame helpers
@react-three/postprocessing  # UnrealBloomPass, EffectComposer
d3-force-3d               # 3D physics simulation (replaces static xy layout)
```

### Remove
```
@react-sigma/core
@react-sigma/layout-forceatlas2
graphology-layout
graphology-layout-forceatlas2
sigma
```
> **Keep:** `graphology` — still used for graph topology builders that produce the node/edge arrays.

---

## 3. Component Tree — Before vs After

### Before
```
App
├── LeftPanel (Sidebar)
├── SigmaContainer
│   └── GraphController          ← Sigma events + Graphology loader
├── RightPanel (NodeDetail)
├── NewsStrip
└── SettingsPanel
```

### After
```
App
├── LeftPanel (Sidebar)          ← unchanged; add correlationMatrix prop
├── ThreeCanvas                  ← replaces SigmaContainer block
│   ├── Canvas (@r3f)
│   │   ├── EffectComposer       ← UnrealBloomPass post-processing
│   │   │   └── Bloom
│   │   ├── OrbitControls        ← camera
│   │   ├── ForceGraph3D         ← physics simulation driver
│   │   │   ├── NodeMesh (×N)    ← SphereGeometry, scaled by vol/mktcap
│   │   │   ├── EdgeLine (×N)    ← LineDashedMaterial (predictive) or LineBasicMaterial
│   │   │   └── LatentZone       ← attractor corner + dim ghost nodes
│   │   └── HoverTooltip         ← Billboard DOM overlay (drei)
│   └── GraphModeOverlay         ← "ego / chain / overview" label (DOM)
├── RightPanel (NodeDetail)      ← add zScores + sentimentScore props
├── NewsStrip                    ← unchanged
└── SettingsPanel                ← add bloom intensity + physics speed sliders
```

---

## 4. Data Flow Architecture

```
App.jsx (master state)
  │
  ├─ rawData ──────────────────────────────────► ForceGraph3D
  │                                               (node/edge extraction)
  ├─ marketData / marketPrices ────────────────► ForceGraph3D (node scale)
  │                                           ► LeftPanel (macro items)
  ├─ analysisData ─────────────────────────────► RightPanel (full analysis)
  │                                           ► NodeMesh (ego node glow)
  ├─ selectedStock (ego ticker) ───────────────► ForceGraph3D (ego center force)
  ├─ graphMode (overview/chain/ego) ───────────► ForceGraph3D (graph builder)
  └─ correlationMatrix (NEW derived state) ────► LeftPanel (correlation panel)
                                              ► EdgeLine (thickness/color)
```

### New Derived State (App.jsx additions)
```js
// Derived from marketPrices returns — no new API call
const correlationMatrix = useMemo(() => deriveCorrelations(marketPrices, activeRanked), [...])
// Derived from analysisData
const zScores = useMemo(() => deriveZScores(analysisData), [analysisData])
```

---

## 5. Graph Builder Adaptation Strategy

The existing `buildOverviewGraph`, `buildChainGraph`, `buildEgoGraph` in `GraphController.jsx` contain all the mathematical positioning and relationship logic. Instead of rewriting them:

1. **Extract** a new `buildGraphData(mode, rawData, ...)` function that returns `{ nodes: NodeDatum[], edges: EdgeDatum[] }` instead of a Graphology object.
2. The **position math** (concentric rings, ego fans, R1/R2 radii) is ported directly — adding a `z` coordinate drawn from a Gaussian jitter (±80) to lift the 2D layout into 3D naturally.
3. The returned arrays feed both the Three.js scene **and** the d3-force-3d simulation as initial positions.

### NodeDatum schema
```ts
interface NodeDatum {
  id: string;
  nodeType: string;
  label: string;
  x: number; y: number; z: number;  // initial position (from existing math)
  size: number;                      // existing size logic
  color: string;                     // existing color logic
  volatility?: number;               // from marketPrices (scales sphere radius)
  marketCap?: number;                // from rawData node attrs
  correlationToEgo?: number;         // computed — drives latent zone force
}
```

### EdgeDatum schema
```ts
interface EdgeDatum {
  source: string; target: string;
  relType: string;
  color: string;
  thickness: number;    // ρ or β magnitude (0.5–4.0)
  dashed: boolean;      // true if Granger Causality or predictive flag
  sentiment?: number;   // -1.0 → 1.0 from news NLP
}
```

---

## 6. Three.js Implementation Notes

### 6.1 Node Rendering (NodeMesh)
```
radius = BASE_RADIUS * (1 + volatility * VOLATILITY_SCALE)
       + MKTCAP_SCALE * log(marketCap ?? 1)
material = MeshStandardMaterial { color, emissive: color×0.2, roughness: 0.4 }
ego node: emissiveIntensity = 0.9, radius × 1.6
```

### 6.2 Edge Rendering (EdgeLine)
```
// Solid edges (known structural relations)
material = LineBasicMaterial { color: sentiment-mapped, linewidth: ρ×3 }

// Dashed edges (Granger Causality / predictive / FEEDS_INTO)
material = LineDashedMaterial { dashSize: 6, gapSize: 3 }
// Animate: dashOffset -= delta × FLOW_SPEED in useFrame()

// Color mapping:
//   ρ > 0.6 AND positive sentiment  → #4caf76 (green)
//   ρ < -0.3 OR negative sentiment  → #e05252 (red)
//   else                            → #6b9fd4 (neutral blue)
```

### 6.3 Latent Zone Force
```
// Applied in d3-force-3d custom force
// Nodes with |correlationToEgo| < LATENT_THRESHOLD (0.2) are pulled toward
// LATENT_CORNER = { x: -600, y: -600, z: -400 }
// Force magnitude = alpha × LATENT_STRENGTH × (1 - correlation/threshold)
```

### 6.4 Bloom Alert (threshold crossing)
```
// When latentNode.correlationToEgo crosses 0.2 (upward):
//   - Bloom layer: <SelectiveBloom> targets the specific node mesh ref
//   - Position animation: spring from LATENT_CORNER toward ego position
//   - Duration: 800ms ease-out
```

### 6.5 Post-processing
```
<EffectComposer>
  <Bloom luminanceThreshold={0.3} intensity={1.2} mipmapBlur />
</EffectComposer>
```

---

## 7. Left Panel Enrichment (LeftPanel — Correlation Matrix)

**No new API calls.** `marketPrices` already contains price + change_pct for all tickers.

New `DKSection` added to LeftPanel: **"Correlations"**
- Shows a mini 4×4 heatmap: active ticker vs. top-3 macro factors (SET, OIL, GOLD) + 1 selected peer
- Values: Pearson ρ derived from sparkline arrays already fetched via `/sparklines`
- Historical Z-score row: `z = (ρ_current - ρ_mean) / ρ_std` over the sparkline window

**Component:** `CorrelationMatrix` — pure React, no Three.js dependency.

---

## 8. Right Panel Enrichment (RightPanel)

**No new API calls.** Derived from `analysisData` already returned by `/analyse`.

New sub-section in Analysis tab:
- **Mean Reversion Z-Score:** `z = (price - SMA_20) / σ_20` — computed from `analysisData.technical`
- **NLP Sentiment Heatmap (placeholder):** Renders a colour-scaled bar per news item using existing `stockNews` sentiment field (`POSITIVE / NEUTRAL / NEGATIVE` → `1 / 0 / -1`). Full NLP scores (-1.0→1.0) wired when backend adds `sentiment_score` field to news JSON.

---

## 9. Implementation Phases

### Phase 1 — Package swap + scaffold ✅
- [x] `npm install three @react-three/fiber @react-three/drei @react-three/postprocessing d3-force-3d`
- [x] `npm uninstall @react-sigma/core @react-sigma/layout-forceatlas2 graphology-layout graphology-layout-forceatlas2 sigma`
- [x] Create `frontend/src/components/ThreeCanvas/` directory
- [x] Create `ThreeCanvas/index.jsx` with `<Canvas>` + `<OrbitControls>` + `<EffectComposer>/<Bloom>`
- [x] Swap `SigmaContainer` + `GraphController` in App.jsx → `ThreeCanvas`
- [x] Add `physicsEnabled` + `bloomIntensity` to `TWEAK_DEFAULTS` and SettingsPanel
- [x] Add `correlations` state + `/correlations` fetch in `selectStock`
- [x] Add `/correlations` backend endpoint to `server.py`
- [x] Build verified clean (exit 0)

### Phase 2 — Graph data adapter ✅
- [x] `graphDataBuilder.js` — pure functions adapting existing builder logic to `{nodes[], edges[]}`
- [x] Ported `buildOverviewGraph`, `buildChainGraph`, `buildEgoGraph` as `buildOverviewData/buildChainData/buildEgoData`
- [x] Added `z` coordinate (Gaussian Box-Muller jitter)
- [x] `buildGraphData(mode, rawData, {activeChainId, activeStockId, scenarioFactorId})` router

### Phase 3 — Static Three.js render ✅ (combined with Phase 4)
- [x] `NodeMesh` — SphereGeometry + MeshStandardMaterial, click/hover handlers, Billboard Text labels
- [x] Imperative Line objects (not JSX) in lineGroup ref, edge geometry updated in `useFrame`
- [x] `ForceGraph3D.jsx` — node meshes at initial positions, edges connecting them
- [x] Click → `onNodeAction` (same interface as current GraphController)
- [x] Hover → emissive intensity change

### Phase 4 — d3-force-3d physics ✅ (combined with Phase 3)
- [x] `forceSimulation3d` with `useEffect` + `useFrame` position update loop
- [x] `forceManyBody`, `forceLink`, `forceCenter`, `forceCollide`
- [x] Custom latent-zone force (LATENT_CORNER = [-600,-600,-400], threshold 0.20)
- [x] Ego node pinned at origin via `fx/fy/fz = 0`
- [x] Camera auto-fit (CameraRig) — `<Bounds>` + `CameraRig.refresh().fit()` in ThreeCanvas/index.jsx ✅

### Phase 5 — Dynamic visual bindings ✅
- [x] `nodeRadius()` — volatility from |change_pct| × VOL_SCALE + structural base size
- [x] Edge opacity ← |ρ| (0.15–0.92 range; encodes correlation strength since WebGL linewidth > 1 unsupported)
- [x] Edge color ← ρ × sentiment: green (ρ>0.6 + pos news) / red (ρ<-0.3 or neg news) / neutral blue
- [x] Dashed edge dashOffset animated in `useFrame` at 8 units/s
- [x] Ego node emissiveIntensity = 0.7 (always-on glow), selected = 0.9
- [x] `sentimentMap` derived in App.jsx from newsData articles, forwarded to ThreeCanvas → ForceGraph3D
- [x] `disposeTrio` on edge rebuild (geometry + material disposed to avoid GPU leaks)

### Phase 6 — Post-processing + Bloom ✅ (done in Phase 1)
- [x] `EffectComposer` + `Bloom` wired in ThreeCanvas/index.jsx
- [x] Bloom intensity slider in SettingsPanel (0–3 range)
- [x] Latent-zone crossing bloom alert — upward ρ threshold crossing triggers 800ms ease-out spring + emissiveIntensity flash (peaks 3.5→normal), caught by global Bloom pass ✅

### Phase 7 — Panel enrichments ✅
- [x] Correlations DKSection in LeftPanel — shows top-12 peers sorted by |ρ|, color-coded bar + value, clickable to select stock
- [x] Section only renders when `selectedStock` set + `correlations` available (ego mode)
- [x] Z-score row in RightPanel Analysis tab ✅ (Phase 8)
- [x] NLP Sentiment Heatmap in RightPanel ✅ (Phase 8)

### Phase 8 — Polish + performance ✅
- [x] **O(1) node lookup in useFrame** — `Map` rebuilt on graph change, synced on sim tick; replaces O(n) `nodes.find()` per edge per frame
- [x] **`React.memo` on NodeMeshWrapper** with custom comparator — skips re-render for unaffected nodes when hoveredId/selectedId changes; only node whose own hover/select state changed re-renders
- [x] **Camera auto-fit** — `<Bounds fit clip observe>` wraps scene; `CameraRig` calls `bounds.refresh().fit()` whenever mode/stock/chain changes
- [x] **Label LOD** — overview mode hides stock labels (too many); ego/chain mode shows all labels; ego + category nodes always labeled
- [x] **Latent node visual** — uncorrelated nodes (max|ρ| < 0.20) rendered with `#444455` dim color, `opacity: 0.28`, low emissive; pushed to corner by d3 force
- [x] **Z-score mean reversion row** — `z = (price − entry_price) / atr_14` in Technical section; bidirectional bar, color-coded Overbought/Extended/Mean/Discounted/Oversold
- [x] **NLP sentiment heatmap** — per-article bidirectional bar in news list; uses `sentiment_score` float if present, falls back to POSITIVE/NEUTRAL/NEGATIVE enum mapping
- [x] **GPU leak fix** — `.geometry.dispose()` + `.material.dispose()` on edge rebuild
- [ ] `instancedMesh` for SET100 — not needed (≤ 100 nodes, perf acceptable)

---

## 10. Confirmed Decisions (signed off 2026-04-28)

| # | Decision | **CONFIRMED** |
|---|---|---|
| 1 | Physics default | **Toggle in SettingsPanel** (off by default) |
| 2 | Sigma fallback | **Hard swap — Three.js immediately, no Sigma fallback** |
| 3 | Correlation source | **New `/correlations` endpoint — 30-day Pearson ρ via yf.download() batch** |
| 4 | Camera default | **Top-down perspective `[0, 0, 1000]`, free orbit enabled** |
| 5 | Latent threshold | **0.20** |
| 6 | Scope | **SET100 only — no SP500 InstancedMesh in this pass** |

---

## 11. Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| `linewidth` > 1 unsupported on WebGL (Windows/Chrome) | HIGH | Use cylinder geometry for thick edges, or accept 1px limit and encode weight via opacity instead |
| d3-force-3d tick loop conflicts with React render | MEDIUM | Run simulation outside React render cycle; update positions via `ref` not `state` |
| 500-node SP500 frame rate | MEDIUM | InstancedMesh + physics toggle + LOD |
| sparkline window (5 days) too short for meaningful ρ | MEDIUM | Extend `/sparklines` period to 30d; or add `/correlations` endpoint |
| `@react-three/postprocessing` SelectiveBloom API surface changes | LOW | Pin version; wrap in try/catch fallback to standard Bloom |

---

## 12. File Creation / Modification Map

### New files
```
frontend/src/components/ThreeCanvas/
  index.jsx               ← Canvas wrapper + EffectComposer
  ForceGraph3D.jsx         ← physics simulation + node/edge rendering coordinator
  NodeMesh.jsx             ← individual node geometry + material
  EdgeLine.jsx             ← individual edge geometry + material
  LatentZone.jsx           ← custom force + ghost node rendering
  CameraRig.jsx            ← auto-fit + OrbitControls
  graphDataBuilder.js      ← pure functions: rawData → {nodes[], edges[]}
  CorrelationMatrix.jsx    ← left panel correlation heatmap
```

### Modified files
```
App.jsx                   ← swap SigmaContainer → ThreeCanvas, add correlationMatrix state
Sidebar.jsx               ← add CorrelationMatrix section to LeftPanel
NodeDetail.jsx            ← add Z-score row + sentiment heatmap to RightPanel
frontend/package.json     ← package swap
```

### Untouched files
```
Sidebar.jsx (data logic)   ← all hooks, ranked list, universe selector
NewsPage.jsx
backend/*
universes/*
```

---

## Sign-off Checklist

- [x] Confirm open decisions (Section 10) before Phase 1 starts
- [x] Confirm `/correlations` endpoint needed — **YES, add it**
- [x] Confirm SP500 scope — **OUT of scope this pass**
- [x] Confirm font choice — **Merriweather + Inter**
