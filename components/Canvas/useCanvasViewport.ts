"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Room } from "@/types/room";
import { polygonBounds } from "@/lib/geometry/polygon";

// Manages container size + pan/zoom. Scale is canvas pixels per cm.
export function useCanvasViewport(room: Room | null) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const fitDoneRef = useRef(false);
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const offsetRef = useRef(offset);
  offsetRef.current = offset;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const fitToView = useCallback(() => {
    if (!room) return;
    const sz = sizeRef.current;
    if (!sz.w || !sz.h) return;
    const b = polygonBounds(room.vertices);
    const pad = 80;
    const fitX = (sz.w - pad * 2) / Math.max(b.width, 1);
    const fitY = (sz.h - pad * 2) / Math.max(b.height, 1);
    const s = Math.min(fitX, fitY);
    setScale(s);
    setOffset({
      x: (sz.w - b.width * s) / 2 - b.minX * s,
      y: (sz.h - b.height * s) / 2 - b.minY * s,
    });
  }, [room]);

  // Zoom by a factor, optionally pinned to a screen-space pivot.
  const zoomBy = useCallback((factor: number, pivot?: { x: number; y: number }) => {
    const sz = sizeRef.current;
    const pv = pivot ?? { x: sz.w / 2, y: sz.h / 2 };
    const old = scaleRef.current;
    const next = Math.max(0.05, Math.min(20, old * factor));
    if (next === old) return;
    const cmX = (pv.x - offsetRef.current.x) / old;
    const cmY = (pv.y - offsetRef.current.y) / old;
    setScale(next);
    setOffset({ x: pv.x - cmX * next, y: pv.y - cmY * next });
  }, []);

  // Fit-to-view once when the room and size are first known.
  useEffect(() => {
    if (!room || !size.w || !size.h || fitDoneRef.current) return;
    fitToView();
    fitDoneRef.current = true;
  }, [room, size, fitToView]);

  return {
    containerRef,
    size,
    scale,
    setScale,
    offset,
    setOffset,
    fitToView,
    zoomBy,
  };
}
