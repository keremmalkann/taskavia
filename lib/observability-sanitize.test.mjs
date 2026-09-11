import assert from 'node:assert/strict'
import test from 'node:test'
import { publicErrorReference, sanitizeText, sanitizeValue } from './observability/sanitize.mjs'

test('hassas metinleri loglardan maskeler', () => {
  const value = sanitizeText('user@example.com Bearer super-secret eyJabc.def.ghi ?token=visible')
  assert.equal(value.includes('user@example.com'), false)
  assert.equal(value.includes('super-secret'), false)
  assert.equal(value.includes('eyJabc.def.ghi'), false)
  assert.equal(value.includes('token=visible'), false)
})

test('hassas anahtarları iç içe bağlamdan çıkarır', () => {
  assert.deepEqual(sanitizeValue({
    route: '/messages/123',
    authorization: 'Bearer hidden',
    nested: { password: 'hidden', status: 500 },
  }), {
    route: '/messages/123',
    authorization: '[redacted]',
    nested: { password: '[redacted]', status: 500 },
  })
})

test('kullanıcı hata referansı güvenli karakterlerle sınırlıdır', () => {
  assert.equal(publicErrorReference('abc<script>-123'), 'TVA-ERR-abcscript-123')
  assert.equal(publicErrorReference(undefined), 'TVA-ERR-CLIENT')
})
