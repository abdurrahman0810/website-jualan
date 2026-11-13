'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { ArrowUpRight, LogOut, ShieldCheck, Store } from 'lucide-react'
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
        router.replace('/login')
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

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FCFBF8] text-[#736A63] text-xs">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#96785D] border-t-transparent" />
          <span>Memeriksa hak akses admin…</span>
        </div>
      </main>
    )
  }

  if (!user || !supabase) return null

  async function signOut() {
    await supabase?.auth.signOut()
    router.replace('/')
  }

  const adminName = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Admin'

  return (
    <main className="min-h-screen bg-[#FCFBF8] text-[#24201D] px-4 py-8 sm:px-8 sm:py-12 lg:px-16">
      <div className="mx-auto max-w-7xl">
        {/* Top Bar Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#EAE2D6] pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/" className="font-serif text-2xl sm:text-3xl tracking-wide text-[#24201D]">
                Hebbuna<span className="text-[#96785D]">.</span>
              </Link>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#EAE2D6] bg-[#F5EDE2]/70 px-2.5 py-0.5 text-[10px] font-semibold text-[#96785D]">
                <ShieldCheck className="h-3 w-3" strokeWidth={1.5} />
                ADMIN PORTAL
              </span>
            </div>
            <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-normal text-[#24201D]">
              Halo, {adminName}.
            </h1>
            <p className="mt-1 text-xs text-[#736A63]">
              Kelola pesanan online, atur rincian ukuran produk, dan pantau aktivitas kasir toko.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#EAE2D6] bg-white px-4 py-2 text-xs font-medium text-[#24201D] shadow-sm transition-colors hover:border-[#96785D]"
            >
              <Store className="h-3.5 w-3.5 text-[#96785D]" strokeWidth={1.5} />
              <span>Lihat Toko</span>
              <ArrowUpRight className="h-3 w-3 text-[#736A63]" strokeWidth={1.5} />
            </Link>

            <button
              onClick={() => void signOut()}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#EAE2D6] bg-white px-4 py-2 text-xs font-medium text-rose-600 shadow-sm transition-colors hover:bg-rose-50"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        {/* Real-time Cashier Monitor */}
        <div className="mt-8">
          <CashierMonitor />
        </div>

        {/* Full Admin Management Panel */}
        <div className="mt-8">
          <AdminPanel client={supabase} money={(amount) => `Rp${amount.toLocaleString('id-ID')}`} fullPage />
        </div>
      </div>
    </main>
  )
}
