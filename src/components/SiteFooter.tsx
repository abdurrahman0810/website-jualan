import Link from 'next/link'
import { ArrowUp, ArrowUpRight } from 'lucide-react'

const EXPLORE_LINKS = [
  { label: 'Koleksi Terbaru', href: '/collection' },
  { label: 'Semua Produk', href: '/shop' },
  { label: 'Cerita HEBBUNA', href: '/about' },
]

const CUSTOMER_LINKS = [
  { label: 'Akun & Pesanan', href: '/akun' },
  { label: 'Panduan Belanja', href: '/shop' },
  { label: 'Hubungi WhatsApp', href: 'https://wa.me/6281284094614' },
]

const SOCIAL_LINKS = [
  
  {
    name: 'Instagram',
    href: 'https://www.instagram.com/',
    label: 'Instagram HEBBUNA',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden="true">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.7" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
]

const PAYMENT_METHODS = ['BCA Transfer', 'Mandiri', 'BNI', 'QRIS']

export function SiteFooter() {
  return (
    <footer
      id="footer"
      className="relative border-t border-[#EAE2D6] bg-[#FCFBF8] text-[#24201D]"
    >
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-16 sm:px-8 md:pt-20">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* Brand & Manifesto */}
          <div className="lg:col-span-4">
            <Link
              href="/"
              className="inline-block font-serif text-3xl tracking-[0.04em] text-[#24201D]"
            >
              Hebbuna<span className="text-[#96785D]">.</span>
            </Link>

            <p className="mt-4 max-w-xs text-xs leading-relaxed text-[#736A63]">
              Busana modest kontemporer yang dirancang dengan siluet anggun dan kenyamanan esensial untuk menemani hari-harimu.
            </p>

            <span className="mt-5 inline-block rounded-full border border-[#EAE2D6] bg-[#F5EDE2]/50 px-3.5 py-1.5 text-[10px] font-medium tracking-[0.16em] text-[#736A63]">
              NYAMAN · ANGGUN · ESENSIAL
            </span>
          </div>

          {/* Kolom Jelajahi */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#24201D]">
              Jelajahi
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5 text-xs text-[#736A63]">
              {EXPLORE_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="transition-colors hover:text-[#24201D]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Kolom Pelanggan */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#24201D]">
              Layanan
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5 text-xs text-[#736A63]">
              {CUSTOMER_LINKS.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="transition-colors hover:text-[#24201D]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Komunitas & Metode Pembayaran */}
          <div className="lg:col-span-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#24201D]">
              Ikuti Kami
            </h3>
            <p className="mt-3 text-xs text-[#736A63]">
              Kabar koleksi, inspirasi padu padan, dan cerita kurasi HEBBUNA.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#EAE2D6] bg-white px-3.5 py-1.5 text-xs font-medium text-[#4A433E] shadow-sm transition-colors hover:border-[#96785D]/40 hover:text-[#24201D]"
                >
                  {social.icon}
                  <span>{social.name}</span>
                  <ArrowUpRight className="h-3 w-3 text-[#96785D]" strokeWidth={1.5} />
                </a>
              ))}
            </div>

            <div className="mt-6 border-t border-[#EAE2D6] pt-5">
              <h4 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#736A63]">
                Metode Pembayaran Transfer Manual
              </h4>
              <div
                aria-label="Metode pembayaran"
                className="mt-2.5 flex flex-wrap gap-1.5"
              >
                {PAYMENT_METHODS.map((method) => (
                  <span
                    key={method}
                    className="rounded-lg border border-[#EAE2D6] bg-white px-2.5 py-1 text-[10px] font-medium tracking-wide text-[#736A63]"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Baris Bawah */}
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-[#EAE2D6] pt-6 text-xs text-[#736A63] sm:flex-row sm:items-center">
          <span>© 2026 HEBBUNA STORE. All rights reserved.</span>
          <span className="text-[#96785D]">
            Dirancang dengan rasa, untuk hari-hari nyata.
          </span>
          <a
            href="#top"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#EAE2D6] bg-white px-3.5 py-1.5 text-xs font-medium text-[#24201D] shadow-sm transition-colors hover:border-[#96785D]/40"
          >
            <span>Kembali ke atas</span>
            <ArrowUp className="h-3 w-3 text-[#96785D]" strokeWidth={1.5} />
          </a>
        </div>
      </div>
    </footer>
  )
}
