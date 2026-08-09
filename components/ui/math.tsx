"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { Fragment, useMemo } from "react";
import { autoWrapMath } from "@/lib/math/autowrap";

/**
 * Renders text containing LaTeX: $...$ inline, $$...$$ displayed.
 *
 * Only the math segments become HTML, and that HTML comes from KaTeX, which
 * escapes its input. The prose between formulas stays a React text node and is
 * never passed through dangerouslySetInnerHTML — which matters because this
 * text was written by a language model reading an arbitrary uploaded file.
 */

type Segment =
  | { type: "text"; value: string }
  | { type: "math"; value: string; display: boolean };

const SPLIT = /(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g;

function parse(input: string): Segment[] {
  return input
    .split(SPLIT)
    .filter((part) => part !== "")
    .map((part): Segment => {
      if (part.startsWith("$$") && part.endsWith("$$") && part.length > 4) {
        return { type: "math", value: part.slice(2, -2), display: true };
      }
      if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
        return { type: "math", value: part.slice(1, -1), display: false };
      }
      return { type: "text", value: part };
    });
}

export function Math({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const segments = useMemo(
    () => parse(autoWrapMath(children ?? "")),
    [children],
  );

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <Fragment key={index}>{segment.value}</Fragment>;
        }

        let html: string;
        try {
          html = katex.renderToString(segment.value, {
            displayMode: segment.display,
            // Broken LaTeX is shown in red rather than throwing: a malformed
            // formula is information — it usually means the transcription of
            // that slide went wrong — and a crashed page hides it.
            throwOnError: false,
            errorColor: "#dc2626",
            strict: false,
          });
        } catch {
          return (
            <code key={index} className="text-red-500">
              {segment.value}
            </code>
          );
        }

        return (
          <span
            key={index}
            className={segment.display ? "my-2 block overflow-x-auto" : ""}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
}
