import { DateTime } from 'luxon'

export function getTs(): number {
  return Math.floor(DateTime.now().toMillis() / 1000)
}

export function getTsFromStart(start: DateTime): number {
  return Math.floor(start.toMillis() / 1000)
}
