import type { Item } from "@/types/room";
import { useRoomStore } from "./useRoomStore";

export const useSelectedItem = (): Item | null => {
  return useRoomStore((s) => {
    if (!s.selectedId) return null;
    return s.items.find((i) => i.id === s.selectedId) ?? null;
  });
};
