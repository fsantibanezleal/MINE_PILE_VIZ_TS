import path from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tableFromArrays, tableToIPC } from "apache-arrow";

async function ensureDir(target: string) {
  await mkdir(target, { recursive: true });
}

async function writeJson(target: string, payload: unknown) {
  await ensureDir(path.dirname(target));
  await writeFile(target, JSON.stringify(payload, null, 2), "utf8");
}

async function writeArrow(target: string, columns: Record<string, unknown[]>) {
  await ensureDir(path.dirname(target));
  const table = tableFromArrays(columns);
  await writeFile(target, Buffer.from(tableToIPC(table, "file")));
}

export async function createSampleAppData(root: string) {
  await rm(root, { recursive: true, force: true });
  await ensureDir(root);

  const manifest = {
    schemaVersion: "1.0.0",
    appVersion: "0.01.014",
    datasetLabel: "Synthetic contract fixture",
    generatedAt: "2026-04-02T12:00:00Z",
    latestTimestamp: "2025-03-19T01:15:00Z",
    paths: {
      qualities: "qualities.json",
      registry: "registry.json",
      circuit: "circuit.json",
      liveSummaries: "live/object-summaries.json",
      profilerIndex: "profiler/index.json",
      profilerSummary: "profiler/summary.arrow",
    },
    capabilities: {
      circuit: true,
      live: true,
      stockpiles: true,
      profiler: true,
    },
    objectCounts: {
      total: 5,
      belts: 2,
      piles: 3,
      profiled: 2,
    },
  };

  const qualities = [
    {
      id: "q_num_fe",
      kind: "numerical",
      label: "Fe",
      description: "Iron grade",
      min: 0,
      max: 2,
      palette: ["#153a63", "#2b8cff", "#59ddff", "#f4bc63"],
    },
    {
      id: "q_num_cut",
      kind: "numerical",
      label: "CuT",
      description: "Total copper grade",
      min: 0,
      max: 2,
      palette: ["#1c2136", "#5b8cff", "#59ddff", "#f4bc63"],
    },
    {
      id: "q_cat_materialtype_main",
      kind: "categorical",
      label: "Material Type",
      description: "Categorical material type",
      palette: ["#59ddff", "#f4bc63", "#ff7d7d"],
      categories: [
        { value: 10001, label: "Oxide 1", color: "#59ddff" },
        { value: 10002, label: "Oxide 2", color: "#f4bc63" },
        { value: 10003, label: "High Copper", color: "#ff7d7d" },
      ],
    },
  ];

  const registry = [
    {
      objectId: "vbelt_feed_ch1",
      objectType: "belt",
      objectRole: "virtual",
      displayName: "Virtual Feed",
      shortDescription: "Upstream feed belt",
      stageIndex: 0,
      dimension: 1,
      isProfiled: false,
      liveRef: "live/belts/vbelt_feed_ch1.arrow",
    },
    {
      objectId: "vpile_ch1",
      objectType: "pile",
      objectRole: "virtual",
      displayName: "Virtual Crusher Residence",
      shortDescription: "Virtual 1D residence object",
      stageIndex: 1,
      dimension: 1,
      isProfiled: false,
      stockpileRef: "stockpiles/vpile_ch1/meta.json",
    },
    {
      objectId: "belt_cv200",
      objectType: "belt",
      objectRole: "physical",
      displayName: "CV 200",
      shortDescription: "Conveyor to stockpile",
      stageIndex: 2,
      dimension: 1,
      isProfiled: true,
      liveRef: "live/belts/belt_cv200.arrow",
      profilerRef: "profiler/objects/belt_cv200/manifest.json",
    },
    {
      objectId: "pile_stockpile",
      objectType: "pile",
      objectRole: "physical",
      displayName: "Plant Stockpile",
      shortDescription: "Primary stockpile",
      stageIndex: 3,
      dimension: 3,
      isProfiled: true,
      stockpileRef: "stockpiles/pile_stockpile/meta.json",
      profilerRef: "profiler/objects/pile_stockpile/manifest.json",
    },
    {
      objectId: "vpile_out_cv301",
      objectType: "pile",
      objectRole: "virtual",
      displayName: "Virtual Outflow Mixer",
      shortDescription: "Virtual 1D merge object",
      stageIndex: 4,
      dimension: 1,
      isProfiled: false,
      stockpileRef: "stockpiles/vpile_out_cv301/meta.json",
    },
  ];

  const circuit = {
    stages: [
      { index: 0, label: "Feed", nodeIds: ["vbelt_feed_ch1"] },
      { index: 1, label: "Residence", nodeIds: ["vpile_ch1"] },
      { index: 2, label: "Transport", nodeIds: ["belt_cv200"] },
      { index: 3, label: "Accumulation", nodeIds: ["pile_stockpile"] },
      { index: 4, label: "Discharge", nodeIds: ["vpile_out_cv301"] },
    ],
    nodes: [
      {
        id: "vbelt_feed_ch1",
        objectId: "vbelt_feed_ch1",
        objectType: "belt",
        objectRole: "virtual",
        label: "Virtual Feed",
        stageIndex: 0,
        dimension: 1,
        isProfiled: false,
        shortDescription: "Feed source into the modeled area",
        inputs: [],
        outputs: [{ id: "feed-out", label: "To residence", kind: "output", x: 1, y: 0.5, relatedObjectId: "vpile_ch1" }],
      },
      {
        id: "vpile_ch1",
        objectId: "vpile_ch1",
        objectType: "pile",
        objectRole: "virtual",
        label: "Virtual Crusher Residence",
        stageIndex: 1,
        dimension: 1,
        isProfiled: false,
        shortDescription: "Simple residence model",
        inputs: [{ id: "res-in", label: "From feed", kind: "input", x: 0, y: 0.5, relatedObjectId: "vbelt_feed_ch1" }],
        outputs: [{ id: "res-out", label: "To CV200", kind: "output", x: 1, y: 0.5, relatedObjectId: "belt_cv200" }],
      },
      {
        id: "belt_cv200",
        objectId: "belt_cv200",
        objectType: "belt",
        objectRole: "physical",
        label: "CV 200",
        stageIndex: 2,
        dimension: 1,
        isProfiled: true,
        shortDescription: "Physical conveyor to stockpile",
        inputs: [{ id: "cv200-in", label: "From residence", kind: "input", x: 0, y: 0.5, relatedObjectId: "vpile_ch1" }],
        outputs: [{ id: "cv200-out", label: "To stockpile", kind: "output", x: 1, y: 0.5, relatedObjectId: "pile_stockpile" }],
      },
      {
        id: "pile_stockpile",
        objectId: "pile_stockpile",
        objectType: "pile",
        objectRole: "physical",
        label: "Plant Stockpile",
        stageIndex: 3,
        dimension: 3,
        isProfiled: true,
        shortDescription: "Main 3D accumulation object",
        inputs: [{ id: "stockpile-in", label: "Feed point", kind: "input", x: 0.45, y: 0.15, relatedObjectId: "belt_cv200" }],
        outputs: [{ id: "stockpile-out", label: "Discharge", kind: "output", x: 0.55, y: 0.9, relatedObjectId: "vpile_out_cv301" }],
      },
      {
        id: "vpile_out_cv301",
        objectId: "vpile_out_cv301",
        objectType: "pile",
        objectRole: "virtual",
        label: "Virtual Outflow Mixer",
        stageIndex: 4,
        dimension: 1,
        isProfiled: false,
        shortDescription: "Merged discharge path",
        inputs: [{ id: "out-in", label: "From stockpile", kind: "input", x: 0, y: 0.5, relatedObjectId: "pile_stockpile" }],
        outputs: [],
      },
    ],
    edges: [
      { id: "e1", source: "vbelt_feed_ch1", target: "vpile_ch1", label: "feed" },
      { id: "e2", source: "vpile_ch1", target: "belt_cv200", label: "transport" },
      { id: "e3", source: "belt_cv200", target: "pile_stockpile", label: "feed" },
      { id: "e4", source: "pile_stockpile", target: "vpile_out_cv301", label: "discharge" },
    ],
  };

  const liveSummaries = [
    {
      objectId: "vbelt_feed_ch1",
      objectType: "belt",
      displayName: "Virtual Feed",
      timestamp: "2025-03-19T01:15:00Z",
      massTon: 240,
      status: "Updated",
      qualityValues: { q_num_fe: 1.2, q_num_cut: 0.84, q_cat_materialtype_main: 10001 },
    },
    {
      objectId: "belt_cv200",
      objectType: "belt",
      displayName: "CV 200",
      timestamp: "2025-03-19T01:15:00Z",
      massTon: 180,
      status: "Updated",
      qualityValues: { q_num_fe: 1.32, q_num_cut: 0.88, q_cat_materialtype_main: 10002 },
    },
    {
      objectId: "pile_stockpile",
      objectType: "pile",
      displayName: "Plant Stockpile",
      timestamp: "2025-03-19T01:15:00Z",
      massTon: 420,
      status: "Updated",
      qualityValues: { q_num_fe: 1.15, q_num_cut: 0.91, q_cat_materialtype_main: 10003 },
    },
  ];

  await writeJson(path.join(root, "manifest.json"), manifest);
  await writeJson(path.join(root, "qualities.json"), qualities);
  await writeJson(path.join(root, "registry.json"), registry);
  await writeJson(path.join(root, "circuit.json"), circuit);
  await writeJson(path.join(root, "live", "object-summaries.json"), liveSummaries);

  await writeArrow(path.join(root, "live", "belts", "vbelt_feed_ch1.arrow"), {
    position: [0, 1, 2, 3],
    massTon: [60, 60, 60, 60],
    timestampOldestMs: [1742346000000, 1742346000000, 1742346000000, 1742346000000],
    timestampNewestMs: [1742346900000, 1742346900000, 1742346900000, 1742346900000],
    q_num_fe: [1.1, 1.15, 1.25, 1.3],
    q_num_cut: [0.7, 0.74, 0.83, 0.9],
    q_cat_materialtype_main: [10001, 10001, 10002, 10002],
  });

  await writeArrow(path.join(root, "live", "belts", "belt_cv200.arrow"), {
    position: [0, 1, 2, 3, 4, 5],
    massTon: [30, 30, 30, 30, 30, 30],
    timestampOldestMs: Array(6).fill(1742346000000),
    timestampNewestMs: Array(6).fill(1742346900000),
    q_num_fe: [1.05, 1.1, 1.2, 1.35, 1.42, 1.5],
    q_num_cut: [0.72, 0.75, 0.79, 0.9, 0.96, 1.02],
    q_cat_materialtype_main: [10001, 10001, 10002, 10002, 10003, 10003],
  });

  const stockpileCells = {
    ix: [0, 0, 1, 1, 2, 2, 0, 1, 2],
    iy: [0, 1, 0, 1, 0, 1, 0, 1, 1],
    iz: [0, 0, 0, 0, 0, 0, 1, 1, 1],
    massTon: [40, 45, 48, 50, 52, 54, 38, 41, 44],
    timestampOldestMs: Array(9).fill(1742344200000),
    timestampNewestMs: Array(9).fill(1742346900000),
    q_num_fe: [1.0, 1.04, 1.08, 1.12, 1.18, 1.22, 1.25, 1.3, 1.36],
    q_num_cut: [0.7, 0.73, 0.78, 0.81, 0.86, 0.91, 0.94, 0.99, 1.04],
    q_cat_materialtype_main: [10001, 10001, 10002, 10002, 10002, 10003, 10003, 10003, 10003],
  };

  await writeJson(path.join(root, "stockpiles", "pile_stockpile", "meta.json"), {
    objectId: "pile_stockpile",
    displayName: "Plant Stockpile",
    objectRole: "physical",
    timestamp: "2025-03-19T01:15:00Z",
    dimension: 3,
    extents: { x: 3, y: 2, z: 2 },
    occupiedCellCount: 9,
    surfaceCellCount: 3,
    defaultQualityId: "q_num_fe",
    availableQualityIds: ["q_num_fe", "q_num_cut", "q_cat_materialtype_main"],
    viewModes: ["surface", "shell", "full", "slice"],
    suggestedFullStride: 1,
    fullModeThreshold: 12,
    qualityAverages: { q_num_fe: 1.15, q_num_cut: 0.89, q_cat_materialtype_main: 10003 },
    inputs: [{ id: "stockpile-in", label: "Feed point", kind: "input", x: 0.45, y: 0.15, relatedObjectId: "belt_cv200" }],
    outputs: [{ id: "stockpile-out", label: "Discharge", kind: "output", x: 0.55, y: 0.9, relatedObjectId: "vpile_out_cv301" }],
    files: {
      cells: "stockpiles/pile_stockpile/cells.arrow",
      surface: "stockpiles/pile_stockpile/surface.arrow",
      shell: "stockpiles/pile_stockpile/shell.arrow",
    },
  });

  await writeArrow(path.join(root, "stockpiles", "pile_stockpile", "cells.arrow"), stockpileCells);
  await writeArrow(path.join(root, "stockpiles", "pile_stockpile", "surface.arrow"), {
    ix: [0, 1, 2],
    iy: [0, 1, 1],
    iz: [1, 1, 1],
    massTon: [38, 41, 44],
    timestampOldestMs: Array(3).fill(1742344200000),
    timestampNewestMs: Array(3).fill(1742346900000),
    q_num_fe: [1.25, 1.3, 1.36],
    q_num_cut: [0.94, 0.99, 1.04],
    q_cat_materialtype_main: [10003, 10003, 10003],
  });
  await writeArrow(path.join(root, "stockpiles", "pile_stockpile", "shell.arrow"), stockpileCells);

  await writeJson(path.join(root, "stockpiles", "vpile_ch1", "meta.json"), {
    objectId: "vpile_ch1",
    displayName: "Virtual Crusher Residence",
    objectRole: "virtual",
    timestamp: "2025-03-19T01:15:00Z",
    dimension: 1,
    extents: { x: 1, y: 1, z: 4 },
    occupiedCellCount: 4,
    surfaceCellCount: 1,
    defaultQualityId: "q_num_fe",
    availableQualityIds: ["q_num_fe", "q_num_cut", "q_cat_materialtype_main"],
    viewModes: ["full"],
    suggestedFullStride: 1,
    fullModeThreshold: 20,
    qualityAverages: { q_num_fe: 1.12, q_num_cut: 0.76, q_cat_materialtype_main: 10001 },
    inputs: [{ id: "res-in", label: "From feed", kind: "input", x: 0, y: 1, relatedObjectId: "vbelt_feed_ch1" }],
    outputs: [{ id: "res-out", label: "To CV200", kind: "output", x: 1, y: 0, relatedObjectId: "belt_cv200" }],
    files: { cells: "stockpiles/vpile_ch1/cells.arrow" },
  });
  await writeArrow(path.join(root, "stockpiles", "vpile_ch1", "cells.arrow"), {
    ix: [0, 0, 0, 0],
    iy: [0, 0, 0, 0],
    iz: [0, 1, 2, 3],
    massTon: [20, 20, 20, 20],
    timestampOldestMs: Array(4).fill(1742344200000),
    timestampNewestMs: Array(4).fill(1742346900000),
    q_num_fe: [1.01, 1.08, 1.12, 1.25],
    q_num_cut: [0.68, 0.7, 0.76, 0.89],
    q_cat_materialtype_main: [10001, 10001, 10002, 10002],
  });

  await writeJson(path.join(root, "stockpiles", "vpile_out_cv301", "meta.json"), {
    objectId: "vpile_out_cv301",
    displayName: "Virtual Outflow Mixer",
    objectRole: "virtual",
    timestamp: "2025-03-19T01:15:00Z",
    dimension: 1,
    extents: { x: 1, y: 1, z: 3 },
    occupiedCellCount: 3,
    surfaceCellCount: 1,
    defaultQualityId: "q_num_fe",
    availableQualityIds: ["q_num_fe", "q_num_cut", "q_cat_materialtype_main"],
    viewModes: ["full"],
    suggestedFullStride: 1,
    fullModeThreshold: 20,
    qualityAverages: { q_num_fe: 1.24, q_num_cut: 0.95, q_cat_materialtype_main: 10003 },
    inputs: [{ id: "out-in", label: "From stockpile", kind: "input", x: 0, y: 1, relatedObjectId: "pile_stockpile" }],
    outputs: [],
    files: { cells: "stockpiles/vpile_out_cv301/cells.arrow" },
  });
  await writeArrow(path.join(root, "stockpiles", "vpile_out_cv301", "cells.arrow"), {
    ix: [0, 0, 0],
    iy: [0, 0, 0],
    iz: [0, 1, 2],
    massTon: [18, 18, 18],
    timestampOldestMs: Array(3).fill(1742344200000),
    timestampNewestMs: Array(3).fill(1742346900000),
    q_num_fe: [1.18, 1.24, 1.31],
    q_num_cut: [0.88, 0.95, 1.02],
    q_cat_materialtype_main: [10002, 10003, 10003],
  });

  await writeJson(path.join(root, "profiler", "index.json"), {
    defaultObjectId: "pile_stockpile",
    objects: [
      {
        objectId: "belt_cv200",
        displayName: "CV 200",
        objectType: "belt",
        dimension: 1,
        manifestRef: "profiler/objects/belt_cv200/manifest.json",
      },
      {
        objectId: "pile_stockpile",
        displayName: "Plant Stockpile",
        objectType: "pile",
        dimension: 3,
        manifestRef: "profiler/objects/pile_stockpile/manifest.json",
      },
    ],
  });

  await writeArrow(path.join(root, "profiler", "summary.arrow"), {
    snapshotId: ["20250319010000", "20250319010000", "20250319011500", "20250319011500"],
    timestamp: [
      "2025-03-19T01:00:00Z",
      "2025-03-19T01:00:00Z",
      "2025-03-19T01:15:00Z",
      "2025-03-19T01:15:00Z",
    ],
    objectId: ["belt_cv200", "pile_stockpile", "belt_cv200", "pile_stockpile"],
    objectType: ["belt", "pile", "belt", "pile"],
    displayName: ["CV 200", "Plant Stockpile", "CV 200", "Plant Stockpile"],
    dimension: [1, 3, 1, 3],
    massTon: [172, 410, 180, 420],
    q_num_fe: [1.24, 1.12, 1.32, 1.15],
    q_num_cut: [0.82, 0.86, 0.88, 0.91],
    q_cat_materialtype_main: [10002, 10003, 10002, 10003],
  });

  await writeJson(path.join(root, "profiler", "objects", "belt_cv200", "manifest.json"), {
    objectId: "belt_cv200",
    objectType: "belt",
    displayName: "CV 200",
    dimension: 1,
    defaultQualityId: "q_num_fe",
    availableQualityIds: ["q_num_fe", "q_num_cut", "q_cat_materialtype_main"],
    latestSnapshotId: "20250319011500",
    snapshotIds: ["20250319010000", "20250319011500"],
    snapshotPathTemplate: "profiler/objects/belt_cv200/snapshots/[snapshotId].arrow",
  });
  await writeArrow(path.join(root, "profiler", "objects", "belt_cv200", "snapshots", "20250319010000.arrow"), {
    timestamp: ["2025-03-19T01:00:00Z"],
    ix: [0],
    iy: [0],
    iz: [0],
    massTon: [172],
    timestampOldestMs: [1742346000000],
    timestampNewestMs: [1742346000000],
    q_num_fe: [1.24],
    q_num_cut: [0.82],
    q_cat_materialtype_main: [10002],
  });
  await writeArrow(path.join(root, "profiler", "objects", "belt_cv200", "snapshots", "20250319011500.arrow"), {
    timestamp: ["2025-03-19T01:15:00Z"],
    ix: [0],
    iy: [0],
    iz: [0],
    massTon: [180],
    timestampOldestMs: [1742346900000],
    timestampNewestMs: [1742346900000],
    q_num_fe: [1.32],
    q_num_cut: [0.88],
    q_cat_materialtype_main: [10002],
  });

  await writeJson(path.join(root, "profiler", "objects", "pile_stockpile", "manifest.json"), {
    objectId: "pile_stockpile",
    objectType: "pile",
    displayName: "Plant Stockpile",
    dimension: 3,
    defaultQualityId: "q_num_fe",
    availableQualityIds: ["q_num_fe", "q_num_cut", "q_cat_materialtype_main"],
    latestSnapshotId: "20250319011500",
    snapshotIds: ["20250319010000", "20250319011500"],
    snapshotPathTemplate: "profiler/objects/pile_stockpile/snapshots/[snapshotId].arrow",
  });
  await writeArrow(path.join(root, "profiler", "objects", "pile_stockpile", "snapshots", "20250319010000.arrow"), {
    timestamp: Array(4).fill("2025-03-19T01:00:00Z"),
    ix: [0, 0, 1, 1],
    iy: [0, 1, 0, 1],
    iz: [0, 0, 0, 0],
    massTon: [96, 98, 104, 112],
    timestampOldestMs: Array(4).fill(1742346000000),
    timestampNewestMs: Array(4).fill(1742346000000),
    q_num_fe: [1.02, 1.08, 1.12, 1.18],
    q_num_cut: [0.73, 0.78, 0.86, 0.91],
    q_cat_materialtype_main: [10001, 10002, 10002, 10003],
  });
  await writeArrow(path.join(root, "profiler", "objects", "pile_stockpile", "snapshots", "20250319011500.arrow"), {
    timestamp: Array(4).fill("2025-03-19T01:15:00Z"),
    ix: [0, 0, 1, 1],
    iy: [0, 1, 0, 1],
    iz: [0, 0, 0, 0],
    massTon: [100, 102, 108, 110],
    timestampOldestMs: Array(4).fill(1742346900000),
    timestampNewestMs: Array(4).fill(1742346900000),
    q_num_fe: [1.05, 1.1, 1.15, 1.2],
    q_num_cut: [0.75, 0.79, 0.9, 0.92],
    q_cat_materialtype_main: [10001, 10002, 10003, 10003],
  });
}
