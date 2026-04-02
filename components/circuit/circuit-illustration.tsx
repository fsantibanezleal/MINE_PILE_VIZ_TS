"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import type { CircuitGraph } from "@/types/app-data";
import {
  buildCircuitPresentation,
  type CircuitPresentationNode,
} from "@/lib/circuit-presentation";

type CircuitViewMode = "illustration-2d" | "illustration-3d";

interface CircuitIllustrationProps {
  graph: CircuitGraph;
  selectedObjectId?: string;
  onSelect?: (objectId: string) => void;
  mode: CircuitViewMode;
}

function getNodeOpacity(selectedObjectId: string | undefined, nodeId: string) {
  return selectedObjectId && selectedObjectId !== nodeId ? 0.34 : 1;
}

function getNodeClassName(node: CircuitPresentationNode, selectedObjectId?: string) {
  return [
    "circuit-illustration__object",
    `circuit-illustration__object--${node.visualKind}`,
    selectedObjectId === node.id ? "circuit-illustration__object--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");
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
        <line
          x1={node.x}
          y1={topY - 30}
          x2={node.x}
          y2={topY - 4}
          className="circuit-illustration__feed"
        />
        <line
          x1={node.x}
          y1={bottomY + 4}
          x2={node.x}
          y2={bottomY + 34}
          className="circuit-illustration__discharge"
        />
        <circle cx={node.x} cy={topY - 30} r={7} className="circuit-illustration__feed-marker" />
        <rect
          x={node.x - 12}
          y={bottomY + 34}
          width={24}
          height={12}
          rx={4}
          className="circuit-illustration__discharge-marker"
        />
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
  onSelect,
}: Omit<CircuitIllustrationProps, "mode">) {
  const presentation = useMemo(() => buildCircuitPresentation(graph), [graph]);

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
                y={44}
                width={stage.width}
                height={presentation.height - 88}
                rx={28}
                className="circuit-illustration__stage"
              />
              <text
                x={stage.x + stage.width / 2}
                y={82}
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
                edge.isVirtualLink
                  ? "circuit-illustration__edge circuit-illustration__edge--virtual"
                  : "circuit-illustration__edge"
              }
              markerEnd="url(#circuit-arrow)"
            />
          ))}

          {presentation.nodes.map((node) => (
            <g
              key={node.id}
              className={getNodeClassName(node, selectedObjectId)}
              style={{ opacity: getNodeOpacity(selectedObjectId, node.id) }}
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
                {node.objectRole === "virtual"
                  ? "Virtual stage"
                  : node.objectType === "belt"
                    ? "Physical conveyor"
                    : "Physical stockpile"}
              </text>
            </g>
          ))}

          <text x={96} y={presentation.height - 30} className="circuit-illustration__footnote">
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
  onSelect,
}: {
  node: CircuitPresentationNode;
  selected: boolean;
  onSelect?: (objectId: string) => void;
}) {
  const x = node.x / 26;
  const z = node.objectRole === "physical" ? 0 : 9;

  return (
    <group position={[x, 0.72, z]} onClick={() => onSelect?.(node.id)}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[6.6, 0.9, 1.8]} />
        <meshStandardMaterial color={selected ? "#59ddff" : "#2b8cff"} metalness={0.14} roughness={0.48} />
      </mesh>
      <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
        <boxGeometry args={[5.9, 0.28, 1.12]} />
        <meshStandardMaterial color={selected ? "#c6f7ff" : "#b9d3ee"} metalness={0.04} roughness={0.66} />
      </mesh>
      <Html center position={[0, 1.4, 0]} className="circuit-3d__label">
        <strong>{node.label}</strong>
      </Html>
    </group>
  );
}

function Pile3D({
  node,
  selected,
  onSelect,
}: {
  node: CircuitPresentationNode;
  selected: boolean;
  onSelect?: (objectId: string) => void;
}) {
  const x = node.x / 26;
  const z = node.objectRole === "physical" ? 0 : 9;

  return (
    <group position={[x, 0, z]} onClick={() => onSelect?.(node.id)}>
      <mesh position={[0, 2.9, 0]} castShadow receiveShadow rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[3.3, 5.8, 4]} />
        <meshStandardMaterial color={selected ? "#59ddff" : "#f4bc63"} metalness={0.04} roughness={0.76} />
      </mesh>
      <mesh position={[0, 6.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.18, 1.2, 10]} />
        <meshStandardMaterial color="#59ddff" />
      </mesh>
      <mesh position={[0, 0.36, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.72, 1.2]} />
        <meshStandardMaterial color="#94abc4" />
      </mesh>
      <Html center position={[0, 7.4, 0]} className="circuit-3d__label">
        <strong>{node.label}</strong>
      </Html>
    </group>
  );
}

function VirtualMarker3D({
  node,
  selected,
  onSelect,
}: {
  node: CircuitPresentationNode;
  selected: boolean;
  onSelect?: (objectId: string) => void;
}) {
  const x = node.x / 26;

  return (
    <group position={[x, 0.7, 9]} onClick={() => onSelect?.(node.id)}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[4.8, 0.48, 1.6]} />
        <meshStandardMaterial
          color={selected ? "#59ddff" : "#6f849f"}
          transparent
          opacity={0.72}
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

function Illustration3D({
  graph,
  selectedObjectId,
  onSelect,
}: Omit<CircuitIllustrationProps, "mode">) {
  const presentation = useMemo(() => buildCircuitPresentation(graph), [graph]);
  const spreadX = Math.max(18, presentation.stages.length * 6.4);

  return (
    <section className="panel panel--canvas">
      <div className="pile-canvas circuit-3d">
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [spreadX * 0.35, 14, 26], fov: 40, near: 0.1, far: 300 }}
        >
          <color attach="background" args={["#08101a"]} />
          <ambientLight intensity={1.15} />
          <directionalLight position={[18, 22, 14]} intensity={1.8} castShadow />
          <directionalLight position={[-14, 10, -18]} intensity={0.72} />
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[spreadX / 2 - 4, -0.02, 0]}>
            <planeGeometry args={[spreadX + 20, 30]} />
            <meshStandardMaterial color="#102033" />
          </mesh>
          <gridHelper args={[spreadX + 18, presentation.stages.length * 8 + 8, "#1f3c5a", "#153149"]} />
          {presentation.edges.map((edge) => (
            <Line
              key={edge.id}
              points={edge.points3d}
              color={edge.isVirtualLink ? "#6f849f" : "#59ddff"}
              lineWidth={edge.isVirtualLink ? 0.8 : 1.6}
              transparent
              opacity={edge.isVirtualLink ? 0.5 : 0.78}
            />
          ))}
          {presentation.nodes.map((node) => {
            const selected = node.id === selectedObjectId;

            if (node.visualKind === "physical-belt") {
              return (
                <Belt3D
                  key={node.id}
                  node={node}
                  selected={selected}
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
                  onSelect={onSelect}
                />
              );
            }

            return (
              <VirtualMarker3D
                key={node.id}
                node={node}
                selected={selected}
                onSelect={onSelect}
              />
            );
          })}
          <OrbitControls makeDefault enableDamping maxPolarAngle={Math.PI / 2.2} />
        </Canvas>
      </div>
    </section>
  );
}

export function CircuitIllustration({
  graph,
  selectedObjectId,
  onSelect,
  mode,
}: CircuitIllustrationProps) {
  if (mode === "illustration-3d") {
    return (
      <Illustration3D
        graph={graph}
        selectedObjectId={selectedObjectId}
        onSelect={onSelect}
      />
    );
  }

  return (
    <Illustration2D
      graph={graph}
      selectedObjectId={selectedObjectId}
      onSelect={onSelect}
    />
  );
}
