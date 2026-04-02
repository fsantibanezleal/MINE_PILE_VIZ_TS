import { NextResponse } from "next/server";
import { getProfilerSummary } from "@/lib/server/app-data";

export async function GET() {
  const rows = await getProfilerSummary();
  return NextResponse.json(rows);
}
