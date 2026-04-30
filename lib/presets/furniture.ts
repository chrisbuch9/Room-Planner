import type { FurnitureKind } from "@/types/room";

export type FurniturePreset = {
  kind: FurnitureKind;
  label: string;
  width: number; // cm
  height: number; // cm
  color: string;
};

// Reasonable defaults in centimeters.
export const FURNITURE_PRESETS: FurniturePreset[] = [
  { kind: "bed", label: "Bed", width: 152, height: 203, color: "#fde68a" },
  { kind: "desk", label: "Desk", width: 120, height: 60, color: "#bfdbfe" },
  {
    kind: "l-desk",
    label: "L-shape desk",
    width: 160,
    height: 160,
    color: "#bfdbfe",
  },
  { kind: "chair", label: "Chair", width: 50, height: 50, color: "#c7d2fe" },
  { kind: "sofa", label: "Sofa", width: 220, height: 90, color: "#fecaca" },
  { kind: "dresser", label: "Dresser", width: 120, height: 50, color: "#d9f99d" },
  {
    kind: "cabinet",
    label: "Cabinet",
    width: 80,
    height: 45,
    color: "#bbf7d0",
  },
  {
    kind: "bookshelf",
    label: "Bookshelf",
    width: 90,
    height: 30,
    color: "#fde2b1",
  },
  {
    kind: "nightstand",
    label: "Nightstand",
    width: 50,
    height: 40,
    color: "#fbcfe8",
  },
];

// Standard mattress sizes in centimeters (based on US/EU norms).
export type BedSize = {
  id: "twin" | "twin-xl" | "full" | "queen" | "king" | "custom";
  label: string;
  width: number;
  height: number;
};

export const BED_SIZES: BedSize[] = [
  { id: "twin", label: "Single (Twin)", width: 96, height: 191 },
  { id: "twin-xl", label: "Twin XL", width: 96, height: 203 },
  { id: "full", label: "Double (Full)", width: 137, height: 191 },
  { id: "queen", label: "Queen", width: 152, height: 203 },
  { id: "king", label: "King", width: 193, height: 203 },
  { id: "custom", label: "Custom", width: 152, height: 203 },
];

export const getPreset = (kind: FurnitureKind): FurniturePreset | undefined =>
  FURNITURE_PRESETS.find((p) => p.kind === kind);
