"use client";

import { create } from "zustand";
import type {
  FloorElement,
  Furniture,
  Item,
  ItemId,
  Room,
  WallElement,
} from "@/types/room";
import type { Layout } from "@/lib/optimizer/types";
import {
  setWallLength as resizeWall,
  wallsFromVertices,
} from "@/lib/geometry/polygon";
import { clamp } from "@/lib/geometry/snapping";

const HISTORY_LIMIT = 60;

type OptimizerPreview = { layouts: Layout[]; activeIndex: number };

type State = {
  room: Room | null;
  items: Item[];
  selectedId: ItemId | null;
  past: Item[][];
  future: Item[][];
  gridVisible: boolean;
  snapEnabled: boolean;
  optimizerPreview: OptimizerPreview | null;
};

type Actions = {
  setRoom: (room: Room) => void;
  updateRoom: (room: Room) => void;
  setWallLength: (wallIndex: number, newLength: number) => void;
  resetRoom: () => void;

  addFurniture: (f: Omit<Furniture, "id" | "type">) => string;
  addWallElement: (e: Omit<WallElement, "id" | "type">) => string;
  addFloorElement: (e: Omit<FloorElement, "id" | "type">) => string;

  updateItem: (id: ItemId, patch: Partial<Item>) => void;
  removeItem: (id: ItemId) => void;

  select: (id: ItemId | null) => void;

  toggleGrid: () => void;
  toggleSnap: () => void;

  openOptimizerPreview: (layouts: Layout[]) => void;
  setActiveLayout: (index: number) => void;
  closeOptimizerPreview: () => void;
  applyLayout: (layout: Layout) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
};

const newId = () => Math.random().toString(36).slice(2, 10);

// Pushes the current items snapshot onto past, and clears future. Use right
// before applying a mutation so that undo restores the prior state.
const withHistory = (s: State): Pick<State, "past" | "future"> => ({
  past: [...s.past, s.items].slice(-HISTORY_LIMIT),
  future: [],
});

export const useRoomStore = create<State & Actions>((set, get) => ({
  room: null,
  items: [],
  selectedId: null,
  past: [],
  future: [],
  gridVisible: true,
  snapEnabled: true,
  optimizerPreview: null,

  setRoom: (room) =>
    set({
      room,
      items: [],
      selectedId: null,
      past: [],
      future: [],
      optimizerPreview: null,
    }),

  // Resize/reshape an existing room while keeping items, selection, and the
  // optimizer preview intact. Doesn't touch the undo stack (which only tracks
  // items) — keep the room mutation immediate and non-reversible for now.
  updateRoom: (room) => set({ room }),

  // Resize a single wall after the room has been created. Reflows the polygon
  // via the geometry helper (rectangles stay rectangular; rails track) and
  // clamps any wall-mounted items that would overflow their now-shorter wall.
  setWallLength: (wallIndex, newLength) =>
    set((s) => {
      if (!s.room) return s;
      const nextVertices = resizeWall(s.room.vertices, wallIndex, newLength);
      if (nextVertices === s.room.vertices) return s;
      const nextWalls = wallsFromVertices(nextVertices);
      const nextItems = s.items.map((it) => {
        if (it.type !== "wall-element") return it;
        const w = nextWalls[it.wallIndex];
        if (!w) return it;
        const width = Math.min(it.width, w.length);
        const offset = clamp(
          it.offsetAlongWall,
          0,
          Math.max(0, w.length - width),
        );
        if (width === it.width && offset === it.offsetAlongWall) return it;
        return { ...it, width, offsetAlongWall: offset };
      });
      return {
        room: { ...s.room, vertices: nextVertices },
        items: nextItems,
      };
    }),

  resetRoom: () =>
    set({
      room: null,
      items: [],
      selectedId: null,
      past: [],
      future: [],
      optimizerPreview: null,
    }),

  addFurniture: (f) => {
    const id = newId();
    set((s) => ({
      ...withHistory(s),
      items: [...s.items, { ...f, id, type: "furniture" } as Furniture],
      selectedId: id,
    }));
    return id;
  },

  addWallElement: (e) => {
    const id = newId();
    set((s) => ({
      ...withHistory(s),
      items: [...s.items, { ...e, id, type: "wall-element" } as WallElement],
      selectedId: id,
    }));
    return id;
  },

  addFloorElement: (e) => {
    const id = newId();
    set((s) => ({
      ...withHistory(s),
      items: [...s.items, { ...e, id, type: "floor-element" } as FloorElement],
      selectedId: id,
    }));
    return id;
  },

  updateItem: (id, patch) =>
    set((s) => ({
      ...withHistory(s),
      items: s.items.map((it) =>
        it.id === id ? ({ ...it, ...patch } as Item) : it,
      ),
    })),

  removeItem: (id) =>
    set((s) => ({
      ...withHistory(s),
      items: s.items.filter((it) => it.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  select: (id) => set({ selectedId: id }),

  toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),

  openOptimizerPreview: (layouts) =>
    set({
      optimizerPreview:
        layouts.length === 0 ? null : { layouts, activeIndex: 0 },
    }),
  setActiveLayout: (index) =>
    set((s) =>
      s.optimizerPreview
        ? {
            optimizerPreview: {
              ...s.optimizerPreview,
              activeIndex: Math.max(
                0,
                Math.min(s.optimizerPreview.layouts.length - 1, index),
              ),
            },
          }
        : s,
    ),
  closeOptimizerPreview: () => set({ optimizerPreview: null }),

  applyLayout: (layout) =>
    set((s) => {
      const patchById = new Map(layout.placements.map((p) => [p.id, p]));
      const nextItems = s.items.map((it) => {
        if (it.type !== "furniture") return it;
        const p = patchById.get(it.id);
        if (!p) return it;
        return { ...it, x: p.x, y: p.y, rotation: p.rotation };
      });
      return {
        ...withHistory(s),
        items: nextItems,
        optimizerPreview: null,
      };
    }),

  undo: () =>
    set((s) => {
      if (s.past.length === 0) return s;
      const previous = s.past[s.past.length - 1];
      const stillSelected =
        s.selectedId && previous.some((i) => i.id === s.selectedId)
          ? s.selectedId
          : null;
      return {
        items: previous,
        past: s.past.slice(0, -1),
        future: [s.items, ...s.future].slice(0, HISTORY_LIMIT),
        selectedId: stillSelected,
      };
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0) return s;
      const [next, ...rest] = s.future;
      const stillSelected =
        s.selectedId && next.some((i) => i.id === s.selectedId)
          ? s.selectedId
          : null;
      return {
        items: next,
        past: [...s.past, s.items].slice(-HISTORY_LIMIT),
        future: rest,
        selectedId: stillSelected,
      };
    }),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}));
