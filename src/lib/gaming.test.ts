import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseSteamIdentifier, fetchBestFaceitElo } from './gaming'

// --- parseSteamIdentifier ---------------------------------------------------

test('parseSteamIdentifier: accepts /profiles/ steam64', () => {
  const r = parseSteamIdentifier('https://steamcommunity.com/profiles/76561198396719280')
  assert.equal(r.type, 'steam64')
  assert.equal(r.value, '76561198396719280')
})

test('parseSteamIdentifier: accepts /id/ vanity', () => {
  const r = parseSteamIdentifier('https://steamcommunity.com/id/jdarey/')
  assert.equal(r.type, 'vanity')
  assert.equal(r.value, 'jdarey')
})

test('parseSteamIdentifier: accepts new /user/ vanity format', () => {
  const r = parseSteamIdentifier('https://steamcommunity.com/user/jdarey/')
  assert.equal(r.type, 'vanity')
  assert.equal(r.value, 'jdarey')
})

test('parseSteamIdentifier: strips query string and fragment', () => {
  const r = parseSteamIdentifier('https://steamcommunity.com/id/jdarey?l=polish#top')
  assert.equal(r.type, 'vanity')
  assert.equal(r.value, 'jdarey')
})

test('parseSteamIdentifier: detects s.team short links', () => {
  const r = parseSteamIdentifier('https://s.team/p/abc123_xyz')
  assert.equal(r.type, 'short')
  assert.equal(r.value, 'abc123_xyz')
})

test('parseSteamIdentifier: accepts bare steam64', () => {
  const r = parseSteamIdentifier('76561198396719280')
  assert.equal(r.type, 'steam64')
  assert.equal(r.value, '76561198396719280')
})

test('parseSteamIdentifier: accepts bare vanity name', () => {
  const r = parseSteamIdentifier('jdarey')
  assert.equal(r.type, 'vanity')
  assert.equal(r.value, 'jdarey')
})

test('parseSteamIdentifier: rejects garbage', () => {
  const r = parseSteamIdentifier('this is not a steam link!!!')
  assert.equal(r.type, null)
})

// --- fetchBestFaceitElo: live Faceit must win over stale Leetify ------------

test('fetchBestFaceitElo: prefers live Faceit legacy when nickname resolves', async () => {
  // Mock: Leetify returns a stale 4000, Faceit legacy returns the live 3437.
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (input: any) => {
    const url = String(input)
    if (url.includes('/v3/profile')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          steam64_id: '76561198113666193',
          ranks: { faceit_elo: 4000, faceit: 10, premier: null },
          recent_matches: [{ id: 'match-1', data_source: 'faceit' }],
        }),
      } as any
    }
    if (url.includes('/v2/matches/')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 'match-1',
          stats: [{ steam64_id: '76561198113666193', name: 'ZywOo' }],
        }),
      } as any
    }
    if (url.includes('api.faceit.com/users/v1/nicknames/')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          result: 'OK',
          payload: {
            nickname: 'ZywOo',
            games: { cs2: { faceit_elo: 3437, skill_level: 10 } },
          },
        }),
      } as any
    }
    return { ok: false, status: 404, json: async () => ({}) } as any
  }) as any

  try {
    const best = await fetchBestFaceitElo('76561198113666193', null)
    assert.equal(best.elo, 3437)
    assert.equal(best.level, 10)
    assert.equal(best.nickname, 'ZywOo')
    assert.equal(best.source, 'faceit')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('fetchBestFaceitElo: falls back to Leetify when no Faceit nickname is discoverable', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (input: any) => {
    const url = String(input)
    if (url.includes('/v3/profile')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          steam64_id: '76561198396719280',
          ranks: { faceit_elo: 2766, faceit: 10, premier: null },
          recent_matches: [], // no Faceit matches -> no nickname discoverable
        }),
      } as any
    }
    return { ok: false, status: 404, json: async () => ({}) } as any
  }) as any

  try {
    const best = await fetchBestFaceitElo('76561198396719280', null)
    assert.equal(best.elo, 2766)
    assert.equal(best.level, 10)
    assert.equal(best.source, 'leetify')
    assert.equal(best.nickname, null)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('fetchBestFaceitElo: saved nickname is used and wins over discovery', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (input: any) => {
    const url = String(input)
    if (url.includes('/v3/profile')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          steam64_id: '76561198396719280',
          ranks: { faceit_elo: 999, faceit: 10, premier: null },
          recent_matches: [{ id: 'match-1', data_source: 'faceit' }],
        }),
      } as any
    }
    if (url.includes('/v2/matches/')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 'match-1',
          stats: [{ steam64_id: '76561198396719280', name: 'wrong-discovered-name' }],
        }),
      } as any
    }
    if (url.includes('api.faceit.com/users/v1/nicknames/')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          result: 'OK',
          payload: {
            nickname: 'jdareyy',
            games: { cs2: { faceit_elo: 2703, skill_level: 10 } },
          },
        }),
      } as any
    }
    return { ok: false, status: 404, json: async () => ({}) } as any
  }) as any

  try {
    const best = await fetchBestFaceitElo('76561198396719280', 'jdareyy')
    assert.equal(best.elo, 2703)
    assert.equal(best.nickname, 'jdareyy')
    assert.equal(best.source, 'faceit')
  } finally {
    globalThis.fetch = originalFetch
  }
})
