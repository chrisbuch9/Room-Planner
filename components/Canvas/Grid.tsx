"use client";

import { Group, Line } from "react-konva";

type Props = {
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
};

// Draws a screen-aligned grid in centimeter spacing. Visible spacing is
// adjusted automatically as the user zooms; every 5th line is drawn stronger
// to give a familiar drafting feel.
export default function Grid({ width, height, scale, offsetX, offsetY }: Props) {
  const targetPx = 50;
  const cmStep = pickStep(targetPx / scale);
  const px = cmStep * scale;

  // Find the first grid line on screen, in cm-aligned space.
  const cmFirstX = -offsetX / scale;
  const cmFirstY = -offsetY / scale;
  const startCmX = Math.floor(cmFirstX / cmStep) * cmStep;
  const startCmY = Math.floor(cmFirstY / cmStep) * cmStep;
  const startScreenX = startCmX * scale + offsetX;
  const startScreenY = startCmY * scale + offsetY;

  const minor: React.ReactNode[] = [];
  const major: React.ReactNode[] = [];

  let i = 0;
  for (let x = startScreenX; x < width; x += px, i++) {
    const isMajor = Math.round((startCmX + i * cmStep) / cmStep) % 5 === 0;
    (isMajor ? major : minor).push(
      <Line
        key={`vx${x.toFixed(1)}`}
        points={[x, 0, x, height]}
        stroke={isMajor ? "#d6cdb3" : "#ece6d4"}
        strokeWidth={1}
        listening={false}
      />,
    );
  }
  i = 0;
  for (let y = startScreenY; y < height; y += px, i++) {
    const isMajor = Math.round((startCmY + i * cmStep) / cmStep) % 5 === 0;
    (isMajor ? major : minor).push(
      <Line
        key={`hy${y.toFixed(1)}`}
        points={[0, y, width, y]}
        stroke={isMajor ? "#d6cdb3" : "#ece6d4"}
        strokeWidth={1}
        listening={false}
      />,
    );
  }
  return (
    <Group>
      {minor}
      {major}
    </Group>
  );
}

function pickStep(targetCm: number): number {
  const steps = [10, 25, 50, 100, 200, 500, 1000, 2000, 5000];
  for (const s of steps) if (s >= targetCm) return s;
  return steps[steps.length - 1];
}
