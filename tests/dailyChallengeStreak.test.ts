import { test } from "node:test";
import assert from "node:assert/strict";
import { bumpStreak, isDoneToday, toDateStr, type StreakState } from "../src/lib/dailyChallengeStreak";

const MON = new Date("2026-07-06T12:00:00Z");
const TUE = new Date("2026-07-07T12:00:00Z");
const THU = new Date("2026-07-09T12:00:00Z"); // salteando el miércoles

test("first completion ever starts the streak at 1", () => {
  const empty: StreakState = { lastCompletedDate: null, streak: 0 };
  const next = bumpStreak(empty, MON);
  assert.equal(next.streak, 1);
  assert.equal(next.lastCompletedDate, toDateStr(MON));
});

test("completing on the very next day extends the streak", () => {
  const afterMon: StreakState = { lastCompletedDate: toDateStr(MON), streak: 1 };
  const next = bumpStreak(afterMon, TUE);
  assert.equal(next.streak, 2);
});

test("skipping a day resets the streak to 1, not 0", () => {
  const afterMon: StreakState = { lastCompletedDate: toDateStr(MON), streak: 5 };
  const next = bumpStreak(afterMon, THU);
  assert.equal(next.streak, 1);
});

test("completing twice the same day does not double-count", () => {
  const afterTue: StreakState = { lastCompletedDate: toDateStr(TUE), streak: 3 };
  const next = bumpStreak(afterTue, TUE);
  assert.deepEqual(next, afterTue);
});

test("isDoneToday matches only the same calendar day", () => {
  const state: StreakState = { lastCompletedDate: toDateStr(TUE), streak: 2 };
  assert.equal(isDoneToday(state, TUE), true);
  assert.equal(isDoneToday(state, THU), false);
});
