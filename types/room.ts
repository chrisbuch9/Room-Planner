// All measurements stored in centimeters.

export type Point = { x: number; y: number };

export type Wall = {
  index: number;
  a: Point;
  b: Point;
  length: number;
  angle: number; // radians
};

export type Room = {
  vertices: Point[]; // closed polygon, clockwise; in cm
};

export type FurnitureKind =
  | "bed"
  | "desk"
  | "l-desk"
  | "chair"
  | "sofa"
  | "dresser"
  | "cabinet"
  | "bookshelf"
  | "nightstand"
  | "custom";

export type Furniture = {
  type: "furniture";
  id: string;
  kind: FurnitureKind;
  label: string;
  x: number; // center, cm
  y: number; // center, cm
  width: number; // cm
  height: number; // cm
  rotation: number; // degrees
};

export type WallElementKind = "door" | "window" | "wall-vent" | "outlet";

export type DoorHinge = "left" | "right";
export type DoorSwing = "in" | "out";

export type WallElement = {
  type: "wall-element";
  id: string;
  kind: WallElementKind;
  wallIndex: number;
  offsetAlongWall: number; // cm from wall start
  width: number; // cm along the wall
  thickness: number; // cm perpendicular into the room (visual only)
  label: string;
  // Door-only swing options (ignored for non-door kinds).
  hinge?: DoorHinge;
  swing?: DoorSwing;
};

export type FloorElementKind = "floor-vent" | "carpet" | "circle-carpet";

export type FloorElement = {
  type: "floor-element";
  id: string;
  kind: FloorElementKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label: string;
};

export type Item = Furniture | WallElement | FloorElement;
export type ItemId = string;
