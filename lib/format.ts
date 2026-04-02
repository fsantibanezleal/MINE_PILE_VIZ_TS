const massFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const shortNumberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const timestampFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function formatMassTon(value: number): string {
  return `${massFormatter.format(value)} t`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A";
  }

  return shortNumberFormatter.format(value);
}

export function formatTimestamp(value: string | number): string {
  const date = typeof value === "string" ? new Date(value) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid timestamp";
  }

  return `${timestampFormatter.format(date)} UTC`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A";
  }

  return `${shortNumberFormatter.format(value)}%`;
}
