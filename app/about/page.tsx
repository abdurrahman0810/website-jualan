import Storefront from '../../src/App'
import { getStorefrontCatalog } from '../storefront-catalog'

export default async function AboutPage() {
  const { products, error } = await getStorefrontCatalog('about')
  return <Storefront initialProducts={products} initialCatalogError={error} page="about" />
}
