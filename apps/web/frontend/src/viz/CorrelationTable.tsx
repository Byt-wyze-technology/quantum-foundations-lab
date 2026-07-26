/**
 * The joint outcome table (§8.9, §9).
 *
 * Shows the four joint probabilities as a grid with its margins, plus ⟨Z⊗Z⟩.
 * The margins matter: a Bell pair and two independent fair coins have
 * identical single-qubit margins, and the grid is where they part company.
 */

import { type StateVector, correlationTable } from "../math";

export function CorrelationTable({ state }: { state: StateVector }) {
  const { joint, zz } = correlationTable(state);
  const rowTotals = joint.map((row) => row[0]! + row[1]!);
  const columnTotals = [joint[0]![0]! + joint[1]![0]!, joint[0]![1]! + joint[1]![1]!];

  const cell = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <div>
      <table className="correlation-table">
        <caption className="visually-hidden">
          Joint measurement probabilities for the two qubits in the computational basis, with
          margins.
        </caption>
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">Qubit 0 outcome</span>
            </th>
            <th scope="col">q₁ = 0</th>
            <th scope="col">q₁ = 1</th>
            <th scope="col" className="margin-header">
              total
            </th>
          </tr>
        </thead>
        <tbody>
          {joint.map((row, rowIndex) => (
            <tr key={rowIndex}>
              <th scope="row">q₀ = {rowIndex}</th>
              {row.map((value, columnIndex) => (
                <td
                  key={columnIndex}
                  style={{
                    background: `rgba(117, 213, 179, ${Math.min(0.85, value * 1.6).toFixed(3)})`,
                  }}
                >
                  {cell(value)}
                </td>
              ))}
              <td className="margin-cell">{cell(rowTotals[rowIndex]!)}</td>
            </tr>
          ))}
          <tr>
            <th scope="row" className="margin-header">
              total
            </th>
            {columnTotals.map((value, index) => (
              <td key={index} className="margin-cell">
                {cell(value)}
              </td>
            ))}
            <td className="margin-cell">100.0%</td>
          </tr>
        </tbody>
      </table>
      <p className="reading" style={{ marginTop: 12 }}>
        ⟨Z ⊗ Z⟩ = <b>{zz.toFixed(3)}</b>
        {Math.abs(zz) > 0.999 && (zz > 0 ? " — perfectly correlated" : " — perfectly anti-correlated")}
      </p>
    </div>
  );
}
