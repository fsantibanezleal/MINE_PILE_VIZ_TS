import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Pile3DCanvas } from "@/components/stockpiles/pile-3d-canvas";
import { buildPileSurfaceColumns } from "@/lib/pile-surface";
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
  it("uses a lit native material path so visible voxels keep per-property colors and depth cues", () => {
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

    expect(container.querySelector("meshlambertmaterial")).not.toBeNull();
    expect(container.querySelector("ambientlight")).not.toBeNull();
    expect(container.querySelector("meshstandardmaterial")).toBeNull();
  });

  it("renders dense voxel scenes as a merged mesh instead of an instanced black silhouette", () => {
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

    expect(container.querySelector("mesh")).not.toBeNull();
    expect(container.querySelector("instancedmesh")).toBeNull();
    expect(container.querySelector("axeshelper")).toBeNull();
  });

  it("renders top-surface mode as a visible heightfield mesh with per-column coloring", () => {
    const cells = [
      {
        ix: 0,
        iy: 0,
        iz: 0,
        massTon: 12,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: { q_num_fe: 0.8 },
      },
      {
        ix: 0,
        iy: 0,
        iz: 1,
        massTon: 10,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: { q_num_fe: 1.2 },
      },
    ] as const;
    const surfaceColumns = buildPileSurfaceColumns([...cells], quality);
    const { container } = render(
      <Pile3DCanvas
        cells={[...cells]}
        extents={{ x: 1, y: 1, z: 2 }}
        quality={quality}
        renderMode="top-surface"
        surfaceColumns={surfaceColumns}
        surfaceColorMode="column-mass-weighted"
      />,
    );

    expect(container.querySelector("mesh")).not.toBeNull();
    expect(container.querySelector("meshlambertmaterial")).not.toBeNull();
    expect(container.querySelector("instancedmesh")).toBeNull();
  });
});
