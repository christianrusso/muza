import test from "node:test";
import assert from "node:assert/strict";
import { isBlockedBetween, setBlockHistory, type BlockHistoryEntry } from "../src/lib/community/blockState";

test("el bloqueo demo es idempotente, corta el follow y conserva el historial", () => {
  const actor = `demo-test-actor-${crypto.randomUUID()}`;
  const target = `demo-test-target-${crypto.randomUUID()}`;
  const history: BlockHistoryEntry[] = [];

  assert.equal(setBlockHistory(history, actor, target, true), true);
  assert.equal(setBlockHistory(history, actor, target, true), true);
  assert.equal(isBlockedBetween(history, actor, target), true);
  assert.equal(
    history.filter((entry) => entry.blockerId === actor && entry.blockedId === target).length,
    1,
  );

  assert.equal(setBlockHistory(history, actor, target, false), false);
  assert.equal(isBlockedBetween(history, actor, target), false);
  assert.equal(history.filter((entry) => entry.blockerId === actor && entry.blockedId === target).length, 1);
  assert.ok(history.some((entry) => entry.unblockedAt !== null));
});
