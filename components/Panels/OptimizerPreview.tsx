"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { useRoomStore } from "@/lib/store/useRoomStore";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import OptimizerReasons from "./OptimizerReasons";

export default function OptimizerPreview() {
  const preview = useRoomStore((s) => s.optimizerPreview);
  const setActiveLayout = useRoomStore((s) => s.setActiveLayout);
  const closeOptimizerPreview = useRoomStore((s) => s.closeOptimizerPreview);
  const applyLayout = useRoomStore((s) => s.applyLayout);
  const [reasonsOpen, setReasonsOpen] = useState(false);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (reasonsOpen) {
          setReasonsOpen(false);
          return;
        }
        closeOptimizerPreview();
      }
      if (e.key === "ArrowLeft") {
        setActiveLayout(preview.activeIndex - 1);
      }
      if (e.key === "ArrowRight") {
        setActiveLayout(preview.activeIndex + 1);
      }
      if (e.key === "Enter") {
        applyLayout(preview.layouts[preview.activeIndex]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview, reasonsOpen, setActiveLayout, closeOptimizerPreview, applyLayout]);

  if (!preview) return null;
  const { layouts, activeIndex } = preview;
  const layout = layouts[activeIndex];
  if (!layout) return null;

  return (
    <>
      {/* Top center stepper */}
      <div className="pointer-events-none absolute top-3 left-0 right-0 z-30 flex justify-center">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 bg-white border border-ink-200 rounded-full shadow-card px-2 py-1.5">
          <div className="grid place-items-center h-7 w-7 rounded-full bg-ink-900 text-paper-50">
            <Sparkles size={14} />
          </div>
          <IconButton
            label="Previous layout"
            variant="ghost"
            size="sm"
            disabled={activeIndex === 0}
            onClick={() => setActiveLayout(activeIndex - 1)}
          >
            <ChevronLeft size={15} />
          </IconButton>
          <div className="px-2 text-[12px] flex items-center gap-2 min-w-[180px] justify-center">
            <span className="font-medium text-ink-900">{layout.name}</span>
            <span className="font-mono tabular-nums text-ink-400">
              {activeIndex + 1} / {layouts.length}
            </span>
          </div>
          <IconButton
            label="Next layout"
            variant="ghost"
            size="sm"
            disabled={activeIndex === layouts.length - 1}
            onClick={() => setActiveLayout(activeIndex + 1)}
          >
            <ChevronRight size={15} />
          </IconButton>
          <span className="mx-1 h-5 w-px bg-ink-100" />
          <IconButton
            label="Why this layout?"
            variant="ghost"
            size="sm"
            onClick={() => setReasonsOpen(true)}
          >
            <HelpCircle size={15} />
          </IconButton>
        </div>
      </div>

      {/* Bottom-right Apply / Cancel */}
      <div className="pointer-events-none absolute bottom-12 right-4 z-30 flex flex-col items-end gap-2">
        <div className="pointer-events-auto bg-white border border-ink-200 rounded-md shadow-card px-3 py-2 max-w-[280px] text-[12px] text-ink-700">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
            Preview
          </div>
          <p className="mt-0.5 leading-snug">{layout.description}</p>
        </div>
        <div className="pointer-events-auto inline-flex items-center gap-2 bg-white border border-ink-200 rounded-md shadow-card p-1.5">
          <Button
            variant="ghost"
            size="sm"
            icon={<X size={14} />}
            onClick={closeOptimizerPreview}
          >
            Cancel
          </Button>
          <Button
            variant="accent"
            size="sm"
            icon={<Check size={14} />}
            onClick={() => applyLayout(layout)}
          >
            Apply layout
          </Button>
        </div>
      </div>

      {reasonsOpen && (
        <OptimizerReasons
          layout={layout}
          onClose={() => setReasonsOpen(false)}
        />
      )}
    </>
  );
}
