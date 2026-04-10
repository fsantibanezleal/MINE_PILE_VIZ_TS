import { buildHrefWithQuery } from "@/lib/workspace-route-state";
import type { ObjectType } from "@/types/app-data";

export type WorkspaceRoute =
  | "circuit"
  | "live"
  | "profiler"
  | "simulator";

export interface WorkspaceJumpTarget {
  route: WorkspaceRoute;
  href: string;
  label: string;
}

interface GetWorkspaceJumpTargetsOptions {
  pathname: string;
  objectId: string;
  objectType: ObjectType;
  isProfiled: boolean;
  searchParams: URLSearchParams | { toString(): string };
}

const WORKSPACE_JUMP_LABELS: Record<WorkspaceRoute, string> = {
  circuit: "Open Circuit",
  live: "Open Live State",
  profiler: "Open Profiler",
  simulator: "Open Simulator",
};

export function getWorkspaceJumpTargets({
  pathname,
  objectId,
  objectType,
  isProfiled,
  searchParams,
}: GetWorkspaceJumpTargetsOptions): WorkspaceJumpTarget[] {
  const candidates: Array<{
    route: WorkspaceRoute;
    href: string;
    enabled: boolean;
    query?: Record<string, string>;
  }> = [
    {
      route: "circuit",
      href: "/circuit",
      enabled: true,
    },
    {
      route: "live",
      href: "/live",
      enabled: true,
      query: objectType === "pile" ? { view: "piles" } : { view: "belts" },
    },
    {
      route: "profiler",
      href: "/profiler",
      enabled: isProfiled,
    },
    {
      route: "simulator",
      href: "/simulator",
      enabled: isProfiled,
    },
  ];

  return candidates
    .filter((candidate) => candidate.enabled && candidate.href !== pathname)
    .map((candidate) => ({
      route: candidate.route,
      label: WORKSPACE_JUMP_LABELS[candidate.route],
      href: buildHrefWithQuery(candidate.href, searchParams, {
        object: objectId,
        ...candidate.query,
      }),
    }));
}
