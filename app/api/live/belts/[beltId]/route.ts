import { NextResponse } from "next/server";
import { getLiveBeltSnapshot } from "@/lib/server/app-data";
import {
  normalizeAppDataError,
  toAppDataErrorPayload,
} from "@/lib/server/app-data-errors";

interface RouteContext {
  params: Promise<{
    beltId: string;
  }>;
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const { beltId } = await context.params;
    const snapshot = await getLiveBeltSnapshot(beltId);
    return NextResponse.json(snapshot);
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
