export function computeColumnProgress(index: number, total: number): number {
  const safeTotal = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0
  if (safeTotal <= 1) return 0

  const safeIndex = Number.isFinite(index)
    ? Math.min(Math.max(0, Math.floor(index)), safeTotal - 1)
    : 0

  return Math.round((safeIndex / (safeTotal - 1)) * 100)
}

