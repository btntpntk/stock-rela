---
name: Graph rendering details
description: Sigma.js settings, arrow customization, ego/chain/overview graph structure
type: project
---

## Sigma settings (both App.jsx and NewsGraphView.jsx share same config)
```js
const EdgeArrowLarge = createEdgeArrowProgram({
  lengthToThicknessRatio:   5,    // default 2.5
  widenessToThicknessRatio: 3.5,  // default 2
});
const SIGMA_SETTINGS = {
  defaultNodeType: "circle", defaultEdgeType: "arrow",
  edgeProgramClasses: { arrow: EdgeArrowLarge },
  labelFont: "Libre Baskerville, Georgia, serif",
  labelSize: 12 (App) / 13 (News), labelWeight: "600"/"700",
  labelColor: { color: "#121212" },
  zoomingRatio: 1.5, minCameraRatio: 0.001/0.01, maxCameraRatio: 20/10,
};
```
`createEdgeArrowProgram` is from `sigma/rendering`. Must be imported and used to resize arrowheads — there's no standard Sigma setting for arrow size.

## Hover behavior (GraphController.jsx)
- `enterNode`: dims non-neighbors to `#DDDBD6`, hides non-adjacent edges, boosts adjacent edges `size * 2.5`
- `leaveNode`: clears nodeReducer + edgeReducer
- NewsGraphView hover: adjacent edge `size * 0.5` (halved on hover)

## Ego graph layout (buildEgoGraph)
3 layers:
1. **Center** — stock node, size=20, color=#121212, at origin
2. **Category ring** R=220 — one node per active relType, evenly distributed clockwise from -π/2 (top); `nodeType: "Category"`, colored by EGO_COLORS[relType], size=13
3. **Peer ring** R=460 — stocks/factors fanned around each category angle; fanSpread = min(0.65π, peers.length * 0.28)

Edge colors:
- Stock → category: `rgba(170,170,170,0.65)` (light grey — use rgba, NOT 8-digit hex, Sigma ignores hex alpha)
- Category → peer: `EGO_COLORS[relType] + "cc"` (opaque colored)

**IMPORTANT**: Always use `rgba()` for semi-transparent edge colors in Sigma. 8-digit hex (`#rrggbbaa`) alpha is silently ignored.

## Node types
GlobalMacroRoot, GlobalMacro, SupplyChain, Stock, MacroFactor, Entity, Category (ego view only — `__cat__RELTYPE` id prefix)

## Graph modes
- **overview**: 3 concentric rings, camera animatedReset on load
- **chain**: chainId centrepiece + members in circle + adjacent ghost chains
- **ego**: 3-layer category graph (see above)

Mode switch triggers `loadGraph` + `sigma.getCamera().animatedReset({ duration: 480 })`
