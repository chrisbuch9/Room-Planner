"use client";

import { useEffect, useMemo, useRef } from "react";
import { Circle, Group, Rect, Text, Transformer } from "react-konva";
import type Konva from "konva";
import type { FloorElement } from "@/types/room";
import { useRoomStore } from "@/lib/store/useRoomStore";
import { snapAngle } from "@/lib/geometry/snapping";
import {
  FloorVentDecoration,
  CarpetDecoration,
} from "./FurnitureDecoration";

type Props = { scale: number };

const COLORS: Record<FloorElement["kind"], string> = {
  "floor-vent": "#a8a392",
  carpet: "#cbb89e",
  "circle-carpet": "#cbb89e",
};

export default function FloorElementLayer({ scale }: Props) {
  const items = useRoomStore((s) => s.items);
  const selectedId = useRoomStore((s) => s.selectedId);
  const select = useRoomStore((s) => s.select);
  const updateItem = useRoomStore((s) => s.updateItem);

  // Carpets render below other floor elements so vents/etc draw on top of them.
  const floors = useMemo(() => {
    const all = items.filter(
      (i): i is FloorElement => i.type === "floor-element",
    );
    const isCarpetKind = (k: FloorElement["kind"]) =>
      k === "carpet" || k === "circle-carpet";
    return [
      ...all.filter((f) => isCarpetKind(f.kind)),
      ...all.filter((f) => !isCarpetKind(f.kind)),
    ];
  }, [items]);

  return (
    <Group>
      {floors.map((el) => (
        <FloorEl
          key={el.id}
          item={el}
          selected={el.id === selectedId}
          scale={scale}
          onSelect={() => select(el.id)}
          onChange={(p) => updateItem(el.id, p)}
        />
      ))}
    </Group>
  );
}

function FloorEl({
  item,
  selected,
  scale,
  onSelect,
  onChange,
}: {
  item: FloorElement;
  selected: boolean;
  scale: number;
  onSelect: () => void;
  onChange: (p: Partial<FloorElement>) => void;
}) {
  const groupRef = useRef<Konva.Group | null>(null);
  const trRef = useRef<Konva.Transformer | null>(null);

  useEffect(() => {
    if (selected && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selected]);

  const isCarpet = item.kind === "carpet";
  const isCircleCarpet = item.kind === "circle-carpet";
  const minSize = isCarpet || isCircleCarpet ? 20 : 2;

  return (
    <>
      <Group
        ref={groupRef}
        x={item.x}
        y={item.y}
        rotation={item.rotation}
        draggable
        onMouseDown={(e) => {
          e.cancelBubble = true;
          onSelect();
        }}
        onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={() => {
          const node = groupRef.current;
          if (!node) return;
          const sx = node.scaleX();
          const sy = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          let rotation = node.rotation();
          const evt = (window.event as KeyboardEvent | undefined) ?? null;
          if (evt && evt.shiftKey) rotation = snapAngle(rotation, 15);
          onChange({
            x: node.x(),
            y: node.y(),
            width: Math.max(minSize, item.width * sx),
            height: Math.max(minSize, item.height * sy),
            rotation,
          });
        }}
      >
        {isCircleCarpet ? (
          <>
            <Circle
              x={0}
              y={0}
              radius={Math.min(item.width, item.height) / 2}
              fill={COLORS[item.kind]}
              opacity={0.55}
              stroke={selected ? "#577e64" : "#8a7d4d"}
              strokeWidth={Math.max(1.5 / scale, 0.5)}
              dash={[Math.max(8 / scale, 1), Math.max(6 / scale, 1)]}
            />
            <Circle
              x={0}
              y={0}
              radius={
                Math.min(item.width, item.height) / 2 -
                Math.min(item.width, item.height) * 0.08
              }
              stroke="#8a7d4d"
              strokeWidth={Math.max(1 / scale, 0.5)}
              opacity={0.4}
              listening={false}
            />
            <Text
              text={item.label}
              x={-item.width / 2}
              y={-Math.max(11, Math.min(item.width, item.height) * 0.07) / 2}
              width={item.width}
              align="center"
              fontSize={Math.max(11, Math.min(item.width, item.height) * 0.07)}
              fill="#544a31"
              opacity={0.7}
              listening={false}
            />
          </>
        ) : isCarpet ? (
          <>
            <Rect
              x={-item.width / 2}
              y={-item.height / 2}
              width={item.width}
              height={item.height}
              fill={COLORS[item.kind]}
              opacity={0.55}
              stroke={selected ? "#577e64" : "#8a7d4d"}
              strokeWidth={Math.max(1.5 / scale, 0.5)}
              dash={[
                Math.max(8 / scale, 1),
                Math.max(6 / scale, 1),
              ]}
              cornerRadius={Math.max(4 / scale, 1)}
            />
            {/* Inset border for an "area rug" double-line effect. */}
            <Rect
              x={-item.width / 2 + Math.min(item.width, item.height) * 0.08}
              y={-item.height / 2 + Math.min(item.width, item.height) * 0.08}
              width={item.width - Math.min(item.width, item.height) * 0.16}
              height={item.height - Math.min(item.width, item.height) * 0.16}
              stroke="#8a7d4d"
              strokeWidth={Math.max(1 / scale, 0.5)}
              opacity={0.4}
              cornerRadius={Math.max(3 / scale, 1)}
              listening={false}
            />
            <CarpetDecoration
              width={item.width}
              height={item.height}
              scale={scale}
            />
            <Text
              text={item.label}
              x={-item.width / 2}
              y={-item.height / 2}
              width={item.width}
              height={item.height}
              align="center"
              verticalAlign="middle"
              fontSize={Math.max(11, Math.min(item.width, item.height) * 0.07)}
              fill="#544a31"
              opacity={0.7}
              listening={false}
            />
          </>
        ) : (
          <>
            <Rect
              x={-item.width / 2}
              y={-item.height / 2}
              width={item.width}
              height={item.height}
              fill={COLORS[item.kind]}
              stroke={selected ? "#577e64" : "#3c5475"}
              strokeWidth={Math.max(1.5 / scale, 0.5)}
              cornerRadius={2}
            />
            {item.kind === "floor-vent" && (
              <FloorVentDecoration
                width={item.width}
                height={item.height}
                scale={scale}
              />
            )}
            <Text
              text={item.label}
              x={-item.width / 2}
              y={-item.height / 2}
              width={item.width}
              height={item.height}
              align="center"
              verticalAlign="middle"
              fontSize={Math.max(9, Math.min(item.width, item.height) * 0.25)}
              fill="#1b2638"
              listening={false}
            />
          </>
        )}
      </Group>
      {selected && (
        <Transformer
          ref={trRef}
          rotateEnabled
          keepRatio={false}
          ignoreStroke
          anchorSize={8}
          borderStroke="#577e64"
          anchorStroke="#577e64"
          anchorFill="#ffffff"
          rotateAnchorOffset={20}
          boundBoxFunc={(oldBox, newBox) =>
            newBox.width < minSize || newBox.height < minSize ? oldBox : newBox
          }
        />
      )}
    </>
  );
}
