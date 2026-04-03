"use client";

import { useEffect, useMemo } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useTheme } from "@/components/shell/theme-provider";
import { getQualityColor, type NumericColorDomain } from "@/lib/color";
import { getThemeCanvasPalette } from "@/lib/theme";
import type {
  PileCellRecord,
  QualityDefinition,
  QualityValue,
} from "@/types/app-data";

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
  valueAccessor?: (cell: PileCellRecord) => QualityValue;
}

function getVoxelSize(cellCount: number) {
  if (cellCount >= 120_000) {
    return 0.54;
  }

  if (cellCount >= 40_000) {
    return 0.62;
  }

  if (cellCount >= 10_000) {
    return 0.72;
  }

  return 0.86;
}

function getCameraPlacement(extents: { x: number; y: number; z: number }) {
  const direction = new THREE.Vector3(1.2, 0.46, 1.08).normalize();
  const radius = Math.max(
    Math.sqrt(extents.x ** 2 + extents.y ** 2 + extents.z ** 2) * 0.5,
    1,
  );
  const fov = 42;
  const fitDistance = radius / Math.sin(THREE.MathUtils.degToRad(fov * 0.5));
  const distance = fitDistance * 0.9;

  return {
    fov,
    radius,
    distance,
    position: direction.multiplyScalar(distance).toArray() as [number, number, number],
  };
}

function buildVoxelGeometry(
  cells: PileCellRecord[],
  extents: { x: number; y: number; z: number },
  voxelSize: number,
  quality: QualityDefinition | undefined,
  numericDomain: NumericColorDomain | undefined,
  valueAccessor?: (cell: PileCellRecord) => QualityValue,
) {
  const baseGeometry = new THREE.BoxGeometry(
    voxelSize,
    voxelSize,
    voxelSize,
  ).toNonIndexed();
  const basePositions = baseGeometry.getAttribute("position");
  const baseNormals = baseGeometry.getAttribute("normal");
  const vertexCountPerCell = basePositions.count;
  const positions = new Float32Array(cells.length * vertexCountPerCell * 3);
  const normals = new Float32Array(cells.length * vertexCountPerCell * 3);
  const colors = new Float32Array(cells.length * vertexCountPerCell * 3);
  const offset = new THREE.Vector3();
  const color = new THREE.Color();

  cells.forEach((cell, cellIndex) => {
    offset.set(
      cell.ix - extents.x / 2 + 0.5,
      cell.iz - extents.z / 2 + 0.5,
      cell.iy - extents.y / 2 + 0.5,
    );

    color.set(
      getQualityColor(
        quality,
        valueAccessor
          ? valueAccessor(cell)
          : quality
            ? cell.qualityValues[quality.id]
            : null,
        numericDomain,
      ),
    );

    for (let vertexIndex = 0; vertexIndex < vertexCountPerCell; vertexIndex += 1) {
      const sourceOffset = vertexIndex * 3;
      const targetOffset = (cellIndex * vertexCountPerCell + vertexIndex) * 3;

      positions[targetOffset] = basePositions.array[sourceOffset]! + offset.x;
      positions[targetOffset + 1] = basePositions.array[sourceOffset + 1]! + offset.y;
      positions[targetOffset + 2] = basePositions.array[sourceOffset + 2]! + offset.z;

      normals[targetOffset] = baseNormals.array[sourceOffset]!;
      normals[targetOffset + 1] = baseNormals.array[sourceOffset + 1]!;
      normals[targetOffset + 2] = baseNormals.array[sourceOffset + 2]!;

      colors[targetOffset] = color.r;
      colors[targetOffset + 1] = color.g;
      colors[targetOffset + 2] = color.b;
    }
  });

  baseGeometry.dispose();

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return {
    geometry,
    trianglesPerCell: vertexCountPerCell / 3,
  };
}

function VoxelMesh({
  cells,
  extents,
  quality,
  numericDomain,
  onHoverCellChange,
  valueAccessor,
}: Pile3DCanvasProps) {
  const voxelSize = getVoxelSize(cells.length);
  const { geometry, trianglesPerCell } = useMemo(
    () =>
      buildVoxelGeometry(
        cells,
        extents,
        voxelSize,
        quality,
        numericDomain,
        valueAccessor,
      ),
    [cells, extents, numericDomain, quality, valueAccessor, voxelSize],
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <mesh
      geometry={geometry}
      frustumCulled={false}
      onPointerMove={(event: ThreeEvent<PointerEvent>) => {
        if (event.faceIndex === undefined || event.faceIndex === null) {
          onHoverCellChange?.(null);
          return;
        }

        const cellIndex = Math.floor(event.faceIndex / trianglesPerCell);
        onHoverCellChange?.(cells[cellIndex] ?? null);
      }}
      onPointerOut={() => onHoverCellChange?.(null)}
    >
      <meshLambertMaterial
        color="#ffffff"
        flatShading
        vertexColors
        toneMapped={false}
      />
    </mesh>
  );
}

export function Pile3DCanvas({
  cells,
  extents,
  quality,
  numericDomain,
  onHoverCellChange,
  valueAccessor,
}: Pile3DCanvasProps) {
  const { theme } = useTheme();

  if (cells.length === 0) {
    return (
      <div className="empty-visual">
        <p>No occupied cells are available for this view mode.</p>
      </div>
    );
  }

  const palette = getThemeCanvasPalette(theme);
  const camera = getCameraPlacement(extents);
  const sceneGridSize = Math.max(extents.x, extents.y) + 8;

  return (
    <div className="pile-canvas">
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        camera={{
          position: camera.position,
          fov: camera.fov,
          near: 0.1,
          far: camera.distance * 8,
        }}
      >
        <color attach="background" args={[palette.sceneBackground]} />
        <ambientLight intensity={0.92} color="#ffffff" />
        <directionalLight
          position={[extents.x * 0.6, extents.z * 0.9, extents.y * 0.45]}
          intensity={0.52}
          color="#ffffff"
        />
        <gridHelper
          args={[
            sceneGridSize,
            sceneGridSize,
            palette.sceneGridMajor,
            palette.sceneGridMinor,
          ]}
          position={[0, -extents.z / 2 - 0.1, 0]}
        />
        <VoxelMesh
          cells={cells}
          extents={extents}
          quality={quality}
          numericDomain={numericDomain}
          onHoverCellChange={onHoverCellChange}
          valueAccessor={valueAccessor}
        />
        <OrbitControls
          makeDefault
          enableDamping
          target={[0, 0, 0]}
          minDistance={Math.max(camera.radius * 0.65, 4)}
          maxDistance={camera.distance * 3}
        />
      </Canvas>
    </div>
  );
}
