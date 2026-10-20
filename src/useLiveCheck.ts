import { useCallback, useEffect, useRef, useState } from 'react'
import { loadedBundle, readLive, type LiveReading } from './liveCheck.ts'

export const POLL_SECONDS = 15
const LOG_LIMIT = 12

export type Verdict = 'checking' | 'current' | 'changed' | 'unknown'

export interface LogEntry {
  id: number
  at: Date
  text: string
}

/** The browser answered with a release-note.json that differs from the one on the server. */
export const noteIsStale = (reading: LiveReading) =>
  reading.noteCached !== null && reading.noteFresh !== null && reading.noteCached !== reading.noteFresh

const fileName = (path: string | null) => path?.split('/').pop() ?? 'not reported'
const deployment = (id: string | null) => id ?? 'not reported'

/** Compares this tab with the server. `startedOn` is the deployment this tab saw first. */
export function judge(reading: LiveReading | null, startedOn: string | null): Verdict {
  if (!reading) return 'checking'
  const mine = loadedBundle()
  const deploymentMoved =
    reading.deploymentId !== null && startedOn !== null && reading.deploymentId !== startedOn
  const bundleMoved = reading.bundle !== null && mine !== null && reading.bundle !== mine
  if (deploymentMoved || bundleMoved) return 'changed'
  return reading.deploymentId !== null || reading.bundle !== null ? 'current' : 'unknown'
}

function describeChanges(previous: LiveReading | null, next: LiveReading): string[] {
  const lines: string[] = []
  if (!previous) {
    lines.push(`Started watching. Deployment ${deployment(next.deploymentId)}, bundle ${fileName(next.bundle)}.`)
  } else {
    if (previous.deploymentId !== next.deploymentId) {
      lines.push(`Deployment changed from ${deployment(previous.deploymentId)} to ${deployment(next.deploymentId)}.`)
    }
    if (previous.bundle !== next.bundle) {
      lines.push(`Bundle changed from ${fileName(previous.bundle)} to ${fileName(next.bundle)}.`)
    }
  }
  const wasStale = previous ? noteIsStale(previous) : false
  if (noteIsStale(next) !== wasStale) {
    lines.push(
      wasStale
        ? 'The browser copy of release-note.json matches the server again.'
        : `The browser copy of release-note.json (${next.noteCached}) differs from the server copy (${next.noteFresh}).`,
    )
  }
  return lines
}

/** Reads the server on mount, every POLL_SECONDS while the tab is visible, when it becomes visible, and on demand. */
export function useLiveCheck() {
  const [reading, setReading] = useState<LiveReading | null>(null)
  const [startedOn, setStartedOn] = useState<string | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const [checking, setChecking] = useState(false)
  const previous = useRef<LiveReading | null>(null)
  const latest = useRef(0)
  const entries = useRef(0)

  const check = useCallback(async () => {
    const mine = ++latest.current
    setChecking(true)
    const next = await readLive()
    if (mine !== latest.current) return // a newer check is already under way, so this answer is out of date
    const lines = describeChanges(previous.current, next)
    previous.current = next
    setReading(next)
    setStartedOn((first) => first ?? next.deploymentId)
    if (lines.length > 0) {
      const added = lines.map((text) => ({ id: ++entries.current, at: next.at, text }))
      setLog((old) => [...added, ...old].slice(0, LOG_LIMIT))
    }
    setChecking(false)
  }, [])

  useEffect(() => {
    const whenVisible = () => {
      if (!document.hidden) void check()
    }
    whenVisible()
    const timer = setInterval(whenVisible, POLL_SECONDS * 1000)
    document.addEventListener('visibilitychange', whenVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', whenVisible)
    }
  }, [check])

  return { reading, startedOn, log, checking, check }
}
