'use server'

import { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/site-url'
import type { AuthError } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

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

  if (!credentials || fullName.length < 2) {
    redirect('/signup?error=' + encodeURIComponent('Lütfen bilgilerini eksiksiz ve geçerli biçimde gir.'))
  }

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

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword(credentials)

  if (error) {
    redirect('/login?error=' + encodeURIComponent('E-posta veya şifre hatalı.'))
  }

  redirect(data.user.user_metadata.role === 'employer' ? '/employer' : '/freelancer')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
