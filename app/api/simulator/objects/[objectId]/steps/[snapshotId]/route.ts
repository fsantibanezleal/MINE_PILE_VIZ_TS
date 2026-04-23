import { NextResponse } from "next/server";
import { getSimulatorStep } from "@/lib/server/app-data";
import {
  normalizeAppDataError,
  toAppDataErrorPayload,
} from "@/lib/server/app-data-errors";

interface RouteContext {
  params: Promise<{
    objectId: string;
    snapshotId: string;
  }>;
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const { objectId, snapshotId } = await context.params;
    const payload = await getSimulatorStep(objectId, snapshotId);
    return NextResponse.json(payload);
  } catch (error) {
    const appError = normalizeAppDataError(error);
    return NextResponse.json(
      {
        error: toAppDataErrorPayload(appError),
      },
      {
        status: appError.status,
      },
    );
  }
}
