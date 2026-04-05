import type { ObjectType } from "@/types/app-data";

export type ProfilerMode = "circuit" | "detail";

export interface ProfilerDetailDescriptor {
  objectType: ObjectType;
  dimension: 1 | 2 | 3;
}

export interface ProfilerSemanticFrame {
  source: string;
  resolution: string;
  note: string;
  recordLabel: string;
  basisLabel: string;
  densityLabel: string;
  aggregationLabel: string;
}

function getDetailRecordLabel(detail: ProfilerDetailDescriptor) {
  if (detail.objectType === "belt") {
    return "summary rows";
  }

  if (detail.dimension === 1) {
    return "summary bands";
  }

  return "summary cells";
}

export function getProfilerSemanticFrame(
  mode: ProfilerMode,
  detail?: ProfilerDetailDescriptor | null,
): ProfilerSemanticFrame {
  if (mode === "circuit" || !detail) {
    return {
      source: "Profiler summary rows",
      resolution: "Reduced circuit summary rows",
      note:
        "Each object contributes one reduced historical summary row at the selected timestep. This is not equivalent to dense live inventory state.",
      recordLabel: "summary rows",
      basisLabel: "Row basis",
      densityLabel: "Not dense live state",
      aggregationLabel: "One summarized row per object",
    };
  }

  const recordLabel = getDetailRecordLabel(detail);
  const resolution =
    detail.objectType === "belt"
      ? "Reduced belt summary rows"
      : detail.dimension === 1
        ? "Reduced pile summary bands"
        : "Reduced pile summary cells";

  return {
    source: "Profiler detail snapshot",
    resolution,
    note:
      "This detail view shows historical summarized content for one object at the selected timestep. Use live when you need current dense belt or pile state.",
    recordLabel,
    basisLabel:
      recordLabel === "summary bands"
        ? "Band basis"
        : recordLabel === "summary cells"
          ? "Cell basis"
          : "Row basis",
    densityLabel: "Historical summary only",
    aggregationLabel:
      recordLabel === "summary bands"
        ? "Reduced longitudinal pile bands"
        : recordLabel === "summary cells"
          ? "Reduced pile summary cells"
          : "Reduced transport summary rows",
  };
}
