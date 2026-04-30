"use client";

import { useEffect, useRef, useState } from "react";
import { Group, Line, Rect, Text, Transformer } from "react-konva";
import type Konva from "konva";
import type { Furniture, Point } from "@/types/room";
import { useRoomStore } from "@/lib/store/useRoomStore";
import { polygonBounds, wallsFromVertices } from "@/lib/geometry/polygon";
import { getPreset } from "@/lib/presets/furniture";
import {
  SNAP_ANGLE_DEG,
  SNAP_GRID_CM,
  snapAngle,
  snapToStep,
} from "@/lib/geometry/snapping";
import {
  aabbForFurniture,
  aabbForFloor,
  aabbInsidePolygon,
  aabbsOverlap,
  computeSnap,
  orientedAabb,
} from "@/lib/geometry/collision";
import FurnitureDecoration from "./FurnitureDecoration";

const SNAP_COLOR = "#577e64";
const COLLISION_COLOR = "#b14b4b";
const AUTO_SNAP_THRESHOLD_CM = 12;

type Props = {
  item: Furniture;
  selected: boolean;
  scale: number;
  previewing?: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<Furniture>) => void;
};

type Guide = { a: Point; b: Point };

export default function FurnitureItem({
  item,
  selected,
  scale,
  previewing = false,
  onSelect,
  onChange,
}: Props) {
  const groupRef = useRef<Konva.Group | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const [snapping, setSnapping] = useState(false);
  const [snapHint, setSnapHint] = useState<string | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [colliding, setColliding] = useState(false);
  const lastValidRef = useRef<{ x: number; y: number }>({ x: item.x, y: item.y });
  const fill = getPreset(item.kind)?.color ?? "#ece6d4";

  useEffect(() => {
    lastValidRef.current = { x: item.x, y: item.y };
  }, [item.x, item.y]);

  useEffect(() => {
    if (selected && transformerRef.current && groupRef.current) {
      transformerRef.current.nodes([groupRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selected]);

  // Resolve drag position with snap + collision against the live store state.
  const resolveDrag = (
    px: number,
    py: number,
    shiftKey: boolean,
  ): {
    x: number;
    y: number;
    snapped: boolean;
    hint: string | null;
    guides: Guide[];
    valid: boolean;
  } => {
    const state = useRoomStore.getState();
    const room = state.room;
    const snapEnabled = state.snapEnabled;
    const others = state.items;

    let x = px;
    let y = py;
    let hint: string | null = null;
    let snapped = false;
    let nextGuides: Guide[] = [];

    // Shift → snap to 5cm grid (overrides auto-snap, easier to predict).
    if (shiftKey) {
      x = snapToStep(x, SNAP_GRID_CM);
      y = snapToStep(y, SNAP_GRID_CM);
      snapped = true;
      hint = `${SNAP_GRID_CM} cm grid`;
    } else if (snapEnabled && room) {
      // Auto-snap to walls + other AABBs.
      const cand = orientedAabb(x, y, item.width, item.height, item.rotation);
      const walls = wallsFromVertices(room.vertices);
      const otherAabbs = others
        .filter((it) => it.id !== item.id)
        .map((it) => {
          if (it.type === "furniture") return aabbForFurniture(it);
          if (it.type === "floor-element") return aabbForFloor(it);
          return null;
        })
        .filter((a): a is NonNullable<typeof a> => a !== null);
      const b = polygonBounds(room.vertices);
      const center = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
      const { dx, dy, hits } = computeSnap(
        cand,
        walls,
        otherAabbs,
        AUTO_SNAP_THRESHOLD_CM,
        center,
      );
      if (dx !== 0 || dy !== 0) {
        x += dx;
        y += dy;
        snapped = true;
        const labels: string[] = [];
        if (hits.some((h) => h.kind === "wall")) labels.push("wall");
        if (hits.some((h) => h.kind === "item")) labels.push("item");
        hint = labels.join(" + ");
        nextGuides = hits.map((h) => h.guide);
      }
    }

    // Validate placement: AABB must lie fully inside the room polygon and not
    // overlap any other furniture AABB.
    let valid = true;
    if (room) {
      const cand = orientedAabb(x, y, item.width, item.height, item.rotation);
      if (!aabbInsidePolygon(cand, room.vertices)) valid = false;
      if (valid) {
        for (const it of others) {
          if (it.id === item.id) continue;
          if (it.type !== "furniture") continue;
          const other = aabbForFurniture(it);
          if (aabbsOverlap(cand, other)) {
            valid = false;
            break;
          }
        }
      }
    }

    return { x, y, snapped, hint, guides: nextGuides, valid };
  };

  return (
    <>
      <Group
        ref={groupRef}
        x={item.x}
        y={item.y}
        rotation={item.rotation}
        offsetX={0}
        offsetY={0}
        draggable={!previewing}
        listening={!previewing}
        opacity={previewing ? 0.85 : 1}
        onMouseDown={(e) => {
          if (previewing) return;
          e.cancelBubble = true;
          onSelect();
        }}
        onTap={previewing ? undefined : onSelect}
        onDragStart={() => {
          lastValidRef.current = { x: item.x, y: item.y };
        }}
        onDragMove={(e) => {
          const node = e.target;
          const evt = e.evt as MouseEvent | undefined;
          const shift = !!(evt && evt.shiftKey);
          const r = resolveDrag(node.x(), node.y(), shift);
          if (r.valid) {
            lastValidRef.current = { x: r.x, y: r.y };
            node.position({ x: r.x, y: r.y });
            setColliding(false);
          } else {
            // Hold the node at the last valid spot to convey "blocked".
            node.position(lastValidRef.current);
            setColliding(true);
          }
          setSnapping(r.snapped);
          setSnapHint(r.hint);
          setGuides(r.guides);
        }}
        onDragEnd={() => {
          const node = groupRef.current;
          if (!node) return;
          const pos = lastValidRef.current;
          node.position(pos);
          setSnapping(false);
          setSnapHint(null);
          setGuides([]);
          setColliding(false);
          onChange({ x: pos.x, y: pos.y });
        }}
        onTransform={() => {
          const node = groupRef.current;
          if (!node) return;
          const evt = (window.event as KeyboardEvent | undefined) ?? null;
          if (evt && evt.shiftKey) {
            const snapped = snapAngle(node.rotation(), SNAP_ANGLE_DEG);
            node.rotation(snapped);
            setSnapping(true);
            setSnapHint(`${SNAP_ANGLE_DEG}° rotation`);
          } else if (snapping) {
            setSnapping(false);
            setSnapHint(null);
          }
        }}
        onTransformEnd={() => {
          const node = groupRef.current;
          if (!node) return;
          const sx = node.scaleX();
          const sy = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          let rotation = node.rotation();
          const evt = (window.event as KeyboardEvent | undefined) ?? null;
          if (evt && evt.shiftKey) rotation = snapAngle(rotation, SNAP_ANGLE_DEG);
          setSnapping(false);
          setSnapHint(null);
          onChange({
            x: node.x(),
            y: node.y(),
            width: Math.max(5, item.width * sx),
            height: Math.max(5, item.height * sy),
            rotation,
          });
        }}
      >
        <Rect
          x={-item.width / 2}
          y={-item.height / 2}
          width={item.width}
          height={item.height}
          fill={fill}
          stroke={
            colliding
              ? COLLISION_COLOR
              : snapping
                ? SNAP_COLOR
                : selected
                  ? "#1b2638"
                  : "#4d6a8e"
          }
          strokeWidth={Math.max(
            (colliding || snapping ? 2.2 : 1.5) / scale,
            0.5,
          )}
          cornerRadius={Math.min(4, Math.min(item.width, item.height) * 0.05)}
        />
        <FurnitureDecoration item={item} scale={scale} />
        <Text
          text={item.label}
          x={-item.width / 2}
          y={-item.height / 2}
          width={item.width}
          height={item.height}
          align="center"
          verticalAlign="middle"
          fontSize={Math.max(11, Math.min(item.width, item.height) * 0.13)}
          fill="#1b2638"
          opacity={0.85}
          listening={false}
        />
        {(snapping || colliding) && snapHint && (
          <Text
            text={
              colliding ? "⛔ blocked" : snapHint ? `⤓ ${snapHint}` : ""
            }
            x={-item.width / 2}
            y={item.height / 2 + 4 / scale}
            width={item.width}
            align="center"
            fontSize={11 / scale}
            fontFamily="JetBrains Mono, ui-monospace, monospace"
            fill={colliding ? COLLISION_COLOR : SNAP_COLOR}
            listening={false}
          />
        )}
      </Group>

      {/* Snap guides — drawn in world coords, outside the rotated group. */}
      {guides.map((g, i) => (
        <Line
          key={i}
          points={[g.a.x, g.a.y, g.b.x, g.b.y]}
          stroke={SNAP_COLOR}
          strokeWidth={Math.max(1 / scale, 0.5)}
          dash={[Math.max(6 / scale, 1), Math.max(4 / scale, 1)]}
          opacity={0.7}
          listening={false}
        />
      ))}

      {selected && (
        <Transformer
          ref={transformerRef}
          rotateEnabled
          keepRatio={false}
          ignoreStroke
          anchorSize={8}
          borderStroke={snapping ? SNAP_COLOR : "#1b2638"}
          anchorStroke={snapping ? SNAP_COLOR : "#1b2638"}
          anchorFill="#ffffff"
          rotateAnchorOffset={24}
          boundBoxFunc={(_oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) return _oldBox;
            return newBox;
          }}
        />
      )}
    </>
  );
}

