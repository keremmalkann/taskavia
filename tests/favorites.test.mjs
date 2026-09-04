import test from 'node:test'
import assert from 'node:assert/strict'
import { getFavorites, FAVORITE_PREFIX, MAX_FAVORITES, isJobId } from '../lib/favorites.ts'

const first = '11111111-1111-4111-8111-111111111111'
const second = '22222222-2222-4222-8222-222222222222'

test('empty accounts have no saved jobs', () => {
  assert.deepEqual(getFavorites(undefined), [])
  assert.deepEqual(getFavorites({ settings: { notifications: {} } }), [])
})

test('only valid account bookmarks are read, newest first', () => {
  assert.deepEqual(getFavorites({
    [`${FAVORITE_PREFIX}${first}`]: '2026-09-01T10:00:00Z',
    [`${FAVORITE_PREFIX}${second}`]: '2026-09-04T10:00:00Z',
    favorite_job_invalid: '2026-09-04T10:00:00Z',
    full_name: 'Test User',
  }).map((item) => item.jobId), [second, first])
})

test('removed and corrupt bookmark values are ignored', () => {
  for (const value of [null, false, 12, {}, [], 'invalid date']) {
    assert.deepEqual(getFavorites({ [`${FAVORITE_PREFIX}${first}`]: value }), [])
  }
  assert.equal(isJobId('../settings'), false)
  assert.equal(isJobId(null), false)
  assert.equal(isJobId(first), true)
})

test('saved jobs remain isolated between accounts and bounded', () => {
  assert.deepEqual(getFavorites({ [`${FAVORITE_PREFIX}${first}`]: '2026-09-01' }).map((item) => item.jobId), [first])
  assert.deepEqual(getFavorites({ [`${FAVORITE_PREFIX}${second}`]: '2026-09-01' }).map((item) => item.jobId), [second])
  const metadata = Object.fromEntries(Array.from({ length: MAX_FAVORITES + 10 }, (_, index) => [
    `${FAVORITE_PREFIX}${index.toString(16).padStart(8, '0')}-1111-4111-8111-111111111111`, new Date(2026, 0, index + 1).toISOString(),
  ]))
  assert.equal(getFavorites(metadata).length, MAX_FAVORITES)
})
