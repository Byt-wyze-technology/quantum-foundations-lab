/**
 * Complex arithmetic.
 *
 * Complex numbers are carried as `{re, im}` everywhere, matching the wire
 * format required by §12. They are never serialised as strings such as
 * "0.5-0.5j", which are ambiguous to parse.
 */

export type Complex = {
  re: number;
  im: number;
};

export const complex = (re: number, im = 0): Complex => ({ re, im });

export const ZERO: Complex = { re: 0, im: 0 };
export const ONE: Complex = { re: 1, im: 0 };
/** Named in full so it cannot collide with the identity gate `I` of §5.3. */
export const IMAGINARY_UNIT: Complex = { re: 0, im: 1 };

export const add = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im });

export const subtract = (a: Complex, b: Complex): Complex => ({
  re: a.re - b.re,
  im: a.im - b.im,
});

export const multiply = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});

export const scale = (a: Complex, factor: number): Complex => ({
  re: a.re * factor,
  im: a.im * factor,
});

export const conjugate = (a: Complex): Complex => ({ re: a.re, im: -a.im });

/** |z|² — cheaper than `magnitude` and the quantity probabilities actually need. */
export const magnitudeSquared = (a: Complex): number => a.re * a.re + a.im * a.im;

export const magnitude = (a: Complex): number => Math.hypot(a.re, a.im);

/** arg(z) in (−π, π]. Returns 0 for the zero complex number, which has no phase. */
export const phase = (a: Complex): number => (a.re === 0 && a.im === 0 ? 0 : Math.atan2(a.im, a.re));

/** e^{iθ} */
export const fromPolar = (radius: number, angle: number): Complex => ({
  re: radius * Math.cos(angle),
  im: radius * Math.sin(angle),
});

export const expI = (angle: number): Complex => fromPolar(1, angle);

export const approximatelyEqual = (a: Complex, b: Complex, atol = 1e-10): boolean =>
  Math.abs(a.re - b.re) <= atol && Math.abs(a.im - b.im) <= atol;

/** Wrap an angle into [0, 2π). */
export const normalizeAngle = (angle: number): number => {
  const twoPi = 2 * Math.PI;
  return ((angle % twoPi) + twoPi) % twoPi;
};

/**
 * Format a complex amplitude for display.
 *
 * Small components are dropped so that `0.707 + 0.000i` reads as `0.707`, but
 * a genuinely complex amplitude always shows both parts — the phase is the
 * whole point of §8.3 and must never be hidden by rounding.
 */
export const formatComplex = (value: Complex, digits = 3): string => {
  const re = Number(value.re.toFixed(digits));
  const im = Number(value.im.toFixed(digits));
  if (im === 0) return re.toFixed(digits);
  if (re === 0) return `${im.toFixed(digits)}i`;
  const sign = im < 0 ? "−" : "+";
  return `${re.toFixed(digits)} ${sign} ${Math.abs(im).toFixed(digits)}i`;
};
