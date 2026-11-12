'use client'

import type { FormEvent } from 'react'
import Image from 'next/image'
import { AnimatePresence, m } from 'motion/react'
import type { Product, Variant } from '../lib/catalog'

export type CartEntry = { product: Product; variant: Variant }
export type CartAddress = { id: string; label: string; recipient_name: string; phone: string; address_line: string; city: string; province: string; postal_code: string; delivery_note: string | null; is_default: boolean }
type Props = {
  open: boolean
  checkoutOpen: boolean
  cart: CartEntry[]
  subtotal: number
  money: (amount: number) => string
  userName: string
  addresses: CartAddress[]
  selectedAddressId: string
  submitting: boolean
  onClose: () => void
  onCheckoutClose: () => void
  onCheckout: () => void
  onAddressChange: (id: string) => void
  onRemove: (index: number) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function CartDrawer({ open, checkoutOpen, cart, subtotal, money, userName, addresses, selectedAddressId, submitting, onClose, onCheckoutClose, onCheckout, onAddressChange, onRemove, onSubmit }: Props) {
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId)
  return <AnimatePresence>
    {open && <>
      <m.div className="drawer-overlay open" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <m.aside className="cart-drawer open" aria-label="Tas belanja" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: .24, ease: 'easeOut' }}>
        <div className="drawer-heading"><div><p className="eyebrow dark">HEBBUNA STORE</p><h2>{checkoutOpen ? 'Alamat kirim' : <>Tas belanja <span>({cart.length})</span></>}</h2></div><button className="close-drawer" onClick={onClose} aria-label="Tutup tas belanja">×</button></div>
        {checkoutOpen ? <div className="checkout-view">
          <button className="back-to-cart" onClick={onCheckoutClose}>← Kembali ke tas</button>
          <p className="checkout-intro">Isi alamat tujuan. Kami konfirmasi ongkir sebelum kamu transfer.</p>
          <form className="checkout-form" key={selectedAddressId} onSubmit={onSubmit}>
            {addresses.length > 0 && <label>Alamat tersimpan<select value={selectedAddressId} onChange={(event) => onAddressChange(event.target.value)}><option value="">Isi alamat baru</option>{addresses.map((address) => <option key={address.id} value={address.id}>{address.label}{address.is_default ? ' · Utama' : ''}</option>)}</select></label>}
            <label>Nama penerima<input name="recipient_name" autoComplete="name" defaultValue={selectedAddress?.recipient_name ?? userName} required maxLength={120} /></label>
            <label>Nomor WhatsApp<input name="phone" type="tel" autoComplete="tel" defaultValue={selectedAddress?.phone ?? ''} placeholder="08xxxxxxxxxx" required maxLength={30} /></label>
            <label>Alamat lengkap<textarea name="address_line" autoComplete="street-address" defaultValue={selectedAddress?.address_line ?? ''} placeholder="Nama jalan, nomor rumah, RT/RW, kecamatan" required maxLength={500} rows={3} /></label>
            <div className="address-pair"><label>Kota / kabupaten<input name="city" autoComplete="address-level2" defaultValue={selectedAddress?.city ?? ''} required maxLength={100} /></label><label>Provinsi<input name="province" autoComplete="address-level1" defaultValue={selectedAddress?.province ?? ''} required maxLength={100} /></label></div>
            <label>Kode pos<input name="postal_code" inputMode="numeric" autoComplete="postal-code" defaultValue={selectedAddress?.postal_code ?? ''} required maxLength={10} /></label>
            <label>Catatan kurir <span>(opsional)</span><textarea name="delivery_note" defaultValue={selectedAddress?.delivery_note ?? ''} placeholder="Patokan rumah atau pesan untuk kurir" maxLength={300} rows={2} /></label>
            {!selectedAddress && <label className="save-address-option"><input type="checkbox" name="save_address" /> Simpan alamat ini untuk checkout berikutnya</label>}
            <div className="checkout-total"><span>Subtotal produk</span><b>{money(subtotal)}</b></div>
            <p className="transfer-note">Pembayaran transfer manual. Ongkir dikonfirmasi setelah pesanan masuk, sebelum pembayaran.</p>
            <button className="primary-button dark-button checkout-submit active:scale-95 transition-transform duration-300 ease-out" type="submit" disabled={submitting}>{submitting ? 'Menyimpan pesanan…' : 'Buat pesanan'} <span>↗</span></button>
          </form>
        </div> : cart.length === 0 ? <div className="empty-cart"><span>♡</span><p>Tasmu masih kosong.</p><button onClick={onClose}>Yuk, cari rona favoritmu</button></div> : <><div className="cart-items">{cart.map((item, index) => <div className="cart-item" key={`${item.product.id}-${item.variant.id}-${index}`}>{item.product.imageUrl ? <Image src={item.product.imageUrl} alt="" width={60} height={72} sizes="60px" /> : <div className="cart-item-empty"/>}<div><h3>{item.product.name}</h3><p>{item.variant.color}{item.variant.size ? ` · ${item.variant.size}` : ''}</p><b>{money(item.product.price)}</b><button onClick={() => onRemove(index)}>Hapus</button></div></div>)}</div><div className="cart-summary"><div><span>Subtotal</span><b>{money(subtotal)}</b></div><p>Ongkir dikonfirmasi sebelum transfer manual.</p><button className="primary-button dark-button active:scale-95 transition-transform duration-300 ease-out" onClick={onCheckout}>Lanjut ke checkout <span>↗</span></button></div></>}
      </m.aside>
    </>}
  </AnimatePresence>
}
