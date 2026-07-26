/**
 * Application shell: navigation, routing, glossary and display preferences.
 *
 * The shell follows the QuasiShor pattern so the two apps read as one family:
 * a sticky bar with the mark on the left, the two modes in the centre and the
 * glossary on the right.
 */

import { useState } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";

import { ExplorePanel } from "./explore/ExplorePanel";
import { LessonFlow } from "./lesson/LessonFlow";
import { Glossary } from "./ui/Glossary";
import { usePreferences } from "./ui/preferences";

const Brand = ({ inverse = false }: { inverse?: boolean }) => (
  <>
    <i>ψ</i>
    <span>
      QUANTUM <strong>FOUNDATIONS</strong>
    </span>
    {inverse ? null : null}
  </>
);

export default function App() {
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const { highContrast, reducedMotion, toggleHighContrast, toggleReducedMotion } = usePreferences();
  // Explore is a working dashboard rather than a reading surface, so it gets
  // a shorter navigation bar and gives the extra height back to the panels.
  const isExplore = useLocation().pathname.startsWith("/explore");

  return (
    <div
      className={[
        "app",
        isExplore ? "explore-mode" : "",
        highContrast ? "high-contrast" : "",
        reducedMotion ? "reduced-motion" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <nav>
        <NavLink to="/" className="brand" aria-label="Quantum Foundations Lab, home">
          <Brand />
        </NavLink>
        <div className="nav-modes">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
            Guided lesson
          </NavLink>
          <NavLink to="/explore" className={({ isActive }) => (isActive ? "active" : "")}>
            Explore
          </NavLink>
        </div>
        <button
          type="button"
          className="glossary-button"
          onClick={toggleHighContrast}
          aria-pressed={highContrast}
          title="High-contrast mode"
        >
          Contrast
        </button>
        <button
          type="button"
          className="glossary-button"
          onClick={toggleReducedMotion}
          aria-pressed={reducedMotion}
          title="Reduce motion"
          style={{ marginLeft: 14 }}
        >
          Motion
        </button>
        <button
          type="button"
          className="glossary-button"
          onClick={() => setGlossaryOpen(true)}
          style={{ marginLeft: 14 }}
        >
          Glossary <span>↗</span>
        </button>
      </nav>

      <div id="main-content">
        <Routes>
          <Route path="/" element={<LessonFlow />} />
          <Route path="/explore" element={<ExplorePanel />} />
          <Route path="*" element={<LessonFlow />} />
        </Routes>
      </div>

      <footer>
        <div className="brand inverse">
          <Brand inverse />
        </div>
        <p>
          A visual path from qubits to entanglement. Manipulate a state, apply a gate, choose what
          to measure — then reveal the mathematics behind the picture.
        </p>
        <small>A mathematical teaching model · Not a hardware simulator</small>
      </footer>

      <Glossary open={glossaryOpen} close={() => setGlossaryOpen(false)} />
    </div>
  );
}
