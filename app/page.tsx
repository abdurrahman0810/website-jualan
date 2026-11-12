import Storefront from '../src/App'
import { getStorefrontCatalog } from './storefront-catalog'

export const revalidate = 60

export default async function HomePage() {
  const { products, error } = await getStorefrontCatalog('home')
  return <Storefront initialProducts={products} initialCatalogError={error} page="home" />
}
