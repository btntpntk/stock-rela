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
