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

/**
 * Strip the one place a forbidden phrase is allowed to appear: the `wrong`
 * field of a misconception guard, which exists precisely to quote the bad
 * phrasing and cross it out (§8.1). The exemption is narrow on purpose — it
 * covers that field and nothing else, and the tests below check that every
 * such field is genuinely paired with a correction.
 */
const withoutGuardedMentions = (text: string): string =>
  text.replace(/wrong:\s*(["'])(?:\\.|(?!\1).)*\1/gs, "wrong: <quoted misconception>");

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

describe("misconception guards are honest", () => {
  it("pairs every quoted misconception with a correction", async () => {
    const { LESSON_SECTIONS } = await import("../lesson/sections");
    for (const section of LESSON_SECTIONS) {
      expect(section.misconception.wrong.trim().length, section.id).toBeGreaterThan(0);
      expect(section.misconception.right.trim().length, section.id).toBeGreaterThan(0);
      expect(section.misconception.wrong, section.id).not.toEqual(section.misconception.right);
    }
  });

  it("keeps the forbidden phrasings out of every field except `wrong`", async () => {
    const { LESSON_SECTIONS } = await import("../lesson/sections");
    const forbidden = /\bboth\s+0\s+and\s+1\b/i;
    for (const section of LESSON_SECTIONS) {
      const prose = [
        section.title,
        section.summary,
        section.misconception.right,
        ...section.equations.map((equation) => equation.gloss),
        ...section.checkpoints.flatMap((checkpoint) => [
          checkpoint.question,
          ...checkpoint.options.flatMap((option) => [option.label, option.response]),
        ]),
      ].join(" ");
      expect(forbidden.test(prose), section.id).toBe(false);
    }
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
