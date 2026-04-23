import { NextResponse } from "next/server";
import { getSimulatorObjectManifest } from "@/lib/server/app-data";
import {
  normalizeAppDataError,
  toAppDataErrorPayload,
} from "@/lib/server/app-data-errors";

interface RouteContext {
  params: Promise<{
    objectId: string;
  }>;
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const { objectId } = await context.params;
    const manifest = await getSimulatorObjectManifest(objectId);
    return NextResponse.json(manifest);
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
