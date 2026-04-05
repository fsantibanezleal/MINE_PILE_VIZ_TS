"use client";

import { useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import { useTheme } from "@/components/shell/theme-provider";
import type { CircuitSequenceState } from "@/lib/circuit-sequence";
import { getThemeCanvasPalette } from "@/lib/theme";
import type { CircuitGraph } from "@/types/app-data";
import {
  buildCircuitPresentation,
  getPresentationAnchorFootprint2d,
  getPresentationAnchorFootprint3d,
  getPresentationStageFootprint3d,
  type CircuitPresentationStage,
  type CircuitPresentationNode,
  getPresentationAnchorPoint,
  getPresentationNode3dSize,
} from "@/lib/circuit-presentation";

type CircuitViewMode = "illustration-2d" | "illustration-3d";

interface CircuitIllustrationProps {
  graph: CircuitGraph;
  selectedObjectId?: string;
  sequenceState?: CircuitSequenceState | null;
  onSelect?: (objectId: string) => void;
  mode: CircuitViewMode;
}

const EMPTY_NODE_IDS = new Set<string>();
const EMPTY_EDGE_IDS = new Set<string>();

function getNodeOpacity(
  selectedObjectId: string | undefined,
  sequenceState: CircuitSequenceState | null | undefined,
  nodeId: string,
) {
  if (!selectedObjectId || !sequenceState) {
    return 1;
  }

  return sequenceState.nodeIds.has(nodeId) ? 1 : 0.24;
}

function getNodeClassName(
  node: CircuitPresentationNode,
  selectedObjectId?: string,
  sequenceState?: CircuitSequenceState | null,
) {
  return [
    "circuit-illustration__object",
    `circuit-illustration__object--${node.visualKind}`,
    selectedObjectId === node.id ? "circuit-illustration__object--selected" : "",
    sequenceState?.nodeIds.has(node.id) && selectedObjectId !== node.id
      ? "circuit-illustration__object--sequence"
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function renderPileAnchorFootprints2d(node: CircuitPresentationNode) {
  return (
    <>
      {node.inputs.map((anchor) => {
        const point = getPresentationAnchorPoint(node, anchor, "input");
        const footprint = getPresentationAnchorFootprint2d(node, anchor, "input");

        return (
          <g key={anchor.id}>
            <line
              x1={point.x}
              y1={point.y}
              x2={point.x}
              y2={node.y - node.height / 2 - 4}
              className="circuit-illustration__feed"
            />
            {footprint ? (
              <rect
                x={footprint.x}
                y={footprint.y}
                width={footprint.width}
                height={footprint.height}
                rx={footprint.height / 2}
                className="circuit-illustration__feed-footprint"
              />
            ) : null}
            <circle
              cx={point.x}
              cy={point.y}
              r={7}
              className="circuit-illustration__feed-marker"
            />
          </g>
        );
      })}
      {node.outputs.map((anchor) => {
        const point = getPresentationAnchorPoint(node, anchor, "output");
        const footprint = getPresentationAnchorFootprint2d(node, anchor, "output");

        return (
          <g key={anchor.id}>
            <line
              x1={point.x}
              y1={node.y + node.height / 2 + 4}
              x2={point.x}
              y2={point.y}
              className="circuit-illustration__discharge"
            />
            {footprint ? (
              <rect
                x={footprint.x}
                y={footprint.y}
                width={footprint.width}
                height={footprint.height}
                rx={4}
                className="circuit-illustration__discharge-footprint"
              />
            ) : null}
            <rect
              x={point.x - 12}
              y={point.y - 6}
              width={24}
              height={12}
              rx={4}
              className="circuit-illustration__discharge-marker"
            />
          </g>
        );
      })}
    </>
  );
}

function renderNodeShape(node: CircuitPresentationNode) {
  if (node.visualKind === "physical-belt") {
    const x = node.x - node.width / 2;
    const y = node.y - node.height / 2;
    const rollerCount = 5;
    const rollerSpacing = node.width / (rollerCount + 1);

    return (
      <>
        <rect
          x={x}
          y={y}
          width={node.width}
          height={node.height}
          rx={node.height / 2}
          className="circuit-illustration__belt"
        />
        <rect
          x={x + 10}
          y={y + 10}
          width={node.width - 20}
          height={node.height - 20}
          rx={(node.height - 20) / 2}
          className="circuit-illustration__belt-surface"
        />
        {Array.from({ length: rollerCount }, (_, index) => (
          <circle
            key={`${node.id}-roller-${index}`}
            cx={x + rollerSpacing * (index + 1)}
            cy={y + node.height + 10}
            r={7}
            className="circuit-illustration__roller"
          />
        ))}
      </>
    );
  }

  if (node.visualKind === "physical-pile") {
    const leftX = node.x - node.width / 2;
    const rightX = node.x + node.width / 2;
    const topY = node.y - node.height / 2;
    const bottomY = node.y + node.height / 2;

    return (
      <>
        <polygon
          points={`${leftX},${bottomY} ${node.x},${topY} ${rightX},${bottomY}`}
          className="circuit-illustration__pile"
        />
        {renderPileAnchorFootprints2d(node)}
      </>
    );
  }

  if (node.visualKind === "virtual-pile") {
    return (
      <>
        <rect
          x={node.x - node.width / 2}
          y={node.y - node.height / 2}
          width={node.width}
          height={node.height}
          rx={18}
          className="circuit-illustration__virtual-pile"
        />
        {renderPileAnchorFootprints2d(node)}
      </>
    );
  }

  return (
    <rect
      x={node.x - node.width / 2}
      y={node.y - node.height / 2}
      width={node.width}
      height={node.height}
      rx={18}
      className="circuit-illustration__virtual"
    />
  );
}

function Illustration2D({
  graph,
  selectedObjectId,
  sequenceState,
  onSelect,
}: Omit<CircuitIllustrationProps, "mode">) {
  const presentation = useMemo(() => buildCircuitPresentation(graph), [graph]);
  const highlightedEdgeIds = sequenceState?.edgeIds ?? EMPTY_EDGE_IDS;

  return (
    <section className="panel panel--canvas">
      <div className="circuit-illustration">
        <svg
          viewBox={`0 0 ${presentation.width} ${presentation.height}`}
          className="circuit-illustration__svg"
          role="img"
          aria-label="Illustrated circuit overview"
        >
          <defs>
            <marker
              id="circuit-arrow"
              viewBox="0 0 12 12"
              refX="10"
              refY="6"
              markerWidth="10"
              markerHeight="10"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 12 6 L 0 12 z" fill="rgba(89, 221, 255, 0.75)" />
            </marker>
          </defs>

          {presentation.stages.map((stage) => (
            <g key={stage.index}>
              <rect
                x={stage.x}
                y={presentation.stageFrameTop}
                width={stage.width}
                height={presentation.stageFrameHeight}
                rx={28}
                className="circuit-illustration__stage"
              />
              <text
                x={stage.x + stage.width / 2}
                y={presentation.stageLabelY}
                textAnchor="middle"
                className="circuit-illustration__stage-label"
              >
                {stage.label}
              </text>
            </g>
          ))}

          {presentation.edges.map((edge) => (
            <path
              key={edge.id}
              d={edge.path}
              className={
                [
                  "circuit-illustration__edge",
                  edge.isVirtualLink ? "circuit-illustration__edge--virtual" : "",
                  selectedObjectId && highlightedEdgeIds.has(edge.id)
                    ? "circuit-illustration__edge--active"
                    : "",
                  selectedObjectId && !highlightedEdgeIds.has(edge.id)
                    ? "circuit-illustration__edge--muted"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")
              }
              markerEnd="url(#circuit-arrow)"
            />
          ))}

          {presentation.nodes.map((node) => (
            <g
              key={node.id}
              className={getNodeClassName(node, selectedObjectId, sequenceState)}
              style={{ opacity: getNodeOpacity(selectedObjectId, sequenceState, node.id) }}
              onClick={() => onSelect?.(node.id)}
            >
              {renderNodeShape(node)}
              <text
                x={node.x}
                y={node.visualKind === "physical-pile" ? node.y + 18 : node.y + 6}
                textAnchor="middle"
                className="circuit-illustration__node-title"
              >
                {node.label}
              </text>
              <text
                x={node.x}
                y={node.visualKind === "physical-pile" ? node.y + 40 : node.y + 24}
                textAnchor="middle"
                className="circuit-illustration__node-meta"
              >
                {node.visualKind === "virtual-pile"
                  ? "Virtual stockpile"
                  : node.objectRole === "virtual"
                    ? "Virtual transport"
                    : node.objectType === "belt"
                      ? "Physical conveyor"
                      : "Physical stockpile"}
              </text>
            </g>
          ))}

          <text x={96} y={presentation.footnoteY} className="circuit-illustration__footnote">
            Virtual transfer objects stay visible as conceptual markers, while physical belts
            and stockpiles are rendered with illustrative shapes.
          </text>
        </svg>
      </div>
    </section>
  );
}

function Belt3D({
  node,
  selected,
  inSequence,
  onSelect,
}: {
  node: CircuitPresentationNode;
  selected: boolean;
  inSequence: boolean;
  onSelect?: (objectId: string) => void;
}) {
  const x = node.x / 26;
  const z = node.z;
  const opacity = inSequence ? 1 : 0.26;
  const size = getPresentationNode3dSize(node);

  return (
    <group position={[x, 0.72, z]} onClick={() => onSelect?.(node.id)}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[size.width, size.height, size.depth]} />
        <meshStandardMaterial
          color={selected ? "#59ddff" : "#2b8cff"}
          metalness={0.14}
          roughness={0.48}
          transparent
          opacity={opacity}
        />
      </mesh>
      <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.width - 0.7, 0.28, size.depth - 0.68]} />
        <meshStandardMaterial
          color={selected ? "#c6f7ff" : "#b9d3ee"}
          metalness={0.04}
          roughness={0.66}
          transparent
          opacity={opacity}
        />
      </mesh>
      <Html center position={[0, 1.4, 0]} className="circuit-3d__label">
        <strong>{node.label}</strong>
      </Html>
    </group>
  );
}

function PileAnchorFootprints3D({
  node,
  opacity,
}: {
  node: CircuitPresentationNode;
  opacity: number;
}) {
  return (
    <>
      {node.inputs.map((anchor) => {
        const footprint = getPresentationAnchorFootprint3d(node, anchor, "input");

        if (!footprint) {
          return null;
        }

        return (
          <group key={anchor.id} position={[footprint.x - node.x / 26, footprint.y, footprint.z - node.z]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[footprint.width, footprint.height, footprint.depth]} />
              <meshStandardMaterial
                color="#59ddff"
                transparent
                opacity={opacity}
                emissive="#1d526d"
                emissiveIntensity={0.24}
              />
            </mesh>
          </group>
        );
      })}
      {node.outputs.map((anchor) => {
        const footprint = getPresentationAnchorFootprint3d(node, anchor, "output");

        if (!footprint) {
          return null;
        }

        return (
          <group key={anchor.id} position={[footprint.x - node.x / 26, footprint.y, footprint.z - node.z]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[footprint.width, footprint.height, footprint.depth]} />
              <meshStandardMaterial
                color="#94abc4"
                transparent
                opacity={opacity}
                emissive="#3a4d62"
                emissiveIntensity={0.18}
              />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

function Pile3D({
  node,
  selected,
  inSequence,
  onSelect,
}: {
  node: CircuitPresentationNode;
  selected: boolean;
  inSequence: boolean;
  onSelect?: (objectId: string) => void;
}) {
  const x = node.x / 26;
  const z = node.z;
  const opacity = inSequence ? 1 : 0.26;
  const size = getPresentationNode3dSize(node);

  return (
    <group position={[x, 0, z]} onClick={() => onSelect?.(node.id)}>
      <mesh
        position={[0, size.height / 2, 0]}
        castShadow
        receiveShadow
        rotation={[0, Math.PI / 4, 0]}
      >
        <coneGeometry args={[size.width / 2, size.height, 4]} />
        <meshStandardMaterial
          color={selected ? "#59ddff" : "#f4bc63"}
          metalness={0.04}
          roughness={0.76}
          transparent
          opacity={opacity}
        />
      </mesh>
      <mesh position={[0, size.height + 0.6, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.18, 1.2, 10]} />
        <meshStandardMaterial color="#59ddff" transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 0.36, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.72, 1.2]} />
        <meshStandardMaterial color="#94abc4" transparent opacity={opacity} />
      </mesh>
      <PileAnchorFootprints3D node={node} opacity={opacity} />
      <Html center position={[0, size.height + 1.5, 0]} className="circuit-3d__label">
        <strong>{node.label}</strong>
      </Html>
    </group>
  );
}

function VirtualPile3D({
  node,
  selected,
  inSequence,
  onSelect,
}: {
  node: CircuitPresentationNode;
  selected: boolean;
  inSequence: boolean;
  onSelect?: (objectId: string) => void;
}) {
  const x = node.x / 26;
  const z = node.z;
  const opacity = inSequence ? 0.9 : 0.22;
  const size = getPresentationNode3dSize(node);

  return (
    <group position={[x, 0, z]} onClick={() => onSelect?.(node.id)}>
      <mesh position={[0, size.height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.width, size.height, size.depth]} />
        <meshStandardMaterial
          color={selected ? "#59ddff" : "#6f849f"}
          transparent
          opacity={opacity}
          metalness={0.03}
          roughness={0.7}
        />
      </mesh>
      <mesh position={[0, size.height + 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.width - 0.6, 0.22, size.depth - 0.4]} />
        <meshStandardMaterial color="#94abc4" transparent opacity={opacity * 0.78} />
      </mesh>
      <PileAnchorFootprints3D node={node} opacity={opacity} />
      <Html center position={[0, size.height + 1.2, 0]} className="circuit-3d__label circuit-3d__label--virtual">
        <strong>{node.label}</strong>
      </Html>
    </group>
  );
}

function VirtualMarker3D({
  node,
  selected,
  inSequence,
  onSelect,
}: {
  node: CircuitPresentationNode;
  selected: boolean;
  inSequence: boolean;
  onSelect?: (objectId: string) => void;
}) {
  const x = node.x / 26;
  const z = node.z;
  const opacity = inSequence ? 0.72 : 0.2;

  return (
    <group position={[x, 0.7, z]} onClick={() => onSelect?.(node.id)}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[4.8, 0.48, 1.6]} />
        <meshStandardMaterial
          color={selected ? "#59ddff" : "#6f849f"}
          transparent
          opacity={opacity}
          metalness={0.02}
          roughness={0.78}
        />
      </mesh>
      <Html center position={[0, 1.1, 0]} className="circuit-3d__label circuit-3d__label--virtual">
        <strong>{node.label}</strong>
      </Html>
    </group>
  );
}

function StageBase3D({
  stage,
  active,
  stageBaseIdleColor,
  stageBaseActiveColor,
  stageTopIdleColor,
  stageTopActiveColor,
}: {
  stage: CircuitPresentationStage;
  active: boolean;
  stageBaseIdleColor: string;
  stageBaseActiveColor: string;
  stageTopIdleColor: string;
  stageTopActiveColor: string;
}) {
  const footprint = getPresentationStageFootprint3d(stage);

  return (
    <group position={[footprint.x, footprint.y, footprint.z]}>
      <mesh receiveShadow>
        <boxGeometry args={[footprint.width, footprint.height, footprint.depth]} />
        <meshStandardMaterial
          color={active ? stageBaseActiveColor : stageBaseIdleColor}
          emissive={active ? "#153d62" : "#091321"}
          emissiveIntensity={active ? 0.48 : 0.2}
          metalness={0.04}
          roughness={0.88}
          transparent
          opacity={active ? 0.9 : 0.72}
        />
      </mesh>
      <mesh position={[0, footprint.height / 2 + 0.035, 0]} receiveShadow>
        <boxGeometry args={[footprint.width - 0.18, 0.07, footprint.depth - 0.18]} />
        <meshStandardMaterial
          color={active ? stageTopActiveColor : stageTopIdleColor}
          emissive={active ? "#1d4f78" : "#0f2031"}
          emissiveIntensity={active ? 0.3 : 0.14}
          metalness={0.02}
          roughness={0.72}
          transparent
          opacity={active ? 0.86 : 0.58}
        />
      </mesh>
    </group>
  );
}

function TopDownCameraRig({
  centerX,
  centerZ,
  spanX,
  spanZ,
}: {
  centerX: number;
  centerZ: number;
  spanX: number;
  spanZ: number;
}) {
  const { camera } = useThree();

  useEffect(() => {
    const radius = Math.max(spanX, spanZ);
    const cameraHeight = Math.max(34, radius * 1.16);

    camera.position.set(centerX, cameraHeight, centerZ + 0.01);
    camera.lookAt(centerX, 0, centerZ);
    camera.updateProjectionMatrix();
  }, [camera, centerX, centerZ, spanX, spanZ]);

  return (
    <OrbitControls
      makeDefault
      enableDamping
      target={[centerX, 0, centerZ]}
      maxPolarAngle={Math.PI / 2.05}
    />
  );
}

function Illustration3D({
  graph,
  selectedObjectId,
  sequenceState,
  onSelect,
}: Omit<CircuitIllustrationProps, "mode">) {
  const { theme } = useTheme();
  const presentation = useMemo(() => buildCircuitPresentation(graph), [graph]);
  const stageFootprints = useMemo(
    () => presentation.stages.map((stage) => getPresentationStageFootprint3d(stage)),
    [presentation.stages],
  );
  const palette = getThemeCanvasPalette(theme);
  const spreadX = Math.max(20, presentation.width / 26);
  const groundMinZ =
    stageFootprints.length > 0
      ? Math.min(...stageFootprints.map((footprint) => footprint.z - footprint.depth / 2))
      : -8;
  const groundMaxZ =
    stageFootprints.length > 0
      ? Math.max(...stageFootprints.map((footprint) => footprint.z + footprint.depth / 2))
      : 18;
  const groundCenterZ = (groundMinZ + groundMaxZ) / 2;
  const groundDepth = Math.max(34, groundMaxZ - groundMinZ + 10);
  const groundCenterX = spreadX / 2 - 4;
  const highlightedNodeIds = sequenceState?.nodeIds ?? EMPTY_NODE_IDS;
  const highlightedEdgeIds = sequenceState?.edgeIds ?? EMPTY_EDGE_IDS;
  const hasSelection = Boolean(selectedObjectId);
  const activeStageIndexes = useMemo(() => {
    if (!hasSelection) {
      return new Set<number>();
    }

    return new Set(
      presentation.nodes
        .filter(
          (node) =>
            node.id === selectedObjectId || highlightedNodeIds.has(node.id),
        )
        .map((node) => node.stageIndex),
    );
  }, [hasSelection, highlightedNodeIds, presentation.nodes, selectedObjectId]);

  return (
    <section className="panel panel--canvas">
      <div className="pile-canvas circuit-3d">
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{
            position: [groundCenterX, Math.max(34, groundDepth * 1.18), groundCenterZ + 0.01],
            fov: 40,
            near: 0.1,
            far: 320,
          }}
        >
          <color attach="background" args={[palette.sceneBackground]} />
          <ambientLight intensity={1.15} />
          <directionalLight position={[18, 22, 14]} intensity={1.8} castShadow />
          <directionalLight position={[-14, 10, -18]} intensity={0.72} />
          <mesh
            receiveShadow
            rotation={[-Math.PI / 2, 0, 0]}
            position={[spreadX / 2 - 4, -0.02, groundCenterZ]}
          >
            <planeGeometry args={[spreadX + 20, groundDepth]} />
            <meshStandardMaterial color={palette.sceneGround} />
          </mesh>
          <gridHelper
            args={[
              spreadX + 18,
              Math.max(12, Math.round(groundDepth / 2)),
              palette.sceneGridMajor,
              palette.sceneGridMinor,
            ]}
            position={[spreadX / 2 - 4, 0, groundCenterZ]}
          />
          {presentation.stages.map((stage) => (
            <StageBase3D
              key={stage.index}
              stage={stage}
              active={activeStageIndexes.has(stage.index)}
              stageBaseIdleColor={palette.stageBaseIdle}
              stageBaseActiveColor={palette.stageBaseActive}
              stageTopIdleColor={palette.stageTopIdle}
              stageTopActiveColor={palette.stageTopActive}
            />
          ))}
          {presentation.edges.map((edge) => (
            <Line
              key={edge.id}
              points={edge.points3d}
              color={
                !hasSelection || highlightedEdgeIds.has(edge.id)
                  ? edge.isVirtualLink
                    ? "#94abc4"
                    : "#59ddff"
                  : "#48617a"
              }
              lineWidth={
                !hasSelection
                  ? edge.isVirtualLink
                    ? 0.8
                    : 1.6
                  : highlightedEdgeIds.has(edge.id)
                    ? 2.2
                    : 0.8
              }
              transparent
              opacity={
                !hasSelection
                  ? edge.isVirtualLink
                    ? 0.5
                    : 0.78
                  : highlightedEdgeIds.has(edge.id)
                    ? 0.92
                    : 0.16
              }
            />
          ))}
          {presentation.nodes.map((node) => {
            const selected = node.id === selectedObjectId;
            const inSequence = !hasSelection || highlightedNodeIds.has(node.id);

            if (node.visualKind === "physical-belt") {
              return (
                <Belt3D
                  key={node.id}
                  node={node}
                  selected={selected}
                  inSequence={inSequence}
                  onSelect={onSelect}
                />
              );
            }

          if (node.visualKind === "physical-pile") {
              return (
                <Pile3D
                  key={node.id}
                  node={node}
                  selected={selected}
                  inSequence={inSequence}
                  onSelect={onSelect}
                />
              );
            }

            if (node.visualKind === "virtual-pile") {
              return (
                <VirtualPile3D
                  key={node.id}
                  node={node}
                  selected={selected}
                  inSequence={inSequence}
                  onSelect={onSelect}
                />
              );
            }

            return (
              <VirtualMarker3D
                key={node.id}
                node={node}
                selected={selected}
                inSequence={inSequence}
                onSelect={onSelect}
              />
            );
          })}
          <TopDownCameraRig
            centerX={groundCenterX}
            centerZ={groundCenterZ}
            spanX={spreadX + 20}
            spanZ={groundDepth}
          />
        </Canvas>
      </div>
    </section>
  );
}

export function CircuitIllustration({
  graph,
  selectedObjectId,
  sequenceState,
  onSelect,
  mode,
}: CircuitIllustrationProps) {
  if (mode === "illustration-3d") {
    return (
      <Illustration3D
        graph={graph}
        selectedObjectId={selectedObjectId}
        sequenceState={sequenceState}
        onSelect={onSelect}
      />
    );
  }

  return (
    <Illustration2D
      graph={graph}
      selectedObjectId={selectedObjectId}
      sequenceState={sequenceState}
      onSelect={onSelect}
    />
  );
}
