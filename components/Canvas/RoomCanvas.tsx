"use client";

import dynamic from "next/dynamic";

// Konva touches `window` at module scope, so the canvas must load client-only.
const RoomCanvasInner = dynamic(() => import("./RoomCanvasInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-sm text-ink-500 bg-paper-grain">
      Loading canvas…
    </div>
  ),
});

export default function RoomCanvas() {
  return <RoomCanvasInner />;
}
