'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type CashierSession = { session_id: string; user_id: string; full_name: string | null; email: string; role: string; last_seen: string }

export function CashierMonitor() {
  const [sessions, setSessions] = useState<CashierSession[]>([])
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const refresh = useCallback(async () => {
    if (!supabase) return
    const { data, error: requestError } = await supabase.rpc('admin_daftar_sesi_kasir')
    if (requestError) {
      setError(requestError.message)
      return
    }
    setError('')
    setSessions((data ?? []) as CashierSession[])
    setUpdatedAt(new Date())
  }, [])

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0)
    const timer = window.setInterval(() => void refresh(), 15_000)
    return () => { window.clearTimeout(initial); window.clearInterval(timer) }
  }, [refresh])

  return <section className="cashier-monitor">
    <div className="cashier-monitor-heading"><div><p className="eyebrow dark"><span>REAL TIME</span> AKTIVITAS TOKO</p><h2>Kasir yang sedang aktif</h2><p>Status diperbarui otomatis. Sesi dianggap aktif selama perangkat mengirim kabar berkala.</p></div><button onClick={() => void refresh()}>Perbarui ↻</button></div>
    {error ? <p className="cashier-monitor-error">Belum bisa membaca sesi kasir. Pastikan migrasi sesi aktif sudah dijalankan di Supabase. ({error})</p> : sessions.length === 0 ? <div className="cashier-monitor-empty"><span>◷</span><div><strong>Belum ada sesi kasir aktif</strong><p>Kasir yang sedang login akan muncul di sini.</p></div></div> : <div className="cashier-session-grid">{sessions.map((session) => <article className="cashier-session-card" key={session.session_id}><div className="cashier-live-pill"><i /> Sedang aktif</div><h3>{session.full_name || session.email}</h3><p>{session.email}</p><div className="cashier-session-footer"><span>{session.role === 'admin' ? 'Admin' : 'Pegawai'}</span><time dateTime={session.last_seen}>Kabar terakhir {new Date(session.last_seen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</time></div></article>)}</div>}
    <p className="cashier-monitor-updated">{updatedAt ? `Diperbarui ${updatedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Menghubungkan ke Supabase…'}</p>
  </section>
}
