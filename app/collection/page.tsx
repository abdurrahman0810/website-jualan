import Storefront from '../../src/App'
import { getStorefrontCatalog } from '../storefront-catalog'

export const revalidate = 60

export default async function CollectionPage() {
  const { products, error } = await getStorefrontCatalog('collection')
  return <Storefront initialProducts={products} initialCatalogError={error} page="collection" />
}
