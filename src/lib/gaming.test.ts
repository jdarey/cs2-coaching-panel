import { test, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseSteamIdentifier } from './gaming'

describe('parseSteamIdentifier', () => {
  it('extracts steam64 from /profiles/ URLs', () => {
    assert.deepEqual(parseSteamIdentifier('https://steamcommunity.com/profiles/76561198396719280'), {
      type: 'steam64',
      value: '76561198396719280',
    })
  })

  it('extracts vanity from the classic /id/ URL format', () => {
    assert.deepEqual(parseSteamIdentifier('https://steamcommunity.com/id/jdarey/'), {
      type: 'vanity',
      value: 'jdarey',
    })
    assert.deepEqual(parseSteamIdentifier('https://steamcommunity.com/id/jdarey'), {
      type: 'vanity',
      value: 'jdarey',
    })
  })

  it('extracts vanity from the new /user/ URL format Steam generates today', () => {
    assert.deepEqual(parseSteamIdentifier('https://steamcommunity.com/user/jdarey/'), {
      type: 'vanity',
      value: 'jdarey',
    })
    assert.deepEqual(parseSteamIdentifier('https://steamcommunity.com/user/jdarey'), {
      type: 'vanity',
      value: 'jdarey',
    })
  })

  it('strips query strings and fragments from vanity URLs', () => {
    assert.deepEqual(parseSteamIdentifier('https://steamcommunity.com/id/jdarey/?l=polish'), {
      type: 'vanity',
      value: 'jdarey',
    })
    assert.deepEqual(parseSteamIdentifier('https://steamcommunity.com/id/jdarey#foo'), {
      type: 'vanity',
      value: 'jdarey',
    })
  })

  it('detects s.team short share links as type short', () => {
    assert.deepEqual(parseSteamIdentifier('https://s.team/p/AbCdEf12'), { type: 'short', value: 'AbCdEf12' })
    assert.deepEqual(parseSteamIdentifier('s.team/p/AbCdEf12'), { type: 'short', value: 'AbCdEf12' })
  })

  it('accepts a bare steam64 and a bare vanity name', () => {
    assert.deepEqual(parseSteamIdentifier('76561198396719280'), { type: 'steam64', value: '76561198396719280' })
    assert.deepEqual(parseSteamIdentifier('jdarey'), { type: 'vanity', value: 'jdarey' })
  })

  it('rejects empty input and non-Steam identifiers', () => {
    assert.deepEqual(parseSteamIdentifier(''), { type: null, value: '' })
    assert.deepEqual(parseSteamIdentifier('https://www.faceit.com/pl/players/jdarey'), {
      type: null,
      value: 'https://www.faceit.com/pl/players/jdarey',
    })
  })
})
