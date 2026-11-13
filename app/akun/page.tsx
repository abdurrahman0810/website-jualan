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
      if (!supabase) { router.replace('/login'); return }
      const { data } = await supabase.auth.getSession()
      if (!current) return
      if (!data.session?.user) { router.replace('/login'); return }
      setUser(data.session.user)
      setChecking(false)
    }
    void checkSession()
    return () => { current = false }
  }, [router])

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FCFBF8] text-[#736A63] text-xs">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#96785D] border-t-transparent" />
          <span className="font-sans">Memeriksa status akun…</span>
        </div>
      </main>
    )
  }
  return user ? <CustomerAccount user={user} /> : null
}
