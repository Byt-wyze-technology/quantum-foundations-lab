/**
 * Shareable state links (§19).
 *
 * A link encodes only the prepared state's angles, the gate sequence and the
 * measurement axis — no identifiers, no history, nothing about the person who
 * made it. Anything unparseable is ignored rather than thrown, because a
 * mangled link should open the lab at its default state, not an error page.
 */

import { type GateName, gateQubitCount, qubitFromAngles } from "../math";
import { useLabStore } from "./labStore";

const KNOWN_GATES = new Set<string>([
  "I",
  "X",
  "Y",
  "Z",
  "H",
  "S",
  "SDG",
  "T",
  "TDG",
  "RX",
  "RY",
  "RZ",
  "PHASE",
  "CNOT",
  "CZ",
  "SWAP",
]);

export const applySharedStateFromUrl = (search: string): void => {
  const parameters = new URLSearchParams(search);
  const theta = Number(parameters.get("theta"));
  const phi = Number(parameters.get("phi"));
  const store = useLabStore.getState();

  if (Number.isFinite(theta) && Number.isFinite(phi) && parameters.has("theta")) {
    store.setInitialState(qubitFromAngles(theta, phi));
  }

  const circuit = parameters.get("circuit");
  if (circuit) {
    for (const token of circuit.split(",")) {
      const [name, angle] = token.split(":");
      if (!name || !KNOWN_GATES.has(name)) continue;
      const gate = name as GateName;
      if (gateQubitCount(gate) !== 1) continue;
      const parsed = angle === undefined ? undefined : Number(angle);
      if (parsed !== undefined && !Number.isFinite(parsed)) continue;
      useLabStore
        .getState()
        .applyGate(
          gate,
          [0],
          parsed === undefined
            ? undefined
            : { [gate === "PHASE" ? "phi" : "theta"]: parsed },
        );
    }
  }

  const axis = parameters.get("axis");
  if (axis) {
    const [axisTheta, axisPhi] = axis.split("_").map(Number);
    if (Number.isFinite(axisTheta) && Number.isFinite(axisPhi)) {
      useLabStore.getState().setMeasurementAxis({ theta: axisTheta!, phi: axisPhi! });
    }
  }
};
