/**
 * Renders one lesson section in the order §7 and the PRD both require:
 *
 *   question → picture → experiment → pattern → mathematics → summary → sandbox
 *
 * The mathematics sits behind a disclosure so the picture always arrives
 * first. The misconception guard sits *after* the experiment, where the
 * learner has just formed the intuition it is protecting.
 */

import { Link } from "react-router-dom";

import { track } from "../analytics";
import { useLabStore } from "../store/labStore";
import { Katex } from "../viz/Katex";
import { Checkpoint } from "./Checkpoint";
import type { LessonSection } from "./types";

export function LessonSectionView({ section }: { section: LessonSection }) {
  const setInitialState = useLabStore((state) => state.setInitialState);
  const setSelectedLesson = useLabStore((state) => state.setSelectedLesson);

  const openInExplore = () => {
    if (section.exploreState) setInitialState(section.exploreState());
    setSelectedLesson(section.id);
    track("explore_opened", { sectionId: section.id, concept: section.concept });
  };

  const toneClass = section.tone === "warm" ? " warm" : section.tone === "dark" ? " dark" : "";

  return (
    <section className={`section stage${toneClass}`} id={section.id} aria-labelledby={`${section.id}-title`}>
      <header>
        <span className="step">{String(section.index).padStart(2, "0")}</span>
        <div>
          <span className={`eyebrow ${section.index % 2 === 0 ? "mint" : "coral"}`}>
            {section.eyebrow}
          </span>
          <h2 id={`${section.id}-title`}>{section.title}</h2>
          <p>{section.summary}</p>
        </div>
      </header>

      <div className="lesson-visual">{section.visual()}</div>

      <div className="lesson-footer">
        <div className="misconception">
          <span className="eyebrow coral">MIND THE WORDING</span>
          <p className="misconception-wrong">
            <span aria-hidden="true">✗</span> “{section.misconception.wrong}”
            <span className="visually-hidden">is the phrasing to avoid.</span>
          </p>
          <p className="misconception-right">
            <span aria-hidden="true">✓</span> “{section.misconception.right}”
            <span className="visually-hidden">is the phrasing to use.</span>
          </p>
        </div>

        <details className="reveal maths-reveal">
          <summary>Show the mathematics</summary>
          <div className="equation-list">
            {section.equations.map((equation) => (
              <div key={equation.latex} className="equation-item">
                <Katex expression={equation.latex} block description={equation.gloss} />
                <p className="caption">{equation.gloss}</p>
              </div>
            ))}
          </div>
        </details>
      </div>

      {section.checkpoints.map((checkpoint) => (
        <Checkpoint key={checkpoint.question} checkpoint={checkpoint} sectionId={section.id} />
      ))}

      <p className="sandbox-link">
        <Link to="/explore" onClick={openInExplore} className="button ghost">
          Try this in the laboratory <span>→</span>
        </Link>
      </p>
    </section>
  );
}
