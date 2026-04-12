export type CircuitCameraPose = {
  position: [number, number, number];
  target: [number, number, number];
};

export function getIllustration3dInitialCameraPose(
  centerX: number,
  centerZ: number,
  spanX: number,
  spanZ: number,
): CircuitCameraPose {
  const radius = Math.max(spanX, spanZ);
  const horizontalDistance = Math.max(28, radius * 1.02);
  const height = horizontalDistance;
  const azimuth = Math.PI / 4;

  return {
    position: [
      centerX + Math.cos(azimuth) * horizontalDistance,
      height,
      centerZ + Math.sin(azimuth) * horizontalDistance,
    ],
    target: [centerX, 0, centerZ],
  };
}
