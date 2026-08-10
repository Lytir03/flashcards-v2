import { describe, expect, it } from "vitest";
import { matchOutcome, scoreAnswer } from "./scoring";

describe("scoreAnswer", () => {
  it("scores an instant correct answer at base + full speed bonus", () => {
    expect(scoreAnswer({ isCorrect: true, responseMs: 0, secondsPerQuestion: 15 })).toBe(150);
  });

  it("scores a correct answer right at the deadline at base only", () => {
    expect(scoreAnswer({ isCorrect: true, responseMs: 15000, secondsPerQuestion: 15 })).toBe(100);
  });

  it("scores a correct answer halfway through at half the bonus", () => {
    expect(scoreAnswer({ isCorrect: true, responseMs: 7500, secondsPerQuestion: 15 })).toBe(125);
  });

  it("scores an instant wrong answer at 0", () => {
    expect(scoreAnswer({ isCorrect: false, responseMs: 0, secondsPerQuestion: 15 })).toBe(0);
  });

  it("scores a timeout at 0 with no special-casing needed", () => {
    expect(scoreAnswer({ isCorrect: false, responseMs: 15000, secondsPerQuestion: 15 })).toBe(0);
  });

  it("clamps a correct answer that arrives after the deadline to the base score", () => {
    expect(scoreAnswer({ isCorrect: true, responseMs: 20000, secondsPerQuestion: 15 })).toBe(100);
  });

  it("clamps a negative responseMs (clock skew) to the full bonus", () => {
    expect(scoreAnswer({ isCorrect: true, responseMs: -500, secondsPerQuestion: 15 })).toBe(150);
  });

  it("scales the bonus against the question's own deadline, not a fixed one", () => {
    expect(scoreAnswer({ isCorrect: true, responseMs: 30000, secondsPerQuestion: 60 })).toBe(125);
  });
});

describe("matchOutcome", () => {
  it("declares a draw on equal scores", () => {
    expect(matchOutcome(500, 500)).toEqual({ a: "draw", b: "draw" });
  });

  it("declares the higher score the winner", () => {
    expect(matchOutcome(650, 400)).toEqual({ a: "win", b: "loss" });
    expect(matchOutcome(400, 650)).toEqual({ a: "loss", b: "win" });
  });
});
