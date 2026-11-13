'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  Banknote,
  CheckCircle2,
  Clock,
  MessageCircle,
  Package,
  RefreshCw,
  Truck,
} from 'lucide-react'

type AdminClient = SupabaseClient

type OrderItem = {
  quantity: number
  price_at_purchase: number
  product_variants: {
    color: string | null
    size: string | null
    products: { name: string } | null
  } | null
}

type OnlineOrder = {
  id: string
  customer_name: string | null
  total_amount: number
  status: string
  created_at: string
  order_items: OrderItem[]
}

type Delivery = {
  order_id: string
  recipient_name: string
  phone: string
  address_line: string
  city: string
  province: string
  postal_code: string
  delivery_note: string | null
  subtotal_amount: number
  shipping_amount: number
  shipping_courier: string | null
  tracking_code: string | null
}

type TransferAccount = {
  bank_name: string
  account_number: string
  account_holder: string
}

type CatalogProduct = {
  product_id: string
  product_name: string
  category_name: string | null
  measurements: Record<string, string> | null
}

type Props = {
  client: AdminClient
  onClose?: () => void
  money: (amount: number) => string
  fullPage?: boolean
}

const measurementFields = [
  ['lingkar_dada', 'Lingkar Dada (cm)'],
  ['lingkar_pinggang', 'Lingkar Pinggang (cm)'],
  ['lingkar_pinggul', 'Lingkar Pinggul (cm)'],
  ['panjang_baju', 'Panjang Baju (cm)'],
  ['panjang_lengan', 'Panjang Lengan (cm)'],
  ['lebar_bahu', 'Lebar Bahu (cm)'],
  ['lebar_hijab', 'Lebar Hijab (cm)'],
  ['panjang_hijab', 'Panjang Hijab (cm)'],
] as const

const labelStatus: Record<string, { label: string; badge: string }> = {
  menunggu_pembayaran: { label: 'Menunggu Ongkir', badge: 'bg-[#F5EDE2] text-[#96785D] border-[#EAE2D6]' },
  menunggu_transfer: { label: 'Menunggu Transfer', badge: 'bg-amber-50 text-amber-800 border-amber-200' },
  diproses: { label: 'Siap Dikemas', badge: 'bg-sky-50 text-sky-800 border-sky-200' },
  dikirim: { label: 'Dalam Pengiriman', badge: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  selesai: { label: 'Pesanan Selesai', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  dibatalkan: { label: 'Dibatalkan', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
}

export function AdminPanel({ client, onClose, money, fullPage = false }: Props) {
  const [orders, setOrders] = useState<OnlineOrder[]>([])
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [measurements, setMeasurements] = useState<Record<string, string>>({})
  const [deliveries, setDeliveries] = useState<Record<string, Delivery>>({})
  const [account, setAccount] = useState<TransferAccount>({
    bank_name: '',
    account_number: '',
    account_holder: '',
  })
  const [shippingAmounts, setShippingAmounts] = useState<Record<string, string>>({})
  const [couriers, setCouriers] = useState<Record<string, string>>({})
  const [trackingCodes, setTrackingCodes] = useState<Record<string, string>>({})

  const [loading, setLoading] = useState(true)
  const [busyTarget, setBusyTarget] = useState<string | null>(null)
  const [measurementMsg, setMeasurementMsg] = useState('')
  const [accountMsg, setAccountMsg] = useState('')
  const [orderMsg, setOrderMsg] = useState('')

  const selectedProduct = catalogProducts.find(
    (product) => product.product_id === selectedProductId
  )

  const loadProducts = useCallback(
    async (keepSelectedId?: string) => {
      const { data, error } = await client.rpc('daftar_produk_online')
      if (error) {
        setMeasurementMsg(`Data produk belum bisa dimuat: ${error.message}`)
        return
      }

      const nextProducts = (data ?? []) as CatalogProduct[]
      setCatalogProducts(nextProducts)

      const targetId =
        keepSelectedId && nextProducts.some((p) => p.product_id === keepSelectedId)
          ? keepSelectedId
          : (nextProducts[0]?.product_id ?? '')

      setSelectedProductId(targetId)
      const targetProduct = nextProducts.find((p) => p.product_id === targetId)
      setMeasurements(targetProduct?.measurements ?? {})
    },
    [client]
  )

  const loadData = useCallback(
    async (resetNotice = false) => {
      if (resetNotice) {
        setLoading(true)
        setOrderMsg('')
      }

      const { data: orderData, error: orderError } = await client
        .from('orders')
        .select(
          'id,customer_name,total_amount,status,created_at,order_items(quantity,price_at_purchase,product_variants(color,size,products(name)))'
        )
        .eq('order_source', 'online')
        .order('created_at', { ascending: false })
        .limit(100)

      if (orderError) {
        setOrderMsg(`Pesanan belum bisa dimuat: ${orderError.message}`)
        setOrders([])
        setLoading(false)
        return
      }

      const nextOrders = (orderData ?? []) as unknown as OnlineOrder[]
      setOrders(nextOrders)

      if (nextOrders.length > 0) {
        const { data: detailData, error: detailError } = await client
          .from('online_order_details')
          .select(
            'order_id,recipient_name,phone,address_line,city,province,postal_code,delivery_note,subtotal_amount,shipping_amount,shipping_courier,tracking_code'
          )
          .in('order_id', nextOrders.map((order) => order.id))

        if (detailError) {
          setOrderMsg(`Alamat pesanan belum bisa dimuat: ${detailError.message}`)
        }

        setDeliveries(
          Object.fromEntries(
            ((detailData ?? []) as unknown as Delivery[]).map((d) => [d.order_id, d])
          )
        )
      } else {
        setDeliveries({})
      }

      const { data: accountData } = await client
        .from('store_payment_settings')
        .select('bank_name,account_number,account_holder')
        .eq('id', 1)
        .maybeSingle()

      if (accountData) {
        setAccount(accountData as TransferAccount)
      }

      setLoading(false)
    },
    [client]
  )

  useEffect(() => {
    void loadData(false)
    void loadProducts()
  }, [loadData, loadProducts])

  useEffect(() => {
    if (fullPage || !onClose) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fullPage, onClose])

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busyTarget) return
    setBusyTarget('account')
    setAccountMsg('')

    const { error } = await client.rpc('admin_simpan_rekening_transfer', {
      p_bank_name: account.bank_name.trim(),
      p_account_number: account.account_number.trim(),
      p_account_holder: account.account_holder.trim(),
    })

    setAccountMsg(
      error ? `Rekening belum tersimpan: ${error.message}` : 'Info rekening transfer tersimpan.'
    )
    setBusyTarget(null)
  }

  async function saveMeasurements(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busyTarget || !selectedProductId) return

    const cleaned = Object.fromEntries(
      Object.entries(measurements)
        .map(([key, value]) => [key, String(value ?? '').trim()])
        .filter(([, value]) => value !== '')
    )

    setBusyTarget('measurements')
    setMeasurementMsg('')

    const { error } = await client.rpc('admin_simpan_ukuran_produk', {
      p_product_id: selectedProductId,
      p_measurements: cleaned,
    })

    if (error) {
      setMeasurementMsg(`Ukuran belum tersimpan: ${error.message}`)
    } else {
      setMeasurementMsg('Keterangan ukuran tersimpan dan langsung tampil di toko.')
      await loadProducts(selectedProductId)
    }

    setBusyTarget(null)
  }

  async function runAction(order: OnlineOrder, action: string) {
    if (busyTarget) return

    const delivery = deliveries[order.id]
    const rawShipping = shippingAmounts[order.id] ?? String(delivery?.shipping_amount ?? 0)
    const parsedShipping = Number(rawShipping)

    if (action === 'set_ongkir' && (!Number.isFinite(parsedShipping) || parsedShipping < 0)) {
      setOrderMsg('Nominal ongkir harus berupa angka 0 atau lebih.')
      return
    }

    const courierValue = (couriers[order.id] ?? delivery?.shipping_courier ?? '').trim()
    const trackingValue = (trackingCodes[order.id] ?? delivery?.tracking_code ?? '').trim()

    if (action === 'kirim' && !courierValue) {
      setOrderMsg('Isi nama kurir terlebih dahulu sebelum menandai dikirim.')
      return
    }

    if (action === 'batalkan' && !window.confirm('Batalkan pesanan ini dan kembalikan stoknya?')) {
      return
    }

    setBusyTarget(order.id)
    setOrderMsg('')

    const { error } = await client.rpc('admin_kelola_pesanan_online', {
      p_order_id: order.id,
      p_action: action,
      p_shipping_amount: action === 'set_ongkir' ? parsedShipping : null,
      p_courier: action === 'kirim' ? courierValue : null,
      p_tracking_code: action === 'kirim' ? trackingValue : null,
    })

    if (error) {
      setOrderMsg(`Aksi belum berhasil: ${error.message}`)
    } else {
      setOrderMsg('Status pesanan berhasil diperbarui.')
      await loadData(false)
    }

    setBusyTarget(null)
  }

  // Summary Metrics
  const pendingPayment = orders.filter((o) => o.status === 'menunggu_pembayaran').length
  const pendingTransfer = orders.filter((o) => o.status === 'menunggu_transfer').length
  const inProcess = orders.filter((o) => o.status === 'diproses').length
  const shipped = orders.filter((o) => o.status === 'dikirim').length

  return (
    <div className={fullPage ? 'w-full' : 'fixed inset-0 z-50 overflow-y-auto bg-black/25 p-4 backdrop-blur-sm'}>
      <div className="flex flex-col gap-8">
        {/* Statistical Summary Cards */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-2xl border border-[#EAE2D6] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-[#736A63]">
              <span className="text-[11px] uppercase tracking-wider font-medium">Perlu Ongkir</span>
              <Clock className="h-4 w-4 text-[#96785D]" strokeWidth={1.5} />
            </div>
            <p className="mt-2 text-2xl font-semibold text-[#24201D]">{pendingPayment}</p>
          </div>

          <div className="rounded-2xl border border-[#EAE2D6] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-[#736A63]">
              <span className="text-[11px] uppercase tracking-wider font-medium">Cek Transfer</span>
              <Banknote className="h-4 w-4 text-[#96785D]" strokeWidth={1.5} />
            </div>
            <p className="mt-2 text-2xl font-semibold text-[#24201D]">{pendingTransfer}</p>
          </div>

          <div className="rounded-2xl border border-[#EAE2D6] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-[#736A63]">
              <span className="text-[11px] uppercase tracking-wider font-medium">Perlu Kemas</span>
              <Package className="h-4 w-4 text-[#96785D]" strokeWidth={1.5} />
            </div>
            <p className="mt-2 text-2xl font-semibold text-[#24201D]">{inProcess}</p>
          </div>

          <div className="rounded-2xl border border-[#EAE2D6] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-[#736A63]">
              <span className="text-[11px] uppercase tracking-wider font-medium">Dalam Kirim</span>
              <Truck className="h-4 w-4 text-[#96785D]" strokeWidth={1.5} />
            </div>
            <p className="mt-2 text-2xl font-semibold text-[#24201D]">{shipped}</p>
          </div>
        </section>

        {/* Section 1: Orders Management (Stacked Cards on Mobile, Modern Grid/Table on Desktop) */}
        <section className="rounded-2xl border border-[#EAE2D6] bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#EAE2D6] pb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#96785D]">
                PESANAN ONLINE MASUK
              </p>
              <h2 className="mt-1 font-serif text-2xl font-normal text-[#24201D]">
                Daftar Pesanan Toko ({orders.length})
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                void loadData(true)
                void loadProducts(selectedProductId)
              }}
              disabled={loading}
              className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full border border-[#EAE2D6] bg-[#FCFBF8] px-3.5 py-1.5 text-xs font-medium text-[#736A63] transition-colors hover:border-[#96785D] hover:text-[#24201D]"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#96785D] ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
              <span>Muat Ulang</span>
            </button>
          </div>

          {orderMsg && (
            <p className="mt-4 rounded-xl border border-[#EAE2D6] bg-[#F5EDE2] p-3 text-xs text-[#24201D]" role="status">
              {orderMsg}
            </p>
          )}

          {loading ? (
            <p className="mt-8 text-center text-xs text-[#736A63]">Memuat data pesanan…</p>
          ) : orders.length === 0 ? (
            <p className="mt-8 text-center text-xs text-[#736A63]">Belum ada pesanan online.</p>
          ) : (
            <div className="mt-6 flex flex-col gap-4">
              {orders.map((order) => {
                const delivery = deliveries[order.id]
                const isOrderBusy = busyTarget === order.id
                const st = labelStatus[order.status] ?? { label: order.status, badge: 'border-[#EAE2D6] bg-gray-50 text-gray-700' }
                const phoneClean = (delivery?.phone ?? '').replace(/\D/g, '')
                const waLink = phoneClean ? `https://wa.me/${phoneClean.startsWith('0') ? '62' + phoneClean.slice(1) : phoneClean}` : null

                return (
                  <article
                    key={order.id}
                    className="flex flex-col gap-4 rounded-2xl border border-[#EAE2D6] bg-[#FCFBF8] p-4 sm:p-5 text-xs transition-shadow hover:shadow-sm"
                  >
                    {/* Header info */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAE2D6] pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-[#24201D]">#{order.id.slice(0, 8)}</span>
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${st.badge}`}>
                          {st.label}
                        </span>
                      </div>
                      <time className="text-[11px] text-[#736A63]">
                        {new Date(order.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                      </time>
                    </div>

                    {/* Customer & Items in Mobile-Friendly Stacked Layout */}
                    <div className="grid gap-4 md:grid-cols-12">
                      {/* Customer Info */}
                      <div className="md:col-span-5 flex flex-col gap-1">
                        <strong className="text-sm font-semibold text-[#24201D]">
                          {delivery?.recipient_name ?? order.customer_name ?? 'Pelanggan'}
                        </strong>
                        {delivery?.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-[#736A63]">
                            <span>{delivery.phone}</span>
                            {waLink && (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-full border border-[#EAE2D6] bg-white px-2 py-0.5 text-[10px] text-emerald-700 hover:bg-emerald-50"
                              >
                                <MessageCircle className="h-2.5 w-2.5" strokeWidth={1.5} />
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </div>
                        )}
                        <p className="mt-1 text-[11px] leading-relaxed text-[#736A63]">
                          {delivery
                            ? `${delivery.address_line}, ${delivery.city}, ${delivery.province} ${delivery.postal_code}`
                            : 'Alamat belum diisi'}
                        </p>
                        {delivery?.delivery_note && (
                          <p className="text-[10px] text-[#96785D] italic">Catatan: {delivery.delivery_note}</p>
                        )}
                      </div>

                      {/* Items */}
                      <div className="md:col-span-7 flex flex-col justify-between border-t border-[#EAE2D6] pt-3 md:border-t-0 md:border-l md:pl-5 md:pt-0">
                        <ul className="flex flex-col gap-1.5">
                          {(order.order_items ?? []).map((item, idx) => (
                            <li key={`${order.id}-${idx}`} className="flex justify-between items-center text-xs">
                              <span className="text-[#24201D]">
                                {item.product_variants?.products?.name ?? 'Produk'} ·{' '}
                                <span className="text-[#736A63]">
                                  {[item.product_variants?.color, item.product_variants?.size].filter(Boolean).join(' / ') || 'Varian'}
                                </span>
                              </span>
                              <b className="font-medium text-[#24201D]">
                                {item.quantity} × {money(Number(item.price_at_purchase) || 0)}
                              </b>
                            </li>
                          ))}
                        </ul>

                        <div className="mt-3 flex items-center justify-between border-t border-[#EAE2D6] pt-2 text-xs">
                          <span className="text-[#736A63]">
                            Subtotal {money(Number(delivery?.subtotal_amount ?? order.total_amount) || 0)} · Ongkir {money(Number(delivery?.shipping_amount ?? 0))}
                          </span>
                          <span className="text-sm font-semibold text-[#24201D]">
                            Total: {money(Number(order.total_amount) || 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Order Action Buttons */}
                    {(order.status === 'menunggu_pembayaran' || order.status === 'menunggu_transfer') && (
                      <div className="flex flex-wrap items-center gap-2 border-t border-[#EAE2D6] pt-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-medium text-[#736A63]">Ongkir:</span>
                          <input
                            type="number"
                            min="0"
                            step="500"
                            placeholder="Rp"
                            value={shippingAmounts[order.id] ?? String(delivery?.shipping_amount ?? 0)}
                            onChange={(e) => setShippingAmounts((prev) => ({ ...prev, [order.id]: e.target.value }))}
                            className="h-8 w-28 rounded-lg border border-[#EAE2D6] bg-white px-2.5 text-xs text-[#24201D] outline-none"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => void runAction(order, 'set_ongkir')}
                          disabled={Boolean(busyTarget)}
                          className="rounded-full bg-[#24201D] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-black disabled:opacity-50"
                        >
                          {isOrderBusy ? 'Proses…' : 'Tetapkan Ongkir'}
                        </button>

                        {order.status === 'menunggu_transfer' && (
                          <button
                            type="button"
                            onClick={() => void runAction(order, 'konfirmasi_pembayaran')}
                            disabled={Boolean(busyTarget)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                            <span>Konfirmasi Transfer</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => void runAction(order, 'batalkan')}
                          disabled={Boolean(busyTarget)}
                          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50 ml-auto"
                        >
                          Batalkan
                        </button>
                      </div>
                    )}

                    {order.status === 'diproses' && (
                      <div className="flex flex-wrap items-center gap-2 border-t border-[#EAE2D6] pt-3">
                        <input
                          placeholder="Kurir (JNE, J&T, SiCepat)"
                          value={couriers[order.id] ?? delivery?.shipping_courier ?? ''}
                          onChange={(e) => setCouriers((prev) => ({ ...prev, [order.id]: e.target.value }))}
                          className="h-8 rounded-lg border border-[#EAE2D6] bg-white px-2.5 text-xs text-[#24201D] outline-none"
                        />
                        <input
                          placeholder="Nomor Resi Pengiriman"
                          value={trackingCodes[order.id] ?? delivery?.tracking_code ?? ''}
                          onChange={(e) => setTrackingCodes((prev) => ({ ...prev, [order.id]: e.target.value }))}
                          className="h-8 rounded-lg border border-[#EAE2D6] bg-white px-2.5 text-xs text-[#24201D] outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => void runAction(order, 'kirim')}
                          disabled={Boolean(busyTarget)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#24201D] px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-black disabled:opacity-50"
                        >
                          <span>{isOrderBusy ? 'Menyimpan…' : 'Tandai Dikirim'}</span>
                          <Truck className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    )}

                    {order.status === 'dikirim' && (
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EAE2D6] pt-3 text-xs">
                        <span className="text-[#736A63]">
                          Kurir: <b className="text-[#24201D]">{delivery?.shipping_courier ?? '-'}</b> · Resi: <b className="font-mono text-[#24201D]">{delivery?.tracking_code ?? '-'}</b>
                        </span>
                        <button
                          type="button"
                          onClick={() => void runAction(order, 'selesai')}
                          disabled={Boolean(busyTarget)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                          <span>Tandai Selesai</span>
                        </button>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {/* Section 2: Product Measurements Management */}
        <section className="rounded-2xl border border-[#EAE2D6] bg-white p-5 sm:p-6 shadow-sm">
          <div className="border-b border-[#EAE2D6] pb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#96785D]">
              KATALOG & PENGUKURAN
            </p>
            <h2 className="mt-1 font-serif text-2xl font-normal text-[#24201D]">
              Ukuran & Rincian Produk
            </h2>
            <p className="mt-1 text-xs text-[#736A63]">
              Keterangan ukuran ini akan langsung muncul di halaman detail produk pada website.
            </p>
          </div>

          <form onSubmit={saveMeasurements} className="mt-5 flex flex-col gap-4 text-xs">
            <label className="flex flex-col gap-1.5 font-medium text-[#24201D]">
              Pilih Produk
              <select
                value={selectedProductId}
                onChange={(e) => {
                  const id = e.target.value
                  setSelectedProductId(id)
                  setMeasurementMsg('')
                  setMeasurements(catalogProducts.find((p) => p.product_id === id)?.measurements ?? {})
                }}
                className="h-10 rounded-xl border border-[#EAE2D6] bg-white px-3 text-xs text-[#24201D] outline-none"
              >
                <option value="">{catalogProducts.length === 0 ? 'Belum ada produk' : 'Pilih produk untuk diatur ukurannya'}</option>
                {catalogProducts.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.product_name} {p.category_name ? `· ${p.category_name}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {measurementFields.map(([key, label]) => (
                <label key={key} className="flex flex-col gap-1 text-[#24201D]">
                  <span className="text-[11px] text-[#736A63]">{label}</span>
                  <input
                    inputMode="decimal"
                    placeholder="Contoh: 110"
                    value={measurements[key] ?? ''}
                    onChange={(e) => setMeasurements((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="h-9 rounded-xl border border-[#EAE2D6] bg-white px-2.5 text-xs text-[#24201D] outline-none focus:border-[#96785D]"
                  />
                </label>
              ))}
            </div>

            <label className="flex flex-col gap-1 text-[#24201D]">
              <span className="text-[11px] text-[#736A63]">Catatan Ukuran Tambahan</span>
              <textarea
                rows={2}
                placeholder="Contoh: toleransi jahitan 1-2 cm"
                value={measurements.catatan ?? ''}
                onChange={(e) => setMeasurements((prev) => ({ ...prev, catatan: e.target.value }))}
                className="rounded-xl border border-[#EAE2D6] bg-white px-3 py-2 text-xs text-[#24201D] outline-none focus:border-[#96785D]"
              />
            </label>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={Boolean(busyTarget) || !selectedProduct}
                className="rounded-full bg-[#24201D] px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-black disabled:opacity-40"
              >
                {busyTarget === 'measurements' ? 'Menyimpan…' : 'Simpan Keterangan Ukuran'}
              </button>
              {measurementMsg && (
                <span className="text-xs text-[#96785D]" role="status">{measurementMsg}</span>
              )}
            </div>
          </form>
        </section>

        {/* Section 3: Transfer Payment Account Settings */}
        <section className="rounded-2xl border border-[#EAE2D6] bg-white p-5 sm:p-6 shadow-sm">
          <div className="border-b border-[#EAE2D6] pb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#96785D]">
              PENGATURAN PEMBAYARAN TOKO
            </p>
            <h2 className="mt-1 font-serif text-2xl font-normal text-[#24201D]">
              Rekening Transfer Manual
            </h2>
            <p className="mt-1 text-xs text-[#736A63]">
              Informasi rekening ini digunakan sebagai panduan pembayaran resmi pelanggan setelah penetapan ongkir.
            </p>
          </div>

          <form onSubmit={saveAccount} className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
            <label className="flex flex-col gap-1 text-[#24201D]">
              <span className="text-[11px] text-[#736A63]">Nama Bank</span>
              <input
                value={account.bank_name}
                onChange={(e) => setAccount((prev) => ({ ...prev, bank_name: e.target.value }))}
                placeholder="BCA, Mandiri, BNI"
                required
                className="h-9 rounded-xl border border-[#EAE2D6] bg-white px-2.5 text-xs text-[#24201D] outline-none focus:border-[#96785D]"
              />
            </label>
            <label className="flex flex-col gap-1 text-[#24201D]">
              <span className="text-[11px] text-[#736A63]">Nomor Rekening</span>
              <input
                value={account.account_number}
                onChange={(e) => setAccount((prev) => ({ ...prev, account_number: e.target.value }))}
                placeholder="Contoh: 1234567890"
                inputMode="numeric"
                required
                className="h-9 rounded-xl border border-[#EAE2D6] bg-white px-2.5 text-xs text-[#24201D] outline-none focus:border-[#96785D]"
              />
            </label>
            <label className="flex flex-col gap-1 text-[#24201D]">
              <span className="text-[11px] text-[#736A63]">Atas Nama Pemilik</span>
              <input
                value={account.account_holder}
                onChange={(e) => setAccount((prev) => ({ ...prev, account_holder: e.target.value }))}
                placeholder="Contoh: Hebbuna Store"
                required
                className="h-9 rounded-xl border border-[#EAE2D6] bg-white px-2.5 text-xs text-[#24201D] outline-none focus:border-[#96785D]"
              />
            </label>

            <div className="sm:col-span-3 flex items-center gap-3 mt-2">
              <button
                type="submit"
                disabled={Boolean(busyTarget)}
                className="rounded-full bg-[#24201D] px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-black disabled:opacity-40"
              >
                {busyTarget === 'account' ? 'Menyimpan…' : 'Simpan Info Rekening'}
              </button>
              {accountMsg && (
                <span className="text-xs text-[#96785D]" role="status">{accountMsg}</span>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
