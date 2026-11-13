'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowUpRight,
  Heart,
  Search,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react'
import { supabase, supabaseConfigured } from './lib/supabase'
import { mapCatalog, type CatalogRow, type Product, type Variant } from './lib/catalog'
import { StorefrontNavbar } from './components/StorefrontNavbar'

const sampleProducts: Product[] = [
  { id: 'sample-1', name: 'Pashmina Aira Voal', category: 'Pashmina', price: 89000, imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=760&q=85', description: 'Pashmina voal premium yang ringan, breathable, dan mudah dibentuk dengan drape anggun.', material: 'Voal Lembut', measurements: {}, label: 'Favorit', variants: [{ id: 'sample-1a', size: 'All size', color: 'Peach Bloom', available: true }, { id: 'sample-1b', size: 'All size', color: 'Soft Butter', available: true }, { id: 'sample-1c', size: 'All size', color: 'Warm Moss', available: true }] },
  { id: 'sample-2', name: 'Segi Empat Nala Airy', category: 'Segi Empat', price: 75000, imageUrl: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&w=760&q=85', description: 'Segi empat nyaman dengan tekstur airy yang rapi seharian tanpa mudah kusut.', material: 'Voal Ultrafine', measurements: {}, label: 'Terbaru', variants: [{ id: 'sample-2a', size: 'All size', color: 'Warm Cream', available: true }, { id: 'sample-2b', size: 'All size', color: 'Dusty Rose', available: true }] },
  { id: 'sample-3', name: 'Pashmina Safa Silk', category: 'Pashmina', price: 95000, imageUrl: 'https://images.unsplash.com/photo-1584184924103-e310d9dc82fc?auto=format&fit=crop&w=760&q=85', description: 'Kilau satin matte lembut memberikan aksen elegan untuk momen formal maupun harian.', material: 'Chiffon Silk', measurements: {}, variants: [{ id: 'sample-3a', size: 'All size', color: 'Lilac Dusk', available: true }, { id: 'sample-3b', size: 'All size', color: 'Desert Sand', available: true }] },
  { id: 'sample-4', name: 'Inner Sakinah Comfort', category: 'Inner', price: 39000, imageUrl: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=760&q=85', description: 'Ciput rajut anti-pusing dengan elastisitas pas dan daya serap keringat tinggi.', material: 'Cotton Stretch', measurements: {}, variants: [{ id: 'sample-4a', size: 'All size', color: 'Almond Beige', available: true }, { id: 'sample-4b', size: 'All size', color: 'Charcoal', available: true }] },
]

const money = (amount: number) => `Rp${amount.toLocaleString('id-ID')}`
type SavedAddress = { id: string; label: string; recipient_name: string; phone: string; address_line: string; city: string; province: string; postal_code: string; delivery_note: string | null; is_default: boolean }

const swatchPalette = ['#E4C7B5', '#EFE3C3', '#C7CEB8', '#D8B8B5', '#D2C8DB', '#C6D2DB']
const colorHex: Record<string, string> = {
  peach: '#E4C7B5', butter: '#EFE3C3', moss: '#C7CEB8', berry: '#C79E9F',
  cream: '#F4ECE1', rose: '#DFB8B5', sky: '#C6D2DB', lilac: '#D2C8DB',
  sand: '#D9CBB7', cocoa: '#A89284', almond: '#E0D0BF', charcoal: '#5A5450',
  blush: '#E5C0BC', hitam: '#2E2A27', putih: '#FBF9F5', navy: '#4F596B',
}

function getColorHex(name: string, index: number) {
  const match = Object.entries(colorHex).find(([key]) => name.toLowerCase().includes(key))
  return match?.[1] ?? swatchPalette[index % swatchPalette.length]
}

function measurementUnit(key: string) {
  return key === 'catatan' ? '' : ' cm'
}

const liquidSpring = { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.8 }

const LIQUID_GLASS =
  'border border-white/90 bg-[#FFFEFB]/85 shadow-[0_20px_50px_rgba(120,100,80,0.08),inset_0_1px_1px_rgba(255,255,255,0.95)] backdrop-blur-md md:backdrop-blur-xl text-[#24201D]'

function ProductImage({ src, alt, priority = false }: { src: string | null; alt: string; priority?: boolean }) {
  const [loaded, setLoaded] = useState(false)
  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#EFE7DC] text-xs text-[#736A63]">
        Hebbuna
      </div>
    )
  }
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#EFE7DC]">
      {!loaded && <div className="absolute inset-0 shimmer-placeholder z-0" />}
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        onLoad={() => setLoaded(true)}
        className={`object-cover object-center transition-all duration-500 ${
          loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
        } group-hover:scale-105`}
      />
    </div>
  )
}

type StorefrontPage = 'home' | 'shop' | 'collection' | 'about'

export default function App({ initialProducts, initialCatalogError, page = 'home' }: { initialProducts: Product[] | null; initialCatalogError: string | null; page?: StorefrontPage }) {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>(initialProducts ?? (supabaseConfigured ? [] : sampleProducts))
  const catalogState: 'demo' | 'live' | 'error' = initialProducts !== null ? 'live' : initialCatalogError ? 'error' : 'demo'
  const catalogError = initialCatalogError ?? ''
  const catalogPageSize = page === 'shop' || page === 'collection' ? 12 : 8
  const [catalogOffset, setCatalogOffset] = useState(initialProducts?.length ?? 0)
  const [canLoadMore, setCanLoadMore] = useState((initialProducts?.length ?? 0) >= catalogPageSize)
  const [loadingMore, setLoadingMore] = useState(false)
  const [category, setCategory] = useState('Semua')
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeProduct, setActiveProduct] = useState<Product | null>(null)
  const [productDetailsLoading, setProductDetailsLoading] = useState(false)
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})
  const [cart, setCart] = useState<{ product: Product; variant: Variant }[]>([])
  const [cartReady, setCartReady] = useState(false)
  const [wishlistIds, setWishlistIds] = useState<string[]>([])
  const [restockIds, setRestockIds] = useState<string[]>([])
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [submittingOrder, setSubmittingOrder] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [notice, setNotice] = useState('')

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Prevent background scrolling when modal or cart drawer is open
  useEffect(() => {
    if (activeProduct || cartOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [activeProduct, cartOpen])

  const categories = useMemo(() => ['Semua', ...new Set(products.map((product) => product.category).filter(Boolean))], [products])
  
  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      const matchCat = category === 'Semua' || product.category === category
      const matchSearch = !searchTerm || `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(searchTerm.toLowerCase())
      return matchCat && matchSearch
    })
  }, [category, products, searchTerm])

  const bestSellerProducts = useMemo(() => {
    const marked = visibleProducts.filter((product) => product.isBestSeller)
    return (marked.length ? marked : visibleProducts).slice(0, 4)
  }, [visibleProducts])

  const hasBestSellerMarks = bestSellerProducts.some((product) => product.isBestSeller)
  const subtotal = cart.reduce((sum, item) => sum + item.product.price, 0)
  const selectedAddress = savedAddresses.find((address) => address.id === selectedAddressId)

  // Local storage cart synchronization
  useEffect(() => {
    const savedCart = window.localStorage.getItem('hebbuna-store-cart')
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart) as { product: Product; variant: Variant }[])
      } catch {
        window.localStorage.removeItem('hebbuna-store-cart')
      }
    }
    setCartReady(true)
  }, [])

  useEffect(() => {
    if (!cartReady) return
    window.localStorage.setItem('hebbuna-store-cart', JSON.stringify(cart))
  }, [cart, cartReady])

  // Customer preferences
  useEffect(() => {
    const client = supabase
    if (!client || !user) return undefined
    let current = true

    const loadCustomerPreferences = async () => {
      const [{ data: wishlist }, { data: restocks }] = await Promise.all([
        client.from('customer_wishlist').select('product_id').eq('user_id', user.id),
        client.from('restock_notifications').select('id,variant_id,notified_at').eq('user_id', user.id).is('notified_at', null),
      ])
      if (!current) return
      setWishlistIds((wishlist ?? []).map((item) => item.product_id))
      setRestockIds((restocks ?? []).map((item) => item.variant_id))
    }
    void loadCustomerPreferences()

    return () => { current = false }
  }, [user])

  // Load customer addresses for checkout
  useEffect(() => {
    const client = supabase
    if (!client || !user || !checkoutOpen) return undefined
    let current = true
    void client.from('customer_addresses').select('*').eq('user_id', user.id)
      .order('is_default', { ascending: false }).order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!current) return
        const addresses = (data ?? []) as SavedAddress[]
        setSavedAddresses(addresses)
        const main = addresses.find((address) => address.is_default) ?? addresses[0]
        if (main) setSelectedAddressId((selected) => selected || main.id)
      })
    return () => { current = false }
  }, [checkoutOpen, user])

  // Escape key listener for dialog
  useEffect(() => {
    if (!activeProduct) return undefined
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveProduct(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [activeProduct])

  // Catalog loader
  useEffect(() => {
    const client = supabase
    if (!client || initialProducts !== null || page === 'about') return undefined

    let current = true
    void client.rpc('daftar_produk_online')
      .select('product_id,product_name,slug,category_name,sell_price,image_url,variants')
      .range(0, catalogPageSize - 1).then(({ data, error }) => {
      if (!current) return
      if (error) return
      const next = mapCatalog((data ?? []) as CatalogRow[])
      setProducts(next)
      setCatalogOffset(next.length)
      setCanLoadMore(next.length === catalogPageSize)
    })

    return () => { current = false }
  }, [catalogPageSize, initialProducts, page])

  // Auth listener
  useEffect(() => {
    const client = supabase
    if (!client) return undefined
    let current = true

    void client.auth.getSession().then(({ data }) => {
      if (current) setUser(data.session?.user ?? null)
    })

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (!current) return
      const signedInUser = session?.user ?? null
      setUser(signedInUser)
      if (!signedInUser) {
        setRole(null)
        setWishlistIds([])
        setRestockIds([])
      } else {
        void client.from('user_profiles').select('role,is_active').eq('id', signedInUser.id).maybeSingle().then(({ data: profile }) => {
          if (!current) return
          if (profile?.is_active === false) {
            void client.auth.signOut()
            return
          }
          setRole(profile?.role ?? null)
        })
      }
    })

    return () => {
      current = false
      listener.subscription.unsubscribe()
    }
  }, [])

  function showNotice(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }

  async function signOut() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) showNotice('Gagal keluar akun. Silakan coba lagi.')
    else {
      setAccountOpen(false)
      showNotice('Berhasil keluar dari akun.')
    }
  }

  function selectedVariant(product: Product) {
    const selectedId = selectedVariants[product.id]
    return product.variants.find((variant) => variant.id === selectedId) ?? product.variants.find((variant) => variant.available) ?? product.variants[0]
  }

  async function openProduct(product: Product) {
    setActiveProduct(product)
    if (!supabase || product.id.startsWith('sample-') || (product.description && product.material)) return
    setProductDetailsLoading(true)
    const { data, error } = await supabase.rpc('daftar_produk_online')
      .select('product_id,product_name,slug,description,material,measurements,category_id,category_name,sell_price,image_url,variants')
      .eq('product_id', product.id).maybeSingle()
    if (error) showNotice(`Detail produk belum bisa dimuat: ${error.message}`)
    else if (data) {
      const details = mapCatalog([data as CatalogRow])[0]
      setActiveProduct((current) => current?.id === product.id ? details : current)
    }
    setProductDetailsLoading(false)
  }

  async function loadMoreProducts() {
    if (!supabase || loadingMore) return
    setLoadingMore(true)
    const { data, error } = await supabase.rpc('daftar_produk_online')
      .select('product_id,product_name,slug,category_name,sell_price,image_url,variants')
      .range(catalogOffset, catalogOffset + 11)
    if (error) showNotice('Produk berikutnya belum bisa dimuat.')
    else {
      const next = mapCatalog((data ?? []) as CatalogRow[])
      setProducts((current) => [...current, ...next])
      setCatalogOffset((current) => current + next.length)
      setCanLoadMore(next.length === 12)
    }
    setLoadingMore(false)
  }

  function addToCart(product: Product) {
    const variant = selectedVariant(product)
    if (!variant || !variant.available) {
      showNotice('Varian ini sedang habis.')
      return
    }
    setCart((current) => [...current, { product, variant }])
    showNotice(`${product.name} dimasukkan ke tas belanja.`)
  }

  function buyNow(product: Product) {
    const variant = selectedVariant(product)
    if (!variant || !variant.available) {
      showNotice('Varian ini sedang habis.')
      return
    }
    setCart((current) => [...current, { product, variant }])
    setActiveProduct(null)
    setCartOpen(true)
  }

  function removeFromCart(index: number) {
    setCart((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  async function toggleWishlist(product: Product) {
    if (!user) { router.push('/login'); return }
    if (!supabase) return
    const saved = wishlistIds.includes(product.id)
    const result = saved
      ? await supabase.from('customer_wishlist').delete().eq('user_id', user.id).eq('product_id', product.id)
      : await supabase.from('customer_wishlist').insert({ user_id: user.id, product_id: product.id })
    if (result.error) showNotice(`Wishlist belum tersimpan: ${result.error.message}`)
    else {
      setWishlistIds((current) => saved ? current.filter((id) => id !== product.id) : [...current, product.id])
      showNotice(saved ? `${product.name} dihapus dari wishlist.` : `${product.name} disimpan ke wishlist.`)
    }
  }

  async function requestRestock(product: Product, variant: Variant) {
    if (!user) { router.push('/login'); return }
    if (!supabase) return
    const { error } = await supabase.from('restock_notifications').upsert({ user_id: user.id, variant_id: variant.id, notified_at: null, seen_at: null }, { onConflict: 'user_id,variant_id' })
    if (error) showNotice(`Permintaan belum tersimpan: ${error.message}`)
    else {
      setRestockIds((current) => current.includes(variant.id) ? current : [...current, variant.id])
      showNotice(`Kami akan mengabari saat ${product.name} tersedia kembali.`)
    }
  }

  function beginCheckout() {
    if (!supabase || catalogState !== 'live') {
      showNotice('Katalog online sedang disiapkan.')
      return
    }
    if (!user) {
      router.push('/login')
      return
    }
    setCheckoutOpen(true)
  }

  async function placeOnlineOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !user || submittingOrder) return

    const form = new FormData(event.currentTarget)
    setSubmittingOrder(true)
    try {
      const { data, error } = await supabase.rpc('buat_pesanan_online', {
        p_items: cart.map(({ variant }) => ({ variant_id: variant.id, qty: 1 })),
        p_recipient_name: selectedAddress?.recipient_name ?? String(form.get('recipient_name') ?? '').trim(),
        p_phone: selectedAddress?.phone ?? String(form.get('phone') ?? '').trim(),
        p_address_line: selectedAddress?.address_line ?? String(form.get('address_line') ?? '').trim(),
        p_city: selectedAddress?.city ?? String(form.get('city') ?? '').trim(),
        p_province: selectedAddress?.province ?? String(form.get('province') ?? '').trim(),
        p_postal_code: selectedAddress?.postal_code ?? String(form.get('postal_code') ?? '').trim(),
        p_delivery_note: selectedAddress?.delivery_note ?? String(form.get('delivery_note') ?? '').trim(),
      })

      if (error) {
        showNotice(`Pesanan belum berhasil dibuat: ${error.message}`)
        return
      }

      if (!selectedAddress && form.get('save_address') === 'on') {
        await supabase.rpc('simpan_alamat_pelanggan', {
          p_address_id: null, p_label: 'Alamat Utama',
          p_recipient_name: String(form.get('recipient_name') ?? '').trim(), p_phone: String(form.get('phone') ?? '').trim(),
          p_address_line: String(form.get('address_line') ?? '').trim(), p_city: String(form.get('city') ?? '').trim(),
          p_province: String(form.get('province') ?? '').trim(), p_postal_code: String(form.get('postal_code') ?? '').trim(),
          p_delivery_note: String(form.get('delivery_note') ?? '').trim(), p_is_default: false,
        })
      }
      setCart([])
      setCheckoutOpen(false)
      setCartOpen(false)
      showNotice(`Pesanan #${String(data).slice(0, 8)} berhasil dibuat.`)
    } catch {
      showNotice('Koneksi terganggu. Silakan coba kembali.')
    } finally {
      setSubmittingOrder(false)
    }
  }

  const heroImage = 'https://images.unsplash.com/photo-1584184924103-e310d9dc82fc?auto=format&fit=crop&w=1900&q=85'

  return (
    <>
      <StorefrontNavbar
        page={page}
        user={user}
        role={role}
        cartCount={cart.length}
        wishlistCount={wishlistIds.length}
        accountOpen={accountOpen}
        onSearch={() => {
          if (page === 'about') {
            router.push('/shop')
            return
          }
          document.getElementById('catalog-search-input')?.focus()
          document.getElementById('koleksi')?.scrollIntoView({ behavior: 'smooth' })
        }}
        onWishlist={() => user ? router.push('/akun') : router.push('/login')}
        onCart={() => setCartOpen(true)}
        onAccount={() => setAccountOpen(!accountOpen)}
        onSignOut={() => void signOut()}
      />

      {/* Floating Apple Liquid Glass Product Modal */}
      <AnimatePresence>
        {activeProduct && (
          <motion.div
            className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/25 p-4 backdrop-blur-sm sm:p-6"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveProduct(null) }}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-label={`Detail ${activeProduct.name}`}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={liquidSpring}
              className={`relative grid w-full max-w-4xl overflow-hidden rounded-3xl ${LIQUID_GLASS} sm:grid-cols-2 max-sm:max-h-[90svh]`}
            >
              <button
                className="absolute right-3.5 top-3.5 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-[#EAE2D6] bg-white/80 text-[#24201D] shadow-sm transition-colors hover:bg-white"
                onClick={() => setActiveProduct(null)}
                aria-label="Tutup detail produk"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>

              <div className="relative aspect-[3/4] w-full bg-[#EFE7DC] sm:min-h-[460px]">
                {activeProduct.imageUrl ? (
                  <Image src={activeProduct.imageUrl} alt={activeProduct.name} fill priority sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-[#736A63]">{activeProduct.category}</div>
                )}
              </div>

              <div className="flex flex-col justify-between overflow-y-auto p-6 sm:p-8">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#96785D]">
                    {activeProduct.category} · HEBBUNA WEAR
                  </p>

                  <h2 className="mt-2 font-serif text-2xl font-normal text-[#24201D] sm:text-3xl">
                    {activeProduct.name}
                  </h2>

                  <p className="mt-1 text-base font-semibold text-[#96785D]">{money(activeProduct.price)}</p>

                  {productDetailsLoading && (
                    <p className="mt-2 text-xs text-[#736A63]">Memuat rincian bahan…</p>
                  )}

                  <p className="mt-4 text-xs leading-relaxed text-[#736A63]">
                    {activeProduct.description || 'Pilihan busana HEBBUNA yang dirancang khusus untuk kenyamanan langkah harianmu.'}
                  </p>

                  {activeProduct.material && (
                    <p className="mt-3 flex gap-2 text-xs text-[#4A433E]">
                      <span className="text-[#736A63]">Material:</span>
                      {activeProduct.material}
                    </p>
                  )}

                  {/* Variants Selector */}
                  <div className="mt-5">
                    <span className="mb-2 block text-[11px] font-semibold text-[#24201D]">Pilihan Varian / Warna</span>
                    <div className="flex flex-wrap gap-2">
                      {activeProduct.variants.map((variant, index) => (
                        <button
                          key={variant.id}
                          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                            selectedVariant(activeProduct)?.id === variant.id
                              ? 'border-[#96785D] bg-[#F5EDE2] font-medium text-[#24201D]'
                              : 'border-[#EAE2D6] bg-white text-[#736A63] hover:border-[#96785D]/50 hover:text-[#24201D]'
                          } disabled:cursor-not-allowed disabled:opacity-40`}
                          onClick={() => setSelectedVariants((current) => ({ ...current, [activeProduct.id]: variant.id }))}
                          disabled={!variant.available}
                        >
                          <span className="inline-block h-2.5 w-2.5 rounded-full border border-black/10" style={{ backgroundColor: getColorHex(variant.color ?? variant.size ?? '', index) }} />
                          <span>{variant.color ?? variant.size ?? `Varian ${index + 1}`}</span>
                          {!variant.available && <span className="text-[10px] text-rose-500">(Habis)</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Measurements */}
                  {Object.entries(activeProduct.measurements ?? {}).filter(([, value]) => value.trim()).length > 0 && (
                    <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-b border-[#EAE2D6] py-3 text-xs">
                      {Object.entries(activeProduct.measurements).filter(([, value]) => value.trim()).map(([key, value]) => (
                        <div key={key} className="flex justify-between gap-1">
                          <dt className="capitalize text-[#736A63]">{key.replaceAll('_', ' ')}</dt>
                          <dd className="font-medium text-[#24201D]">{value}{measurementUnit(key)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>

                <div className="mt-8">
                  <div className="flex items-center gap-3">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#24201D] px-5 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => buyNow(activeProduct)}
                      disabled={!selectedVariant(activeProduct)?.available}
                    >
                      <span>Beli Sekarang</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-[#EFE7DC]" strokeWidth={1.5} />
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-[#EAE2D6] bg-white px-5 text-xs font-semibold uppercase tracking-wider text-[#24201D] shadow-sm transition-colors hover:border-[#96785D] disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => addToCart(activeProduct)}
                      disabled={!selectedVariant(activeProduct)?.available}
                    >
                      <ShoppingBag className="h-4 w-4 text-[#96785D]" strokeWidth={1.5} />
                      <span>Masuk Tas</span>
                    </motion.button>
                  </div>

                  <button
                    className="mt-3 flex w-full items-center justify-center gap-1.5 text-xs font-medium text-[#736A63] transition-colors hover:text-[#24201D]"
                    onClick={() => void toggleWishlist(activeProduct)}
                  >
                    <Heart className={`h-3.5 w-3.5 ${wishlistIds.includes(activeProduct.id) ? 'fill-[#96785D] text-[#96785D]' : ''}`} strokeWidth={1.5} />
                    <span>{wishlistIds.includes(activeProduct.id) ? 'Tersimpan di Wishlist' : 'Simpan ke Wishlist'}</span>
                  </button>

                  {selectedVariant(activeProduct) && !selectedVariant(activeProduct)?.available && (
                    <button
                      className="mt-2 w-full text-center text-xs font-medium text-[#96785D] hover:underline"
                      onClick={() => void requestRestock(activeProduct, selectedVariant(activeProduct)!)}
                    >
                      {restockIds.includes(selectedVariant(activeProduct)!.id) ? 'Kabar restock aktif' : 'Kabari saya saat stok tersedia'}
                    </button>
                  )}
                </div>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Apple Liquid Glass Cart Drawer */}
      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[90] bg-black/20 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setCartOpen(false); setCheckoutOpen(false) }}
            />
            <motion.aside
              className={`fixed bottom-0 right-0 top-0 z-[91] flex w-full max-w-md flex-col ${LIQUID_GLASS}`}
              aria-label="Tas belanja"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ ...liquidSpring, stiffness: 380, damping: 36 }}
            >
              <div className="flex items-center justify-between border-b border-[#EAE2D6] px-5 py-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#96785D]">HEBBUNA STORE</p>
                  <h2 className="font-serif text-xl font-normal text-[#24201D]">
                    {checkoutOpen ? 'Konfirmasi Pengiriman' : <>Tas Belanja <span className="font-sans text-xs text-[#736A63]">({cart.length})</span></>}
                  </h2>
                </div>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#EAE2D6] bg-white text-[#736A63] shadow-sm transition-colors hover:text-[#24201D]"
                  onClick={() => { setCartOpen(false); setCheckoutOpen(false) }}
                  aria-label="Tutup tas belanja"
                >
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>

              {checkoutOpen ? (
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <button className="mb-3 text-xs font-medium text-[#736A63] transition-colors hover:text-[#24201D]" onClick={() => setCheckoutOpen(false)}>
                    ← Kembali ke rincian tas
                  </button>
                  <p className="mb-4 text-xs leading-relaxed text-[#736A63]">
                    Lengkapi alamat tujuan pengiriman. Biaya ongkir akan dikonfirmasi admin sebelum transfer.
                  </p>
                  <form className="flex flex-col gap-4 text-xs" key={selectedAddressId} onSubmit={placeOnlineOrder}>
                    {savedAddresses.length > 0 && (
                      <label className="flex flex-col gap-1 font-medium text-[#24201D]">
                        Alamat Tersimpan
                        <select
                          value={selectedAddressId}
                          onChange={(e) => setSelectedAddressId(e.target.value)}
                          className="h-10 rounded-xl border border-[#EAE2D6] bg-white px-3 text-xs text-[#24201D] outline-none"
                        >
                          <option value="">Gunakan Alamat Baru</option>
                          {savedAddresses.map((a) => (
                            <option key={a.id} value={a.id}>{a.label}{a.is_default ? ' · Utama' : ''}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label className="flex flex-col gap-1 font-medium text-[#24201D]">
                      Nama Penerima
                      <input name="recipient_name" autoComplete="name" defaultValue={selectedAddress?.recipient_name ?? user?.user_metadata.full_name ?? ''} required className="h-10 rounded-xl border border-[#EAE2D6] bg-white px-3 text-xs text-[#24201D] outline-none focus:border-[#96785D]" />
                    </label>
                    <label className="flex flex-col gap-1 font-medium text-[#24201D]">
                      Nomor WhatsApp
                      <input name="phone" type="tel" autoComplete="tel" defaultValue={selectedAddress?.phone ?? ''} placeholder="08xxxxxxxxxx" required className="h-10 rounded-xl border border-[#EAE2D6] bg-white px-3 text-xs text-[#24201D] outline-none focus:border-[#96785D]" />
                    </label>
                    <label className="flex flex-col gap-1 font-medium text-[#24201D]">
                      Alamat Lengkap
                      <textarea name="address_line" defaultValue={selectedAddress?.address_line ?? ''} placeholder="Nama jalan, nomor rumah, RT/RW, kecamatan" required rows={3} className="rounded-xl border border-[#EAE2D6] bg-white px-3 py-2 text-xs text-[#24201D] outline-none focus:border-[#96785D]" />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex flex-col gap-1 font-medium text-[#24201D]">
                        Kota / Kabupaten
                        <input name="city" defaultValue={selectedAddress?.city ?? ''} required className="h-10 rounded-xl border border-[#EAE2D6] bg-white px-3 text-xs text-[#24201D] outline-none focus:border-[#96785D]" />
                      </label>
                      <label className="flex flex-col gap-1 font-medium text-[#24201D]">
                        Provinsi
                        <input name="province" defaultValue={selectedAddress?.province ?? ''} required className="h-10 rounded-xl border border-[#EAE2D6] bg-white px-3 text-xs text-[#24201D] outline-none focus:border-[#96785D]" />
                      </label>
                    </div>
                    <label className="flex flex-col gap-1 font-medium text-[#24201D]">
                      Kode Pos
                      <input name="postal_code" defaultValue={selectedAddress?.postal_code ?? ''} required className="h-10 rounded-xl border border-[#EAE2D6] bg-white px-3 text-xs text-[#24201D] outline-none focus:border-[#96785D]" />
                    </label>
                    <label className="flex flex-col gap-1 font-medium text-[#24201D]">
                      Catatan Pengiriman (Opsional)
                      <textarea name="delivery_note" defaultValue={selectedAddress?.delivery_note ?? ''} placeholder="Patokan atau pesan kurir" rows={2} className="rounded-xl border border-[#EAE2D6] bg-white px-3 py-2 text-xs text-[#24201D] outline-none focus:border-[#96785D]" />
                    </label>
                    {!selectedAddress && (
                      <label className="flex items-center gap-2 text-xs text-[#736A63]">
                        <input type="checkbox" name="save_address" className="accent-[#96785D]" />
                        Simpan alamat ini untuk pesanan berikutnya
                      </label>
                    )}
                    <div className="mt-2 flex items-center justify-between border-t border-[#EAE2D6] pt-3 text-xs">
                      <span className="text-[#736A63]">Subtotal Produk</span>
                      <strong className="text-sm font-semibold text-[#24201D]">{money(subtotal)}</strong>
                    </div>
                    <p className="text-[11px] leading-relaxed text-[#736A63]">
                      Metode pembayaran transfer manual. Admin kami akan mengirimkan rincian rekening setelah pesanan terdaftar.
                    </p>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      className="mt-2 flex h-11 items-center justify-center gap-2 rounded-full bg-[#24201D] text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-black disabled:opacity-50"
                      type="submit"
                      disabled={submittingOrder}
                    >
                      {submittingOrder ? 'Memproses Pesanan…' : 'Konfirmasi Pesanan'}
                      <ArrowUpRight className="h-3.5 w-3.5 text-[#EFE7DC]" strokeWidth={1.5} />
                    </motion.button>
                  </form>
                </div>
              ) : cart.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 text-center">
                  <ShoppingBag className="h-8 w-8 text-[#96785D]/40" strokeWidth={1.5} />
                  <p className="text-xs text-[#736A63]">Tas belanja kamu masih kosong.</p>
                  <button className="text-xs font-semibold text-[#96785D] hover:underline" onClick={() => setCartOpen(false)}>
                    Jelajahi koleksi busana kami
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto px-5 py-3">
                    {cart.map((item, index) => (
                      <div className="flex gap-3 border-b border-[#EAE2D6] py-3.5" key={`${item.product.id}-${item.variant.id}-${index}`}>
                        <div className="relative h-16 w-12 overflow-hidden rounded-lg bg-[#EFE7DC] shrink-0">
                          {item.product.imageUrl ? (
                            <Image src={item.product.imageUrl} alt="" fill sizes="48px" className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-[#736A63]">H.</div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col justify-center">
                          <h3 className="truncate font-sans text-xs font-semibold text-[#24201D]">{item.product.name}</h3>
                          <p className="text-[11px] text-[#736A63]">{item.variant.color}{item.variant.size ? ` · ${item.variant.size}` : ''}</p>
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#96785D]">{money(item.product.price)}</span>
                            <button className="text-[11px] text-rose-500 hover:underline" onClick={() => removeFromCart(index)}>
                              Hapus
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-[#EAE2D6] px-5 py-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#736A63]">Total Sementara</span>
                      <strong className="text-sm font-semibold text-[#24201D]">{money(subtotal)}</strong>
                    </div>
                    <p className="mt-1 text-[11px] text-[#736A63]">Ongkos kirim dikonfirmasi sebelum transfer manual.</p>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#24201D] text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-black"
                      onClick={beginCheckout}
                    >
                      <span>Lanjut ke Pengiriman</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-[#EFE7DC]" strokeWidth={1.5} />
                    </motion.button>
                  </div>
                </>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Page Content */}
      <main className="relative min-h-screen bg-[#FCFBF8] text-[#24201D]">
        {/* Editorial Hero (Homepage Only) */}
        {page === 'home' && (
          <section className="relative flex min-h-[92svh] w-full flex-col justify-center overflow-hidden px-5 pt-28 pb-16 sm:px-8 sm:pt-36 sm:pb-24 lg:px-16" id="top">
            {/* Ambient Warm Champagne Glow */}
            <div aria-hidden="true" className="pointer-events-none absolute -top-40 right-10 h-[500px] w-[500px] rounded-full bg-[#F5EDE2]/80 blur-[140px]" />
            <div aria-hidden="true" className="pointer-events-none absolute bottom-10 left-10 h-[400px] w-[400px] rounded-full bg-[#EFE7DC]/50 blur-[120px]" />

            <div className="relative z-10 mx-auto w-full max-w-7xl">
              <div className="grid items-center gap-12 lg:grid-cols-12">
                {/* Left Editorial Copy */}
                <div className="lg:col-span-7">
                  <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...liquidSpring, delay: 0.1 }}
                    className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#96785D]"
                  >
                    <span className="h-px w-6 bg-[#96785D]" />
                    MODEST WEAR · KOLEKSI TERBARU
                  </motion.p>

                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...liquidSpring, delay: 0.2 }}
                    className="mt-6 font-serif text-[clamp(44px,7vw,92px)] font-normal leading-[1.02] tracking-[-0.02em] text-[#24201D]"
                  >
                    Anggun dalam<br />
                    <span className="italic text-[#96785D]">kesederhanaan.</span>
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...liquidSpring, delay: 0.3 }}
                    className="mt-6 max-w-md text-xs leading-relaxed text-[#736A63] sm:text-sm"
                  >
                    Busana muslimah kontemporer dengan siluet luwes, dirancang untuk menemani hari-harimu dengan penuh percaya diri dan rasa nyaman.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...liquidSpring, delay: 0.4 }}
                    className="mt-8 flex flex-wrap items-center gap-4"
                  >
                    <a
                      href="#koleksi"
                      className="inline-flex h-12 items-center gap-2.5 rounded-full bg-[#24201D] px-7 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-black active:scale-95"
                    >
                      <span>Jelajahi Koleksi</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-[#EFE7DC]" strokeWidth={1.5} />
                    </a>

                    <div className="inline-flex items-center gap-2 rounded-full border border-[#EAE2D6] bg-white/70 px-4 py-2 text-xs text-[#736A63] shadow-sm">
                      <Sparkles className="h-3.5 w-3.5 text-[#96785D]" strokeWidth={1.5} />
                      <span>Kenyamanan Esensial Setiap Hari</span>
                    </div>
                  </motion.div>
                </div>

                {/* Right Hero Image Card */}
                <div className="lg:col-span-5">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ ...liquidSpring, delay: 0.3 }}
                    className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-[#EFE7DC] shadow-[0_20px_40px_rgba(120,100,80,0.06)]"
                  >
                    <Image
                      src={heroImage}
                      alt="Koleksi hijab HEBBUNA dengan gaya modest yang anggun"
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover object-[center_30%]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                    <span className="absolute bottom-4 left-4 rounded-full border border-white/60 bg-white/70 px-3.5 py-1 text-[10px] font-medium tracking-wider text-[#24201D] backdrop-blur-md">
                      HEBBUNA ESSENTIALS
                    </span>
                  </motion.div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Subpage Header (For /shop, /collection, /about) */}
        {page !== 'home' && (
          <section className="relative overflow-hidden border-b border-[#EAE2D6] px-5 pt-32 pb-14 sm:px-8 sm:pt-36 sm:pb-18 lg:px-16">
            <div aria-hidden="true" className="pointer-events-none absolute -top-32 right-10 h-72 w-72 rounded-full bg-[#F5EDE2] blur-[100px]" />
            <div className="relative mx-auto max-w-7xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#96785D]">
                HEBBUNA STORE · {page === 'about' ? 'CERITA KAMI' : page === 'shop' ? 'KATALOG PRODUK' : 'PILIHAN KOLEKSI'}
              </p>
              <h1 className="mt-3 font-serif text-3xl font-normal leading-tight text-[#24201D] sm:text-5xl">
                {page === 'about' ? (
                  <>Nyaman jadi <span className="italic text-[#96785D]">dirimu sendiri.</span></>
                ) : page === 'shop' ? (
                  <>Temukan siluet yang <span className="italic text-[#96785D]">kamu sukai.</span></>
                ) : (
                  <>Warna dan gaya <span className="italic text-[#96785D]">untuk harimu.</span></>
                )}
              </h1>
              <p className="mt-3 max-w-lg text-xs leading-relaxed text-[#736A63] sm:text-sm">
                {page === 'about'
                  ? 'Cerita di balik kurasi modest wear HEBBUNA yang menemani langkah-langkah nyata.'
                  : page === 'shop'
                  ? 'Katalog lengkap pilihan hijab dan pakaian modest dengan material terpilih.'
                  : 'Rangkaian nuansa lembut yang kami pilih untuk menemani keseharianmu.'}
              </p>
            </div>
          </section>
        )}

        {/* Clean Product Catalog (Anti-Template: NO BOXES/CARDS, clean 3:4 standing on background) */}
        {(page === 'home' || page === 'shop' || page === 'collection') && (
          <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24" id="koleksi">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-[#EAE2D6] pb-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#96785D]">
                  01 · {page === 'home' ? (hasBestSellerMarks ? 'PRODUK TERPOPULER' : 'PILIHAN HEBBUNA') : 'SELURUH KOLEKSI'}
                </p>
                <h2 className="mt-2 font-serif text-2xl font-normal text-[#24201D] sm:text-4xl">
                  {page === 'home' ? (
                    <>Paling disukai untuk <span className="italic text-[#96785D]">hari-harimu.</span></>
                  ) : (
                    <>Koleksi Busana <span className="italic text-[#96785D]">Kontemporer.</span></>
                  )}
                </h2>
              </div>
              <Link href="/shop" className="group inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#96785D] hover:text-[#24201D] transition-colors">
                <span>{page === 'home' ? 'Semua Produk' : 'Katalog Penuh'}</span>
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.5} />
              </Link>
            </div>

            {/* Filter Bar & Search */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter kategori">
                {categories.map((item) => (
                  <button
                    key={item}
                    className={`rounded-full px-3.5 py-1 text-xs transition-all ${
                      category === item
                        ? 'border border-[#96785D] bg-[#F5EDE2] font-semibold text-[#24201D]'
                        : 'border border-[#EAE2D6] bg-white text-[#736A63] hover:border-[#96785D]/50 hover:text-[#24201D]'
                    }`}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              {/* Debounced Search */}
              <div className="relative flex items-center">
                <Search className="absolute left-3 h-3.5 w-3.5 text-[#736A63]" strokeWidth={1.5} />
                <input
                  id="catalog-search-input"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Cari hijab, bahan, warna…"
                  className="h-8 w-full rounded-full border border-[#EAE2D6] bg-white pl-8 pr-3 text-xs text-[#24201D] placeholder-[#736A63]/60 outline-none focus:border-[#96785D] sm:w-56"
                />
                {searchInput && (
                  <button onClick={() => setSearchInput('')} className="absolute right-2.5 text-[#736A63] hover:text-[#24201D]">
                    <X className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </div>

            {catalogState === 'error' && (
              <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">{catalogError}</p>
            )}

            {/* Clean Anti-Template Product Grid */}
            <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-4" id="produk">
              {(page === 'home' ? bestSellerProducts : visibleProducts).map((product, index) => {
                const variant = selectedVariant(product)
                const colors = [...new Map(product.variants.filter((item) => item.color).map((item) => [item.color!, item])).values()]

                return (
                  <article key={product.id} className="group relative flex flex-col">
                    {/* 3:4 Clean Image Frame (Rounded-xl, zero card box, directly standing on #FCFBF8) */}
                    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-[#EFE7DC]">
                      <button
                        onClick={() => void openProduct(product)}
                        className="h-full w-full cursor-pointer overflow-hidden border-0 p-0 text-left"
                        aria-label={`Lihat detail ${product.name}`}
                      >
                        <ProductImage src={product.imageUrl} alt={product.name} priority={index < 4 && page === 'home'} />
                      </button>

                      {/* Wishlist Button floating cleanly */}
                      <button
                        onClick={() => void toggleWishlist(product)}
                        className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/90 bg-white/80 text-[#4A433E] shadow-sm backdrop-blur-md transition-transform active:scale-90 hover:bg-white"
                        aria-label={wishlistIds.includes(product.id) ? `Hapus ${product.name} dari wishlist` : `Simpan ${product.name} ke wishlist`}
                      >
                        <Heart className={`h-4 w-4 ${wishlistIds.includes(product.id) ? 'fill-[#96785D] text-[#96785D]' : ''}`} strokeWidth={1.5} />
                      </button>

                      {/* Quick Add floating on bottom */}
                      <button
                        onClick={() => addToCart(product)}
                        disabled={!variant?.available}
                        className="absolute bottom-2.5 inset-x-2.5 flex h-9 items-center justify-center gap-1.5 rounded-lg border border-white/90 bg-white/85 text-xs font-medium text-[#24201D] shadow-sm backdrop-blur-md transition-all hover:bg-white active:scale-95 disabled:opacity-40"
                      >
                        <ShoppingBag className="h-3.5 w-3.5 text-[#96785D]" strokeWidth={1.5} />
                        <span>{variant?.available ? 'Tambah ke Tas' : 'Habis'}</span>
                      </button>

                      {product.label && (
                        <span className="absolute left-2.5 top-2.5 rounded-md border border-white/80 bg-white/85 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#96785D] backdrop-blur-md">
                          {product.label}
                        </span>
                      )}
                    </div>

                    {/* Left Aligned Text (Plus Jakarta Sans) */}
                    <div className="mt-3 flex flex-col items-start gap-1">
                      <button
                        onClick={() => void openProduct(product)}
                        className="text-left font-sans text-xs sm:text-sm font-medium text-[#24201D] transition-colors hover:text-[#96785D] truncate w-full"
                      >
                        {product.name}
                      </button>

                      <div className="flex w-full items-center justify-between">
                        <span className="font-sans text-xs font-semibold text-[#96785D]">
                          {money(product.price)}
                        </span>

                        {/* Swatches */}
                        {colors.length > 0 && (
                          <div className="flex items-center gap-1">
                            {colors.slice(0, 4).map((c, cIdx) => (
                              <button
                                key={c.id}
                                className={`h-2.5 w-2.5 rounded-full border transition-transform ${
                                  variant?.id === c.id ? 'scale-125 border-[#24201D]' : 'border-black/10'
                                }`}
                                style={{ backgroundColor: getColorHex(c.color ?? '', cIdx) }}
                                aria-label={`Pilih warna ${c.color}`}
                                onClick={() => setSelectedVariants((cur) => ({ ...cur, [product.id]: c.id }))}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            {visibleProducts.length === 0 && (
              <p className="mt-12 text-center text-xs text-[#736A63]">Tidak ada produk yang cocok dengan pencarian.</p>
            )}

            {(page === 'shop' || page === 'collection') && canLoadMore && (
              <div className="mt-14 flex justify-center">
                <button
                  className="rounded-full border border-[#EAE2D6] bg-white px-7 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#24201D] shadow-sm transition-all hover:border-[#96785D] active:scale-95"
                  onClick={() => void loadMoreProducts()}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Memuat Produk…' : 'Muat Lebih Banyak'}
                </button>
              </div>
            )}
          </section>
        )}

        {/* New Arrivals Section on Home */}
        {page === 'home' && (
          <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24 border-t border-[#EAE2D6]" id="new-arrival">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-[#EAE2D6] pb-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#96785D]">
                  02 · TERBARU BULAN INI
                </p>
                <h2 className="mt-2 font-serif text-2xl font-normal text-[#24201D] sm:text-4xl">
                  New <span className="italic text-[#96785D]">Arrivals.</span>
                </h2>
              </div>
              <Link href="/shop" className="group inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#96785D] hover:text-[#24201D] transition-colors">
                <span>Lihat Semua</span>
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.5} />
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-4">
              {products.slice(0, 4).map((product) => (
                <article key={`arrival-${product.id}`} className="group relative flex flex-col">
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-[#EFE7DC]">
                    <button
                      onClick={() => void openProduct(product)}
                      className="h-full w-full cursor-pointer overflow-hidden border-0 p-0 text-left"
                      aria-label={`Lihat detail ${product.name}`}
                    >
                      <ProductImage src={product.imageUrl} alt={product.name} />
                    </button>
                    <span className="absolute left-2.5 top-2.5 rounded-md border border-white/80 bg-white/85 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#96785D] backdrop-blur-md">
                      NEW
                    </span>
                  </div>

                  <div className="mt-3 flex flex-col items-start gap-1">
                    <button
                      onClick={() => void openProduct(product)}
                      className="text-left font-sans text-xs sm:text-sm font-medium text-[#24201D] transition-colors hover:text-[#96785D] truncate w-full"
                    >
                      {product.name}
                    </button>
                    <span className="font-sans text-xs font-semibold text-[#96785D]">{money(product.price)}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Story Section for /about */}
        {page === 'about' && (
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
            <section className="grid overflow-hidden rounded-2xl border border-[#EAE2D6] bg-white lg:grid-cols-2" id="cerita">
              <div className="relative min-h-[360px] lg:min-h-[480px]">
                <Image
                  src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1100&q=85"
                  alt="Inspirasi gaya hijab HEBBUNA"
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#96785D]">
                  CERITA HEBBUNA
                </p>
                <h2 className="mt-3 font-serif text-3xl font-normal leading-tight text-[#24201D] sm:text-4xl">
                  Dibuat untuk hari-hari yang <span className="italic text-[#96785D]">nyata.</span>
                </h2>
                <p className="mt-4 text-xs leading-relaxed text-[#736A63] sm:text-sm">
                  Kami percaya bahwa keanggunan sejati bermula dari kenyamanan. HEBBUNA mengkurasi material bertekstur lembut dan palet warna bumi yang hangat untuk melengkapi ritme aktivitasmu dari pagi hingga petang.
                </p>
                <div className="mt-6">
                  <Link href="/shop" className="group inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#96785D] hover:text-[#24201D] transition-colors">
                    <span>Mulai Menjelajah</span>
                    <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.5} />
                  </Link>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Floating Notice / Toast with Apple Liquid Glass */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={liquidSpring}
            className={`fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-full px-5 py-2.5 text-xs font-medium text-[#24201D] ${LIQUID_GLASS}`}
            role="status"
          >
            {notice}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
