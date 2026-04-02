import { NextResponse } from "next/server";
import { getProfilerSummary } from "@/lib/server/app-data";
import {
  normalizeAppDataError,
  toAppDataErrorPayload,
} from "@/lib/server/app-data-errors";

export async function GET() {
  try {
    const rows = await getProfilerSummary();
    return NextResponse.json(rows);
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
