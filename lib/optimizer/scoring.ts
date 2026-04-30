import type { Furniture } from "@/types/room";
import {
  aabbForFurniture,
  aabbsOverlap,
  inflate,
  orientedAabb,
} from "@/lib/geometry/collision";
import { polygonBounds } from "@/lib/geometry/polygon";
import type {
  CandidatePosition,
  RuleResult,
  ScoringContext,
} from "./types";

// Wall-affinity: reward placements whose bounding box edge sits very close to
// any room wall. We use the AABB of the candidate (so it works regardless of
// rotation) and check the perpendicular distance from the AABB to each wall
// segment within a small slack.
export const wallAffinityRule = (
  cand: CandidatePosition,
  ctx: ScoringContext,
): RuleResult => {
  const { item, walls, weights } = ctx;
  if (!isWallSeeking(item.kind)) return { score: 0 };
  const aabb = orientedAabb(cand.x, cand.y, item.width, item.height, cand.rotation);

  let bestDist = Infinity;
  for (const w of walls) {
    // Approximate by min distance from AABB center to wall, minus item half-depth.
    const dx = w.b.x - w.a.x;
    const dy = w.b.y - w.a.y;
    const len = Math.hypot(dx, dy) || 1;
    const cx = (aabb.minX + aabb.maxX) / 2;
    const cy = (aabb.minY + aabb.maxY) / 2;
    const t = ((cx - w.a.x) * dx + (cy - w.a.y) * dy) / (len * len);
    if (t < 0 || t > 1) continue;
    const px = w.a.x + dx * t;
    const py = w.a.y + dy * t;
    const d = Math.hypot(cx - px, cy - py);
    const halfDepth = Math.min(
      (aabb.maxX - aabb.minX) / 2,
      (aabb.maxY - aabb.minY) / 2,
    );
    const edgeDist = Math.max(0, d - halfDepth);
    if (edgeDist < bestDist) bestDist = edgeDist;
  }
  if (bestDist === Infinity) return { score: 0 };
  // Score: 1 at flush (≤2cm), linear falloff to 0 at 60cm.
  const norm = clamp01(1 - bestDist / 60);
  if (norm <= 0) return { score: 0 };
  const reason =
    bestDist <= 4
      ? `${itemNoun(item)} placed flush against a wall`
      : bestDist <= 25
        ? `${itemNoun(item)} positioned near a wall`
        : undefined;
  return { score: norm * 100 * weights.wallAffinity, reason };
};

// Door clearance: AABB must not intersect the door's swing region.
export const doorClearanceRule = (
  cand: CandidatePosition,
  ctx: ScoringContext,
): RuleResult => {
  const { item, doors, weights } = ctx;
  if (doors.length === 0) return { score: 0 };
  const aabb = orientedAabb(cand.x, cand.y, item.width, item.height, cand.rotation);
  let inside = false;
  let near = false;
  for (const d of doors) {
    if (aabbsOverlap(aabb, d.swingAabb)) inside = true;
    else if (aabbsOverlap(aabb, inflate(d.swingAabb, 30))) near = true;
  }
  if (inside) return { score: -1500 * weights.doorClearance };
  if (near) return { score: 0 };
  return {
    score: 25 * weights.doorClearance,
    reason: "Door swing kept clear",
  };
};

// Window affinity: for window-friendly items (bed, sofa, desk), reward the
// item's "front" facing the window center. For tall items (dresser/bookshelf),
// penalize sitting flush against a window.
export const windowAffinityRule = (
  cand: CandidatePosition,
  ctx: ScoringContext,
): RuleResult => {
  const { item, windows, weights } = ctx;
  if (windows.length === 0) return { score: 0 };
  const aabb = orientedAabb(cand.x, cand.y, item.width, item.height, cand.rotation);

  if (item.kind === "dresser" || item.kind === "bookshelf" || item.kind === "cabinet") {
    for (const win of windows) {
      const winMid = midpoint(win.segmentA, win.segmentB);
      const halfW = (aabb.maxX - aabb.minX) / 2;
      const halfH = (aabb.maxY - aabb.minY) / 2;
      const cx = (aabb.minX + aabb.maxX) / 2;
      const cy = (aabb.minY + aabb.maxY) / 2;
      const dist = Math.hypot(cx - winMid.x, cy - winMid.y);
      if (dist < Math.max(halfW, halfH) + 20) {
        return {
          score: -180 * weights.windowAffinity,
          reason: undefined,
        };
      }
    }
    return { score: 0 };
  }

  if (item.kind !== "bed" && item.kind !== "sofa" && item.kind !== "desk") {
    return { score: 0 };
  }
  // Reward when the item center is within ~250cm of any window center.
  let best = Infinity;
  for (const win of windows) {
    const winMid = midpoint(win.segmentA, win.segmentB);
    const cx = (aabb.minX + aabb.maxX) / 2;
    const cy = (aabb.minY + aabb.maxY) / 2;
    const d = Math.hypot(cx - winMid.x, cy - winMid.y);
    if (d < best) best = d;
  }
  if (best === Infinity) return { score: 0 };
  const norm = clamp01(1 - best / 250);
  if (norm < 0.05) return { score: 0 };
  return {
    score: norm * 80 * weights.windowAffinity,
    reason: `${itemNoun(item)} faces a window`,
  };
};

// Outlet proximity: items that benefit from a nearby plug get pulled toward
// the closest outlet point. Desks and nightstands are the strongest "needs
// power" items (laptop, lamp, phone charger). Beds and sofas get a gentler
// pull — useful for alarm clocks and floor lamps, but not at the cost of
// dominating wall-affinity choices for the anchor itself.
const OUTLET_ITEM_PULL: Partial<Record<Furniture["kind"], number>> = {
  desk: 1.0,
  "l-desk": 1.0,
  nightstand: 1.0,
  bed: 0.45,
  sofa: 0.45,
};

export const outletProximityRule = (
  cand: CandidatePosition,
  ctx: ScoringContext,
): RuleResult => {
  const { item, outlets, weights } = ctx;
  if (outlets.length === 0) return { score: 0 };
  const itemPull = OUTLET_ITEM_PULL[item.kind];
  if (itemPull === undefined) return { score: 0 };
  let best = Infinity;
  for (const o of outlets) {
    const d = Math.hypot(cand.x - o.position.x, cand.y - o.position.y);
    if (d < best) best = d;
  }
  if (best === Infinity) return { score: 0 };
  const norm = clamp01(1 - best / 200);
  if (norm < 0.2) return { score: 0 };
  return {
    score: norm * 90 * itemPull * weights.outletProximity,
    reason: `${itemNoun(item)} placed near an outlet`,
  };
};

// Vent clearance: AABB must not cover a floor vent. Vents are also hard-filtered
// in candidate generation, but we still award credit when nearby vents exist.
export const ventClearanceRule = (
  cand: CandidatePosition,
  ctx: ScoringContext,
): RuleResult => {
  const { item, ventAabbs, weights } = ctx;
  if (ventAabbs.length === 0) return { score: 0 };
  const aabb = orientedAabb(cand.x, cand.y, item.width, item.height, cand.rotation);
  for (const v of ventAabbs) {
    if (aabbsOverlap(aabb, v)) {
      return { score: -1000 * weights.ventClearance };
    }
  }
  return {
    score: 15 * weights.ventClearance,
    reason: "Floor vent kept uncovered",
  };
};

// Pair affinity — checked from the dependent item's perspective (chair
// dependent on desk; nightstand dependent on bed). Numbers are tuned so a
// pair candidate beats wall-affinity / openness when the partner exists.
export const pairAffinityRule = (
  cand: CandidatePosition,
  ctx: ScoringContext,
): RuleResult => {
  const { item, weights, originals, placedById } = ctx;
  if (item.kind === "chair") {
    let bestDist = Infinity;
    for (const placement of placedById.values()) {
      const orig = originals.get(placement.id);
      if (!orig) continue;
      if (orig.kind !== "desk" && orig.kind !== "l-desk") continue;
      const d = Math.hypot(cand.x - placement.x, cand.y - placement.y);
      if (d < bestDist) bestDist = d;
    }
    if (bestDist === Infinity) return { score: 0 };
    if (bestDist > 200) return { score: 0 };
    const norm = clamp01(1 - bestDist / 120);
    if (norm < 0.05) return { score: 0 };
    return {
      score: norm * 140 * weights.pairAffinity,
      reason: "Chair tucked near a desk",
    };
  }
  if (item.kind === "nightstand") {
    let bestDist = Infinity;
    for (const placement of placedById.values()) {
      const orig = originals.get(placement.id);
      if (!orig || orig.kind !== "bed") continue;
      const d = Math.hypot(cand.x - placement.x, cand.y - placement.y);
      if (d < bestDist) bestDist = d;
    }
    if (bestDist === Infinity) return { score: 0 };
    if (bestDist > 220) return { score: 0 };
    const norm = clamp01(1 - bestDist / 150);
    if (norm < 0.05) return { score: 0 };
    return {
      score: norm * 160 * weights.pairAffinity,
      reason: "Nightstand kept at the bedside",
    };
  }
  return { score: 0 };
};

// Center openness: penalize covering the polygon's central inset.
export const centerOpennessRule = (
  cand: CandidatePosition,
  ctx: ScoringContext,
): RuleResult => {
  const { item, room, weights } = ctx;
  const b = polygonBounds(room.vertices);
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  const innerHalfW = (b.maxX - b.minX) * 0.18;
  const innerHalfH = (b.maxY - b.minY) * 0.18;
  const innerAabb = {
    minX: cx - innerHalfW,
    minY: cy - innerHalfH,
    maxX: cx + innerHalfW,
    maxY: cy + innerHalfH,
  };
  const aabb = orientedAabb(cand.x, cand.y, item.width, item.height, cand.rotation);
  if (!aabbsOverlap(aabb, innerAabb)) {
    return {
      score: 12 * weights.centerOpenness,
      reason: undefined,
    };
  }
  return { score: -50 * weights.centerOpenness };
};

// Movement cost: tiny per-cm penalty so the optimizer doesn't reshuffle for
// cosmetic gains. Tie-breaks toward "stay-put".
export const movementCostRule = (
  cand: CandidatePosition,
  ctx: ScoringContext,
): RuleResult => {
  const { item, weights } = ctx;
  const d = Math.hypot(cand.x - item.x, cand.y - item.y);
  return { score: -d * weights.movementCost };
};

// Desk-on-outlet-wall: desks are working surfaces that need power, so when an
// outlet exists we anchor desks to its wall in every preset — including the
// ones whose primary wall is something else (longest wall, opposite a window,
// shortest wall). Sized to clearly beat primaryWallBonus's 240 × wallAffinity
// across every current preset.
export const deskOutletWallRule = (
  cand: CandidatePosition,
  ctx: ScoringContext,
): RuleResult => {
  const { item, walls, outlets, weights } = ctx;
  if (item.kind !== "desk" && item.kind !== "l-desk") return { score: 0 };
  if (outlets.length === 0) return { score: 0 };

  const outletWalls = new Set<number>();
  for (const o of outlets) outletWalls.add(o.el.wallIndex);

  const aabb = orientedAabb(cand.x, cand.y, item.width, item.height, cand.rotation);
  const cx = (aabb.minX + aabb.maxX) / 2;
  const cy = (aabb.minY + aabb.maxY) / 2;
  const halfDepth = Math.min(
    (aabb.maxX - aabb.minX) / 2,
    (aabb.maxY - aabb.minY) / 2,
  );

  let best = Infinity;
  for (const idx of outletWalls) {
    const wall = walls[idx];
    if (!wall) continue;
    const dx = wall.b.x - wall.a.x;
    const dy = wall.b.y - wall.a.y;
    const len2 = dx * dx + dy * dy || 1;
    const t = ((cx - wall.a.x) * dx + (cy - wall.a.y) * dy) / len2;
    if (t < -0.05 || t > 1.05) continue;
    const px = wall.a.x + dx * t;
    const py = wall.a.y + dy * t;
    const d = Math.hypot(cx - px, cy - py);
    const edgeDist = Math.max(0, d - halfDepth);
    if (edgeDist < best) best = edgeDist;
  }

  if (best === Infinity || best > 30) return { score: 0 };
  // Raw 500 wins by ≥+100 against primaryWallBonus in every current preset
  // (max primary = 240 × 1.6 = 384 in wall-anchored). Scaled by wallAffinity
  // so the bonus tracks how much the active preset cares about wall placement
  // generally — that keeps it decisive even if a preset turns wallAffinity up.
  // Then multiplied by max(1, outletProximity) so power-friendly still has a
  // visibly stronger desk-to-outlet pull than the others.
  const closeness = 1 - best / 30;
  const bonus =
    closeness * 500 * weights.wallAffinity * Math.max(1, weights.outletProximity);
  return {
    score: bonus,
    reason: "Desk anchored on the wall with an outlet",
  };
};

// Primary-wall bonus: each preset designates one wall as the anchor. Big items
// (bed/sofa/desk/l-desk/dresser) earn a strong bonus when placed flush against
// that wall — this is what makes presets pick visibly different walls.
export const primaryWallBonusRule = (
  cand: CandidatePosition,
  ctx: ScoringContext,
): RuleResult => {
  const { item, primaryWallIndex, walls, weights } = ctx;
  if (primaryWallIndex === null) return { score: 0 };
  if (!isAnchorItem(item.kind)) return { score: 0 };
  const wall = walls[primaryWallIndex];
  if (!wall) return { score: 0 };

  const aabb = orientedAabb(cand.x, cand.y, item.width, item.height, cand.rotation);
  const dx = wall.b.x - wall.a.x;
  const dy = wall.b.y - wall.a.y;
  const len = Math.hypot(dx, dy) || 1;
  const cx = (aabb.minX + aabb.maxX) / 2;
  const cy = (aabb.minY + aabb.maxY) / 2;
  const t = ((cx - wall.a.x) * dx + (cy - wall.a.y) * dy) / (len * len);
  if (t < -0.05 || t > 1.05) return { score: 0 };
  const px = wall.a.x + dx * t;
  const py = wall.a.y + dy * t;
  const d = Math.hypot(cx - px, cy - py);
  const halfDepth = Math.min(
    (aabb.maxX - aabb.minX) / 2,
    (aabb.maxY - aabb.minY) / 2,
  );
  const edgeDist = Math.max(0, d - halfDepth);
  if (edgeDist > 30) return { score: 0 };
  // Strong, scales with wallAffinity weight so presets that down-weight walls
  // (none currently) still see a proportional bonus.
  const bonus = (1 - edgeDist / 30) * 240 * weights.wallAffinity;
  return {
    score: bonus,
    reason: `${itemNoun(item)} anchored on this layout's preferred wall`,
  };
};

export const RULES = [
  wallAffinityRule,
  primaryWallBonusRule,
  deskOutletWallRule,
  doorClearanceRule,
  windowAffinityRule,
  outletProximityRule,
  ventClearanceRule,
  pairAffinityRule,
  centerOpennessRule,
  movementCostRule,
];

const isAnchorItem = (kind: Furniture["kind"]): boolean => {
  switch (kind) {
    case "bed":
    case "sofa":
    case "desk":
    case "l-desk":
    case "dresser":
      return true;
    default:
      return false;
  }
};

export const scoreCandidate = (
  cand: CandidatePosition,
  ctx: ScoringContext,
): { total: number; reasons: string[] } => {
  let total = 0;
  const reasons = new Set<string>();
  for (const rule of RULES) {
    const { score, reason } = rule(cand, ctx);
    total += score;
    if (reason && score > 0) reasons.add(reason);
  }
  return { total, reasons: Array.from(reasons) };
};

// ── helpers ────────────────────────────────────────────────────────────────

const isWallSeeking = (kind: Furniture["kind"]): boolean => {
  switch (kind) {
    case "bed":
    case "sofa":
    case "dresser":
    case "cabinet":
    case "bookshelf":
    case "l-desk":
    case "desk":
    case "nightstand":
      return true;
    default:
      return false;
  }
};

const itemNoun = (item: Furniture): string => {
  switch (item.kind) {
    case "bed": return "Bed";
    case "sofa": return "Sofa";
    case "desk": return "Desk";
    case "l-desk": return "Desk";
    case "chair": return "Chair";
    case "dresser": return "Dresser";
    case "cabinet": return "Cabinet";
    case "bookshelf": return "Bookshelf";
    case "nightstand": return "Nightstand";
    case "custom": return item.label || "Item";
  }
};

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

const midpoint = (
  a: { x: number; y: number },
  b: { x: number; y: number },
): { x: number; y: number } => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

// Re-export so optimize.ts doesn't need to also import collision helpers.
export { aabbForFurniture, orientedAabb };
