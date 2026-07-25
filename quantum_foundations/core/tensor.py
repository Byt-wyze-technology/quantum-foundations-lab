"""Tensor products, computational basis labels and subsystem reshaping.

Specification reference: §5.4.

Qubit-ordering convention, stated once and relied upon everywhere else:

* basis labels are written q₀q₁…q_{n-1};
* q₀ is the most significant displayed bit;
* the internal Kronecker-product ordering matches that convention, so
  ``tensor_product(ket0(), ket1())`` equals ``computational_basis_state("01")``.

Concretely, amplitude index *k* corresponds to the bit string of *k* written
with q₀ as the leading bit.
"""

import numpy as np

from .types import ComplexMatrix, ComplexVector
from .validation import (
    QuantumValidationError,
    qubit_count_for_dimension,
    validate_qubit_count,
)


def tensor_product(*objects: ComplexVector | ComplexMatrix) -> ComplexVector | ComplexMatrix:
    """Kronecker product of one or more states or operators, left-most first.

    The left-most argument occupies the most significant qubits.
    """
    if not objects:
        raise QuantumValidationError(
            "EMPTY_TENSOR_PRODUCT",
            "A tensor product requires at least one operand.",
        )
    result: np.ndarray = np.asarray(objects[0], dtype=np.complex128)
    for operand in objects[1:]:
        result = np.kron(result, np.asarray(operand, dtype=np.complex128))
    return np.asarray(result, dtype=np.complex128)


def computational_basis_state(bits: str) -> ComplexVector:
    """Build |bits⟩, e.g. ``computational_basis_state("01")`` → |01⟩."""
    cleaned = bits.strip()
    if not cleaned or any(character not in "01" for character in cleaned):
        raise QuantumValidationError(
            "INVALID_BASIS_LABEL",
            f"A computational basis label must be a non-empty string of 0s and 1s; received {bits!r}.",
            label=bits,
        )
    dimension = 2 ** len(cleaned)
    state = np.zeros(dimension, dtype=np.complex128)
    state[int(cleaned, 2)] = 1.0
    return state


def basis_labels(qubit_count: int) -> list[str]:
    """Ordered basis labels for a ``qubit_count``-qubit system, q₀ leading."""
    validate_qubit_count(qubit_count)
    return [format(index, f"0{qubit_count}b") for index in range(2**qubit_count)]


def reshape_state_for_subsystems(state: ComplexVector, left_qubits: int) -> ComplexMatrix:
    """View a state as a matrix splitting the first ``left_qubits`` from the rest.

    The result has shape (2**left_qubits, 2**(n − left_qubits)). A state is a
    product state across this cut exactly when the matrix has rank one, which
    is how :func:`~quantum_foundations.core.entanglement.is_product_state`
    decides the question.
    """
    array = np.asarray(state, dtype=np.complex128)
    qubit_count = qubit_count_for_dimension(array.shape[0])
    if left_qubits < 1 or left_qubits >= qubit_count:
        raise QuantumValidationError(
            "INVALID_SUBSYSTEM_SPLIT",
            f"The split must leave qubits on both sides; received {left_qubits} of {qubit_count}.",
            left_qubits=left_qubits,
            qubit_count=qubit_count,
        )
    return array.reshape(2**left_qubits, 2 ** (qubit_count - left_qubits))
