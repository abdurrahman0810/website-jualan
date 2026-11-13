"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { ArrowLeft, Bell, Heart, MapPin, Package, User as UserIcon } from "lucide-react";
import { supabase } from "../lib/supabase";
import { mapCatalog, type CatalogRow, type Product } from "../lib/catalog";

type TabKey = "orders" | "addresses" | "wishlist" | "profile";

type Address = {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  address_line: string;
  city: string;
  province: string;
  postal_code: string;
  delivery_note: string | null;
  is_default: boolean;
};

type OrderItem = {
  product_name: string;
  color: string | null;
  size: string | null;
  quantity: number;
  price: number;
};

type Order = {
  order_id: string;
  total_amount: number;
  status: string;
  created_at: string;
  recipient_name: string | null;
  shipping_courier: string | null;
  tracking_code: string | null;
  items: OrderItem[];
};

type Restock = {
  id: string;
  variant_id: string;
  notified_at: string | null;
  seen_at: string | null;
};

type AddressForm = Omit<Address, "id"> & {
  id?: string;
};

const emptyAddress: AddressForm = {
  label: "",
  recipient_name: "",
  phone: "",
  address_line: "",
  city: "",
  province: "",
  postal_code: "",
  delivery_note: "",
  is_default: false,
};

const accountTabs: { key: TabKey; label: string; icon: typeof Package }[] = [
  { key: "orders", label: "Pesanan Saya", icon: Package },
  { key: "addresses", label: "Buku Alamat", icon: MapPin },
  { key: "wishlist", label: "Wishlist & Restock", icon: Heart },
  { key: "profile", label: "Profil Saya", icon: UserIcon },
];

const statusNames: Record<string, { label: string; badge: string }> = {
  menunggu_pembayaran: { label: "Menunggu Ongkir", badge: "bg-[#F5EDE2] text-[#96785D] border-[#EAE2D6]" },
  menunggu_transfer: { label: "Menunggu Transfer", badge: "bg-amber-50 text-amber-800 border-amber-200" },
  diproses: { label: "Sedang Dikemas", badge: "bg-sky-50 text-sky-800 border-sky-200" },
  dikirim: { label: "Dalam Pengiriman", badge: "bg-indigo-50 text-indigo-800 border-indigo-200" },
  selesai: { label: "Pesanan Selesai", badge: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  dibatalkan: { label: "Dibatalkan", badge: "bg-rose-50 text-rose-700 border-rose-200" },
};

function money(amount: number) {
  return `Rp${(Number(amount) || 0).toLocaleString("id-ID")}`;
}

export function CustomerAccount({ user }: { user: User }) {
  const [tab, setTab] = useState<TabKey>("orders");
  const [fullName, setFullName] = useState(
    (user.user_metadata?.full_name as string | undefined) ?? "",
  );
  const [phone, setPhone] = useState("");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressForm, setAddressForm] = useState<AddressForm>(emptyAddress);
  const [editingAddress, setEditingAddress] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [restocks, setRestocks] = useState<Restock[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const wishlist = useMemo(
    () => products.filter((product) => wishlistIds.includes(product.id)),
    [products, wishlistIds],
  );

  const variantLookup = useMemo(() => {
    const map = new Map<string, { productName: string; color: string | null }>();
    for (const product of products) {
      for (const variant of product.variants) {
        map.set(variant.id, {
          productName: product.name,
          color: variant.color ?? null,
        });
      }
    }
    return map;
  }, [products]);

  const fetchAccountData = useCallback(async () => {
    if (!supabase) return;

    const [
      profileResult,
      addressResult,
      wishlistResult,
      catalogResult,
      orderResult,
      restockResult,
    ] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("full_name,phone")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("customer_addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("customer_wishlist")
        .select("product_id")
        .eq("user_id", user.id),
      supabase.rpc("daftar_produk_online"),
      supabase.rpc("daftar_pesanan_saya"),
      supabase
        .from("restock_notifications")
        .select("id,variant_id,notified_at,seen_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    if (profileResult.data) {
      setFullName(profileResult.data.full_name ?? "");
      setPhone(profileResult.data.phone ?? "");
    }

    setAddresses((addressResult.data ?? []) as Address[]);
    setWishlistIds((wishlistResult.data ?? []).map((item) => item.product_id));
    setProducts(mapCatalog((catalogResult.data ?? []) as CatalogRow[]));
    setOrders((orderResult.data ?? []) as Order[]);
    setRestocks((restockResult.data ?? []) as Restock[]);

    const firstError =
      profileResult.error ??
      addressResult.error ??
      wishlistResult.error ??
      catalogResult.error ??
      orderResult.error ??
      restockResult.error;

    setMessage(firstError?.message ?? "");
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    void fetchAccountData();
  }, [fetchAccountData]);

  function handleTabChange(nextTab: TabKey) {
    setTab(nextTab);
    setEditingAddress(false);
    setMessage("");
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || busy) return;

    setBusy(true);
    const { error } = await supabase.rpc("simpan_profil_pelanggan", {
      p_full_name: fullName.trim(),
      p_phone: phone.trim(),
    });

    setMessage(error ? error.message : "Profil berhasil disimpan.");
    setBusy(false);
  }

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || busy) return;

    setBusy(true);
    const { error } = await supabase.rpc("simpan_alamat_pelanggan", {
      p_address_id: addressForm.id ?? null,
      p_label: addressForm.label.trim(),
      p_recipient_name: addressForm.recipient_name.trim(),
      p_phone: addressForm.phone.trim(),
      p_address_line: addressForm.address_line.trim(),
      p_city: addressForm.city.trim(),
      p_province: addressForm.province.trim(),
      p_postal_code: addressForm.postal_code.trim(),
      p_delivery_note: (addressForm.delivery_note ?? "").trim(),
      p_is_default: addressForm.is_default,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setAddressForm(emptyAddress);
      setEditingAddress(false);
      await fetchAccountData();
      setMessage("Alamat berhasil disimpan.");
    }

    setBusy(false);
  }

  async function deleteAddress(id: string) {
    if (!supabase || busy || !window.confirm("Hapus alamat ini?")) return;

    setBusy(true);
    const { error } = await supabase.rpc("hapus_alamat_pelanggan", {
      p_address_id: id,
    });

    if (error) {
      setMessage(error.message);
    } else {
      await fetchAccountData();
      setMessage("Alamat dihapus.");
    }

    setBusy(false);
  }

  async function removeWishlist(productId: string) {
    if (!supabase) return;

    const { error } = await supabase
      .from("customer_wishlist")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", productId);

    if (error) {
      setMessage(error.message);
    } else {
      setWishlistIds((current) => current.filter((id) => id !== productId));
    }
  }

  async function cancelRestock(id: string) {
    if (!supabase) return;

    const { error } = await supabase
      .from("restock_notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      setMessage(error.message);
    } else {
      setRestocks((current) => current.filter((item) => item.id !== id));
    }
  }

  const displayName = fullName.trim() || user.email?.split("@")[0] || "Pelanggan";

  return (
    <main className="min-h-screen bg-[#FCFBF8] text-[#24201D] px-4 py-8 sm:px-8 sm:py-12 lg:px-16">
      <div className="mx-auto max-w-5xl">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#EAE2D6] pb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-[#736A63] hover:text-[#24201D] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Kembali ke Beranda Toko</span>
          </Link>
          <span className="font-serif text-xl tracking-wide text-[#24201D]">
            Hebbuna<span className="text-[#96785D]">.</span>
          </span>
        </div>

        {/* Hero Greeting */}
        <header className="mt-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#96785D]">
            AKUN PELANGGAN
          </p>
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-normal text-[#24201D]">
            Hai, {displayName}.
          </h1>
          <p className="mt-1 text-xs text-[#736A63]">
            Riwayat pesanan, buku alamat, dan daftar busana favoritmu tersimpan rapi di sini.
          </p>
        </header>

        {/* Navigation Tabs */}
        <nav className="mt-8 flex flex-wrap gap-2 border-b border-[#EAE2D6] pb-4" aria-label="Menu akun">
          {accountTabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs transition-all ${
                  active
                    ? "bg-[#24201D] text-white font-semibold shadow-sm"
                    : "border border-[#EAE2D6] bg-white text-[#736A63] hover:border-[#96785D] hover:text-[#24201D]"
                }`}
                onClick={() => handleTabChange(item.key)}
              >
                <Icon className={`h-3.5 w-3.5 ${active ? "text-[#EFE7DC]" : "text-[#96785D]"}`} strokeWidth={1.5} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {message && (
          <p className="mt-4 rounded-xl border border-[#EAE2D6] bg-[#F5EDE2] p-3 text-xs text-[#24201D]" role="status">
            {message}
          </p>
        )}

        {loading ? (
          <p className="mt-10 text-center text-xs text-[#736A63]">Memuat data akun…</p>
        ) : (
          <section className="mt-6">
            {/* Tab 1: Orders */}
            {tab === "orders" && (
              <div>
                {orders.length === 0 ? (
                  <div className="rounded-2xl border border-[#EAE2D6] bg-white p-8 text-center text-xs text-[#736A63] shadow-sm">
                    <Package className="mx-auto h-8 w-8 text-[#96785D]/40" strokeWidth={1.5} />
                    <p className="mt-3 font-medium text-[#24201D]">Belum ada riwayat pesanan online.</p>
                    <Link href="/shop" className="mt-2 inline-block font-semibold text-[#96785D] hover:underline">
                      Mulai jelajahi koleksi kami →
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {orders.map((order) => {
                      const st = statusNames[order.status] ?? { label: order.status, badge: "border-[#EAE2D6] bg-gray-50 text-gray-700" };
                      return (
                        <article
                          key={order.order_id}
                          className="rounded-2xl border border-[#EAE2D6] bg-white p-4 sm:p-5 text-xs shadow-sm transition-shadow hover:shadow-md"
                        >
                          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAE2D6] pb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-[#24201D]">#{order.order_id.slice(0, 8)}</span>
                              <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${st.badge}`}>
                                {st.label}
                              </span>
                            </div>
                            <time className="text-[11px] text-[#736A63]">
                              {new Date(order.created_at).toLocaleDateString("id-ID", { dateStyle: "long" })}
                            </time>
                          </header>

                          <ul className="mt-3 flex flex-col gap-2">
                            {(order.items ?? []).map((item, idx) => (
                              <li key={`${order.order_id}-${idx}`} className="flex justify-between items-center text-xs">
                                <span className="text-[#24201D]">
                                  {item.product_name} ·{" "}
                                  <span className="text-[#736A63]">
                                    {[item.color, item.size].filter(Boolean).join(" / ") || "Varian"} × {item.quantity}
                                  </span>
                                </span>
                                <strong className="font-medium text-[#24201D]">{money(item.price * item.quantity)}</strong>
                              </li>
                            ))}
                          </ul>

                          <footer className="mt-4 flex flex-wrap items-center justify-between border-t border-[#EAE2D6] pt-3 text-xs">
                            <span className="text-sm font-semibold text-[#24201D]">Total: {money(order.total_amount)}</span>
                            {order.status === "dikirim" && (
                              <span className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] text-indigo-800">
                                Kurir: {order.shipping_courier || "-"} · Resi: {order.tracking_code || "-"}
                              </span>
                            )}
                            {order.status === "menunggu_transfer" && (
                              <span className="text-[11px] font-medium text-amber-700">
                                Menunggu konfirmasi transfer admin toko
                              </span>
                            )}
                          </footer>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Addresses */}
            {tab === "addresses" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-[#736A63]">Alamat Pengiriman</h2>
                  {!editingAddress && (
                    <button
                      type="button"
                      className="rounded-full bg-[#24201D] px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-black"
                      onClick={() => {
                        setAddressForm(emptyAddress);
                        setEditingAddress(true);
                      }}
                    >
                      + Tambah Alamat Baru
                    </button>
                  )}
                </div>

                {editingAddress && (
                  <form className="mb-6 rounded-2xl border border-[#EAE2D6] bg-white p-5 text-xs shadow-sm" onSubmit={saveAddress}>
                    <h3 className="font-serif text-lg text-[#24201D] mb-4">
                      {addressForm.id ? "Edit Alamat" : "Tambah Alamat Pengiriman Baru"}
                    </h3>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-1 font-medium text-[#24201D]">
                        Nama Label Alamat
                        <input
                          value={addressForm.label}
                          onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                          placeholder="Rumah, Kantor, Toko"
                          required
                          className="h-9 rounded-xl border border-[#EAE2D6] bg-[#FCFBF8] px-3 text-xs text-[#24201D] outline-none"
                        />
                      </label>
                      <label className="flex flex-col gap-1 font-medium text-[#24201D]">
                        Nama Penerima
                        <input
                          value={addressForm.recipient_name}
                          onChange={(e) => setAddressForm({ ...addressForm, recipient_name: e.target.value })}
                          required
                          className="h-9 rounded-xl border border-[#EAE2D6] bg-[#FCFBF8] px-3 text-xs text-[#24201D] outline-none"
                        />
                      </label>
                      <label className="flex flex-col gap-1 font-medium text-[#24201D]">
                        Nomor WhatsApp
                        <input
                          value={addressForm.phone}
                          onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                          inputMode="tel"
                          required
                          className="h-9 rounded-xl border border-[#EAE2D6] bg-[#FCFBF8] px-3 text-xs text-[#24201D] outline-none"
                        />
                      </label>
                      <label className="flex flex-col gap-1 font-medium text-[#24201D]">
                        Kode Pos
                        <input
                          value={addressForm.postal_code}
                          onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                          required
                          className="h-9 rounded-xl border border-[#EAE2D6] bg-[#FCFBF8] px-3 text-xs text-[#24201D] outline-none"
                        />
                      </label>
                      <label className="sm:col-span-2 flex flex-col gap-1 font-medium text-[#24201D]">
                        Alamat Lengkap
                        <textarea
                          value={addressForm.address_line}
                          onChange={(e) => setAddressForm({ ...addressForm, address_line: e.target.value })}
                          required
                          rows={2}
                          className="rounded-xl border border-[#EAE2D6] bg-[#FCFBF8] px-3 py-2 text-xs text-[#24201D] outline-none"
                        />
                      </label>
                      <label className="flex flex-col gap-1 font-medium text-[#24201D]">
                        Kota / Kabupaten
                        <input
                          value={addressForm.city}
                          onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                          required
                          className="h-9 rounded-xl border border-[#EAE2D6] bg-[#FCFBF8] px-3 text-xs text-[#24201D] outline-none"
                        />
                      </label>
                      <label className="flex flex-col gap-1 font-medium text-[#24201D]">
                        Provinsi
                        <input
                          value={addressForm.province}
                          onChange={(e) => setAddressForm({ ...addressForm, province: e.target.value })}
                          required
                          className="h-9 rounded-xl border border-[#EAE2D6] bg-[#FCFBF8] px-3 text-xs text-[#24201D] outline-none"
                        />
                      </label>
                    </div>

                    <label className="mt-3 flex items-center gap-2 text-xs text-[#736A63]">
                      <input
                        type="checkbox"
                        checked={addressForm.is_default}
                        onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                        className="accent-[#96785D]"
                      />
                      <span>Jadikan alamat pengiriman utama</span>
                    </label>

                    <div className="mt-4 flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={busy}
                        className="rounded-full bg-[#24201D] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-black disabled:opacity-50"
                      >
                        {busy ? "Menyimpan…" : "Simpan Alamat"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAddress(false)}
                        className="rounded-full border border-[#EAE2D6] bg-white px-4 py-2 text-xs font-medium text-[#736A63] hover:text-[#24201D]"
                      >
                        Batal
                      </button>
                    </div>
                  </form>
                )}

                {addresses.length === 0 && !editingAddress ? (
                  <p className="rounded-2xl border border-[#EAE2D6] bg-white p-6 text-center text-xs text-[#736A63]">
                    Belum ada alamat pengiriman yang tersimpan.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {addresses.map((a) => (
                      <article key={a.id} className="flex flex-col justify-between rounded-2xl border border-[#EAE2D6] bg-white p-4 text-xs shadow-sm">
                        <div>
                          <div className="flex items-center justify-between">
                            <strong className="font-semibold text-[#24201D]">{a.label}</strong>
                            {a.is_default && (
                              <span className="rounded-full border border-[#EAE2D6] bg-[#F5EDE2] px-2 py-0.5 text-[10px] font-semibold text-[#96785D]">
                                Alamat Utama
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-[#24201D] font-medium">{a.recipient_name} · {a.phone}</p>
                          <p className="mt-1 text-[#736A63] leading-relaxed">
                            {a.address_line}, {a.city}, {a.province} {a.postal_code}
                          </p>
                        </div>
                        <div className="mt-4 flex items-center gap-3 border-t border-[#EAE2D6] pt-3 text-xs">
                          <button
                            type="button"
                            className="font-medium text-[#96785D] hover:underline"
                            onClick={() => {
                              setAddressForm({ ...a });
                              setEditingAddress(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="font-medium text-rose-500 hover:underline"
                            onClick={() => void deleteAddress(a.id)}
                            disabled={busy}
                          >
                            Hapus
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Wishlist & Restock */}
            {tab === "wishlist" && (
              <div>
                {wishlist.length === 0 && restocks.length === 0 ? (
                  <div className="rounded-2xl border border-[#EAE2D6] bg-white p-8 text-center text-xs text-[#736A63] shadow-sm">
                    <Heart className="mx-auto h-8 w-8 text-[#96785D]/40" strokeWidth={1.5} />
                    <p className="mt-3 font-medium text-[#24201D]">Wishlist kamu masih kosong.</p>
                    <Link href="/shop" className="mt-2 inline-block font-semibold text-[#96785D] hover:underline">
                      Jelajahi busana dan simpan favoritmu →
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {wishlist.map((product) => (
                      <article key={product.id} className="flex flex-col justify-between rounded-2xl border border-[#EAE2D6] bg-white p-3 text-xs shadow-sm">
                        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-[#EFE7DC]">
                          {product.imageUrl ? (
                            <Image src={product.imageUrl} alt={product.name} fill sizes="160px" className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-[#736A63]">H.</div>
                          )}
                        </div>
                        <div className="mt-2 flex flex-col gap-0.5">
                          <h3 className="truncate font-sans font-medium text-[#24201D]">{product.name}</h3>
                          <span className="font-semibold text-[#96785D]">{money(product.price)}</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-[#EAE2D6] pt-2 text-[11px]">
                          <Link href="/shop" className="text-[#24201D] hover:underline">Lihat Produk</Link>
                          <button onClick={() => void removeWishlist(product.id)} className="text-rose-500 hover:underline">Hapus</button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                {restocks.length > 0 && (
                  <div className="mt-8 border-t border-[#EAE2D6] pt-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#96785D] mb-3 flex items-center gap-1.5">
                      <Bell className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Permintaan Notifikasi Restock
                    </h3>
                    <div className="flex flex-col gap-2">
                      {restocks.map((r) => {
                        const info = variantLookup.get(r.variant_id);
                        return (
                          <div key={r.id} className="flex items-center justify-between rounded-xl border border-[#EAE2D6] bg-white p-3 text-xs">
                            <div>
                              <strong className="text-[#24201D]">{info?.productName ?? "Produk Pilihan"}</strong>
                              {info?.color && <span className="text-[#736A63]"> · {info.color}</span>}
                              <p className="text-[11px] text-[#736A63]">
                                {r.notified_at ? "Stok sudah tersedia kembali." : "Menunggu stok baru dari toko."}
                              </p>
                            </div>
                            <button onClick={() => void cancelRestock(r.id)} className="text-xs text-rose-500 hover:underline">
                              Batalkan
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Profile */}
            {tab === "profile" && (
              <form className="max-w-md rounded-2xl border border-[#EAE2D6] bg-white p-6 text-xs shadow-sm flex flex-col gap-4" onSubmit={saveProfile}>
                <div>
                  <h2 className="font-serif text-xl text-[#24201D]">Data Profil</h2>
                  <p className="text-[11px] text-[#736A63]">Nomor WhatsApp digunakan untuk memudahkan konfirmasi pesanan.</p>
                </div>

                <label className="flex flex-col gap-1 font-medium text-[#24201D]">
                  Nama Lengkap
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="h-10 rounded-xl border border-[#EAE2D6] bg-[#FCFBF8] px-3 text-xs text-[#24201D] outline-none focus:border-[#96785D]"
                  />
                </label>

                <label className="flex flex-col gap-1 font-medium text-[#24201D]">
                  Email Akun
                  <input
                    value={user.email ?? ""}
                    readOnly
                    className="h-10 rounded-xl border border-[#EAE2D6] bg-stone-100 px-3 text-xs text-stone-500 outline-none cursor-not-allowed"
                  />
                </label>

                <label className="flex flex-col gap-1 font-medium text-[#24201D]">
                  Nomor WhatsApp
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="tel"
                    placeholder="08xxxxxxxxxx"
                    className="h-10 rounded-xl border border-[#EAE2D6] bg-[#FCFBF8] px-3 text-xs text-[#24201D] outline-none focus:border-[#96785D]"
                  />
                </label>

                <button
                  type="submit"
                  disabled={busy}
                  className="mt-2 rounded-full bg-[#24201D] py-2.5 text-xs font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-black disabled:opacity-50"
                >
                  {busy ? "Menyimpan…" : "Simpan Perubahan"}
                </button>
              </form>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
