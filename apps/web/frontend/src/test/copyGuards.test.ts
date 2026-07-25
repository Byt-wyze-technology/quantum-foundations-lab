/**
 * Copy guards (§15, §21).
 *
 * Two claims must never appear in this interface: that a qubit "is both 0 and
 * 1" without qualification, and that entanglement sends information. These are
 * the misconceptions §1 explicitly forbids, and the cheapest place to catch a
 * regression is a scan of the source itself — a reviewer can forget, a test
 * cannot.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE_ROOT = join(__dirname, "..");

const collectSources = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return collectSources(path);
    return /\.(tsx?|css)$/.test(entry) && !entry.includes(".test.") ? [path] : [];
  });

const sources = collectSources(SOURCE_ROOT).map((path) => ({
  path,
  text: readFileSync(path, "utf8"),
}));

/** Strip the qualified explanations that are allowed to mention a forbidden phrase. */
const withoutGuardedMentions = (text: string): string =>
  text
    // The misconception guard itself quotes the wrong phrasing in order to reject it.
    .replace(/Do not say[\s\S]{0,400}?Use:/g, "")
    .replace(/never says?[^\n]*\n/g, "");

describe("misconception guards", () => {
  it("never claims a qubit is both 0 and 1", () => {
    const offenders = sources.filter(({ text }) =>
      /\b(both\s+0\s+and\s+1|both\s+zero\s+and\s+one|both\s+\|0.\s*and\s*\|1.)/i.test(
        withoutGuardedMentions(text),
      ),
    );
    expect(offenders.map((entry) => entry.path)).toEqual([]);
  });

  it("never claims entanglement transmits information", () => {
    const forbidden =
      /(entangle\w*|measurement)[^.]{0,80}(sends?|transmits?|carries|communicates)\s+(information|a\s+signal|data)/i;
    const offenders = sources.filter(({ text }) => {
      const stripped = withoutGuardedMentions(text);
      // "no information travels" and similar denials are the point, not a breach.
      const withoutDenials = stripped.replace(
        /\b(no|never|not|cannot|does not|doesn't)\b[^.]{0,120}\./gi,
        "",
      );
      return forbidden.test(withoutDenials);
    });
    expect(offenders.map((entry) => entry.path)).toEqual([]);
  });

  it("never describes the Bloch sphere as a physical object", () => {
    const forbidden = /(bloch sphere|sphere)\s+is\s+(a\s+)?(real|physical|actual)\s/i;
    const offenders = sources.filter(({ text }) => forbidden.test(text));
    expect(offenders.map((entry) => entry.path)).toEqual([]);
  });

  it("never describes spin as a spinning ball", () => {
    const forbidden = /(spinning|rotating)\s+(ball|sphere|top)\b/i;
    const offenders = sources.filter(({ text }) => {
      const stripped = text.replace(
        /\b(no|never|not|is not|isn't)\b[^.]{0,160}\./gi,
        "",
      );
      return forbidden.test(stripped);
    });
    expect(offenders.map((entry) => entry.path)).toEqual([]);
  });
});

describe("required framing", () => {
  it("states somewhere that a measured qubit stays where it collapsed", () => {
    const combined = sources.map((entry) => entry.text).join("\n");
    expect(combined).toMatch(/fresh preparation/i);
  });

  it("states that the app is a teaching model rather than a hardware simulator", () => {
    const combined = sources.map((entry) => entry.text).join("\n");
    expect(combined).toMatch(/not a hardware simulator/i);
  });
});
