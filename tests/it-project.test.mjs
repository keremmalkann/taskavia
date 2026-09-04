import test from 'node:test'
import assert from 'node:assert/strict'
import { categories, legacyCategories, projectGuidance, prepareITDescription } from '../lib/it-project.ts'

function form() {
  const result = new FormData()
  for (const [key, value] of Object.entries({ category: categories[0], description: 'Windows sunucularımız için geçiş projesi.', environment: 'Windows Server 2022', scopeSize: '3 sunucu', workMode: 'Uzaktan', maintenanceWindow: 'Hafta sonu', acceptanceCriteria: 'Servisler test edilecek ve rapor teslim edilecek.', authorized: 'on' })) result.set(key, value)
  return result
}
test('every technical category has guidance and persists all requirements', () => {
  for (const category of categories) {
    assert.ok(projectGuidance[category].skills)
    const data = form(); data.set('category', category); data.set('securityScope', 'on')
    const result = prepareITDescription(data)
    assert.equal(result.error, undefined)
    for (const key of ['environment', 'scopeSize', 'workMode', 'maintenanceWindow', 'acceptanceCriteria']) assert.ok(result.description.includes(data.get(key)))
    assert.ok(result.description.length <= 5000)
  }
})
test('old categories remain available for reading but cannot create new jobs', () => {
  for (const category of legacyCategories) { const data = form(); data.set('category', category); assert.ok(prepareITDescription(data).error) }
})
test('authorization and written security scope are mandatory', () => {
  const data = form(); data.delete('authorized'); assert.ok(prepareITDescription(data).error)
  data.set('authorized', 'on'); data.set('category', 'Siber Güvenlik'); assert.ok(prepareITDescription(data).error)
  data.set('securityScope', 'on'); assert.ok(prepareITDescription(data).description)
})
test('onsite work requires location and oversized data is rejected', () => {
  const data = form(); data.set('workMode', 'Yerinde'); assert.ok(prepareITDescription(data).error)
  data.set('location', 'İstanbul / Kadıköy'); assert.ok(prepareITDescription(data).description.includes('İstanbul / Kadıköy'))
  data.set('environment', 'x'.repeat(601)); assert.ok(prepareITDescription(data).error)
})
