import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VisualEvidencePanel } from "@/components/ui/visual-evidence-panel";

describe("VisualEvidencePanel", () => {
  it("renders the provided reading notes", () => {
    render(
      <VisualEvidencePanel
        title="Reading notes"
        summary="Use this panel to interpret the visible evidence."
        notes={[
          { label: "Color encodes", text: "The selected quality." },
          { label: "Read this as", text: "One constrained operator surface." },
        ]}
      />,
    );

    expect(screen.getByText("Reading notes")).toBeInTheDocument();
    expect(
      screen.getByText("Use this panel to interpret the visible evidence."),
    ).toBeInTheDocument();
    expect(screen.getByText("Color encodes")).toBeInTheDocument();
    expect(screen.getByText("The selected quality.")).toBeInTheDocument();
    expect(screen.getByText("Read this as")).toBeInTheDocument();
    expect(screen.getByText("One constrained operator surface.")).toBeInTheDocument();
  });
});
