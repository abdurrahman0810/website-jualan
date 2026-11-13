"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  ArrowUpRight,
  ChevronRight,
  Heart,
  LogOut,
  Menu,
  MessageCircle,
  Search,
  ShoppingBag,
  User as UserIcon,
  X,
} from "lucide-react";

type NavPage = "home" | "shop" | "collection" | "about";

type Props = {
  page?: NavPage;
  user?: User | null;
  role?: string | null;
  cartCount?: number;
  wishlistCount?: number;
  accountOpen?: boolean;
  onSearch?: () => void;
  onWishlist?: () => void;
  onCart?: () => void;
  onAccount?: () => void;
  onSignOut?: () => void;
};

const NAV_LINKS: { label: string; href: string; page: NavPage }[] = [
  { label: "Home", href: "/", page: "home" },
  { label: "Koleksi", href: "/collection", page: "collection" },
  { label: "Shop", href: "/shop", page: "shop" },
  { label: "Tentang Kami", href: "/about", page: "about" },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  pegawai: "Pegawai",
};

const liquidSpring = {
  type: "spring" as const,
  stiffness: 420,
  damping: 32,
  mass: 0.8,
};

const GLASS_SURFACE =
  "border border-white/90 bg-[#FFFEFB]/80 text-[#24201D] shadow-[0_10px_30px_rgba(120,100,80,0.05),inset_0_1px_1px_rgba(255,255,255,0.9)] backdrop-blur-md md:backdrop-blur-xl";

const ICON_BTN =
  "relative flex h-9 w-9 items-center justify-center rounded-full text-[#4A433E] transition-colors hover:bg-[#F5EDE2]/70 hover:text-[#24201D] active:scale-90";

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <motion.span
      key={count}
      initial={{ scale: 0.6 }}
      animate={{ scale: 1 }}
      transition={liquidSpring}
      className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-[#96785D] px-1 text-[9px] font-medium leading-none text-white shadow-sm"
    >
      {count}
    </motion.span>
  );
}

function ActionItem({
  href,
  label,
  onClick,
  children,
}: {
  href: string;
  label: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  if (onClick) {
    return (
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={onClick}
        className={ICON_BTN}
      >
        {children}
      </button>
    );
  }
  return (
    <Link href={href} aria-label={label} title={label} className={ICON_BTN}>
      {children}
    </Link>
  );
}

export function StorefrontNavbar({
  page,
  user = null,
  role = null,
  cartCount = 0,
  wishlistCount = 0,
  accountOpen = false,
  onSearch,
  onWishlist,
  onCart,
  onAccount,
  onSignOut,
}: Props) {
  const pathname = usePathname() || "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);

  useEffect(() => {
    const onScrollOrResize = () => {
      setCompact(window.innerWidth <= 640 && window.scrollY > 72);
    };
    onScrollOrResize();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const isRouteActive = (link: (typeof NAV_LINKS)[number]) => {
    if (page) return page === link.page;
    return link.href === "/"
      ? pathname === "/"
      : pathname === link.href || pathname.startsWith(`${link.href}/`);
  };

  const activeLinkHref =
    hoveredHref ?? NAV_LINKS.find((link) => isRouteActive(link))?.href ?? null;

  const fullName = user?.user_metadata?.full_name as string | undefined;
  const accountName = user
    ? (fullName ?? user.email?.split("@")[0] ?? "Akun")
    : "Masuk";
  const roleText = (role && ROLE_LABELS[role]) || "Pelanggan";

  const renderAccountLinks = (isMobile = false) => (
    <div className="flex flex-col gap-1">
      <div className="mb-1 flex items-center justify-between gap-3 rounded-2xl border border-[#EAE2D6] bg-[#F5EDE2]/50 px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          {isMobile && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#EAE2D6] bg-white text-[#96785D]">
              <UserIcon className="h-4 w-4" strokeWidth={1.5} />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-[#24201D]">
              {fullName ?? "Akun Pelanggan"}
            </p>
            <p className="truncate text-[11px] text-[#736A63]">{user?.email}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-[#EAE2D6] bg-white px-2 py-0.5 text-[10px] font-medium text-[#96785D]">
          {roleText}
        </span>
      </div>

      <Link
        href="/akun"
        onClick={() => setMenuOpen(false)}
        className="flex items-center justify-between rounded-xl px-3.5 py-2 text-xs font-medium text-[#4A433E] transition-colors hover:bg-[#F5EDE2]/60 hover:text-[#24201D]"
      >
        <span>{isMobile ? "Akun saya" : "Akun saya · Pesanan · Wishlist"}</span>
        {isMobile && <ChevronRight className="h-4 w-4 text-[#736A63]/60" strokeWidth={1.5} />}
      </Link>

      {role === "admin" && (
        <Link
          href="/admin"
          onClick={() => setMenuOpen(false)}
          className="flex items-center justify-between rounded-xl px-3.5 py-2 text-xs font-medium text-[#4A433E] transition-colors hover:bg-[#F5EDE2]/60 hover:text-[#24201D]"
        >
          <span>Panel Admin Toko</span>
          {isMobile && <ChevronRight className="h-4 w-4 text-[#736A63]/60" strokeWidth={1.5} />}
        </Link>
      )}

      {onSignOut && (
        <button
          type="button"
          onClick={() => {
            setMenuOpen(false);
            onSignOut();
          }}
          className="mt-0.5 flex items-center gap-2 rounded-xl px-3.5 py-2 text-left text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50"
        >
          <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>Keluar dari Akun</span>
        </button>
      )}
    </div>
  );

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] md:hidden"
          />
        )}
      </AnimatePresence>

      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
        <div className="mx-auto max-w-7xl">
          <motion.div
            layout
            transition={liquidSpring}
            className={`pointer-events-auto relative rounded-[26px] ${GLASS_SURFACE}`}
          >
            {/* Top Bar */}
            <div
              className={`relative flex items-center justify-between transition-[padding] duration-200 ${
                compact && !menuOpen
                  ? "px-3.5 py-2"
                  : "px-4 py-2.5 sm:px-6 sm:py-3.5"
              }`}
            >
              <Link
                href="/"
                aria-label="HEBBUNA, beranda"
                onClick={() => setMenuOpen(false)}
                className="shrink-0 font-serif text-2xl tracking-[0.04em] text-[#24201D] sm:text-[26px]"
              >
                Hebbuna<span className="text-[#96785D]">.</span>
              </Link>

              {/* Desktop Nav */}
              <nav
                aria-label="Navigasi utama"
                onMouseLeave={() => setHoveredHref(null)}
                className="hidden items-center gap-1 md:flex"
              >
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onMouseEnter={() => setHoveredHref(link.href)}
                    className="relative px-4 py-1.5 text-xs font-medium tracking-wide text-[#5C544E] transition-colors hover:text-[#24201D]"
                  >
                    {activeLinkHref === link.href && (
                      <motion.span
                        layoutId="navbar-liquid-pill"
                        transition={liquidSpring}
                        className="absolute inset-0 rounded-full border border-[#EAE2D6] bg-white/80 shadow-[0_2px_8px_rgba(120,100,80,0.06)]"
                      />
                    )}
                    <span className="relative z-10">
                      {link.label}
                    </span>
                  </Link>
                ))}
              </nav>

              {/* Action Icons */}
              <div className="flex items-center gap-0.5 sm:gap-1.5">
                <ActionItem href="/shop" label="Cari produk" onClick={onSearch}>
                  <Search className="h-[18px] w-[18px]" strokeWidth={1.5} />
                </ActionItem>

                <ActionItem
                  href="/akun"
                  label="Buka wishlist"
                  onClick={onWishlist}
                >
                  <Heart className="h-[18px] w-[18px]" strokeWidth={1.5} />
                  <CountBadge count={wishlistCount} />
                </ActionItem>

                <ActionItem
                  href="/cart"
                  label={`Buka tas belanja, ${cartCount} produk`}
                  onClick={onCart}
                >
                  <ShoppingBag
                    className="h-[18px] w-[18px]"
                    strokeWidth={1.5}
                  />
                  <CountBadge count={cartCount} />
                </ActionItem>

                <a
                  href="https://wa.me/6281234567890"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Hubungi HEBBUNA lewat WhatsApp"
                  title="WhatsApp HEBBUNA"
                  className={ICON_BTN}
                >
                  <MessageCircle
                    className="h-[18px] w-[18px]"
                    strokeWidth={1.5}
                  />
                </a>

                {/* Desktop Account / Login Link */}
                {user ? (
                  onAccount ? (
                    <button
                      type="button"
                      onClick={onAccount}
                      className="ml-1.5 hidden items-center gap-1.5 rounded-full border border-[#EAE2D6] bg-white/80 px-3.5 py-1.5 text-xs font-medium text-[#24201D] shadow-[0_2px_8px_rgba(120,100,80,0.04)] transition-colors hover:bg-white md:inline-flex"
                    >
                      <span className="max-w-[120px] truncate">
                        {accountName}
                      </span>
                    </button>
                  ) : (
                    <Link
                      href="/akun"
                      className="ml-1.5 hidden items-center gap-1.5 rounded-full border border-[#EAE2D6] bg-white/80 px-3.5 py-1.5 text-xs font-medium text-[#24201D] shadow-[0_2px_8px_rgba(120,100,80,0.04)] transition-colors hover:bg-white md:inline-flex"
                    >
                      <span className="max-w-[120px] truncate">
                        {accountName}
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-[#96785D]" strokeWidth={1.5} />
                    </Link>
                  )
                ) : (
                  <Link
                    href="/login"
                    className="ml-1.5 hidden items-center gap-1.5 rounded-full border border-[#EAE2D6] bg-white/80 px-3.5 py-1.5 text-xs font-medium text-[#24201D] shadow-[0_2px_8px_rgba(120,100,80,0.04)] transition-colors hover:bg-white md:inline-flex"
                  >
                    <span>Masuk</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-[#96785D]" strokeWidth={1.5} />
                  </Link>
                )}

                {/* Mobile Menu Button */}
                <button
                  type="button"
                  aria-label={menuOpen ? "Tutup navigasi" : "Buka navigasi"}
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((open) => !open)}
                  className="ml-1 flex h-9 w-9 items-center justify-center rounded-full border border-[#EAE2D6] bg-white/70 text-[#24201D] shadow-sm active:scale-90 md:hidden"
                >
                  {menuOpen ? (
                    <X className="h-[18px] w-[18px]" strokeWidth={1.5} />
                  ) : (
                    <Menu className="h-[18px] w-[18px]" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            {/* Mobile Dynamic Island Menu */}
            <AnimatePresence initial={false}>
              {menuOpen && (
                <motion.nav
                  aria-label="Navigasi mobile"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={liquidSpring}
                  className="relative overflow-hidden md:hidden"
                >
                  <div className="border-t border-[#EAE2D6] px-3 pb-3.5 pt-2.5">
                    <div className="flex flex-col gap-1">
                      {NAV_LINKS.map((link) => {
                        const active = isRouteActive(link);
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setMenuOpen(false)}
                            className={`flex items-center justify-between rounded-2xl px-4 py-2.5 text-xs transition-colors ${
                              active
                                ? "border border-[#EAE2D6] bg-white/90 font-semibold text-[#24201D] shadow-sm"
                                : "text-[#5C544E] hover:bg-white/60 hover:text-[#24201D]"
                            }`}
                          >
                            <span>{link.label}</span>
                            <ChevronRight className="h-4 w-4 text-[#96785D]/60" strokeWidth={1.5} />
                          </Link>
                        );
                      })}
                    </div>

                    <div className="mt-2.5 border-t border-[#EAE2D6] pt-2.5">
                      {user ? (
                        renderAccountLinks(true)
                      ) : (
                        <Link
                          href="/login"
                          onClick={() => setMenuOpen(false)}
                          className="flex w-full items-center justify-between rounded-2xl border border-[#EAE2D6] bg-white/80 px-4 py-3 text-xs font-semibold text-[#24201D] shadow-sm transition-colors hover:bg-white"
                        >
                          <span className="flex items-center gap-2.5">
                            <UserIcon className="h-4 w-4 text-[#96785D]" strokeWidth={1.5} />
                            <span>Masuk / Daftar Akun</span>
                          </span>
                          <ArrowUpRight className="h-4 w-4 text-[#96785D]" strokeWidth={1.5} />
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.nav>
              )}
            </AnimatePresence>

            {/* Desktop Account Popover */}
            <AnimatePresence>
              {accountOpen && user && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={liquidSpring}
                  className={`absolute right-0 top-full mt-2.5 hidden w-64 origin-top-right rounded-[24px] p-3.5 md:block ${GLASS_SURFACE}`}
                >
                  {renderAccountLinks(false)}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </header>
    </MotionConfig>
  );
}
