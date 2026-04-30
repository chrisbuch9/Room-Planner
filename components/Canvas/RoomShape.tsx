"use client";

import { Group, Line, Text } from "react-konva";
import type { Wall } from "@/types/room";
import { formatLength } from "@/lib/geometry/units";
import { WALL_THICKNESS_CM } from "@/lib/geometry/collision";

type Props = {
  vertices: { x: number; y: number }[]; // cm
  walls: Wall[];
  scale: number; // px per cm
};

// Renders the room polygon and draws each wall length label.
export default function RoomShape({ vertices, walls, scale }: Props) {
  const flat = vertices.flatMap((v) => [v.x, v.y]);

  return (
    <Group listening={false}>
      {/* Wall body — stroke width is the real wall thickness in cm so it
          stays consistent with placement validation at every zoom level. */}
      <Line
        points={flat}
        closed
        fill="#fffdf7"
        stroke="#1b2638"
        strokeWidth={Math.max(WALL_THICKNESS_CM, 1.5 / scale)}
        lineJoin="miter"
      />
      {/* Inner hairline — adds a subtle double-line at strong zooms. */}
      <Line
        points={flat}
        closed
        stroke="#3c5475"
        strokeWidth={Math.max(0.6 / scale, 0.4)}
        lineJoin="miter"
        opacity={0.6}
      />
      {walls.map((w) => {
        const mx = (w.a.x + w.b.x) / 2;
        const my = (w.a.y + w.b.y) / 2;
        // Outward normal of the wall (room is treated as clockwise; flip if needed)
        const nx = Math.sin(w.angle);
        const ny = -Math.cos(w.angle);
        const off = 16 / scale;
        const label = formatLength(w.length, "cm");
        return (
          <Text
            key={w.index}
            x={mx + nx * off}
            y={my + ny * off}
            text={label}
            fontSize={12 / scale}
            fontFamily="JetBrains Mono, ui-monospace, monospace"
            fill="#3c5475"
            offsetX={(label.length * 6) / 2 / scale}
            offsetY={6 / scale}
          />
        );
      })}
    </Group>
  );
}
