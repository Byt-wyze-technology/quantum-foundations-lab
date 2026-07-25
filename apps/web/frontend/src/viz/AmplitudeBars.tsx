/**
 * Amplitude bars (§10).
 *
 * Each basis state gets a magnitude bar, a phase colour, the numeric amplitude
 * and the probability. §10 forbids encoding a signed or complex amplitude with
 * bar height alone, so height carries |α| only and the phase is carried by
 * colour *and* printed in figures — colour is never the sole channel (§16).
 */

import { type Complex, formatComplex, magnitude, phase } from "../math";
import { phaseColor, phaseDescription } from "./phaseColor";

export type AmplitudeBarsProps = {
  amplitudes: Complex[];
  labels: string[];
  /** Highlight a basis state, e.g. the one a measurement collapsed onto. */
  highlight?: string | null;
};

export function AmplitudeBars({ amplitudes, labels, highlight = null }: AmplitudeBarsProps) {
  return (
    <div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {amplitudes.map((amplitude, index) => {
          const label = labels[index] ?? String(index);
          const size = magnitude(amplitude);
          const probability = size * size;
          const angle = phase(amplitude);
          const isHighlighted = highlight === label;
          return (
            <li
              key={label}
              className="amplitude-row"
              style={isHighlighted ? { background: "#75d5b322" } : undefined}
            >
              <span className="amplitude-label">|{label}⟩</span>
              <span
                className="amplitude-track"
                role="img"
                aria-label={`Amplitude for basis state ${label}: magnitude ${size.toFixed(
                  3,
                )}, phase ${phaseDescription(angle)}, probability ${(probability * 100).toFixed(
                  1,
                )} per cent.`}
              >
                <span
                  className="amplitude-fill"
                  style={{
                    width: `${Math.min(100, size * 100)}%`,
                    background: size < 1e-9 ? "transparent" : phaseColor(angle),
                  }}
                />
              </span>
              <span className="amplitude-figures" aria-hidden="true">
                <b>{formatComplex(amplitude)}</b>
                {(probability * 100).toFixed(1)}%
              </span>
            </li>
          );
        })}
      </ul>
      <div className="phase-legend">
        <span>PHASE</span>
        <span className="phase-swatch" aria-hidden="true" />
        <span>0 → 2π</span>
      </div>
    </div>
  );
}
