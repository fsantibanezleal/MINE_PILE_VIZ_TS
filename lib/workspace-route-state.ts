export type QueryValue = string | string[] | null | undefined;

export function getQueryValue(value: QueryValue) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value ?? undefined;
}

export function resolveQuerySelection(
  candidate: QueryValue,
  validIds: string[],
  fallback: string,
) {
  const value = getQueryValue(candidate);

  if (value && validIds.includes(value)) {
    return value;
  }

  return fallback;
}

export function buildHrefWithQuery(
  pathname: string,
  searchParams: URLSearchParams | { toString(): string },
  patch: Record<string, string | null | undefined>,
) {
  const nextParams = new URLSearchParams(searchParams.toString());

  Object.entries(patch).forEach(([key, value]) => {
    if (!value) {
      nextParams.delete(key);
      return;
    }

    nextParams.set(key, value);
  });

  const query = nextParams.toString();

  return query ? `${pathname}?${query}` : pathname;
}
