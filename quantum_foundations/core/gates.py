"""Unitary gates, rotation constructors and gate application.

Specification reference: §5.3.

Qubit ordering follows the convention documented in §5.4: basis labels are
written q₀q₁…q_{n-1} with q₀ the most significant displayed bit, so axis *i*
of the reshaped state tensor is qubit *i*, and ``controlled`` places the
control on the leading (most significant) qubit.
"""

from typing import Mapping, Sequence

import numpy as np

from .types import UNITARY_ATOL, ComplexMatrix, ComplexVector
from .validation import (
    QuantumValidationError,
    validate_square_matrix,
    validate_targets,
    validate_unitary,
)

_SQRT_HALF = 1.0 / np.sqrt(2.0)


def _matrix(rows: Sequence[Sequence[complex]]) -> ComplexMatrix:
    return np.array(rows, dtype=np.complex128)


def _as_complex(array: np.ndarray) -> ComplexMatrix:
    """Narrow a NumPy expression back to the declared complex128 matrix type."""
    return np.asarray(array, dtype=np.complex128)


# `I` is the identity gate named in §5.3; the one-letter name is the standard
# notation and is deliberate, so the ambiguous-name lint is silenced here.
I = _matrix([[1, 0], [0, 1]])  # noqa: E741
X = _matrix([[0, 1], [1, 0]])
Y = _matrix([[0, -1j], [1j, 0]])
Z = _matrix([[1, 0], [0, -1]])
H = _SQRT_HALF * _matrix([[1, 1], [1, -1]])
S = _matrix([[1, 0], [0, 1j]])
SDG = _matrix([[1, 0], [0, -1j]])
T = _matrix([[1, 0], [0, np.exp(1j * np.pi / 4)]])
TDG = _matrix([[1, 0], [0, np.exp(-1j * np.pi / 4)]])

CNOT = _matrix([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 1], [0, 0, 1, 0]])
CZ = _matrix([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, -1]])
SWAP = _matrix([[1, 0, 0, 0], [0, 0, 1, 0], [0, 1, 0, 0], [0, 0, 0, 1]])


def rx(theta: float) -> ComplexMatrix:
    """Rotation by ``theta`` about the x-axis: cos(θ/2)I − i sin(θ/2)X."""
    return _as_complex(np.cos(theta / 2.0) * I - 1j * np.sin(theta / 2.0) * X)


def ry(theta: float) -> ComplexMatrix:
    """Rotation by ``theta`` about the y-axis: cos(θ/2)I − i sin(θ/2)Y."""
    return _as_complex(np.cos(theta / 2.0) * I - 1j * np.sin(theta / 2.0) * Y)


def rz(theta: float) -> ComplexMatrix:
    """Rotation by ``theta`` about the z-axis: diag(e^{−iθ/2}, e^{+iθ/2})."""
    return _matrix([[np.exp(-1j * theta / 2.0), 0], [0, np.exp(1j * theta / 2.0)]])


def phase(phi: float) -> ComplexMatrix:
    """Relative phase gate diag(1, e^{iφ}).

    Differs from :func:`rz` by an unobservable global phase.
    """
    return _matrix([[1, 0], [0, np.exp(1j * phi)]])


def controlled(unitary: ComplexMatrix) -> ComplexMatrix:
    """Add one control qubit, placed on the most significant qubit.

    The result acts as the identity when the control is |0⟩ and applies
    ``unitary`` when the control is |1⟩.
    """
    validate_square_matrix(unitary, label="gate")
    array = np.asarray(unitary, dtype=np.complex128)
    dimension = array.shape[0]
    result = np.eye(2 * dimension, dtype=np.complex128)
    result[dimension:, dimension:] = array
    return result


def is_unitary(matrix: ComplexMatrix, *, atol: float = UNITARY_ATOL) -> bool:
    """True when U†U = I within ``atol``."""
    try:
        validate_unitary(matrix, atol=atol)
    except QuantumValidationError:
        return False
    return True


def apply_gate(
    state: ComplexVector,
    gate: ComplexMatrix,
    targets: tuple[int, ...],
    *,
    qubit_count: int,
) -> ComplexVector:
    """Apply ``gate`` to the given ``targets`` of a ``qubit_count``-qubit state.

    ``targets`` are listed in the gate's own qubit order: for ``CNOT`` the
    first target is the control. Non-unitary matrices are rejected rather than
    applied, so the UI can report the problem without ever showing a state
    whose probabilities do not sum to one (§8.5).
    """
    array = np.asarray(state, dtype=np.complex128)
    matrix = np.asarray(gate, dtype=np.complex128)
    gate_qubits = validate_square_matrix(matrix, label="gate")
    validate_unitary(matrix)
    validate_targets(targets, qubit_count=qubit_count, gate_qubits=gate_qubits)

    expected = 2**qubit_count
    if array.shape != (expected,):
        raise QuantumValidationError(
            "STATE_DIMENSION_MISMATCH",
            f"A {qubit_count}-qubit state must have {expected} amplitudes; "
            f"received {array.shape[0] if array.ndim == 1 else array.shape}.",
            qubit_count=qubit_count,
            expected=expected,
        )

    tensor = array.reshape((2,) * qubit_count)
    remaining = [axis for axis in range(qubit_count) if axis not in targets]
    permutation = list(targets) + remaining
    tensor = np.transpose(tensor, permutation)
    tensor = matrix @ tensor.reshape(2**gate_qubits, -1)
    tensor = tensor.reshape((2,) * qubit_count)
    tensor = np.transpose(tensor, np.argsort(permutation))
    return tensor.reshape(expected)


#: Fixed gates addressable by name from the API and the gate palette (§9, §11).
NAMED_GATES: Mapping[str, ComplexMatrix] = {
    "I": I,
    "X": X,
    "Y": Y,
    "Z": Z,
    "H": H,
    "S": S,
    "SDG": SDG,
    "T": T,
    "TDG": TDG,
    "CNOT": CNOT,
    "CZ": CZ,
    "SWAP": SWAP,
}

#: Rotation gates addressable by name, each taking a single angle parameter.
PARAMETRIC_GATES = {"RX": rx, "RY": ry, "RZ": rz, "PHASE": phase}


def gate_matrix(name: str, parameters: Mapping[str, float] | None = None) -> ComplexMatrix:
    """Resolve a gate name (and optional ``{"theta": …}``) to its matrix."""
    key = name.upper()
    if key in NAMED_GATES:
        return NAMED_GATES[key].copy()
    if key in PARAMETRIC_GATES:
        values = dict(parameters or {})
        angle = values.get("theta", values.get("phi"))
        if angle is None:
            raise QuantumValidationError(
                "MISSING_GATE_PARAMETER",
                f"Gate {key} requires an angle parameter.",
                gate=key,
            )
        return PARAMETRIC_GATES[key](float(angle))
    raise QuantumValidationError(
        "UNKNOWN_GATE",
        f"Unknown gate {name!r}.",
        gate=name,
        known=sorted([*NAMED_GATES, *PARAMETRIC_GATES]),
    )


def gate_qubit_count(name: str) -> int:
    """Number of qubits a named gate acts on."""
    key = name.upper()
    if key in PARAMETRIC_GATES:
        return 1
    if key in NAMED_GATES:
        return int(NAMED_GATES[key].shape[0]).bit_length() - 1
    raise QuantumValidationError("UNKNOWN_GATE", f"Unknown gate {name!r}.", gate=name)
