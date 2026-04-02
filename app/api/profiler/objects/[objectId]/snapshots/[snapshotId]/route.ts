import { NextResponse } from "next/server";
import { getProfilerSnapshot } from "@/lib/server/app-data";

interface RouteContext {
  params: Promise<{
    objectId: string;
    snapshotId: string;
  }>;
}

export async function GET(_: Request, context: RouteContext) {
  const { objectId, snapshotId } = await context.params;
  const snapshot = await getProfilerSnapshot(objectId, snapshotId);
  return NextResponse.json(snapshot);
}
