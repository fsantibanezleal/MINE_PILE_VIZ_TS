"use client";

import * as THREE from "three";
import { getVerticalCompressionScale } from "@/lib/vertical-compression";

export interface Pile3DViewpoint {
  position: [number, number, number];
  target: [number, number, number];
}

export function getDefaultPile3DViewpoint(
  extents: { x: number; y: number; z: number },
  verticalCompressionFactor = 1,
): Pile3DViewpoint {
  const verticalScale = getVerticalCompressionScale(verticalCompressionFactor);
  const scaledExtents = {
    x: extents.x,
    y: extents.y,
    z: extents.z * verticalScale,
  };
  const direction = new THREE.Vector3(1.2, 0.46, 1.08).normalize();
  const radius = Math.max(
    Math.sqrt(
      scaledExtents.x ** 2 + scaledExtents.y ** 2 + scaledExtents.z ** 2,
    ) * 0.5,
    1,
  );
  const fov = 42;
  const fitDistance = radius / Math.sin(THREE.MathUtils.degToRad(fov * 0.5));
  const distance = fitDistance * 0.9;

  return {
    position: direction.multiplyScalar(distance).toArray() as [
      number,
      number,
      number,
    ],
    target: [0, 0, 0],
  };
}
