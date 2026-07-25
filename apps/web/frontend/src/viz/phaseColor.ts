/**
 * Phase-to-colour mapping.
 *
 * Phase is cyclic, so it needs a cyclic scale — a linear ramp would put a seam
 * at an arbitrary angle and imply that φ = 0 and φ = 2π are far apart. §16
 * forbids relying on colour alone, so every component using this also prints
 * the numeric phase.
 */

import { normalizeAngle } from "../math";

/**
 * Phase zero is anchored to the palette's mint rather than to red, so the most
 * common amplitude in the app does not arrive coloured like an error.
 */
const HUE_ORIGIN = 160;

const hueFor = (phase: number): number =>
  (HUE_ORIGIN + (normalizeAngle(phase) * 180) / Math.PI) % 360;

/** A colour for a phase in radians, evenly spaced around the hue circle. */
export const phaseColor = (phase: number): string => `hsl(${hueFor(phase).toFixed(1)} 52% 60%)`;

/** The same hue, darkened for text and strokes that need contrast. */
export const phaseColorDeep = (phase: number): string =>
  `hsl(${hueFor(phase).toFixed(1)} 48% 36%)`;

/** A short spoken description of a phase, for screen readers (§16). */
export const phaseDescription = (phase: number): string => {
  const degrees = Math.round((normalizeAngle(phase) * 180) / Math.PI);
  return `${degrees} degrees`;
};
