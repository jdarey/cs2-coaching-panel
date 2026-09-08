import { test, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeMatch, matchVerdict, analyzeWeaknesses } from './ai-coach'

// Season-average profile. Mirrors what Leetify's `stats` block returns
// (reaction in ms, the rest as 0–100 percentages).
const profile = {
  aim: 60,
  positioning: 55,
  utility: 48,
  clutch: 0.3,
  opening: 0.2,
  stats: {
    reaction_time_ms: 542.16,
    preaim: 9.21,
    accuracy_head: 27.24,
    spray_accuracy: 34.11,
    accuracy_enemy_spotted: 45.0,
    counter_strafing_good_shots_ratio: 60,
    utility_on_death_avg: 0.5,
  },
}

function match(overrides: Partial<Parameters<typeof analyzeMatch>[1]> = {}): Parameters<typeof analyzeMatch>[1] {
  return {
    externalId: 'test',
    dataSource: 'faceit',
    finishedAt: '2026-08-01T00:00:00.000Z',
    map: 'Mirage',
    outcome: 'LOSS',
    score: [11, 13] as [number, number],
    leetifyRating: 0.6,
    preaim: 7.0,
    reactionTimeMs: 600,
    accuracyEnemySpotted: 42,
    accuracyHead: 22,
    sprayAccuracy: 30,
    kills: 15,
    deaths: 17,
    platformMatchId: '1-test',
    ...overrides,
  }
}

describe('analyzeMatch', () => {
  it('names the exact stats that were below the season average', () => {
    const m = match({ outcome: 'LOSS', reactionTimeMs: 660, preaim: 5.0, accuracyHead: 19, sprayAccuracy: 24, accuracyEnemySpotted: 36 })
    const text = analyzeMatch(profile, m)
    assert.match(text, /czas reakcji 660 ms \(średnia 542,2 ms\)/)
    assert.match(text, /pre-aim 5% \(średnia 9,2%\)/)
    assert.match(text, /celność w głowę 19% \(średnia 27,2%\)/)
  })

  it('names the exact stats that were above the season average as strengths', () => {
    const m = match({ outcome: 'WIN', reactionTimeMs: 480, preaim: 12.5, accuracyHead: 32, sprayAccuracy: 40 })
    const text = analyzeMatch(profile, m)
    assert.match(text, /Trzymaj poziom: czas reakcji 480 ms/)
    assert.match(text, /pre-aim 12,5% \(średnia 9,2%\)/)
  })

  it('never speculates about the opponent when there are no drops', () => {
    const m = match({ outcome: 'LOSS', reactionTimeMs: 540, preaim: 9.5, accuracyHead: 28, sprayAccuracy: 35 })
    const text = analyzeMatch(profile, m)
    assert.match(text, /Żadna z mierzonych statystyk nie była znacząco poniżej Twojej średniej sezonowej/)
    assert.doesNotMatch(text, /przeciwnika/)
    assert.doesNotMatch(text, /porażka wynikała/)
  })

  it('says plainly that there is no data instead of guessing', () => {
    const m = match({ reactionTimeMs: null, preaim: null, accuracyHead: null, sprayAccuracy: null, accuracyEnemySpotted: null })
    const text = analyzeMatch(profile, m)
    assert.match(text, /Brak danych porównawczych/)
    assert.doesNotMatch(text, /Zawiodło/)
    assert.doesNotMatch(text, /przeciwnika/)
  })

  it('labels the season weakness as a season-level finding, not a match verdict', () => {
    const m = match({ outcome: 'LOSS' })
    const text = analyzeMatch(profile, m)
    assert.match(text, /Poza tym meczem — Twoja największa luka w całym sezonie to Otwarcia rund \(Opening\)/)
  })

  it('includes concrete numbers, never vague filler', () => {
    for (const m of [
      match({ outcome: 'WIN' }),
      match({ outcome: 'LOSS', reactionTimeMs: 660, preaim: 5, accuracyHead: 19, sprayAccuracy: 24 }),
      match({ reactionTimeMs: null, preaim: null, accuracyHead: null, sprayAccuracy: null, accuracyEnemySpotted: null }),
    ]) {
      const text = analyzeMatch(profile, m)
      assert.ok(text.length > 40, 'analysis should not be empty')
      assert.match(text, /na Mirage/)
    }
  })
})

describe('matchVerdict', () => {
  it('mentions the exact stat behind a win above average', () => {
    const v = matchVerdict(profile, match({ outcome: 'WIN', reactionTimeMs: 480, preaim: 12.5, accuracyHead: 32, sprayAccuracy: 40, accuracyEnemySpotted: 49 }))
    assert.match(v, /reakcja 480 ms ponad Twoją średnią/)
  })

  it('warns about a drop even when the match was won', () => {
    const v = matchVerdict(profile, match({ outcome: 'WIN', reactionTimeMs: 480, preaim: 12.5, accuracyHead: 19, sprayAccuracy: 40 }))
    assert.match(v, /Wygrana, ale celność w głowę 19%/)
  })

  it('names the worst drop on a loss', () => {
    const v = matchVerdict(profile, match({ outcome: 'LOSS', reactionTimeMs: 660 }))
    assert.match(v, /reakcja 660 ms \(śr\. 542 ms\) poniżej Twojej średniej/)
  })

  it('does not invent a reason on a loss without drops', () => {
    const v = matchVerdict(profile, match({ outcome: 'LOSS', reactionTimeMs: 540, accuracyHead: 28, preaim: 9.5, sprayAccuracy: 35 }))
    assert.match(v, /Porażka bez wyraźnego spadku/)
    assert.doesNotMatch(v, /Zawiodła reakcja/)
    assert.doesNotMatch(v, /Zawiodła celność/)
  })

  it('never claims a win was solid without checking the numbers', () => {
    const v = matchVerdict(profile, match({ outcome: 'WIN', accuracyHead: 15, reactionTimeMs: 700 }))
    assert.doesNotMatch(v, /Solidna wygrana/)
    assert.match(v, /poniżej Twojej średniej/)
  })
})

describe('analyzeWeaknesses', () => {
  it('sorts weakest first and keeps only verified values', () => {
    const out = analyzeWeaknesses(profile)
    assert.ok(out.length > 0)
    for (let i = 1; i < out.length; i++) {
      assert.ok((out[i - 1].value ?? 100) <= (out[i].value ?? 100), 'weaknesses must be sorted weakest-first')
    }
  })
})
