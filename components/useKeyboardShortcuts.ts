"use client";

import { useEffect } from "react";
import { useRoomStore } from "@/lib/store/useRoomStore";

const NUDGE_CM = 5;
const NUDGE_FINE_CM = 1;

// Bind canvas-level keyboard shortcuts: Delete, Escape, arrow nudging.
// Skips when typing into a form field.
export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const {
        selectedId,
        items,
        removeItem,
        select,
        updateItem,
        undo,
        redo,
        optimizerPreview,
      } = useRoomStore.getState();

      // While the optimizer preview is open it owns arrow keys + enter/escape.
      if (optimizerPreview) return;

      const mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        redo();
        return;
      }

      if (e.key === "Escape") {
        select(null);
        return;
      }

      if (!selectedId) return;
      const item = items.find((i) => i.id === selectedId);
      if (!item) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeItem(selectedId);
        return;
      }

      if (
        item.type === "furniture" ||
        item.type === "floor-element"
      ) {
        const step = e.shiftKey ? NUDGE_FINE_CM : NUDGE_CM;
        let dx = 0,
          dy = 0;
        if (e.key === "ArrowLeft") dx = -step;
        if (e.key === "ArrowRight") dx = step;
        if (e.key === "ArrowUp") dy = -step;
        if (e.key === "ArrowDown") dy = step;
        if (dx || dy) {
          e.preventDefault();
          updateItem(selectedId, { x: item.x + dx, y: item.y + dy });
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
