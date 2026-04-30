"use client";

import { useMemo, useRef } from "react";
import { Stage, Layer } from "react-konva";
import type Konva from "konva";
import { useRoomStore } from "@/lib/store/useRoomStore";
import { wallsFromVertices } from "@/lib/geometry/polygon";
import { useCanvasViewport } from "./useCanvasViewport";
import Grid from "./Grid";
import RoomShape from "./RoomShape";
import FurnitureLayer from "./FurnitureLayer";
import WallElementLayer from "./WallElementLayer";
import FloorElementLayer from "./FloorElementLayer";
import StatusBar from "@/components/Layout/StatusBar";

export default function RoomCanvasInner() {
  const room = useRoomStore((s) => s.room);
  const select = useRoomStore((s) => s.select);
  const {
    containerRef,
    size,
    scale,
    offset,
    setOffset,
    fitToView,
    zoomBy,
  } = useCanvasViewport(room);

  const stageRef = useRef<Konva.Stage | null>(null);
  const isPanningRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

  const walls = useMemo(
    () => (room ? wallsFromVertices(room.vertices) : []),
    [room],
  );

  if (!room) return null;

  const onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    zoomBy(1 + direction * 0.1, pointer);
  };

  const onMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 1 || e.evt.button === 2) {
      isPanningRef.current = true;
      lastPointerRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      return;
    }
    if (e.target === e.target.getStage()) {
      select(null);
    }
  };

  const onMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isPanningRef.current || !lastPointerRef.current) return;
    const dx = e.evt.clientX - lastPointerRef.current.x;
    const dy = e.evt.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.evt.clientX, y: e.evt.clientY };
    setOffset({ x: offset.x + dx, y: offset.y + dy });
  };

  const onMouseUp = () => {
    isPanningRef.current = false;
    lastPointerRef.current = null;
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div
        ref={containerRef}
        className="flex-1 min-h-0 relative bg-paper-grain"
        onContextMenu={(e) => e.preventDefault()}
      >
        {size.w > 0 && size.h > 0 && (
          <Stage
            ref={stageRef}
            width={size.w}
            height={size.h}
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
          >
            <Layer listening={false}>
              <Grid
                width={size.w}
                height={size.h}
                scale={scale}
                offsetX={offset.x}
                offsetY={offset.y}
              />
            </Layer>
            <Layer x={offset.x} y={offset.y} scaleX={scale} scaleY={scale}>
              <RoomShape vertices={room.vertices} walls={walls} scale={scale} />
              <FloorElementLayer scale={scale} />
              <FurnitureLayer scale={scale} />
              <WallElementLayer walls={walls} scale={scale} />
            </Layer>
          </Stage>
        )}
      </div>
      <StatusBar
        scale={scale}
        onZoomIn={() => zoomBy(1.2)}
        onZoomOut={() => zoomBy(1 / 1.2)}
        onZoomFit={fitToView}
      />
    </div>
  );
}
