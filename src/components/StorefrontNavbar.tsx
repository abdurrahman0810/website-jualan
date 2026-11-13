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
      <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 md:px-8 md:pt-5 pointer-events-none">
        <div
          className={`pointer-events-auto relative mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/15 bg-[#1c1a17]/85 text-white shadow-lg backdrop-blur-md transition-all duration-200 ${
            compact && !menuOpen ? 'px-4 py-2' : 'px-5 py-3 md:px-7 md:py-3.5'
          }`}
        >
          <Link
            href="/"
            aria-label="HEBBUNA, beranda"
            className="text-base font-bold tracking-[0.14em] text-white md:text-lg"
          >
            HEBBUNA<span className="text-[#e08a6b]">.</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Navigasi utama">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.page}
                href={link.href}
                className={`text-sm transition-colors ${
                  page === link.page
                    ? 'font-medium text-white'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              aria-label="Cari produk"
              title="Cari produk"
              onClick={onSearch}
              className="rounded-full p-2 text-white/85 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Search className="h-[19px] w-[19px]" strokeWidth={1.75} />
            </button>

            <button
              type="button"
              aria-label="Buka wishlist"
              title="Wishlist"
              onClick={onWishlist}
              className="relative rounded-full p-2 text-white/85 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Heart className="h-[19px] w-[19px]" strokeWidth={1.75} />
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-semibold leading-none text-neutral-900">
                {wishlistCount}
              </span>
            </button>

            <button
              type="button"
              aria-label={`Buka tas belanja, ${cartCount} produk`}
              onClick={onCart}
              className="relative rounded-full p-2 text-white/85 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ShoppingBag className="h-[19px] w-[19px]" strokeWidth={1.75} />
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-semibold leading-none text-neutral-900">
                {cartCount}
              </span>
            </button>

            <a
              href="https://wa.me/6281234567890"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Hubungi HEBBUNA lewat WhatsApp"
              title="WhatsApp HEBBUNA"
              className="rounded-full p-2 text-white/85 transition-colors hover:bg-white/10 hover:text-white"
            >
              <MessageCircle className="h-[19px] w-[19px]" strokeWidth={1.75} />
            </a>

            <button
              type="button"
              onClick={user ? onAccount : onLogin}
              className="ml-1 hidden rounded-full border border-white/25 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white hover:text-neutral-900 md:inline-flex"
            >
              {accountLabel}
            </button>

            <button
              type="button"
              aria-label="Buka navigasi"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:bg-white/10 md:hidden"
            >
              <Menu className="h-[19px] w-[19px]" strokeWidth={1.75} />
            </button>
          </div>

          <AnimatePresence>
            {accountOpen && user && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute right-4 top-full mt-2.5 flex w-64 flex-col gap-1.5 rounded-2xl border border-neutral-200 bg-white p-4 text-neutral-900 shadow-xl"
              >
                <strong className="truncate text-sm font-semibold text-neutral-900">
                  {fullName || 'Akun pelanggan'}
                </strong>
                <span className="truncate text-xs text-neutral-500">{user.email}</span>
                <span className="my-1 w-fit rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-700">
                  {(role && ROLE_LABELS[role]) || 'Pelanggan'}
                </span>

                <div className="mt-1 flex flex-col border-t border-neutral-100 pt-2 text-sm">
                  <Link
                    href="/akun"
                    className="rounded-lg px-2 py-1.5 text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                  >
                    Akun saya · pesanan · wishlist
                  </Link>
                  {role === 'admin' && (
                    <Link
                      href="/admin"
                      className="rounded-lg px-2 py-1.5 text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                    >
                      Panel admin
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="mt-1 rounded-lg px-2 py-1.5 text-left font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    Keluar
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] md:hidden"
            />

            <motion.aside
              aria-label="Navigasi mobile"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-[360px] flex-col bg-white px-6 pb-7 pt-5 text-neutral-900 shadow-2xl md:hidden"
            >
              <div className="mb-3 flex items-center justify-start">
                <button
                  type="button"
                  aria-label="Tutup navigasi"
                  onClick={() => setMenuOpen(false)}
                  className="-ml-1.5 rounded-lg p-1.5 text-neutral-900 transition-colors hover:bg-neutral-100"
                >
                  <X className="h-6 w-6" strokeWidth={1.75} />
                </button>
              </div>

              <nav className="flex flex-col">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.page}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center justify-between border-b border-neutral-200 py-4 text-[15px] transition-colors ${
                      page === link.page
                        ? 'font-semibold text-black'
                        : 'font-normal text-neutral-700 hover:text-black'
                    }`}
                  >
                    <span>{link.label}</span>
                    {link.hasSubmenu && (
                      <ChevronRight className="h-4 w-4 text-neutral-400" strokeWidth={1.75} />
                    )}
                  </Link>
                ))}
              </nav>

              <div className="mt-auto pt-5">
                {user ? (
                  <div className="flex flex-col gap-3 border-t border-neutral-200 pt-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-800">
                        <UserIcon className="h-4 w-4" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-sm font-semibold text-neutral-900">
                          {fullName || 'Akun pelanggan'}
                        </strong>
                        <span className="block truncate text-xs text-neutral-500">
                          {user.email}
                        </span>
                      </div>
                      <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-700">
                        {(role && ROLE_LABELS[role]) || 'Pelanggan'}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <Link
                        href="/akun"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between border-b border-neutral-100 py-3 text-sm text-neutral-800 transition-colors hover:text-black"
                      >
                        <span>Akun saya</span>
                        <ChevronRight className="h-4 w-4 text-neutral-400" strokeWidth={1.75} />
                      </Link>

                      {role === 'admin' && (
                        <Link
                          href="/admin"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center justify-between border-b border-neutral-100 py-3 text-sm text-neutral-800 transition-colors hover:text-black"
                        >
                          <span>Panel admin</span>
                          <ChevronRight className="h-4 w-4 text-neutral-400" strokeWidth={1.75} />
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={handleMobileSignOut}
                        className="mt-2 inline-flex items-center gap-2 py-2 text-sm font-medium text-red-600 transition-colors hover:text-red-700"
                      >
                        <LogOut className="h-4 w-4" strokeWidth={1.75} />
                        <span>Keluar</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleMobileLogin}
                    className="inline-flex items-center gap-3 py-2 text-xs font-semibold tracking-[0.14em] text-neutral-900 transition-opacity hover:opacity-75"
                  >
                    <UserIcon className="h-5 w-5" strokeWidth={1.75} />
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