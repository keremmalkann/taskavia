'use server'

import { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/site-url'
import type { AuthError } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { consumeAnonymousRateLimit } from '@/lib/security/rate-limit'

function getCredentials(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!email || !email.includes('@') || password.length < 6) {
    return null
  }

  return { email, password }
}

function getSignUpErrorMessage(error: AuthError) {
  if (error.code === 'over_email_send_rate_limit') {
    return 'Doğrulama e-postası gönderim limiti doldu. Lütfen bir saat sonra tekrar dene.'
  }

  if (error.code === 'over_request_rate_limit' || error.status === 429) {
    return 'Çok fazla kayıt denemesi yapıldı. Lütfen bir süre bekleyip tekrar dene.'
  }

  if (error.code === 'user_already_exists' || error.code === 'email_exists' || error.message === 'User already registered') {
    return 'Bu kullanıcı zaten kayıtlı. Lütfen mevcut hesabınla giriş yap.'
  }

  if (error.code === 'email_address_not_authorized') {
    return 'Bu e-posta adresine doğrulama mesajı gönderilemiyor. Lütfen site yöneticisiyle iletişime geç.'
  }

  if (error.code === 'weak_password') {
    return 'Şifren yeterince güçlü değil. Lütfen daha güçlü bir şifre belirle.'
  }

  if (error.code === 'signup_disabled') {
    return 'Yeni kullanıcı kaydı şu anda kapalı.'
  }

  return 'Kayıt şu anda tamamlanamadı. Lütfen bilgilerini kontrol edip tekrar dene.'
}

export async function signUp(formData: FormData) {
  const supabase = await createClient()
  const { data: { user: signedInUser } } = await supabase.auth.getUser()

  if (signedInUser) {
    redirect(signedInUser.user_metadata.role === 'employer' ? '/employer' : '/freelancer')
  }

  const credentials = getCredentials(formData)
  const fullName = String(formData.get('fullName') ?? '').trim()
  const requestedRole = String(formData.get('role') ?? '')
  const role = requestedRole === 'employer' ? 'employer' : 'freelancer'
  const termsAccepted = formData.get('termsAccepted') === 'accepted'

  if (!credentials || fullName.length < 2 || !termsAccepted) {
    redirect('/signup?error=' + encodeURIComponent('Lütfen bilgilerini eksiksiz ve geçerli biçimde gir.'))
  }

  const rateLimit = await consumeAnonymousRateLimit({ scope: 'signup', identifier: credentials.email, maxAttempts: 5, windowSeconds: 3600 })
  if (!rateLimit.allowed) redirect('/signup?error=' + encodeURIComponent('Çok fazla kayıt denemesi yapıldı. Lütfen bir saat sonra tekrar dene.'))

  const { data, error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
      data: {
        full_name: fullName,
        role: role,
      },
    },
  })

  if (error) {
    redirect('/signup?error=' + encodeURIComponent(getSignUpErrorMessage(error)))
  }

  if (data.user?.identities?.length === 0) {
    redirect('/signup?error=' + encodeURIComponent('Bu kullanıcı zaten kayıtlı. Lütfen mevcut hesabınla giriş yap.'))
  }

  redirect('/login?message=' + encodeURIComponent('Hesabın oluşturuldu. E-postanı doğruladıktan sonra giriş yapabilirsin.'))
}

export async function signIn(formData: FormData) {
  const credentials = getCredentials(formData)

  if (!credentials) {
    redirect('/login?error=' + encodeURIComponent('E-posta veya şifre hatalı.'))
  }

  const rateLimit = await consumeAnonymousRateLimit({ scope: 'login', identifier: credentials.email, maxAttempts: 8, windowSeconds: 900 })
  if (!rateLimit.allowed) redirect('/login?error=' + encodeURIComponent('Çok fazla giriş denemesi yapıldı. Güvenliğin için 15 dakika sonra tekrar dene.'))

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword(credentials)

  if (error) {
    redirect('/login?error=' + encodeURIComponent('E-posta veya şifre hatalı.'))
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
  const role = profile?.role ?? data.user.user_metadata.role
  redirect(role === 'employer' ? '/employer' : '/freelancer')
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()

  if (!email || !email.includes('@')) {
    redirect('/forgot-password?error=' + encodeURIComponent('Geçerli bir e-posta adresi gir.'))
  }

  const rateLimit = await consumeAnonymousRateLimit({ scope: 'password-reset', identifier: email, maxAttempts: 3, windowSeconds: 3600 })
  if (!rateLimit.allowed) redirect('/forgot-password?error=' + encodeURIComponent('Çok fazla sıfırlama isteği gönderildi. Lütfen bir saat sonra tekrar dene.'))

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
  })

  if (error?.code === 'over_email_send_rate_limit' || error?.status === 429) {
    redirect('/forgot-password?error=' + encodeURIComponent('Çok fazla sıfırlama e-postası istendi. Lütfen bir saat sonra tekrar dene.'))
  }

  if (error) {
    redirect('/forgot-password?error=' + encodeURIComponent('Sıfırlama bağlantısı şu anda gönderilemedi. Lütfen daha sonra tekrar dene.'))
  }

  redirect('/forgot-password?message=' + encodeURIComponent('Bu e-posta bir hesaba bağlıysa parola sıfırlama bağlantısı gönderildi.'))
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get('password') ?? '')
  const passwordConfirmation = String(formData.get('passwordConfirmation') ?? '')

  if (password.length < 8) {
    redirect('/reset-password?error=' + encodeURIComponent('Yeni parolan en az 8 karakter olmalı.'))
  }

  if (password !== passwordConfirmation) {
    redirect('/reset-password?error=' + encodeURIComponent('Parolalar birbiriyle eşleşmiyor.'))
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/forgot-password?error=' + encodeURIComponent('Sıfırlama bağlantısının süresi dolmuş. Lütfen yeni bir bağlantı iste.'))
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    redirect('/reset-password?error=' + encodeURIComponent('Parola güncellenemedi. Lütfen farklı bir parola dene.'))
  }

  await supabase.auth.signOut({ scope: 'global' })
  redirect('/login?message=' + encodeURIComponent('Parolan yenilendi. Yeni parolanla giriş yapabilirsin.'))
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
