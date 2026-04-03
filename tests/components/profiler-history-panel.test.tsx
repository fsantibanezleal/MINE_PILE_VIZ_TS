import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfilerHistoryPanel } from "@/components/ui/profiler-history-panel";
import type { ProfilerSummaryRow } from "@/types/app-data";

const rows: ProfilerSummaryRow[] = [
  {
    snapshotId: "20250319010000",
    timestamp: "2025-03-19T01:00:00Z",
    objectId: "pile_a",
    objectType: "pile",
    displayName: "Pile A",
    dimension: 2,
    massTon: 100,
    qualityValues: { q_num_fe: 1.1 },
  },
  {
    snapshotId: "20250319011500",
    timestamp: "2025-03-19T01:15:00Z",
    objectId: "pile_a",
    objectType: "pile",
    displayName: "Pile A",
    dimension: 2,
    massTon: 120,
    qualityValues: { q_num_fe: 1.2 },
  },
  {
    snapshotId: "20250319013000",
    timestamp: "2025-03-19T01:30:00Z",
    objectId: "pile_a",
    objectType: "pile",
    displayName: "Pile A",
    dimension: 2,
    massTon: 108,
    qualityValues: { q_num_fe: 1.16 },
  },
];

describe("ProfilerHistoryPanel", () => {
  it("renders historical context and highlights the selected snapshot", () => {
    render(
      <ProfilerHistoryPanel
        rows={rows}
        selectedSnapshotId="20250319011500"
        mode="detail"
      />,
    );

    expect(screen.getByText("Timeline context")).toBeInTheDocument();
    expect(screen.getByText("2/3")).toBeInTheDocument();
    expect(screen.getByText("30 min")).toBeInTheDocument();
    expect(screen.getByText("+20 t")).toBeInTheDocument();
  });

  it("allows selecting a different snapshot from the timeline bars", () => {
    const onSelectSnapshot = vi.fn();

    render(
      <ProfilerHistoryPanel
        rows={rows}
        selectedSnapshotId="20250319011500"
        mode="circuit"
        onSelectSnapshot={onSelectSnapshot}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Select snapshot 1 at 2025-03-19T01:00:00Z",
      }),
    );

    expect(onSelectSnapshot).toHaveBeenCalledWith("20250319010000");
  });
});
