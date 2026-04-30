"use client";

import { useState } from "react";
import {
  Trash2,
  Sofa,
  Bed,
  Armchair,
  Archive,
  Box,
  Boxes,
  Library,
  Table2,
  Disc,
  Square,
  Pencil,
  DoorOpen,
  AppWindow,
  Wind,
  Plug,
  Layers,
  RotateCw,
  Copy,
  Compass,
  type LucideIcon,
} from "lucide-react";
import { useRoomStore } from "@/lib/store/useRoomStore";
import { useSelectedItem } from "@/lib/store/selectors";
import {
  nearestWall,
  polygonBounds,
  wallsFromVertices,
} from "@/lib/geometry/polygon";
import { clamp, snapAngle, SNAP_ANGLE_DEG } from "@/lib/geometry/snapping";
import Field from "@/components/ui/Field";
import NumberInput from "@/components/ui/NumberInput";
import TextInput from "@/components/ui/TextInput";
import Button from "@/components/ui/Button";
import UnitToggle from "@/components/ui/UnitToggle";
import type { DisplayUnit } from "@/lib/geometry/units";
import type {
  FloorElement,
  Furniture,
  FurnitureKind,
  FloorElementKind,
  Item,
  Point,
  WallElement,
  WallElementKind,
} from "@/types/room";

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
const WALL_ICONS: Record<WallElementKind, LucideIcon> = {
  door: DoorOpen,
  window: AppWindow,
  "wall-vent": Wind,
  outlet: Plug,
};
const FLOOR_ICONS: Record<FloorElementKind, LucideIcon> = {
  "floor-vent": Wind,
  carpet: Layers,
  "circle-carpet": Disc,
};

function iconFor(item: Item): LucideIcon {
  if (item.type === "furniture") return FURNITURE_ICONS[item.kind] ?? Square;
  if (item.type === "wall-element") return WALL_ICONS[item.kind] ?? DoorOpen;
  return FLOOR_ICONS[item.kind] ?? Plug;
}

function categoryLabel(item: Item): string {
  if (item.type === "furniture") return "Furniture";
  if (item.type === "wall-element") return "Wall element";
  return "Floor element";
}

export default function PropertiesPanel() {
  const item = useSelectedItem();
  const removeItem = useRoomStore((s) => s.removeItem);
  const updateItem = useRoomStore((s) => s.updateItem);
  const addFurniture = useRoomStore((s) => s.addFurniture);
  const addFloorElement = useRoomStore((s) => s.addFloorElement);
  const addWallElement = useRoomStore((s) => s.addWallElement);
  const room = useRoomStore((s) => s.room);
  const [unit, setUnit] = useState<DisplayUnit>("cm");

  const onDuplicate = () => {
    if (!item) return;
    if (item.type === "furniture") {
      addFurniture({
        kind: item.kind,
        label: item.label,
        x: item.x + 20,
        y: item.y + 20,
        width: item.width,
        height: item.height,
        rotation: item.rotation,
      });
    } else if (item.type === "floor-element") {
      addFloorElement({
        kind: item.kind,
        label: item.label,
        x: item.x + 20,
        y: item.y + 20,
        width: item.width,
        height: item.height,
        rotation: item.rotation,
      });
    } else {
      addWallElement({
        kind: item.kind,
        label: item.label,
        wallIndex: item.wallIndex,
        offsetAlongWall: item.offsetAlongWall,
        width: item.width,
        thickness: item.thickness,
        hinge: item.hinge,
        swing: item.swing,
      });
    }
  };

  if (!item) {
    return <RoomPanel unit={unit} onUnitChange={setUnit} />;
  }

  const Icon = iconFor(item);

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-4 border-b border-ink-100">
        <div className="flex items-start gap-3">
          <div className="grid place-items-center h-10 w-10 rounded-md bg-paper-100 text-ink-700 shrink-0">
            <Icon size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
              {categoryLabel(item)}
            </div>
            <h3 className="text-base font-semibold text-ink-900 truncate">
              {item.label || "Untitled"}
            </h3>
            <div className="text-[11px] text-ink-500 capitalize mt-0.5">
              {item.type === "wall-element" || item.type === "floor-element"
                ? item.kind.replace("-", " ")
                : item.kind}
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
          Properties
        </span>
        <UnitToggle unit={unit} onChange={setUnit} />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 pb-5 space-y-4">
        <Field label="Label">
          <TextInput
            type="text"
            value={item.label}
            onChange={(e) =>
              updateItem(item.id, { label: e.target.value })
            }
          />
        </Field>

        {item.type === "furniture" && (
          <FurnitureFields item={item} unit={unit} />
        )}
        {item.type === "floor-element" && (
          <FloorFields item={item} unit={unit} />
        )}
        {item.type === "wall-element" && room && (
          <WallFields item={item} unit={unit} />
        )}
      </div>

      <div className="px-5 py-4 border-t border-ink-100 bg-paper-50 flex gap-2">
        <Button
          variant="secondary"
          icon={<Copy size={14} />}
          className="flex-1"
          onClick={onDuplicate}
        >
          Duplicate
        </Button>
        <Button
          variant="danger"
          icon={<Trash2 size={14} />}
          className="flex-1"
          onClick={() => removeItem(item.id)}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

function FurnitureFields({
  item,
  unit,
}: {
  item: Furniture;
  unit: DisplayUnit;
}) {
  const updateItem = useRoomStore((s) => s.updateItem);
  const room = useRoomStore((s) => s.room);

  const centerInRoom = () => {
    if (!room) return;
    const b = polygonBounds(room.vertices);
    updateItem(item.id, {
      x: (b.minX + b.maxX) / 2,
      y: (b.minY + b.maxY) / 2,
    });
  };

  return (
    <div className="space-y-4">
      <FieldGroup label="Position">
        <div className="grid grid-cols-2 gap-2">
          <Field label="X (center)">
            <NumberInput
              valueCm={item.x}
              onChangeCm={(cm) => updateItem(item.id, { x: cm })}
              unit={unit}
            />
          </Field>
          <Field label="Y (center)">
            <NumberInput
              valueCm={item.y}
              onChangeCm={(cm) => updateItem(item.id, { y: cm })}
              unit={unit}
            />
          </Field>
        </div>
        {room && (
          <button
            onClick={centerInRoom}
            className="w-full h-7 rounded-md border border-ink-100 bg-white text-[11px] font-medium text-ink-700 hover:bg-paper-100 hover:border-ink-200 transition-colors focus-ring"
          >
            Center in room
          </button>
        )}
      </FieldGroup>

      <FieldGroup label="Size">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Width">
            <NumberInput
              valueCm={item.width}
              onChangeCm={(cm) => updateItem(item.id, { width: cm })}
              unit={unit}
              min={5}
            />
          </Field>
          <Field label="Height">
            <NumberInput
              valueCm={item.height}
              onChangeCm={(cm) => updateItem(item.id, { height: cm })}
              unit={unit}
              min={5}
            />
          </Field>
        </div>
      </FieldGroup>

      <RotationField
        value={item.rotation}
        onChange={(deg) => updateItem(item.id, { rotation: deg })}
      />
    </div>
  );
}

function FloorFields({
  item,
  unit,
}: {
  item: FloorElement;
  unit: DisplayUnit;
}) {
  const updateItem = useRoomStore((s) => s.updateItem);
  const room = useRoomStore((s) => s.room);
  const walls = room ? wallsFromVertices(room.vertices) : [];
  const near = walls.length
    ? nearestWall({ x: item.x, y: item.y }, walls)
    : null;

  const centerInRoom = () => {
    if (!room) return;
    const b = polygonBounds(room.vertices);
    updateItem(item.id, {
      x: (b.minX + b.maxX) / 2,
      y: (b.minY + b.maxY) / 2,
    });
  };

  const setDistanceFromWall = (cm: number) => {
    if (!near) return;
    // Push along the wall's inward normal (perpendicular). When the item is
    // already on the wall, the displacement vector is zero, so derive direction
    // from the wall's own normal pointing toward the room interior.
    let ux = item.x - near.point.x;
    let uy = item.y - near.point.y;
    const len = Math.hypot(ux, uy);
    if (len < 0.5) {
      // Wall normal: rotate (b-a) by 90°. Pick the side that points into the
      // polygon by sampling 1cm offsets and keeping the one closer to bounds
      // center (a robust enough heuristic for the supported preset shapes).
      const w = near.wall;
      const wx = w.b.x - w.a.x;
      const wy = w.b.y - w.a.y;
      const wl = Math.hypot(wx, wy) || 1;
      const nx = -wy / wl;
      const ny = wx / wl;
      const b = polygonBounds(room ? room.vertices : []);
      const cxr = (b.minX + b.maxX) / 2;
      const cyr = (b.minY + b.maxY) / 2;
      const sign =
        (cxr - near.point.x) * nx + (cyr - near.point.y) * ny >= 0 ? 1 : -1;
      ux = nx * sign;
      uy = ny * sign;
    } else {
      ux /= len;
      uy /= len;
    }
    const d = Math.max(0, cm);
    updateItem(item.id, {
      x: near.point.x + ux * d,
      y: near.point.y + uy * d,
    });
  };

  return (
    <div className="space-y-4">
      <FieldGroup label="Position">
        <div className="grid grid-cols-2 gap-2">
          <Field label="X (center)">
            <NumberInput
              valueCm={item.x}
              onChangeCm={(cm) => updateItem(item.id, { x: cm })}
              unit={unit}
            />
          </Field>
          <Field label="Y (center)">
            <NumberInput
              valueCm={item.y}
              onChangeCm={(cm) => updateItem(item.id, { y: cm })}
              unit={unit}
            />
          </Field>
        </div>
        {room && (
          <button
            onClick={centerInRoom}
            className="w-full h-7 rounded-md border border-ink-100 bg-white text-[11px] font-medium text-ink-700 hover:bg-paper-100 hover:border-ink-200 transition-colors focus-ring"
          >
            Center in room
          </button>
        )}
      </FieldGroup>

      <FieldGroup label="Size">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Width">
            <NumberInput
              valueCm={item.width}
              onChangeCm={(cm) => updateItem(item.id, { width: cm })}
              unit={unit}
              min={2}
            />
          </Field>
          <Field label="Height">
            <NumberInput
              valueCm={item.height}
              onChangeCm={(cm) => updateItem(item.id, { height: cm })}
              unit={unit}
              min={2}
            />
          </Field>
        </div>
      </FieldGroup>

      <RotationField
        value={item.rotation}
        onChange={(deg) => updateItem(item.id, { rotation: deg })}
      />

      {near && (
        <FieldGroup label="Wall offset">
          <Field
            label={`Distance to wall ${near.wall.index + 1}`}
            hint="Perpendicular distance from the nearest wall to the item center."
          >
            <NumberInput
              valueCm={Math.max(0, near.dist)}
              onChangeCm={setDistanceFromWall}
              unit={unit}
              min={0}
            />
          </Field>
        </FieldGroup>
      )}
    </div>
  );
}

function WallFields({
  item,
  unit,
}: {
  item: WallElement;
  unit: DisplayUnit;
}) {
  const updateItem = useRoomStore((s) => s.updateItem);
  const room = useRoomStore((s) => s.room)!;
  const walls = wallsFromVertices(room.vertices);
  const wall = walls[item.wallIndex];
  if (!wall) return null;

  return (
    <div className="space-y-4">
      <FieldGroup label="Placement">
        <Field label="On wall">
          <select
            value={item.wallIndex}
            onChange={(e) => {
              const idx = Number(e.target.value);
              const newWall = walls[idx];
              updateItem(item.id, {
                wallIndex: idx,
                offsetAlongWall: clamp(
                  item.offsetAlongWall,
                  0,
                  Math.max(0, newWall.length - item.width),
                ),
              } as Partial<WallElement>);
            }}
            className="h-9 px-2.5 rounded-md border border-ink-200 bg-white text-sm text-ink-900 outline-none transition-colors hover:border-ink-300 focus:border-ink-500 focus:ring-2 focus:ring-ink-500/30"
          >
            {walls.map((w) => (
              <option key={w.index} value={w.index}>
                Wall {w.index + 1} ({Math.round(w.length)} cm)
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Offset along wall"
          hint="Distance from the wall start to the element start."
        >
          <NumberInput
            valueCm={item.offsetAlongWall}
            onChangeCm={(cm) =>
              updateItem(item.id, {
                offsetAlongWall: clamp(
                  cm,
                  0,
                  Math.max(0, wall.length - item.width),
                ),
              } as Partial<WallElement>)
            }
            unit={unit}
            min={0}
            max={Math.max(0, wall.length - item.width)}
          />
        </Field>
      </FieldGroup>

      <FieldGroup label="Size">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Width">
            <NumberInput
              valueCm={item.width}
              onChangeCm={(cm) => {
                const w = Math.min(cm, wall.length);
                updateItem(item.id, {
                  width: w,
                  offsetAlongWall: clamp(
                    item.offsetAlongWall,
                    0,
                    wall.length - w,
                  ),
                } as Partial<WallElement>);
              }}
              unit={unit}
              min={5}
              max={wall.length}
            />
          </Field>
          <Field label="Thickness">
            <NumberInput
              valueCm={item.thickness}
              onChangeCm={(cm) =>
                updateItem(item.id, {
                  thickness: cm,
                } as Partial<WallElement>)
              }
              unit={unit}
              min={2}
            />
          </Field>
        </div>
      </FieldGroup>

      {item.kind === "door" && (
        <FieldGroup label="Door swing">
          <Field label="Hinge side">
            <SegmentedToggle
              value={item.hinge ?? "left"}
              options={[
                { value: "left", label: "Left" },
                { value: "right", label: "Right" },
              ]}
              onChange={(v) =>
                updateItem(item.id, { hinge: v } as Partial<WallElement>)
              }
            />
          </Field>
          <Field label="Swing direction">
            <SegmentedToggle
              value={item.swing ?? "in"}
              options={[
                { value: "in", label: "Opens in" },
                { value: "out", label: "Opens out" },
              ]}
              onChange={(v) =>
                updateItem(item.id, { swing: v } as Partial<WallElement>)
              }
            />
          </Field>
        </FieldGroup>
      )}
    </div>
  );
}

function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex w-full rounded-md border border-ink-200 bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 h-7 px-2 rounded text-[12px] font-medium transition-colors focus-ring ${
            value === o.value
              ? "bg-ink-900 text-white"
              : "text-ink-700 hover:bg-paper-100"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function RotationField({
  value,
  onChange,
}: {
  value: number;
  onChange: (deg: number) => void;
}) {
  const norm = (deg: number) => ((deg % 360) + 360) % 360;
  return (
    <FieldGroup label="Rotation">
      <Field label="Angle (°)">
        <div className="flex items-stretch h-9 rounded-md border border-ink-200 bg-white overflow-hidden transition-colors focus-within:border-ink-500 focus-within:ring-2 focus-within:ring-ink-500/30 hover:border-ink-300">
          <input
            type="number"
            value={Math.round(value)}
            step={1}
            onChange={(e) => onChange(norm(Number(e.target.value) || 0))}
            className="px-2.5 text-sm w-full font-mono tabular-nums text-ink-900 bg-transparent outline-none"
          />
          <span className="px-2 text-[11px] flex items-center bg-paper-100 text-ink-500 border-l border-ink-200 font-medium">
            °
          </span>
        </div>
      </Field>
      <div className="flex gap-1.5">
        {[-90, -15, 15, 90].map((d) => (
          <button
            key={d}
            onClick={() => onChange(norm(value + d))}
            className="flex-1 h-7 px-1 rounded-md border border-ink-100 bg-white text-[11px] font-medium text-ink-700 hover:bg-paper-100 hover:border-ink-200 transition-colors focus-ring inline-flex items-center justify-center gap-1"
          >
            <RotateCw
              size={11}
              className={d < 0 ? "-scale-x-100" : ""}
            />
            {d > 0 ? `+${d}°` : `${d}°`}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={() => onChange(0)}
          className="flex-1 h-7 px-1 rounded-md border border-ink-100 bg-white text-[11px] font-medium text-ink-700 hover:bg-paper-100 hover:border-ink-200 transition-colors focus-ring"
        >
          Reset to 0°
        </button>
        <button
          onClick={() => onChange(norm(snapAngle(value, SNAP_ANGLE_DEG)))}
          className="flex-1 h-7 px-1 rounded-md border border-ink-100 bg-white text-[11px] font-medium text-ink-700 hover:bg-paper-100 hover:border-ink-200 transition-colors focus-ring"
        >
          Snap to {SNAP_ANGLE_DEG}°
        </button>
      </div>
    </FieldGroup>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 px-0.5">
        {label}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function RoomPanel({
  unit,
  onUnitChange,
}: {
  unit: DisplayUnit;
  onUnitChange: (u: DisplayUnit) => void;
}) {
  const room = useRoomStore((s) => s.room);
  const setWallLength = useRoomStore((s) => s.setWallLength);
  if (!room) return null;

  const walls = wallsFromVertices(room.vertices);
  const bounds = polygonBounds(room.vertices);

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-4 border-b border-ink-100">
        <div className="flex items-start gap-3">
          <div className="grid place-items-center h-10 w-10 rounded-md bg-paper-100 text-ink-700 shrink-0">
            <Compass size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
              Room
            </div>
            <h3 className="text-base font-semibold text-ink-900 truncate">
              Floor plan
            </h3>
            <div className="text-[11px] text-ink-500 mt-0.5 font-mono tabular-nums">
              {fmtBounds(bounds.width, bounds.height, unit)}
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
          Walls
        </span>
        <UnitToggle unit={unit} onChange={onUnitChange} />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 pb-5 space-y-4">
        <p className="text-[11px] text-ink-500 leading-relaxed">
          Edit a wall&rsquo;s length below. Parallel walls on the same rail
          resize together so the room stays square.
        </p>
        <div className="rounded-lg border border-ink-100 bg-paper-50 p-2">
          <RoomThumbnail vertices={room.vertices} />
        </div>
        <div className="space-y-2">
          {walls.map((w) => (
            <WallLengthRow
              key={w.index}
              index={w.index}
              length={w.length}
              unit={unit}
              onChange={(cm) => setWallLength(w.index, cm)}
            />
          ))}
        </div>
        <p className="text-[11px] text-ink-400 leading-relaxed pt-1">
          Tip: click any item on the canvas to edit it instead.
        </p>
      </div>
    </div>
  );
}

function WallLengthRow({
  index,
  length,
  unit,
  onChange,
}: {
  index: number;
  length: number;
  unit: DisplayUnit;
  onChange: (cm: number) => void;
}) {
  return (
    <div className="grid grid-cols-[44px_1fr] gap-2 items-center">
      <span className="text-[11px] font-mono tabular-nums text-ink-500 px-1">
        #{index + 1}
      </span>
      <NumberInput
        valueCm={length}
        onChangeCm={onChange}
        unit={unit}
        min={10}
      />
    </div>
  );
}

function RoomThumbnail({ vertices }: { vertices: Point[] }) {
  const b = polygonBounds(vertices);
  const pad = 6;
  const target = 120;
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
      className="w-full h-24"
      preserveAspectRatio="xMidYMid meet"
    >
      <polygon
        points={points}
        fill="#1b2638"
        fillOpacity={0.06}
        stroke="#1b2638"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function fmtBounds(widthCm: number, heightCm: number, unit: DisplayUnit) {
  const fmt = (cm: number) =>
    unit === "m" ? `${(cm / 100).toFixed(2)} m` : `${Math.round(cm)} cm`;
  return `${fmt(widthCm)} × ${fmt(heightCm)}`;
}
