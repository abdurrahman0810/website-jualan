'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import type { SupabaseClient } from '@supabase/supabase-js'

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
  ['lingkar_dada', 'Lingkar dada (cm)'],
  ['lingkar_pinggang', 'Lingkar pinggang (cm)'],
  ['lingkar_pinggul', 'Lingkar pinggul (cm)'],
  ['panjang_baju', 'Panjang baju (cm)'],
  ['panjang_lengan', 'Panjang lengan (cm)'],
  ['lebar_bahu', 'Lebar bahu (cm)'],
  ['lebar_hijab', 'Lebar hijab (cm)'],
  ['panjang_hijab', 'Panjang hijab (cm)'],
] as const

const labelStatus: Record<string, string> = {
  menunggu_pembayaran: 'Menunggu ongkir',
  menunggu_transfer: 'Menunggu transfer',
  diproses: 'Pembayaran dikonfirmasi',
  dikirim: 'Sedang dikirim',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
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

  // Pesan feedback dipisah per bagian agar langsung terlihat di dekat tombol yang diklik
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
          .in(
            'order_id',
            nextOrders.map((order) => order.id)
          )

        if (detailError) {
          setOrderMsg(`Alamat pesanan belum bisa dimuat: ${detailError.message}`)
        }

        setDeliveries(
          Object.fromEntries(
            ((detailData ?? []) as unknown as Delivery[]).map((delivery) => [
              delivery.order_id,
              delivery,
            ])
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

  // Tutup modal dengan tombol Escape jika bukan mode fullPage
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
      setMeasurementMsg('Keterangan ukuran tersimpan dan tampil di toko.')
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

    if (
      action === 'batalkan' &&
      !window.confirm('Batalkan pesanan ini dan kembalikan stoknya?')
    ) {
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

  return (
    <div
      className={fullPage ? 'admin-page-shell' : 'admin-overlay'}
      role={fullPage ? undefined : 'dialog'}
      aria-modal={fullPage ? undefined : true}
      aria-label="Panel admin"
      onClick={(event) => {
        if (!fullPage && onClose && event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section className={`admin-panel${fullPage ? ' admin-panel-page' : ''}`}>
        <header className="admin-panel-header">
          <div>
            <p className="eyebrow dark">
              <span>ADMIN</span> HEBBUNA STORE
            </p>
            <h2>Kelola toko</h2>
            <p>Produk, pesanan, rekening transfer, dan aktivitas kasir.</p>
          </div>
          {fullPage ? (
            <Link className="admin-back-link" href="/">
              Kembali ke toko ↗
            </Link>
          ) : (
            <button
              type="button"
              className="close-drawer"
              onClick={onClose}
              aria-label="Tutup panel admin"
            >
              ×
            </button>
          )}
        </header>

        {/* Bagian 1: Ukuran Produk */}
        <section className="admin-account-card">
          <div>
            <h3>Ukuran dan detail produk</h3>
            <p>Isi ukuran yang relevan. Keterangan ini muncul di kartu produk pada website.</p>
          </div>
          <form className="admin-measurement-form" onSubmit={saveMeasurements}>
            <label className="wide">
              Pilih produk
              <select
                value={selectedProductId}
                onChange={(event) => {
                  const id = event.target.value
                  setSelectedProductId(id)
                  setMeasurementMsg('')
                  setMeasurements(
                    catalogProducts.find((product) => product.product_id === id)?.measurements ?? {}
                  )
                }}
              >
                <option value="">
                  {catalogProducts.length === 0 ? 'Belum ada produk' : 'Pilih produk'}
                </option>
                {catalogProducts.map((product) => (
                  <option key={product.product_id} value={product.product_id}>
                    {product.product_name}
                    {product.category_name ? ` · ${product.category_name}` : ''}
                  </option>
                ))}
              </select>
            </label>

            {measurementFields.map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  inputMode="decimal"
                  placeholder="Contoh: 108"
                  value={measurements[key] ?? ''}
                  onChange={(event) =>
                    setMeasurements((old) => ({ ...old, [key]: event.target.value }))
                  }
                />
              </label>
            ))}

            <label className="wide">
              Catatan ukuran
              <textarea
                rows={2}
                placeholder="Contoh: ukuran diukur manual, toleransi 1–2 cm"
                value={measurements.catatan ?? ''}
                onChange={(event) =>
                  setMeasurements((old) => ({ ...old, catatan: event.target.value }))
                }
              />
            </label>

            <button
              type="submit"
              className="primary-button dark-button wide"
              disabled={Boolean(busyTarget) || !selectedProduct}
            >
              {busyTarget === 'measurements' ? 'Menyimpan…' : 'Simpan keterangan ukuran'}
            </button>
          </form>
          {measurementMsg && (
            <p className="admin-message" role="status">
              {measurementMsg}
            </p>
          )}
        </section>

        {/* Bagian 2: Rekening Transfer */}
        <section className="admin-account-card">
          <div>
            <h3>Rekening transfer</h3>
            <p>Info ini disiapkan untuk pelanggan setelah ongkir ditetapkan.</p>
          </div>
          <form className="admin-account-form" onSubmit={saveAccount}>
            <label>
              Nama bank
              <input
                value={account.bank_name}
                onChange={(event) =>
                  setAccount((old) => ({ ...old, bank_name: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Nomor rekening
              <input
                value={account.account_number}
                onChange={(event) =>
                  setAccount((old) => ({ ...old, account_number: event.target.value }))
                }
                inputMode="numeric"
                required
              />
            </label>
            <label>
              Nama pemilik
              <input
                value={account.account_holder}
                onChange={(event) =>
                  setAccount((old) => ({ ...old, account_holder: event.target.value }))
                }
                required
              />
            </label>
            <button
              type="submit"
              className="primary-button dark-button"
              disabled={Boolean(busyTarget)}
            >
              {busyTarget === 'account' ? 'Menyimpan…' : 'Simpan rekening'}
            </button>
          </form>
          {accountMsg && (
            <p className="admin-message" role="status">
              {accountMsg}
            </p>
          )}
        </section>

        {/* Bagian 3: Daftar Pesanan */}
        <div className="admin-list-heading">
          <div>
            <h3>Daftar pesanan</h3>
            <span>{orders.length} terbaru</span>
          </div>
          <button
            type="button"
            className="admin-refresh"
            onClick={() => {
              void loadData(true)
              void loadProducts(selectedProductId)
            }}
            disabled={loading}
          >
            Muat ulang ↻
          </button>
        </div>

        {orderMsg && (
          <p className="admin-message" role="status">
            {orderMsg}
          </p>
        )}

        {loading ? (
          <p className="admin-empty">Memuat pesanan…</p>
        ) : orders.length === 0 ? (
          <p className="admin-empty">Belum ada pesanan online.</p>
        ) : (
          <div className="admin-order-list">
            {orders.map((order) => {
              const delivery = deliveries[order.id]
              const isOrderBusy = busyTarget === order.id

              return (
                <article className="admin-order-card" key={order.id}>
                  <div className="admin-order-top">
                    <div>
                      <span className="admin-order-code">#{order.id.slice(0, 8)}</span>
                      <span className={`admin-status status-${order.status}`}>
                        {labelStatus[order.status] ?? order.status}
                      </span>
                    </div>
                    <time>
                      {new Date(order.created_at).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </time>
                  </div>

                  <div className="admin-order-columns">
                    <div>
                      <h4>{delivery?.recipient_name ?? order.customer_name ?? 'Pelanggan'}</h4>
                      <p>{delivery?.phone ?? 'Nomor belum tersedia'}</p>
                      <p>
                        {delivery
                          ? `${delivery.address_line}, ${delivery.city}, ${delivery.province} ${delivery.postal_code}`
                          : 'Alamat belum tersedia'}
                      </p>
                      {delivery?.delivery_note && (
                        <p className="admin-note">Catatan: {delivery.delivery_note}</p>
                      )}
                    </div>

                    <ul className="admin-order-items">
                      {(order.order_items ?? []).map((item, index) => (
                        <li key={`${order.id}-${index}`}>
                          <span>
                            {item.product_variants?.products?.name ?? 'Produk'} ·{' '}
                            {[item.product_variants?.color, item.product_variants?.size]
                              .filter(Boolean)
                              .join(' / ') || 'Varian'}
                          </span>
                          <b>
                            {item.quantity} × {money(Number(item.price_at_purchase) || 0)}
                          </b>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="admin-order-total">
                    <span>
                      Subtotal {money(Number(delivery?.subtotal_amount ?? order.total_amount) || 0)}
                    </span>
                    <span>Ongkir {money(Number(delivery?.shipping_amount ?? 0) || 0)}</span>
                    <strong>Total {money(Number(order.total_amount) || 0)}</strong>
                  </div>

                  {(order.status === 'menunggu_pembayaran' ||
                    order.status === 'menunggu_transfer') && (
                    <div className="admin-order-actions">
                      <label>
                        Ongkir
                        <input
                          type="number"
                          min="0"
                          step="500"
                          value={shippingAmounts[order.id] ?? String(delivery?.shipping_amount ?? 0)}
                          onChange={(event) =>
                            setShippingAmounts((old) => ({
                              ...old,
                              [order.id]: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => void runAction(order, 'set_ongkir')}
                        disabled={Boolean(busyTarget)}
                      >
                        {isOrderBusy ? 'Memproses…' : 'Tetapkan ongkir'}
                      </button>
                      {order.status === 'menunggu_transfer' && (
                        <button
                          type="button"
                          className="confirm-action"
                          onClick={() => void runAction(order, 'konfirmasi_pembayaran')}
                          disabled={Boolean(busyTarget)}
                        >
                          Konfirmasi transfer
                        </button>
                      )}
                      <button
                        type="button"
                        className="cancel-action"
                        onClick={() => void runAction(order, 'batalkan')}
                        disabled={Boolean(busyTarget)}
                      >
                        Batalkan
                      </button>
                    </div>
                  )}

                  {order.status === 'diproses' && (
                    <div className="admin-order-actions shipment-fields">
                      <label>
                        Kurir
                        <input
                          placeholder="JNE, J&T, dll."
                          value={couriers[order.id] ?? delivery?.shipping_courier ?? ''}
                          onChange={(event) =>
                            setCouriers((old) => ({ ...old, [order.id]: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        Nomor resi
                        <input
                          placeholder="Nomor resi"
                          value={trackingCodes[order.id] ?? delivery?.tracking_code ?? ''}
                          onChange={(event) =>
                            setTrackingCodes((old) => ({
                              ...old,
                              [order.id]: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => void runAction(order, 'kirim')}
                        disabled={Boolean(busyTarget)}
                      >
                        {isOrderBusy ? 'Memproses…' : 'Tandai dikirim'}
                      </button>
                    </div>
                  )}

                  {order.status === 'dikirim' && (
                    <div className="admin-order-actions">
                      <span>
                        {delivery?.shipping_courier}{' '}
                        {delivery?.tracking_code && `· ${delivery.tracking_code}`}
                      </span>
                      <button
                        type="button"
                        className="confirm-action"
                        onClick={() => void runAction(order, 'selesai')}
                        disabled={Boolean(busyTarget)}
                      >
                        {isOrderBusy ? 'Memproses…' : 'Tandai selesai'}
                      </button>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}