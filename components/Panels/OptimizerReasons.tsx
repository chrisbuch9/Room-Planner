"use client";

import { useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import type { Layout } from "@/lib/optimizer/types";
import IconButton from "@/components/ui/IconButton";

type Props = {
  layout: Layout;
  onClose: () => void;
};

export default function OptimizerReasons({ layout, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink-950/40 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md max-h-[80vh] mx-4 bg-white rounded-xl shadow-card border border-ink-100 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 pt-5 pb-3 border-b border-ink-100 flex items-start gap-3">
          <div className="grid place-items-center h-9 w-9 rounded-md bg-ink-900 text-paper-50 shrink-0">
            <Sparkles size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
              Why this layout?
            </div>
            <h3 className="text-base font-semibold text-ink-900 truncate">
              {layout.name}
            </h3>
            <p className="mt-1 text-[12px] text-ink-600 leading-snug">
              {layout.description}
            </p>
          </div>
          <IconButton
            label="Close"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X size={15} />
          </IconButton>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-3">
          {layout.reasons.length === 0 ? (
            <p className="text-sm text-ink-500">No furniture to arrange.</p>
          ) : (
            layout.reasons.map((r) => (
              <div key={r.id} className="space-y-1">
                <div className="text-[12px] font-semibold text-ink-900 capitalize">
                  {r.label}
                </div>
                <ul className="space-y-0.5">
                  {r.bullets.map((b, i) => (
                    <li
                      key={i}
                      className="text-[12px] text-ink-700 leading-snug pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-ink-400"
                    >
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        <footer className="px-5 py-3 border-t border-ink-100 bg-paper-50 text-[11px] text-ink-500">
          Score is heuristic — try other layouts using the arrows.
        </footer>
      </div>
    </div>
  );
}
