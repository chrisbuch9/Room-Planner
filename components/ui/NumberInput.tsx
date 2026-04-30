"use client";

import { useEffect, useState } from "react";
import type { DisplayUnit } from "@/lib/geometry/units";
import { cmToM, mToCm } from "@/lib/geometry/units";

type Props = {
  // Value in centimeters.
  valueCm: number;
  onChangeCm: (cm: number) => void;
  unit?: DisplayUnit;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
};

// Number input that displays the value in the chosen unit and writes back cm.
// Keeps a local string while the user is editing so partial inputs (e.g. "1.")
// don't get rejected.
export default function NumberInput({
  valueCm,
  onChangeCm,
  unit = "cm",
  step,
  min,
  max,
  disabled,
}: Props) {
  const display = unit === "m" ? cmToM(valueCm) : valueCm;
  const [text, setText] = useState<string>(format(display, unit));

  useEffect(() => {
    setText(format(display, unit));
  }, [display, unit]);

  const commit = (raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      setText(format(display, unit));
      return;
    }
    const cm = unit === "m" ? mToCm(n) : n;
    const clamped =
      min !== undefined || max !== undefined
        ? Math.max(min ?? -Infinity, Math.min(max ?? Infinity, cm))
        : cm;
    onChangeCm(clamped);
  };

  return (
    <div className="group flex items-stretch h-9 rounded-md border border-ink-200 bg-white overflow-hidden transition-colors focus-within:border-ink-500 focus-within:ring-2 focus-within:ring-ink-500/30 hover:border-ink-300">
      <input
        type="number"
        inputMode="decimal"
        className="px-2.5 text-sm w-full font-mono tabular-nums text-ink-900 bg-transparent outline-none disabled:text-ink-400"
        value={text}
        step={step ?? (unit === "m" ? 0.01 : 1)}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
      <span className="px-2 text-[11px] flex items-center bg-paper-100 text-ink-500 border-l border-ink-200 font-medium uppercase tracking-wider">
        {unit}
      </span>
    </div>
  );
}

function format(value: number, unit: DisplayUnit): string {
  if (unit === "m") return value.toFixed(2);
  return Math.round(value).toString();
}
