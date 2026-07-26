/**
 * The density-matrix heatmap (§10, advanced panel).
 *
 * Magnitude sets the cell's opacity and phase sets its hue, with the diagonal
 * (the probabilities) and the off-diagonal (the coherences) labelled. Every
 * cell also prints its magnitude, so the reading never depends on colour
 * alone (§16).
 */

import { type Matrix, magnitude, phase } from "../math";
import { phaseColor } from "./phaseColor";

export type DensityMatrixHeatmapProps = {
  rho: Matrix;
  labels: string[];
  caption?: string;
};

export function DensityMatrixHeatmap({ rho, labels, caption }: DensityMatrixHeatmapProps) {
  return (
    <div className="density-heatmap">
      <div
        className="density-grid"
        style={{ gridTemplateColumns: `auto repeat(${rho.length}, minmax(44px, 1fr))` }}
      >
        <span />
        {labels.map((label) => (
          <span key={`head-${label}`} className="density-head">
            ⟨{label}|
          </span>
        ))}
        {rho.map((row, rowIndex) => (
          <RowCells key={labels[rowIndex]} row={row} label={labels[rowIndex]!} rowIndex={rowIndex} />
        ))}
      </div>
      <p className="caption">
        {caption ??
          "Diagonal entries are the outcome probabilities. Off-diagonal entries are coherences — they vanish for a classical mixture and are what an entangled subsystem loses."}
      </p>
    </div>
  );
}

function RowCells({
  row,
  label,
  rowIndex,
}: {
  row: Matrix[number];
  label: string;
  rowIndex: number;
}) {
  return (
    <>
      <span className="density-head">|{label}⟩</span>
      {row.map((value, columnIndex) => {
        const size = magnitude(value);
        const diagonal = rowIndex === columnIndex;
        return (
          <span
            key={columnIndex}
            className={`density-cell${diagonal ? " diagonal" : ""}`}
            style={{
              background:
                size < 1e-9
                  ? "transparent"
                  : phaseColor(phase(value)),
              opacity: size < 1e-9 ? 0.25 : 0.35 + 0.65 * Math.min(1, size * 2),
            }}
            title={`ρ[${rowIndex}][${columnIndex}] magnitude ${size.toFixed(3)}, phase ${(
              (phase(value) * 180) /
              Math.PI
            ).toFixed(0)}°`}
          >
            {size < 1e-9 ? "0" : size.toFixed(2)}
          </span>
        );
      })}
    </>
  );
}
