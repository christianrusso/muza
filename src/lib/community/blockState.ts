export interface BlockHistoryEntry {
  blockerId: string;
  blockedId: string;
  blockedAt: string;
  unblockedAt: string | null;
}

export function isBlockedBetween(history: BlockHistoryEntry[], userA: string, userB: string): boolean {
  if (userA === userB) return false;
  return history.some(
    (entry) =>
      entry.unblockedAt === null &&
      ((entry.blockerId === userA && entry.blockedId === userB) ||
        (entry.blockerId === userB && entry.blockedId === userA)),
  );
}

export function setBlockHistory(
  history: BlockHistoryEntry[],
  blockerId: string,
  blockedId: string,
  blocked: boolean,
): boolean {
  if (blockerId === blockedId) return false;

  if (blocked) {
    const active = history.some(
      (entry) => entry.blockerId === blockerId && entry.blockedId === blockedId && entry.unblockedAt === null,
    );
    if (!active) {
      history.push({
        blockerId,
        blockedId,
        blockedAt: new Date().toISOString(),
        unblockedAt: null,
      });
    }
  } else {
    const active = history.find(
      (entry) => entry.blockerId === blockerId && entry.blockedId === blockedId && entry.unblockedAt === null,
    );
    if (active) active.unblockedAt = new Date().toISOString();
  }

  return isBlockedBetween(history, blockerId, blockedId);
}
