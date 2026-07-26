/**
 * Educational interaction events (§18).
 *
 * §18 lists the events worth tracking and, just as firmly, what not to
 * collect: no raw free-form learner input, and nothing identifying. This
 * module enforces that shape rather than trusting each call site.
 *
 * There is no analytics vendor wired up, and no network call is made. Events
 * go to an in-memory ring buffer and, in development, the console. A
 * deployment that wants telemetry supplies a sink through `setAnalyticsSink`
 * and takes on the disclosure obligations that come with it — which is a
 * decision for whoever deploys this, not a default baked into the code.
 */

/** The events §18 names. Nothing outside this list can be recorded. */
export type AnalyticsEvent =
  | "lesson_started"
  | "lesson_section_completed"
  | "checkpoint_attempted"
  | "checkpoint_passed"
  | "explore_opened"
  | "preset_selected"
  | "gate_applied"
  | "measurement_basis_changed"
  | "bell_lesson_completed";

/**
 * Properties an event may carry.
 *
 * Deliberately narrow: identifiers of things the app itself defines (a section
 * id, a gate name, a preset name) and small counts. No free text, so a
 * learner's own words can never end up here.
 */
export type AnalyticsProperties = {
  sectionId?: string;
  concept?: string;
  gate?: string;
  preset?: string;
  basis?: string;
  qubitCount?: 1 | 2;
  attempt?: number;
  correct?: boolean;
};

export type AnalyticsRecord = {
  event: AnalyticsEvent;
  properties: AnalyticsProperties;
  /** Milliseconds since the page loaded — never a wall-clock timestamp. */
  elapsed: number;
};

export type AnalyticsSink = (record: AnalyticsRecord) => void;

const ALLOWED_KEYS: (keyof AnalyticsProperties)[] = [
  "sectionId",
  "concept",
  "gate",
  "preset",
  "basis",
  "qubitCount",
  "attempt",
  "correct",
];

const MAX_BUFFERED = 200;

let sink: AnalyticsSink | null = null;
const buffer: AnalyticsRecord[] = [];
const started = typeof performance === "undefined" ? 0 : performance.now();

/** Strip anything not on the allow-list, whatever a caller passes. */
const sanitise = (properties: AnalyticsProperties): AnalyticsProperties => {
  const clean: AnalyticsProperties = {};
  for (const key of ALLOWED_KEYS) {
    const value = properties[key];
    if (value !== undefined) {
      // Values are enumerations or small numbers; anything longer than a short
      // identifier is truncated rather than trusted.
      (clean as Record<string, unknown>)[key] =
        typeof value === "string" ? value.slice(0, 64) : value;
    }
  }
  return clean;
};

export const setAnalyticsSink = (next: AnalyticsSink | null): void => {
  sink = next;
};

export const track = (event: AnalyticsEvent, properties: AnalyticsProperties = {}): void => {
  const record: AnalyticsRecord = {
    event,
    properties: sanitise(properties),
    elapsed: Math.round((typeof performance === "undefined" ? 0 : performance.now()) - started),
  };
  buffer.push(record);
  if (buffer.length > MAX_BUFFERED) buffer.shift();
  sink?.(record);
};

/** The buffered events, for tests and for a debug panel. */
export const recordedEvents = (): readonly AnalyticsRecord[] => [...buffer];

export const clearRecordedEvents = (): void => {
  buffer.length = 0;
};
