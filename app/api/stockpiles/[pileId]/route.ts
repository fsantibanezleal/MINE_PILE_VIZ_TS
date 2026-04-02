import { NextResponse } from "next/server";
import { getStockpileDataset } from "@/lib/server/app-data";

interface RouteContext {
  params: Promise<{
    pileId: string;
  }>;
}

export async function GET(_: Request, context: RouteContext) {
  const { pileId } = await context.params;
  const dataset = await getStockpileDataset(pileId);
  return NextResponse.json(dataset);
}
