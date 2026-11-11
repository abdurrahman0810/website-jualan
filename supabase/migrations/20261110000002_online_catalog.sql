-- Public, read-only storefront catalog. Never expose cost_price or barcode fields.
alter table public.products add column if not exists image_url text;

create or replace function public.daftar_produk_online()
returns table (
  product_id uuid, product_name text, slug text, description text, material text,
  category_id uuid, category_name text, sell_price numeric, image_url text, variants jsonb
)
language sql stable security definer
set search_path = ''
as $function$
  select p.id, p.name, p.slug, p.description, p.material, p.category_id, c.name,
         p.sell_price, p.image_url,
         coalesce(
           pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
             'id', v.id, 'size', v.size, 'color', v.color, 'available', v.stock > 0
           ) order by v.size nulls last, v.color nulls last) filter (where v.id is not null),
           '[]'::jsonb
         )
  from public.products p
  left join public.categories c on c.id = p.category_id
  left join public.product_variants v on v.product_id = p.id
  where p.is_active = true
  group by p.id, c.name
  order by p.name;
$function$;

revoke all on function public.daftar_produk_online() from public, anon, authenticated;
grant execute on function public.daftar_produk_online() to anon, authenticated;
