import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { mapCatalog, type CatalogRow } from '../src/lib/catalog'

const cachedCatalog = unstable_cache(async (url: string, key: string, limit: number) => {
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { data, error } = await supabase.rpc('daftar_produk_online')
    .select('product_id,product_name,slug,category_name,sell_price,image_url,variants')
    .range(0, limit - 1)
  if (error) return { products: null, error: 'Katalog Supabase belum siap. Jalankan migrasi katalog dulu.' }
  return { products: mapCatalog((data ?? []) as CatalogRow[]), error: null }
}, ['hebbuna-storefront-catalog-v2'], { revalidate: 60, tags: ['storefront-catalog'] })

export async function getStorefrontCatalog(page: 'home' | 'shop' | 'collection' | 'about') {
  if (page === 'about') return { products: [], error: null }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim()
  if (!url || !key) return { products: null, error: null }
  return cachedCatalog(url, key, page === 'home' ? 8 : 12)
}
