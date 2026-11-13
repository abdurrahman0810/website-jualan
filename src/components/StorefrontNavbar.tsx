'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import {
  ChevronRight,
  Heart,
  LogOut,
  Menu,
  MessageCircle,
  Search,
  ShoppingBag,
  User as UserIcon,
  X,
} from 'lucide-react'

type NavPage = 'home' | 'shop' | 'collection' | 'about'

interface StorefrontNavbarProps {
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

const NAV_LINKS: { label: string; href: string; page: NavPage; hasSubmenu?: boolean }[] = [
  { label: 'Home', href: '/', page: 'home' },
  { label: 'Collection', href: '/collection', page: 'collection' },
  { label: 'Shop', href: '/shop', page: 'shop', hasSubmenu: true },
  { label: 'About', href: '/about', page: 'about' },
]

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  pegawai: 'Pegawai',
}

export function StorefrontNavbar({
  page,
  user,
  role,
  cartCount,
  wishlistCount,
  accountOpen,
  onSearch,
  onWishlist,
  onCart,
  onLogin,
  onAccount,
  onSignOut,
}: StorefrontNavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [compact, setCompact] = useState(false)
  const { scrollY } = useScroll()

  const checkCompact = (scrollPosition: number) =>
    window.matchMedia('(max-width: 768px)').matches && scrollPosition > 72

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const next = checkCompact(latest)
    setCompact((prev) => (prev === next ? prev : next))
  })

  useEffect(() => {
    const syncCompact = () => setCompact(checkCompact(window.scrollY))
    syncCompact()
    window.addEventListener('resize', syncCompact)
    return () => window.removeEventListener('resize', syncCompact)
  }, [])

  useEffect(() => {
    if (!menuOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const fullName = user?.user_metadata?.full_name
  const accountLabel = user
    ? fullName || user.email?.split('@')[0] || 'Akun'
    : 'Masuk'

  const headerClass = [
    'site-nav',
    menuOpen && 'is-open',
    compact && !menuOpen && 'is-compact',
  ]
    .filter(Boolean)
    .join(' ')

  const handleMobileLogin = () => {
    setMenuOpen(false)
    onLogin()
  }

  const handleMobileSignOut = () => {
    setMenuOpen(false)
    onSignOut()
  }

  return (
    <>
      <header className={headerClass}>
        <Link className="nav-wordmark" href="/" aria-label="HEBBUNA, beranda">
          HEBBUNA<span>.</span>
        </Link>

        <nav className="site-nav-links desktop-nav" aria-label="Navigasi utama">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.page}
              className={page === link.page ? 'nav-current' : undefined}
              href={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="site-nav-actions">
          <button type="button" aria-label="Cari produk" title="Cari produk" onClick={onSearch}>
            <Search />
          </button>

          <button type="button" aria-label="Buka wishlist" title="Wishlist" onClick={onWishlist}>
            <Heart />
            <i>{wishlistCount}</i>
          </button>

          <button
            type="button"
            className="nav-bag-button"
            aria-label={`Buka tas belanja, ${cartCount} produk`}
            onClick={onCart}
          >
            <ShoppingBag />
            <i>{cartCount}</i>
          </button>

          <a
            className="nav-whatsapp-button"
            href="https://wa.me/6281234567890"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Hubungi HEBBUNA lewat WhatsApp"
            title="WhatsApp HEBBUNA"
          >
            <MessageCircle />
          </a>

          <button
            type="button"
            className="nav-account-button"
            onClick={user ? onAccount : onLogin}
          >
            {accountLabel}
          </button>
        </div>

        <button
          type="button"
          className="nav-mobile-toggle"
          aria-label="Buka navigasi"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <Menu />
        </button>

        <AnimatePresence>
          {accountOpen && user && (
            <motion.div
              className="account-popover"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
            >
              <strong>{fullName || 'Akun pelanggan'}</strong>
              <span>{user.email}</span>
              <span className="role-badge">{(role && ROLE_LABELS[role]) || 'Pelanggan'}</span>
              <Link href="/akun">Akun saya · pesanan · wishlist</Link>
              {role === 'admin' && <Link href="/admin">Panel admin</Link>}
              <button type="button" onClick={onSignOut}>
                Keluar
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className="mobile-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMenuOpen(false)}
            />

            <motion.aside
              className="mobile-menu-drawer"
              aria-label="Navigasi mobile"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mobile-drawer-top">
                <button
                  type="button"
                  className="mobile-drawer-close"
                  aria-label="Tutup navigasi"
                  onClick={() => setMenuOpen(false)}
                >
                  <X strokeWidth={1.75} />
                </button>
              </div>

              <nav className="mobile-drawer-links">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.page}
                    className={page === link.page ? 'nav-current' : undefined}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                  >
                    <span>{link.label}</span>
                    {link.hasSubmenu && <ChevronRight size={18} strokeWidth={1.5} />}
                  </Link>
                ))}
              </nav>

              <div className="mobile-drawer-footer">
                {user ? (
                  <div className="mobile-account-section">
                    <div className="mobile-account-info">
                      <div className="mobile-account-avatar">
                        <UserIcon size={18} strokeWidth={1.75} />
                      </div>
                      <div className="mobile-account-meta">
                        <strong>{fullName || 'Akun pelanggan'}</strong>
                        <span>{user.email}</span>
                      </div>
                      <span className="role-badge">
                        {(role && ROLE_LABELS[role]) || 'Pelanggan'}
                      </span>
                    </div>

                    <div className="mobile-account-links">
                      <Link href="/akun" onClick={() => setMenuOpen(false)}>
                        <span>Akun saya</span>
                        <ChevronRight size={16} strokeWidth={1.5} />
                      </Link>

                      {role === 'admin' && (
                        <Link href="/admin" onClick={() => setMenuOpen(false)}>
                          <span>Panel admin</span>
                          <ChevronRight size={16} strokeWidth={1.5} />
                        </Link>
                      )}

                      <button
                        type="button"
                        className="mobile-signout-button"
                        onClick={handleMobileSignOut}
                      >
                        <LogOut size={16} strokeWidth={1.75} />
                        <span>Keluar</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="mobile-login-link"
                    onClick={handleMobileLogin}
                  >
                    <UserIcon size={20} strokeWidth={1.75} />
                    <span>LOGIN / AKUN</span>
                  </button>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}