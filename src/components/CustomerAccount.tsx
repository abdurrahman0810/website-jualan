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

const accountTabs: { key: TabKey; label: string }[] = [
  { key: "orders", label: "Pesanan" },
  { key: "addresses", label: "Buku alamat" },
  { key: "wishlist", label: "Wishlist" },
  { key: "profile", label: "Profil" },
];

const statusNames: Record<string, string> = {
  menunggu_pembayaran: "Menunggu ongkir",
  menunggu_transfer: "Menunggu transfer",
  diproses: "Pembayaran dikonfirmasi",
  dikirim: "Dalam pengiriman",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
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
    const map = new Map<
      string,
      { productName: string; color: string | null }
    >();
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

  const displayName =
    fullName.trim() || user.email?.split("@")[0] || "Pelanggan";

  return (
    <main className="customer-account-page">
      <div className="customer-account-top">
        <Link className="admin-brand" href="/">
          H<span>.</span> HEBBUNA STORE
        </Link>
        <Link className="admin-back-link" href="/">
          Kembali ke toko ↗
        </Link>
      </div>

      <header className="customer-account-hero">
        <p className="eyebrow dark">
          <span>AKUN PELANGGAN</span> HEBBUNA STORE
        </p>
        <h1>Hai, {displayName}.</h1>
        <p>Pesanan, alamat, dan koleksi favoritmu tersimpan di sini.</p>
      </header>

      <nav className="customer-account-tabs" aria-label="Menu akun">
        {accountTabs.map((item) => (
          <button
            key={item.key}
            type="button"
            className={tab === item.key ? "active" : ""}
            onClick={() => handleTabChange(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {message && (
        <p className="customer-account-message" role="status">
          {message}
        </p>
      )}

      {loading ? (
        <p className="customer-account-empty">Memuat akun…</p>
      ) : (
        <section className="customer-account-content">
          {tab === "profile" && (
            <form className="customer-form" onSubmit={saveProfile}>
              <h2>Data diri</h2>
              <p>Gunakan nomor yang bisa dihubungi untuk konfirmasi pesanan.</p>

              <label>
                Nama lengkap
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                  maxLength={120}
                />
              </label>

              <label>
                Email akun
                <input value={user.email ?? ""} readOnly />
              </label>

              <label>
                Nomor WhatsApp
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  inputMode="tel"
                  maxLength={30}
                />
              </label>

              <button
                type="submit"
                className="primary-button dark-button"
                disabled={busy}
              >
                {busy ? "Menyimpan…" : "Simpan profil"}
              </button>
            </form>
          )}

          {tab === "addresses" && (
            <div>
              <div className="customer-list-heading">
                <div>
                  <h2>Buku alamat</h2>
                  <p>Tambah alamat rumah, kantor, atau tujuan lain.</p>
                </div>
                {!editingAddress && (
                  <button
                    type="button"
                    className="primary-button dark-button"
                    onClick={() => {
                      setAddressForm(emptyAddress);
                      setEditingAddress(true);
                    }}
                  >
                    + Tambah alamat
                  </button>
                )}
              </div>

              {editingAddress && (
                <form
                  className="customer-form address-editor"
                  onSubmit={saveAddress}
                >
                  <h3>{addressForm.id ? "Edit alamat" : "Alamat baru"}</h3>

                  <div className="customer-form-grid">
                    <label>
                      Nama alamat
                      <input
                        value={addressForm.label}
                        onChange={(event) =>
                          setAddressForm({
                            ...addressForm,
                            label: event.target.value,
                          })
                        }
                        placeholder="Rumah, Kantor"
                        required
                        maxLength={60}
                      />
                    </label>

                    <label>
                      Nama penerima
                      <input
                        value={addressForm.recipient_name}
                        onChange={(event) =>
                          setAddressForm({
                            ...addressForm,
                            recipient_name: event.target.value,
                          })
                        }
                        required
                        maxLength={120}
                      />
                    </label>

                    <label>
                      Nomor WhatsApp
                      <input
                        value={addressForm.phone}
                        onChange={(event) =>
                          setAddressForm({
                            ...addressForm,
                            phone: event.target.value,
                          })
                        }
                        inputMode="tel"
                        required
                        maxLength={30}
                      />
                    </label>

                    <label className="wide">
                      Alamat lengkap
                      <input
                        value={addressForm.address_line}
                        onChange={(event) =>
                          setAddressForm({
                            ...addressForm,
                            address_line: event.target.value,
                          })
                        }
                        required
                        maxLength={500}
                      />
                    </label>

                    <label>
                      Kota / kabupaten
                      <input
                        value={addressForm.city}
                        onChange={(event) =>
                          setAddressForm({
                            ...addressForm,
                            city: event.target.value,
                          })
                        }
                        required
                        maxLength={100}
                      />
                    </label>

                    <label>
                      Provinsi
                      <input
                        value={addressForm.province}
                        onChange={(event) =>
                          setAddressForm({
                            ...addressForm,
                            province: event.target.value,
                          })
                        }
                        required
                        maxLength={100}
                      />
                    </label>

                    <label>
                      Kode pos
                      <input
                        value={addressForm.postal_code}
                        onChange={(event) =>
                          setAddressForm({
                            ...addressForm,
                            postal_code: event.target.value,
                          })
                        }
                        inputMode="numeric"
                        required
                        maxLength={10}
                      />
                    </label>

                    <label className="wide">
                      Catatan kurir
                      <input
                        value={addressForm.delivery_note ?? ""}
                        onChange={(event) =>
                          setAddressForm({
                            ...addressForm,
                            delivery_note: event.target.value,
                          })
                        }
                        maxLength={300}
                      />
                    </label>
                  </div>

                  <label className="customer-default-check">
                    <input
                      type="checkbox"
                      checked={addressForm.is_default}
                      onChange={(event) =>
                        setAddressForm({
                          ...addressForm,
                          is_default: event.target.checked,
                        })
                      }
                    />
                    Jadikan alamat utama
                  </label>

                  <div className="customer-form-actions">
                    <button
                      type="submit"
                      className="primary-button dark-button"
                      disabled={busy}
                    >
                      {busy ? "Menyimpan…" : "Simpan alamat"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingAddress(false)}
                    >
                      Batal
                    </button>
                  </div>
                </form>
              )}

              {addresses.length === 0 && !editingAddress ? (
                <p className="customer-account-empty">
                  Belum ada alamat tersimpan.
                </p>
              ) : (
                <div className="customer-address-grid">
                  {addresses.map((address) => (
                    <article className="customer-address-card" key={address.id}>
                      <div>
                        <h3>{address.label}</h3>
                        {address.is_default && <span>Alamat utama</span>}
                      </div>

                      <strong>
                        {address.recipient_name} · {address.phone}
                      </strong>
                      <p>
                        {address.address_line}
                        <br />
                        {address.city}, {address.province} {address.postal_code}
                      </p>
                      {address.delivery_note && (
                        <small>Catatan: {address.delivery_note}</small>
                      )}

                      <footer>
                        <button
                          type="button"
                          onClick={() => {
                            setAddressForm({ ...address });
                            setEditingAddress(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteAddress(address.id)}
                          disabled={busy}
                        >
                          Hapus
                        </button>
                      </footer>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "wishlist" && (
            <div>
              <div className="customer-list-heading">
                <div>
                  <h2>Wishlist & kabar restock</h2>
                  <p>Favorit dan permintaan kabar stokmu.</p>
                </div>
              </div>

              {wishlist.length === 0 && restocks.length === 0 ? (
                <p className="customer-account-empty">
                  Belum ada produk favorit atau permintaan restock.
                </p>
              ) : (
                <div className="customer-wishlist-list">
                  {wishlist.map((product) => (
                    <article
                      key={product.id}
                      className="customer-wishlist-card"
                    >
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          width={80}
                          height={96}
                          sizes="80px"
                        />
                      ) : (
                        <div className="customer-wishlist-photo">H.</div>
                      )}

                      <div>
                        <h3>{product.name}</h3>
                        <p>
                          {money(product.price)} · {product.category}
                        </p>
                        <Link href="/#produk">Lihat produk ↗</Link>
                      </div>

                      <button
                        type="button"
                        onClick={() => void removeWishlist(product.id)}
                        aria-label={`Hapus ${product.name} dari wishlist`}
                      >
                        Hapus
                      </button>
                    </article>
                  ))}

                  {restocks.map((item) => {
                    const info = variantLookup.get(item.variant_id);
                    const title = info
                      ? `${info.productName}${info.color ? ` · ${info.color}` : ""}`
                      : "Produk pilihan";

                    return (
                      <article key={item.id} className="customer-restock-card">
                        <div>
                          <span
                            className={
                              item.notified_at
                                ? "restock-ready"
                                : "restock-waiting"
                            }
                          >
                            {item.notified_at
                              ? "Stok tersedia"
                              : "Menunggu restock"}
                          </span>
                          <h3>{title}</h3>
                          <p>
                            {item.notified_at
                              ? "Stok sudah kembali. Cek halaman produk untuk membeli."
                              : "Kami akan memberi kabar di akun ini saat stok tersedia."}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => void cancelRestock(item.id)}
                        >
                          Hapus
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "orders" && (
            <div>
              <div className="customer-list-heading">
                <div>
                  <h2>Riwayat pesanan</h2>
                  <p>Lihat pembayaran, status, dan informasi pengiriman.</p>
                </div>
              </div>

              {orders.length === 0 ? (
                <p className="customer-account-empty">
                  Belum ada pesanan online.
                </p>
              ) : (
                <div className="customer-order-list">
                  {orders.map((order) => (
                    <article
                      className="customer-order-card"
                      key={order.order_id}
                    >
                      <header>
                        <div>
                          <span>#{order.order_id.slice(0, 8)}</span>
                          <b className={`admin-status status-${order.status}`}>
                            {statusNames[order.status] ?? order.status}
                          </b>
                        </div>
                        <time>
                          {new Date(order.created_at).toLocaleDateString(
                            "id-ID",
                            {
                              dateStyle: "long",
                            },
                          )}
                        </time>
                      </header>

                      <ul>
                        {(order.items ?? []).map((item, index) => (
                          <li key={`${order.order_id}-${index}`}>
                            <span>
                              {item.product_name} ·{" "}
                              {[item.color, item.size]
                                .filter(Boolean)
                                .join(" / ") || "Varian"}{" "}
                              × {item.quantity}
                            </span>
                            <strong>{money(item.price * item.quantity)}</strong>
                          </li>
                        ))}
                      </ul>

                      <footer>
                        <span>Total {money(order.total_amount)}</span>
                        {order.status === "dikirim" && (
                          <span>
                            {order.shipping_courier || "Kurir"}
                            {order.tracking_code
                              ? ` · Resi ${order.tracking_code}`
                              : ""}
                          </span>
                        )}
                        {order.status === "menunggu_transfer" && (
                          <span>Menunggu konfirmasi transfer</span>
                        )}
                      </footer>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
