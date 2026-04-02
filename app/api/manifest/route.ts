import { NextResponse } from "next/server";
import { getAppManifest } from "@/lib/server/app-data";
import {
  normalizeAppDataError,
  toAppDataErrorPayload,
} from "@/lib/server/app-data-errors";

export async function GET() {
  try {
    const manifest = await getAppManifest();
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
