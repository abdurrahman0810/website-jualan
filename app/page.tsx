import { createClient } from '@supabase/supabase-js'
import Storefront from '../src/App'
import { mapCatalog, type CatalogRow } from '../src/lib/catalog'

export const dynamic = 'force-dynamic'

async function getCatalog() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim()
  if (!url || !key) return { products: null, error: null }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { data, error } = await supabase.rpc('daftar_produk_online')
  if (error) {
    return { products: null, error: 'Katalog Supabase belum siap. Jalankan migrasi katalog dulu.' }
  }
  return { products: mapCatalog((data ?? []) as CatalogRow[]), error: null }
}

export default async function HomePage() {
  const { products, error } = await getCatalog()
  return <Storefront initialProducts={products} initialCatalogError={error} />
}
