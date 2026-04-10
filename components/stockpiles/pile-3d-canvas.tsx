"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ElementRef,
} from "react";
import { Canvas, type ThreeEvent, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useTheme } from "@/components/shell/theme-provider";
import { getQualityColor, type NumericColorDomain } from "@/lib/color";
import {
  getDefaultPile3DViewpoint,
  type Pile3DViewpoint,
} from "@/lib/pile-viewpoint";
import {
  getPileSurfaceColumnValue,
  type PileSurfaceColorMode,
  type PileSurfaceColumn,
} from "@/lib/pile-surface";
import { getThemeCanvasPalette } from "@/lib/theme";
import { getVerticalCompressionScale } from "@/lib/vertical-compression";
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
  renderMode?: "voxels" | "top-surface";
  surfaceColumns?: PileSurfaceColumn[];
  surfaceColorMode?: PileSurfaceColorMode;
  verticalCompressionFactor?: number;
  viewpoint?: Pile3DViewpoint | null;
  onViewpointChange?: (viewpoint: Pile3DViewpoint) => void;
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

function getCameraPlacement(
  extents: { x: number; y: number; z: number },
  verticalCompressionFactor: number | undefined,
) {
  const verticalScale = getVerticalCompressionScale(verticalCompressionFactor);
  const scaledExtents = {
    x: extents.x,
    y: extents.y,
    z: extents.z * verticalScale,
  };
  const radius = Math.max(
    Math.sqrt(
      scaledExtents.x ** 2 + scaledExtents.y ** 2 + scaledExtents.z ** 2,
    ) * 0.5,
    1,
  );
  const fov = 42;
  const fitDistance = radius / Math.sin(THREE.MathUtils.degToRad(fov * 0.5));
  const distance = fitDistance * 0.9;
  const defaultViewpoint = getDefaultPile3DViewpoint(
    extents,
    verticalCompressionFactor,
  );

  return {
    fov,
    radius,
    distance,
    position: defaultViewpoint.position,
  };
}

function areViewpointsEqual(
  left: Pile3DViewpoint | null | undefined,
  right: Pile3DViewpoint | null | undefined,
) {
  if (!left || !right) {
    return left === right;
  }

  return (
    left.position.every(
      (value, index) => Math.abs(value - right.position[index]!) < 0.0001,
    ) &&
    left.target.every(
      (value, index) => Math.abs(value - right.target[index]!) < 0.0001,
    )
  );
}

function buildVoxelGeometry(
  cells: PileCellRecord[],
  extents: { x: number; y: number; z: number },
  voxelSize: number,
  quality: QualityDefinition | undefined,
  numericDomain: NumericColorDomain | undefined,
  verticalCompressionFactor: number | undefined,
  valueAccessor?: (cell: PileCellRecord) => QualityValue,
) {
  const verticalScale = getVerticalCompressionScale(verticalCompressionFactor);
  const baseGeometry = new THREE.BoxGeometry(
    voxelSize,
    Math.max(voxelSize * verticalScale, verticalScale),
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
      (cell.iz - extents.z / 2 + 0.5) * verticalScale,
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

function buildSurfaceGeometry(
  columns: PileSurfaceColumn[],
  extents: { x: number; y: number; z: number },
  quality: QualityDefinition | undefined,
  numericDomain: NumericColorDomain | undefined,
  surfaceColorMode: PileSurfaceColorMode,
  verticalCompressionFactor: number | undefined,
) {
  const verticalScale = getVerticalCompressionScale(verticalCompressionFactor);
  const slabWidth = columns.length >= 10_000 ? 0.88 : 0.94;
  let totalVertexCount = 0;

  const baseGeometries = columns.map((column) => {
    const geometry = new THREE.BoxGeometry(
      slabWidth,
      Math.max(column.height * verticalScale, verticalScale),
      slabWidth,
    ).toNonIndexed();
    totalVertexCount += geometry.getAttribute("position").count;
    return geometry;
  });

  const positions = new Float32Array(totalVertexCount * 3);
  const normals = new Float32Array(totalVertexCount * 3);
  const colors = new Float32Array(totalVertexCount * 3);
  const offset = new THREE.Vector3();
  const color = new THREE.Color();
  let vertexOffset = 0;

  columns.forEach((column, columnIndex) => {
    const baseGeometry = baseGeometries[columnIndex]!;
    const basePositions = baseGeometry.getAttribute("position");
    const baseNormals = baseGeometry.getAttribute("normal");
    const vertexCount = basePositions.count;

    offset.set(
      column.ix - extents.x / 2 + 0.5,
      (-extents.z / 2 + column.height / 2) * verticalScale,
      column.iy - extents.y / 2 + 0.5,
    );

    color.set(
      getQualityColor(
        quality,
        getPileSurfaceColumnValue(column, surfaceColorMode),
        numericDomain,
      ),
    );

    for (let index = 0; index < vertexCount; index += 1) {
      const sourceOffset = index * 3;
      const targetOffset = (vertexOffset + index) * 3;

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

    vertexOffset += vertexCount;
    baseGeometry.dispose();
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return {
    geometry,
    trianglesPerColumn: totalVertexCount > 0 ? totalVertexCount / columns.length / 3 : 0,
  };
}

function VoxelMesh({
  cells,
  extents,
  quality,
  numericDomain,
  onHoverCellChange,
  valueAccessor,
  verticalCompressionFactor,
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
        verticalCompressionFactor,
        valueAccessor,
      ),
    [
      cells,
      extents,
      numericDomain,
      quality,
      valueAccessor,
      verticalCompressionFactor,
      voxelSize,
    ],
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

function SurfaceMesh({
  columns,
  extents,
  quality,
  numericDomain,
  onHoverCellChange,
  surfaceColorMode = "top-cell",
  verticalCompressionFactor,
}: Pick<
  Pile3DCanvasProps,
  | "extents"
  | "quality"
  | "numericDomain"
  | "onHoverCellChange"
  | "surfaceColorMode"
  | "surfaceColumns"
  | "verticalCompressionFactor"
> & {
  columns: PileSurfaceColumn[];
}) {
  const { geometry, trianglesPerColumn } = useMemo(
    () =>
      buildSurfaceGeometry(
        columns,
        extents,
        quality,
        numericDomain,
        surfaceColorMode,
        verticalCompressionFactor,
      ),
    [
      columns,
      extents,
      numericDomain,
      quality,
      surfaceColorMode,
      verticalCompressionFactor,
    ],
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
        if (
          event.faceIndex === undefined ||
          event.faceIndex === null ||
          trianglesPerColumn <= 0
        ) {
          onHoverCellChange?.(null);
          return;
        }

        const columnIndex = Math.floor(event.faceIndex / trianglesPerColumn);
        onHoverCellChange?.(columns[columnIndex]?.topCell ?? null);
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

function Pile3DCameraControls({
  minDistance,
  maxDistance,
  viewpoint,
  onViewpointChange,
}: {
  minDistance: number;
  maxDistance: number;
  viewpoint: Pile3DViewpoint;
  onViewpointChange?: (viewpoint: Pile3DViewpoint) => void;
}) {
  const { camera, invalidate } = useThree();
  const controlsRef = useRef<ElementRef<typeof OrbitControls> | null>(null);
  const appliedViewpointRef = useRef<Pile3DViewpoint | null>(null);

  useLayoutEffect(() => {
    const controls = controlsRef.current;

    if (!controls || areViewpointsEqual(appliedViewpointRef.current, viewpoint)) {
      return;
    }

    camera.position.set(...viewpoint.position);
    controls.target.set(...viewpoint.target);
    camera.lookAt(...viewpoint.target);
    camera.updateProjectionMatrix();
    controls.update();
    appliedViewpointRef.current = viewpoint;
    invalidate();
  }, [camera, invalidate, viewpoint]);

  const handleControlsChange = useCallback(() => {
    invalidate();
  }, [invalidate]);

  const handleControlsEnd = useCallback(() => {
    const controls = controlsRef.current;

    if (!controls || !onViewpointChange) {
      return;
    }

    const nextViewpoint: Pile3DViewpoint = {
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [controls.target.x, controls.target.y, controls.target.z],
    };

    appliedViewpointRef.current = nextViewpoint;
    onViewpointChange(nextViewpoint);
  }, [camera, onViewpointChange]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      target={viewpoint.target}
      minDistance={minDistance}
      maxDistance={maxDistance}
      onChange={handleControlsChange}
      onEnd={handleControlsEnd}
    />
  );
}

export function Pile3DCanvas({
  cells,
  extents,
  quality,
  numericDomain,
  onHoverCellChange,
  valueAccessor,
  renderMode = "voxels",
  surfaceColumns,
  surfaceColorMode = "top-cell",
  verticalCompressionFactor = 1,
  viewpoint,
  onViewpointChange,
}: Pile3DCanvasProps) {
  const { theme } = useTheme();
  const effectiveSurfaceColumns = surfaceColumns ?? [];
  const defaultViewpoint = getDefaultPile3DViewpoint(
    extents,
    verticalCompressionFactor,
  );
  const effectiveViewpoint = viewpoint ?? defaultViewpoint;

  if (
    (renderMode === "voxels" && cells.length === 0) ||
    (renderMode === "top-surface" && effectiveSurfaceColumns.length === 0)
  ) {
    return (
      <div className="empty-visual">
        <p>
          {renderMode === "top-surface"
            ? "No occupied surface columns are available for this view mode."
            : "No occupied cells are available for this view mode."}
        </p>
      </div>
    );
  }

  const palette = getThemeCanvasPalette(theme);
  const camera = getCameraPlacement(extents, verticalCompressionFactor);
  const sceneGridSize = Math.max(extents.x, extents.y) + 8;
  const verticalScale = getVerticalCompressionScale(verticalCompressionFactor);

  return (
    <div className="pile-canvas">
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        camera={{
          position: effectiveViewpoint.position,
          fov: camera.fov,
          near: 0.1,
          far: camera.distance * 8,
        }}
      >
        <color attach="background" args={[palette.sceneBackground]} />
        <ambientLight intensity={0.92} color="#ffffff" />
        <directionalLight
          position={[
            extents.x * 0.6,
            extents.z * verticalScale * 0.9,
            extents.y * 0.45,
          ]}
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
          position={[0, -(extents.z * verticalScale) / 2 - 0.1, 0]}
        />
        {renderMode === "top-surface" ? (
          <SurfaceMesh
            columns={effectiveSurfaceColumns}
            extents={extents}
            quality={quality}
            numericDomain={numericDomain}
            onHoverCellChange={onHoverCellChange}
            surfaceColorMode={surfaceColorMode}
            verticalCompressionFactor={verticalCompressionFactor}
          />
        ) : (
          <VoxelMesh
            cells={cells}
            extents={extents}
            quality={quality}
            numericDomain={numericDomain}
            onHoverCellChange={onHoverCellChange}
            valueAccessor={valueAccessor}
            verticalCompressionFactor={verticalCompressionFactor}
          />
        )}
        <Pile3DCameraControls
          viewpoint={effectiveViewpoint}
          onViewpointChange={onViewpointChange}
          minDistance={Math.max(camera.radius * 0.65, 4)}
          maxDistance={camera.distance * 3}
        />
      </Canvas>
    </div>
  );
}
