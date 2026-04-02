import { NextResponse } from "next/server";
import { getLiveBeltSnapshot } from "@/lib/server/app-data";

interface RouteContext {
  params: Promise<{
    beltId: string;
  }>;
}

export async function GET(_: Request, context: RouteContext) {
  const { beltId } = await context.params;
  const snapshot = await getLiveBeltSnapshot(beltId);
  return NextResponse.json(snapshot);
}
