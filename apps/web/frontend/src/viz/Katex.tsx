/**
 * KaTeX rendering (§3).
 *
 * Rendering is wrapped in a try/catch: a malformed expression must degrade to
 * readable source text rather than blanking a lesson panel.
 */

import katex from "katex";
import "katex/dist/katex.min.css";
import { useMemo } from "react";

export type KatexProps = {
  expression: string;
  block?: boolean;
  /** Spoken equivalent, since KaTeX output is not readable aloud (§16). */
  description?: string;
};

export function Katex({ expression, block = false, description }: KatexProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(expression, {
        displayMode: block,
        throwOnError: false,
        output: "html",
      });
    } catch {
      return null;
    }
  }, [expression, block]);

  if (html === null) {
    return <code>{expression}</code>;
  }

  return (
    <span role={description ? "img" : undefined} aria-label={description}>
      <span aria-hidden={description ? true : undefined} dangerouslySetInnerHTML={{ __html: html }} />
    </span>
  );
}
