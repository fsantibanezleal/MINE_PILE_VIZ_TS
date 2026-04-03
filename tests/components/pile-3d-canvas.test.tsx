import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Pile3DCanvas } from "@/components/stockpiles/pile-3d-canvas";
import type { QualityDefinition } from "@/types/app-data";

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-three-canvas">{children}</div>
  ),
  useThree: (selector: (state: { invalidate: () => void }) => unknown) =>
    selector({ invalidate: vi.fn() }),
}));

vi.mock("@react-three/drei", () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
}));

vi.mock("@/components/shell/theme-provider", () => ({
  useTheme: () => ({ theme: "dark" }),
}));

const quality: QualityDefinition = {
  id: "q_num_fe",
  kind: "numerical",
  label: "Fe",
  description: "Iron grade",
  min: 0,
  max: 2,
  palette: ["#153a63", "#59ddff", "#f4bc63"],
};

describe("Pile3DCanvas", () => {
  it("uses an unlit material so voxel colors stay faithful to the selected property", () => {
    const { container } = render(
      <Pile3DCanvas
        cells={[
          {
            ix: 0,
            iy: 0,
            iz: 0,
            massTon: 12,
            timestampOldestMs: 1,
            timestampNewestMs: 2,
            qualityValues: { q_num_fe: 1.2 },
          },
        ]}
        extents={{ x: 1, y: 1, z: 1 }}
        quality={quality}
      />,
    );

    expect(container.querySelector("meshbasicmaterial")).not.toBeNull();
    expect(container.querySelector("meshstandardmaterial")).toBeNull();
  });

  it("keeps dense voxel scenes on the explicit instanced color path", () => {
    const { container } = render(
      <Pile3DCanvas
        cells={[
          {
            ix: 0,
            iy: 0,
            iz: 0,
            massTon: 12,
            timestampOldestMs: 1,
            timestampNewestMs: 2,
            qualityValues: { q_num_fe: 1.2 },
          },
        ]}
        extents={{ x: 100, y: 100, z: 70 }}
        quality={quality}
      />,
    );

    expect(container.querySelector("instancedmesh")).not.toBeNull();
    expect(container.querySelector("axeshelper")).toBeNull();
  });
});
