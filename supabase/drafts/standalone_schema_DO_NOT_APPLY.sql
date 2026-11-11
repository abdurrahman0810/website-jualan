-- Ruang Rona schema: profiles, trusted roles, products, variants, orders.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create type public.app_role as enum ('customer', 'admin');
create type public.product_status as enum ('draft', 'published', 'archived');
create type public.order_status as enum ('pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled', 'refunded');
create type public.payment_status as enum ('unpaid', 'pending', 'paid', 'failed', 'refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A browser client cannot grant itself admin access through editable profile metadata.
create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  description text not null default '',
  price integer not null check (price >= 0),
  compare_at_price integer check (compare_at_price is null or compare_at_price >= price),
  cover_image_url text,
  status public.product_status not null default 'draft',
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  color_name text not null,
  color_hex text,
  sku text unique,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  price_override integer check (price_override is null or price_override >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, color_name)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'unpaid',
  subtotal integer not null check (subtotal >= 0),
  shipping_fee integer not null default 0 check (shipping_fee >= 0),
  total integer not null check (total >= 0),
  recipient_name text not null,
  recipient_phone text not null,
  shipping_address jsonb not null default '{}'::jsonb,
  customer_note text,
  payment_provider text,
  payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  variant_name text,
  image_url text,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total integer not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index products_listing_idx on public.products (status, sort_order, created_at desc);
create index products_category_idx on public.products (category) where status = 'published';
create index variants_product_idx on public.product_variants (product_id, is_active);
create index orders_user_created_idx on public.orders (user_id, created_at desc);
create index order_items_order_idx on public.order_items (order_id);

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'admin'::public.app_role
  );
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function private.set_updated_at() from public, anon, authenticated;

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  ) on conflict (id) do nothing;
  insert into public.user_roles (user_id, role)
  values (new.id, 'customer'::public.app_role) on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function private.set_updated_at();
create trigger variants_set_updated_at before update on public.product_variants for each row execute function private.set_updated_at();
create trigger orders_set_updated_at before update on public.orders for each row execute function private.set_updated_at();
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

revoke all on public.profiles, public.user_roles, public.products, public.product_variants, public.orders, public.order_items from anon, authenticated;
grant select on public.products, public.product_variants to anon, authenticated;
grant insert, update, delete on public.products, public.product_variants to authenticated;
grant select, update (full_name, avatar_url) on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select, update on public.orders to authenticated;
grant select on public.order_items to authenticated;

create policy "Public can read published products" on public.products
for select to anon, authenticated using (status = 'published');
create policy "Admins can read every product" on public.products
for select to authenticated using ((select private.is_admin()));
create policy "Admins can create products" on public.products
for insert to authenticated with check ((select private.is_admin()));
create policy "Admins can edit products" on public.products
for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins can remove products" on public.products
for delete to authenticated using ((select private.is_admin()));

create policy "Public can read active variants for published products" on public.product_variants
for select to anon, authenticated using (
  is_active and exists (
    select 1 from public.products
    where products.id = product_variants.product_id and products.status = 'published'
  )
);
create policy "Admins can read every variant" on public.product_variants
for select to authenticated using ((select private.is_admin()));
create policy "Admins can create variants" on public.product_variants
for insert to authenticated with check ((select private.is_admin()));
create policy "Admins can edit variants" on public.product_variants
for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins can remove variants" on public.product_variants
for delete to authenticated using ((select private.is_admin()));

create policy "Users can read their profile" on public.profiles
for select to authenticated using (id = (select auth.uid()));
create policy "Users can update their profile" on public.profiles
for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "Users can read their role" on public.user_roles
for select to authenticated using (user_id = (select auth.uid()));

create policy "Customers can read their orders; admins can read all" on public.orders
for select to authenticated using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy "Admins can update order status" on public.orders
for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Customers can read their order items; admins can read all" on public.order_items
for select to authenticated using (
  (select private.is_admin()) or exists (
    select 1 from public.orders
    where orders.id = order_items.order_id and orders.user_id = (select auth.uid())
  )
);
