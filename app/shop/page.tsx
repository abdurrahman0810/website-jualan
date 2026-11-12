import Storefront from '../../src/App'
import { getStorefrontCatalog } from '../storefront-catalog'

export const revalidate = 60

export default async function ShopPage() {
  const { products, error } = await getStorefrontCatalog('shop')
  return <Storefront initialProducts={products} initialCatalogError={error} page="shop" />
}
