"use client";

import { useMemo, useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import {
  ROOM_PRESETS,
  getRoomPreset,
  type RoomPresetId,
} from "@/lib/presets/rooms";
import { useRoomStore } from "@/lib/store/useRoomStore";
import { polygonBounds } from "@/lib/geometry/polygon";
import Field from "@/components/ui/Field";
import NumberInput from "@/components/ui/NumberInput";
import Button from "@/components/ui/Button";
import UnitToggle from "@/components/ui/UnitToggle";
import type { DisplayUnit } from "@/lib/geometry/units";

export default function PresetPicker() {
  const setRoom = useRoomStore((s) => s.setRoom);
  const [presetId, setPresetId] = useState<RoomPresetId>("rectangle");
  const [unit, setUnit] = useState<DisplayUnit>("cm");
  const preset = getRoomPreset(presetId);
  const [params, setParams] = useState<Record<string, number>>(() =>
    Object.fromEntries(preset.inputs.map((i) => [i.key, i.default])),
  );

  const onChangePreset = (id: RoomPresetId) => {
    const p = getRoomPreset(id);
    setPresetId(id);
    setParams(Object.fromEntries(p.inputs.map((i) => [i.key, i.default])));
  };

  const onCreate = () => {
    const vertices = preset.build(params);
    setRoom({ vertices });
  };

  const previewVertices = useMemo(
    () => preset.build(params),
    [preset, params],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink-900 tracking-tight">
            Pick a shape
          </h2>
          <p className="text-xs text-ink-500 mt-0.5">
            Choose a starting outline and tune its dimensions.
          </p>
        </div>
        <UnitToggle unit={unit} onChange={setUnit} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {ROOM_PRESETS.map((p) => {
          const sample = p.build(
            Object.fromEntries(p.inputs.map((i) => [i.key, i.default])),
          );
          const selected = presetId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onChangePreset(p.id)}
              className={`group relative aspect-square p-2 rounded-lg border transition-all focus-ring overflow-hidden ${
                selected
                  ? "border-ink-900 bg-paper-100 shadow-soft"
                  : "border-ink-100 bg-white hover:border-ink-300 hover:bg-paper-50"
              }`}
            >
              <ShapePreview vertices={sample} highlight={selected} />
              <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between">
                <span
                  className={`text-[11px] font-medium ${
                    selected ? "text-ink-900" : "text-ink-700"
                  }`}
                >
                  {p.label}
                </span>
                {selected && (
                  <span className="grid place-items-center h-4 w-4 rounded-full bg-ink-900 text-white">
                    <Check size={10} strokeWidth={3} />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-6 items-start">
        <div className="hidden md:block w-36 shrink-0">
          <div className="aspect-square bg-blueprint rounded-lg border border-ink-100 p-3">
            <ShapePreview vertices={previewVertices} highlight />
          </div>
          <div className="mt-2 text-center text-[10px] font-mono tabular-nums text-ink-500">
            {previewSize(previewVertices, unit)}
          </div>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-3">
          {preset.inputs.map((i) => (
            <Field key={i.key} label={i.label}>
              <NumberInput
                valueCm={params[i.key] ?? i.default}
                onChangeCm={(cm) => setParams((p) => ({ ...p, [i.key]: cm }))}
                unit={unit}
                min={10}
              />
            </Field>
          ))}
        </div>
      </div>

      <Button
        variant="primary"
        size="lg"
        onClick={onCreate}
        trailingIcon={<ArrowRight size={16} />}
        className="w-full"
      >
        Create room
      </Button>
    </div>
  );
}

function ShapePreview({
  vertices,
  highlight,
}: {
  vertices: { x: number; y: number }[];
  highlight?: boolean;
}) {
  const b = polygonBounds(vertices);
  const pad = 4;
  const target = 100;
  const scale = (target - pad * 2) / Math.max(b.width, b.height, 1);
  const w = b.width * scale + pad * 2;
  const h = b.height * scale + pad * 2;
  const points = vertices
    .map(
      (v) =>
        `${(v.x - b.minX) * scale + pad},${(v.y - b.minY) * scale + pad}`,
    )
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <polygon
        points={points}
        fill={highlight ? "#1b2638" : "#fffdf7"}
        fillOpacity={highlight ? 0.08 : 1}
        stroke={highlight ? "#1b2638" : "#3c5475"}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function previewSize(
  vertices: { x: number; y: number }[],
  unit: DisplayUnit,
): string {
  const b = polygonBounds(vertices);
  const fmt = (cm: number) =>
    unit === "m" ? `${(cm / 100).toFixed(2)} m` : `${Math.round(cm)} cm`;
  return `${fmt(b.width)} × ${fmt(b.height)}`;
}
