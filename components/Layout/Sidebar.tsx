"use client";

import { useState } from "react";
import {
  Sofa,
  Bed,
  Armchair,
  Archive,
  Box,
  Square,
  DoorOpen,
  AppWindow,
  Wind,
  Plug,
  Pencil,
  Layers,
  ChevronDown,
  Plus,
  Library,
  Boxes,
  Disc,
  Table2,
  type LucideIcon,
} from "lucide-react";
import { useRoomStore } from "@/lib/store/useRoomStore";
import { polygonBounds, wallsFromVertices } from "@/lib/geometry/polygon";
import { FURNITURE_PRESETS, BED_SIZES } from "@/lib/presets/furniture";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import NumberInput from "@/components/ui/NumberInput";
import TextInput from "@/components/ui/TextInput";
import UnitToggle from "@/components/ui/UnitToggle";
import type {
  FloorElementKind,
  FurnitureKind,
  WallElementKind,
} from "@/types/room";
import type { DisplayUnit } from "@/lib/geometry/units";

const FURNITURE_ICONS: Record<FurnitureKind, LucideIcon> = {
  bed: Bed,
  desk: Pencil,
  "l-desk": Table2,
  chair: Armchair,
  sofa: Sofa,
  dresser: Archive,
  cabinet: Boxes,
  bookshelf: Library,
  nightstand: Box,
  custom: Square,
};

const WALL_DEFAULTS: Record<
  WallElementKind,
  { label: string; width: number; thickness: number; icon: LucideIcon }
> = {
  door: { label: "Door", width: 90, thickness: 10, icon: DoorOpen },
  window: { label: "Window", width: 120, thickness: 10, icon: AppWindow },
  "wall-vent": { label: "Wall vent", width: 30, thickness: 8, icon: Wind },
  outlet: { label: "Outlet", width: 12, thickness: 4, icon: Plug },
};

const FLOOR_DEFAULTS: Record<
  FloorElementKind,
  { label: string; width: number; height: number; icon: LucideIcon }
> = {
  "floor-vent": { label: "Floor vent", width: 30, height: 15, icon: Wind },
  carpet: { label: "Carpet", width: 200, height: 150, icon: Layers },
  "circle-carpet": {
    label: "Round carpet",
    width: 180,
    height: 180,
    icon: Disc,
  },
};

export default function Sidebar() {
  const room = useRoomStore((s) => s.room);
  const addFurniture = useRoomStore((s) => s.addFurniture);
  const addWallElement = useRoomStore((s) => s.addWallElement);
  const addFloorElement = useRoomStore((s) => s.addFloorElement);

  const [open, setOpen] = useState<Record<string, boolean>>({
    furniture: true,
    walls: true,
    floor: true,
    custom: false,
  });
  const toggle = (key: string) =>
    setOpen((o) => ({ ...o, [key]: !o[key] }));

  if (!room) return null;
  const b = polygonBounds(room.vertices);
  const center = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };

  const onAddFurniture = (
    kind: FurnitureKind,
    label: string,
    width: number,
    height: number,
  ) => {
    addFurniture({
      kind,
      label,
      x: center.x,
      y: center.y,
      width,
      height,
      rotation: 0,
    });
  };

  const onAddWallEl = (kind: WallElementKind) => {
    const walls = wallsFromVertices(room.vertices);
    if (!walls.length) return;
    const w = walls[0];
    const def = WALL_DEFAULTS[kind];
    const width = Math.min(def.width, w.length * 0.8);
    addWallElement({
      kind,
      wallIndex: 0,
      offsetAlongWall: Math.max(0, (w.length - width) / 2),
      width,
      thickness: def.thickness,
      label: def.label,
    });
  };

  const onAddFloorEl = (kind: FloorElementKind) => {
    const def = FLOOR_DEFAULTS[kind];
    addFloorElement({
      kind,
      x: center.x,
      y: center.y,
      width: def.width,
      height: def.height,
      rotation: 0,
      label: def.label,
    });
  };

  return (
    <aside className="w-72 shrink-0 bg-white border-r border-ink-100 flex flex-col overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
          Library
        </h2>
        <p className="mt-0.5 text-xs text-ink-500">
          Click to add an item to the center of the room.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-4 space-y-1">
        <Section
          title="Furniture"
          icon={Sofa}
          open={open.furniture}
          onToggle={() => toggle("furniture")}
          count={FURNITURE_PRESETS.length}
        >
          <div className="grid grid-cols-2 gap-1.5 px-2 pb-2">
            {FURNITURE_PRESETS.map((p) => {
              const Icon = FURNITURE_ICONS[p.kind] ?? Square;
              if (p.kind === "bed") {
                return (
                  <BedPickerCard
                    key={p.kind}
                    icon={<Icon size={16} />}
                    swatch={p.color}
                    onPick={(label, w, h) =>
                      onAddFurniture("bed", label, w, h)
                    }
                  />
                );
              }
              return (
                <ToolCard
                  key={p.kind}
                  label={p.label}
                  hint={`${p.width} × ${p.height} cm`}
                  icon={<Icon size={16} />}
                  swatch={p.color}
                  onClick={() =>
                    onAddFurniture(p.kind, p.label, p.width, p.height)
                  }
                />
              );
            })}
          </div>
        </Section>

        <Section
          title="Wall elements"
          icon={DoorOpen}
          open={open.walls}
          onToggle={() => toggle("walls")}
          count={Object.keys(WALL_DEFAULTS).length}
        >
          <div className="grid grid-cols-1 gap-1 px-2 pb-2">
            {(Object.keys(WALL_DEFAULTS) as WallElementKind[]).map((k) => {
              const def = WALL_DEFAULTS[k];
              const Icon = def.icon;
              return (
                <ToolRow
                  key={k}
                  label={def.label}
                  hint={`${def.width} × ${def.thickness} cm`}
                  icon={<Icon size={16} />}
                  onClick={() => onAddWallEl(k)}
                />
              );
            })}
          </div>
        </Section>

        <Section
          title="Floor elements"
          icon={Plug}
          open={open.floor}
          onToggle={() => toggle("floor")}
          count={Object.keys(FLOOR_DEFAULTS).length}
        >
          <div className="grid grid-cols-1 gap-1 px-2 pb-2">
            {(Object.keys(FLOOR_DEFAULTS) as FloorElementKind[]).map((k) => {
              const def = FLOOR_DEFAULTS[k];
              const Icon = def.icon;
              return (
                <ToolRow
                  key={k}
                  label={def.label}
                  hint={`${def.width} × ${def.height} cm`}
                  icon={<Icon size={16} />}
                  onClick={() => onAddFloorEl(k)}
                />
              );
            })}
          </div>
        </Section>

        <Section
          title="Custom furniture"
          icon={Square}
          open={open.custom}
          onToggle={() => toggle("custom")}
        >
          <CustomFurnitureForm
            onAdd={(label, width, height) =>
              onAddFurniture("custom", label, width, height)
            }
          />
        </Section>
      </div>
    </aside>
  );
}

function Section({
  title,
  icon: Icon,
  open,
  onToggle,
  count,
  children,
}: {
  title: string;
  icon: LucideIcon;
  open: boolean;
  onToggle: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-2 py-2 text-left rounded-md hover:bg-paper-100 transition-colors focus-ring"
      >
        <Icon size={15} className="text-ink-500" />
        <span className="text-xs font-semibold tracking-tight text-ink-800 flex-1">
          {title}
        </span>
        {count !== undefined && (
          <span className="text-[10px] font-mono text-ink-400 tabular-nums">
            {count}
          </span>
        )}
        <ChevronDown
          size={14}
          className={`text-ink-400 transition-transform ${
            open ? "rotate-0" : "-rotate-90"
          }`}
        />
      </button>
      {open && <div className="animate-fade-in">{children}</div>}
    </div>
  );
}

function ToolCard({
  label,
  hint,
  icon,
  swatch,
  onClick,
}: {
  label: string;
  hint: string;
  icon: React.ReactNode;
  swatch?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-start gap-1.5 p-2.5 rounded-md border border-ink-100 bg-white hover:border-ink-300 hover:shadow-soft transition-all text-left focus-ring active:scale-[0.98]"
    >
      <div className="flex items-center gap-1.5 w-full">
        <div
          className="grid place-items-center h-7 w-7 rounded-md text-ink-700 transition-colors group-hover:text-ink-900"
          style={{ backgroundColor: swatch ?? "#ece6d4" }}
        >
          {icon}
        </div>
        <Plus
          size={13}
          className="ml-auto text-ink-300 group-hover:text-ink-600 transition-colors"
        />
      </div>
      <div>
        <div className="text-[13px] font-medium text-ink-900 leading-tight">
          {label}
        </div>
        <div className="text-[11px] font-mono tabular-nums text-ink-500 mt-0.5">
          {hint}
        </div>
      </div>
    </button>
  );
}

function ToolRow({
  label,
  hint,
  icon,
  onClick,
}: {
  label: string;
  hint: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-paper-100 transition-colors text-left focus-ring"
    >
      <div className="grid place-items-center h-7 w-7 rounded-md bg-paper-100 text-ink-700 group-hover:bg-white group-hover:text-ink-900 group-hover:shadow-soft transition-all">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-ink-900 leading-tight">
          {label}
        </div>
        <div className="text-[11px] font-mono tabular-nums text-ink-500 mt-0.5">
          {hint}
        </div>
      </div>
      <Plus
        size={14}
        className="text-ink-300 group-hover:text-ink-600 transition-colors"
      />
    </button>
  );
}

function BedPickerCard({
  icon,
  swatch,
  onPick,
}: {
  icon: React.ReactNode;
  swatch?: string;
  onPick: (label: string, width: number, height: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [unit, setUnit] = useState<DisplayUnit>("cm");
  const [customW, setCustomW] = useState(152);
  const [customH, setCustomH] = useState(203);

  return (
    <div className="relative col-span-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="group w-full flex items-center gap-2.5 p-2.5 rounded-md border border-ink-100 bg-white hover:border-ink-300 hover:shadow-soft transition-all text-left focus-ring active:scale-[0.99]"
      >
        <div
          className="grid place-items-center h-7 w-7 rounded-md text-ink-700"
          style={{ backgroundColor: swatch ?? "#ece6d4" }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-ink-900 leading-tight">
            Bed
          </div>
          <div className="text-[11px] font-mono tabular-nums text-ink-500 mt-0.5">
            Pick a size
          </div>
        </div>
        <ChevronDown
          size={14}
          className={`text-ink-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="mt-1.5 rounded-md border border-ink-100 bg-white shadow-soft p-1.5 space-y-0.5 animate-fade-in">
          {BED_SIZES.filter((s) => s.id !== "custom").map((s) => (
            <button
              key={s.id}
              onClick={() => {
                onPick(s.label, s.width, s.height);
                setOpen(false);
              }}
              className="w-full flex items-baseline justify-between gap-2 px-2 py-1.5 rounded hover:bg-paper-100 transition-colors text-left focus-ring"
            >
              <span className="text-[12.5px] text-ink-900">{s.label}</span>
              <span className="text-[11px] font-mono tabular-nums text-ink-500">
                {s.width} × {s.height} cm
              </span>
            </button>
          ))}
          <div className="my-1 h-px bg-ink-100" />
          <div className="px-2 py-1.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-ink-800">
                Custom
              </span>
              <UnitToggle unit={unit} onChange={setUnit} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Width">
                <NumberInput
                  valueCm={customW}
                  onChangeCm={setCustomW}
                  unit={unit}
                  min={60}
                />
              </Field>
              <Field label="Length">
                <NumberInput
                  valueCm={customH}
                  onChangeCm={setCustomH}
                  unit={unit}
                  min={60}
                />
              </Field>
            </div>
            <Button
              variant="accent"
              size="sm"
              icon={<Plus size={14} />}
              className="w-full"
              onClick={() => {
                onPick("Bed (custom)", customW, customH);
                setOpen(false);
              }}
            >
              Add custom bed
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomFurnitureForm({
  onAdd,
}: {
  onAdd: (label: string, width: number, height: number) => void;
}) {
  const [unit, setUnit] = useState<DisplayUnit>("cm");
  const [label, setLabel] = useState("Custom");
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(60);

  return (
    <div className="px-2 pb-3 space-y-3">
      <div className="flex items-center justify-end">
        <UnitToggle unit={unit} onChange={setUnit} />
      </div>
      <Field label="Label">
        <TextInput
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Custom item"
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Width">
          <NumberInput
            valueCm={width}
            onChangeCm={setWidth}
            unit={unit}
            min={5}
          />
        </Field>
        <Field label="Height">
          <NumberInput
            valueCm={height}
            onChangeCm={setHeight}
            unit={unit}
            min={5}
          />
        </Field>
      </div>
      <Button
        variant="accent"
        size="sm"
        icon={<Plus size={14} />}
        className="w-full"
        onClick={() => onAdd(label || "Custom", width, height)}
      >
        Add to room
      </Button>
    </div>
  );
}
