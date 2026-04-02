"use client";

import { useLayoutEffect, useRef } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useTheme } from "@/components/shell/theme-provider";
import { getQualityColor, type NumericColorDomain } from "@/lib/color";
import { getThemeCanvasPalette } from "@/lib/theme";
import type { PileCellRecord, QualityDefinition } from "@/types/app-data";

const THREE_CLOCK_DEPRECATION_PATTERN =
  /^THREE(?:\.THREE)?\.Clock: This module has been deprecated\. Please use THREE\.Timer instead\.$/;

let threeClockWarningSuppressed = false;

function suppressKnownThreeClockWarning() {
  if (typeof window === "undefined" || threeClockWarningSuppressed) {
    return;
  }

  const originalWarn = console.warn.bind(console);

  console.warn = (...args: unknown[]) => {
    const first = typeof args[0] === "string" ? args[0] : "";

    if (THREE_CLOCK_DEPRECATION_PATTERN.test(first)) {
      return;
    }

    originalWarn(...args);
  };

  threeClockWarningSuppressed = true;
}

suppressKnownThreeClockWarning();

interface VoxelInstancesProps {
  cells: PileCellRecord[];
  extents: {
    x: number;
    y: number;
    z: number;
  };
  quality: QualityDefinition | undefined;
  numericDomain?: NumericColorDomain;
  onHoverCellChange?: (cell: PileCellRecord | null) => void;
}

function VoxelInstances({
  cells,
  extents,
  quality,
  numericDomain,
  onHoverCellChange,
}: VoxelInstancesProps) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    const mesh = ref.current;

    if (
      !mesh ||
      typeof mesh.setMatrixAt !== "function" ||
      typeof mesh.setColorAt !== "function"
    ) {
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
      color.set(
        getQualityColor(
          quality,
          quality ? cell.qualityValues[quality.id] : null,
          numericDomain,
        ),
      );
      mesh.setColorAt(index, color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((material) => {
        material.needsUpdate = true;
      });
    } else {
      mesh.material.needsUpdate = true;
    }
    invalidate();
  }, [cells, extents.x, extents.y, extents.z, invalidate, numericDomain, quality]);

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, cells.length]}
      onPointerMove={(event: ThreeEvent<PointerEvent>) => {
        if (event.instanceId === undefined) {
          onHoverCellChange?.(null);
          return;
        }

        onHoverCellChange?.(cells[event.instanceId] ?? null);
      }}
      onPointerOut={() => onHoverCellChange?.(null)}
    >
      <boxGeometry args={[0.92, 0.92, 0.92]} />
      <meshBasicMaterial
        vertexColors
        transparent
        opacity={0.98}
        toneMapped={false}
      />
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
  numericDomain?: NumericColorDomain;
  onHoverCellChange?: (cell: PileCellRecord | null) => void;
}

export function Pile3DCanvas({
  cells,
  extents,
  quality,
  numericDomain,
  onHoverCellChange,
}: Pile3DCanvasProps) {
  const { theme } = useTheme();

  if (cells.length === 0) {
    return (
      <div className="empty-visual">
        <p>No occupied cells are available for this view mode.</p>
      </div>
    );
  }

  const cameraDistance = Math.max(extents.x, extents.y, extents.z) * 1.5;
  const palette = getThemeCanvasPalette(theme);

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
        <color attach="background" args={[palette.sceneBackground]} />
        <gridHelper
          args={[
            Math.max(extents.x, extents.y) + 8,
            Math.max(extents.x, extents.y) + 8,
            palette.sceneGridMajor,
            palette.sceneGridMinor,
          ]}
          position={[0, -extents.z / 2 - 0.1, 0]}
        />
        <axesHelper args={[Math.max(extents.x, extents.y, extents.z) * 0.5 + 2]} />
        <VoxelInstances
          cells={cells}
          extents={extents}
          quality={quality}
          numericDomain={numericDomain}
          onHoverCellChange={onHoverCellChange}
        />
        <OrbitControls makeDefault enableDamping />
      </Canvas>
    </div>
  );
}
