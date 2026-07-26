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
  const store = useLabStore.getState();

  const amplitudes = parameters.get("amplitudes");
  if (amplitudes) {
    const parsed = amplitudes.split(",").map((token) => {
      const [re, im] = token.split("_").map(Number);
      return { re: re ?? Number.NaN, im: im ?? Number.NaN };
    });
    const valid =
      (parsed.length === 2 || parsed.length === 4) &&
      parsed.every((value) => Number.isFinite(value.re) && Number.isFinite(value.im));
    const norm = Math.sqrt(
      parsed.reduce((total, value) => total + value.re ** 2 + value.im ** 2, 0),
    );
    if (valid && Math.abs(norm - 1) < 1e-3) store.setInitialState(parsed);
  } else {
    const theta = Number(parameters.get("theta"));
    const phi = Number(parameters.get("phi"));
    if (parameters.has("theta") && Number.isFinite(theta) && Number.isFinite(phi)) {
      store.setInitialState(qubitFromAngles(theta, phi));
    }
  }

  const qubitCount = useLabStore.getState().currentState.qubitCount;

  const circuit = parameters.get("circuit");
  if (circuit) {
    for (const token of circuit.split(",")) {
      // `GATE@t0-t1:angle`, with the older `GATE:angle` form still accepted.
      const [head, angle] = token.split(":");
      if (!head) continue;
      const [name, targetList] = head.split("@");
      if (!name || !KNOWN_GATES.has(name)) continue;
      const gate = name as GateName;
      const targets =
        targetList === undefined
          ? [0]
          : targetList.split("-").map(Number).filter(Number.isInteger);
      if (targets.length !== gateQubitCount(gate)) continue;
      if (targets.some((target) => target < 0 || target >= qubitCount)) continue;
      const parsed = angle === undefined ? undefined : Number(angle);
      if (parsed !== undefined && !Number.isFinite(parsed)) continue;
      useLabStore
        .getState()
        .applyGate(
          gate,
          targets,
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
