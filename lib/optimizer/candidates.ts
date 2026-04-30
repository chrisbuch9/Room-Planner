import type { Furniture, ItemId, Wall } from "@/types/room";
import type { AABB } from "@/lib/geometry/collision";
import {
  aabbForFurniture,
  aabbInsidePolygon,
  aabbsOverlap,
  inflate,
  orientedAabb,
  WALL_THICKNESS_CM,
} from "@/lib/geometry/collision";
import { polygonBounds } from "@/lib/geometry/polygon";
import type {
  CandidatePosition,
  FixedContext,
  Placement,
} from "./types";

const MAX_PER_ITEM = 220;
const WALL_STEP_CM = 25;
const INTERIOR_STEP_CM = 35;
// Furniture sits flush with the wall's *inner* face, not the polygon
// centerline — must be ≥ aabbInsidePolygon's default inset, plus a hair so
// the validation passes.
const WALL_FLUSH_OFFSET = WALL_THICKNESS_CM / 2;

const isWallHugging = (kind: Furniture["kind"]): boolean => {
  switch (kind) {
    case "bed":
    case "sofa":
    case "dresser":
    case "cabinet":
    case "bookshelf":
    case "l-desk":
    case "desk":
      return true;
    default:
      return false;
  }
};

const isFreeStanding = (kind: Furniture["kind"]): boolean => {
  switch (kind) {
    case "chair":
    case "nightstand":
    case "custom":
      return true;
    default:
      return false;
  }
};

// Wall normal (unit) pointing into the polygon interior.
const inwardNormal = (
  wall: Wall,
  centroid: { x: number; y: number },
): { nx: number; ny: number } => {
  const wx = wall.b.x - wall.a.x;
  const wy = wall.b.y - wall.a.y;
  const len = Math.hypot(wx, wy) || 1;
  let nx = -wy / len;
  let ny = wx / len;
  // Flip so the normal points toward the centroid.
  const mid = { x: (wall.a.x + wall.b.x) / 2, y: (wall.a.y + wall.b.y) / 2 };
  if ((centroid.x - mid.x) * nx + (centroid.y - mid.y) * ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  return { nx, ny };
};

const wallAngleDeg = (wall: Wall): number =>
  (Math.atan2(wall.b.y - wall.a.y, wall.b.x - wall.a.x) * 180) / Math.PI;

// Subsample an array to at most `max` items, preserving even spread.
const subsample = <T>(arr: T[], max: number): T[] => {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(arr[Math.floor(i * step)]);
  return out;
};

// Returns valid candidate placements for `item`, given currently placed AABBs.
//
// Hard filters here: must lie inside the polygon and not overlap fixed vents,
// any already-placed furniture AABB, or any door swing region. Door swings
// were originally only scored — they're now filtered too so the optimizer
// can't ever park furniture in front of a door, regardless of preset weights.
export const generateCandidates = (
  item: Furniture,
  ctx: FixedContext,
  placedAabbs: AABB[],
): CandidatePosition[] => {
  const { walls, room, ventAabbs, doors } = ctx;
  const blockers: AABB[] = [
    ...placedAabbs,
    ...ventAabbs,
    ...doors.map((d) => d.swingAabb),
  ];
  const bounds = polygonBounds(room.vertices);
  const centroid = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };

  const candidates: CandidatePosition[] = [];
  const seen = new Set<string>();

  const addIfValid = (c: CandidatePosition): void => {
    const key = `${Math.round(c.x)}|${Math.round(c.y)}|${Math.round(c.rotation)}`;
    if (seen.has(key)) return;
    const aabb = orientedAabb(c.x, c.y, item.width, item.height, c.rotation);
    if (!aabbInsidePolygon(aabb, room.vertices)) return;
    for (const b of blockers) if (aabbsOverlap(aabb, b)) return;
    seen.add(key);
    candidates.push(c);
  };

  // Always include the original spot — gives the optimizer a "stay put" option
  // when nothing better exists.
  addIfValid({
    x: item.x,
    y: item.y,
    rotation: item.rotation,
    source: "original",
  });

  if (isWallHugging(item.kind)) {
    // Place with the *short* edge of the item perpendicular to the wall (so the
    // long edge sits along the wall, like a bed headboard or sofa back).
    // For simplicity, we always treat `height` as the wall-touching depth.
    const longSide = Math.max(item.width, item.height);
    const wallTouchingDepth = item.height; // depth perpendicular to wall

    for (const wall of walls) {
      if (wall.length < Math.min(item.width, item.height)) continue;
      const { nx, ny } = inwardNormal(wall, centroid);
      const angle = wallAngleDeg(wall);
      // Sweep along the wall in WALL_STEP_CM increments. Item center sits
      // at `(item.width / 2 + offset)` along the wall, and `(wallTouchingDepth / 2 + WALL_FLUSH_OFFSET)`
      // along the inward normal.
      const along = wallTouchingDepth / 2 + WALL_FLUSH_OFFSET;
      const halfAlong = item.width / 2;
      const maxStart = wall.length - item.width;
      if (maxStart < 0 && wall.length < longSide) continue;
      const usableEnd = Math.max(0, maxStart);
      // Step at WALL_STEP_CM. Always include the two extremes.
      const offsets: number[] = [];
      for (let o = 0; o <= usableEnd; o += WALL_STEP_CM) offsets.push(o);
      if (offsets[offsets.length - 1] !== usableEnd) offsets.push(usableEnd);
      // For beds, lock to the orientation that puts the head (local -y edge)
      // flush against the wall. Bed local +y must align with the inward
      // normal, so θ = atan2(-nx, ny). This handles both CW and CCW polygons
      // and removes the head/foot-against-wall ambiguity that was leaving
      // beds reversed half the time.
      const bedHeadRotDeg =
        item.kind === "bed"
          ? ((Math.atan2(-nx, ny) * 180) / Math.PI + 360) % 360
          : null;

      for (const offset of offsets) {
        const cosA = Math.cos((angle * Math.PI) / 180);
        const sinA = Math.sin((angle * Math.PI) / 180);
        const cx = wall.a.x + cosA * (halfAlong + offset) + nx * along;
        const cy = wall.a.y + sinA * (halfAlong + offset) + ny * along;
        if (bedHeadRotDeg !== null) {
          addIfValid({ x: cx, y: cy, rotation: bedHeadRotDeg, source: "wall" });
          continue;
        }
        addIfValid({ x: cx, y: cy, rotation: angle, source: "wall" });
        // For l-desk wall-fallback (when no corner fits), still try the 180°
        // flip so the L's elbow can face either way along the wall.
        if (item.kind === "l-desk") {
          addIfValid({
            x: cx,
            y: cy,
            rotation: (angle + 180) % 360,
            source: "wall",
          });
        }
      }
    }
  }

  if (isFreeStanding(item.kind) || candidates.length < 8) {
    // Coarse interior grid at the two main rotations.
    for (let x = bounds.minX + INTERIOR_STEP_CM; x < bounds.maxX; x += INTERIOR_STEP_CM) {
      for (let y = bounds.minY + INTERIOR_STEP_CM; y < bounds.maxY; y += INTERIOR_STEP_CM) {
        addIfValid({ x, y, rotation: 0, source: "interior" });
        addIfValid({ x, y, rotation: 90, source: "interior" });
      }
    }
  }

  return subsample(candidates, MAX_PER_ITEM);
};

// Pair-affinity helpers: position a chair just in front of the desk's
// front-facing edge, or a nightstand at the head of the bed.
export const pairCandidatesForChair = (
  chair: Furniture,
  desk: Furniture,
  ctx: FixedContext,
  placedAabbs: AABB[],
): CandidatePosition[] => {
  if (desk.kind === "l-desk") {
    // Chair sits inside the L's cut-out (the open square at the desk's local
    // upper-right quadrant), with the user at the inside of the L's elbow.
    // `arm` matches FurnitureDecoration's worktop arm thickness so the chair
    // lands centered in the *open* square, not on top of the worktop.
    const arm = Math.min(Math.min(desk.width, desk.height) * 0.42, 70);
    const localX = arm / 2;
    const localY = -arm / 2;
    // Verify the chair fits within the cut-out rect (L local frame). If it
    // doesn't, the chair would overlap the L's worktop — skip.
    const cutMinX = -desk.width / 2 + arm;
    const cutMaxX = desk.width / 2;
    const cutMinY = -desk.height / 2;
    const cutMaxY = -desk.height / 2 + (desk.height - arm);
    if (
      localX - chair.width / 2 < cutMinX ||
      localX + chair.width / 2 > cutMaxX ||
      localY - chair.height / 2 < cutMinY ||
      localY + chair.height / 2 > cutMaxY
    ) {
      return [];
    }
    const θ = (desk.rotation * Math.PI) / 180;
    const c = Math.cos(θ);
    const s = Math.sin(θ);
    const cx = desk.x + localX * c - localY * s;
    const cy = desk.y + localX * s + localY * c;
    const aabb = orientedAabb(cx, cy, chair.width, chair.height, desk.rotation);
    if (!aabbInsidePolygon(aabb, ctx.room.vertices)) return [];
    for (const b of placedAabbs) if (aabbsOverlap(aabb, b)) return [];
    return [{ x: cx, y: cy, rotation: desk.rotation, source: "pair" }];
  }

  // Regular desk: chair sits at the desk's "front" (local +y) edge.
  const rad = (desk.rotation * Math.PI) / 180;
  const fx = Math.sin(rad);
  const fy = -Math.cos(rad);
  // Negate to point toward the user (opposite of the headboard convention).
  const dx = -fx;
  const dy = -fy;
  const out: CandidatePosition[] = [];
  for (const dist of [30, 40, 55]) {
    const cx = desk.x + dx * (desk.height / 2 + chair.height / 2 + dist - 30);
    const cy = desk.y + dy * (desk.height / 2 + chair.height / 2 + dist - 30);
    const aabb = orientedAabb(cx, cy, chair.width, chair.height, desk.rotation);
    if (!aabbInsidePolygon(aabb, ctx.room.vertices)) continue;
    let blocked = false;
    for (const b of placedAabbs) if (aabbsOverlap(aabb, b)) { blocked = true; break; }
    if (blocked) continue;
    out.push({ x: cx, y: cy, rotation: desk.rotation, source: "pair" });
  }
  return out;
};

// L-desk corner placement: the L's outer corner sits at a convex 90° room
// corner so both long arms run flush along the two walls. We try both
// arm-to-wall assignments and let scoring pick the better one (e.g., closer
// to outlets, away from doors). Falls back to wall placement (handled in
// generateCandidates) if no corner fits.
export const cornerCandidatesForLDesk = (
  desk: Furniture,
  ctx: FixedContext,
  placedAabbs: AABB[],
): CandidatePosition[] => {
  const out: CandidatePosition[] = [];
  const verts = ctx.room.vertices;
  const n = verts.length;
  if (n < 3) return out;

  // Polygon orientation (signed area). In screen coords (+y down), a positive
  // shoelace sum corresponds to a *clockwise* polygon — the opposite of the
  // math convention. For CW polygons, convex corners have a positive 2D cross
  // product of the two outgoing edges; CCW polygons flip the sign.
  let signedArea = 0;
  for (let i = 0; i < n; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % n];
    signedArea += a.x * b.y - b.x * a.y;
  }
  const isCW = signedArea > 0;

  for (let i = 0; i < n; i++) {
    const v = verts[i];
    const next = verts[(i + 1) % n];
    const prev = verts[(i - 1 + n) % n];
    const dirA = normVec({ x: next.x - v.x, y: next.y - v.y });
    const dirB = normVec({ x: prev.x - v.x, y: prev.y - v.y });
    if (!dirA || !dirB) continue;

    // Only ~90° corners.
    const cosCorner = dirA.x * dirB.x + dirA.y * dirB.y;
    if (Math.abs(cosCorner) > 0.15) continue;

    // Convexity: cross > 0 for CW, < 0 for CCW. Reject reflex corners.
    const cross = dirA.x * dirB.y - dirA.y * dirB.x;
    if (isCW ? cross <= 0 : cross >= 0) continue;

    // Inset by WALL_FLUSH_OFFSET along *each* wall direction (not the
    // bisector). For a 90° corner, the wall's inward normal IS the other
    // wall's direction-from-corner, so this puts the L's outer corner at
    // the *room's inner corner* — where the two inner wall faces meet —
    // and both arms sit flush against both inner faces.
    const insetX = (dirA.x + dirB.x) * WALL_FLUSH_OFFSET;
    const insetY = (dirA.y + dirB.y) * WALL_FLUSH_OFFSET;

    for (const [arm1, arm2] of [
      [dirA, dirB],
      [dirB, dirA],
    ] as const) {
      // Bed local axes convention: rotation θ puts local +x along (cos θ,
      // sin θ) and local -y along (sin θ, -cos θ). We want local +x along
      // arm1 and local -y along arm2.
      const θ = Math.atan2(arm1.y, arm1.x);
      const myArm2 = { x: Math.sin(θ), y: -Math.cos(θ) };
      const align = myArm2.x * arm2.x + myArm2.y * arm2.y;
      if (align < 0.95) continue;

      const c = Math.cos(θ);
      const s = Math.sin(θ);
      // L-desk outer corner is local (-w/2, h/2). Solve for desk center:
      //   v = center + R_θ * (-w/2, h/2)  →  center = v - R_θ * (-w/2, h/2).
      const ox = (-desk.width / 2) * c - (desk.height / 2) * s;
      const oy = (-desk.width / 2) * s + (desk.height / 2) * c;
      const cx = v.x - ox + insetX;
      const cy = v.y - oy + insetY;
      const θdeg = ((θ * 180) / Math.PI + 360) % 360;

      const aabb = orientedAabb(cx, cy, desk.width, desk.height, θdeg);
      if (!aabbInsidePolygon(aabb, ctx.room.vertices)) continue;
      let blocked = false;
      for (const b of placedAabbs) if (aabbsOverlap(aabb, b)) { blocked = true; break; }
      if (blocked) continue;

      out.push({ x: cx, y: cy, rotation: θdeg, source: "wall" });
    }
  }
  return out;
};

const normVec = (
  v: { x: number; y: number },
): { x: number; y: number } | null => {
  const len = Math.hypot(v.x, v.y);
  if (len < 1e-6) return null;
  return { x: v.x / len, y: v.y / len };
};

export const pairCandidatesForNightstand = (
  nightstand: Furniture,
  bed: Furniture,
  ctx: FixedContext,
  placedAabbs: AABB[],
): CandidatePosition[] => {
  // Nightstands sit on the long sides of the bed, flush with the head edge
  // (bed local -y). The wall-hugging candidate generator now always orients
  // beds head-toward-wall, so local -y is unambiguously the head end and the
  // bed's wall side — the nightstand here is automatically against the same
  // wall as the headboard.
  const rad = (bed.rotation * Math.PI) / 180;
  const ex = Math.cos(rad); // bed local +x in world (along the bed's long edge)
  const ey = Math.sin(rad);
  const fx = -Math.sin(rad); // bed local +y in world (head→foot)
  const fy = Math.cos(rad);

  const sideMag = bed.width / 2 + nightstand.width / 2 + 5;
  const headLocalY = -bed.height / 2 + nightstand.height / 2;

  const out: CandidatePosition[] = [];
  for (const side of [-1, 1]) {
    const cx = bed.x + ex * side * sideMag + fx * headLocalY;
    const cy = bed.y + ey * side * sideMag + fy * headLocalY;
    const aabb = orientedAabb(
      cx,
      cy,
      nightstand.width,
      nightstand.height,
      bed.rotation,
    );
    if (!aabbInsidePolygon(aabb, ctx.room.vertices)) continue;
    let blocked = false;
    for (const b of placedAabbs) if (aabbsOverlap(aabb, b)) { blocked = true; break; }
    if (blocked) continue;
    out.push({ x: cx, y: cy, rotation: bed.rotation, source: "pair" });
  }
  return out;
};

// Build "live" placement→AABB lookup for already-placed items in this pass.
export const placementsToAabbs = (
  placements: Map<ItemId, Placement>,
  originals: Map<ItemId, Furniture>,
  inflateBy = 0,
): AABB[] => {
  const out: AABB[] = [];
  for (const [id, p] of placements) {
    const orig = originals.get(id);
    if (!orig) continue;
    const a = aabbForFurniture({
      x: p.x,
      y: p.y,
      width: orig.width,
      height: orig.height,
      rotation: p.rotation,
    });
    out.push(inflateBy ? inflate(a, inflateBy) : a);
  }
  return out;
};
