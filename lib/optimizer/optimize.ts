import type {
  FloorElement,
  Furniture,
  Item,
  ItemId,
  Room,
  WallElement,
} from "@/types/room";
import {
  aabbForFloor,
  aabbForFurniture,
  inflate,
  orientedAabb,
} from "@/lib/geometry/collision";
import { wallsFromVertices } from "@/lib/geometry/polygon";
import {
  cornerCandidatesForLDesk,
  generateCandidates,
  pairCandidatesForChair,
  pairCandidatesForNightstand,
  placementsToAabbs,
} from "./candidates";
import { PRESETS } from "./presets";
import { scoreCandidate } from "./scoring";
import type {
  CandidatePosition,
  FixedContext,
  Layout,
  Placement,
  Preset,
  Reason,
  ScoringContext,
} from "./types";

const ANCHOR_PRIORITY: Record<Furniture["kind"], number> = {
  bed: 100,
  sofa: 90,
  "l-desk": 85,
  desk: 80,
  dresser: 70,
  cabinet: 60,
  bookshelf: 55,
  nightstand: 30,
  chair: 20,
  custom: 10,
};

// Build the static (per-room) context once; reused across presets.
const buildFixedContext = (items: Item[], room: Room): FixedContext => {
  const walls = wallsFromVertices(room.vertices);
  const wallElements = items.filter(
    (i): i is WallElement => i.type === "wall-element",
  );
  const floorElements = items.filter(
    (i): i is FloorElement => i.type === "floor-element",
  );

  const doors = wallElements
    .filter((e) => e.kind === "door")
    .map((el) => {
      const wall = walls[el.wallIndex];
      // Door swing approximated as a wedge bounded by an AABB centered at
      // the door midpoint with radius ≈ door width on the room-interior side.
      const cosA = Math.cos(wall.angle);
      const sinA = Math.sin(wall.angle);
      const cx = wall.a.x + cosA * (el.offsetAlongWall + el.width / 2);
      const cy = wall.a.y + sinA * (el.offsetAlongWall + el.width / 2);
      const r = el.width;
      return {
        el,
        wall,
        swingAabb: {
          minX: cx - r,
          minY: cy - r,
          maxX: cx + r,
          maxY: cy + r,
        },
      };
    });

  const windows = wallElements
    .filter((e) => e.kind === "window")
    .map((el) => {
      const wall = walls[el.wallIndex];
      const cosA = Math.cos(wall.angle);
      const sinA = Math.sin(wall.angle);
      const a = {
        x: wall.a.x + cosA * el.offsetAlongWall,
        y: wall.a.y + sinA * el.offsetAlongWall,
      };
      const b = {
        x: wall.a.x + cosA * (el.offsetAlongWall + el.width),
        y: wall.a.y + sinA * (el.offsetAlongWall + el.width),
      };
      return { el, wall, segmentA: a, segmentB: b };
    });

  const outlets = wallElements
    .filter((e) => e.kind === "outlet")
    .map((el) => {
      const wall = walls[el.wallIndex];
      const cosA = Math.cos(wall.angle);
      const sinA = Math.sin(wall.angle);
      const cx = wall.a.x + cosA * (el.offsetAlongWall + el.width / 2);
      const cy = wall.a.y + sinA * (el.offsetAlongWall + el.width / 2);
      return { el, position: { x: cx, y: cy } };
    });

  const ventAabbs = floorElements
    .filter((f) => f.kind === "floor-vent")
    .map((f) => inflate(aabbForFloor(f), 4));

  const floorAabbs = floorElements.map((f) => aabbForFloor(f));

  return {
    room,
    walls,
    doors,
    windows,
    outlets,
    ventAabbs,
    floorAabbs,
  };
};

const sortFurniture = (list: Furniture[]): Furniture[] => {
  return [...list].sort((a, b) => {
    const pa = ANCHOR_PRIORITY[a.kind] ?? 0;
    const pb = ANCHOR_PRIORITY[b.kind] ?? 0;
    if (pa !== pb) return pb - pa;
    const sa = a.width * a.height;
    const sb = b.width * b.height;
    return sb - sa;
  });
};

const labelFor = (item: Furniture): string => item.label || item.kind;

const runPreset = (
  preset: Preset,
  presetFallbackWall: number | null,
  furniture: Furniture[],
  ctx: FixedContext,
): Layout => {
  const ordered = sortFurniture(furniture);
  const placedById = new Map<ItemId, Placement>();
  const originals = new Map<ItemId, Furniture>();
  for (const f of furniture) originals.set(f.id, f);
  const placedAabbs: ReturnType<typeof aabbForFurniture>[] = [];
  // Parallel id→AABB lookup so pair-candidate generators can exclude the
  // partner item's AABB (e.g., chair sitting *inside* an L-desk's cut-out).
  const placedAabbById = new Map<ItemId, ReturnType<typeof aabbForFurniture>>();
  const reasons: Reason[] = [];
  let total = 0;

  const primaryWallIndex =
    preset.pickPrimaryWall?.(ctx) ?? presetFallbackWall;

  for (const item of ordered) {
    let candidates = generateCandidates(item, ctx, placedAabbs);

    // Inject pair-affinity candidates so a chair is *guaranteed* to consider
    // sitting in front of an already-placed desk (and a nightstand at the bedside),
    // even if the coarse interior grid skipped that exact spot.
    if (item.kind === "chair") {
      const pairCands: CandidatePosition[] = [];
      for (const placement of placedById.values()) {
        const desk = originals.get(placement.id);
        if (!desk || (desk.kind !== "desk" && desk.kind !== "l-desk")) continue;
        const previewDesk: Furniture = {
          ...desk,
          x: placement.x,
          y: placement.y,
          rotation: placement.rotation,
        };
        // For L-desk + chair-in-cut-out, the chair AABB sits inside the
        // L-desk's bounding rect. Exclude that one AABB so the placement
        // isn't falsely blocked by the partner desk itself.
        const deskAabb = placedAabbById.get(desk.id);
        const collisionAabbs = deskAabb
          ? placedAabbs.filter((a) => a !== deskAabb)
          : placedAabbs;
        pairCands.push(
          ...pairCandidatesForChair(item, previewDesk, ctx, collisionAabbs),
        );
      }
      // When a desk is in the room, the chair belongs at the desk — restrict
      // to pair candidates so the optimizer can't park the chair at a random
      // wall when a tucked-in slot exists.
      if (pairCands.length > 0) {
        candidates = pairCands;
      }
    } else if (item.kind === "l-desk") {
      const cornerCands = cornerCandidatesForLDesk(item, ctx, placedAabbs);
      // Restrict to corner placements when any fit. An L-desk against a
      // generic flat wall wastes the L's two-arm geometry — corners are the
      // only correct answer when the room has one.
      if (cornerCands.length > 0) {
        candidates = cornerCands;
      }
    } else if (item.kind === "nightstand") {
      const pairCands: CandidatePosition[] = [];
      for (const placement of placedById.values()) {
        const bed = originals.get(placement.id);
        if (!bed || bed.kind !== "bed") continue;
        const previewBed: Furniture = {
          ...bed,
          x: placement.x,
          y: placement.y,
          rotation: placement.rotation,
        };
        pairCands.push(
          ...pairCandidatesForNightstand(item, previewBed, ctx, placedAabbs),
        );
      }
      // If any bedside slot fits, *restrict* nightstand placement to it. A
      // nightstand at a generic wall scored similarly enough to a bedside slot
      // that the optimizer would sometimes park it across the room — bedside
      // is the only correct answer when a bed is in the picture.
      if (pairCands.length > 0) {
        candidates = pairCands;
      }
    }

    if (candidates.length === 0) {
      // Couldn't place — keep at original location and record so the user knows.
      placedById.set(item.id, {
        id: item.id,
        x: item.x,
        y: item.y,
        rotation: item.rotation,
      });
      const fallbackAabb = aabbForFurniture(item);
      placedAabbs.push(fallbackAabb);
      placedAabbById.set(item.id, fallbackAabb);
      reasons.push({
        id: item.id,
        label: labelFor(item),
        bullets: ["No clear spot found — kept in place."],
      });
      continue;
    }

    const sctx: ScoringContext = {
      ...ctx,
      item,
      weights: preset.weights,
      placedAabbs,
      placedById,
      originals,
      primaryWallIndex,
    };

    let best: { cand: CandidatePosition; total: number; reasons: string[] } | null = null;
    for (const cand of candidates) {
      const { total: t, reasons: rs } = scoreCandidate(cand, sctx);
      if (!best || t > best.total) best = { cand, total: t, reasons: rs };
    }
    // best is non-null because candidates.length > 0
    const winner = best as { cand: CandidatePosition; total: number; reasons: string[] };

    placedById.set(item.id, {
      id: item.id,
      x: winner.cand.x,
      y: winner.cand.y,
      rotation: winner.cand.rotation,
    });
    const placedAabb = orientedAabb(
      winner.cand.x,
      winner.cand.y,
      item.width,
      item.height,
      winner.cand.rotation,
    );
    placedAabbs.push(placedAabb);
    placedAabbById.set(item.id, placedAabb);
    total += winner.total;
    const bullets =
      winner.reasons.length > 0
        ? winner.reasons
        : ["Fits the available floor space."];
    reasons.push({ id: item.id, label: labelFor(item), bullets });
  }

  return {
    name: preset.name,
    description: preset.description,
    placements: Array.from(placedById.values()),
    reasons,
    score: total,
  };
};

// Two layouts considered "the same" if every placement matches within 5cm / 5°.
const layoutsEquivalent = (a: Layout, b: Layout): boolean => {
  if (a.placements.length !== b.placements.length) return false;
  const map = new Map<ItemId, Placement>();
  for (const p of b.placements) map.set(p.id, p);
  for (const p of a.placements) {
    const q = map.get(p.id);
    if (!q) return false;
    if (Math.hypot(p.x - q.x, p.y - q.y) > 5) return false;
    const raw = ((p.rotation - q.rotation) % 360 + 360) % 360;
    const angDist = Math.min(raw, 360 - raw); // 0..180
    if (angDist > 5) return false;
  }
  return true;
};

const dedupe = (layouts: Layout[]): Layout[] => {
  const out: Layout[] = [];
  for (const l of layouts) {
    if (!out.some((existing) => layoutsEquivalent(existing, l))) out.push(l);
  }
  return out;
};

export const optimizeLayout = (items: Item[], room: Room): Layout[] => {
  const furniture = items.filter(
    (i): i is Furniture => i.type === "furniture",
  );
  if (furniture.length === 0) return [];

  const ctx = buildFixedContext(items, room);

  // Skip "Window-facing" preset when the room has no windows — it would just
  // duplicate "Wall-anchored" otherwise.
  const presets = PRESETS.filter(
    (p) => p.id !== "near-windows" || ctx.windows.length > 0,
  );

  // Each preset gets a *distinct* fallback wall so even when the preset's
  // pickPrimaryWall returns null (no outlets, etc.) the anchor wall still
  // varies between presets and the produced layouts stay visually different.
  const wallCount = ctx.walls.length;
  const layouts = presets.map((preset, i) => {
    const fallback = wallCount > 0 ? i % wallCount : null;
    return runPreset(preset, fallback, furniture, ctx);
  });
  layouts.sort((a, b) => b.score - a.score);
  return dedupe(layouts);
};
