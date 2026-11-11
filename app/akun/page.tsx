'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../src/lib/supabase'
import { CustomerAccount } from '../../src/components/CustomerAccount'

export default function AccountPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let current = true
    async function checkSession() {
      if (!supabase) { router.replace('/'); return }
      const { data } = await supabase.auth.getSession()
      if (!current) return
      if (!data.session?.user) { router.replace('/'); return }
      setUser(data.session.user)
      setChecking(false)
    }
    void checkSession()
    return () => { current = false }
  }, [router])

  if (checking) return <main className="admin-dashboard-loading">Memeriksa akun…</main>
  return user ? <CustomerAccount user={user} /> : null
}
