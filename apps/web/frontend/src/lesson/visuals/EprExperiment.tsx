/**
 * §8.11 — EPR correlations and CHSH.
 *
 * Alice on the left, Bob on the right, a source in the middle, independent
 * angle dials, a trial counter, an outcome table and the correlation curve.
 *
 * Two things this panel is careful about. The correlation is only ever shown
 * as something you compute *after* bringing both lists of results together —
 * the marginals are displayed alongside precisely so a learner can see that
 * neither observer's own statistics move when the other dial turns. And the
 * CHSH panel is labelled an ideal theoretical model: no detector
 * inefficiency, no locality loopholes, and no claim to be a real Bell test
 * (§8.11).
 */

import { useMemo, useState } from "react";

import {
  CHSH_CLASSICAL_BOUND,
  CHSH_QUANTUM_BOUND,
  type JointOutcomeKey,
  JOINT_OUTCOME_KEYS,
  bellPsiMinus,
  chshValue,
  correlation,
  jointSpinProbabilities,
  marginalProbabilities,
  mulberry32,
  planarAxis,
  sampleJointMeasurements,
  singletCorrelation,
} from "../../math";

const degrees = (radians: number) => (radians * 180) / Math.PI;
const toRadians = (deg: number) => (deg * Math.PI) / 180;

const OUTCOME_LABEL: Record<JointOutcomeKey, string> = {
  "++": "+1, +1",
  "+-": "+1, −1",
  "-+": "−1, +1",
  "--": "−1, −1",
};

/** The settings that reach the Tsirelson bound, offered as a preset. */
const OPTIMAL_CHSH = { a: 0, aPrime: 90, b: 45, bPrime: -45 };

export function EprExperiment() {
  const singlet = useMemo(bellPsiMinus, []);

  const [alice, setAlice] = useState(0);
  const [bob, setBob] = useState(45);
  const [counts, setCounts] = useState<Record<JointOutcomeKey, number>>({
    "++": 0,
    "+-": 0,
    "-+": 0,
    "--": 0,
  });
  const [trials, setTrials] = useState(0);

  const [chsh, setChsh] = useState(OPTIMAL_CHSH);

  const axisA = planarAxis(toRadians(alice));
  const axisB = planarAxis(toRadians(bob));
  const joint = jointSpinProbabilities(singlet, axisA, axisB);
  const expected = correlation(singlet, axisA, axisB);
  const marginals = marginalProbabilities(singlet, axisA, axisB);

  const observedCorrelation =
    trials === 0
      ? null
      : (counts["++"] - counts["+-"] - counts["-+"] + counts["--"]) / trials;

  const runTrials = (count: number) => {
    const batch = sampleJointMeasurements(
      singlet,
      axisA,
      axisB,
      count,
      mulberry32(trials * 7919 + alice * 31 + bob + 1),
    );
    setCounts((current) => {
      const merged = { ...current };
      for (const key of JOINT_OUTCOME_KEYS) merged[key] += batch[key];
      return merged;
    });
    setTrials((current) => current + count);
  };

  const clear = () => {
    setCounts({ "++": 0, "+-": 0, "-+": 0, "--": 0 });
    setTrials(0);
  };

  const sValue = chshValue(
    singlet,
    planarAxis(toRadians(chsh.a)),
    planarAxis(toRadians(chsh.aPrime)),
    planarAxis(toRadians(chsh.b)),
    planarAxis(toRadians(chsh.bPrime)),
  );
  const beatsClassical = Math.abs(sValue) > CHSH_CLASSICAL_BOUND + 1e-9;

  return (
    <div className="lesson-stack">
      <div className="epr-stage">
        <ExperimentDiagram alice={alice} bob={bob} />

        <div className="epr-dials">
          <label className="range">
            Alice's angle: <b>{alice}°</b>
            <input
              type="range"
              min={-180}
              max={180}
              step={5}
              value={alice}
              onChange={(event) => {
                setAlice(Number(event.target.value));
                clear();
              }}
            />
          </label>
          <label className="range">
            Bob's angle: <b>{bob}°</b>
            <input
              type="range"
              min={-180}
              max={180}
              step={5}
              value={bob}
              onChange={(event) => {
                setBob(Number(event.target.value));
                clear();
              }}
            />
          </label>
          <p className="reading">
            angle between the dials <b>{Math.abs(bob - alice)}°</b> · predicted correlation{" "}
            <b>{expected.toFixed(3)}</b>
            {observedCorrelation !== null && (
              <>
                {" "}
                · observed <b>{observedCorrelation.toFixed(3)}</b> from {trials.toLocaleString()}{" "}
                trials
              </>
            )}
          </p>
          <div className="gate-palette">
            <button type="button" onClick={() => runTrials(100)}>
              Run 100 pairs
            </button>
            <button type="button" onClick={() => runTrials(1000)}>
              Run 1,000
            </button>
            <button type="button" onClick={clear}>
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="epr-results">
        <div>
          <h3>Outcomes</h3>
          <table className="correlation-table">
            <caption className="visually-hidden">
              Joint outcomes for Alice and Bob, with predicted and observed frequencies.
            </caption>
            <thead>
              <tr>
                <th scope="col">Alice, Bob</th>
                <th scope="col">predicted</th>
                <th scope="col">observed</th>
              </tr>
            </thead>
            <tbody>
              {JOINT_OUTCOME_KEYS.map((key) => (
                <tr key={key}>
                  <th scope="row">{OUTCOME_LABEL[key]}</th>
                  <td>{(joint[key] * 100).toFixed(1)}%</td>
                  <td>
                    {trials === 0
                      ? "—"
                      : `${((counts[key] / trials) * 100).toFixed(1)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h4 className="panel-subhead">What each of them sees alone</h4>
          <p className="reading">
            Alice: <b>{(marginals.alice.plus * 100).toFixed(1)}%</b> for +1 ·{" "}
            Bob: <b>{(marginals.bob.plus * 100).toFixed(1)}%</b> for +1
          </p>
          <p className="notice mint-notice">
            Turn either dial as far as you like: both of these stay at 50%. Neither observer's own
            results depend on the other's setting, so no measurement here can carry anything from
            one side to the other. The correlation only appears once the two lists of results are
            brought together — and bringing them together needs an ordinary channel.
          </p>
        </div>

        <div>
          <h3>The correlation curve</h3>
          <CorrelationCurve alice={alice} bob={bob} observed={observedCorrelation} />
          <p className="caption">
            E(θ) = −cos θ, where θ is the angle between the two dials. At 0° the outcomes are
            always opposite; at 180° always equal; at 90° there is no correlation at all.
          </p>
        </div>
      </div>

      <details className="reveal advanced-panel">
        <summary>Advanced — the CHSH inequality</summary>
        <div style={{ marginTop: 18 }}>
          <p>
            Each observer picks between two settings. Compute S from four correlations. Any theory
            in which each particle carries its answers with it, and neither is influenced by the
            other's setting, obeys |S| ≤ 2. The singlet reaches 2√2.
          </p>
          <div className="chsh-controls">
            {(
              [
                ["a", "Alice a"],
                ["aPrime", "Alice a′"],
                ["b", "Bob b"],
                ["bPrime", "Bob b′"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="range">
                {label}: <b>{chsh[key]}°</b>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  step={5}
                  value={chsh[key]}
                  onChange={(event) =>
                    setChsh((current) => ({ ...current, [key]: Number(event.target.value) }))
                  }
                />
              </label>
            ))}
          </div>

          <div className="chsh-scale" role="img" aria-label={`S equals ${sValue.toFixed(3)}. The classical bound is 2 and the quantum maximum is ${CHSH_QUANTUM_BOUND.toFixed(3)}.`}>
            <span className="chsh-classical" style={{ width: `${(CHSH_CLASSICAL_BOUND / CHSH_QUANTUM_BOUND) * 100}%` }} />
            <span
              className="chsh-marker"
              style={{ left: `${Math.min(100, (Math.abs(sValue) / CHSH_QUANTUM_BOUND) * 100)}%` }}
            />
          </div>
          <div className="entanglement-ends" aria-hidden="true">
            <span>0</span>
            <span>2 · classical limit</span>
            <span>2√2</span>
          </div>

          <p className="reading">
            S = <b>{sValue.toFixed(4)}</b> · |S| = <b>{Math.abs(sValue).toFixed(4)}</b>
          </p>
          <p className={beatsClassical ? "notice violet-notice" : "notice"}>
            {beatsClassical
              ? `|S| exceeds 2, which no local hidden-variable model can do. At these settings quantum mechanics predicts ${Math.abs(sValue).toFixed(3)}.`
              : "|S| is within the classical bound at these settings. Try the optimal angles below."}
          </p>
          <div className="gate-palette">
            <button type="button" onClick={() => setChsh(OPTIMAL_CHSH)}>
              Optimal settings
            </button>
            <button
              type="button"
              onClick={() => setChsh({ a: 0, aPrime: 0, b: 0, bPrime: 0 })}
            >
              All aligned
            </button>
          </div>

          <p className="notice" style={{ marginTop: 18 }}>
            This is an ideal theoretical model. It assumes perfect detectors, perfect state
            preparation and perfectly free setting choices. A real Bell test has to close
            detection and locality loopholes experimentally, and none of that is simulated here.
          </p>
        </div>
      </details>
    </div>
  );
}

function ExperimentDiagram({ alice, bob }: { alice: number; bob: number }) {
  return (
    <svg
      viewBox="0 0 520 190"
      className="epr-diagram"
      role="img"
      aria-label={`A source in the centre emits a pair. Alice's analyser on the left is set to ${alice} degrees and Bob's on the right to ${bob} degrees.`}
    >
      <line x1="150" y1="95" x2="245" y2="95" stroke="#8ea39e" strokeDasharray="4 5" />
      <line x1="275" y1="95" x2="370" y2="95" stroke="#8ea39e" strokeDasharray="4 5" />

      <circle cx="260" cy="95" r="17" fill="#102224" />
      <text x="260" y="134" className="diagram-label" textAnchor="middle">
        source
      </text>
      <text x="260" y="148" className="diagram-label" textAnchor="middle">
        |Ψ⁻⟩
      </text>

      {(
        [
          { x: 110, angle: alice, name: "Alice" },
          { x: 410, angle: bob, name: "Bob" },
        ] as const
      ).map((side) => (
        <g key={side.name}>
          <g transform={`translate(${side.x} 95) rotate(${-side.angle})`}>
            <circle r="34" fill="#f8f5ee" stroke="#102224" strokeWidth="1.4" />
            <line x1="0" y1="-30" x2="0" y2="30" stroke="#8a7cc8" strokeWidth="3" />
          </g>
          <text x={side.x} y="152" className="diagram-label" textAnchor="middle">
            {side.name} {side.angle}°
          </text>
        </g>
      ))}
    </svg>
  );
}

function CorrelationCurve({
  alice,
  bob,
  observed,
}: {
  alice: number;
  bob: number;
  observed: number | null;
}) {
  const width = 420;
  const height = 210;
  const padding = 34;
  const separation = bob - alice;

  const xFor = (deg: number) => padding + ((deg + 180) / 360) * (width - 2 * padding);
  const yFor = (value: number) => padding + ((1 - value) / 2) * (height - 2 * padding);

  const path = Array.from({ length: 145 }, (_, index) => {
    const deg = -180 + index * 2.5;
    return `${index === 0 ? "M" : "L"}${xFor(deg).toFixed(2)} ${yFor(
      singletCorrelation(toRadians(deg)),
    ).toFixed(2)}`;
  }).join(" ");

  const wrapped = ((separation + 180) % 360) - 180;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="correlation-curve"
      role="img"
      aria-label={`The correlation curve E of theta equals minus cosine theta. At the current separation of ${wrapped} degrees the predicted correlation is ${singletCorrelation(
        toRadians(wrapped),
      ).toFixed(3)}.`}
    >
      <line x1={padding} y1={yFor(0)} x2={width - padding} y2={yFor(0)} stroke="#c9c6bc" />
      <line x1={xFor(0)} y1={padding} x2={xFor(0)} y2={height - padding} stroke="#c9c6bc" />
      <path d={path} fill="none" stroke="#ef7c64" strokeWidth="2" />

      <line
        x1={xFor(wrapped)}
        y1={padding}
        x2={xFor(wrapped)}
        y2={height - padding}
        stroke="#8a7cc8"
        strokeDasharray="3 4"
      />
      <circle
        cx={xFor(wrapped)}
        cy={yFor(singletCorrelation(toRadians(wrapped)))}
        r="5"
        fill="#8a7cc8"
      />
      {observed !== null && (
        <circle
          cx={xFor(wrapped)}
          cy={yFor(observed)}
          r="4"
          fill="none"
          stroke="#3ca782"
          strokeWidth="2"
        />
      )}

      <text x={xFor(-180)} y={height - 12} className="diagram-label" textAnchor="middle">
        −180°
      </text>
      <text x={xFor(0)} y={height - 12} className="diagram-label" textAnchor="middle">
        0°
      </text>
      <text x={xFor(180)} y={height - 12} className="diagram-label" textAnchor="middle">
        180°
      </text>
      <text x={12} y={yFor(1) + 4} className="diagram-label">
        +1
      </text>
      <text x={12} y={yFor(-1) + 4} className="diagram-label">
        −1
      </text>
    </svg>
  );
}

export const __testing = { degrees, OPTIMAL_CHSH };
