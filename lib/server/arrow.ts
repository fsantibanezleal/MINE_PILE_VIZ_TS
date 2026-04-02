import { readFile } from "node:fs/promises";
import { tableFromIPC } from "apache-arrow";

function normalizeArrowValue(value: unknown): unknown {
  if (typeof value === "bigint") {
    return Number(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeArrowValue(entry));
  }

  if (value && typeof value === "object" && "toJSON" in value) {
    return normalizeArrowValue((value as { toJSON(): unknown }).toJSON());
  }

  return value;
}

export async function readArrowRows(
  filePath: string,
): Promise<Array<Record<string, unknown>>> {
  const buffer = await readFile(filePath);
  const table = tableFromIPC(
    new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
  );

  return table.toArray().map((row) => {
    const json = row.toJSON() as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(json).map(([key, value]) => [key, normalizeArrowValue(value)]),
    );
  });
}
