'use client'

import type { FormEvent } from 'react'
import { AnimatePresence, m } from 'motion/react'

type Props = {
  open: boolean
  busy: boolean
  email: string
  password: string
  error: string
  onClose: () => void
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function LoginModal({ open, busy, email, password, error, onClose, onEmailChange, onPasswordChange, onSubmit }: Props) {
  return <AnimatePresence>
    {open && <m.div className="admin-overlay auth-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <m.section className="auth-card" role="dialog" aria-modal="true" aria-labelledby="login-title" initial={{ opacity: 0, y: 16, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: .98 }} transition={{ duration: .2, ease: 'easeOut' }}>
        <button className="close-drawer auth-close" onClick={onClose} aria-label="Tutup login">×</button>
        <p className="eyebrow dark"><span>HEBBUNA STORE</span> AKUN TOKO</p>
        <h2 id="login-title">Masuk dengan akun kasir</h2>
        <p className="auth-intro">Pakai email dan kata sandi yang sama dengan akun Supabase di kasir.</p>
        <form className="checkout-form" onSubmit={onSubmit}>
          <label><span>Email</span><input type="email" autoComplete="username" required value={email} onChange={(event) => onEmailChange(event.target.value)} placeholder="nama@email.com" /></label>
          <label><span>Kata sandi</span><input type="password" autoComplete="current-password" required value={password} onChange={(event) => onPasswordChange(event.target.value)} placeholder="Kata sandi akun kasir" /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="primary-button dark-button checkout-submit active:scale-95 transition-transform duration-300 ease-out" type="submit" disabled={busy}>{busy ? 'Memeriksa akun…' : 'Masuk'} <span>↗</span></button>
        </form>
      </m.section>
    </m.div>}
  </AnimatePresence>
}
