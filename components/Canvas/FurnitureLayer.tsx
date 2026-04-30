"use client";

import { useMemo } from "react";
import { Group } from "react-konva";
import { useRoomStore } from "@/lib/store/useRoomStore";
import FurnitureItem from "./FurnitureItem";
import type { Furniture } from "@/types/room";

type Props = { scale: number };

export default function FurnitureLayer({ scale }: Props) {
  const items = useRoomStore((s) => s.items);
  const selectedId = useRoomStore((s) => s.selectedId);
  const select = useRoomStore((s) => s.select);
  const updateItem = useRoomStore((s) => s.updateItem);
  const preview = useRoomStore((s) => s.optimizerPreview);

  const previewById = useMemo(() => {
    if (!preview) return null;
    const layout = preview.layouts[preview.activeIndex];
    if (!layout) return null;
    return new Map(layout.placements.map((p) => [p.id, p] as const));
  }, [preview]);

  return (
    <Group>
      {items
        .filter((i): i is Furniture => i.type === "furniture")
        .map((f) => {
          const p = previewById?.get(f.id);
          const view = p
            ? { ...f, x: p.x, y: p.y, rotation: p.rotation }
            : f;
          const previewing = previewById !== null;
          return (
            <FurnitureItem
              key={f.id}
              item={view}
              selected={!previewing && f.id === selectedId}
              scale={scale}
              previewing={previewing}
              onSelect={previewing ? () => undefined : () => select(f.id)}
              onChange={(patch) => updateItem(f.id, patch)}
            />
          );
        })}
    </Group>
  );
}
