import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// toLocalDate MUSI używać Europe/Warsaw, nie UTC — inaczej o północy
// zadanie "przeskakuje" dzień i "Dobra robota" pokazuje się źle.
function toLocalDate(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Warsaw' })
}

describe('toLocalDate (Europe/Warsaw)', () => {
  it('zwraca YYYY-MM-DD po polsku', () => {
    const d = new Date('2026-01-15T12:00:00Z')
    assert.match(toLocalDate(d), /^\d{4}-\d{2}-\d{2}$/)
  })

  it('nie przesuwa dnia o północy polskiego czasu', () => {
    // 00:30 w Warszawie = 23:30 UTC poprzedniego dnia — toISOString by pokazał zły dzień
    const lateNight = new Date('2026-06-01T00:30:00+02:00')
    assert.equal(toLocalDate(lateNight), '2026-06-01')
    assert.notEqual(lateNight.toISOString().split('T')[0], '2026-06-01')
  })

  it('rozróżnia dni po obu stronach północy', () => {
    const before = new Date('2026-06-01T21:00:00Z') // 23:00 PL
    const after = new Date('2026-06-01T22:30:00Z') // 00:30 PL następnego dnia
    assert.notEqual(toLocalDate(before), toLocalDate(after))
  })
})

// Logika "Dobra robota": pokaz TYLKO gdy dziś jest aktywność I nic nie czeka.
// Po resecie (Powtórz / nowy dzień) albo przy zaległych zadaniach — ukryj.
function shouldShowDone(opts: {
  loading: boolean
  loadingOverall: boolean
  todayCount: number
  pendingCount: number
  routines: { tasks: number; done: number }[]
  assignments: number
}): boolean {
  const { loading, loadingOverall, todayCount, pendingCount, routines, assignments } = opts
  const hasRoutines = routines.length > 0
  const allRoutinesDone = hasRoutines
    ? routines.every((r) => r.tasks > 0 && r.done >= r.tasks)
    : true
  return (
    !loading &&
    !loadingOverall &&
    todayCount > 0 &&
    pendingCount === 0 &&
    allRoutinesDone &&
    (hasRoutines || assignments > 0)
  )
}

describe('shouldShowDone (Dobra robota)', () => {
  const base = { loading: false, loadingOverall: false, todayCount: 3, pendingCount: 0, routines: [{ tasks: 3, done: 3 }], assignments: 0 }

  it('pokazuje gdy wszystko zrobione dziś', () => {
    assert.equal(shouldShowDone(base), true)
  })

  it('ukrywa po resecie rutyny (zadania znowu PENDING)', () => {
    assert.equal(shouldShowDone({ ...base, routines: [{ tasks: 3, done: 0 }] }), false)
  })

  it('ukrywa nowego dnia bez aktywności', () => {
    assert.equal(shouldShowDone({ ...base, todayCount: 0, routines: [{ tasks: 3, done: 0 }] }), false)
  })

  it('ukrywa gdy są zaległe zwykłe zadania', () => {
    assert.equal(shouldShowDone({ ...base, pendingCount: 2 }), false)
  })

  it('ukrywa podczas ładowania', () => {
    assert.equal(shouldShowDone({ ...base, loading: true }), false)
    assert.equal(shouldShowDone({ ...base, loadingOverall: true }), false)
  })

  it('ukrywa gdy brak rutyn i brak zadań', () => {
    assert.equal(shouldShowDone({ ...base, routines: [], assignments: 0, todayCount: 0 }), false)
  })
})

// Progi Faceit CS2 aktualne 2025 (Faceit 2.0)
function levelFromElo(elo: number | null): number | null {
  if (elo == null) return null
  if (elo <= 500) return 1
  if (elo <= 750) return 2
  if (elo <= 900) return 3
  if (elo <= 1050) return 4
  if (elo <= 1200) return 5
  if (elo <= 1350) return 6
  if (elo <= 1530) return 7
  if (elo <= 1750) return 8
  if (elo <= 2000) return 9
  return 10
}

describe('levelFromElo (progi CS2)', () => {
  it('mapuje granice poziomów', () => {
    assert.equal(levelFromElo(100), 1)
    assert.equal(levelFromElo(500), 1)
    assert.equal(levelFromElo(501), 2)
    assert.equal(levelFromElo(900), 3)
    assert.equal(levelFromElo(901), 4)
    assert.equal(levelFromElo(1200), 5)
    assert.equal(levelFromElo(1350), 6)
    assert.equal(levelFromElo(1530), 7)
    assert.equal(levelFromElo(1750), 8)
    assert.equal(levelFromElo(2000), 9)
    assert.equal(levelFromElo(2001), 10)
    assert.equal(levelFromElo(3000), 10)
  })

  it('zwraca null dla braku ELO', () => {
    assert.equal(levelFromElo(null), null)
  })
})
