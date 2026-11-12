'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { AnimatePresence, m, useMotionValueEvent, useScroll } from 'motion/react'
import { Heart, Menu, MessageCircle, Search, ShoppingBag, X } from 'lucide-react'

type NavPage = 'home' | 'shop' | 'collection' | 'about'
type Props = {
  page: NavPage
  user: User | null
  role: string | null
  cartCount: number
  wishlistCount: number
  accountOpen: boolean
  onSearch: () => void
  onWishlist: () => void
  onCart: () => void
  onLogin: () => void
  onAccount: () => void
  onSignOut: () => void
}

const navLinks: { label: string; href: string; page: NavPage }[] = [
  { label: 'Home', href: '/', page: 'home' },
  { label: 'Collection', href: '/collection', page: 'collection' },
  { label: 'Shop', href: '/shop', page: 'shop' },
  { label: 'About', href: '/about', page: 'about' },
]

export function StorefrontNavbar({ page, user, role, cartCount, wishlistCount, accountOpen, onSearch, onWishlist, onCart, onLogin, onAccount, onSignOut }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [compact, setCompact] = useState(false)
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (latest) => {
    if (typeof window === 'undefined') return
    const next = window.matchMedia('(max-width: 640px)').matches && latest > 72
    setCompact((current) => current === next ? current : next)
  })

  useEffect(() => {
    const refresh = () => {
      const next = window.matchMedia('(max-width: 640px)').matches && window.scrollY > 72
      setCompact(next)
    }
    refresh()
    window.addEventListener('resize', refresh)
    return () => window.removeEventListener('resize', refresh)
  }, [])

  const accountName = user ? user.user_metadata.full_name ?? user.email?.split('@')[0] ?? 'Akun' : 'Masuk'
  const loginOrAccount = () => { setMenuOpen(false); user ? onAccount() : onLogin() }

  return <m.header className={`site-nav${menuOpen ? ' is-open' : ''}${compact && !menuOpen ? ' is-compact' : ''}`}>
    <a className="nav-wordmark" href="/" aria-label="HEBBUNA, beranda">HEBBUNA<span>.</span></a>
    <nav className="site-nav-links desktop-nav" aria-label="Navigasi utama">{navLinks.map((link) => <a key={link.page} className={page === link.page ? 'nav-current' : ''} href={link.href}>{link.label}</a>)}</nav>
    <div className="site-nav-actions">
      <button aria-label="Cari produk" title="Cari produk" onClick={onSearch}><Search /></button>
      <button aria-label="Buka wishlist" title="Wishlist" onClick={onWishlist}><Heart /><i>{wishlistCount}</i></button>
      <button className="nav-bag-button" aria-label={`Buka tas belanja, ${cartCount} produk`} onClick={onCart}><ShoppingBag /><i>{cartCount}</i></button>
      <a className="nav-whatsapp-button" href="https://wa.me/6281234567890" target="_blank" rel="noreferrer" aria-label="Hubungi HEBBUNA lewat WhatsApp" title="WhatsApp HEBBUNA"><MessageCircle /></a>
      <button className="nav-account-button" onClick={user ? onAccount : onLogin}>{accountName}</button>
    </div>
    <button className="nav-mobile-toggle" aria-label={menuOpen ? 'Tutup navigasi' : 'Buka navigasi'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X /> : <Menu />}</button>
    <AnimatePresence>
      {menuOpen && <m.nav className="mobile-menu-drawer" aria-label="Navigasi mobile" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: .2, ease: 'easeOut' }}>
        {navLinks.map((link) => <a key={link.page} className={page === link.page ? 'nav-current' : ''} href={link.href} onClick={() => setMenuOpen(false)}>{link.label}</a>)}
        <button className="mobile-login-link" onClick={loginOrAccount}>{user ? 'Akun saya' : 'Login'} <span>↗</span></button>
      </m.nav>}
    </AnimatePresence>
    <AnimatePresence>
      {accountOpen && user && <m.div className="account-popover" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}><strong>{user.user_metadata.full_name ?? 'Akun pelanggan'}</strong><span>{user.email}</span><span className="role-badge">{role === 'admin' ? 'Admin' : role === 'pegawai' ? 'Pegawai' : 'Pelanggan'}</span><a href="/akun">Akun saya · pesanan · wishlist</a>{role === 'admin' && <a href="/admin">Panel admin</a>}<button onClick={onSignOut}>Keluar</button></m.div>}
    </AnimatePresence>
  </m.header>
}
