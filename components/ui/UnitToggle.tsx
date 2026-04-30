"use client";

import type { DisplayUnit } from "@/lib/geometry/units";

type Props = {
  unit: DisplayUnit;
  onChange: (u: DisplayUnit) => void;
};

export default function UnitToggle({ unit, onChange }: Props) {
  return (
    <div className="inline-flex p-0.5 rounded-md bg-paper-100 border border-ink-100 text-[11px] font-medium uppercase tracking-wider">
      {(["cm", "m"] as DisplayUnit[]).map((u) => (
        <button
          key={u}
          type="button"
          className={`px-2.5 py-1 rounded transition-colors focus-ring ${
            unit === u
              ? "bg-white text-ink-900 shadow-soft"
              : "text-ink-500 hover:text-ink-700"
          }`}
          onClick={() => onChange(u)}
        >
          {u}
        </button>
      ))}
    </div>
  );
}
