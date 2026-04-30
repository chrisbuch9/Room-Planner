// Snap a degree value to the nearest multiple of `step`.
export const snapAngle = (deg: number, step = 15): number => {
  return Math.round(deg / step) * step;
};

// Snap a value to the nearest multiple of `step`. Used for grid snapping in cm.
export const snapToStep = (v: number, step: number): number =>
  Math.round(v / step) * step;

// Default grid snap step (cm) used while dragging with Shift held.
export const SNAP_GRID_CM = 5;

// Default rotation snap step (degrees) while transforming with Shift held.
export const SNAP_ANGLE_DEG = 15;

// Clamp a value to [min, max].
export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
