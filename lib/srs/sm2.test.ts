import { describe, expect, it } from "vitest";
import { INITIAL_STATE, schedule, type CardState, type Rating } from "./sm2";

const TODAY = new Date("2026-08-09T12:00:00Z");

describe("first reviews", () => {
  it("schedules a new card one day out when answered well", () => {
    const next = schedule(INITIAL_STATE, "good", TODAY);
    expect(next.intervalDays).toBe(1);
    expect(next.dueOn).toBe("2026-08-10");
    expect(next.repetitions).toBe(1);
  });

  it("uses six days on the second successful review", () => {
    const first = schedule(INITIAL_STATE, "good", TODAY);
    const second = schedule(first, "good", TODAY);
    expect(second.intervalDays).toBe(6);
    expect(second.dueOn).toBe("2026-08-15");
  });

  it("multiplies by the ease factor from the third review on", () => {
    let state: CardState = INITIAL_STATE;
    for (const rating of ["good", "good", "good"] as Rating[]) {
      state = schedule(state, rating, TODAY);
    }
    // 6 days * ease (2.5 held by "good") = 15
    expect(state.intervalDays).toBe(15);
  });
});

describe("again", () => {
  it("keeps the card in the current session rather than scheduling it", () => {
    const learned = schedule(INITIAL_STATE, "good", TODAY);
    const lapsed = schedule(learned, "again", TODAY);

    expect(lapsed.intervalDays).toBe(0);
    expect(lapsed.dueOn).toBe("2026-08-09");
    expect(lapsed.state).toBe("learning");
  });

  it("resets repetitions and counts a lapse", () => {
    let state: CardState = INITIAL_STATE;
    state = schedule(state, "good", TODAY);
    state = schedule(state, "good", TODAY);
    expect(state.repetitions).toBe(2);

    state = schedule(state, "again", TODAY);
    expect(state.repetitions).toBe(0);
    expect(state.lapses).toBe(1);
  });

  it("lowers the ease factor", () => {
    const after = schedule(INITIAL_STATE, "again", TODAY);
    expect(after.easeFactor).toBeLessThan(INITIAL_STATE.easeFactor);
  });
});

describe("ease factor", () => {
  it("never falls below 1.3, however often the card is failed", () => {
    let state: CardState = INITIAL_STATE;
    for (let i = 0; i < 50; i++) state = schedule(state, "again", TODAY);
    expect(state.easeFactor).toBe(1.3);
  });

  it("holds steady on good and rises on easy", () => {
    expect(schedule(INITIAL_STATE, "good", TODAY).easeFactor).toBe(2.5);
    expect(schedule(INITIAL_STATE, "easy", TODAY).easeFactor).toBeGreaterThan(2.5);
  });

  it("falls on hard", () => {
    expect(schedule(INITIAL_STATE, "hard", TODAY).easeFactor).toBeLessThan(2.5);
  });
});

describe("hard and easy are distinguishable", () => {
  // The whole reason for deviating from textbook SM-2. If this test fails,
  // the four buttons have collapsed into two and the extra choice is a lie.
  it("gives hard a shorter interval than good, and easy a longer one", () => {
    const base = schedule(schedule(INITIAL_STATE, "good", TODAY), "good", TODAY);

    const hard = schedule(base, "hard", TODAY).intervalDays;
    const good = schedule(base, "good", TODAY).intervalDays;
    const easy = schedule(base, "easy", TODAY).intervalDays;

    expect(hard).toBeLessThan(good);
    expect(good).toBeLessThan(easy);
  });
});

describe("invariants", () => {
  it("never schedules a successful review in the past or same day", () => {
    let state: CardState = INITIAL_STATE;
    const ratings: Rating[] = ["good", "hard", "easy", "good", "hard", "easy"];

    for (const rating of ratings) {
      state = schedule(state, rating, TODAY);
      expect(state.intervalDays).toBeGreaterThanOrEqual(1);
    }
  });

  it("caps the interval at ten years", () => {
    let state: CardState = INITIAL_STATE;
    for (let i = 0; i < 100; i++) state = schedule(state, "easy", TODAY);
    expect(state.intervalDays).toBeLessThanOrEqual(365 * 10);
  });

  it("crosses month and year boundaries correctly", () => {
    const endOfYear = new Date("2026-12-30T23:30:00Z");
    const next = schedule(
      { ...INITIAL_STATE, intervalDays: 0, repetitions: 1 },
      "good",
      endOfYear,
    );
    expect(next.intervalDays).toBe(6);
    expect(next.dueOn).toBe("2027-01-05");
  });

  it("ignores the time of day — due dates are calendar days", () => {
    const morning = schedule(INITIAL_STATE, "good", new Date("2026-08-09T00:01:00Z"));
    const night = schedule(INITIAL_STATE, "good", new Date("2026-08-09T23:59:00Z"));
    expect(morning.dueOn).toBe(night.dueOn);
  });
});
