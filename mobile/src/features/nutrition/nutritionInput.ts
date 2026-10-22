import { localDateKey } from '@training/training-domain'

/** Parses user-typed decimals ("1,5" or "1.5"). Empty text yields `emptyValue`; invalid text yields NaN. */
export function parseNumberInput<T extends number | null>(text: string, emptyValue: T): number | T {
  const trimmed = text.trim()
  if (!trimmed) return emptyValue
  return Number(trimmed.replace(',', '.'))
}

export function formatNumberInput(value: number | null) {
  return value === null ? '' : String(value)
}

/** Current time for today's meals; midday for other days so the list never shows an invented clock time. */
export function consumedAtForDate(date: string, now = new Date()) {
  if (date === localDateKey(now)) return now.toISOString()
  return new Date(`${date}T12:00:00`).toISOString()
}
