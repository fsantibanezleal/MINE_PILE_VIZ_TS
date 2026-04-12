import { describe, expect, it } from "vitest";

import { getIllustration3dInitialCameraPose } from "@/lib/circuit-camera";

describe("circuit-camera", () => {
  it("starts the 3D circuit illustration from an oblique 45-degree view", () => {
    const pose = getIllustration3dInitialCameraPose(10, 20, 80, 40);
    const [x, y, z] = pose.position;
    const [targetX, targetY, targetZ] = pose.target;

    const horizontalOffsetX = x - targetX;
    const horizontalOffsetZ = z - targetZ;
    const horizontalDistance = Math.hypot(horizontalOffsetX, horizontalOffsetZ);

    expect(targetY).toBe(0);
    expect(horizontalOffsetX).toBeCloseTo(horizontalOffsetZ, 6);
    expect(y).toBeCloseTo(horizontalDistance, 6);
  });

  it("keeps a minimum readable distance for small circuits", () => {
    const pose = getIllustration3dInitialCameraPose(0, 0, 4, 6);
    const [x, y, z] = pose.position;
    const horizontalDistance = Math.hypot(x, z);

    expect(horizontalDistance).toBeCloseTo(28, 6);
    expect(y).toBeCloseTo(horizontalDistance, 6);
  });
});
