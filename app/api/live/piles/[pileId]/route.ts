import { NextResponse } from "next/server";
import { getLivePileDataset } from "@/lib/server/app-data";
import {
  normalizeAppDataError,
  toAppDataErrorPayload,
} from "@/lib/server/app-data-errors";

interface RouteContext {
  params: Promise<{
    pileId: string;
  }>;
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const { pileId } = await context.params;
    const dataset = await getLivePileDataset(pileId);
    return NextResponse.json(dataset);
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
