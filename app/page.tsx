"use client";

import { useRoomStore } from "@/lib/store/useRoomStore";
import RoomSetupScreen from "@/components/RoomSetup/RoomSetupScreen";
import PlannerWorkspace from "@/components/PlannerWorkspace";

export default function Page() {
  const room = useRoomStore((s) => s.room);

  return (
    <main className="h-full w-full">
      {room ? <PlannerWorkspace /> : <RoomSetupScreen />}
    </main>
  );
}
