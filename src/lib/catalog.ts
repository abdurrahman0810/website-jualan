export type Variant = {
  id: string
  size: string | null
  color: string | null
  available: boolean
}

export type Product = {
  id: string
  name: string
  category: string
  price: number
  imageUrl: string | null
  description: string
  material: string
  measurements: Record<string, string>
  variants: Variant[]
  label?: string
}

export type CatalogRow = {
  product_id: string
  product_name: string
  slug: string
  description: string | null
  material: string | null
  measurements: Record<string, string> | null
  category_id: string | null
  category_name: string | null
  sell_price: number
  image_url: string | null
  variants: Variant[] | null
}

export function mapCatalog(rows: CatalogRow[]): Product[] {
  return rows.map((row) => ({
    id: row.product_id,
    name: row.product_name,
    category: row.category_name ?? 'Koleksi',
    price: Number(row.sell_price),
    imageUrl: row.image_url,
    description: row.description ?? '',
    material: row.material ?? '',
    measurements: row.measurements ?? {},
    variants: row.variants ?? [],
  }))
}
