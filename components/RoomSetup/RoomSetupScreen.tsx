"use client";

import { useState } from "react";
import { Compass, LayoutTemplate, PencilRuler } from "lucide-react";
import PresetPicker from "./PresetPicker";
import PolygonDrawer from "./PolygonDrawer";

type Mode = "preset" | "custom";

export default function RoomSetupScreen() {
  const [mode, setMode] = useState<Mode>("preset");

  return (
    <div className="relative h-full w-full overflow-y-auto bg-paper-50 scrollbar-thin">
      <div className="absolute inset-0 bg-blueprint opacity-50 pointer-events-none" />
      <div className="relative min-h-full flex items-center justify-center p-6">
        <div className="w-full max-w-3xl">
          <header className="mb-8 flex flex-col items-center text-center">
            <div className="grid place-items-center h-12 w-12 rounded-xl bg-ink-900 text-paper-50 shadow-card mb-4">
              <Compass size={22} strokeWidth={2} />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-ink-900">
              Plan your room
            </h1>
            <p className="mt-2 text-sm text-ink-600 max-w-md">
              Sketch a top-down floor plan, place furniture, and check that
              everything fits — to the centimeter.
            </p>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <ModeCard
              title="Use a preset"
              description="Rectangle, L, T, or U shape — set width and depth."
              icon={<LayoutTemplate size={20} />}
              selected={mode === "preset"}
              onClick={() => setMode("preset")}
            />
            <ModeCard
              title="Draw custom"
              description="Click to place each corner. Snaps to 15° increments."
              icon={<PencilRuler size={20} />}
              selected={mode === "custom"}
              onClick={() => setMode("custom")}
            />
          </div>

          <div className="bg-white border border-ink-100 rounded-xl shadow-card p-6 animate-fade-in">
            {mode === "preset" ? <PresetPicker /> : <PolygonDrawer />}
          </div>

          <p className="mt-6 text-center text-[11px] text-ink-400">
            All dimensions stored in centimeters. Switch units anytime.
          </p>
        </div>
      </div>
    </div>
  );
}

function ModeCard({
  title,
  description,
  icon,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative text-left p-5 rounded-xl border transition-all focus-ring ${
        selected
          ? "border-ink-900 bg-ink-900 text-white shadow-card"
          : "border-ink-100 bg-white text-ink-800 hover:border-ink-300 hover:shadow-soft"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`grid place-items-center h-10 w-10 rounded-lg shrink-0 transition-colors ${
            selected
              ? "bg-white/10 text-white"
              : "bg-paper-100 text-ink-700 group-hover:bg-paper-200"
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-base font-semibold tracking-tight">{title}</div>
          <div
            className={`mt-0.5 text-xs leading-relaxed ${
              selected ? "text-white/70" : "text-ink-500"
            }`}
          >
            {description}
          </div>
        </div>
      </div>
    </button>
  );
}
