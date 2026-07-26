/**
 * A short knowledge check (§7).
 *
 * A wrong answer explains *why* it is wrong rather than only marking it, and
 * the options stay live so the learner can try again — the check is here to
 * teach, not to score.
 */

import { useState } from "react";

import { track } from "../analytics";
import type { Checkpoint as CheckpointData } from "./types";

export function Checkpoint({
  checkpoint,
  sectionId,
}: {
  checkpoint: CheckpointData;
  sectionId: string;
}) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const selected = chosen === null ? null : checkpoint.options[chosen]!;

  const choose = (index: number) => {
    const option = checkpoint.options[index]!;
    const attempt = attempts + 1;
    setAttempts(attempt);
    setChosen(index);
    track("checkpoint_attempted", { sectionId, attempt, correct: option.correct });
    if (option.correct) track("checkpoint_passed", { sectionId, attempt });
  };

  return (
    <div className="quiz-card">
      <p>
        <span className="eyebrow coral">CHECKPOINT</span>
      </p>
      <p className="quiz-question">{checkpoint.question}</p>
      {checkpoint.options.map((option, index) => (
        <button
          key={option.label}
          type="button"
          id={`${sectionId}-option-${index}`}
          onClick={() => choose(index)}
          className={chosen === index ? (option.correct ? "correct" : "wrong") : ""}
          aria-pressed={chosen === index}
        >
          {option.label}
        </button>
      ))}
      {selected && (
        <p className={selected.correct ? "feedback good" : "feedback"} role="status">
          {selected.response}
        </p>
      )}
    </div>
  );
}
