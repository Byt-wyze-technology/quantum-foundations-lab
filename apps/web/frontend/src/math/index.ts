/**
 * The frontend's mathematical core.
 *
 * This is a faithful mirror of the Python package in `quantum_foundations/`
 * (§2). It exists so that every interaction updates instantly without a
 * network round trip; the Python core remains the reference implementation,
 * and the two are checked against each other in `tests/integration`.
 */

export * from "./complex";
export * from "./tolerances";
export * from "./random";
export * from "./states";
export * from "./tensor";
export * from "./gates";
export * from "./measurement";
