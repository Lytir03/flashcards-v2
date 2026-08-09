/**
 * Wraps bare LaTeX in $...$ so it renders.
 *
 * Smaller models write "R^n" and "g_i(x)" as plain text instead of "$R^n$".
 * KaTeX only looks inside delimiters, so the reader sees a literal caret and
 * underscore instead of a formula.
 *
 * WHY AUTO-FIXING IS ACCEPTABLE HERE, having refused it elsewhere: adding
 * delimiters changes only presentation. "$g_i(x)$" and "g_i(x)" say the same
 * thing; one is legible. Rewriting a semicolon into a comma, by contrast,
 * asserts something about what the source meant. The test is whether the fix
 * could be wrong about the mathematics — this one cannot be.
 */

/** A `\command`: \lambda, \sum, \mathbb. */
const HAS_COMMAND = /\\[a-zA-Z]+/;
/** A sub- or superscript attached to something: x^2, g_i, R^{n}, a_{ij}. */
const HAS_SCRIPT = /[A-Za-z0-9})\]]\s*[_^]\s*(?:\{[^{}]*\}|[A-Za-z0-9+\-*]+)/;

/**
 * Tokens that join two halves of one formula — an operator, a lone variable,
 * a number. Single letters that are ordinary English words are excluded, or
 * "a \lambda value" would swallow the article.
 */
const CONNECTOR = /^(?:[=+\-*/<>|]|[A-Za-z](?:\([^()]*\))?|\d+)$/;
const ENGLISH_SINGLE_LETTERS = new Set(["a", "A", "I", "i"]);

type Kind = "math" | "connector" | "text" | "space";

/**
 * Splits trailing sentence punctuation off a token. A closing parenthesis is
 * only punctuation when it has no opener in the same token — otherwise "g_i(x)"
 * would be cut to "g_i(x" and the formula would not parse.
 */
function splitTrailing(token: string): { body: string; tail: string } {
  let end = token.length;

  while (end > 0) {
    const char = token[end - 1];
    if (",.;:!?".includes(char)) {
      end -= 1;
      continue;
    }
    if (char === ")") {
      const body = token.slice(0, end);
      const opens = (body.match(/\(/g) ?? []).length;
      const closes = (body.match(/\)/g) ?? []).length;
      if (closes > opens) {
        end -= 1;
        continue;
      }
    }
    break;
  }

  return { body: token.slice(0, end), tail: token.slice(end) };
}

function classify(token: string): Kind {
  if (/^\s+$/.test(token)) return "space";
  const { body } = splitTrailing(token);
  if (HAS_COMMAND.test(body) || HAS_SCRIPT.test(body)) return "math";
  if (CONNECTOR.test(body) && !ENGLISH_SINGLE_LETTERS.has(body)) {
    return "connector";
  }
  return "text";
}

export function autoWrapMath(input: string): string {
  // Mixed content is left alone: if delimiters are already in use, guessing
  // about the rest risks nesting $ inside $ and breaking what worked.
  if (!input || input.includes("$")) return input;
  if (!HAS_COMMAND.test(input) && !HAS_SCRIPT.test(input)) return input;

  return input.split("\n").map(wrapLine).join("\n");
}

function wrapLine(line: string): string {
  const tokens = line.split(/(\s+)/).filter((t) => t !== "");
  const kinds = tokens.map(classify);

  const out: string[] = [];
  let index = 0;

  while (index < tokens.length) {
    if (kinds[index] !== "math") {
      out.push(tokens[index]);
      index += 1;
      continue;
    }

    // Extend left through connectors, so "q \le f" becomes one formula
    // rather than "q $\le f$".
    let start = index;
    while (start >= 2 && kinds[start - 1] === "space") {
      if (kinds[start - 2] !== "connector") break;
      start -= 2;
    }

    // Extend right through connectors and further maths.
    let end = index;
    while (end + 2 < tokens.length && kinds[end + 1] === "space") {
      if (kinds[end + 2] !== "math" && kinds[end + 2] !== "connector") break;
      end += 2;
    }

    // Anything already emitted that now belongs to this run comes back out.
    out.length -= index - start;

    const joined = tokens.slice(start, end + 1).join("");
    const { body, tail } = splitTrailing(joined);
    out.push(`$${body}$${tail}`);

    index = end + 1;
  }

  return out.join("");
}
