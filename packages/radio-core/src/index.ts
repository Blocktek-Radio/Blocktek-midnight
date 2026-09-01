import type { QueueItem } from "@blocktek/types"

export function totalDurationSeconds(items: Pick<QueueItem, "durationSeconds">[]): number {
  return items.reduce((total, item) => total + item.durationSeconds, 0)
}

export function takeUntilDuration<T extends Pick<QueueItem, "durationSeconds">>(items: T[], durationMinutes: number): T[] {
  const limit = durationMinutes * 60
  const selected: T[] = []
  let total = 0
  for (const item of items) {
    if (selected.length > 0 && total + item.durationSeconds > limit) break
    selected.push(item)
    total += item.durationSeconds
  }
  return selected
}
