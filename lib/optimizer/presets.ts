import type { FixedContext, Preset, ScoringWeights } from "./types";

const BASE: ScoringWeights = {
  wallAffinity: 1,
  doorClearance: 1,
  windowAffinity: 1,
  outletProximity: 1,
  ventClearance: 1,
  // Bumped above 1 so chair-at-desk and nightstand-at-bed pull harder than
  // generic wall affinity in every preset, not just power-friendly.
  pairAffinity: 1.4,
  centerOpenness: 0.6,
  movementCost: 0.02,
};

const scaled = (over: Partial<ScoringWeights>): ScoringWeights => ({
  ...BASE,
  ...over,
});

const longestWallIndex = (ctx: FixedContext): number => {
  let best = 0;
  for (let i = 1; i < ctx.walls.length; i++) {
    if (ctx.walls[i].length > ctx.walls[best].length) best = i;
  }
  return best;
};

const shortestViableWallIndex = (ctx: FixedContext): number => {
  // Pick the shortest wall that's still ≥150cm so a queen-ish bed fits.
  // Fall back to longest if nothing qualifies.
  const sorted = ctx.walls
    .filter((w) => w.length >= 150)
    .sort((a, b) => a.length - b.length);
  if (sorted[0]) return sorted[0].index;
  return longestWallIndex(ctx);
};

const wallNearestOutlet = (ctx: FixedContext): number | null => {
  if (ctx.outlets.length === 0) return null;
  // Take the wall of the first outlet — outlets already carry a wallIndex.
  return ctx.outlets[0].el.wallIndex;
};

const wallOppositeWindow = (ctx: FixedContext): number | null => {
  if (ctx.windows.length === 0) return null;
  const win = ctx.windows[0];
  const winMid = {
    x: (win.segmentA.x + win.segmentB.x) / 2,
    y: (win.segmentA.y + win.segmentB.y) / 2,
  };
  let best = 0;
  let bestDist = -Infinity;
  for (let i = 0; i < ctx.walls.length; i++) {
    if (i === win.el.wallIndex) continue; // skip the window's own wall
    const w = ctx.walls[i];
    const m = { x: (w.a.x + w.b.x) / 2, y: (w.a.y + w.b.y) / 2 };
    const d = Math.hypot(m.x - winMid.x, m.y - winMid.y);
    if (d > bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
};

export const PRESETS: Preset[] = [
  {
    id: "wall-anchored",
    name: "Wall-anchored",
    description: "Anchors heavy items against the longest wall.",
    weights: scaled({ wallAffinity: 1.6, centerOpenness: 0.8 }),
    pickPrimaryWall: longestWallIndex,
  },
  {
    id: "outlet-focused",
    name: "Power-friendly",
    description: "Pulls desks and the bed toward the wall with an outlet.",
    weights: scaled({
      outletProximity: 3.5,
      pairAffinity: 1.7,
      centerOpenness: 0.4,
    }),
    pickPrimaryWall: wallNearestOutlet,
  },
  {
    id: "open-center",
    name: "Open center",
    description: "Pushes furniture to the shortest walls, opening the middle.",
    weights: scaled({
      centerOpenness: 2.5,
      wallAffinity: 1.2,
    }),
    pickPrimaryWall: shortestViableWallIndex,
  },
  {
    id: "near-windows",
    name: "Window-facing",
    description: "Anchors the bed opposite the window so it faces the light.",
    weights: scaled({ windowAffinity: 3, wallAffinity: 1.2 }),
    pickPrimaryWall: wallOppositeWindow,
  },
];
