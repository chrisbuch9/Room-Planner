import type { Point } from "@/types/room";

export type RoomPresetId = "rectangle" | "l-shape" | "t-shape" | "u-shape";

export type RoomPreset = {
  id: RoomPresetId;
  label: string;
  // Builds a polygon (clockwise) given user-controlled outer dimensions in cm.
  build: (params: Record<string, number>) => Point[];
  // Inputs the setup form should render.
  inputs: { key: string; label: string; default: number }[];
};

export const ROOM_PRESETS: RoomPreset[] = [
  {
    id: "rectangle",
    label: "Rectangle",
    inputs: [
      { key: "width", label: "Width", default: 400 },
      { key: "depth", label: "Depth", default: 300 },
    ],
    build: ({ width, depth }) => [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: depth },
      { x: 0, y: depth },
    ],
  },
  {
    id: "l-shape",
    label: "L-Shape",
    inputs: [
      { key: "width", label: "Total width", default: 500 },
      { key: "depth", label: "Total depth", default: 400 },
      { key: "cutW", label: "Cut-out width", default: 200 },
      { key: "cutD", label: "Cut-out depth", default: 150 },
    ],
    build: ({ width, depth, cutW, cutD }) => [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: depth - cutD },
      { x: width - cutW, y: depth - cutD },
      { x: width - cutW, y: depth },
      { x: 0, y: depth },
    ],
  },
  {
    id: "t-shape",
    label: "T-Shape",
    inputs: [
      { key: "width", label: "Top width", default: 600 },
      { key: "topDepth", label: "Top depth", default: 200 },
      { key: "stemW", label: "Stem width", default: 250 },
      { key: "stemD", label: "Stem depth", default: 250 },
    ],
    build: ({ width, topDepth, stemW, stemD }) => {
      const stemLeft = (width - stemW) / 2;
      return [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: topDepth },
        { x: stemLeft + stemW, y: topDepth },
        { x: stemLeft + stemW, y: topDepth + stemD },
        { x: stemLeft, y: topDepth + stemD },
        { x: stemLeft, y: topDepth },
        { x: 0, y: topDepth },
      ];
    },
  },
  {
    id: "u-shape",
    label: "U-Shape",
    inputs: [
      { key: "width", label: "Outer width", default: 600 },
      { key: "depth", label: "Outer depth", default: 500 },
      { key: "cutW", label: "Notch width", default: 200 },
      { key: "cutD", label: "Notch depth", default: 250 },
    ],
    build: ({ width, depth, cutW, cutD }) => {
      const cutLeft = (width - cutW) / 2;
      return [
        { x: 0, y: 0 },
        { x: cutLeft, y: 0 },
        { x: cutLeft, y: cutD },
        { x: cutLeft + cutW, y: cutD },
        { x: cutLeft + cutW, y: 0 },
        { x: width, y: 0 },
        { x: width, y: depth },
        { x: 0, y: depth },
      ];
    },
  },
];

export const getRoomPreset = (id: RoomPresetId) =>
  ROOM_PRESETS.find((p) => p.id === id)!;
