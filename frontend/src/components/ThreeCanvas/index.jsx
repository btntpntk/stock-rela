import { useMemo, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Bounds, useBounds } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import ForceGraph3D from "./ForceGraph3D";
import { buildGraphData } from "./graphDataBuilder";

// ── CameraRig — auto-fits Bounds when graphData changes ──────────────────────
function CameraRig({ graphKey }) {
  const bounds = useBounds();
  const prevKey = useRef(null);
  useEffect(() => {
    if (graphKey !== prevKey.current) {
      prevKey.current = graphKey;
      bounds.refresh().fit();
    }
  }, [graphKey, bounds]);
  return null;
}

export default function ThreeCanvas({
  rawData,
  mode,
  activeChainId,
  activeStockId,
  scenarioFactorId,
  onNodeAction,
  marketPrices,
  correlations,
  sentimentMap,
  physicsEnabled,
  bloomIntensity = 1.2,
}) {
  const graphData = useMemo(
    () => buildGraphData(mode, rawData, { activeChainId, activeStockId, scenarioFactorId }),
    [mode, rawData, activeChainId, activeStockId, scenarioFactorId]
  );

  // Stable key that changes exactly when layout changes
  const graphKey = `${mode}|${activeChainId ?? ""}|${activeStockId ?? ""}`;

  return (
    <Canvas
      camera={{ position: [0, 0, 1000], fov: 60, near: 1, far: 5000 }}
      style={{ width: "100%", height: "100%", background: "#0c0c10" }}
      gl={{ antialias: true, alpha: false }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <pointLight position={[200, 200, 400]} intensity={0.8} />
      <pointLight position={[-200, -200, -400]} intensity={0.4} color="#3d5080" />

      {/* Camera controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={80}
        maxDistance={3000}
        makeDefault
      />

      {/* Bounds wrapper auto-fits camera on graph change */}
      {rawData && (
        <Bounds fit clip observe margin={1.3}>
          <CameraRig graphKey={graphKey} />
          <ForceGraph3D
            graphData={graphData}
            mode={mode}
            onNodeAction={onNodeAction}
            correlations={correlations}
            marketPrices={marketPrices}
            sentimentMap={sentimentMap}
            physicsEnabled={physicsEnabled}
          />
        </Bounds>
      )}

      {/* Post-processing */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.3}
          intensity={bloomIntensity}
          mipmapBlur={true}
        />
      </EffectComposer>
    </Canvas>
  );
}
