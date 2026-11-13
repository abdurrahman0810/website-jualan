'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowLeft, ArrowUpRight, Check, Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase } from '../../src/lib/supabase'

const liquidSpring = { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.8 }

const LIQUID_GLASS =
  'border border-white/90 bg-[#FFFEFB]/80 shadow-[0_15px_35px_rgba(120,100,80,0.06),inset_0_1px_1px_rgba(255,255,255,0.95)] backdrop-blur-md md:backdrop-blur-xl text-[#24201D]'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) router.replace('/akun')
    })
  }, [router])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || busy) return

    setBusy(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError) {
      setError(
        authError.message.toLowerCase().includes('invalid login credentials')
          ? 'Email atau kata sandi tidak cocok. Silakan periksa kembali.'
          : `Gagal masuk: ${authError.message}`,
      )
      setBusy(false)
      return
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role,is_active')
      .eq('id', data.user.id)
      .maybeSingle()

    if (profile?.is_active === false) {
      await supabase.auth.signOut()
      setError('Akun ini sedang dinonaktifkan. Hubungi admin toko.')
      setBusy(false)
      return
    }

    setSuccess(true)
    setBusy(false)

    setTimeout(() => {
      if (profile?.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/akun')
      }
    }, 500)
  }

  if (!supabase) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-[#FCFBF8] px-4">
        <div className={`mx-auto w-full max-w-sm rounded-3xl p-8 text-center ${LIQUID_GLASS}`}>
          <p className="text-xs text-[#736A63]">
            Supabase belum tersambung.
            <br />
            Silakan lengkapi <code className="font-semibold text-[#96785D]">.env.local</code>.
          </p>
          <Link href="/" className="mt-4 inline-block text-xs font-semibold text-[#24201D] hover:underline">
            ← Kembali ke beranda
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="relative flex min-h-svh w-full items-center justify-center bg-[#FCFBF8] text-[#24201D] overflow-hidden">
      {/* Ambient Glows */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-32 right-10 h-[500px] w-[500px] rounded-full bg-[#F5EDE2]/80 blur-[130px]" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-[#EFE7DC]/60 blur-[120px]" />

      <div className="relative z-10 grid w-full min-h-svh lg:grid-cols-12">
        {/* Desktop Left Split: Editorial Fashion Photo with Cormorant Quote */}
        <div className="relative hidden lg:col-span-6 lg:flex flex-col justify-between p-12 xl:p-16 overflow-hidden bg-[#EFE7DC]">
          <Image
            src="https://images.unsplash.com/photo-1584184924103-e310d9dc82fc?auto=format&fit=crop&w=1400&q=85"
            alt="Hebbuna Store Editorial"
            fill
            priority
            sizes="50vw"
            className="object-cover object-[center_28%] brightness-[0.88]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/30" />

          {/* Top Brand Monogram */}
          <div className="relative z-10">
            <Link
              href="/"
              className="inline-block font-serif text-3xl tracking-wide text-white"
            >
              Hebbuna<span className="text-[#EFE7DC]">.</span>
            </Link>
          </div>

          {/* Bottom Editorial Quote */}
          <div className="relative z-10 max-w-md text-white">
            <span className="inline-block rounded-full border border-white/30 bg-white/10 px-3.5 py-1 text-[10px] font-medium tracking-[0.2em] uppercase backdrop-blur-md">
              Elegansi Sederhana
            </span>
            <p className="mt-4 font-serif text-3xl xl:text-4xl font-normal leading-snug">
              &ldquo;Keanggunan yang lahir dari kenyamanan, menemani setiap langkah nyata.&rdquo;
            </p>
            <p className="mt-3 text-xs text-stone-200">
              HEBBUNA STORE · Curated Modest Wear
            </p>
          </div>
        </div>

        {/* Right Split: Clean Apple Liquid Glass Login Form */}
        <div className="flex w-full items-center justify-center p-6 sm:p-10 lg:col-span-6 lg:p-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={liquidSpring}
            className={`w-full max-w-md rounded-3xl p-7 sm:p-10 ${LIQUID_GLASS}`}
          >
            <div className="mb-6 flex items-center justify-between">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs text-[#736A63] hover:text-[#24201D] transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>Beranda Toko</span>
              </Link>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#96785D]">
                AKUN TOKO
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#24201D]">
              Selamat Datang
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-[#736A63]">
              Masukkan email dan kata sandi akun pelanggan atau admin Anda.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4 text-xs">
              <label className="flex flex-col gap-1.5 font-medium text-[#24201D]">
                <span>Alamat Email</span>
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="h-11 rounded-xl border border-[#EAE2D6] bg-white px-3.5 text-xs text-[#24201D] placeholder-[#736A63]/50 outline-none transition-colors focus:border-[#96785D]"
                />
              </label>

              <label className="flex flex-col gap-1.5 font-medium text-[#24201D]">
                <span>Kata Sandi</span>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="h-11 w-full rounded-xl border border-[#EAE2D6] bg-white px-3.5 pr-10 text-xs text-[#24201D] placeholder-[#736A63]/50 outline-none transition-colors focus:border-[#96785D]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#736A63] hover:text-[#24201D]"
                    aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                  </button>
                </div>
              </label>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700"
                    role="alert"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={busy || success}
                whileTap={{ scale: 0.98 }}
                className="mt-2 flex h-11 items-center justify-center gap-2 rounded-full bg-[#24201D] text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-black disabled:opacity-50"
              >
                {busy ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                    <span>Memeriksa Akun…</span>
                  </span>
                ) : success ? (
                  <span className="flex items-center gap-1.5 text-white">
                    <Check className="h-4 w-4" strokeWidth={1.5} />
                    <span>Berhasil Masuk</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span>Masuk ke Akun</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-[#EFE7DC]" strokeWidth={1.5} />
                  </span>
                )}
              </motion.button>
            </form>

            <div className="mt-8 border-t border-[#EAE2D6] pt-5 text-center text-xs text-[#736A63]">
              <span>Belum memiliki akun toko? </span>
              <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#96785D] hover:underline">
                Hubungi Admin HEBBUNA
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  )
}
