/**
 * A matrix, rendered only after the visual has done its work.
 *
 * Every use of this component sits behind a "show the mathematics" disclosure,
 * because §1 and the PRD both require the picture to come first and the matrix
 * second.
 */

import { type Complex, type Matrix, formatComplex } from "../math";

export type MatrixDisplayProps = {
  matrix: Matrix;
  caption?: string;
  digits?: number;
};

const compact = (value: Complex, digits: number): string => {
  const re = Number(value.re.toFixed(digits));
  const im = Number(value.im.toFixed(digits));
  if (re === 0 && im === 0) return "0";
  if (im === 0) return re.toFixed(digits);
  if (re === 0) return im === 1 ? "i" : im === -1 ? "−i" : `${im.toFixed(digits)}i`;
  return formatComplex(value, digits);
};

export function MatrixDisplay({ matrix, caption, digits = 3 }: MatrixDisplayProps) {
  const columns = matrix[0]?.length ?? 0;
  const spoken = matrix
    .map((row, index) => `row ${index + 1}: ${row.map((value) => compact(value, digits)).join(", ")}`)
    .join("; ");

  return (
    <div className="matrix-display">
      <div
        className="matrix-grid"
        style={{ gridTemplateColumns: `repeat(${columns}, auto)` }}
        role="img"
        aria-label={`${caption ? `${caption}. ` : ""}Matrix, ${spoken}.`}
      >
        {matrix.flatMap((row, rowIndex) =>
          row.map((value, columnIndex) => (
            <span key={`${rowIndex}-${columnIndex}`} aria-hidden="true">
              {compact(value, digits)}
            </span>
          )),
        )}
      </div>
      {caption && <p className="caption">{caption}</p>}
    </div>
  );
}
