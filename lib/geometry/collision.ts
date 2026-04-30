import type { Furniture, FloorElement, Point, Wall } from "@/types/room";
import { pointInPolygon } from "./polygon";

export type AABB = { minX: number; minY: number; maxX: number; maxY: number };

// Visual wall thickness in cm. The room polygon edge is the wall *centerline*,
// so half of this extends inward (into the room). The wall snap target
// (computeSnap) and optimizer flush offset both account for it so furniture
// lands at the inner wall face rather than overlapping the stroke.
export const WALL_THICKNESS_CM = 4;

// World-space AABB for an oriented rectangle (rotation in degrees, +y down).
export const orientedAabb = (
  cx: number,
  cy: number,
  width: number,
  height: number,
  rotationDeg: number,
): AABB => {
  const rad = (rotationDeg * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  const halfW = (width * c + height * s) / 2;
  const halfH = (width * s + height * c) / 2;
  return {
    minX: cx - halfW,
    minY: cy - halfH,
    maxX: cx + halfW,
    maxY: cy + halfH,
  };
};

export const aabbForFurniture = (
  f: Pick<Furniture, "x" | "y" | "width" | "height" | "rotation">,
): AABB => orientedAabb(f.x, f.y, f.width, f.height, f.rotation);

export const aabbForFloor = (
  f: Pick<FloorElement, "x" | "y" | "width" | "height" | "rotation">,
): AABB => orientedAabb(f.x, f.y, f.width, f.height, f.rotation);

export const aabbsOverlap = (a: AABB, b: AABB, slack = 0.5): boolean =>
  a.maxX - slack > b.minX &&
  b.maxX - slack > a.minX &&
  a.maxY - slack > b.minY &&
  b.maxY - slack > a.minY;

export const aabbCorners = (a: AABB): Point[] => [
  { x: a.minX, y: a.minY },
  { x: a.maxX, y: a.minY },
  { x: a.maxX, y: a.maxY },
  { x: a.minX, y: a.maxY },
];

// True iff every corner of the AABB is inside the polygon. Adequate for
// preset rooms (rectangle/L/T/U) and any reasonably sized custom shape.
export const aabbInsidePolygon = (
  a: AABB,
  vertices: Point[],
  inset = 0,
): boolean => {
  const test = inset > 0 ? inflate(a, inset) : a;
  for (const c of aabbCorners(test)) if (!pointInPolygon(c, vertices)) return false;
  return true;
};

// Inflate/deflate an AABB by `cm` on each side.
export const inflate = (a: AABB, cm: number): AABB => ({
  minX: a.minX - cm,
  minY: a.minY - cm,
  maxX: a.maxX + cm,
  maxY: a.maxY + cm,
});

export type SnapAxis = "x" | "y";
export type SnapKind = "wall" | "item";
export type SnapHit = {
  axis: SnapAxis;
  delta: number; // amount added to current center to snap
  // World-space line endpoints for the visual guide.
  guide: { a: Point; b: Point };
  kind: SnapKind;
};

// Snap an axis-aligned-AABB candidate to nearby walls and other AABBs.
//
// Strategy: collect candidate snap targets along x and y. For each axis, pick
// the smallest absolute delta within the threshold. Returns the merged
// (x, y) deltas plus visual guide segments for the active snaps.
//
// `wallInset` shifts wall snap targets inward by that amount (in cm) so items
// snap to the wall's *inner face* rather than the polygon centerline,
// matching the visible wall stroke. Defaults to half the wall thickness.
// `interiorPoint` (typically the polygon centroid) determines which side of
// each axis-aligned wall is the room interior.
export const computeSnap = (
  cand: AABB,
  walls: Wall[],
  others: AABB[],
  threshold: number,
  interiorPoint?: Point,
  wallInset: number = WALL_THICKNESS_CM / 2,
): { dx: number; dy: number; hits: SnapHit[] } => {
  const cx = (cand.minX + cand.maxX) / 2;
  const cy = (cand.minY + cand.maxY) / 2;

  type Candidate = { delta: number; guide: { a: Point; b: Point }; kind: SnapKind };
  const xCandidates: Candidate[] = [];
  const yCandidates: Candidate[] = [];

  // Walls — we only support axis-aligned walls for snapping. Diagonal walls
  // are skipped (snapping a rect to a diagonal segment looks broken).
  for (const w of walls) {
    const dx = w.b.x - w.a.x;
    const dy = w.b.y - w.a.y;
    const isVert = Math.abs(dx) < 1 && Math.abs(dy) > 1; // x = const
    const isHoriz = Math.abs(dy) < 1 && Math.abs(dx) > 1; // y = const
    if (isVert) {
      // Inner face of the wall: shift centerline by wallInset toward the room
      // interior (sign comes from comparing centroid x to wall x).
      const sign = interiorPoint
        ? Math.sign(interiorPoint.x - w.a.x) || 1
        : 0;
      const wx = w.a.x + sign * wallInset;
      // Snap the closer of the two AABB vertical edges.
      const candidates = [cand.minX, cand.maxX];
      let best: { delta: number; edge: number } | null = null;
      for (const edge of candidates) {
        const d = wx - edge;
        if (!best || Math.abs(d) < Math.abs(best.delta)) best = { delta: d, edge };
      }
      if (best && Math.abs(best.delta) < threshold) {
        // Must overlap the wall segment in y so the guide makes sense.
        const yMin = Math.min(w.a.y, w.b.y);
        const yMax = Math.max(w.a.y, w.b.y);
        if (cand.maxY > yMin && cand.minY < yMax) {
          xCandidates.push({
            delta: best.delta,
            guide: { a: { x: wx, y: cand.minY }, b: { x: wx, y: cand.maxY } },
            kind: "wall",
          });
        }
      }
    } else if (isHoriz) {
      const sign = interiorPoint
        ? Math.sign(interiorPoint.y - w.a.y) || 1
        : 0;
      const wy = w.a.y + sign * wallInset;
      const candidates = [cand.minY, cand.maxY];
      let best: { delta: number; edge: number } | null = null;
      for (const edge of candidates) {
        const d = wy - edge;
        if (!best || Math.abs(d) < Math.abs(best.delta)) best = { delta: d, edge };
      }
      if (best && Math.abs(best.delta) < threshold) {
        const xMin = Math.min(w.a.x, w.b.x);
        const xMax = Math.max(w.a.x, w.b.x);
        if (cand.maxX > xMin && cand.minX < xMax) {
          yCandidates.push({
            delta: best.delta,
            guide: { a: { x: cand.minX, y: wy }, b: { x: cand.maxX, y: wy } },
            kind: "wall",
          });
        }
      }
    }
  }

  // Other items — match each pair of edges (left/right, top/bottom) and
  // also center alignment.
  for (const o of others) {
    // Vertical edge alignments
    const xPairs: [number, number, "edge" | "center"][] = [
      [cand.minX, o.minX, "edge"],
      [cand.minX, o.maxX, "edge"],
      [cand.maxX, o.minX, "edge"],
      [cand.maxX, o.maxX, "edge"],
      [cx, (o.minX + o.maxX) / 2, "center"],
    ];
    for (const [c, t] of xPairs) {
      const delta = t - c;
      if (Math.abs(delta) < threshold) {
        const targetX = c + delta;
        const yMin = Math.min(cand.minY, o.minY);
        const yMax = Math.max(cand.maxY, o.maxY);
        xCandidates.push({
          delta,
          guide: { a: { x: targetX, y: yMin }, b: { x: targetX, y: yMax } },
          kind: "item",
        });
      }
    }
    const yPairs: [number, number, "edge" | "center"][] = [
      [cand.minY, o.minY, "edge"],
      [cand.minY, o.maxY, "edge"],
      [cand.maxY, o.minY, "edge"],
      [cand.maxY, o.maxY, "edge"],
      [cy, (o.minY + o.maxY) / 2, "center"],
    ];
    for (const [c, t] of yPairs) {
      const delta = t - c;
      if (Math.abs(delta) < threshold) {
        const targetY = c + delta;
        const xMin = Math.min(cand.minX, o.minX);
        const xMax = Math.max(cand.maxX, o.maxX);
        yCandidates.push({
          delta,
          guide: { a: { x: xMin, y: targetY }, b: { x: xMax, y: targetY } },
          kind: "item",
        });
      }
    }
  }

  const pick = (cs: Candidate[]) =>
    cs.length === 0
      ? null
      : cs.reduce((best, c) =>
          Math.abs(c.delta) < Math.abs(best.delta) ? c : best,
        );

  const bestX = pick(xCandidates);
  const bestY = pick(yCandidates);

  const hits: SnapHit[] = [];
  if (bestX) hits.push({ axis: "x", delta: bestX.delta, guide: bestX.guide, kind: bestX.kind });
  if (bestY) hits.push({ axis: "y", delta: bestY.delta, guide: bestY.guide, kind: bestY.kind });

  return { dx: bestX?.delta ?? 0, dy: bestY?.delta ?? 0, hits };
};

export const translateAabb = (a: AABB, dx: number, dy: number): AABB => ({
  minX: a.minX + dx,
  minY: a.minY + dy,
  maxX: a.maxX + dx,
  maxY: a.maxY + dy,
});
