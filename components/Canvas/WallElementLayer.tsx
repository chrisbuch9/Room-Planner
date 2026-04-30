"use client";

import { useState } from "react";
import { Group, Line, Rect, Text } from "react-konva";
import type Konva from "konva";
import type { Wall, WallElement } from "@/types/room";
import { useRoomStore } from "@/lib/store/useRoomStore";
import { nearestWall } from "@/lib/geometry/polygon";
import { clamp } from "@/lib/geometry/snapping";
import {
  DoorDecoration,
  WindowDecoration,
  VentDecoration,
  OutletDecoration,
} from "./FurnitureDecoration";

type Props = { walls: Wall[]; scale: number };

const COLORS: Record<WallElement["kind"], string> = {
  door: "#8a5a2b",
  window: "#4d6a8e",
  "wall-vent": "#6b6557",
  outlet: "#dcc56a",
};

const SNAP_COLOR = "#577e64";

export default function WallElementLayer({ walls, scale }: Props) {
  const items = useRoomStore((s) => s.items);
  const selectedId = useRoomStore((s) => s.selectedId);
  const select = useRoomStore((s) => s.select);
  const updateItem = useRoomStore((s) => s.updateItem);
  const [snapWallIndex, setSnapWallIndex] = useState<number | null>(null);

  const wallElements = items.filter(
    (i): i is WallElement => i.type === "wall-element",
  );

  const snapWall =
    snapWallIndex !== null ? walls[snapWallIndex] ?? null : null;

  return (
    <Group>
      {/* Highlight overlay — drawn under the elements so they read on top. */}
      {snapWall && (
        <Line
          points={[snapWall.a.x, snapWall.a.y, snapWall.b.x, snapWall.b.y]}
          stroke={SNAP_COLOR}
          strokeWidth={Math.max(6 / scale, 2)}
          opacity={0.55}
          lineCap="round"
          listening={false}
        />
      )}
      {wallElements.map((el) => {
        const wall = walls[el.wallIndex];
        if (!wall) return null;
        const selected = el.id === selectedId;

        // Position at start of element along wall.
        const angle = wall.angle;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const cx = wall.a.x + cos * (el.offsetAlongWall + el.width / 2);
        const cy = wall.a.y + sin * (el.offsetAlongWall + el.width / 2);

        const onDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
          const node = e.target;
          const px = node.x();
          const py = node.y();
          const result = nearestWall({ x: px, y: py }, walls);
          if (!result) return;
          const newWall = result.wall;
          const proj =
            (px - newWall.a.x) * Math.cos(newWall.angle) +
            (py - newWall.a.y) * Math.sin(newWall.angle);
          const offset = clamp(
            proj - el.width / 2,
            0,
            Math.max(0, newWall.length - el.width),
          );
          // Snap visual node back to wall position so it doesn't drift off.
          const snappedCx =
            newWall.a.x + Math.cos(newWall.angle) * (offset + el.width / 2);
          const snappedCy =
            newWall.a.y + Math.sin(newWall.angle) * (offset + el.width / 2);
          node.position({ x: snappedCx, y: snappedCy });
          node.rotation((newWall.angle * 180) / Math.PI);
          setSnapWallIndex(newWall.index);
          // Stash updates onto the node so onDragEnd can commit.
          (node as unknown as { _pendingWall?: number })._pendingWall =
            newWall.index;
          (node as unknown as { _pendingOffset?: number })._pendingOffset =
            offset;
        };

        const onDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
          const node = e.target;
          const wallIndex =
            (node as unknown as { _pendingWall?: number })._pendingWall ??
            el.wallIndex;
          const offset =
            (node as unknown as { _pendingOffset?: number })._pendingOffset ??
            el.offsetAlongWall;
          setSnapWallIndex(null);
          updateItem(el.id, {
            wallIndex,
            offsetAlongWall: offset,
          } as Partial<WallElement>);
        };

        return (
          <Group
            key={el.id}
            x={cx}
            y={cy}
            rotation={(angle * 180) / Math.PI}
            draggable
            onMouseDown={(e) => {
              e.cancelBubble = true;
              select(el.id);
            }}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
          >
            <Rect
              x={-el.width / 2}
              y={-el.thickness / 2}
              width={el.width}
              height={el.thickness}
              fill={COLORS[el.kind]}
              opacity={el.kind === "window" ? 0.7 : 1}
              stroke={selected ? "#577e64" : "#1b2638"}
              strokeWidth={Math.max(1.5 / scale, 0.5)}
            />
            {el.kind === "door" && (
              <DoorDecoration
                width={el.width}
                thickness={el.thickness}
                scale={scale}
                hinge={el.hinge ?? "left"}
                swing={el.swing ?? "in"}
              />
            )}
            {el.kind === "window" && (
              <WindowDecoration
                width={el.width}
                thickness={el.thickness}
                scale={scale}
              />
            )}
            {el.kind === "wall-vent" && (
              <VentDecoration
                width={el.width}
                height={el.thickness}
                scale={scale}
              />
            )}
            {el.kind === "outlet" && (
              <OutletDecoration
                width={el.width}
                thickness={el.thickness}
                scale={scale}
              />
            )}
            <Text
              text={el.label}
              x={-el.width / 2}
              y={el.thickness / 2 + 3}
              width={el.width}
              height={Math.max(el.thickness, 14)}
              align="center"
              fontSize={Math.max(9, Math.min(el.thickness, 12))}
              fill="#1b2638"
              opacity={0.7}
              listening={false}
            />
          </Group>
        );
      })}
    </Group>
  );
}
