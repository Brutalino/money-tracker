import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { getStoredPeriodStartDay, setStoredPeriodStartDay, setActivePeriodStartDay } from '../lib/period'

interface PeriodContextValue {
  periodStartDay: number
  setPeriodStartDay: (day: number) => void
}

const PeriodContext = createContext<PeriodContextValue | null>(null)

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [periodStartDay, setPeriodStartDayState] = useState(1)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    getStoredPeriodStartDay().then((day) => {
      if (cancelled) return
      setPeriodStartDayState(day)
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Keep the module-level "active period start day" mirror (read by pure lib
  // functions that can't consume React context, e.g. stats.ts/period.ts's own
  // label helpers) in sync. Set synchronously during render — before
  // descendants render — rather than in an effect, so the very first paint
  // after a change already uses the right period everywhere, with no flash
  // of stale data.
  setActivePeriodStartDay(periodStartDay)

  function setPeriodStartDay(day: number) {
    setPeriodStartDayState(day)
    setStoredPeriodStartDay(day).catch(() => {})
  }

  // Hold off rendering children until the stored preference (if any) has been
  // read, so the app never flashes the default start day before flipping to a
  // saved one. This mirrors I18nProvider's own "ready" gate.
  if (!ready) return null

  return <PeriodContext.Provider value={{ periodStartDay, setPeriodStartDay }}>{children}</PeriodContext.Provider>
}

export function usePeriodStartDay(): PeriodContextValue {
  const ctx = useContext(PeriodContext)
  if (!ctx) throw new Error('usePeriodStartDay must be used within a PeriodProvider')
  return ctx
}
