import type { Point, Wall } from "@/types/room";

export const dist = (a: Point, b: Point): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

export const wallsFromVertices = (vertices: Point[]): Wall[] => {
  const walls: Wall[] = [];
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    walls.push({
      index: i,
      a,
      b,
      length: dist(a, b),
      angle: Math.atan2(b.y - a.y, b.x - a.x),
    });
  }
  return walls;
};

export const polygonBounds = (vertices: Point[]) => {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const v of vertices) {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.x > maxX) maxX = v.x;
    if (v.y > maxY) maxY = v.y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
};

// Standard ray-cast point-in-polygon (vertices in any order).
export const pointInPolygon = (p: Point, vertices: Point[]): boolean => {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x,
      yi = vertices[i].y;
    const xj = vertices[j].x,
      yj = vertices[j].y;
    const intersect =
      yi > p.y !== yj > p.y &&
      p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

// Returns (t, point) for the closest point on segment ab to p, with t in [0,1].
export const closestPointOnSegment = (
  p: Point,
  a: Point,
  b: Point,
): { t: number; point: Point; dist: number } => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const point = { x: a.x + t * dx, y: a.y + t * dy };
  return { t, point, dist: Math.hypot(p.x - point.x, p.y - point.y) };
};

export const nearestWall = (p: Point, walls: Wall[]) => {
  let best: { wall: Wall; t: number; point: Point; dist: number } | null = null;
  for (const w of walls) {
    const r = closestPointOnSegment(p, w.a, w.b);
    if (!best || r.dist < best.dist) best = { wall: w, ...r };
  }
  return best;
};

// Resize a wall by moving its end vertex along the wall direction.
//
// For axis-aligned walls (the common case for preset rooms), other vertices
// that lie on the same perpendicular "rail" as the moved endpoint are shifted
// along too — so a rectangle stays rectangular when you resize one side, and
// an L-shape's right-side rail stays straight when you widen its top wall.
//
// For diagonal walls, only the end vertex moves.
export const setWallLength = (
  vertices: Point[],
  wallIndex: number,
  newLength: number,
): Point[] => {
  const n = vertices.length;
  if (n < 2 || wallIndex < 0 || wallIndex >= n) return vertices;
  const a = vertices[wallIndex];
  const b = vertices[(wallIndex + 1) % n];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const oldLength = Math.hypot(dx, dy);
  if (oldLength < 0.5) return vertices;
  const delta = newLength - oldLength;
  if (Math.abs(delta) < 0.5) return vertices;

  const ux = dx / oldLength;
  const uy = dy / oldLength;
  const isHoriz = Math.abs(uy) < 1e-3;
  const isVert = Math.abs(ux) < 1e-3;

  if (isHoriz) {
    const xRef = b.x;
    return vertices.map((v) =>
      Math.abs(v.x - xRef) < 0.5 ? { x: v.x + ux * delta, y: v.y } : v,
    );
  }
  if (isVert) {
    const yRef = b.y;
    return vertices.map((v) =>
      Math.abs(v.y - yRef) < 0.5 ? { x: v.x, y: v.y + uy * delta } : v,
    );
  }
  // Diagonal wall: just slide the end vertex.
  const next = (wallIndex + 1) % n;
  return vertices.map((v, i) =>
    i === next ? { x: v.x + ux * delta, y: v.y + uy * delta } : v,
  );
};
