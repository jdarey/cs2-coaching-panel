import { test, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { shouldPurgeMatch, purgeMatchesWhere } from './matches'

describe('shouldPurgeMatch', () => {
  it('purges matches synced from a different Steam account', () => {
    assert.equal(shouldPurgeMatch('76561197969209908', '76561198396719280'), true)
  })

  it('keeps matches synced from the current Steam account', () => {
    assert.equal(shouldPurgeMatch('76561198396719280', '76561198396719280'), false)
  })

  it('purges untagged legacy rows (NULL syncedSteamId) — cannot prove ownership', () => {
    assert.equal(shouldPurgeMatch(null, '76561198396719280'), true)
    assert.equal(shouldPurgeMatch(undefined, '76561198396719280'), true)
  })

  it('purges empty-string rows as unknown', () => {
    assert.equal(shouldPurgeMatch('', '76561198396719280'), true)
  })

  it('is strict about the account match — a different account always purges even with same prefix', () => {
    assert.equal(shouldPurgeMatch('76561198396719281', '76561198396719280'), true)
  })
})

describe('purgeMatchesWhere', () => {
  it('targets only the given student', () => {
    const where = purgeMatchesWhere('student-1', 'steam-1')
    assert.equal(where.studentId, 'student-1')
  })

  it('matches untagged legacy rows explicitly (Prisma `not` skips NULL)', () => {
    const where = purgeMatchesWhere('s', 'steam-1')
    const orBranches = where.OR as Record<string, unknown>[]
    assert.ok(orBranches.some((b) => b.syncedSteamId === null), 'must contain a null branch for legacy rows')
  })

  it('matches rows tagged with a different account', () => {
    const where = purgeMatchesWhere('s', 'steam-1')
    const orBranches = where.OR as Record<string, unknown>[]
    assert.ok(
      orBranches.some((b) => {
        const val = b.syncedSteamId as { not?: string } | null
        return val !== null && typeof val === 'object' && val.not === 'steam-1'
      }),
      'must contain a not-branch for the current account',
    )
  })

  it('would NOT match rows tagged with the current account', () => {
    const where = purgeMatchesWhere('s', 'steam-1')
    const orBranches = where.OR as Record<string, unknown>[]
    // Simulate what Prisma does: NULL is never matched by `not`, and the
    // current account is excluded from the `not` branch — so a row tagged
    // with the current account survives.
    const row = { syncedSteamId: 'steam-1' }
    const matches = orBranches.some((b) => {
      if (b.syncedSteamId === null) return row.syncedSteamId === null
      const val = b.syncedSteamId as { not?: string } | null
      const notVal = val !== null && typeof val === 'object' ? val.not : undefined
      return row.syncedSteamId !== notVal
    })
    assert.equal(matches, false)
  })

  it('would match both foreign-account rows and legacy rows', () => {
    const where = purgeMatchesWhere('s', 'steam-1')
    const orBranches = where.OR as Record<string, unknown>[]
    for (const syncedSteamId of [null, 'steam-2', 'steam-999']) {
      const row = { syncedSteamId }
      const matches = orBranches.some((b) => {
        if (b.syncedSteamId === null) return row.syncedSteamId === null
        const val = b.syncedSteamId as { not?: string } | null
        const notVal = val !== null && typeof val === 'object' ? val.not : undefined
        return row.syncedSteamId !== notVal
      })
      assert.equal(matches, true, `row with ${syncedSteamId} should be purged`)
    }
  })
})
