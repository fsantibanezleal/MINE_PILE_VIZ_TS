import { NextResponse } from "next/server";
import { getSimulatorIndex } from "@/lib/server/app-data";
import {
  normalizeAppDataError,
  toAppDataErrorPayload,
} from "@/lib/server/app-data-errors";

export async function GET() {
  try {
    const index = await getSimulatorIndex();
    return NextResponse.json(index);
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
