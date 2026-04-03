"use client";

import {
  MATERIAL_TIME_MODE_OPTIONS,
  type MaterialTimeMode,
} from "@/lib/material-time-view";

interface MaterialTimeModeSelectorProps {
  value: MaterialTimeMode;
  onChange: (value: MaterialTimeMode) => void;
  label?: string;
}

export function MaterialTimeModeSelector({
  value,
  onChange,
  label = "Inspection mode",
}: MaterialTimeModeSelectorProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as MaterialTimeMode)}
      >
        {MATERIAL_TIME_MODE_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
