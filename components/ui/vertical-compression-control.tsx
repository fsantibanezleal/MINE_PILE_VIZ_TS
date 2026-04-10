"use client";

import {
  MAX_VERTICAL_COMPRESSION_FACTOR,
  MIN_VERTICAL_COMPRESSION_FACTOR,
  clampVerticalCompressionFactor,
} from "@/lib/vertical-compression";

interface VerticalCompressionControlProps {
  value: number;
  onChange: (nextValue: number) => void;
  label?: string;
}

export function VerticalCompressionControl({
  value,
  onChange,
  label = "Vertical compression",
}: VerticalCompressionControlProps) {
  const normalizedValue = clampVerticalCompressionFactor(value);

  return (
    <label className="field">
      <span>{label}</span>
      <div className="field__inline">
        <input
          aria-label={`${label} slider`}
          type="range"
          min={MIN_VERTICAL_COMPRESSION_FACTOR}
          max={MAX_VERTICAL_COMPRESSION_FACTOR}
          step={1}
          value={normalizedValue}
          onChange={(event) =>
            onChange(clampVerticalCompressionFactor(Number(event.target.value)))
          }
        />
        <input
          aria-label={`${label} factor`}
          className="field__number"
          type="number"
          min={MIN_VERTICAL_COMPRESSION_FACTOR}
          max={MAX_VERTICAL_COMPRESSION_FACTOR}
          step={1}
          value={normalizedValue}
          onChange={(event) =>
            onChange(clampVerticalCompressionFactor(Number(event.target.value)))
          }
        />
      </div>
      <small className="field__hint">Effective vertical scale: 1 / {normalizedValue}</small>
    </label>
  );
}
