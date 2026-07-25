/**
 * The live state equation (§10).
 *
 *     |ψ⟩ = Σₓ αₓ|x⟩
 *
 * Terms whose amplitude is numerically zero are dropped, so |0⟩ reads as
 * "|ψ⟩ = |0⟩" rather than "|ψ⟩ = 1.000|0⟩ + 0.000|1⟩" — the equation stays as
 * short as the state actually is.
 */

import { type Complex, magnitude } from "../math";
import { Katex } from "./Katex";

export type StateEquationProps = {
  amplitudes: Complex[];
  labels: string[];
  block?: boolean;
  digits?: number;
};

const formatCoefficient = (amplitude: Complex, digits: number): string => {
  const re = Number(amplitude.re.toFixed(digits));
  const im = Number(amplitude.im.toFixed(digits));
  if (im === 0) {
    if (Math.abs(re - 1) < 10 ** -digits) return "";
    if (Math.abs(re + 1) < 10 ** -digits) return "-";
    return re.toFixed(digits);
  }
  if (re === 0) {
    if (Math.abs(im - 1) < 10 ** -digits) return "i";
    if (Math.abs(im + 1) < 10 ** -digits) return "-i";
    return `${im.toFixed(digits)}i`;
  }
  const sign = im < 0 ? "-" : "+";
  return `(${re.toFixed(digits)} ${sign} ${Math.abs(im).toFixed(digits)}i)`;
};

export const stateEquationLatex = (
  amplitudes: Complex[],
  labels: string[],
  digits = 3,
): string => {
  const terms: string[] = [];
  amplitudes.forEach((amplitude, index) => {
    if (magnitude(amplitude) < 10 ** -digits / 2) return;
    const coefficient = formatCoefficient(amplitude, digits);
    const ket = `\\left|${labels[index] ?? index}\\right\\rangle`;
    const term = `${coefficient}${ket}`;
    terms.push(terms.length === 0 ? term : term.startsWith("-") ? `- ${term.slice(1)}` : `+ ${term}`);
  });
  const body = terms.length === 0 ? "0" : terms.join(" ");
  return `\\left|\\psi\\right\\rangle = ${body}`;
};

export function StateEquation({
  amplitudes,
  labels,
  block = false,
  digits = 3,
}: StateEquationProps) {
  const latex = stateEquationLatex(amplitudes, labels, digits);
  const spoken = amplitudes
    .map((amplitude, index) =>
      magnitude(amplitude) < 1e-4
        ? null
        : `${magnitude(amplitude).toFixed(3)} times ket ${labels[index] ?? index}`,
    )
    .filter(Boolean)
    .join(", plus ");
  return (
    <div className="state-equation">
      <Katex expression={latex} block={block} description={`State: ${spoken || "zero"}.`} />
    </div>
  );
}
