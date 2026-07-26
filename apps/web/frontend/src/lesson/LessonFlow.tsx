/**
 * The guided lesson.
 *
 * Phase 3 delivers the one-qubit path: §8.1–§8.5, §8.7 and §8.8. Tensor
 * products, entanglement, Bell states and EPR join it in Phases 4 and 5.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { track } from "../analytics";
import { ketPlus, qubitFromAngles } from "../math";
import { usePreferences } from "../ui/preferences";
import { BlochSphere } from "../viz/BlochSphere";
import { LessonSectionView } from "./LessonSectionView";
import { LESSON_SECTIONS } from "./sections";

function HeroSphere() {
  const reducedMotion = usePreferences((state) => state.reducedMotion);
  const [state, setState] = useState(ketPlus);
  const [drifting, setDrifting] = useState(true);

  // A slow drift makes the hero feel alive. Touching it stops the drift, so
  // the learner is never fighting the animation for control, and reduced-motion
  // preferences switch it off entirely (§16).
  useEffect(() => {
    if (!drifting || reducedMotion) return undefined;
    let frame = 0;
    let raf = 0;
    const tick = () => {
      frame += 1;
      setState(qubitFromAngles(Math.PI / 2.6 + Math.sin(frame / 190) * 0.34, frame / 150));
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [drifting, reducedMotion]);

  return (
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
  );
}

export function LessonFlow() {
  // One event when the lesson opens, and one when the learner reaches the
  // Bell section — the two §18 singles out as milestones.
  useEffect(() => {
    track("lesson_started");
    const bell = document.getElementById("bell");
    if (!bell || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          track("bell_lesson_completed", { sectionId: "bell" });
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(bell);
    return () => observer.disconnect();
  }, []);

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
          <a className="button primary" href={`#${LESSON_SECTIONS[0]!.id}`}>
            Start the lesson <span>↓</span>
          </a>
          <Link className="button ghost" to="/explore">
            Open the laboratory
          </Link>
        </div>
        <div className="hero-art">
          <HeroSphere />
        </div>
      </section>

      {LESSON_SECTIONS.map((section) => (
        <LessonSectionView key={section.id} section={section} />
      ))}

      <section className="section stage">
        <header>
          <span className="step">→</span>
          <div>
            <span className="eyebrow mint">WHAT COMES NEXT</span>
            <h2>One qubit understood. Now two.</h2>
            <p>
              Everything so far concerned a single qubit, where a Bloch sphere tells the whole
              story. Two qubits break that picture — and the way it breaks is exactly what makes
              entanglement worth the name. Those sections are being built.
            </p>
          </div>
        </header>
        <div className="finish">
          <h2>Take it apart yourself.</h2>
          <p>
            The laboratory has every control from these sections in one place: prepare any state,
            apply any gate, point the measurement device wherever you like, and gather as many
            shots as you want.
          </p>
          <Link className="button primary" to="/explore">
            Enter the laboratory <span>→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
