import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RuntimeStatusPanel } from "@/components/ui/runtime-status-panel";
import type { AppManifest } from "@/types/app-data";
import type { AppCacheCheckResult } from "@/lib/server/app-cache-check";

const manifest: AppManifest = {
  schemaVersion: "1.0.0",
  appVersion: "1.00.015",
  datasetLabel: "Synthetic fixture",
  generatedAt: "2025-03-01T00:00:00Z",
  latestTimestamp: "2025-03-07T23:45:00Z",
  paths: {
    qualities: "qualities.json",
    registry: "registry.json",
    circuit: "circuit.json",
    liveSummaries: "live/object-summaries.json",
    profilerIndex: "profiler/index.json",
    profilerSummary: "profiler/summary.arrow",
    simulatorIndex: "simulator/index.json",
  },
  capabilities: {
    circuit: true,
    live: true,
    stockpiles: true,
    profiler: true,
    simulator: true,
  },
  objectCounts: {
    total: 16,
    belts: 11,
    piles: 5,
    profiled: 10,
  },
};

const status: AppCacheCheckResult = {
  root: "D:\\cache\\v1",
  manifest: {
    schemaVersion: "1.0.0",
    appVersion: "1.00.015",
    datasetLabel: "Synthetic fixture",
    latestTimestamp: "2025-03-07T23:45:00Z",
  },
  qualitiesCount: 15,
  registry: {
    total: 16,
    belts: 11,
    piles: 5,
    profiled: 10,
  },
  live: {
    summaries: 16,
    beltsChecked: 11,
    pilesChecked: 5,
  },
  circuit: {
    stages: 7,
    nodes: 16,
    edges: 18,
  },
  profiler: {
    objectsChecked: 10,
    summaryRows: 1527,
    snapshotsChecked: 10,
    mode: "latest-only",
  },
  simulator: {
    objectsChecked: 5,
    stepsChecked: 20,
    outputSnapshotsChecked: 40,
  },
  warnings: [],
};

describe("RuntimeStatusPanel", () => {
  it("renders the runtime identity and coverage metrics", () => {
    render(
      <RuntimeStatusPanel
        manifest={manifest}
        status={status}
        repositoryVersion="1.00.015"
      />,
    );

    expect(screen.getByText("Contract health")).toBeInTheDocument();
    expect(screen.getByText("Runtime identity")).toBeInTheDocument();
    expect(screen.getByText("Synthetic fixture")).toBeInTheDocument();
    expect(screen.getByText("D:\\cache\\v1")).toBeInTheDocument();
    expect(screen.getByText("Route capabilities")).toBeInTheDocument();
    expect(screen.getByText("Simulator outputs")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
  });

  it("renders warnings when the cache check reports them", () => {
    render(
      <RuntimeStatusPanel
        manifest={manifest}
        status={{ ...status, warnings: ["Cache appVersion does not match repo version."] }}
        repositoryVersion="1.00.015"
      />,
    );

    expect(screen.getByText("Runtime check passed with warnings")).toBeInTheDocument();
    expect(
      screen.getByText("Cache appVersion does not match repo version."),
    ).toBeInTheDocument();
  });
});
