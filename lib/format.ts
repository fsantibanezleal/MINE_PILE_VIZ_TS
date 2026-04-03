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

export function formatDuration(valueMs: number | null | undefined): string {
  if (valueMs === null || valueMs === undefined || Number.isNaN(valueMs)) {
    return "N/A";
  }

  const totalSeconds = Math.max(0, Math.round(valueMs / 1000));

  if (totalSeconds < 60) {
    return `${totalSeconds} s`;
  }

  const totalMinutes = Math.floor(totalSeconds / 60);

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const totalHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (totalHours < 24) {
    return minutes > 0 ? `${totalHours} h ${minutes} min` : `${totalHours} h`;
  }

  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  return hours > 0 ? `${days} d ${hours} h` : `${days} d`;
}
