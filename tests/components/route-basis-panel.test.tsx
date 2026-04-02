import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RouteBasisPanel } from "@/components/ui/route-basis-panel";

describe("RouteBasisPanel", () => {
  it("renders source, resolution, time basis, and an optional note", () => {
    render(
      <RouteBasisPanel
        source="Current belt snapshot"
        resolution="Dense ordered blocks"
        timeBasis="Current runtime state"
        note="Use this route for dense transport inspection."
      />,
    );

    expect(screen.getByText("Route basis")).toBeInTheDocument();
    expect(screen.getByText("Current belt snapshot")).toBeInTheDocument();
    expect(screen.getByText("Dense ordered blocks")).toBeInTheDocument();
    expect(screen.getByText("Current runtime state")).toBeInTheDocument();
    expect(
      screen.getByText("Use this route for dense transport inspection."),
    ).toBeInTheDocument();
  });
});
