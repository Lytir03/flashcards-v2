import { describe, expect, it } from "vitest";
import { autoWrapMath } from "./autowrap";

describe("wraps bare LaTeX", () => {
  it("wraps a subscripted term", () => {
    expect(autoWrapMath("The constraint g_i(x) must hold.")).toBe(
      "The constraint $g_i(x)$ must hold.",
    );
  });

  it("wraps a superscript", () => {
    expect(autoWrapMath("defined on the set R^n here")).toBe(
      "defined on the set $R^n$ here",
    );
  });

  it("wraps a backslash command", () => {
    expect(autoWrapMath("the multiplier \\lambda is free")).toBe(
      "the multiplier $\\lambda$ is free",
    );
  });

  it("joins an expression into a single formula", () => {
    expect(autoWrapMath("We have L = f(x) + \\sum_{i=1}^{m} \\lambda_i g_i(x)")).toBe(
      "We have $L = f(x) + \\sum_{i=1}^{m} \\lambda_i g_i(x)$",
    );
  });

  it("keeps sentence punctuation outside the formula", () => {
    expect(autoWrapMath("bounded by R^n.")).toBe("bounded by $R^n$.");
    expect(autoWrapMath("either g_i(x), or nothing")).toBe(
      "either $g_i(x)$, or nothing",
    );
  });

  it("handles braces in scripts", () => {
    expect(autoWrapMath("the matrix a_{ij} entry")).toBe(
      "the matrix $a_{ij}$ entry",
    );
  });
});

describe("leaves things alone", () => {
  it("does not touch text that already has delimiters", () => {
    const input = "Already fine: $g_i(x) \\le 0$ and R^n untouched";
    expect(autoWrapMath(input)).toBe(input);
  });

  it("does not touch plain prose", () => {
    const input = "The citric acid cycle occurs in the mitochondrial matrix.";
    expect(autoWrapMath(input)).toBe(input);
  });

  it("does not touch an empty string", () => {
    expect(autoWrapMath("")).toBe("");
  });

  it("leaves prose words with no maths untouched around a formula", () => {
    expect(autoWrapMath("Weak duality states q \\le f for all points")).toBe(
      "Weak duality states $q \\le f$ for all points",
    );
  });
});

describe("output is renderable", () => {
  it("produces balanced delimiters", () => {
    const samples = [
      "The constraint g_i(x) must hold and R^n is the domain.",
      "L = f(x) + \\sum_i \\lambda_i g_i(x), with x \\in X.",
      "No maths at all here.",
      "a_{ij} and b^{kl} in one line",
    ];
    for (const sample of samples) {
      const dollars = (autoWrapMath(sample).match(/\$/g) ?? []).length;
      expect(dollars % 2).toBe(0);
    }
  });
});
