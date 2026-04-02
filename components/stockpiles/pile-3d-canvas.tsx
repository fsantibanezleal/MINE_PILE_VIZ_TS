"use client";

import { useLayoutEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { getQualityColor } from "@/lib/color";
import type { PileCellRecord, QualityDefinition } from "@/types/app-data";

interface VoxelInstancesProps {
  cells: PileCellRecord[];
  extents: {
    x: number;
    y: number;
    z: number;
  };
  quality: QualityDefinition | undefined;
}

function VoxelInstances({ cells, extents, quality }: VoxelInstancesProps) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;

    if (!mesh) {
      return;
    }

    const transform = new THREE.Object3D();
    const color = new THREE.Color();

    cells.forEach((cell, index) => {
      transform.position.set(
        cell.ix - extents.x / 2 + 0.5,
        cell.iz - extents.z / 2 + 0.5,
        cell.iy - extents.y / 2 + 0.5,
      );
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
      color.set(getQualityColor(quality, quality ? cell.qualityValues[quality.id] : null));
      mesh.setColorAt(index, color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [cells, extents.x, extents.y, extents.z, quality]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, cells.length]}>
      <boxGeometry args={[0.92, 0.92, 0.92]} />
      <meshStandardMaterial vertexColors transparent opacity={0.96} />
    </instancedMesh>
  );
}

interface Pile3DCanvasProps {
  cells: PileCellRecord[];
  extents: {
    x: number;
    y: number;
    z: number;
  };
  quality: QualityDefinition | undefined;
}

export function Pile3DCanvas({
  cells,
  extents,
  quality,
}: Pile3DCanvasProps) {
  if (cells.length === 0) {
    return (
      <div className="empty-visual">
        <p>No occupied cells are available for this view mode.</p>
      </div>
    );
  }

  const cameraDistance = Math.max(extents.x, extents.y, extents.z) * 1.5;

  return (
    <div className="pile-canvas">
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        camera={{
          position: [cameraDistance, cameraDistance * 0.8, cameraDistance],
          fov: 45,
          near: 0.1,
          far: cameraDistance * 12,
        }}
      >
        <color attach="background" args={["#08101a"]} />
        <ambientLight intensity={1.35} />
        <directionalLight position={[40, 80, 30]} intensity={1.7} />
        <directionalLight position={[-30, 30, -40]} intensity={0.8} />
        <gridHelper
          args={[Math.max(extents.x, extents.y) + 8, Math.max(extents.x, extents.y) + 8]}
          position={[0, -extents.z / 2 - 0.1, 0]}
        />
        <axesHelper args={[Math.max(extents.x, extents.y, extents.z) * 0.5 + 2]} />
        <VoxelInstances cells={cells} extents={extents} quality={quality} />
        <OrbitControls makeDefault enableDamping />
      </Canvas>
    </div>
  );
}
