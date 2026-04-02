export type QualityKind = "numerical" | "categorical";
export type ObjectType = "belt" | "pile";
export type ObjectRole = "physical" | "virtual";
export type StockpileViewMode = "surface" | "shell" | "full" | "slice";
export type QualityValue = string | number | null;

export interface QualityCategory {
  value: string | number;
  label: string;
  color: string;
}

export interface QualityDefinition {
  id: string;
  kind: QualityKind;
  label: string;
  description: string;
  unit?: string;
  min?: number;
  max?: number;
  palette: string[];
  categories?: QualityCategory[];
}

export interface AppManifest {
  schemaVersion: string;
  appVersion: string;
  datasetLabel: string;
  generatedAt: string;
  latestTimestamp: string;
  paths: {
    qualities: string;
    registry: string;
    circuit: string;
    liveSummaries: string;
    profilerIndex: string;
    profilerSummary: string;
  };
  capabilities: {
    circuit: boolean;
    live: boolean;
    stockpiles: boolean;
    profiler: boolean;
  };
  objectCounts: {
    total: number;
    belts: number;
    piles: number;
    profiled: number;
  };
}

export interface ObjectRegistryEntry {
  objectId: string;
  objectType: ObjectType;
  objectRole: ObjectRole;
  displayName: string;
  shortDescription: string;
  stageIndex: number;
  dimension: 1 | 2 | 3;
  isProfiled: boolean;
  liveRef?: string | null;
  stockpileRef?: string | null;
  profilerRef?: string | null;
}

export interface GraphAnchor {
  id: string;
  label: string;
  kind: "input" | "output";
  x: number;
  y: number;
  relatedObjectId: string;
}

export interface CircuitNode {
  id: string;
  objectId: string;
  objectType: ObjectType;
  objectRole: ObjectRole;
  label: string;
  stageIndex: number;
  dimension: 1 | 2 | 3;
  isProfiled: boolean;
  shortDescription: string;
  inputs: GraphAnchor[];
  outputs: GraphAnchor[];
}

export interface CircuitEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface CircuitGraph {
  stages: Array<{
    index: number;
    label: string;
    nodeIds: string[];
  }>;
  nodes: CircuitNode[];
  edges: CircuitEdge[];
}

export interface QualityValueMap {
  [qualityId: string]: QualityValue;
}

export interface ObjectSummary {
  objectId: string;
  objectType: ObjectType;
  displayName: string;
  timestamp: string;
  massTon: number;
  status: string;
  qualityValues: QualityValueMap;
  metrics?: Record<string, number | string>;
}

export interface BeltBlockRecord {
  position: number;
  massTon: number;
  timestampOldestMs: number;
  timestampNewestMs: number;
  qualityValues: QualityValueMap;
}

export interface BeltSnapshot {
  objectId: string;
  displayName: string;
  timestamp: string;
  totalMassTon: number;
  blockCount: number;
  qualityAverages: QualityValueMap;
  blocks: BeltBlockRecord[];
}

export interface PileCellRecord {
  ix: number;
  iy: number;
  iz: number;
  massTon: number;
  timestampOldestMs: number;
  timestampNewestMs: number;
  qualityValues: QualityValueMap;
}

export interface PileDatasetMeta {
  objectId: string;
  displayName: string;
  objectRole: ObjectRole;
  timestamp: string;
  dimension: 1 | 2 | 3;
  extents: {
    x: number;
    y: number;
    z: number;
  };
  occupiedCellCount: number;
  surfaceCellCount: number;
  defaultQualityId: string;
  availableQualityIds: string[];
  viewModes: StockpileViewMode[];
  suggestedFullStride: number;
  fullModeThreshold: number;
  qualityAverages: QualityValueMap;
  inputs: GraphAnchor[];
  outputs: GraphAnchor[];
  files: {
    cells: string;
    surface?: string;
    shell?: string;
  };
}

export interface PileDataset extends PileDatasetMeta {
  cells: PileCellRecord[];
  surfaceCells: PileCellRecord[];
  shellCells: PileCellRecord[];
}

export interface ProfilerIndexEntry {
  objectId: string;
  displayName: string;
  objectType: ObjectType;
  dimension: 1 | 2 | 3;
  manifestRef: string;
}

export interface ProfilerIndex {
  defaultObjectId: string;
  objects: ProfilerIndexEntry[];
}

export interface ProfilerSummaryRow {
  snapshotId: string;
  timestamp: string;
  objectId: string;
  objectType: ObjectType;
  displayName: string;
  dimension: 1 | 2 | 3;
  massTon: number;
  qualityValues: QualityValueMap;
}

export interface ProfilerObjectManifest {
  objectId: string;
  objectType: ObjectType;
  displayName: string;
  dimension: 1 | 2 | 3;
  defaultQualityId: string;
  availableQualityIds: string[];
  latestSnapshotId: string;
  snapshotIds: string[];
  snapshotPathTemplate: string;
}

export interface ProfilerSnapshot {
  objectId: string;
  displayName: string;
  objectType: ObjectType;
  snapshotId: string;
  timestamp: string;
  dimension: 1 | 2 | 3;
  rows: PileCellRecord[];
}
