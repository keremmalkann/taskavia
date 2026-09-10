import test from 'node:test'
import assert from 'node:assert/strict'
import { getProfileCompletion } from './profile-completion.ts'

const fullFreelancer = {
  role: 'freelancer',
  profile: { full_name: 'Ada Lovelace', title: 'Frontend Developer', bio: 'Uzun bir biyografi metni', skills: ['react', 'typescript', 'css'], hourly_rate: 500, experience_years: 6 },
  portfolioCount: 2,
  hasResume: true,
  resumeValid: true,
}

test('complete freelancer profile reaches 100%', () => {
  const { percent, missing } = getProfileCompletion(fullFreelancer)
  assert.equal(percent, 100)
  assert.equal(missing.length, 0)
})

test('empty freelancer profile is 0% with ordered suggestions', () => {
  const { percent, missing } = getProfileCompletion({ role: 'freelancer', profile: { full_name: '' }, portfolioCount: 0, hasResume: false })
  assert.equal(percent, 0)
  const keys = missing.map((item) => item.key)
  assert.deepEqual(keys, ['full_name', 'title', 'bio', 'skills', 'hourly_rate', 'experience_years', 'resume', 'portfolio'])
})

test('partial skills add partial progress and stay incomplete below three', () => {
  const { percent, missing } = getProfileCompletion({
    ...fullFreelancer,
    profile: { ...fullFreelancer.profile, skills: ['react'] },
  })
  const skills = missing.find((item) => item.key === 'skills')
  assert.ok(skills, 'skills should be listed as missing')
  assert.ok(percent > 0 && percent < 100)
})

test('missing resume file counts as incomplete resume', () => {
  const { percent, missing } = getProfileCompletion({ ...fullFreelancer, hasResume: true, resumeValid: false })
  assert.ok(missing.some((item) => item.key === 'resume'))
  assert.ok(percent < 100)
})

test('employer weights: company and bio dominate completion', () => {
  const base = { role: 'employer', profile: { full_name: 'Ada Lovelace' } }
  const withTitle = getProfileCompletion({ ...base, profile: { ...base.profile, title: 'Kurucu' } })
  assert.equal(withTitle.percent, 35)
  const complete = getProfileCompletion({ ...base, profile: { full_name: 'Ada Lovelace', title: 'Kurucu', company_name: 'Analitik A.Ş.', bio: 'Veri ve tasarım danışmanlığı yapan bir ekip.' } })
  assert.equal(complete.percent, 100)
  assert.equal(complete.missing.length, 0)
})

test('freelancer suggestions reference the right accordion sections', () => {
  const { missing } = getProfileCompletion({ role: 'freelancer', profile: {} })
  const sections = missing.map((item) => item.sectionId)
  assert.ok(sections.includes('profile-section-02'), 'skills must point to expertise section')
  assert.ok(sections.includes('profile-section-04'), 'resume must point to resume section')
  assert.ok(sections.includes('profile-section-05'), 'portfolio must point to portfolio section')
})
