/**
 * The guided lesson.
 *
 * Phase 2 delivers the hero that opens it. The data-driven sections of §7 and
 * §8 — classical bit, qubit, polarisation, spin, phase, Pauli, unitary,
 * measurement and observables — are Phase 3, and the two-qubit and EPR
 * sections are Phases 4 and 5.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { ketPlus, qubitFromAngles } from "../math";
import { BlochSphere } from "../viz/BlochSphere";

export function LessonFlow() {
  const [state, setState] = useState(ketPlus);
  const [drifting, setDrifting] = useState(true);

  // A slow drift makes the hero feel alive; interacting with it stops the
  // drift so the learner is never fighting the animation for control.
  useEffect(() => {
    if (!drifting) return undefined;
    let frame = 0;
    let raf = 0;
    const tick = () => {
      frame += 1;
      setState(qubitFromAngles(Math.PI / 2.6 + Math.sin(frame / 190) * 0.34, frame / 150));
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [drifting]);

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">AN INTERACTIVE FIELD GUIDE</span>
          <h1>
            A classical bit has two positions.
            <br />
            A qubit has <em>infinitely many directions.</em>
          </h1>
          <p>
            Quantum computing is usually introduced as a wall of matrices. It does not have to be.
            Start with a picture you can move, notice what changes and what stubbornly does not,
            and let the notation arrive once it has something to describe.
          </p>
          <Link className="button primary" to="/explore">
            Open the laboratory <span>→</span>
          </Link>
        </div>
        <div className="hero-art">
          <BlochSphere
            state={state}
            interactive
            showAxes
            showPhaseArc
            size={430}
            onStateChange={(next) => {
              setDrifting(false);
              setState(next);
            }}
            label="The state of a single qubit"
          />
        </div>
      </section>

      <section className="section stage">
        <header>
          <span className="step">01</span>
          <div>
            <span className="eyebrow mint">THE GUIDED LESSON</span>
            <h2>Fourteen sections, one idea at a time.</h2>
            <p>
              Each section asks one question, gives you something to manipulate, waits for you to
              notice the pattern, and only then writes down the mathematics. The Explore
              laboratory is open the whole time.
            </p>
          </div>
        </header>
        <p className="notice">
          The guided sections are being built. The Explore laboratory is complete for one qubit —
          prepare a state, rotate it with gates, choose a measurement axis and gather statistics.
        </p>
      </section>
    </main>
  );
}
