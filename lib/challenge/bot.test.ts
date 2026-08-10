import { describe, expect, it } from "vitest";
import { botAnswer, botWrongIndex } from "./bot";

/** Returns each value in order, then repeats the last one. */
function sequence(...values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

describe("botAnswer", () => {
  it("novice: low roll is correct, low speed roll is near the fast end of its range", () => {
    const result = botAnswer("novice", 15, sequence(0, 0));
    expect(result.isCorrect).toBe(true); // 0 < 0.4 accuracy
    expect(result.responseMs).toBe(9000); // speedMin 0.6 * 15000
  });

  it("novice: high roll is incorrect", () => {
    const result = botAnswer("novice", 15, sequence(0.9, 0));
    expect(result.isCorrect).toBe(false); // 0.9 >= 0.4 accuracy
  });

  it("ace: high accuracy roll is still correct just under the threshold", () => {
    const result = botAnswer("ace", 20, sequence(0.94, 1));
    expect(result.isCorrect).toBe(true); // 0.94 < 0.95 accuracy
    expect(result.responseMs).toBe(6000); // speedMax 0.3 * 20000
  });

  it("ace: a roll at/above accuracy is incorrect", () => {
    const result = botAnswer("ace", 20, sequence(0.95, 0));
    expect(result.isCorrect).toBe(false);
  });

  it("scales responseMs against the given deadline, not a fixed one", () => {
    const short = botAnswer("sharp", 10, sequence(0, 0.5));
    const long = botAnswer("sharp", 60, sequence(0, 0.5));
    expect(long.responseMs).toBe(short.responseMs * 6);
  });
});

describe("botWrongIndex", () => {
  it("never returns the correct index", () => {
    for (let correct = 0; correct < 4; correct++) {
      for (const roll of [0, 0.33, 0.66, 0.99]) {
        expect(botWrongIndex(correct, () => roll)).not.toBe(correct);
      }
    }
  });

  it("picks the first of the three wrong indices on a zero roll", () => {
    expect(botWrongIndex(0, () => 0)).toBe(1);
    expect(botWrongIndex(2, () => 0)).toBe(0);
  });
});
