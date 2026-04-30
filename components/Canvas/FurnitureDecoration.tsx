"use client";

import { Group, Line, Rect, Circle, Arc } from "react-konva";
import type { Furniture } from "@/types/room";

type Props = {
  item: Furniture;
  scale: number;
};

// Renders blueprint-style ornamentation on top of a furniture rect, in the
// item's local coordinate system (centered on origin; +y = down, -y = "back").
// Strokes are normalized so they look ~1.2 screen-px regardless of zoom.
export default function FurnitureDecoration({ item, scale }: Props) {
  const sw = Math.max(1.2 / scale, 0.4);
  const ink = "#1b2638";
  const inkSoft = "rgba(27,38,56,0.55)";
  const w = item.width;
  const h = item.height;

  switch (item.kind) {
    case "bed": {
      // Two pillows at the "head" (-y) end. Inset slightly from edges.
      const inset = Math.min(w, h) * 0.08;
      const pillowH = Math.min(h * 0.18, 26);
      const gap = inset / 2;
      const pillowW = (w - inset * 2 - gap) / 2;
      return (
        <Group listening={false} opacity={0.85}>
          {/* Headboard band */}
          <Rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={Math.min(8, h * 0.06)}
            fill={ink}
            opacity={0.18}
          />
          <Rect
            x={-w / 2 + inset}
            y={-h / 2 + inset}
            width={pillowW}
            height={pillowH}
            fill="#fffdf7"
            stroke={inkSoft}
            strokeWidth={sw}
            cornerRadius={pillowH * 0.25}
          />
          <Rect
            x={-w / 2 + inset + pillowW + gap}
            y={-h / 2 + inset}
            width={pillowW}
            height={pillowH}
            fill="#fffdf7"
            stroke={inkSoft}
            strokeWidth={sw}
            cornerRadius={pillowH * 0.25}
          />
          {/* Mattress fold line near the foot */}
          <Line
            points={[-w / 2 + inset, h / 2 - inset * 1.5, w / 2 - inset, h / 2 - inset * 1.5]}
            stroke={inkSoft}
            strokeWidth={sw}
          />
        </Group>
      );
    }

    case "sofa": {
      // Backrest along the long top edge, plus cushion dividers.
      const isWide = w >= h;
      const backDepth = isWide ? Math.min(h * 0.28, 22) : Math.min(w * 0.28, 22);
      const cushions = 3;
      const inset = Math.min(w, h) * 0.06;
      const backX = isWide ? -w / 2 : -w / 2;
      const backY = isWide ? -h / 2 : -h / 2;
      const backW = isWide ? w : backDepth;
      const backH = isWide ? backDepth : h;
      const lines: React.ReactNode[] = [];
      if (isWide) {
        for (let i = 1; i < cushions; i++) {
          const x = -w / 2 + (w * i) / cushions;
          lines.push(
            <Line
              key={`c${i}`}
              points={[x, -h / 2 + backDepth, x, h / 2 - inset]}
              stroke={inkSoft}
              strokeWidth={sw}
            />,
          );
        }
      } else {
        for (let i = 1; i < cushions; i++) {
          const y = -h / 2 + (h * i) / cushions;
          lines.push(
            <Line
              key={`c${i}`}
              points={[-w / 2 + backDepth, y, w / 2 - inset, y]}
              stroke={inkSoft}
              strokeWidth={sw}
            />,
          );
        }
      }
      return (
        <Group listening={false}>
          <Rect
            x={backX}
            y={backY}
            width={backW}
            height={backH}
            fill={ink}
            opacity={0.18}
            cornerRadius={2}
          />
          {lines}
        </Group>
      );
    }

    case "chair": {
      // Backrest on the -y edge.
      const backDepth = Math.min(h * 0.22, 12);
      return (
        <Group listening={false}>
          <Rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={backDepth}
            fill={ink}
            opacity={0.22}
            cornerRadius={2}
          />
          <Circle
            x={0}
            y={(h - backDepth) / 2 - h * 0.05}
            radius={Math.min(w, h) * 0.18}
            stroke={inkSoft}
            strokeWidth={sw}
            opacity={0.5}
          />
        </Group>
      );
    }

    case "l-desk": {
      // Draw an L by punching the upper-right quadrant out with the paper
      // color, then outline the L. Worktop arm thickness ~40% of the smaller
      // dimension, capped at 70cm.
      const arm = Math.min(Math.min(w, h) * 0.42, 70);
      // Cut-out rect (upper-right corner): from (w/2 - cutW, -h/2) sized
      // (cutW, cutH) where the remaining "L" surface is `arm` thick.
      const cutW = w - arm;
      const cutH = h - arm;
      // L outline (closed polygon, cw):
      // (-w/2,-h/2) → (w/2 - cutW,-h/2) → (w/2 - cutW,-h/2 + cutH)
      // → (w/2,-h/2 + cutH) → (w/2, h/2) → (-w/2, h/2) → close
      const x1 = -w / 2;
      const y1 = -h / 2;
      const x2 = w / 2;
      const y2 = h / 2;
      const xCut = x2 - cutW;
      const yCut = y1 + cutH;
      return (
        <Group listening={false}>
          {/* Cut-out: paint the missing corner with the paper background.
              Using a slightly off-white to match the canvas grain. */}
          <Rect
            x={xCut}
            y={y1}
            width={cutW + 0.5}
            height={cutH + 0.5}
            fill="#fffdf7"
          />
          {/* L outline */}
          <Line
            points={[x1, y1, xCut, y1, xCut, yCut, x2, yCut, x2, y2, x1, y2]}
            closed
            stroke={ink}
            strokeWidth={sw * 1.4}
            opacity={0.85}
          />
          {/* Inner inset for worktop hint */}
          <Line
            points={[
              x1 + 4,
              y1 + 4,
              xCut - 4,
              y1 + 4,
              xCut - 4,
              yCut - 4,
              x2 - 4,
              yCut - 4,
              x2 - 4,
              y2 - 4,
              x1 + 4,
              y2 - 4,
            ]}
            closed
            stroke={inkSoft}
            strokeWidth={sw}
            opacity={0.45}
          />
          {/* Small monitor mark on the long arm */}
          <Rect
            x={x1 + 8}
            y={y2 - Math.min(h * 0.18, 14) - 4}
            width={Math.min(w * 0.3, 50)}
            height={Math.min(h * 0.12, 10)}
            fill={ink}
            opacity={0.22}
            cornerRadius={1}
          />
        </Group>
      );
    }

    case "desk": {
      // Worktop inset + a small monitor mark at -y.
      const inset = Math.min(w, h) * 0.08;
      const monW = Math.min(w * 0.35, 50);
      const monH = Math.min(h * 0.18, 12);
      return (
        <Group listening={false}>
          <Rect
            x={-w / 2 + inset}
            y={-h / 2 + inset}
            width={w - inset * 2}
            height={h - inset * 2}
            stroke={inkSoft}
            strokeWidth={sw}
            opacity={0.5}
            cornerRadius={1}
          />
          <Rect
            x={-monW / 2}
            y={-h / 2 + inset * 1.4}
            width={monW}
            height={monH}
            fill={ink}
            opacity={0.22}
            cornerRadius={1}
          />
        </Group>
      );
    }

    case "cabinet": {
      // Two stacked doors with vertical center divider and small handles.
      const isWide = w >= h;
      const lines: React.ReactNode[] = [];
      if (isWide) {
        // Vertical divider down the middle.
        lines.push(
          <Line
            key="div"
            points={[0, -h / 2 + 3, 0, h / 2 - 3]}
            stroke={inkSoft}
            strokeWidth={sw}
          />,
        );
        // Two handles, near the divider.
        lines.push(
          <Rect
            key="hL"
            x={-Math.min(w * 0.18, 14) - 2}
            y={-1}
            width={Math.min(w * 0.16, 12)}
            height={Math.max(2, sw * 1.3)}
            fill={ink}
            opacity={0.5}
            cornerRadius={1}
          />,
          <Rect
            key="hR"
            x={2}
            y={-1}
            width={Math.min(w * 0.16, 12)}
            height={Math.max(2, sw * 1.3)}
            fill={ink}
            opacity={0.5}
            cornerRadius={1}
          />,
        );
      } else {
        lines.push(
          <Line
            key="div"
            points={[-w / 2 + 3, 0, w / 2 - 3, 0]}
            stroke={inkSoft}
            strokeWidth={sw}
          />,
        );
      }
      return (
        <Group listening={false}>
          {/* Inner panel border */}
          <Rect
            x={-w / 2 + 4}
            y={-h / 2 + 4}
            width={w - 8}
            height={h - 8}
            stroke={inkSoft}
            strokeWidth={sw}
            opacity={0.5}
            cornerRadius={1}
          />
          {lines}
        </Group>
      );
    }

    case "bookshelf": {
      // Vertical book divisions along the long axis with a shelf line.
      const isWide = w >= h;
      const sections = isWide
        ? Math.max(3, Math.min(6, Math.floor(w / 25)))
        : Math.max(3, Math.min(6, Math.floor(h / 25)));
      const elements: React.ReactNode[] = [];
      // Shelf line down the center on the short axis.
      if (isWide) {
        for (let i = 1; i < sections; i++) {
          const x = -w / 2 + (w * i) / sections;
          elements.push(
            <Line
              key={`b${i}`}
              points={[x, -h / 2 + 3, x, h / 2 - 3]}
              stroke={ink}
              strokeWidth={sw}
              opacity={0.55}
            />,
          );
        }
        // Books — small alternating heights inside each section.
        for (let i = 0; i < sections; i++) {
          const sx = -w / 2 + (w * i) / sections + 3;
          const sw2 = (w / sections) - 6;
          const bookH = h * 0.6 + (i % 2) * (h * 0.1);
          elements.push(
            <Rect
              key={`bk${i}`}
              x={sx}
              y={-bookH / 2}
              width={sw2}
              height={bookH}
              fill={ink}
              opacity={0.18}
              cornerRadius={1}
            />,
          );
        }
      } else {
        for (let i = 1; i < sections; i++) {
          const y = -h / 2 + (h * i) / sections;
          elements.push(
            <Line
              key={`b${i}`}
              points={[-w / 2 + 3, y, w / 2 - 3, y]}
              stroke={ink}
              strokeWidth={sw}
              opacity={0.55}
            />,
          );
        }
      }
      return <Group listening={false}>{elements}</Group>;
    }

    case "dresser": {
      // Horizontal drawer dividers.
      const drawers = 3;
      const lines: React.ReactNode[] = [];
      for (let i = 1; i < drawers; i++) {
        const y = -h / 2 + (h * i) / drawers;
        lines.push(
          <Line
            key={`d${i}`}
            points={[-w / 2 + 4, y, w / 2 - 4, y]}
            stroke={inkSoft}
            strokeWidth={sw}
          />,
        );
      }
      // Pull handles per drawer.
      const handles: React.ReactNode[] = [];
      for (let i = 0; i < drawers; i++) {
        const cy = -h / 2 + (h * (i + 0.5)) / drawers;
        handles.push(
          <Rect
            key={`h${i}`}
            x={-Math.min(w * 0.18, 14)}
            y={cy - 1}
            width={Math.min(w * 0.36, 28)}
            height={Math.max(2, sw * 1.5)}
            fill={ink}
            opacity={0.45}
            cornerRadius={1}
          />,
        );
      }
      return (
        <Group listening={false}>
          {lines}
          {handles}
        </Group>
      );
    }

    case "nightstand": {
      const r = Math.min(w, h) * 0.22;
      return (
        <Group listening={false}>
          <Circle
            x={0}
            y={0}
            radius={r}
            stroke={inkSoft}
            strokeWidth={sw}
            opacity={0.6}
          />
          <Circle x={0} y={0} radius={r * 0.35} fill={ink} opacity={0.3} />
        </Group>
      );
    }

    case "custom":
    default: {
      // "Front" indicator: small triangle at -y edge to convey orientation.
      const tri = Math.min(w, h) * 0.12;
      return (
        <Group listening={false} opacity={0.5}>
          <Line
            points={[
              -tri,
              -h / 2 + tri * 0.6,
              0,
              -h / 2 + tri * 1.6,
              tri,
              -h / 2 + tri * 0.6,
            ]}
            stroke={inkSoft}
            strokeWidth={sw}
            closed
          />
        </Group>
      );
    }
  }
}

// Door swing arc — hinge can be on the left or right edge of the door, and
// the door can swing toward the room interior (-y) or exterior (+y).
//
// In WallElementLayer the local frame has +y pointing outward from the
// inside of the room, so "in" = -y, "out" = +y.
export function DoorDecoration({
  width,
  scale,
  hinge = "left",
  swing = "in",
}: {
  width: number;
  thickness: number;
  scale: number;
  hinge?: "left" | "right";
  swing?: "in" | "out";
}) {
  const sw = Math.max(1.2 / scale, 0.4);
  const r = width;
  // Hinge x within the wall element local frame.
  const hingeX = hinge === "left" ? -width / 2 : width / 2;
  // Door panel direction: vertical line ending at hinge ± width.
  const swingSign = swing === "in" ? -1 : 1;
  // The door panel is drawn from hinge straight out (perpendicular to wall),
  // rotated 90° toward the closed position. To keep things simple we draw the
  // open panel: from hinge to (hinge, swingSign * width).
  const panelEndY = swingSign * width;
  // Arc rotation: in Konva, rotation is in degrees, 0° = +x axis.
  // We want a 90° arc starting at the closed position (along the wall toward
  // the latch) and sweeping to the open position.
  // Closed angle (latch direction): if hinge=left, latch is at +x; if right, at -x.
  // We want the arc to sweep from closed to open. Start from latch direction,
  // sweep ±90° toward the swing side.
  let rotation: number;
  if (hinge === "left" && swing === "in") rotation = -90; // from +x sweep to -y
  else if (hinge === "left" && swing === "out") rotation = 0; // from +x sweep to +y
  else if (hinge === "right" && swing === "in") rotation = 180; // from -x sweep to -y
  else rotation = 90; // hinge=right, swing=out — from -x sweep to +y
  return (
    <Group listening={false}>
      {/* Door panel — open position. */}
      <Line
        points={[hingeX, 0, hingeX, panelEndY]}
        stroke="#1b2638"
        strokeWidth={sw * 1.4}
        opacity={0.7}
      />
      {/* Swing arc */}
      <Arc
        x={hingeX}
        y={0}
        innerRadius={r}
        outerRadius={r}
        angle={90}
        rotation={rotation}
        stroke="#1b2638"
        strokeWidth={sw}
        opacity={0.4}
        dash={[Math.max(4 / scale, 1), Math.max(3 / scale, 1)]}
      />
      {/* Hinge dot for clarity */}
      <Circle
        x={hingeX}
        y={0}
        radius={Math.max(1.5 / scale, 0.6)}
        fill="#1b2638"
        opacity={0.7}
      />
    </Group>
  );
}

// Window mullion line.
export function WindowDecoration({
  width,
  thickness,
  scale,
}: {
  width: number;
  thickness: number;
  scale: number;
}) {
  const sw = Math.max(1.2 / scale, 0.4);
  return (
    <Group listening={false}>
      <Line
        points={[-width / 2 + 1, 0, width / 2 - 1, 0]}
        stroke="#fffdf7"
        strokeWidth={sw * 1.6}
      />
    </Group>
  );
}

// Vent slats (vertical bars across the rect).
export function VentDecoration({
  width,
  height,
  scale,
}: {
  width: number;
  height: number;
  scale: number;
}) {
  const sw = Math.max(1 / scale, 0.4);
  const slats = Math.max(3, Math.min(8, Math.floor(width / 8)));
  const lines: React.ReactNode[] = [];
  for (let i = 1; i < slats; i++) {
    const x = -width / 2 + (width * i) / slats;
    lines.push(
      <Line
        key={i}
        points={[x, -height / 2 + 1, x, height / 2 - 1]}
        stroke="#fffdf7"
        strokeWidth={sw}
        opacity={0.7}
      />,
    );
  }
  return <Group listening={false}>{lines}</Group>;
}

// Floor vent — horizontal slats across the rect (perpendicular to wall vents
// to read as floor-mounted at a glance).
export function FloorVentDecoration({
  width,
  height,
  scale,
}: {
  width: number;
  height: number;
  scale: number;
}) {
  const sw = Math.max(1 / scale, 0.4);
  const slats = Math.max(3, Math.min(8, Math.floor(height / 6)));
  const lines: React.ReactNode[] = [];
  for (let i = 1; i < slats; i++) {
    const y = -height / 2 + (height * i) / slats;
    lines.push(
      <Line
        key={i}
        points={[-width / 2 + 2, y, width / 2 - 2, y]}
        stroke="#1b2638"
        strokeWidth={sw}
        opacity={0.45}
      />,
    );
  }
  return <Group listening={false}>{lines}</Group>;
}

// Carpet — diagonal weave hatch lines for an "area rug" look.
export function CarpetDecoration({
  width,
  height,
  scale,
}: {
  width: number;
  height: number;
  scale: number;
}) {
  const sw = Math.max(0.7 / scale, 0.3);
  const inset = Math.min(width, height) * 0.08;
  const w = width - inset * 2;
  const h = height - inset * 2;
  if (w <= 0 || h <= 0) return null;
  // Hatch step in cm — keeps weave readable from cozy to large rugs.
  const step = Math.max(12, Math.min(w, h) / 10);
  const lines: React.ReactNode[] = [];
  // 45° diagonals running corner-to-corner across the inner rect.
  const x0 = -w / 2;
  const y0 = -h / 2;
  const x1 = w / 2;
  const y1 = h / 2;
  // Lines of the form y = x + c, c ranges so the line crosses the rect.
  const cMin = y0 - x1;
  const cMax = y1 - x0;
  for (let c = Math.ceil(cMin / step) * step; c <= cMax; c += step) {
    // Intersect y = x + c with the rect [x0,x1] x [y0,y1].
    const xs: number[] = [];
    const ys: number[] = [];
    // Left/right edges
    let yl = x0 + c;
    if (yl >= y0 && yl <= y1) {
      xs.push(x0);
      ys.push(yl);
    }
    let yr = x1 + c;
    if (yr >= y0 && yr <= y1) {
      xs.push(x1);
      ys.push(yr);
    }
    // Top/bottom edges
    let xt = y0 - c;
    if (xt >= x0 && xt <= x1) {
      xs.push(xt);
      ys.push(y0);
    }
    let xb = y1 - c;
    if (xb >= x0 && xb <= x1) {
      xs.push(xb);
      ys.push(y1);
    }
    if (xs.length >= 2) {
      lines.push(
        <Line
          key={`d${c.toFixed(1)}`}
          points={[xs[0], ys[0], xs[1], ys[1]]}
          stroke="#8a7d4d"
          strokeWidth={sw}
          opacity={0.35}
        />,
      );
    }
  }
  return <Group listening={false}>{lines}</Group>;
}

// Outlet prongs (two small circles on the wall-facing surface).
export function OutletDecoration({
  width,
  thickness,
  scale,
}: {
  width: number;
  thickness: number;
  scale: number;
}) {
  const sw = Math.max(0.8 / scale, 0.3);
  const r = Math.min(thickness, width) * 0.14;
  const dx = Math.min(width * 0.22, 4);
  return (
    <Group listening={false}>
      <Circle
        x={-dx}
        y={0}
        radius={r}
        fill="#1b2638"
        stroke="#fffdf7"
        strokeWidth={sw}
      />
      <Circle
        x={dx}
        y={0}
        radius={r}
        fill="#1b2638"
        stroke="#fffdf7"
        strokeWidth={sw}
      />
    </Group>
  );
}
