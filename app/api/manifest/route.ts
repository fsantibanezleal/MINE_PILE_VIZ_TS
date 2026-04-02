import { NextResponse } from "next/server";
import { getAppManifest } from "@/lib/server/app-data";

export async function GET() {
  const manifest = await getAppManifest();
  return NextResponse.json(manifest);
}
