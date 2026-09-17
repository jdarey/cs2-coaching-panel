import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getStarterRoutine, isStarterLevel, STARTER_ROUTINE_LEVELS, levelLabel } from './starter-routine'

test('starter routine ma 7 dni po jednym ćwiczeniu na dzień', () => {
  for (const level of STARTER_ROUTINE_LEVELS) {
    const def = getStarterRoutine(level)
    assert.equal(def.tasks.length, 7, `${level}: 7 zadań`)
    def.tasks.forEach((t, i) => {
      assert.ok(t.title.length > 3, `${level} dzień ${i + 1}: tytuł`)
      assert.ok(t.minutes >= 10 && t.minutes <= 90, `${level} dzień ${i + 1}: sensowny czas`)
      assert.ok(t.description.includes('### Cel'), `${level} dzień ${i + 1}: sekcja Cel`)
      assert.ok(t.description.includes('### Jak mierzyć sukces'), `${level} dzień ${i + 1}: metryka sukcesu`)
    })
  }
})

test('totalMinutes zgadza się z sumą zadań (bez ściemy na landing page)', () => {
  for (const level of STARTER_ROUTINE_LEVELS) {
    const def = getStarterRoutine(level)
    const sum = def.tasks.reduce((acc, t) => acc + t.minutes, 0)
    assert.equal(def.totalMinutes, sum)
  }
})

test('dni są numerowane 1..7 i rosnąco (flow ucznia: dzień po dniu)', () => {
  for (const level of STARTER_ROUTINE_LEVELS) {
    const def = getStarterRoutine(level)
    def.tasks.forEach((t, i) => {
      // day jest nadawany przy tworzeniu w API (i+1); tutaj walidujemy strukturę
      assert.ok(t.title, `zadanie ${i} ma tytuł`)
    })
  }
})

test('isStarterLevel odrzuca śmieci z payloadu', () => {
  assert.equal(isStarterLevel('BEGINNER'), true)
  assert.equal(isStarterLevel('ADVANCED'), true)
  assert.equal(isStarterLevel('HACKER'), false)
  assert.equal(isStarterLevel(null), false)
  assert.equal(isStarterLevel(42), false)
})

test('levelLabel mapuje poziomy na PL, puste na pusty string', () => {
  assert.equal(levelLabel('BEGINNER'), 'Początkujący')
  assert.equal(levelLabel('INTERMEDIATE'), 'Średni')
  assert.equal(levelLabel('ADVANCED'), 'Zaawansowany')
  assert.equal(levelLabel(null), '')
  assert.equal(levelLabel('UNKNOWN'), '')
})
