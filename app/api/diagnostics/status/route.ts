import { NextResponse } from "next/server";
import { runAppCacheCheck } from "@/lib/server/app-cache-check";
import { normalizeAppDataError, toAppDataErrorPayload } from "@/lib/server/app-data-errors";

export async function GET() {
  try {
    const status = await runAppCacheCheck({ includeAllProfilerSnapshots: false });
    return NextResponse.json(status);
  } catch (error) {
    const normalized = normalizeAppDataError(error);
    return NextResponse.json(
      { error: toAppDataErrorPayload(normalized) },
      { status: normalized.status },
    );
  }
}
