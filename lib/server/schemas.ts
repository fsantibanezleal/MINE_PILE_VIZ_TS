import { z } from "zod";

export const manifestSchema = z.object({
  schemaVersion: z.string(),
  appVersion: z.string(),
  datasetLabel: z.string(),
  generatedAt: z.string(),
  latestTimestamp: z.string(),
  paths: z.object({
    qualities: z.string(),
    registry: z.string(),
    circuit: z.string(),
    liveSummaries: z.string(),
    profilerIndex: z.string(),
    profilerSummary: z.string(),
  }),
  capabilities: z.object({
    circuit: z.boolean(),
    live: z.boolean(),
    stockpiles: z.boolean(),
    profiler: z.boolean(),
  }),
  objectCounts: z.object({
    total: z.number(),
    belts: z.number(),
    piles: z.number(),
    profiled: z.number(),
  }),
});

export const qualityDefinitionSchema = z.object({
  id: z.string(),
  kind: z.enum(["numerical", "categorical"]),
  label: z.string(),
  description: z.string(),
  unit: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  palette: z.array(z.string()),
  categories: z
    .array(
      z.object({
        value: z.union([z.number(), z.string()]),
        label: z.string(),
        color: z.string(),
      }),
    )
    .optional(),
});

export const graphAnchorSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.enum(["input", "output"]),
  x: z.number(),
  y: z.number(),
  spanX: z.number().optional(),
  spanY: z.number().optional(),
  positionMode: z.enum(["fixed", "assumed-center"]).optional(),
  relatedObjectId: z.string(),
});

export const objectRegistryEntrySchema = z.object({
  objectId: z.string(),
  objectType: z.enum(["belt", "pile"]),
  objectRole: z.enum(["physical", "virtual"]),
  displayName: z.string(),
  shortDescription: z.string(),
  stageIndex: z.number(),
  dimension: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  isProfiled: z.boolean(),
  liveRef: z.string().nullable().optional(),
  stockpileRef: z.string().nullable().optional(),
  profilerRef: z.string().nullable().optional(),
});

export const circuitNodeSchema = z.object({
  id: z.string(),
  objectId: z.string(),
  objectType: z.enum(["belt", "pile"]),
  objectRole: z.enum(["physical", "virtual"]),
  label: z.string(),
  stageIndex: z.number(),
  dimension: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  isProfiled: z.boolean(),
  shortDescription: z.string(),
  inputs: z.array(graphAnchorSchema),
  outputs: z.array(graphAnchorSchema),
});

export const circuitEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string(),
});

export const circuitGraphSchema = z.object({
  stages: z.array(
    z.object({
      index: z.number(),
      label: z.string(),
      nodeIds: z.array(z.string()),
    }),
  ),
  nodes: z.array(circuitNodeSchema),
  edges: z.array(circuitEdgeSchema),
});

export const objectSummarySchema = z.object({
  objectId: z.string(),
  objectType: z.enum(["belt", "pile"]),
  displayName: z.string(),
  timestamp: z.string(),
  massTon: z.number(),
  status: z.string(),
  qualityValues: z.record(z.string(), z.union([z.number(), z.string(), z.null()])),
  metrics: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
});

export const pileDatasetMetaSchema = z.object({
  objectId: z.string(),
  displayName: z.string(),
  objectRole: z.enum(["physical", "virtual"]),
  timestamp: z.string(),
  dimension: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  extents: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  }),
  occupiedCellCount: z.number(),
  surfaceCellCount: z.number(),
  defaultQualityId: z.string(),
  availableQualityIds: z.array(z.string()),
  viewModes: z.array(z.enum(["surface", "shell", "full", "slice"])),
  suggestedFullStride: z.number(),
  fullModeThreshold: z.number(),
  qualityAverages: z.record(z.string(), z.union([z.number(), z.string(), z.null()])),
  inputs: z.array(graphAnchorSchema),
  outputs: z.array(graphAnchorSchema),
  files: z.object({
    cells: z.string(),
    surface: z.string().optional(),
    shell: z.string().optional(),
  }),
});

export const profilerIndexSchema = z.object({
  defaultObjectId: z.string(),
  objects: z.array(
    z.object({
      objectId: z.string(),
      displayName: z.string(),
      objectType: z.enum(["belt", "pile"]),
      dimension: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      manifestRef: z.string(),
    }),
  ),
});

export const profilerObjectManifestSchema = z.object({
  objectId: z.string(),
  objectType: z.enum(["belt", "pile"]),
  displayName: z.string(),
  dimension: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  defaultQualityId: z.string(),
  availableQualityIds: z.array(z.string()),
  latestSnapshotId: z.string(),
  snapshotIds: z.array(z.string()),
  snapshotPathTemplate: z.string(),
});
