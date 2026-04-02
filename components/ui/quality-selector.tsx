"use client";

import { getQualityDisplayLabel } from "@/lib/quality-display";
import type { QualityDefinition } from "@/types/app-data";

interface QualitySelectorProps {
  label: string;
  qualities: QualityDefinition[];
  value: string;
  onChange: (value: string) => void;
}

export function QualitySelector({
  label,
  qualities,
  value,
  onChange,
}: QualitySelectorProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {qualities.map((quality) => (
          <option key={quality.id} value={quality.id}>
            {getQualityDisplayLabel(quality)}
          </option>
        ))}
      </select>
    </label>
  );
}
