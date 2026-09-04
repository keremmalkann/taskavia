import test from 'node:test'
import assert from 'node:assert/strict'
import { validateProposal } from './proposal-validation.ts'

test('valid proposal and minimum budget boundary', () => {
  assert.equal(validateProposal(100, 1, 'Proje için teklifim.', 100), null)
})
test('invalid and below-budget prices are rejected', () => {
  for (const price of [0, -1, NaN, Infinity, 99, 10000000000]) {
    assert.ok(validateProposal(price, 14, 'Proje için teklifim.', 100))
  }
})
test('duration must be a bounded whole day', () => {
  for (const days of [0, -1, 1.5, 3651, NaN]) assert.ok(validateProposal(100, days, 'Proje için teklifim.', 100))
})
test('trimmed message has length limits', () => {
  for (const message of ['', '         ', 'kısa', 'a'.repeat(2001)]) assert.ok(validateProposal(100, 14, message, 100))
  assert.equal(validateProposal(100, 14, 'a'.repeat(2000), 100), null)
})
