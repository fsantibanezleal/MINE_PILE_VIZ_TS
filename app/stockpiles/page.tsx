import { redirect } from "next/navigation";

interface StockpilesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function StockpilesPage({
  searchParams,
}: StockpilesPageProps) {
  const resolvedSearchParams = await searchParams;
  const nextSearchParams = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(resolvedSearchParams)) {
    if (rawValue === undefined || key === "view") {
      continue;
    }

    if (Array.isArray(rawValue)) {
      for (const value of rawValue) {
        nextSearchParams.append(key, value);
      }
      continue;
    }

    nextSearchParams.set(key, rawValue);
  }

  nextSearchParams.set("view", "piles");

  redirect(`/live?${nextSearchParams.toString()}`);
}
