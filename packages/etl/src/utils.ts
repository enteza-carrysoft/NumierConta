export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function sumBy<T>(items: T[], selector: (item: T) => number): number {
  return items.reduce((acc, item) => acc + selector(item), 0)
}

export function groupBy<T, K extends string | number>(
  items: T[],
  keySelector: (item: T) => K
): Record<string, T[]> {
  return items.reduce((groups, item) => {
    const key = String(keySelector(item))
    groups[key] = groups[key] ?? []
    groups[key].push(item)
    return groups
  }, {} as Record<string, T[]>)
}
