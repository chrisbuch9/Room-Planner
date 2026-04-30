"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Undo2, RotateCcw, Pencil } from "lucide-react";
import { useRoomStore } from "@/lib/store/useRoomStore";
import type { Point } from "@/types/room";
import Button from "@/components/ui/Button";
import NumberInput from "@/components/ui/NumberInput";
import UnitToggle from "@/components/ui/UnitToggle";
import type { DisplayUnit } from "@/lib/geometry/units";
import { polygonBounds } from "@/lib/geometry/polygon";

const STAGE_W = 480;
const STAGE_H = 320;
const CLOSE_RADIUS_PX = 14;
const ANGLE_SNAP_DEG = 15;

type Phase = "draw" | "edit";
type Transform = { scale: number; ox: number; oy: number };
type Snap =
  | { kind: "close"; point: Point }
  | { kind: "place"; point: Point };

export default function PolygonDrawer() {
  const setRoom = useRoomStore((s) => s.setRoom);
  const [phase, setPhase] = useState<Phase>("draw");
  const [unit, setUnit] = useState<DisplayUnit>("cm");
  const [vertices, setVertices] = useState<Point[]>([]);
  const [cursorScreen, setCursorScreen] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [shiftHeld, setShiftHeld] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [frozenTransform, setFrozenTransform] = useState<Transform | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Track shift live so the snap preview updates even when the mouse is still.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => setShiftHeld(e.shiftKey);
    const onBlur = () => setShiftHeld(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  // Auto-fit transform: scale + translate so the polygon fits the SVG.
  // Depends only on placed vertices — keeps the cursor stable in screen space
  // so the view doesn't shift as the user moves the mouse around.
  const fitTransform = useMemo<Transform>(() => {
    if (vertices.length < 2) {
      return { scale: 0.25, ox: STAGE_W / 2, oy: STAGE_H / 2 };
    }
    const b = polygonBounds(vertices);
    const pad = 40;
    const sx = (STAGE_W - pad * 2) / Math.max(b.width, 1);
    const sy = (STAGE_H - pad * 2) / Math.max(b.height, 1);
    const scale = Math.min(sx, sy);
    return {
      scale,
      ox: (STAGE_W - b.width * scale) / 2 - b.minX * scale,
      oy: (STAGE_H - b.height * scale) / 2 - b.minY * scale,
    };
  }, [vertices]);

  const transform = frozenTransform ?? fitTransform;

  const w2s = (p: Point) => ({
    x: p.x * transform.scale + transform.ox,
    y: p.y * transform.scale + transform.oy,
  });
  const s2w = (sx: number, sy: number): Point => ({
    x: (sx - transform.ox) / transform.scale,
    y: (sy - transform.oy) / transform.scale,
  });

  // What the next click (or close action) will do, given the current cursor.
  const snap = useMemo<Snap | null>(() => {
    if (phase !== "draw" || !cursorScreen) return null;
    if (vertices.length >= 3) {
      const first = {
        x: vertices[0].x * transform.scale + transform.ox,
        y: vertices[0].y * transform.scale + transform.oy,
      };
      if (
        Math.hypot(cursorScreen.x - first.x, cursorScreen.y - first.y) <
        CLOSE_RADIUS_PX
      ) {
        return { kind: "close", point: vertices[0] };
      }
    }
    const raw = {
      x: (cursorScreen.x - transform.ox) / transform.scale,
      y: (cursorScreen.y - transform.oy) / transform.scale,
    };
    if (vertices.length === 0 || shiftHeld) return { kind: "place", point: raw };
    return {
      kind: "place",
      point: snapAngleVector(
        vertices[vertices.length - 1],
        raw,
        ANGLE_SNAP_DEG,
      ),
    };
  }, [phase, cursorScreen, vertices, shiftHeld, transform]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    setShiftHeld(e.shiftKey);
    if (phase === "draw") {
      setCursorScreen({ x: sx, y: sy });
    } else if (phase === "edit" && draggingIdx !== null) {
      const w = s2w(sx, sy);
      setVertices((prev) => prev.map((v, i) => (i === draggingIdx ? w : v)));
    }
  };

  const handleSvgClick = () => {
    if (phase !== "draw" || !snap) return;
    if (snap.kind === "close") {
      setPhase("edit");
      setCursorScreen(null);
      return;
    }
    setVertices((prev) => [...prev, snap.point]);
  };

  const endDrag = () => {
    setDraggingIdx(null);
    setFrozenTransform(null);
  };

  const startVertexDrag = (i: number) => {
    setFrozenTransform(fitTransform);
    setDraggingIdx(i);
  };

  // Edit a wall's length: keep direction and start vertex; shift everything else.
  const setWallLength = (wallIndex: number, newLength: number) => {
    if (newLength < 1) return;
    setVertices((prev) => {
      const N = prev.length;
      const a = prev[wallIndex];
      const b = prev[(wallIndex + 1) % N];
      const oldLen = Math.hypot(b.x - a.x, b.y - a.y);
      if (oldLen < 0.01) return prev;
      const dx = ((b.x - a.x) / oldLen) * (newLength - oldLen);
      const dy = ((b.y - a.y) / oldLen) * (newLength - oldLen);
      return prev.map((v, idx) => {
        const rel = (idx - wallIndex + N) % N;
        return rel === 0 ? v : { x: v.x + dx, y: v.y + dy };
      });
    });
  };

  // Edit a wall's angle: keep length and start vertex; rotate end, shift the rest.
  const setWallAngle = (wallIndex: number, newAngleDeg: number) => {
    setVertices((prev) => {
      const N = prev.length;
      const a = prev[wallIndex];
      const b = prev[(wallIndex + 1) % N];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 0.01) return prev;
      const newRad = (newAngleDeg * Math.PI) / 180;
      const newEndX = a.x + Math.cos(newRad) * len;
      const newEndY = a.y + Math.sin(newRad) * len;
      const dx = newEndX - b.x;
      const dy = newEndY - b.y;
      return prev.map((v, idx) => {
        const rel = (idx - wallIndex + N) % N;
        return rel === 0 ? v : { x: v.x + dx, y: v.y + dy };
      });
    });
  };

  const reset = () => {
    setVertices([]);
    setCursorScreen(null);
    setDraggingIdx(null);
    setFrozenTransform(null);
    setPhase("draw");
  };

  const undoLast = () => setVertices((prev) => prev.slice(0, -1));

  const finishDrawing = () => {
    if (vertices.length >= 3) {
      setPhase("edit");
      setCursorScreen(null);
    }
  };

  const onCreate = () => {
    if (vertices.length < 3) return;
    setRoom({ vertices });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink-900 tracking-tight">
            Draw your shape
          </h2>
          <p className="text-xs text-ink-500 mt-0.5">
            {phase === "draw"
              ? "Click to place each corner of the room outline."
              : "Tune wall lengths and angles, or drag the corners directly."}
          </p>
        </div>
        <UnitToggle unit={unit} onChange={setUnit} />
      </div>

      {phase === "draw" && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-sage-50 border border-sage-200 text-[12px] text-sage-700 leading-relaxed">
          <Pencil size={14} className="mt-0.5 shrink-0 text-sage-600" />
          <span>
            Walls snap to <span className="font-medium">15°</span> angles — hold{" "}
            <kbd className="px-1 py-0.5 rounded bg-white border border-sage-200 font-mono text-[10px]">
              Shift
            </kbd>{" "}
            to draw freely. Click the green dot at the start to finish.
          </span>
        </div>
      )}

      <div className="flex justify-center">
        <svg
          ref={svgRef}
          width={STAGE_W}
          height={STAGE_H}
          className="bg-blueprint rounded-lg border border-ink-100 shadow-soft"
          style={{ cursor: phase === "draw" ? "crosshair" : "default" }}
          onClick={handleSvgClick}
          onMouseMove={handleMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={() => {
            if (phase === "draw") setCursorScreen(null);
            endDrag();
          }}
        >
          <DrawGrid transform={transform} />

          {phase === "draw" ? (
            <DrawPhase
              vertices={vertices}
              snap={snap}
              w2s={w2s}
              unit={unit}
              shiftHeld={shiftHeld}
            />
          ) : (
            <EditPhase
              vertices={vertices}
              w2s={w2s}
              unit={unit}
              draggingIdx={draggingIdx}
              onVertexDown={startVertexDrag}
            />
          )}
        </svg>
      </div>

      {phase === "draw" ? (
        <div className="flex gap-2">
          <Button
            onClick={undoLast}
            disabled={vertices.length === 0}
            icon={<Undo2 size={14} />}
          >
            Undo
          </Button>
          <Button
            onClick={reset}
            disabled={vertices.length === 0}
            icon={<RotateCcw size={14} />}
          >
            Reset
          </Button>
          <Button
            variant="primary"
            onClick={finishDrawing}
            disabled={vertices.length < 3}
            className="flex-1"
            trailingIcon={vertices.length >= 3 ? <ArrowRight size={14} /> : undefined}
          >
            {vertices.length < 3
              ? `Place ${3 - vertices.length} more corner${
                  vertices.length === 2 ? "" : "s"
                }`
              : "Finish drawing"}
          </Button>
        </div>
      ) : (
        <>
          <WallList
            vertices={vertices}
            unit={unit}
            onLengthChange={setWallLength}
            onAngleChange={setWallAngle}
          />
          <div className="flex gap-2">
            <Button onClick={() => setPhase("draw")} icon={<Pencil size={14} />}>
              Back to drawing
            </Button>
            <Button onClick={reset} icon={<RotateCcw size={14} />}>
              Reset
            </Button>
            <Button
              variant="primary"
              onClick={onCreate}
              className="flex-1"
              trailingIcon={<ArrowRight size={14} />}
            >
              Create room
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function snapAngleVector(from: Point, to: Point, stepDeg: number): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return to;
  const angleRad = Math.atan2(dy, dx);
  const stepRad = (stepDeg * Math.PI) / 180;
  const snapped = Math.round(angleRad / stepRad) * stepRad;
  return {
    x: from.x + Math.cos(snapped) * len,
    y: from.y + Math.sin(snapped) * len,
  };
}

function angleDeg(a: Point, b: Point): number {
  const deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
}

function pickGridStep(targetCm: number): number {
  const steps = [10, 25, 50, 100, 200, 500, 1000, 2000];
  for (const s of steps) if (s >= targetCm) return s;
  return steps[steps.length - 1];
}

function DrawGrid({ transform }: { transform: Transform }) {
  // Cm-spaced grid that adjusts as the auto-fit zoom changes.
  const cmStep = pickGridStep(50 / transform.scale);
  const px = cmStep * transform.scale;
  const firstX = ((transform.ox % px) + px) % px;
  const firstY = ((transform.oy % px) + px) % px;
  const lines: React.ReactNode[] = [];
  for (let x = firstX; x < STAGE_W; x += px) {
    lines.push(
      <line key={`vx${x}`} x1={x} y1={0} x2={x} y2={STAGE_H} stroke="rgba(43,71,99,0.10)" />,
    );
  }
  for (let y = firstY; y < STAGE_H; y += px) {
    lines.push(
      <line key={`hy${y}`} x1={0} y1={y} x2={STAGE_W} y2={y} stroke="rgba(43,71,99,0.10)" />,
    );
  }
  return <g>{lines}</g>;
}

function DrawPhase({
  vertices,
  snap,
  w2s,
  unit,
  shiftHeld,
}: {
  vertices: Point[];
  snap: Snap | null;
  w2s: (p: Point) => { x: number; y: number };
  unit: DisplayUnit;
  shiftHeld: boolean;
}) {
  const screenVerts = vertices.map(w2s);
  const last = screenVerts[screenVerts.length - 1];
  const snapScreen = snap ? w2s(snap.point) : null;

  const labels = vertices.slice(0, -1).map((a, i) => {
    const b = vertices[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const sa = w2s(a);
    const sb = w2s(b);
    return (
      <text
        key={i}
        x={(sa.x + sb.x) / 2}
        y={(sa.y + sb.y) / 2 - 6}
        textAnchor="middle"
        fontSize={11}
        fill="#1b2638"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {fmt(len, unit)}
      </text>
    );
  });

  const rubberLen =
    snap && snap.kind === "place" && vertices.length > 0
      ? Math.hypot(
          snap.point.x - vertices[vertices.length - 1].x,
          snap.point.y - vertices[vertices.length - 1].y,
        )
      : 0;

  return (
    <g>
      {screenVerts.length >= 2 && (
        <polyline
          points={screenVerts.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="#1b2638"
          strokeWidth={2}
        />
      )}
      {snapScreen && last && snap?.kind === "place" && (
        <line
          x1={last.x}
          y1={last.y}
          x2={snapScreen.x}
          y2={snapScreen.y}
          stroke={shiftHeld ? "#0ea5e9" : "#1b2638"}
          strokeWidth={2}
          strokeDasharray="4 4"
          opacity={0.6}
        />
      )}
      {labels}
      {snap?.kind === "place" && snapScreen && last && rubberLen > 0 && (
        <text
          x={(last.x + snapScreen.x) / 2}
          y={(last.y + snapScreen.y) / 2 - 6}
          textAnchor="middle"
          fontSize={11}
          fill="#4d6a8e"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {fmt(rubberLen, unit)}
        </text>
      )}
      {screenVerts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={4}
          fill={i === 0 && screenVerts.length >= 3 ? "#577e64" : "#1b2638"}
          stroke="#fff"
          strokeWidth={2}
        />
      ))}
      {snap?.kind === "place" && snapScreen && vertices.length > 0 && (
        <circle
          cx={snapScreen.x}
          cy={snapScreen.y}
          r={4}
          fill="#fff"
          stroke="#1b2638"
          strokeWidth={2}
        />
      )}
      {snap?.kind === "close" && screenVerts[0] && (
        <circle
          cx={screenVerts[0].x}
          cy={screenVerts[0].y}
          r={CLOSE_RADIUS_PX}
          fill="none"
          stroke="#577e64"
          strokeWidth={2}
          strokeDasharray="2 2"
        />
      )}
    </g>
  );
}

function EditPhase({
  vertices,
  w2s,
  unit,
  draggingIdx,
  onVertexDown,
}: {
  vertices: Point[];
  w2s: (p: Point) => { x: number; y: number };
  unit: DisplayUnit;
  draggingIdx: number | null;
  onVertexDown: (i: number) => void;
}) {
  const screenVerts = vertices.map(w2s);
  const points = screenVerts.map((p) => `${p.x},${p.y}`).join(" ");

  const labels = vertices.map((a, i) => {
    const b = vertices[(i + 1) % vertices.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const sa = w2s(a);
    const sb = w2s(b);
    return (
      <text
        key={i}
        x={(sa.x + sb.x) / 2}
        y={(sa.y + sb.y) / 2 - 6}
        textAnchor="middle"
        fontSize={11}
        fill="#1b2638"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {i + 1}: {fmt(len, unit)}
      </text>
    );
  });

  return (
    <g>
      <polygon
        points={points}
        fill="#ffffff"
        stroke="#1b2638"
        strokeWidth={2}
      />
      {labels}
      {screenVerts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={6}
          fill={draggingIdx === i ? "#577e64" : "#1b2638"}
          stroke="#fff"
          strokeWidth={2}
          style={{ cursor: "move" }}
          onMouseDown={(e) => {
            e.stopPropagation();
            onVertexDown(i);
          }}
        />
      ))}
    </g>
  );
}

function WallList({
  vertices,
  unit,
  onLengthChange,
  onAngleChange,
}: {
  vertices: Point[];
  unit: DisplayUnit;
  onLengthChange: (i: number, newLength: number) => void;
  onAngleChange: (i: number, newAngleDeg: number) => void;
}) {
  return (
    <div className="space-y-2 max-h-56 overflow-auto scrollbar-thin pr-1 rounded-lg border border-ink-100 bg-paper-50 p-3">
      <div className="grid grid-cols-[40px_1fr_92px] gap-2 text-[10px] font-semibold uppercase tracking-wider text-ink-500 px-1">
        <span>Wall</span>
        <span>Length</span>
        <span>Angle</span>
      </div>
      {vertices.map((a, i) => {
        const b = vertices[(i + 1) % vertices.length];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const ang = angleDeg(a, b);
        return (
          <WallRow
            key={i}
            index={i}
            length={len}
            angle={ang}
            unit={unit}
            onLengthChange={onLengthChange}
            onAngleChange={onAngleChange}
          />
        );
      })}
    </div>
  );
}

function WallRow({
  index,
  length,
  angle,
  unit,
  onLengthChange,
  onAngleChange,
}: {
  index: number;
  length: number;
  angle: number;
  unit: DisplayUnit;
  onLengthChange: (i: number, newLength: number) => void;
  onAngleChange: (i: number, newAngleDeg: number) => void;
}) {
  const [angleText, setAngleText] = useState<string>(Math.round(angle).toString());

  useEffect(() => {
    setAngleText(Math.round(angle).toString());
  }, [angle]);

  const commitAngle = () => {
    const n = Number(angleText);
    if (!Number.isFinite(n)) {
      setAngleText(Math.round(angle).toString());
      return;
    }
    onAngleChange(index, n);
  };

  return (
    <div className="grid grid-cols-[40px_1fr_92px] gap-2 items-center">
      <span className="text-[11px] font-mono tabular-nums text-ink-500 px-1">
        #{index + 1}
      </span>
      <NumberInput
        valueCm={length}
        onChangeCm={(cm) => onLengthChange(index, cm)}
        unit={unit}
        min={1}
      />
      <div className="flex items-stretch h-9 rounded-md border border-ink-200 bg-white overflow-hidden transition-colors focus-within:border-ink-500 focus-within:ring-2 focus-within:ring-ink-500/30 hover:border-ink-300">
        <input
          type="number"
          inputMode="decimal"
          value={angleText}
          step={1}
          className="px-2 text-sm w-full font-mono tabular-nums text-ink-900 bg-transparent outline-none"
          onChange={(e) => setAngleText(e.target.value)}
          onBlur={commitAngle}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
        <span className="px-2 text-[11px] flex items-center bg-paper-100 text-ink-500 border-l border-ink-200 font-medium uppercase tracking-wider">
          °
        </span>
      </div>
    </div>
  );
}

function fmt(cm: number, unit: DisplayUnit): string {
  if (unit === "m") return `${(cm / 100).toFixed(2)} m`;
  return `${Math.round(cm)} cm`;
}
