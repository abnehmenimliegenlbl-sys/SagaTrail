export type ReplaceableNarrationCategory = "surface" | "terrain";

export type NarrationQueueItem = {
  text: string;
  onFinished?: () => void;
  useOpenAI?: boolean;
  preFetchedUri?: string;
  replaceQueuedCategory?: ReplaceableNarrationCategory;
};

/**
 * Statusmeldungen sind Momentaufnahmen und duerfen keinen veralteten FIFO-Stapel
 * bilden. Nicht ersetzbare Erzaehlungen, POIs und Entscheidungen bleiben FIFO.
 */
export function enqueueNarrationItem(
  queue: NarrationQueueItem[],
  entry: NarrationQueueItem,
): void {
  const category = entry.replaceQueuedCategory;
  if (category) {
    const queuedIndex = queue.findIndex(
      (queued) => queued.replaceQueuedCategory === category,
    );
    if (queuedIndex >= 0) {
      queue[queuedIndex] = entry;
      for (let index = queue.length - 1; index > queuedIndex; index -= 1) {
        if (queue[index]?.replaceQueuedCategory === category) {
          queue.splice(index, 1);
        }
      }
      return;
    }
  }
  queue.push(entry);
}