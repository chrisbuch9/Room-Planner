// Internal unit is centimeters.

export type DisplayUnit = "cm" | "m";

export const cmToM = (cm: number) => cm / 100;
export const mToCm = (m: number) => m * 100;

export const formatLength = (cm: number, unit: DisplayUnit = "cm"): string => {
  if (unit === "m") return `${cmToM(cm).toFixed(2)} m`;
  return `${Math.round(cm)} cm`;
};

export const parseLength = (
  value: string,
  unit: DisplayUnit = "cm",
): number | null => {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return unit === "m" ? mToCm(n) : n;
};
