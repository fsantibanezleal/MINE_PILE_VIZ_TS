import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MaterialTimePanel } from "@/components/ui/material-time-panel";

describe("MaterialTimePanel", () => {
  it("renders represented timestamps, ages, and span", () => {
    render(
      <MaterialTimePanel
        summary={{
          recordCount: 2,
          totalMassTon: 25,
          oldestTimestampMs: Date.UTC(2025, 2, 19, 0, 0, 0),
          newestTimestampMs: Date.UTC(2025, 2, 19, 1, 30, 0),
          representedSpanMs: 5_400_000,
          oldestAgeMs: 10_800_000,
          newestAgeMs: 5_400_000,
        }}
      />,
    );

    expect(screen.getByText("Material time span")).toBeInTheDocument();
    expect(screen.getByText("Mar 19, 2025, 12:00 AM UTC")).toBeInTheDocument();
    expect(screen.getByText("Mar 19, 2025, 1:30 AM UTC")).toBeInTheDocument();
    expect(screen.getAllByText("1 h 30 min")).toHaveLength(2);
    expect(screen.getByText("3 h")).toBeInTheDocument();
  });

  it("renders the empty message when no valid summary exists", () => {
    render(
      <MaterialTimePanel
        summary={null}
        emptyMessage="No material timestamps available."
      />,
    );

    expect(screen.getByText("No material timestamps available.")).toBeInTheDocument();
  });
});
