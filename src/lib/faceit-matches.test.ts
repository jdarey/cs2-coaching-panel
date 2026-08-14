import { test, describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { fetchFaceitRecentMatches } from './gaming'

// Fixtures mirroring the official Faceit Open API responses: the history
// endpoint has NO map field, and results.winner / results.score use the
// faction KEYS ("faction1"/"faction2"), not the faction UUIDs. The map id
// comes from the match stats endpoint (round_stats.Map).
const historyItem = (
  matchId: string,
  winner: string,
  score: { faction1: string; faction2: string },
  finishedAt: string,
) => ({
  match_id: matchId,
  finished_at: finishedAt,
  teams: {
    faction1: { faction_id: 'f1', players: [{ player_id: 'p-student', nickname: 'jdareyy' }] },
    faction2: { faction_id: 'f2', players: [{ player_id: 'p-enemy', nickname: 'enemy' }] },
  },
  results: { winner, score },
})

const detail = (kills: number, deaths: number, map = 'de_mirage') => ({
  rounds: [
    {
      round_stats: { Map: map },
      teams: [
        { faction_id: 'f1', players: [{ player_id: 'p-student', player_stats: { Kills: kills, Deaths: deaths, Assists: 5 } }] },
        { faction_id: 'f2', players: [{ player_id: 'p-enemy', player_stats: { Kills: 10, Deaths: 20, Assists: 2 } }] },
      ],
    },
  ],
})

function mockFaceitApi(items: any[], details: Record<string, any>) {
  mock.method(globalThis, 'fetch', async (url: string) => {
    const u = String(url)
    if (u.includes('/players?')) {
      return new Response(JSON.stringify({ player_id: 'p-student', nickname: 'jdareyy' }), { status: 200 })
    }
    if (u.includes('/history?')) {
      return new Response(JSON.stringify({ items }), { status: 200 })
    }
    if (u.includes('/matches/')) {
      const id = u.split('/matches/')[1].replace(/\/stats$/, '')
      return new Response(JSON.stringify(details[id] ?? {}), { status: 200 })
    }
    return new Response('{}', { status: 404 })
  })
}

describe('fetchFaceitRecentMatches', () => {
  it('maps a win: my team score first, Faceit id as externalId/platformMatchId', async () => {
    const items = [
      historyItem('m-1', 'faction1', { faction1: '13', faction2: '8' }, '2026-08-01T12:00:00.000Z'),
    ]
    mockFaceitApi(items, { 'm-1': detail(22, 12) })

    const matches = await fetchFaceitRecentMatches('jdareyy', 'test-key', 5)
    assert.equal(matches.length, 1)
    const m = matches[0]
    assert.equal(m.outcome, 'WIN')
    assert.deepEqual(m.score, [13, 8])
    assert.equal(m.map, 'Mirage')
    assert.equal(m.kills, 22)
    assert.equal(m.deaths, 12)
    assert.equal(m.externalId, 'm-1')
    assert.equal(m.platformMatchId, 'm-1')
    assert.equal(m.dataSource, 'faceit')
    assert.equal(m.finishedAt, '2026-08-01T12:00:00.000Z')
  })

  it('maps a loss correctly (winner is the other faction)', async () => {
    const items = [historyItem('m-2', 'faction2', { faction1: '4', faction2: '13' }, '2026-07-30T18:00:00.000Z')]
    mockFaceitApi(items, { 'm-2': detail(9, 16, 'de_dust2') })

    const matches = await fetchFaceitRecentMatches('jdareyy', 'test-key', 5)
    assert.equal(matches.length, 1)
    assert.equal(matches[0].outcome, 'LOSS')
    assert.deepEqual(matches[0].score, [4, 13])
    assert.equal(matches[0].map, 'Dust2')
  })

  it('limits to the requested count', async () => {
    const items = Array.from({ length: 8 }, (_, i) =>
      historyItem(`m-${i}`, 'faction1', { faction1: '13', faction2: `${i}` }, `2026-07-2${i}T12:00:00.000Z`),
    )
    const details: Record<string, any> = {}
    for (let i = 0; i < 8; i++) details[`m-${i}`] = detail(10 + i, 10)
    mockFaceitApi(items, details)

    const matches = await fetchFaceitRecentMatches('jdareyy', 'test-key', 3)
    assert.equal(matches.length, 3)
  })

  it('returns empty when the player is not found', async () => {
    mock.method(globalThis, 'fetch', async (url: string) => {
      return new Response('{}', { status: 200 })
    })
    const matches = await fetchFaceitRecentMatches('ghost', 'test-key', 5)
    assert.deepEqual(matches, [])
  })
})
