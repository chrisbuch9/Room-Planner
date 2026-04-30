import type {
  FloorElement,
  Furniture,
  ItemId,
  Room,
  Wall,
  WallElement,
} from "@/types/room";
import type { AABB } from "@/lib/geometry/collision";

export type Placement = {
  id: ItemId;
  x: number;
  y: number;
  rotation: number;
};

export type Reason = {
  id: ItemId;
  label: string;
  bullets: string[];
};

export type Layout = {
  name: string;
  description: string;
  placements: Placement[];
  reasons: Reason[];
  score: number;
};

export type ScoringWeights = {
  wallAffinity: number;
  doorClearance: number;
  windowAffinity: number;
  outletProximity: number;
  ventClearance: number;
  pairAffinity: number;
  centerOpenness: number;
  movementCost: number;
};

export type Preset = {
  id: string;
  name: string;
  description: string;
  weights: ScoringWeights;
  // Returns the wall index this preset wants the *anchor* item (bed/sofa/desk)
  // to sit against. Returning null falls back to a preset-distinct default in
  // optimize.ts so each preset still picks a different wall.
  pickPrimaryWall?: (ctx: FixedContext) => number | null;
};

export type DoorRegion = {
  el: WallElement;
  wall: Wall;
  swingAabb: AABB;
};

export type WindowRegion = {
  el: WallElement;
  wall: Wall;
  segmentA: { x: number; y: number };
  segmentB: { x: number; y: number };
};

export type OutletPoint = {
  el: WallElement;
  position: { x: number; y: number };
};

export type FixedContext = {
  room: Room;
  walls: Wall[];
  doors: DoorRegion[];
  windows: WindowRegion[];
  outlets: OutletPoint[];
  ventAabbs: AABB[];
  floorAabbs: AABB[]; // includes carpets — used only for visual stacking, not collision
};

export type CandidatePosition = {
  x: number;
  y: number;
  rotation: number;
  source: "wall" | "interior" | "pair" | "original";
};

export type ScoringContext = FixedContext & {
  item: Furniture;
  weights: ScoringWeights;
  placedAabbs: AABB[];
  placedById: Map<ItemId, Placement>;
  originals: Map<ItemId, Furniture>;
  primaryWallIndex: number | null;
};

export type RuleResult = {
  score: number;
  reason?: string;
};

export type ItemsContext = {
  furniture: Furniture[];
  walls: WallElement[];
  floors: FloorElement[];
};
