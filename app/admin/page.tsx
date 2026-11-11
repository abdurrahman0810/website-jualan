'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../src/lib/supabase'
import { AdminPanel } from '../../src/components/AdminPanel'
import { CashierMonitor } from '../../src/components/CashierMonitor'

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let current = true
    async function checkAccess() {
      if (!supabase) {
        router.replace('/')
        return
      }
      const { data } = await supabase.auth.getSession()
      const signedInUser = data.session?.user
      if (!signedInUser) {
        router.replace('/')
        return
      }
      const { data: profile } = await supabase.from('user_profiles')
        .select('role,is_active').eq('id', signedInUser.id).maybeSingle()
      if (!current) return
      if (profile?.role !== 'admin' || profile.is_active === false) {
        router.replace('/')
        return
      }
      setUser(signedInUser)
      setChecking(false)
    }
    void checkAccess()
    return () => { current = false }
  }, [router])

  if (checking) return <main className="admin-dashboard-loading">Memeriksa akses admin…</main>
  if (!user || !supabase) return null

  async function signOut() {
    await supabase?.auth.signOut()
    router.replace('/')
  }

  return <main className="admin-dashboard-page">
    <div className="admin-dashboard-intro"><div><a className="admin-brand" href="/">H<span>.</span> HEBBUNA STORE</a><p className="eyebrow dark"><span>PUSAT KENDALI</span> AKUN KASIR TERHUBUNG</p><h1>Halo, {user.user_metadata.full_name ?? user.email?.split('@')[0] ?? 'Admin'}.</h1><p>Kelola toko online dan pantau aktivitas kasir dalam satu tempat.</p></div><div className="admin-dashboard-actions"><a className="admin-back-link" href="/">Lihat toko ↗</a><button className="admin-back-link" onClick={() => void signOut()}>Keluar</button></div></div>
    <CashierMonitor />
    <AdminPanel client={supabase} money={(amount) => `Rp${amount.toLocaleString('id-ID')}`} fullPage />
  </main>
}
