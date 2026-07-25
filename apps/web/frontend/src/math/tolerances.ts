/** Numerical tolerances, mirroring §14 and `core/types.py`. */

export const NORMALIZATION_ATOL = 1e-10;
export const UNITARY_ATOL = 1e-10;
export const HERMITIAN_ATOL = 1e-10;
export const PROBABILITY_ATOL = 1e-12;

/** §17 — the limits version 1 supports. */
export const MAX_QUBITS = 2;
export const MAX_SHOTS = 100_000;
export const MAX_CIRCUIT_DEPTH = 24;
