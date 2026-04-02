import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BeltBlockStrip } from "@/components/live/belt-block-strip";
import type { BeltSnapshot, QualityDefinition } from "@/types/app-data";

const quality: QualityDefinition = {
  id: "q_num_fe",
  kind: "numerical",
  label: "Fe",
  description: "Iron grade",
  min: 0,
  max: 2,
  palette: ["#153a63", "#59ddff", "#f4bc63"],
};

const snapshot: BeltSnapshot = {
  objectId: "belt_cv200",
  displayName: "CV 200",
  timestamp: "2025-03-19T01:15:00Z",
  totalMassTon: 180,
  blockCount: 3,
  qualityAverages: { q_num_fe: 1.2 },
  blocks: [
    {
      position: 0,
      massTon: 60,
      timestampOldestMs: 1742346000000,
      timestampNewestMs: 1742346900000,
      qualityValues: { q_num_fe: 1.0 },
    },
    {
      position: 1,
      massTon: 60,
      timestampOldestMs: 1742346000000,
      timestampNewestMs: 1742346900000,
      qualityValues: { q_num_fe: 1.2 },
    },
    {
      position: 2,
      massTon: 60,
      timestampOldestMs: 1742346000000,
      timestampNewestMs: 1742346900000,
      qualityValues: { q_num_fe: 1.5 },
    },
  ],
};

describe("BeltBlockStrip", () => {
  it("renders one visual block per belt block", () => {
    render(<BeltBlockStrip snapshot={snapshot} quality={quality} />);

    expect(
      screen.getByRole("img", { name: "CV 200 block strip" }),
    ).toBeInTheDocument();
    expect(screen.getAllByTitle(/Block/)).toHaveLength(3);
  });
});
