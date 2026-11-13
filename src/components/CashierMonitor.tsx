'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, RefreshCw, UserCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'

type CashierSession = { session_id: string; user_id: string; full_name: string | null; email: string; role: string; last_seen: string }

export function CashierMonitor() {
  const [sessions, setSessions] = useState<CashierSession[]>([])
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async () => {
    if (!supabase) return
    setRefreshing(true)
    const { data, error: requestError } = await supabase.rpc('admin_daftar_sesi_kasir')
    if (requestError) {
      setError(requestError.message)
      setRefreshing(false)
      return
    }
    setError('')
    setSessions((data ?? []) as CashierSession[])
    setUpdatedAt(new Date())
    setRefreshing(false)
  }, [])

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0)
    const timer = window.setInterval(() => void refresh(), 15_000)
    return () => { window.clearTimeout(initial); window.clearInterval(timer) }
  }, [refresh])

  return (
    <section className="rounded-2xl border border-[#EAE2D6] bg-white p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#EAE2D6] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#96785D]">
              MONITOR SESI KASIR (REAL-TIME)
            </p>
          </div>
          <h2 className="mt-1 font-serif text-xl sm:text-2xl font-normal text-[#24201D]">
            Kasir yang Sedang Aktif
          </h2>
        </div>

        <button
          onClick={() => void refresh()}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full border border-[#EAE2D6] bg-[#FCFBF8] px-3.5 py-1.5 text-xs font-medium text-[#736A63] transition-colors hover:border-[#96785D] hover:text-[#24201D]"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-[#96785D] ${refreshing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          <span>Perbarui</span>
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Belum bisa membaca sesi kasir. Pastikan fungsi Supabase tersedia ({error}).
        </p>
      ) : sessions.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center py-6 text-center">
          <Activity className="h-7 w-7 text-[#96785D]/30" strokeWidth={1.5} />
          <p className="mt-2 text-xs font-medium text-[#24201D]">Belum ada sesi kasir yang terdeteksi aktif.</p>
          <p className="text-[11px] text-[#736A63]">Kasir yang login di perangkat kasir POS akan muncul otomatis di sini.</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <article
              key={session.session_id}
              className="flex flex-col justify-between rounded-xl border border-[#EAE2D6] bg-[#FCFBF8] p-4 text-xs"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Sedang Aktif
                  </span>
                  <span className="rounded-full border border-[#EAE2D6] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#96785D]">
                    {session.role === 'admin' ? 'Admin' : 'Pegawai'}
                  </span>
                </div>
                <h3 className="mt-2.5 font-sans font-semibold text-[#24201D]">
                  {session.full_name || session.email}
                </h3>
                <p className="text-[11px] text-[#736A63]">{session.email}</p>
              </div>

              <div className="mt-4 border-t border-[#EAE2D6] pt-2 text-[10px] text-[#736A63] flex items-center gap-1">
                <UserCheck className="h-3 w-3 text-[#96785D]" strokeWidth={1.5} />
                <span>Terakhir aktif: {new Date(session.last_seen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="mt-4 text-[10px] text-[#736A63]">
        {updatedAt ? `Pembaruan terakhir: ${updatedAt.toLocaleTimeString('id-ID')}` : 'Menghubungkan ke server…'}
      </p>
    </section>
  )
}
