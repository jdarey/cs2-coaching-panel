import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateAccessCode, generateAccessCodes, normalizeAccessCode, isValidAccessCodeFormat } from './access-codes'

test('kod ma format CS2-XXXX-XXXX bez mylących znaków', () => {
  for (let i = 0; i < 200; i++) {
    const code = generateAccessCode()
    assert.match(code, /^CS2-[23456789A-HJ-NP-Z]{4}-[23456789A-HJ-NP-Z]{4}$/)
    assert.equal(isValidAccessCodeFormat(code), true)
    assert.doesNotMatch(code, /[0O1IL]/)
  }
})

test('partia kodów jest unikalna', () => {
  const batch = generateAccessCodes(500)
  assert.equal(new Set(batch).size, 500)
})

test('normalizacja: myślniki, spacje, małe litery, brak myślników', () => {
  const code = generateAccessCode()
  const letters = code.replace(/^CS2-/, '').replace('-', '')
  assert.equal(normalizeAccessCode(code), code)
  assert.equal(normalizeAccessCode(code.toLowerCase()), code)
  assert.equal(normalizeAccessCode(`cs2 ${letters.slice(0, 4)} ${letters.slice(4)}`), code)
  assert.equal(normalizeAccessCode(`cs2${letters}`), code)
})

test('śmieciowe kody przechodzą normalizację, ale failują format-check', () => {
  assert.equal(isValidAccessCodeFormat(normalizeAccessCode('próba-oszukać-system')), false)
  assert.equal(isValidAccessCodeFormat(normalizeAccessCode('CS2-0000-0000')), false)
})
