"use client";

import RoomCanvas from "./Canvas/RoomCanvas";
import AppBar from "./Layout/AppBar";
import Sidebar from "./Layout/Sidebar";
import PropertiesPanel from "./Panels/PropertiesPanel";
import OptimizerPreview from "./Panels/OptimizerPreview";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

export default function PlannerWorkspace() {
  useKeyboardShortcuts();
  return (
    <div className="h-full w-full flex flex-col bg-paper-50">
      <AppBar />
      <div className="flex-1 flex min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 relative">
          <RoomCanvas />
          <OptimizerPreview />
        </main>
        <aside className="w-80 shrink-0 border-l border-ink-100 bg-white overflow-y-auto scrollbar-thin">
          <PropertiesPanel />
        </aside>
      </div>
    </div>
  );
}
