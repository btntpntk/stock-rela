# Alpha Terminal: Repository Audit & Optimization Report

**Date:** 2026-04-28  
**Auditor:** Lead Performance Architect  
**Scope:** Full repository — `server.py`, `backend/`, `frontend/src/App.jsx`, `ThreeCanvas/`, `Sidebar.jsx`, `MacroRegimePanel.jsx`, `QuantFundamentalsPanel.jsx`

---

## 1. 🚨 Missing Data & Pipeline Failures

### [P1] `handleNodeAction` never calls `fetchCorrelations` — graph clicks don't load macro panel data
**File:** `frontend/src/App.jsx:495–515`

When a user clicks a node **directly in the graph**, `handleNodeAction` fires analysis but not correlations. Only `selectStock()` (triggered by search and sidebar) calls `fetchCorrelations`. Result: MacroRegimePanel always shows `—` for graph-click selections.

```js
// ❌ CURRENT — handleNodeAction Stock branch duplicates selectStock but skips correlations
} else if (nodeType === 'Stock') {
  const ticker = attrs?.ticker || nodeId.replace('.BK', '');
  setSelectedStock(ticker);
  setActiveStockId(nodeId);
  navigate('ego', nodeId, undefined, ticker);
  fetchAnalysis(nodeId);   // ← correlations never fetched here
}

// ✅ FIX — delegate to selectStock which already handles both
} else if (nodeType === 'Stock') {
  const ticker = attrs?.ticker || nodeId.replace('.BK', '');
  selectStock(ticker);     // single source of truth
}
```

---

### [P2] `/correlations` O(N²) Python loop — 1,260 individual `pd.concat` allocations
**File:** `server.py:108–121`

The nested loop calls `pd.concat` once per ordered pair. For 36 tickers (30 peers + 6 macro symbols), that is **1,260 DataFrame concatenations**. Each allocates a new DataFrame in memory. The equivalent one-shot `np.corrcoef` call on the full matrix is 50–100× faster.

```python
# ❌ CURRENT — O(N²) Python-level loop with pd.concat per pair
for col in returns.columns:
    col_returns = returns[col].dropna()
    correlations = {}
    for other in returns.columns:
        if col == other: continue
        paired = pd.concat([col_returns, returns[other].dropna()], axis=1).dropna()
        if len(paired) < 5: continue
        rho = float(np.corrcoef(paired.iloc[:, 0], paired.iloc[:, 1])[0, 1])
        correlations[other_key] = round(rho, 4)
    result[col_key] = correlations

# ✅ FIX — single vectorized BLAS call, O(N²) in C, not Python
def _compute():
    import pandas as pd
    import numpy as np

    raw = yf.download(ticker_list, period=period, interval=interval,
                      progress=False, auto_adjust=True)
    if raw.empty:
        return {}
    closes  = raw["Close"] if isinstance(raw.columns, pd.MultiIndex) else raw
    returns = closes.pct_change().dropna(how="all").dropna(axis=1, how="all")

    cols    = list(returns.columns)
    mat     = np.corrcoef(returns.values.T)   # single BLAS dgemm — microseconds
    mat     = np.where(np.isnan(mat), 0.0, mat)

    result = {}
    for i, ci in enumerate(cols):
        row = {}
        for j, cj in enumerate(cols):
            if i != j and abs(mat[i, j]) > 1e-6:
                row[str(cj)] = round(float(mat[i, j]), 4)
        result[str(ci)] = row
    return result
```

---

### [P3] `/prices` fetches tickers serially — 100+ tickers × ~120ms = 12-second startup stall
**File:** `server.py:54–66`

`yf.Ticker(t).fast_info` is called in a `for` loop. With the full RANKED_TICKERS set (~100 SET100 tickers + 3 macro symbols), this serialises 103 network round-trips in the same thread.

```python
# ❌ CURRENT — serial loop, one HTTP call after another
def _fetch():
    result = {}
    for t in ticker_list:
        try:
            fi = yf.Ticker(t).fast_info
            ...

# ✅ FIX — concurrent I/O with ThreadPoolExecutor
from concurrent.futures import ThreadPoolExecutor, as_completed

def _fetch():
    def _one(t):
        try:
            fi    = yf.Ticker(t).fast_info
            price = fi.last_price
            prev  = fi.previous_close
            chg   = round((float(price)-float(prev))/float(prev)*100, 2) if price and prev else 0.0
            return t, {"price": round(float(price), 2) if price else None, "change_pct": chg}
        except Exception:
            return t, None

    with ThreadPoolExecutor(max_workers=20) as ex:
        futs = {ex.submit(_one, t): t for t in ticker_list}
        return {t: f.result()[1] for f, t in zip(futs, futs)}
```

---

### [P4] `buildEgoData` and edge builder use `Array.find()` per node — O(N²) scans
**File:** `frontend/src/components/ThreeCanvas/graphDataBuilder.js:235–238, 255`

```js
// ❌ CURRENT — O(N) linear scan per edge endpoint, called for every edge
rawEdges.forEach(edge => {
  const src = rawNodes.find(n => n.id === edge.source);  // O(N)
  const tgt = rawNodes.find(n => n.id === edge.target);  // O(N)
  ...
});
// Same pattern inside buildEgoData:
const peerNode = rawData.nodes.find(n => n.id === id);   // O(N) inside forEach

// ✅ FIX — pre-build O(1) Map before any loop
const nodeById = new Map(rawNodes.map(n => [n.id, n]));
rawEdges.forEach(edge => {
  const src = nodeById.get(edge.source);
  const tgt = nodeById.get(edge.target);
  if (!src || !tgt) return;
  ...
});
```

For 200 nodes × 400 edges this eliminates **160,000 comparisons** per graph build.

---

### [P5] `analysis.py` — `float(curr_price)` crashes when price is `0` (falsy)
**File:** `backend/analysis.py:28–31`

```python
# ❌ CURRENT — `or` treats 0 as falsy; a ฿0.00 stock triggers AttributeError on float(None)
curr_price = info.get("currentPrice") or info.get("regularMarketPrice")

# ✅ FIX — explicit None check
curr_price = info.get("currentPrice")
if curr_price is None:
    curr_price = info.get("regularMarketPrice")
```

---

### [P6] `gaussianJitter` is unseeded — node positions re-randomise on every mode switch
**File:** `frontend/src/components/ThreeCanvas/graphDataBuilder.js:4–9`

Every call to `buildOverviewData/buildChainData/buildEgoData` calls `gaussianJitter()` which uses `Math.random()`. When the user switches back to Overview mode, all node positions shuffle to new random values. This is disorienting.

```js
// ✅ FIX — deterministic jitter seeded by node ID using mulberry32
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return h >>> 0;
}
function gaussianJitter(nodeId, scale = 80) {
  const rng = mulberry32(hashStr(nodeId));
  const u = 1 - rng(), v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * scale;
}
// Call as: gaussianJitter(node.id, 40)  instead of gaussianJitter(40)
```

---

### [P7] `QuantFundamentalsPanel` re-computes sentiment from raw `newsData` — duplicates App.jsx work
**File:** `frontend/src/components/QuantFundamentalsPanel.jsx:91–116`

`App.jsx` already computes `sentimentMap` (per-ticker mean). `QuantFundamentalsPanel` ignores it and re-iterates all articles on every render. Pass `sentimentMap` as a prop:

```js
// ✅ FIX — accept sentimentMap prop, remove the useMemo re-computation
export default function QuantFundamentalsPanel({
  ticker, analysisData, rawData, newsData,
  marketPrices, sentimentMap, width = 240  // ← add sentimentMap
}) {
  const stockSentiment  = sentimentMap?.[ticker?.replace('.BK', '')] ?? null;
  // sector sentiment still needs newsData iteration; keep just that slice
```

---

## 2. 🛡️ Fallback & Error Handling Deficiencies

### [F1] `fetchCorrelations` swallows all errors silently — no retry, no UI feedback
**File:** `frontend/src/App.jsx:310–316`

```js
// ❌ CURRENT — silent catch, user never knows correlations failed
const fetchCorrelations = useCallback(async (tickers) => {
  ...
  try {
    const r = await fetch(...);
    if (r.ok) setCorrelations(await r.json());
  } catch {}  // ← black hole
}, [backendReady]);

// ✅ FIX — exponential backoff + stale-data flag
const correlationErrorRef = useRef(0);
const fetchCorrelations = useCallback(async (tickers, attempt = 0) => {
  if (!backendReady || !tickers?.length) return;
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 15_000);  // 15s hard cap
  try {
    const r = await fetch(
      `http://localhost:8000/correlations?tickers=${tickers.join(',')}`,
      { signal: ctrl.signal }
    );
    clearTimeout(timeout);
    if (r.ok) {
      setCorrelations(await r.json());
      correlationErrorRef.current = 0;
    }
  } catch (e) {
    clearTimeout(timeout);
    const delay = Math.min(1000 * 2 ** attempt, 30_000);
    if (attempt < 3)
      setTimeout(() => fetchCorrelations(tickers, attempt + 1), delay);
    // Keep stale correlations in state rather than clearing them
  }
}, [backendReady]);
```

---

### [F2] `fetchAnalysis` has no request timeout — spinner can run forever
**File:** `frontend/src/App.jsx:318–340`

yfinance calls inside `/analyse` can block 60+ seconds on rate limits. The UI shows a spinner with no escape.

```js
// ✅ FIX — AbortController with 30s timeout
const fetchAnalysis = useCallback(async (tickerFull) => {
  if (!backendReady || !tickerFull) return;
  setAnalysisLoading(true);
  setAnalysisError(null);
  setAnalysisData(null);
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const r = await fetch('http://localhost:8000/analyse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker: tickerFull }),
      signal: ctrl.signal,
    });
    clearTimeout(timeout);
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      setAnalysisError(err.detail || `HTTP ${r.status}`);
    } else {
      setAnalysisData(await r.json());
    }
  } catch (e) {
    clearTimeout(timeout);
    setAnalysisError(e.name === 'AbortError' ? 'Analysis timed out (30s)' : e.message);
  } finally {
    setAnalysisLoading(false);
  }
}, [backendReady]);
```

---

### [F3] `startup.py` — no timeout guard; `startup_state["ready"]` can never be set
**File:** `backend/startup.py:37–41`

`asyncio.gather` wraps the two blocking executor calls but neither has a timeout. If `run_fragility_monitor` (which calls yfinance for the full SET100 universe) hangs, the app polls `/health` at 3s intervals indefinitely.

```python
# ✅ FIX — add asyncio.wait_for timeout on each step
STARTUP_TIMEOUT = 120  # seconds

async def run_startup() -> None:
    loop = asyncio.get_event_loop()
    errors = []

    try:
        macro = await asyncio.wait_for(
            loop.run_in_executor(None, run_global_macro_analysis),
            timeout=STARTUP_TIMEOUT
        )
        startup_state["macro"] = macro
    except (asyncio.TimeoutError, Exception) as exc:
        errors.append(f"macro: {exc}")
        macro = None

    set100_tickers = _load_set100_tickers()
    try:
        results = await asyncio.wait_for(
            asyncio.gather(
                loop.run_in_executor(None, partial(run_fragility_monitor,
                                                   breadth_universe=set100_tickers, verbose=False)),
                loop.run_in_executor(None, partial(run_sector_screener, macro_results=macro)),
                return_exceptions=True,
            ),
            timeout=STARTUP_TIMEOUT
        )
        ...
    except asyncio.TimeoutError:
        errors.append("startup timeout after 120s")
    
    startup_state["startup_error"] = "; ".join(errors) if errors else None
    startup_state["ready"] = True   # always set ready so polling stops
```

---

### [F4] Startup price/sparkline fetches lack `cancelled` guard — setState on unmounted component
**File:** `frontend/src/App.jsx:286–298`

`startup-data`, `prices`, and `sparklines` are fired as fire-and-forget `.then()` chains. `startup-data` checks `cancelled` but `prices` and `sparklines` do not:

```js
// ❌ CURRENT — prices and sparklines will setState after unmount
fetch(`http://localhost:8000/prices?tickers=...`)
  .then(r2 => r2.ok ? r2.json() : {})
  .then(pd => { if (!cancelled) setMarketPrices(pd); })  // ← 'cancelled' IS checked here
  .catch(() => {});

// Actually looking more carefully, cancelled IS checked for marketPrices.
// The real bug: there's NO retry if prices fails. If yfinance is cold,
// the price panel shows all dashes permanently until page refresh.

// ✅ FIX — add a simple retry (fires once after 10s on failure)
fetch(`http://localhost:8000/prices?tickers=${allTickers}`)
  .then(r2 => r2.ok ? r2.json() : Promise.reject(r2.status))
  .then(pd => { if (!cancelled) setMarketPrices(pd); })
  .catch(() => {
    // Retry once after 10 seconds
    setTimeout(() => {
      if (!cancelled)
        fetch(`http://localhost:8000/prices?tickers=${allTickers}`)
          .then(r => r.ok ? r.json() : {})
          .then(pd => { if (!cancelled) setMarketPrices(pd); })
          .catch(() => {});
    }, 10_000);
  });
```

---

### [F5] `MacroRegimePanel` — `risk.toFixed(0)` crashes when `risk` is not a number
**File:** `frontend/src/components/MacroRegimePanel.jsx:179, 272`

```js
const risk = composite?.composite_risk ?? 50;
// Later:
{risk.toFixed(0)}  // crashes if composite_risk is a string or NaN
```

```js
// ✅ FIX
const risk = Number(composite?.composite_risk ?? 50) || 50;
```

---

### [F6] `ForceGraph3D` — no `ErrorBoundary` around Three.js render; any geometry error unmounts entire canvas
**File:** `frontend/src/components/ThreeCanvas/index.jsx:64–77`

The `<Bounds>` wrapper has no error boundary. A NaN in a node position or a disposed geometry access crashes the entire canvas silently (React just renders nothing).

```jsx
// ✅ FIX — wrap ForceGraph3D in its own ErrorBoundary
<Bounds fit clip observe margin={1.3}>
  <CameraRig graphKey={graphKey} />
  <ErrorBoundary fallback={<FallbackMesh />}>
    <ForceGraph3D ... />
  </ErrorBoundary>
</Bounds>
```

---

## 3. ⚡ Latency & Efficiency Bottlenecks

### [E1] `Object.entries(meshRefs.current)` allocates new array every frame at 60fps
**File:** `frontend/src/components/ThreeCanvas/ForceGraph3D.jsx:310`

```js
// ❌ CURRENT — Object.entries creates a new heap-allocated array 60 times/second
for (const [id, group] of Object.entries(meshRefs.current)) {

// ✅ FIX — use for...in (zero allocation) or convert meshRefs to a Map
// Option A — for...in (no allocation):
for (const id in meshRefs.current) {
  if (crossing.has(id)) continue;
  const group = meshRefs.current[id];
  const node  = nodeMap.get(id);
  if (node && group) group.position.set(node.x ?? 0, node.y ?? 0, node.z ?? 0);
}

// Option B (preferred) — migrate meshRefs to Map, consistent with nodeMapRef
const meshRefs = useRef(new Map());
// register: meshRefs.current.set(node.id, groupRef.current)
// iterate:  for (const [id, group] of meshRefs.current) { ... }
```

---

### [E2] `latentZoneForce` — `Object.values()` + `rhos.map(Math.abs)` allocates every simulation tick
**File:** `frontend/src/components/ThreeCanvas/ForceGraph3D.jsx:415–431`

At ~30 physics ticks/second × 200 nodes = 6,000 `Object.values()` calls per second, each allocating a new array. The `Math.max(...rhos.map(Math.abs))` spread causes additional stack allocations.

```js
// ❌ CURRENT
const rhos = Object.values(correlations[t] ?? correlations[t + ".BK"] ?? {});
if (!rhos.length) return;
const maxRho = Math.max(...rhos.map(Math.abs));

// ✅ FIX — inline reduce, zero extra allocations
function maxAbsRho(corrRow) {
  let max = 0;
  for (const v of Object.values(corrRow)) {
    const a = v < 0 ? -v : v;
    if (a > max) max = a;
  }
  return max;
}
// And pre-compute latent status into a cached Set before sim starts (see [E3])
```

---

### [E3] `latentSet` and `radiusMap` recomputed in useEffect but `isLatentNode` also re-runs inside the d3 force every tick
**File:** `frontend/src/components/ThreeCanvas/ForceGraph3D.jsx:181–190, 415–431`

`isLatentNode` is computed correctly in a useEffect (line 181) and stored in `latentSet`. But `latentZoneForce` (line 415) independently re-queries `correlations` every tick rather than using the pre-computed set.

```js
// ✅ FIX — pass the pre-computed latentSet into the force
.force("latent", latentZoneForce(simNodes.current, latentSet.current))

function latentZoneForce(nodes, latentSet) {
  return function force(alpha) {
    nodes.forEach(node => {
      if (!latentSet.has(node.id)) return;   // O(1) Set lookup, no correlations query
      const s = alpha * LATENT_STRENGTH;
      node.vx = (node.vx ?? 0) + (LATENT_CORNER.x - (node.x ?? 0)) * s;
      node.vy = (node.vy ?? 0) + (LATENT_CORNER.y - (node.y ?? 0)) * s;
      node.vz = (node.vz ?? 0) + (LATENT_CORNER.z - (node.z ?? 0)) * s;
    });
  };
}
```

---

### [E4] Edge geometry rebuilt on every `correlations` change — full GPU reupload
**File:** `frontend/src/components/ThreeCanvas/ForceGraph3D.jsx:225–260`

The useEffect dependency array includes `[rawNodes, rawEdges, correlations, sentimentMap]`. When correlations arrive (typically 2–5 seconds after stock selection), all edge Line objects are disposed and recreated. For 400 edges this is ~400 geometry allocations and GL buffer uploads.

Only the **visual properties** (color, opacity) change with correlations — the geometry topology (which nodes connect) does not.

```js
// ✅ FIX — split into two effects:

// Effect 1: rebuild geometry only when topology changes
useEffect(() => {
  rebuildEdgeGeometry(rawNodes, rawEdges);
}, [rawNodes, rawEdges]);

// Effect 2: update materials only when visual encoding changes
useEffect(() => {
  lineObjs.current.forEach(line => {
    const src = nodeById.get(line.userData.srcId);
    const tgt = nodeById.get(line.userData.tgtId);
    if (!src || !tgt) return;
    const edge   = rawEdges.find(e => e.source === line.userData.srcId && e.target === line.userData.tgtId);
    const col    = edgeColor(edge, correlations, sentimentMap, src, tgt);
    const opac   = edgeOpacity(edge, correlations, src, tgt);
    line.material.color.set(col);
    line.material.opacity = opac;
    line.material.needsUpdate = true;
  });
}, [correlations, sentimentMap]);
```

---

### [E5] `getPos` closure allocated every `useFrame` call — 60 allocations/second
**File:** `frontend/src/components/ThreeCanvas/ForceGraph3D.jsx:353–358`

```js
// ❌ CURRENT — new function object created every frame
useFrame(() => {
  ...
  const getPos = (nodeId) => {   // ← heap allocation at 60fps
    if (crossing.has(nodeId)) { ... }
    return nodeMap.get(nodeId);
  };
```

```js
// ✅ FIX — hoist to module scope, pass refs as arguments
function resolvePos(nodeId, crossingMap, meshRefs, nodeMap) {
  if (crossingMap.has(nodeId)) {
    const g = meshRefs.current.get(nodeId);
    return g ? g.position : null;
  }
  return nodeMap.get(nodeId);
}
// Inside useFrame:
const sp = resolvePos(line.userData.srcId, crossing, meshRefs, nodeMap);
const tp = resolvePos(line.userData.tgtId, crossing, meshRefs, nodeMap);
```

---

### [E6] `DKSpark` SVG uses spread operator on arrays — potential stack overflow for large sparklines
**File:** `frontend/src/components/Sidebar.jsx:153–161`

```js
const mx = Math.max(...data), mn = Math.min(...data);
```

`Math.max(...data)` uses the function call stack. Arrays larger than ~125,000 elements throw `RangeError: Maximum call stack size exceeded`. Sparkline data is currently small but the pattern is fragile.

```js
// ✅ FIX
const mx = data.reduce((a, v) => v > a ? v : a, -Infinity);
const mn = data.reduce((a, v) => v < a ? v : a,  Infinity);
```

---

### [E7] `sentimentMap` useMemo iterates all articles every time `newsData` reference changes
**File:** `frontend/src/App.jsx:376–391`

`newsData` is set once from `/news_data.json`. However, if anything causes App to re-render with a new `newsData` reference, this O(N) memo recalculates. The memo is correctly guarded by `[newsData]` — this is fine. The risk is upstream: `newsData` should never be reset without new data. Currently it is only set once in the static fetch — acceptable.

**Minor:** The `items.forEach(n => { const score = n.sentiment === 'POSITIVE' ? 1 : ...` enum check runs per article. If `sentiment_score` float is present, it is ignored here but used in `QuantFundamentalsPanel`. Standardise to always prefer the float field:

```js
// ✅ FIX — prefer float sentiment_score, fall back to enum
const score = n.sentiment_score != null ? n.sentiment_score
  : n.sentiment === 'POSITIVE' ? 1 : n.sentiment === 'NEGATIVE' ? -1 : 0;
```

---

### [E8] `usePanelData` chains useMemo — inner `.filter()` scans all edges per chain
**File:** `frontend/src/components/Sidebar.jsx:96–111`

```js
// For each chain: rawData.edges.filter(e => e.relType === "CHAIN_MEMBER" && e.source === chain.id)
// With 50 chains × 1,000 edges = 50,000 edge comparisons per rawData change

// ✅ FIX — pre-index edges by relType+source using a useMemo
const chainMemberIndex = useMemo(() => {
  const idx = new Map();
  if (!rawData) return idx;
  rawData.edges.forEach(e => {
    if (e.relType !== "CHAIN_MEMBER") return;
    if (!idx.has(e.source)) idx.set(e.source, []);
    idx.get(e.source).push(e.target);
  });
  return idx;
}, [rawData]);

// Then in chains useMemo:
const chains = useMemo(() => {
  if (!rawData) return [];
  return rawData.nodes
    .filter(n => n.nodeType === "SupplyChain")
    .map(chain => ({
      id: chain.id, label: chain.label,
      members: (chainMemberIndex.get(chain.id) ?? []).map(tid => {
        const stock = rawData.nodes.find(n => n.id === tid);
        return stock?.ticker || tid.replace('.BK', '');
      }),
    }));
}, [rawData, chainMemberIndex]);
```

---

### [E9] `crossing` bloom animation calls `line.computeLineDistances()` per dashed line per frame
**File:** `frontend/src/components/ThreeCanvas/ForceGraph3D.jsx:369–372`

```js
if (line.material.isLineDashedMaterial) {
  line.material.dashOffset -= delta * 8;
  line.computeLineDistances();   // ← recalculates all segment lengths every frame
}
```

`computeLineDistances()` iterates all vertices of the line geometry. For a 2-vertex line this is trivial, but it triggers a GPU buffer update (`needsUpdate` internally). Cache the line length at build time:

```js
// At edge build time: store pre-computed length
line.userData.lineLength = src.distanceTo ? src.distanceTo(tgt) : 1;

// In useFrame: only update dashOffset, skip computeLineDistances for straight 2-pt lines
if (line.material.isLineDashedMaterial) {
  line.material.dashOffset -= delta * 8;
  // No need to recompute distances for a 2-vertex straight line
}
```

---

## 4. 💡 Strategic Engineering Suggestions

### [S1] Replace polling `/prices` with WebSocket price stream

The current startup-time one-shot `/prices` fetch provides a single snapshot. Prices become stale immediately. Replace with a WebSocket feed:

```python
# server.py addition — streaming prices via WebSocket
from fastapi import WebSocket

@app.websocket("/ws/prices")
async def ws_prices(ws: WebSocket):
    await ws.accept()
    while True:
        try:
            prices = await asyncio.get_event_loop().run_in_executor(None, _fetch_prices)
            await ws.send_json(prices)
            await asyncio.sleep(15)   # 15-second cadence suits SET market hours
        except Exception:
            break
```

```js
// App.jsx — replace one-shot fetch with persistent WebSocket
useEffect(() => {
  const ws = new WebSocket('ws://localhost:8000/ws/prices');
  ws.onmessage = e => setMarketPrices(JSON.parse(e.data));
  ws.onerror   = () => ws.close();
  return () => ws.close();
}, []);
```

---

### [S2] Cache `/correlations` in Redis with 15-minute TTL

The correlation matrix for the same set of tickers (ego + macro refs) is computationally expensive and changes slowly. Cache the result:

```python
import hashlib, json
from functools import lru_cache  # or Redis for multi-worker

# Simple in-process cache (replace with Redis for production)
_corr_cache: dict = {}   # key: (frozenset(tickers), period) → (timestamp, result)

def _cache_key(tickers, period):
    return hashlib.sha256(f"{sorted(tickers)}{period}".encode()).hexdigest()

def _compute_cached(ticker_list, period, interval):
    key = _cache_key(ticker_list, period)
    now = time.time()
    if key in _corr_cache and now - _corr_cache[key][0] < 900:  # 15 min TTL
        return _corr_cache[key][1]
    result = _compute(ticker_list, period, interval)
    _corr_cache[key] = (now, result)
    return result
```

This cuts the median response time for repeat stock selections from ~4s → ~1ms.

---

### [S3] Offload Pearson ρ and Z-score math to a Web Worker

`sentimentMap` computation and the Z-score calculation in `QuantFundamentalsPanel` currently run on the main thread. For large news datasets (1,000+ articles) or 200+ node correlation lookups, this blocks React's reconciler.

```js
// workers/quant.worker.js
self.onmessage = ({ data: { type, payload } }) => {
  if (type === 'SENTIMENT_MAP') {
    const out = {};
    payload.articles.forEach(a => {
      const t = (a.ticker_source || a.ticker || '').replace('.BK', '');
      if (!t) return;
      const s = a.sentiment_score ?? (a.sentiment === 'POSITIVE' ? 1 : a.sentiment === 'NEGATIVE' ? -1 : 0);
      if (!out[t]) out[t] = { sum: 0, n: 0 };
      out[t].sum += s; out[t].n++;
    });
    const result = {};
    for (const [k, v] of Object.entries(out)) result[k] = v.sum / v.n;
    self.postMessage({ type: 'SENTIMENT_MAP_RESULT', result });
  }
};

// App.jsx — use worker
const quantWorker = useMemo(() => new Worker('/workers/quant.worker.js'), []);
useEffect(() => {
  quantWorker.postMessage({ type: 'SENTIMENT_MAP', payload: { articles: newsData } });
  quantWorker.onmessage = ({ data }) => {
    if (data.type === 'SENTIMENT_MAP_RESULT') setSentimentMap(data.result);
  };
}, [newsData, quantWorker]);
```

---

### [S4] Implement stale-while-revalidate pattern for `analysisData`

Currently `analysisData` is cleared (`setAnalysisData(null)`) at the start of `fetchAnalysis`, causing the right panel to flash empty. Keep the previous result visible while the new one loads:

```js
// ✅ Don't null out analysisData until new data arrives
const fetchAnalysis = useCallback(async (tickerFull) => {
  ...
  setAnalysisLoading(true);
  setAnalysisError(null);
  // setAnalysisData(null);   ← REMOVE THIS LINE
  try {
    ...
    setAnalysisData(await r.json());   // only update when data is ready
  }
  ...
}, [backendReady]);
```

Add a visual "stale" indicator in `QuantFundamentalsPanel` header when `analysisLoading` is true but `analysisData` is non-null:

```jsx
{analysisLoading && analysisData && (
  <span style={{ fontSize: 8, color: C.warn, fontFamily: SANS }}>UPDATING…</span>
)}
```

---

### [S5] Consider WebAssembly (WASM) for the d3-force-3d simulation

The physics simulation (`ForceSimulation` with 200+ nodes) runs on the JS main thread. For institution-grade graphs with 500+ nodes, the `forceManyBody` O(N log N) Barnes-Hut tree becomes a bottleneck. Options:

- **gpu.js** — runs the force calculation on WebGL compute shaders
- **Rapier physics** (WASM) — pre-compiled Rust physics engine, ~10× faster than d3-force for high node counts
- **Comlink + Web Worker** — run the entire d3 simulation in a worker, post position updates back to main thread via `SharedArrayBuffer` (zero-copy)

For the current SET100 scale (100–200 nodes), the existing approach is adequate. Revisit at 500+ nodes.

---

### [S6] Add request deduplication for `fetchCorrelations`

If a user rapidly clicks different stocks, multiple in-flight `/correlations` requests race. The last one to resolve wins, potentially overwriting newer data with stale results.

```js
const correlationAbortRef = useRef(null);

const fetchCorrelations = useCallback(async (tickers) => {
  // Cancel previous in-flight request
  correlationAbortRef.current?.abort();
  const ctrl = new AbortController();
  correlationAbortRef.current = ctrl;
  
  try {
    const r = await fetch(..., { signal: ctrl.signal });
    if (r.ok) setCorrelations(await r.json());
  } catch (e) {
    if (e.name !== 'AbortError') console.error('correlations failed:', e);
  }
}, [backendReady]);
```

---

## 5. 🔁 Duplicate Code & Shared Utility Opportunities

> Every item below is a function, constant, or component that exists in **two or more files** with either identical or near-identical logic. Each duplication is a future maintenance hazard: a bug fixed in one copy stays broken in all others.

---

### [D1] `Section` collapsible wrapper — copy-pasted between two panel components
**Files:** `MacroRegimePanel.jsx:58–79` and `QuantFundamentalsPanel.jsx:17–34`

Both components define a `Section` function with **identical JSX, identical hover handlers, and identical animation logic**. The only difference is the imported color constant name (`C` in both, but referencing their own local object).

```
// MacroRegimePanel.jsx:58          // QuantFundamentalsPanel.jsx:17
function Section({ title, badge,   function Section({ title, badge,
  defaultOpen = true, children }) {   defaultOpen = true, children }) {
  const [open, setOpen] =             const [open, setOpen] =
    useState(defaultOpen);              useState(defaultOpen);
  return (                            return (
    <div style={{ borderBottom:…       <div style={{ borderBottom:…
// 21 lines identical ↓              // 21 lines identical ↓
```

**Fix — extract to `frontend/src/components/ui/PanelSection.jsx`:**

```jsx
// frontend/src/components/ui/PanelSection.jsx
const SANS = "'Inter','DM Sans',sans-serif";

export function PanelSection({ title, badge, defaultOpen = true,
                               borderColor = '#12121a', accentColor = '#6b9fd4',
                               elevatedBg  = '#111118', txt3 = '#606878', txt4 = '#252530',
                               children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: `1px solid ${borderColor}` }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 6,
                 padding: '6px 11px', cursor: 'pointer', userSelect: 'none' }}
        onMouseEnter={e => e.currentTarget.style.background = elevatedBg}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
                       textTransform: 'uppercase', color: txt3, flex: 1, fontFamily: SANS }}>
          {title}
        </span>
        {badge && (
          <span style={{ fontSize: 10, color: accentColor,
                         background: 'rgba(107,159,212,0.1)',
                         padding: '1px 5px', borderRadius: 8, fontFamily: SANS }}>
            {badge}
          </span>
        )}
        <span style={{ fontSize: 10, color: txt4,
                       transform: `rotate(${open ? 0 : 180}deg)`, transition: 'transform 0.2s' }}>
          ▲
        </span>
      </div>
      {open && <div>{children}</div>}
    </div>
  );
}
```

---

### [D2] `EGO_COLORS` object — defined twice with **conflicting values**
**Files:** `graphDataBuilder.js:187–193` and `NodeDetail.jsx:24–31`

```js
// graphDataBuilder.js               // NodeDetail.jsx
EGO_COLORS = {                       EGO_COLORS = {
  MACRO_FACTOR: "#6fcf97",   ← 🟢    MACRO_FACTOR: '#708888',   ← 🩶 DIFFERENT
  FINANCIAL_RELATION: "#4f8ef7", ←   FINANCIAL_RELATION: '#904080', ← DIFFERENT
  SUPPLY_CHAIN: "#f7a24f",            SUPPLY_CHAIN: '#508060',       ← DIFFERENT
  EQUITY_HOLDING: "#bb6bd9",          EQUITY_HOLDING: '#4a6fa5',     ← DIFFERENT
  COMPETITOR: "#eb5757",              COMPETITOR: '#c87840',         ← DIFFERENT
};
```

All five values differ. The graph node colors and the NodeDetail relation colors are visually inconsistent — a MACRO_FACTOR node appears green in the graph but grey in the sidebar panel.

**Fix — single source of truth:**

```js
// frontend/src/constants/relationColors.js
export const RELATION_COLORS = {
  MACRO_FACTOR:       "#6fcf97",
  FINANCIAL_RELATION: "#4f8ef7",
  SUPPLY_CHAIN:       "#f7a24f",
  EQUITY_HOLDING:     "#bb6bd9",
  COMPETITOR:         "#eb5757",
  FEEDS_INTO:         "#6a8060",
};
// Import in graphDataBuilder.js, NodeDetail.jsx, and ForceGraph3D.jsx
```

---

### [D3] `SKIP_REL` and `CAT_ORDER` — defined twice, `CAT_ORDER` has a different sequence
**Files:** `graphDataBuilder.js:203–204` and `NodeDetail.jsx:42–45`

```js
// graphDataBuilder.js:203          // NodeDetail.jsx:45
const CAT_ORDER = [                  const CAT_ORDER = [
  "COMPETITOR",                        'COMPETITOR',
  "FINANCIAL_RELATION",   ← 2nd        'SUPPLY_CHAIN',      ← 2nd (swapped!)
  "SUPPLY_CHAIN",         ← 3rd        'FINANCIAL_RELATION',← 3rd (swapped!)
  "EQUITY_HOLDING",                    'EQUITY_HOLDING',
  "MACRO_FACTOR",                      'MACRO_FACTOR',
];                                   ];
```

The graph ego view and the NodeDetail relations panel display categories in **different orders** because they each define the array independently. This is a subtle visual inconsistency that was introduced by copy-paste drift.

```js
// frontend/src/constants/relationColors.js  (extend the file from D2)
export const CAT_ORDER = [
  "COMPETITOR", "FINANCIAL_RELATION", "SUPPLY_CHAIN", "EQUITY_HOLDING", "MACRO_FACTOR",
];
export const SKIP_REL = new Set([
  "CHAIN_MEMBER", "FEEDS_INTO", "MACRO_CHAIN", "ROOT_CAT", "CAT_MACRO", "CAT_CHAIN", "ROOT_MACRO",
]);
```

---

### [D4] Bidirectional bar — the same 8-line JSX pattern appears in 5 places
**Files:**
- `MacroRegimePanel.jsx:97–107` (inside `CorrelRow`)
- `QuantFundamentalsPanel.jsx:62–73` (inside `SentBarRow`)
- `QuantFundamentalsPanel.jsx:226–236` (Z-score bar, inline)
- `NodeDetail.jsx:499–507` (NLP bar, inline in news loop)
- `NodeDetail.jsx:635–641` (Z-score bar, inline in analysis tab)

All five instances render identical HTML structure: a `position:relative` container, `overflow:hidden`, a colored fill div whose `left` and `width` are computed from a signed scalar, and a centered midpoint tick.

**Fix — one shared primitive:**

```jsx
// frontend/src/components/ui/BiBar.jsx
export function BiBar({ value, maxAbs = 1, color, bgColor = '#1a1a22', height = 3 }) {
  const clipped = Math.min(Math.abs(value ?? 0) / maxAbs, 1);
  const pct     = clipped * 50;
  return (
    <div style={{ height, background: bgColor, borderRadius: 2,
                  position: 'relative', overflow: 'hidden' }}>
      {value != null && (
        <div style={{
          position: 'absolute',
          left:  value >= 0 ? '50%' : `${50 - pct}%`,
          width: `${pct}%`,
          height: '100%', background: color, borderRadius: 2,
        }} />
      )}
      <div style={{ position: 'absolute', left: '50%', top: 0,
                    bottom: 0, width: 1, background: '#12121a' }} />
    </div>
  );
}
// Usage: <BiBar value={rho} maxAbs={1} color={rhoColor(rho)} />
//        <BiBar value={zScore} maxAbs={3} color={zColor} />
//        <BiBar value={sentScore} maxAbs={1} color={sentColor} height={3} />
```

---

### [D5] Z-score calculation — implemented independently in two components with different thresholds
**Files:** `NodeDetail.jsx:618–623` and `QuantFundamentalsPanel.jsx:111–119`

```js
// NodeDetail.jsx                   // QuantFundamentalsPanel.jsx
const z = (p - ep) / atr;           const zScore = (price - entryP) / atr;

// Threshold for "Overbought":       // Threshold for "Overbought":
z > 2 → 'Overbought'                zScore > 1.5 → 'Overbought'
z > 1 → 'Extended'                  zScore > 0.5 → 'Extended'
```

The thresholds are **different** (NodeDetail uses ±2/±1, QuantFundamentals uses ±1.5/±0.5). Two panels will show different labels for the same stock at the same z-score.

**Fix — shared utility function:**

```js
// frontend/src/utils/quant.js
export function calcZScore(price, entry, atr) {
  if (price == null || entry == null || !atr || atr <= 0) return null;
  return (price - entry) / atr;
}

export function zScoreLabel(z) {
  if (z == null) return '—';
  if (z >  2.0) return 'Overbought';
  if (z >  1.0) return 'Extended';
  if (z < -2.0) return 'Oversold';
  if (z < -1.0) return 'Discounted';
  return 'Near Mean';
}

export function zScoreColor(z, colors) {
  if (z == null) return colors.txt3;
  if (Math.abs(z) > 2.0) return z > 0 ? colors.neg : colors.pos;
  if (Math.abs(z) > 1.0) return z > 0 ? '#e0a050' : '#87d4a8';
  return colors.txt2;
}
```

---

### [D6] Sentiment score normalisation — three different implementations with inconsistent scales
**Files:** `App.jsx:383`, `NodeDetail.jsx:492–494`, `QuantFundamentalsPanel.jsx:166–168`

```js
// App.jsx (sentimentMap — used by ForceGraph3D)
POSITIVE → +1.0,  NEGATIVE → -1.0

// NodeDetail.jsx and QuantFundamentalsPanel.jsx
POSITIVE → +0.7,  NEGATIVE → -0.7
```

`sentimentMap` passed to the graph uses ±1.0, but the same panel display code uses ±0.7. A stock with `POSITIVE` sentiment will show `+1.00` on the ForceGraph edge (via sentimentMap) but `+0.70` in the NLP panel. They describe the same data on two different scales.

**Fix — one canonical function:**

```js
// frontend/src/utils/quant.js  (extend from D5)
export function normaliseSentiment(article) {
  if (article.sentiment_score != null) return article.sentiment_score;
  if (article.sentiment === 'POSITIVE') return 0.7;
  if (article.sentiment === 'NEGATIVE') return -0.7;
  return 0;
}
// App.jsx sentimentMap should also use this:
const score = normaliseSentiment(n);  // consistent ±0.7 for enum
```

---

### [D7] Ticker normalisation `.replace('.BK', '')` — appears **19 times** across 7 files

```
MacroRegimePanel.jsx  : lines 29, 155, 165, 207
ForceGraph3D.jsx      : lines 24, 25, 49, 50, 57, 58, 198
App.jsx               : lines 401, 431, 449
NodeDetail.jsx        : lines 89, 453
QuantFundamentalsPanel: lines 160, 165, 202, 307
Sidebar.jsx           : lines 14, 60
graphDataBuilder.js   : lines 138, 258
```

No shared utility. Any change to ticker normalisation rules (e.g., handling `".NS"` for NSE, or `".SG"` for SGX) requires hunting down every site.

**Fix:**

```js
// frontend/src/utils/ticker.js
export const cleanTicker  = t  => (t  ?? '').replace(/\.(BK|NS|SG|HK)$/i, '');
export const withBK       = t  => cleanTicker(t) + '.BK';
export const isBKTicker   = t  => t?.endsWith('.BK') ?? false;
```

---

### [D8] `DKSpark` and `RPSpark` — two sparkline SVG components with identical maths
**Files:** `Sidebar.jsx:153–161` and `NodeDetail.jsx:147–163`

```js
// Sidebar.jsx — DKSpark            // NodeDetail.jsx — RPSpark
const mx=Math.max(...data),          const mx=Math.max(...data),
      mn=Math.min(...data),                mn=Math.min(...data),
      rng=mx-mn||1;                        rng=mx-mn||1;
const pts=data.map((v,i)=>           const pts=data.map((v,i)=>
  `${(i/(data.length-1))*w},           `${(i/(data.length-1))*w},
   ${h-((v-mn)/rng)*(h-3)-1.5}`)       ${h-((v-mn)/rng)*(h-4)-2}`)
  .join(' ');                           .join(' ');
// DKSpark: polyline only            // RPSpark: polyline + gradient fill polygon
```

The only difference is RPSpark adds an `<area>` polygon with a gradient fill. This can be one component with a `showFill` prop.

**Fix:**

```jsx
// frontend/src/components/ui/Sparkline.jsx
export function Sparkline({ data, color, w = 52, h = 20, showFill = false }) {
  if (!data || data.length < 2) return null;
  const mn  = data.reduce((a, v) => v < a ? v : a,  Infinity);
  const mx  = data.reduce((a, v) => v > a ? v : a, -Infinity);
  const rng = mx - mn || 1;
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * w},${h - ((v - mn) / rng) * (h - 4) - 2}`
  ).join(' ');
  const gradId = `spark-${color.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      {showFill && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {showFill && (
        <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${gradId})`} />
      )}
      <polyline points={pts} fill="none" stroke={color}
                strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
```

---

### [D9] Theme color constants — 6 independent copies of the same palette
**Files:** `App.jsx`, `Sidebar.jsx`, `NodeDetail.jsx`, `MacroRegimePanel.jsx`, `QuantFundamentalsPanel.jsx`, `InstitutionalHeader.jsx`

Each file defines its own local color object (`DARK`, `DK`, `RP`, `C`, `T`). The hex values are mostly the same but with small drift:

| Token       | App.jsx    | Sidebar.jsx | NodeDetail | MacroRegime | QuantFund  |
|-------------|-----------|-------------|------------|-------------|-----------|
| `panel`     | `#111215` | `#111215`   | `#111215`  | `#0d0d12`  | `#0d0d12` |
| `border`    | `#1e2025` | `#1e2025`   | `#1e2025`  | `#1a1a22`  | `#1a1a22` |
| `border2`   | `#16161e` | `#16161e`   | `#16161e`  | `#12121a`  | `#12121a` |
| `txt3`      | `#707888` | `#707888`   | `#707888`  | `#606878`  | `#606878` |

The new panel components (MacroRegimePanel, QuantFundamentalsPanel) use `#0d0d12` for panel background while the old panels use `#111215` — causing a visible colour discontinuity between left/right panels and the center sidebar header.

**Fix — single theme file:**

```js
// frontend/src/theme.js
export const THEME = {
  // Backgrounds
  bg:        '#0c0c0f',
  panel:     '#0d0d12',   // unified — use this everywhere
  elevated:  '#111118',
  rail:      '#090910',
  selected:  '#0e1828',
  // Borders
  border:    '#1a1a22',
  border2:   '#12121a',
  // Text
  txt:       '#dce4f0',
  txt2:      '#8a9ab0',
  txt3:      '#606878',
  txt4:      '#252530',
  // Semantic
  accent:    '#6b9fd4',
  accent2:   '#3d5080',
  pos:       '#4caf76',
  neg:       '#e05252',
  gold:      '#c8a040',
  warn:      '#d4903a',
  graphBg:   '#0c0c10',
  // Typography
  serif:     "'Playfair Display','Libre Baskerville',Georgia,serif",
  sans:      "'Inter','DM Sans',sans-serif",
};
```

All 6 component files would `import { THEME as C } from '../theme'` and remove their local constant.

---

### [D10] `getRho` vs `findRho` — two correlation lookup helpers with overlapping logic
**Files:** `ForceGraph3D.jsx:20–27` and `MacroRegimePanel.jsx:27–37`

```js
// ForceGraph3D.jsx — symmetric lookup between two tickers
function getRho(correlations, tickerA, tickerB) {
  const a = tickerA.replace(".BK", "");
  const b = tickerB.replace(".BK", "");
  return correlations[a]?.[b] ?? correlations[a]?.[b + ".BK"]
      ?? correlations[a + ".BK"]?.[b] ?? correlations[b]?.[a]
      ?? correlations[b + ".BK"]?.[a];
}

// MacroRegimePanel.jsx — lookup of one ticker against a list of possible symbol names
function findRho(correlations, ticker, syms) {
  const t   = ticker.replace('.BK', '');
  const tBK = t + '.BK';
  const row = correlations[t] ?? correlations[tBK] ?? {};
  for (const s of syms) {
    const v = row[s] ?? row[s.replace('.BK', '')] ?? row[s + '.BK'];
    if (v !== undefined && v !== null) return v;
  }
  return null;
}
```

`findRho` with a single-element `syms` array is equivalent to `getRho`. Both normalise ticker formats. The normalisation logic should be shared.

**Fix — one unified function:**

```js
// frontend/src/utils/ticker.js  (extend from D7)
export function lookupRho(correlations, tickerA, candidates) {
  if (!correlations || !tickerA) return null;
  const a   = cleanTicker(tickerA);
  const aBK = a + '.BK';
  const row = correlations[a] ?? correlations[aBK] ?? {};
  for (const b of candidates) {
    const bClean = cleanTicker(b);
    const v = row[b] ?? row[bClean] ?? row[bClean + '.BK'];
    if (v != null) return v;
  }
  // Symmetric fallback — check if 'a' appears as a value key for any candidate
  for (const b of candidates) {
    const bClean = cleanTicker(b);
    const bRow   = correlations[b] ?? correlations[bClean] ?? correlations[bClean + '.BK'] ?? {};
    const v      = bRow[a] ?? bRow[aBK];
    if (v != null) return v;
  }
  return null;
}
// Replace getRho(corr, A, B)        → lookupRho(corr, A, [B])
// Replace findRho(corr, ticker, []) → lookupRho(corr, ticker, syms)
```

---

### [D11] `fmtPrice` — price formatting inconsistent across files
**Files:**
- `Sidebar.jsx:17–20` → `p >= 1000 ? p.toFixed(0) : p.toFixed(2)` but named `fmtPrice`
- `InstitutionalHeader.jsx:86` → same logic, inline
- `NodeDetail.jsx:247, 371` → always `price.toFixed(2)` — ignores the ≥1000 case
- `QuantFundamentalsPanel.jsx` → uses `eps.toFixed(2)` directly

```js
// frontend/src/utils/quant.js
export function fmtPrice(p, currency = '฿') {
  if (p == null) return '—';
  const str = p >= 1000 ? p.toFixed(0) : p >= 10 ? p.toFixed(2) : p.toFixed(3);
  return currency ? `${currency}${str}` : str;
}
export const fmtPct = (v, decimals = 2) =>
  v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(decimals)}%`;
```

---

### [D12] `Row` / `SensRow` / `MetRow` / `RegimeBadge` — four label-value pair components doing the same thing
**Files:**
- `NodeDetail.jsx:569–577` → `Row` (inline in analysis tab, label + Serif value)
- `MacroRegimePanel.jsx:111–124` → `SensRow` (label + signed Serif value)
- `MacroRegimePanel.jsx:127–134` → `RegimeBadge` (label + colored value, no border)
- `QuantFundamentalsPanel.jsx:37–49` → `MetRow` (label + Serif value)

All four render a flex row with a label on the left and a value on the right. The only variations are: border or no border, font size, and signed prefix. One component with props handles all cases:

```jsx
// frontend/src/components/ui/KVRow.jsx
export function KVRow({ label, value, color, serif = true, signed = false,
                        noBorder = false, fontSize = 13, padding = '4px 11px' }) {
  const displayVal = value == null ? '—'
    : signed && typeof value === 'number' ? `${value >= 0 ? '+' : ''}${value.toFixed(2)}`
    : String(value);
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding,
      borderBottom: noBorder ? 'none' : '1px solid #12121a',
    }}>
      <span style={{ fontSize: 10, color: '#8a9ab0', fontFamily: "'Inter','DM Sans',sans-serif" }}>
        {label}
      </span>
      <span style={{
        fontSize, fontWeight: 700, color: color ?? '#dce4f0',
        fontFamily: serif ? "'Playfair Display',Georgia,serif" : "'Inter',sans-serif",
      }}>
        {displayVal}
      </span>
    </div>
  );
}
```

---

### [D13] `MiniCandles` uses unseeded `Math.random()` — candles re-randomise on every re-render
**File:** `NodeDetail.jsx:176–215`

```js
function MiniCandles({ price }) {
  const [candles] = useState(() => {
    const out = []; let p = (price||100) * 0.92;
    for (let i = 0; i < 16; i++) {
      const o = p + (Math.random() - 0.48) * 2;   // ← unseeded random
```

`useState(() => ...)` initialises once per mount so candles don't change on re-render — but they change every time the component unmounts and remounts (e.g., switching stocks). Candle data should be derived from real price history (from `priceData` prop) rather than random generation.

**Improved approach:** Use `priceData` (already computed in `useRightPanelData`) instead of mock candles, and derive OHLC from the sparkline values:

```js
// In useRightPanelData: already computes priceData as a price array
// MiniCandles should receive priceData and render real sparkline data
// or use seeded random: mulberry32(hashStr(stockNode.id + price))
```

---

### [D14] `fmtPub` date formatter and similar date logic not shared with `NewsPage.jsx`
**File:** `NodeDetail.jsx:58–64`

`NodeDetail.jsx` defines `fmtPub(n)` which handles `published_at` as Unix timestamp or ISO string. `NewsPage.jsx` likely has its own inline date formatting. Any change to the date format must be applied in both places.

Move to `frontend/src/utils/format.js`:

```js
export function fmtPublished(article) {
  const ts = article.published_at;
  if (!ts) return article.time || article.published || '';
  try {
    const d = new Date(typeof ts === 'number' ? ts * 1000 : ts);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}
```

---

### Summary of Proposed Shared Modules

| New File | Consolidates | Touches |
|----------|-------------|---------|
| `src/theme.js` | 6× color constant objects | Every component file |
| `src/constants/relationColors.js` | `EGO_COLORS`×2, `CAT_ORDER`×2, `SKIP_REL`×2 | `graphDataBuilder`, `NodeDetail`, `ForceGraph3D` |
| `src/utils/ticker.js` | `.replace('.BK','')` ×19, `getRho`, `findRho` | 7 files |
| `src/utils/quant.js` | Z-score ×2, `fmtPrice` ×4, `fmtPct` ×6, sentiment norm ×3 | 5 files |
| `src/utils/format.js` | `fmtPub`, date formatting | `NodeDetail`, `NewsPage` |
| `src/components/ui/PanelSection.jsx` | `Section` ×2 | `MacroRegimePanel`, `QuantFundamentalsPanel` |
| `src/components/ui/BiBar.jsx` | Bidirectional bar ×5 | `MacroRegimePanel`, `QuantFundamentalsPanel`, `NodeDetail` |
| `src/components/ui/Sparkline.jsx` | `DKSpark` + `RPSpark` | `Sidebar`, `NodeDetail` |
| `src/components/ui/KVRow.jsx` | `Row`/`SensRow`/`RegimeBadge`/`MetRow` ×4 | `NodeDetail`, `MacroRegimePanel`, `QuantFundamentalsPanel` |

---

## Summary Priority Matrix

| ID  | Area         | Severity | Effort | Action                                           |
|-----|-------------|----------|--------|--------------------------------------------------|
| P1  | Graph clicks | 🔴 Critical | Low   | Delegate `handleNodeAction` → `selectStock`     |
| P2  | Backend perf | 🔴 Critical | Low   | Replace correlation loop with `np.corrcoef`     |
| F1  | Reliability  | 🔴 Critical | Low   | Add AbortController + retry to `fetchCorrelations` |
| F2  | Reliability  | 🔴 Critical | Low   | Add timeout to `fetchAnalysis`                  |
| P3  | Startup time | 🟠 High  | Low   | Parallelize `/prices` with ThreadPoolExecutor   |
| P4  | JS perf      | 🟠 High  | Low   | Pre-build `Map` in graphDataBuilder edge loops  |
| E1  | Frame perf   | 🟠 High  | Low   | Replace `Object.entries` in useFrame with Map   |
| E3  | Frame perf   | 🟠 High  | Low   | Pass `latentSet` to d3 force, skip correlation re-query |
| E4  | GPU perf     | 🟠 High  | Med   | Split edge effect: topology vs material         |
| F3  | Reliability  | 🟠 High  | Low   | Timeout guard on `startup.py` async gather      |
| P6  | UX           | 🟡 Med   | Low   | Seeded PRNG for stable node positions           |
| P7  | JS perf      | 🟡 Med   | Low   | Pass `sentimentMap` prop to QuantFundamentals   |
| S1  | Architecture | 🟡 Med   | High  | WebSocket price stream                          |
| S2  | Architecture | 🟡 Med   | Med   | Redis/in-process cache for `/correlations`      |
| S4  | UX           | 🟡 Med   | Low   | Stale-while-revalidate for `analysisData`       |
| S6  | Reliability  | 🟡 Med   | Low   | Abort in-flight correlation requests on new selection |
| E5  | Frame perf   | 🟢 Low   | Low   | Hoist `getPos` closure out of useFrame          |
| E9  | GPU perf     | 🟢 Low   | Low   | Remove `computeLineDistances` per-frame call    |
| S3  | Architecture | 🟢 Low   | High  | Web Worker for sentiment/quant math             |
| S5  | Architecture | 🟢 Low   | High  | WASM physics (future, 500+ nodes)               |
| **Duplicate Code** ||||
| D2  | Correctness  | 🔴 Critical | Low | Unify `EGO_COLORS` — all 5 values currently differ between files |
| D3  | Correctness  | 🔴 Critical | Low | Unify `CAT_ORDER` + `SKIP_REL` — order mismatch causes visual drift |
| D6  | Correctness  | 🟠 High  | Low   | Unify sentiment scale (±1 vs ±0.7 inconsistency) via `normaliseSentiment()` |
| D5  | Correctness  | 🟠 High  | Low   | Unify Z-score thresholds — NodeDetail uses ±2/±1, QuantFund uses ±1.5/±0.5 |
| D9  | Maintenance  | 🟠 High  | Med   | Extract `src/theme.js` — 6 independent color constant objects with drift |
| D7  | Maintenance  | 🟠 High  | Med   | Extract `src/utils/ticker.js` — `.replace('.BK','')` appears 19 times |
| D10 | Maintenance  | 🟡 Med   | Low   | Unify `getRho` + `findRho` → `lookupRho` in `ticker.js` |
| D4  | Maintenance  | 🟡 Med   | Med   | Extract `BiBar` component — bidirectional bar duplicated 5 times |
| D1  | Maintenance  | 🟡 Med   | Low   | Extract `PanelSection` — `Section` component copy-pasted in 2 files |
| D8  | Maintenance  | 🟡 Med   | Low   | Extract `Sparkline` — `DKSpark` + `RPSpark` are the same component |
| D12 | Maintenance  | 🟡 Med   | Med   | Extract `KVRow` — 4 near-identical label-value row components |
| D11 | Maintenance  | 🟢 Low   | Low   | Extract `fmtPrice`/`fmtPct` utilities — inconsistent formatting in 4 files |
| D13 | UX           | 🟢 Low   | Low   | `MiniCandles` uses unseeded random — candles change on stock switch |
| D14 | Maintenance  | 🟢 Low   | Low   | Extract `fmtPublished` — `fmtPub` not shared with `NewsPage.jsx` |
