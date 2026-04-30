"use client";

import { Compass, RotateCcw, Maximize2, Undo2, Redo2, Sparkles } from "lucide-react";
import { useRoomStore } from "@/lib/store/useRoomStore";
import { polygonBounds } from "@/lib/geometry/polygon";
import { formatLength } from "@/lib/geometry/units";
import { optimizeLayout } from "@/lib/optimizer/optimize";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";

export default function AppBar() {
  const room = useRoomStore((s) => s.room);
  const items = useRoomStore((s) => s.items);
  const resetRoom = useRoomStore((s) => s.resetRoom);
  const undo = useRoomStore((s) => s.undo);
  const redo = useRoomStore((s) => s.redo);
  const pastLen = useRoomStore((s) => s.past.length);
  const futureLen = useRoomStore((s) => s.future.length);
  const openOptimizerPreview = useRoomStore((s) => s.openOptimizerPreview);
  const previewActive = useRoomStore((s) => s.optimizerPreview !== null);

  const furnitureCount = items.filter((i) => i.type === "furniture").length;
  const bounds = room ? polygonBounds(room.vertices) : null;

  const onOptimize = () => {
    if (!room) return;
    const layouts = optimizeLayout(items, room);
    if (layouts.length === 0) return;
    openOptimizerPreview(layouts);
  };

  return (
    <header className="h-14 shrink-0 flex items-center gap-4 px-4 bg-white border-b border-ink-100 z-20">
      <div className="flex items-center gap-2.5">
        <div className="grid place-items-center h-8 w-8 rounded-md bg-ink-900 text-paper-50 shadow-soft">
          <Compass size={17} strokeWidth={2} />
        </div>
        <div className="flex flex-col leading-tight">
          <h1 className="text-sm font-semibold text-ink-900 tracking-tight">
            Room Planner
          </h1>
          <span className="text-[11px] text-ink-500">
            Top-down layout sketcher
          </span>
        </div>
      </div>

      <div className="h-7 w-px bg-ink-100" />

      {bounds && (
        <div className="hidden sm:flex items-center gap-4 text-[12px] text-ink-600">
          <Stat icon={<Maximize2 size={13} />} label="Size">
            {formatLength(bounds.width, "cm")} ×{" "}
            {formatLength(bounds.height, "cm")}
          </Stat>
          <Stat label="Items">{items.length}</Stat>
        </div>
      )}

      <div className="ml-auto flex items-center gap-1">
        <div className="flex items-center gap-0.5 mr-1">
          <IconButton
            label="Undo (Ctrl+Z)"
            variant="ghost"
            size="sm"
            disabled={pastLen === 0}
            onClick={undo}
          >
            <Undo2 size={15} />
          </IconButton>
          <IconButton
            label="Redo (Ctrl+Shift+Z)"
            variant="ghost"
            size="sm"
            disabled={futureLen === 0}
            onClick={redo}
          >
            <Redo2 size={15} />
          </IconButton>
        </div>

        <span className="h-6 w-px bg-ink-100" />

        <Button
          variant="primary"
          size="sm"
          icon={<Sparkles size={14} />}
          onClick={onOptimize}
          disabled={furnitureCount === 0 || previewActive}
          title={
            furnitureCount === 0
              ? "Add furniture to optimize"
              : "Suggest furniture arrangements"
          }
        >
          Optimize layout
        </Button>

        <span className="h-6 w-px bg-ink-100" />

        <Button
          variant="ghost"
          size="sm"
          icon={<RotateCcw size={14} />}
          onClick={() => {
            if (
              confirm(
                "Start over? This will clear the room and all placed items.",
              )
            ) {
              resetRoom();
            }
          }}
        >
          New room
        </Button>
      </div>
    </header>
  );
}

function Stat({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {icon && <span className="text-ink-400">{icon}</span>}
      <span className="text-ink-400 uppercase text-[10px] tracking-wider font-medium">
        {label}
      </span>
      <span className="font-mono tabular-nums text-ink-800">{children}</span>
    </div>
  );
}
