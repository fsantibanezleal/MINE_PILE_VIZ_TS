import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RouteIntentPanel } from "@/components/ui/route-intent-panel";

describe("RouteIntentPanel", () => {
  it("renders the four route-intent sections", () => {
    render(
      <RouteIntentPanel
        primaryQuestion="What should this route answer?"
        uniqueEvidence="A route-specific form of evidence."
        useWhen="Use it for this kind of decision."
        switchWhen="Switch away for a different decision."
      />,
    );

    expect(screen.getByText("Primary question")).toBeInTheDocument();
    expect(screen.getByText("Unique evidence")).toBeInTheDocument();
    expect(screen.getByText("Use this route when")).toBeInTheDocument();
    expect(screen.getByText("Switch routes when")).toBeInTheDocument();
    expect(screen.getByText("What should this route answer?")).toBeInTheDocument();
    expect(screen.getByText("A route-specific form of evidence.")).toBeInTheDocument();
  });
});
