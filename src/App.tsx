'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import type { User } from '@supabase/supabase-js'
import { supabase, supabaseConfigured } from './lib/supabase'
import { mapCatalog, type CatalogRow, type Product, type Variant } from './lib/catalog'
import { StorefrontNavbar } from './components/StorefrontNavbar'

const LoginModal = dynamic(() => import('./components/LoginModal').then((module) => module.LoginModal), { ssr: false })
const CartDrawer = dynamic(() => import('./components/CartDrawer').then((module) => module.CartDrawer), { ssr: false })

const sampleProducts: Product[] = [
  { id: 'sample-1', name: 'Pashmina Aira', category: 'Pashmina', price: 89000, imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=760&q=85', description: 'Pashmina ringan untuk menemani hari-hari kamu.', material: 'Voal lembut', measurements: {}, label: 'Favorit', variants: [{ id: 'sample-1a', size: 'All size', color: 'Peach Bloom', available: true }, { id: 'sample-1b', size: 'All size', color: 'Butter', available: true }, { id: 'sample-1c', size: 'All size', color: 'Moss', available: true }] },
  { id: 'sample-2', name: 'Segi Empat Nala', category: 'Segi Empat', price: 75000, imageUrl: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&w=760&q=85', description: 'Segi empat nyaman dengan warna yang mudah dipadu.', material: 'Voal airy', measurements: {}, label: 'Baru', variants: [{ id: 'sample-2a', size: 'All size', color: 'Cream', available: true }, { id: 'sample-2b', size: 'All size', color: 'Rose', available: true }] },
  { id: 'sample-3', name: 'Pashmina Safa', category: 'Pashmina', price: 95000, imageUrl: 'https://images.unsplash.com/photo-1584184924103-e310d9dc82fc?auto=format&fit=crop&w=760&q=85', description: 'Tekstur halus dan mudah dibentuk.', material: 'Chiffon', measurements: {}, variants: [{ id: 'sample-3a', size: 'All size', color: 'Lilac', available: true }, { id: 'sample-3b', size: 'All size', color: 'Sand', available: true }] },
  { id: 'sample-4', name: 'Inner Sakinah', category: 'Inner', price: 39000, imageUrl: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=760&q=85', description: 'Inner simpel untuk dipakai seharian.', material: 'Cotton stretch', measurements: {}, variants: [{ id: 'sample-4a', size: 'All size', color: 'Almond', available: true }, { id: 'sample-4b', size: 'All size', color: 'Charcoal', available: true }] },
]

const money = (amount: number) => `Rp${amount.toLocaleString('id-ID')}`
type SavedAddress = { id: string; label: string; recipient_name: string; phone: string; address_line: string; city: string; province: string; postal_code: string; delivery_note: string | null; is_default: boolean }
const swatchPalette = ['#eeb2a2', '#f2d98a', '#a6ad8f', '#a96670', '#b6a2c3', '#9caebe']
const colorHex: Record<string, string> = {
  peach: '#eeb2a2', butter: '#f2d98a', moss: '#a6ad8f', berry: '#a96670',
  cream: '#eee0c9', rose: '#dfaaa7', sky: '#9caebe', lilac: '#b6a2c3',
  sand: '#c7ae91', cocoa: '#856b60', almond: '#d8bea4', charcoal: '#514b4b',
  blush: '#d6a8a4', hitam: '#393438', putih: '#f2ece2', navy: '#515d76',
}
function getColorHex(name: string, index: number) {
  const match = Object.entries(colorHex).find(([key]) => name.toLowerCase().includes(key))
  return match?.[1] ?? swatchPalette[index % swatchPalette.length]
}
function measurementUnit(key: string) {
  return key === 'catatan' ? '' : ' cm'
}
function BagIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l1 13H4L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></svg>
}

type StorefrontPage = 'home' | 'shop' | 'collection' | 'about'

function App({ initialProducts, initialCatalogError, page = 'home' }: { initialProducts: Product[] | null; initialCatalogError: string | null; page?: StorefrontPage }) {
  const [products, setProducts] = useState<Product[]>(initialProducts ?? (supabaseConfigured ? [] : sampleProducts))
  const catalogState: 'demo' | 'live' | 'error' = initialProducts !== null ? 'live' : initialCatalogError ? 'error' : 'demo'
  const catalogError = initialCatalogError ?? ''
  const catalogPageSize = page === 'shop' || page === 'collection' ? 12 : 8
  const [catalogOffset, setCatalogOffset] = useState(initialProducts?.length ?? 0)
  const [canLoadMore, setCanLoadMore] = useState((initialProducts?.length ?? 0) >= catalogPageSize)
  const [loadingMore, setLoadingMore] = useState(false)
  const [category, setCategory] = useState('Semua')
  const [searchOpen, setSearchOpen] = useState(false)
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
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)
  const [checkoutAfterLogin, setCheckoutAfterLogin] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const categories = useMemo(() => ['Semua', ...new Set(products.map((product) => product.category).filter(Boolean))], [products])
  const visibleProducts = useMemo(() => products.filter((product) => (category === 'Semua' || product.category === category) && (!searchTerm.trim() || `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(searchTerm.toLowerCase()))), [category, products, searchTerm])
  const bestSellerProducts = useMemo(() => {
    const marked = visibleProducts.filter((product) => product.isBestSeller)
    return (marked.length ? marked : visibleProducts).slice(0, 4)
  }, [visibleProducts])
  const hasBestSellerMarks = bestSellerProducts.some((product) => product.isBestSeller)
  const subtotal = cart.reduce((sum, item) => sum + item.product.price, 0)
  const selectedAddress = savedAddresses.find((address) => address.id === selectedAddressId)

  useEffect(() => {
    const savedCart = window.localStorage.getItem('hebbuna-store-cart') ?? window.localStorage.getItem('ruangrona-cart')
    window.setTimeout(() => {
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart) as { product: Product; variant: Variant }[])
        } catch {
          window.localStorage.removeItem('hebbuna-store-cart')
        }
      }
      setCartReady(true)
    }, 0)
  }, [])

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

    const checkRestocks = async () => {
      const { data } = await client.from('restock_notifications').select('id,variant_id')
        .eq('user_id', user.id).not('notified_at', 'is', null).is('seen_at', null)
      if (!current || !data?.length) return
      const ids = data.map((item) => item.id)
      await client.from('restock_notifications').update({ seen_at: new Date().toISOString() }).in('id', ids).eq('user_id', user.id)
      if (current) {
        setRestockIds((existing) => existing.filter((variantId) => !data.some((item) => item.variant_id === variantId)))
        showNotice('Ada produk favoritmu yang kembali tersedia. Cek wishlist kamu.')
      }
    }
    const initial = window.setTimeout(() => void checkRestocks(), 0)
    const timer = window.setInterval(() => void checkRestocks(), 25_000)
    return () => { current = false; window.clearTimeout(initial); window.clearInterval(timer) }
  }, [user])

  useEffect(() => {
    const client = supabase
    if (!client || !user || !checkoutOpen) return undefined
    let current = true
    const initial = window.setTimeout(() => {
      void client.from('customer_addresses').select('*').eq('user_id', user.id)
        .order('is_default', { ascending: false }).order('created_at', { ascending: false })
        .then(({ data }) => {
          if (!current) return
          const addresses = (data ?? []) as SavedAddress[]
          setSavedAddresses(addresses)
          const main = addresses.find((address) => address.is_default) ?? addresses[0]
          if (main) setSelectedAddressId((selected) => selected || main.id)
        })
    }, 0)
    return () => { current = false; window.clearTimeout(initial) }
  }, [checkoutOpen, user])

  useEffect(() => {
    if (!activeProduct) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setActiveProduct(null) }
    window.addEventListener('keydown', closeOnEscape)
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', closeOnEscape) }
  }, [activeProduct])

  useEffect(() => {
    if (!cartReady) return
    window.localStorage.setItem('hebbuna-store-cart', JSON.stringify(cart))
  }, [cart, cartReady])

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
      if (!signedInUser) { setRole(null); setWishlistIds([]); setRestockIds([]) }
      else window.setTimeout(() => {
        void client.from('user_profiles').select('role,is_active').eq('id', signedInUser.id).maybeSingle().then(({ data: profile }) => {
          if (!current) return
          if (profile?.is_active === false) {
            void client.auth.signOut()
            return
          }
          setRole(profile?.role ?? null)
        })
      }, 0)
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

  function openLogin(forCheckout = false) {
    if (!supabase) {
      showNotice('Sambungkan URL dan publishable key Supabase di .env.local dulu.')
      return
    }
    setCheckoutAfterLogin(forCheckout)
    setLoginError('')
    setLoginOpen(true)
  }

  async function signInWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || loginBusy) return
    setLoginBusy(true)
    setLoginError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail.trim(), password: loginPassword })
    if (error) {
      setLoginError(error.message.toLowerCase().includes('invalid login credentials') ? 'Email atau kata sandi belum cocok.' : `Login belum berhasil: ${error.message}`)
      setLoginBusy(false)
      return
    }
    setLoginPassword('')
    setLoginOpen(false)
    const { data: profile } = await supabase.from('user_profiles').select('role,is_active').eq('id', data.user.id).maybeSingle()
    if (profile?.is_active === false) {
      await supabase.auth.signOut()
      setLoginError('Akun kasir ini sedang nonaktif. Hubungi admin toko.')
      setLoginOpen(true)
      setLoginBusy(false)
      return
    }
    if (profile?.role === 'admin') {
      window.location.assign('/admin')
      return
    }
    setAccountOpen(!checkoutAfterLogin)
    if (checkoutAfterLogin) setCheckoutOpen(true)
    setCheckoutAfterLogin(false)
    setLoginBusy(false)
  }

  async function signOut() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) showNotice('Belum berhasil keluar. Coba lagi.')
    else {
      setAccountOpen(false)
      showNotice('Kamu sudah keluar dari akun.')
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
    if (error) showNotice('Produk berikutnya belum bisa dimuat. Coba lagi sebentar.')
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
    showNotice(`${product.name} · ${variant.color ?? variant.size ?? 'Varian'} masuk ke tas`)
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
    if (!user) { openLogin(); return }
    if (!supabase) return
    const saved = wishlistIds.includes(product.id)
    const result = saved
      ? await supabase.from('customer_wishlist').delete().eq('user_id', user.id).eq('product_id', product.id)
      : await supabase.from('customer_wishlist').insert({ user_id: user.id, product_id: product.id })
    if (result.error) showNotice(`Wishlist belum tersimpan: ${result.error.message}`)
    else {
      setWishlistIds((current) => saved ? current.filter((id) => id !== product.id) : [...current, product.id])
      showNotice(saved ? `${product.name} dihapus dari wishlist.` : `${product.name} masuk ke wishlist.`)
    }
  }

  async function requestRestock(product: Product, variant: Variant) {
    if (!user) { openLogin(); return }
    if (!supabase) return
    const { error } = await supabase.from('restock_notifications').upsert({ user_id: user.id, variant_id: variant.id, notified_at: null, seen_at: null }, { onConflict: 'user_id,variant_id' })
    if (error) showNotice(`Permintaan belum tersimpan: ${error.message}`)
    else {
      setRestockIds((current) => current.includes(variant.id) ? current : [...current, variant.id])
      showNotice(`Siap, kami kabari saat ${product.name} tersedia lagi.`)
    }
  }

  function beginCheckout() {
    if (!supabase || catalogState !== 'live') {
      showNotice('Checkout aktif setelah katalog Supabase siap.')
      return
    }
    if (!user) {
      openLogin(true)
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
          p_address_id: null, p_label: 'Alamat checkout',
          p_recipient_name: String(form.get('recipient_name') ?? '').trim(), p_phone: String(form.get('phone') ?? '').trim(),
          p_address_line: String(form.get('address_line') ?? '').trim(), p_city: String(form.get('city') ?? '').trim(),
          p_province: String(form.get('province') ?? '').trim(), p_postal_code: String(form.get('postal_code') ?? '').trim(),
          p_delivery_note: String(form.get('delivery_note') ?? '').trim(), p_is_default: false,
        })
      }
      setCart([])
      setCheckoutOpen(false)
      setCartOpen(false)
      showNotice(`Pesanan ${String(data).slice(0, 8)} dibuat. Ongkir dikonfirmasi sebelum transfer.`)
    } catch {
      showNotice('Koneksi bermasalah. Pesanan belum bisa dibuat, coba lagi sebentar.')
    } finally {
      setSubmittingOrder(false)
    }
  }

  const heroImage = 'https://images.unsplash.com/photo-1584184924103-e310d9dc82fc?auto=format&fit=crop&w=1900&q=85'

  return (
    <>
      <StorefrontNavbar page={page} user={user} role={role} cartCount={cart.length} wishlistCount={wishlistIds.length} accountOpen={accountOpen} onSearch={() => { if (page === 'about') { window.location.assign('/shop'); return } setSearchOpen(true); document.getElementById('koleksi')?.scrollIntoView({ behavior: 'smooth' }) }} onWishlist={() => user ? window.location.assign('/akun') : openLogin()} onCart={() => setCartOpen(true)} onLogin={() => openLogin()} onAccount={() => setAccountOpen(!accountOpen)} onSignOut={() => void signOut()} />

      {loginOpen && <div className="admin-overlay auth-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !loginBusy) setLoginOpen(false) }}><section className="auth-card" role="dialog" aria-modal="true" aria-labelledby="login-title"><button className="close-drawer auth-close" onClick={() => setLoginOpen(false)} aria-label="Tutup login">×</button><p className="eyebrow dark"><span>HEBBUNA STORE</span> AKUN TOKO</p><h2 id="login-title">Masuk dengan akun kasir</h2><p className="auth-intro">Pakai email dan kata sandi yang sama dengan akun Supabase di kasir.</p><form className="checkout-form" onSubmit={signInWithPassword}><label><span>Email</span><input type="email" autoComplete="username" required value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} placeholder="nama@email.com" /></label><label><span>Kata sandi</span><input type="password" autoComplete="current-password" required value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} placeholder="Kata sandi akun kasir" /></label>{loginError && <p className="auth-error" role="alert">{loginError}</p>}<button className="primary-button dark-button checkout-submit" type="submit" disabled={loginBusy}>{loginBusy ? 'Memeriksa akun…' : 'Masuk'} <span>↗</span></button></form></section></div>}

      {activeProduct && <div className="product-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveProduct(null) }}><section className="product-dialog" role="dialog" aria-modal="true" aria-label={`Detail ${activeProduct.name}`}><button className="product-dialog-close" onClick={() => setActiveProduct(null)} aria-label="Tutup detail produk">×</button><div className="product-dialog-image">{activeProduct.imageUrl ? <Image src={activeProduct.imageUrl} alt={activeProduct.name} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" /> : <div className="image-empty">{activeProduct.category}</div>}</div><div className="product-dialog-copy"><p className="eyebrow dark"><span>{activeProduct.category}</span> HEBBUNA DAILY WEAR</p>{activeProduct.label && <span className="product-dialog-label">{activeProduct.label}</span>}<h2>{activeProduct.name}</h2><p className="product-dialog-price">{money(activeProduct.price)}</p>{productDetailsLoading && <p className="product-detail-loading">Mengambil detail produk…</p>}<p className="product-dialog-description">{activeProduct.description || 'Pilihan HEBBUNA yang dibuat untuk menemani hari-harimu dengan nyaman.'}</p>{activeProduct.material && <p className="product-dialog-material"><span>Bahan</span>{activeProduct.material}</p>}<div className="product-dialog-variants"><span>Pilih warna / varian</span><div>{activeProduct.variants.map((variant, index) => <button key={variant.id} className={selectedVariant(activeProduct)?.id === variant.id ? 'selected' : ''} onClick={() => setSelectedVariants((current) => ({ ...current, [activeProduct.id]: variant.id }))} disabled={!variant.available} title={variant.available ? variant.color ?? variant.size ?? 'Varian' : 'Stok habis'}><i style={{ backgroundColor: getColorHex(variant.color ?? variant.size ?? '', index) }} />{variant.color ?? variant.size ?? `Varian ${index + 1}`}{!variant.available && <small>Habis</small>}</button>)}</div></div>{Object.entries(activeProduct.measurements ?? {}).filter(([, value]) => value.trim()).length > 0 && <dl className="product-dialog-measurements">{Object.entries(activeProduct.measurements).filter(([, value]) => value.trim()).map(([key, value]) => <div key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd>{value}{measurementUnit(key)}</dd></div>)}</dl>}<p className="product-dialog-stock">{selectedVariant(activeProduct)?.available ? 'Stok tersedia · siap menemani harimu' : 'Varian ini sedang habis'}</p><div className="product-dialog-actions"><button className="primary-button dark-button buy-now-button" onClick={() => buyNow(activeProduct)} disabled={!selectedVariant(activeProduct)?.available}>Beli sekarang <span>↗</span></button><button className="add-to-cart-button" onClick={() => addToCart(activeProduct)} disabled={!selectedVariant(activeProduct)?.available}><BagIcon /><span>Masukkan ke keranjang</span></button></div><button className="product-dialog-wish" onClick={() => void toggleWishlist(activeProduct)}>{wishlistIds.includes(activeProduct.id) ? '♥ Tersimpan di wishlist' : '♡ Simpan ke wishlist'}</button>{selectedVariant(activeProduct) && !selectedVariant(activeProduct)?.available && <button className="restock-request-button" onClick={() => void requestRestock(activeProduct, selectedVariant(activeProduct)!)}>{restockIds.includes(selectedVariant(activeProduct)!.id) ? '✓ Kabar restock aktif' : 'Kabari aku saat tersedia'}</button>}</div></section></div>}

      <main className="store-main">
        {page === 'home' && <section className="editorial-hero" id="top">
          <Image className="editorial-hero-image" src={heroImage} alt="Koleksi hijab HEBBUNA dengan gaya modest yang anggun" fill priority sizes="100vw" />
          <div className="editorial-hero-shade" />
          <div className="editorial-hero-copy"><p className="editorial-kicker"><span /> KOLEKSI TERBARU · HEBBUNA</p><h1>Anggun dalam<br /><em>kesederhanaan.</em></h1><p>Busana muslimah yang nyaman, dibuat untuk menemani hari-harimu dengan percaya diri.</p><a href="#koleksi" className="editorial-cta">Jelajahi koleksi <span>↗</span></a><div className="editorial-trust"><span className="trust-monogram">H.</span><span><strong>Nyaman jadi dirimu</strong><small>Gaya modest untuk hari yang nyata</small></span></div></div>
          <div className="editorial-hero-tag">HEBBUNA <span>·</span> DAILY MODEST WEAR</div>
          <a className="editorial-scroll" href="#koleksi"><span>Scroll untuk melihat</span><i>↓</i></a>
          <div className="editorial-note"><span>✳</span><div><strong>Dirancang untuk keseharian</strong><small>Nyaman · Anggun · Versatile</small></div><span>↗</span></div>
        </section>}

        {page !== 'home' && <section className={`subpage-hero subpage-${page}`}><p className="eyebrow dark"><span>HEBBUNA STORE</span> {page === 'about' ? 'CERITA KAMI' : page === 'shop' ? 'BELANJA HEBBUNA' : 'PILIHAN KOLEKSI'}</p><h1>{page === 'about' ? <>Nyaman jadi<br /><em>dirimu sendiri.</em></> : page === 'shop' ? <>Temukan yang<br /><em>kamu suka.</em></> : <>Warna dan gaya<br /><em>untuk harimu.</em></>}</h1><p>{page === 'about' ? 'Tentang HEBBUNA dan cerita di balik modest wear yang menemani hari-hari nyata.' : page === 'shop' ? 'Jelajahi seluruh produk HEBBUNA, pilih warna favorit, dan temukan kenyamananmu.' : 'Rangkaian warna dan gaya yang kami pilih untuk menemani keseharianmu.'}</p></section>}

        {(page === 'home' || page === 'shop' || page === 'collection') && <section className={`collection section-wrap page-${page}`} id="koleksi">
          <div className="section-heading"><div><p className="eyebrow dark"><span>01</span> {page === 'home' ? hasBestSellerMarks ? 'BEST SELLER HEBBUNA' : 'PILIHAN HEBBUNA' : page === 'shop' ? 'BELANJA SEMUA PRODUK' : 'KOLEKSI HEBBUNA'}</p><h2>{page === 'home' ? <>Paling disukai,<br className="mobile-break" /> untuk <em>hari-harimu.</em></> : page === 'shop' ? <>Temukan gaya<br className="mobile-break" /> yang terasa <em>kamu.</em></> : <>Jelajahi pilihan<br className="mobile-break" /> yang <em>bercerita.</em></>}</h2></div><a href="/shop" className="underlined-link">{page === 'home' ? 'Lihat semua produk' : 'Belanja semua produk'} <span>↗</span></a></div>
          <div className="collection-intro"><p>{page === 'home' ? hasBestSellerMarks ? 'Favorit pelanggan HEBBUNA.' : 'Pilihan produk HEBBUNA untuk memulai.' : page === 'shop' ? 'Seluruh koleksi tersedia dalam satu tempat.' : 'Pilih kategori yang paling dekat dengan gayamu.'}</p>{page !== 'home' && <div className="category-list" role="group" aria-label="Filter kategori produk">{categories.map((item) => <button key={item} className={category === item ? 'category-chip active' : 'category-chip'} onClick={() => setCategory(item)}>{item}</button>)}</div>}</div>
          {searchOpen && <label className="product-search"><span>⌕</span><input autoFocus value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Cari hijab, gamis, warna…" aria-label="Cari produk" /><button onClick={() => { setSearchOpen(false); setSearchTerm('') }} aria-label="Tutup pencarian">×</button></label>}
          {catalogState === 'error' && <p className="catalog-message error">{catalogError}</p>}
          {catalogState === 'demo' && <p className="catalog-message">Katalog contoh · sambungkan Supabase untuk memuat produk kasir.</p>}
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-12 lg:grid-cols-4" id="produk">{(page === 'home' ? bestSellerProducts : visibleProducts).map((product, index) => {
            const variant = selectedVariant(product)
            const colors = [...new Map(product.variants.filter((item) => item.color).map((item) => [item.color!, item])).values()]
            return <article className="product-card-editorial" key={product.id}>
              <div className="product-media">
                <button className="product-image-trigger group" onClick={() => void openProduct(product)} aria-label={`Lihat detail ${product.name}`}>
                  <span className="product-index">{String(index + 1).padStart(2, '0')}</span>
                  {product.imageUrl ? <Image src={product.imageUrl} alt={product.name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="transition-transform duration-300 ease-out group-hover:scale-105" /> : <div className="image-empty"><span>{product.category}<br />Foto menyusul</span></div>}
                  <span className="product-view-hint">Lihat detail <i>↗</i></span>
                </button>
                {(product.isBestSeller || product.label) && <span className="product-editorial-label">{product.isBestSeller ? 'Best seller' : product.label}</span>}
                <button className="product-wishlist-button" onClick={() => void toggleWishlist(product)} aria-label={wishlistIds.includes(product.id) ? `Hapus ${product.name} dari wishlist` : `Simpan ${product.name} ke wishlist`} title="Wishlist">{wishlistIds.includes(product.id) ? '♥' : '♡'}</button>
                <button className="product-quick-add" onClick={() => addToCart(product)} disabled={!variant?.available}>{variant?.available ? 'Masukkan ke tas' : 'Stok habis'} <span>{variant?.available ? '+' : '·'}</span></button>
              </div>
              <div className="product-editorial-meta"><div><h3>{product.name}</h3><p>{money(product.price)}</p></div><span>{variant?.color ?? variant?.size ?? 'Pilih varian'}</span></div>
              <div className="product-editorial-swatches" aria-label={`Warna ${product.name}`}>{colors.slice(0, 6).map((item, colorIndex) => <button key={item.id} className={variant?.id === item.id ? 'selected' : ''} style={{ backgroundColor: getColorHex(item.color ?? '', colorIndex) }} aria-label={`Pilih warna ${item.color}`} title={`${item.color}${item.available ? '' : ' · habis'}`} onClick={() => setSelectedVariants((current) => ({ ...current, [product.id]: item.id }))} />)}</div>
              {variant && !variant.available && <button className="restock-request-button" onClick={() => void requestRestock(product, variant)}>{restockIds.includes(variant.id) ? '✓ Kabar restock aktif' : '♧ Kabari aku saat tersedia'}</button>}
              <button className="product-detail-link" onClick={() => void openProduct(product)}>Lihat detail produk <span>↗</span></button>
            </article>
          })}</div>
          {catalogState === 'live' && (page === 'home' ? bestSellerProducts.length === 0 : products.length === 0) && <p className="catalog-message">Belum ada produk aktif di katalog.</p>}
          {(page === 'shop' || page === 'collection') && canLoadMore && <div className="all-products-link"><button className="primary-button dark-button active:scale-95 transition-transform duration-300 ease-out" onClick={() => void loadMoreProducts()} disabled={loadingMore}>{loadingMore ? 'Memuat produk…' : 'Muat produk lainnya'} <span>↓</span></button></div>}
          {page === 'home' && <div className="all-products-link"><a className="primary-button dark-button" href="/shop">Jelajahi semua produk <span>↗</span></a></div>}
        </section>}

        {page === 'home' && <section className="new-arrivals section-wrap" id="new-arrival"><div className="section-heading"><div><p className="eyebrow dark"><span>02</span> BARU DI HEBBUNA</p><h2>New <em>Arrival.</em></h2></div><a href="/shop" className="underlined-link">Jelajahi semua <span>↗</span></a></div><p className="new-arrivals-intro">Kenalan dengan pilihan warna dan gaya terbaru kami.</p><div className="new-arrival-grid">{products.slice(0, 8).map((product) => <article className="new-arrival-card group" key={`arrival-${product.id}`}><button className="new-arrival-image" onClick={() => void openProduct(product)} aria-label={`Lihat detail ${product.name}`}>{product.imageUrl ? <Image src={product.imageUrl} alt={product.name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="transition-transform duration-300 ease-out group-hover:scale-105" /> : <span className="image-empty">{product.category}</span>}<span className="new-arrival-badge">NEW</span></button><div className="new-arrival-meta"><div><span>{product.category}</span><h3>{product.name}</h3></div><b>{money(product.price)}</b></div></article>)}</div></section>}

        {page === 'about' && <><section className="story" id="cerita"><div className="story-image"><Image src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1100&q=85" alt="Inspirasi gaya hijab yang nyaman dari HEBBUNA" fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" /><span className="story-caption">HEBBUNA · NYAMAN JADI DIRIMU</span></div><div className="story-copy"><p className="eyebrow dark"><span>01</span> CERITA HEBBUNA</p><h2>Dibuat untuk<br />hari yang <em>nyata.</em></h2><p>Kami percaya gaya yang paling indah adalah gaya yang terasa nyaman. HEBBUNA memilih warna dan bahan untuk menemani langkahmu, dari pagi yang sibuk sampai waktu pulang.</p><a href="/shop" className="underlined-link">Kenali koleksi kami <span>↗</span></a><div className="story-doodle">H<span>.</span></div></div></section>

        <section className="promise-row"><div><span className="promise-number">01</span><h3>Nyaman sepanjang hari</h3><p>Ringan dipakai dari pagi sampai sore.</p></div><div><span className="promise-number">02</span><h3>Warna mudah dipadu</h3><p>Pilihan warna yang dekat dengan gayamu.</p></div><div><span className="promise-number">03</span><h3>Dikemas oleh kami</h3><p>Pesanan disiapkan dengan teliti.</p></div></section>

        <section className="newsletter"><div className="newsletter-spark">✳</div><p className="eyebrow dark"><span>03</span> SURAT DARI HEBBUNA</p><h2>Temukan warna<br />yang terasa <em>seperti rumah.</em></h2><p>Ikuti cerita, inspirasi gaya, dan kabar koleksi terbaru kami.</p><form onSubmit={(event) => { event.preventDefault(); showNotice('Makasih, kamu sudah masuk daftar kabar HEBBUNA!') }}><label className="visually-hidden" htmlFor="email">Alamat email</label><input id="email" type="email" placeholder="Alamat email kamu" required /><button type="submit">Ikuti kabar kami <span>↗</span></button></form></section></>}
      </main>
      <div className={cartOpen ? 'drawer-overlay open' : 'drawer-overlay'} onClick={() => { setCartOpen(false); setCheckoutOpen(false) }} />
      <aside className={cartOpen ? 'cart-drawer open' : 'cart-drawer'} aria-label="Tas belanja" aria-hidden={!cartOpen}>
        <div className="drawer-heading"><div><p className="eyebrow dark">HEBBUNA STORE</p><h2>{checkoutOpen ? 'Alamat kirim' : <>Tas belanja <span>({cart.length})</span></>}</h2></div><button className="close-drawer" onClick={() => { setCartOpen(false); setCheckoutOpen(false) }} aria-label="Tutup tas belanja">×</button></div>
        {checkoutOpen ? <div className="checkout-view">
          <button className="back-to-cart" onClick={() => setCheckoutOpen(false)}>← Kembali ke tas</button>
          <p className="checkout-intro">Isi alamat tujuan. Kami konfirmasi ongkir sebelum kamu transfer.</p>
          <form className="checkout-form" key={selectedAddressId} onSubmit={placeOnlineOrder}>
            {savedAddresses.length > 0 && <label>Alamat tersimpan<select value={selectedAddressId} onChange={(event) => setSelectedAddressId(event.target.value)}><option value="">Isi alamat baru</option>{savedAddresses.map((address) => <option key={address.id} value={address.id}>{address.label}{address.is_default ? ' · Utama' : ''}</option>)}</select></label>}
            <label>Nama penerima<input name="recipient_name" autoComplete="name" defaultValue={selectedAddress?.recipient_name ?? user?.user_metadata.full_name ?? ''} required maxLength={120} /></label>
            <label>Nomor WhatsApp<input name="phone" type="tel" autoComplete="tel" defaultValue={selectedAddress?.phone ?? ''} placeholder="08xxxxxxxxxx" required maxLength={30} /></label>
            <label>Alamat lengkap<textarea name="address_line" autoComplete="street-address" defaultValue={selectedAddress?.address_line ?? ''} placeholder="Nama jalan, nomor rumah, RT/RW, kecamatan" required maxLength={500} rows={3} /></label>
            <div className="address-pair"><label>Kota / kabupaten<input name="city" autoComplete="address-level2" defaultValue={selectedAddress?.city ?? ''} required maxLength={100} /></label><label>Provinsi<input name="province" autoComplete="address-level1" defaultValue={selectedAddress?.province ?? ''} required maxLength={100} /></label></div>
            <label>Kode pos<input name="postal_code" inputMode="numeric" autoComplete="postal-code" defaultValue={selectedAddress?.postal_code ?? ''} required maxLength={10} /></label>
            <label>Catatan kurir <span>(opsional)</span><textarea name="delivery_note" defaultValue={selectedAddress?.delivery_note ?? ''} placeholder="Patokan rumah atau pesan untuk kurir" maxLength={300} rows={2} /></label>
            {!selectedAddress && <label className="save-address-option"><input type="checkbox" name="save_address" /> Simpan alamat ini untuk checkout berikutnya</label>}
            <div className="checkout-total"><span>Subtotal produk</span><b>{money(subtotal)}</b></div>
            <p className="transfer-note">Pembayaran transfer manual. Ongkir dikonfirmasi setelah pesanan masuk, sebelum pembayaran.</p>
            <button className="primary-button dark-button checkout-submit" type="submit" disabled={submittingOrder}>{submittingOrder ? 'Menyimpan pesanan…' : 'Buat pesanan'} <span>↗</span></button>
          </form>
        </div> : cart.length === 0 ? <div className="empty-cart"><span>♡</span><p>Tasmu masih kosong.</p><button onClick={() => setCartOpen(false)}>Yuk, cari rona favoritmu</button></div> : <><div className="cart-items">{cart.map((item, index) => <div className="cart-item" key={`${item.product.id}-${item.variant.id}-${index}`}>{item.product.imageUrl ? <Image src={item.product.imageUrl} alt="" width={60} height={72} sizes="60px" /> : <div className="cart-item-empty"/>}<div><h3>{item.product.name}</h3><p>{item.variant.color}{item.variant.size ? ` · ${item.variant.size}` : ''}</p><b>{money(item.product.price)}</b><button onClick={() => removeFromCart(index)}>Hapus</button></div></div>)}</div><div className="cart-summary"><div><span>Subtotal</span><b>{money(subtotal)}</b></div><p>Ongkir dikonfirmasi sebelum transfer manual.</p><button className="primary-button dark-button" onClick={beginCheckout}>Lanjut ke checkout <span>↗</span></button></div></>}
      </aside>
      {notice && <div className="toast" role="status">{notice}</div>}
    </>
  )
}

export default App
