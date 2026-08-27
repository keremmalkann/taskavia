'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

function getCredentials(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!email || !email.includes('@') || password.length < 6) {
    return null
  }

  return { email, password }
}

export async function signUp(formData: FormData) {
  const supabase = await createClient()
  const credentials = getCredentials(formData)
  const fullName = String(formData.get('fullName') ?? '').trim()
  const requestedRole = String(formData.get('role') ?? '')
  const role = requestedRole === 'employer' ? 'employer' : 'freelancer'

  if (!credentials || fullName.length < 2) {
    redirect('/signup?error=' + encodeURIComponent('Lütfen bilgilerini eksiksiz ve geçerli biçimde gir.'))
  }

  const { error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      data: {
        full_name: fullName,
        role: role,
      },
    },
  })

  if (error) {
    redirect('/signup?error=' + encodeURIComponent(error.message))
  }

  redirect('/login?message=' + encodeURIComponent('Hesabın oluşturuldu. E-postanı doğruladıktan sonra giriş yapabilirsin.'))
}

export async function signIn(formData: FormData) {
  const credentials = getCredentials(formData)

  if (!credentials) {
    redirect('/login?error=' + encodeURIComponent('E-posta veya şifre hatalı.'))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(credentials)

  if (error) {
    redirect('/login?error=' + encodeURIComponent('E-posta veya şifre hatalı.'))
  }

  redirect('/')
}
