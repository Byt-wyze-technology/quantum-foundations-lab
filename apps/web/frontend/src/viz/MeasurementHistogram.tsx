/**
 * The measurement histogram (§10).
 *
 * Shows three things at once, and §21 requires them to stay distinguishable:
 * the *expected* probability the state predicts, the *observed* frequency from
 * a finite number of shots, and the sampling uncertainty on that observation.
 * A learner who sees 47/100 instead of 50/100 should be able to read straight
 * off the chart whether that is surprising.
 */

import { samplingUncertainty } from "../math";

export type HistogramEntry = {
  label: string;
  expected: number;
  observed: number;
};

export type MeasurementHistogramProps = {
  entries: HistogramEntry[];
  totalShots: number;
};

export function MeasurementHistogram({ entries, totalShots }: MeasurementHistogramProps) {
  const hasShots = totalShots > 0;

  return (
    <div>
      <div className="histogram">
        {entries.map((entry) => {
          const frequency = hasShots ? entry.observed / totalShots : 0;
          const sigma = samplingUncertainty(entry.expected, totalShots);
          const bandTop = Math.min(1, entry.expected + sigma);
          const bandBottom = Math.max(0, entry.expected - sigma);
          return (
            <div className="histogram-column" key={entry.label}>
              <div className="histogram-bar-area">
                {hasShots && sigma > 0 && (
                  <div
                    className="histogram-uncertainty"
                    style={{
                      bottom: `${bandBottom * 100}%`,
                      height: `${(bandTop - bandBottom) * 100}%`,
                    }}
                    aria-hidden="true"
                  />
                )}
                <div
                  className="histogram-expected"
                  style={{ bottom: `${entry.expected * 100}%` }}
                  aria-hidden="true"
                />
                <div
                  className="histogram-observed"
                  style={{ height: `${frequency * 100}%` }}
                  role="img"
                  aria-label={`Outcome ${entry.label}: expected ${(entry.expected * 100).toFixed(
                    1,
                  )} per cent, observed ${
                    hasShots ? `${(frequency * 100).toFixed(1)} per cent from ${entry.observed} of ${totalShots} shots` : "no shots yet"
                  }.`}
                />
              </div>
              <div className="histogram-caption">
                <b>{entry.label}</b>
                {hasShots ? `${entry.observed} · ${(frequency * 100).toFixed(1)}%` : "—"}
                <br />
                exp {(entry.expected * 100).toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
      <div className="histogram-legend">
        <span className="legend-observed">Observed frequency</span>
        <span className="legend-expected">Expected probability</span>
        {hasShots && <span>{totalShots.toLocaleString()} shots</span>}
      </div>
      <p className="caption">
        Each shot is a fresh preparation of the same state, measured once. This is not one
        qubit measured repeatedly — a measured qubit stays where it collapsed.
      </p>
    </div>
  );
}
