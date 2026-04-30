"use client";

import {
  ZoomIn,
  ZoomOut,
  Maximize,
  MousePointer2,
  Grid3X3,
  Magnet,
} from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import { useRoomStore } from "@/lib/store/useRoomStore";

type Props = {
  scale: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomFit?: () => void;
};

export default function StatusBar({
  scale,
  onZoomIn,
  onZoomOut,
  onZoomFit,
}: Props) {
  const gridVisible = useRoomStore((s) => s.gridVisible);
  const snapEnabled = useRoomStore((s) => s.snapEnabled);
  const toggleGrid = useRoomStore((s) => s.toggleGrid);
  const toggleSnap = useRoomStore((s) => s.toggleSnap);

  return (
    <footer className="h-9 shrink-0 flex items-center gap-3 px-3 bg-white border-t border-ink-100 text-[11px] text-ink-500">
      <div className="flex items-center gap-1.5">
        <MousePointer2 size={12} className="text-ink-400" />
        <span>
          <span className="text-ink-700 font-medium">Scroll</span> to zoom ·{" "}
          <span className="text-ink-700 font-medium">right-click drag</span> to
          pan ·{" "}
          <span className="text-ink-700 font-medium">Shift</span> to snap
          (5 cm / 15°)
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <ToggleChip
          label="Grid"
          icon={<Grid3X3 size={13} />}
          active={gridVisible}
          onToggle={toggleGrid}
          title={gridVisible ? "Hide grid" : "Show grid"}
        />
        <ToggleChip
          label="Snap"
          icon={<Magnet size={13} />}
          active={snapEnabled}
          onToggle={toggleSnap}
          title={snapEnabled ? "Disable auto-snap" : "Enable auto-snap"}
        />
        <span className="mx-1 h-4 w-px bg-ink-100" />
        <IconButton
          label="Zoom out"
          variant="ghost"
          size="sm"
          onClick={onZoomOut}
          disabled={!onZoomOut}
        >
          <ZoomOut size={14} />
        </IconButton>
        <button
          onClick={onZoomFit}
          className="h-7 px-2 rounded-md text-[11px] font-mono tabular-nums text-ink-700 hover:bg-paper-100 transition-colors focus-ring min-w-[52px]"
          title="Fit to view"
          disabled={!onZoomFit}
        >
          {Math.round(scale * 100)}%
        </button>
        <IconButton
          label="Zoom in"
          variant="ghost"
          size="sm"
          onClick={onZoomIn}
          disabled={!onZoomIn}
        >
          <ZoomIn size={14} />
        </IconButton>
        <span className="mx-1 h-4 w-px bg-ink-100" />
        <IconButton
          label="Fit to view"
          variant="ghost"
          size="sm"
          onClick={onZoomFit}
          disabled={!onZoomFit}
        >
          <Maximize size={14} />
        </IconButton>
      </div>
    </footer>
  );
}

function ToggleChip({
  label,
  icon,
  active,
  onToggle,
  title,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onToggle: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onToggle}
      title={title}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-[11px] font-medium transition-colors focus-ring ${
        active
          ? "bg-ink-900 text-white border border-ink-900"
          : "bg-white text-ink-700 border border-ink-200 hover:bg-paper-100 hover:border-ink-300"
      }`}
    >
      <span className={active ? "text-white" : "text-ink-500"}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
