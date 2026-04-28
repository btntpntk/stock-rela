import { useEffect, useRef, useState, useCallback, memo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import * as THREE from "three";
import {
  forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide,
} from "d3-force-3d";

const LATENT_THRESHOLD  = 0.20;
const LATENT_CORNER     = new THREE.Vector3(-600, -600, -400);
const LATENT_STRENGTH   = 0.06;
const BASE_RADIUS       = 5;
const VOL_SCALE         = 0.45;
const MIN_OPACITY       = 0.15;
const MAX_OPACITY       = 0.92;
const CROSSING_DURATION = 800; // ms — spring + bloom flash duration

// ── Helpers ───────────────────────────────────────────────────────────────────

function getRho(correlations, tickerA, tickerB) {
  if (!correlations || !tickerA || !tickerB) return undefined;
  const a = tickerA.replace(".BK", "");
  const b = tickerB.replace(".BK", "");
  return correlations[a]?.[b] ?? correlations[a]?.[b + ".BK"]
      ?? correlations[a + ".BK"]?.[b] ?? correlations[b]?.[a]
      ?? correlations[b + ".BK"]?.[a];
}

function nodeRadius(node, marketPrices) {
  const base = BASE_RADIUS * (1 + (node.size ?? 10) * 0.04);
  if (node.isEgo) return base * 1.6;
  if (!node.ticker) return base;
  const t  = node.ticker.replace(".BK", "");
  const mp = marketPrices?.[t] ?? marketPrices?.[t + ".BK"];
  return base + Math.abs(mp?.change_pct ?? 0) * VOL_SCALE;
}

function nodeColor(node) {
  if (node.isEgo)                              return "#6b9fd4";
  if (node.nodeType === "Category")            return node.color ?? "#888888";
  if (node.nodeType === "GlobalMacroRoot")     return "#1a1a2e";
  if (node.nodeType === "GlobalMacro")         return node.color ?? "#888888";
  if (node.nodeType === "SupplyChain")         return node.color ?? "#888888";
  return "#dce4f0";
}

function isLatentNode(node, correlations) {
  if (!node.ticker || !correlations) return false;
  const t    = node.ticker.replace(".BK", "");
  const rhos = Object.values(correlations[t] ?? correlations[t + ".BK"] ?? {});
  if (!rhos.length) return false;
  return Math.max(...rhos.map(Math.abs)) < LATENT_THRESHOLD;
}

function edgeColor(edge, correlations, sentimentMap, src, tgt) {
  const rho  = getRho(correlations, src?.ticker, tgt?.ticker);
  const sA   = sentimentMap?.[(src?.ticker  ?? "").replace(".BK", "")] ?? 0;
  const sB   = sentimentMap?.[(tgt?.ticker  ?? "").replace(".BK", "")] ?? 0;
  const sent = (sA + sB) / 2;
  if (rho !== undefined) {
    if (rho > 0.6 && sent >= 0)    return "#4caf76";
    if (rho < -0.3 || sent < -0.3) return "#e05252";
  }
  return edge.color ?? "#6b9fd4";
}

function edgeOpacity(edge, correlations, src, tgt) {
  const rho = getRho(correlations, src?.ticker, tgt?.ticker);
  if (rho !== undefined) return MIN_OPACITY + Math.abs(rho) * (MAX_OPACITY - MIN_OPACITY);
  return 0.6;
}

// ── NodeMesh — pure visual, no data-fetching ──────────────────────────────────
function NodeMesh({ node, radius, isHovered, isSelected, isLatent, showLabel,
                    onClick, onPointerOver, onPointerOut }) {
  const col = nodeColor(node);
  const opacity = isLatent ? 0.28 : 1;

  return (
    <>
      <mesh onClick={onClick} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
        <sphereGeometry args={[radius, 16, 12]} />
        <meshStandardMaterial
          color={isLatent ? "#444455" : col}
          emissive={col}
          emissiveIntensity={isSelected ? 0.9 : node.isEgo ? 0.7 : isHovered ? 0.5 : isLatent ? 0.04 : 0.2}
          roughness={isLatent ? 0.85 : 0.4}
          metalness={0.1}
          transparent={isLatent || node.nodeType === "Category"}
          opacity={node.nodeType === "Category" ? 0.75 : opacity}
        />
      </mesh>

      {node.label && showLabel && (
        <Billboard follow lockX={false} lockY={false} lockZ={false}>
          <Text
            position={[0, radius + 4, 0]}
            fontSize={node.isEgo ? 9 : node.nodeType === "Category" ? 7 : 6}
            color={isSelected || node.isEgo ? "#dce4f0" : isHovered ? "#dce4f0" : isLatent ? "#444455" : "#8a9ab0"}
            anchorX="center"
            anchorY="bottom"
            renderOrder={10}
            depthOffset={-1}
          >
            {node.label}
          </Text>
        </Billboard>
      )}
    </>
  );
}

// ── NodeMeshWrapper — memo with selective re-render ───────────────────────────
const NodeMeshWrapper = memo(
  function NodeMeshWrapper({ node, radius, isLatent, showLabel, meshRefs,
                              hoveredId, selectedId, setHoveredId, onClick }) {
    const groupRef = useRef();
    useEffect(() => {
      meshRefs.current[node.id] = groupRef.current;
      return () => { delete meshRefs.current[node.id]; };
    }, [node.id, meshRefs]);

    return (
      <group ref={groupRef} position={[node.x ?? 0, node.y ?? 0, node.z ?? 0]}>
        <NodeMesh
          node={node}
          radius={radius}
          isHovered={hoveredId === node.id}
          isSelected={selectedId === node.id}
          isLatent={isLatent}
          showLabel={showLabel}
          onClick={onClick}
          onPointerOver={e => { e.stopPropagation(); setHoveredId(node.id); }}
          onPointerOut={e => { e.stopPropagation(); setHoveredId(null); }}
        />
      </group>
    );
  },
  (prev, next) => {
    // Only re-render if this node's own hover/select state changed, or inputs changed
    const wasHov = prev.hoveredId  === prev.node.id;
    const isHov  = next.hoveredId  === next.node.id;
    const wasSel = prev.selectedId === prev.node.id;
    const isSel  = next.selectedId === next.node.id;
    return prev.node      === next.node
        && prev.radius    === next.radius
        && prev.isLatent  === next.isLatent
        && prev.showLabel === next.showLabel
        && wasHov === isHov
        && wasSel === isSel;
  }
);

// ── ForceGraph3D ──────────────────────────────────────────────────────────────
export default function ForceGraph3D({
  graphData, mode, onNodeAction,
  correlations, marketPrices, sentimentMap, physicsEnabled,
}) {
  const { nodes: rawNodes, edges: rawEdges } = graphData;

  const meshRefs  = useRef({});
  const nodeMapRef = useRef(new Map());   // id → node (O(1) lookup in useFrame)
  const simNodes  = useRef([]);
  const simRef    = useRef(null);
  const lineGroup = useRef();
  const lineObjs  = useRef([]);

  const [hoveredId,  setHoveredId]  = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  // ── Crossing-alert state (all refs — zero React overhead) ─────────────────
  // crossingMapRef: nodeId → { startTime, startX, startY, startZ }
  const crossingMapRef = useRef(new Map());
  // prevRhoMaxRef: nodeId → last-seen max|ρ|
  const prevRhoMaxRef  = useRef(new Map());

  // ── Precompute per-node metadata (stable between frames) ─────────────────
  const radiusMap  = useRef({});
  const latentSet  = useRef(new Set());

  useEffect(() => {
    const rMap = {};
    const lSet = new Set();
    rawNodes.forEach(n => {
      rMap[n.id] = nodeRadius(n, marketPrices);
      if (isLatentNode(n, correlations)) lSet.add(n.id);
    });
    radiusMap.current = rMap;
    latentSet.current = lSet;
  }, [rawNodes, marketPrices, correlations]);

  // ── Detect upward ρ-threshold crossings → trigger bloom spring ───────────
  useEffect(() => {
    if (!correlations) return;
    const now = performance.now();
    rawNodes.forEach(node => {
      if (!node.ticker) return;
      const t    = node.ticker.replace(".BK", "");
      const rhos = Object.values(correlations[t] ?? correlations[t + ".BK"] ?? {});
      if (!rhos.length) return;
      const maxRho = Math.max(...rhos.map(Math.abs));
      const prev   = prevRhoMaxRef.current.get(node.id) ?? 0;
      // Upward crossing: was latent, now correlated
      if (prev < LATENT_THRESHOLD && maxRho >= LATENT_THRESHOLD) {
        const pos = nodeMapRef.current.get(node.id) ?? node;
        crossingMapRef.current.set(node.id, {
          startTime: now,
          startX: pos.x ?? LATENT_CORNER.x,
          startY: pos.y ?? LATENT_CORNER.y,
          startZ: pos.z ?? LATENT_CORNER.z,
        });
      }
      prevRhoMaxRef.current.set(node.id, maxRho);
    });
  }, [correlations, rawNodes]);

  // ── O(1) node position map — rebuilt when graphData or sim ticks ─────────
  useEffect(() => {
    const m = new Map();
    rawNodes.forEach(n => m.set(n.id, n));
    nodeMapRef.current = m;
  }, [rawNodes]);

  // ── Build edge lines imperatively ─────────────────────────────────────────
  useEffect(() => {
    if (!lineGroup.current) return;
    lineObjs.current.forEach(l => {
      lineGroup.current.remove(l);
      l.geometry.dispose();
      l.material.dispose();
    });
    lineObjs.current = [];

    rawEdges.forEach(edge => {
      const src = rawNodes.find(n => n.id === edge.source);
      const tgt = rawNodes.find(n => n.id === edge.target);
      if (!src || !tgt) return;

      const col     = edgeColor(edge, correlations, sentimentMap, src, tgt);
      const opacity = edgeOpacity(edge, correlations, src, tgt);
      const color   = new THREE.Color(col);

      const geo = new THREE.BufferGeometry();
      const pts = new Float32Array(6);
      pts[0] = src.x ?? 0; pts[1] = src.y ?? 0; pts[2] = src.z ?? 0;
      pts[3] = tgt.x ?? 0; pts[4] = tgt.y ?? 0; pts[5] = tgt.z ?? 0;
      geo.setAttribute("position", new THREE.BufferAttribute(pts, 3));

      const mat = edge.dashed
        ? new THREE.LineDashedMaterial({ color, dashSize: 6, gapSize: 3, opacity, transparent: true })
        : new THREE.LineBasicMaterial({ color, opacity, transparent: true });

      const line = new THREE.Line(geo, mat);
      line.userData.srcId = edge.source;
      line.userData.tgtId = edge.target;
      if (edge.dashed) line.computeLineDistances();
      lineGroup.current.add(line);
      lineObjs.current.push(line);
    });
  }, [rawNodes, rawEdges, correlations, sentimentMap]);

  // ── d3-force-3d ──────────────────────────────────────────────────────────
  useEffect(() => {
    simNodes.current = rawNodes.map(n => ({
      ...n,
      fx: n.isEgo ? 0 : undefined,
      fy: n.isEgo ? 0 : undefined,
      fz: n.isEgo ? 0 : undefined,
    }));

    if (!physicsEnabled) {
      // Rebuild O(1) map from static positions
      const m = new Map();
      simNodes.current.forEach(n => m.set(n.id, n));
      nodeMapRef.current = m;
      return;
    }

    const idxMap = {};
    simNodes.current.forEach((n, i) => { idxMap[n.id] = i; });
    const linkedEdges = rawEdges
      .map(e => ({ source: idxMap[e.source], target: idxMap[e.target], ...e }))
      .filter(e => e.source !== undefined && e.target !== undefined);

    const sim = forceSimulation(simNodes.current, 3)
      .force("link",    forceLink(linkedEdges).id((_, i) => i).distance(120).strength(0.4))
      .force("charge",  forceManyBody().strength(-200))
      .force("center",  forceCenter(0, 0, 0))
      .force("collide", forceCollide(BASE_RADIUS * 3))
      .force("latent",  latentZoneForce(simNodes.current, correlations))
      .alphaDecay(0.02)
      .on("tick", () => {
        // Keep O(1) map in sync with sim positions
        const m = new Map();
        simNodes.current.forEach(n => m.set(n.id, n));
        nodeMapRef.current = m;
      });

    simRef.current = sim;
    return () => { sim.stop(); simRef.current = null; };
  }, [rawNodes, rawEdges, physicsEnabled, correlations]);

  // ── Per-frame imperative update ────────────────────────────────────────────
  useFrame((_, delta) => {
    const nodeMap  = nodeMapRef.current;
    const crossing = crossingMapRef.current;
    const now      = performance.now();

    // Normal node position update — skip nodes currently in crossing animation
    for (const [id, group] of Object.entries(meshRefs.current)) {
      if (crossing.has(id)) continue;
      const node = nodeMap.get(id);
      if (node && group) group.position.set(node.x ?? 0, node.y ?? 0, node.z ?? 0);
    }

    // Crossing spring + bloom flash
    for (const [id, c] of crossing) {
      const elapsed = now - c.startTime;
      const tRaw    = Math.min(elapsed / CROSSING_DURATION, 1);
      const ease    = 1 - Math.pow(1 - tRaw, 3); // ease-out cubic

      const group = meshRefs.current[id];
      if (group) {
        // Spring: lerp from latent-corner start pos → origin
        group.position.set(
          c.startX * (1 - ease),
          c.startY * (1 - ease),
          c.startZ * (1 - ease),
        );
        // Bloom flash: mesh is group.children[0] (sphere, first child of NodeMesh Fragment)
        const mesh = group.children[0];
        if (mesh?.material) {
          // Emissive peaks at 3.5 then settles to normal (0.2 or 0.7 for ego)
          const baseEmissive = nodeMap.get(id)?.isEgo ? 0.7 : 0.2;
          mesh.material.emissiveIntensity = baseEmissive + 3.3 * (1 - ease);
          mesh.material.needsUpdate = false; // no full recompile needed
        }
      }

      if (tRaw >= 1) crossing.delete(id);
    }

    // Edge line position updates
    for (const line of lineObjs.current) {
      const src = crossing.has(line.userData.srcId)
        ? null  // use crossing group position instead
        : nodeMap.get(line.userData.srcId);
      const tgt = crossing.has(line.userData.tgtId)
        ? null
        : nodeMap.get(line.userData.tgtId);

      // Resolve actual position — either from nodeMap or from the animated group
      const getPos = (nodeId) => {
        if (crossing.has(nodeId)) {
          const g = meshRefs.current[nodeId];
          return g ? { x: g.position.x, y: g.position.y, z: g.position.z } : null;
        }
        return nodeMap.get(nodeId);
      };

      const sp = getPos(line.userData.srcId);
      const tp = getPos(line.userData.tgtId);
      if (!sp || !tp) continue;

      const pos = line.geometry.attributes.position;
      pos.setXYZ(0, sp.x ?? 0, sp.y ?? 0, sp.z ?? 0);
      pos.setXYZ(1, tp.x ?? 0, tp.y ?? 0, tp.z ?? 0);
      pos.needsUpdate = true;
      if (line.material.isLineDashedMaterial) {
        line.material.dashOffset -= delta * 8;
        line.computeLineDistances();
      }
    }
  });

  const handleClick = useCallback((node) => {
    setSelectedId(id => id === node.id ? null : node.id);
    onNodeAction?.({ type: "click", nodeId: node.id, nodeType: node.nodeType, attrs: node });
  }, [onNodeAction]);

  const handleStageClick = useCallback(() => {
    setSelectedId(null);
    onNodeAction?.({ type: "clickStage" });
  }, [onNodeAction]);

  // Label LOD — overview has many nodes; only show macro/chain labels
  const shouldShowLabel = useCallback((node) => {
    if (node.isEgo || node.nodeType === "Category") return true;
    if (mode === "overview") return node.nodeType !== "Stock";
    return true;
  }, [mode]);

  return (
    <group onClick={handleStageClick}>
      <group ref={lineGroup} />
      {rawNodes.map(node => (
        <NodeMeshWrapper
          key={node.id}
          node={node}
          radius={radiusMap.current[node.id] ?? BASE_RADIUS}
          isLatent={latentSet.current.has(node.id)}
          showLabel={shouldShowLabel(node)}
          meshRefs={meshRefs}
          hoveredId={hoveredId}
          selectedId={selectedId}
          setHoveredId={setHoveredId}
          onClick={e => { e.stopPropagation(); handleClick(node); }}
        />
      ))}
    </group>
  );
}

// ── Latent-zone d3 force ───────────────────────────────────────────────────────
function latentZoneForce(nodes, correlations) {
  return function force(alpha) {
    nodes.forEach(node => {
      if (!node.ticker || !correlations) return;
      const t    = node.ticker.replace(".BK", "");
      const rhos = Object.values(correlations[t] ?? correlations[t + ".BK"] ?? {});
      if (!rhos.length) return;
      const maxRho = Math.max(...rhos.map(Math.abs));
      if (maxRho < LATENT_THRESHOLD) {
        const s = alpha * LATENT_STRENGTH * (1 - maxRho / LATENT_THRESHOLD);
        node.vx = (node.vx ?? 0) + (LATENT_CORNER.x - (node.x ?? 0)) * s;
        node.vy = (node.vy ?? 0) + (LATENT_CORNER.y - (node.y ?? 0)) * s;
        node.vz = (node.vz ?? 0) + (LATENT_CORNER.z - (node.z ?? 0)) * s;
      }
    });
  };
}
