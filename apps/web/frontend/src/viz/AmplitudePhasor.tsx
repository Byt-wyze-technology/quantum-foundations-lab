/**
 * Amplitude phasors (§10).
 *
 * Radius is the magnitude, angle is the phase — the clock-hand picture §8.3
 * and Lesson 4 build on. Two phasors side by side make interference visible:
 * rotate one, and the sum lengthens or cancels.
 */

import { type Complex, magnitude, phase } from "../math";
import { phaseColor, phaseColorDeep, phaseDescription } from "./phaseColor";

export type AmplitudePhasorProps = {
  amplitude: Complex;
  label: string;
  size?: number;
  /** Draw the unit circle the hand sweeps, for scale. */
  showUnitCircle?: boolean;
};

export function AmplitudePhasor({
  amplitude,
  label,
  size = 108,
  showUnitCircle = true,
}: AmplitudePhasorProps) {
  const centre = size / 2;
  const radius = size * 0.38;
  const length = magnitude(amplitude);
  const angle = phase(amplitude);
  const tipX = centre + Math.cos(angle) * radius * length;
  // SVG y grows downward; negate so a positive phase turns anticlockwise.
  const tipY = centre - Math.sin(angle) * radius * length;
  const colour = phaseColor(angle);

  return (
    <figure className="phasor" style={{ margin: 0 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Amplitude ${label}: magnitude ${length.toFixed(
          3,
        )}, phase ${phaseDescription(angle)}.`}
      >
        {showUnitCircle && (
          <circle
            cx={centre}
            cy={centre}
            r={radius}
            fill="none"
            stroke="#c9c6bc"
            strokeDasharray="3 5"
          />
        )}
        <line x1={centre - radius} y1={centre} x2={centre + radius} y2={centre} stroke="#dcd8cd" />
        <line x1={centre} y1={centre - radius} x2={centre} y2={centre + radius} stroke="#dcd8cd" />
        {length > 1e-9 && (
          <>
            <line
              x1={centre}
              y1={centre}
              x2={tipX}
              y2={tipY}
              stroke={phaseColorDeep(angle)}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <circle cx={tipX} cy={tipY} r={4} fill={colour} stroke="#102224" strokeWidth={1} />
          </>
        )}
        {length <= 1e-9 && <circle cx={centre} cy={centre} r={3} fill="#98a3a1" />}
      </svg>
      <figcaption>
        {label} · |α|={length.toFixed(3)} · φ={((phase(amplitude) * 180) / Math.PI).toFixed(0)}°
      </figcaption>
    </figure>
  );
}
