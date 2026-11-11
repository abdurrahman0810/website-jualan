-- Preserve the existing cashier flow while restricting it to active staff roles.
CREATE OR REPLACE FUNCTION public.proses_checkout(p_items jsonb, p_payment_method text, p_approval_id uuid DEFAULT NULL::uuid, p_amount_paid numeric DEFAULT NULL::numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare
  v_order_id uuid;
  v_total numeric := 0;
  v_item jsonb;
  v_variant_id uuid;
  v_qty integer;
  v_stock integer;
  v_price numeric;
  v_discount numeric := 0;
  v_approver uuid;
  v_final numeric;
  v_paid numeric;
  v_change numeric := 0;
begin
  if auth.uid() is null then
    raise exception 'Belum login';
  end if;

  if coalesce(public.get_my_role(), '') not in ('admin', 'pegawai') then
    raise exception 'Akses checkout kasir hanya untuk admin atau pegawai';
  end if;

  if p_payment_method is null
     or p_payment_method not in ('Tunai', 'QRIS', 'Kartu ATM') then
    raise exception 'Metode pembayaran tidak valid';
  end if;

  insert into orders (order_source, total_amount, payment_method, status)
  values ('pos', 0, p_payment_method, 'selesai')
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_variant_id := (v_item->>'variant_id')::uuid;
    v_qty := (v_item->>'qty')::integer;

    if v_qty is null or v_qty <= 0 then
      raise exception 'Jumlah tidak valid';
    end if;

    select v.stock, p.sell_price
      into v_stock, v_price
    from product_variants v
    join products p on p.id = v.product_id
    where v.id = v_variant_id
    for update of v;

    if v_stock is null then
      raise exception 'Variant tidak ditemukan';
    end if;

    if v_stock < v_qty then
      raise exception 'Stok tidak cukup untuk salah satu produk';
    end if;

    insert into order_items (order_id, variant_id, quantity, price_at_purchase)
    values (v_order_id, v_variant_id, v_qty, v_price);

    update product_variants set stock = stock - v_qty where id = v_variant_id;

    v_total := v_total + (v_price * v_qty);
  end loop;

  if p_approval_id is not null then
    select a.o_amount, a.o_approved_by
      into v_discount, v_approver
    from pakai_approval(p_approval_id) a;

    if v_discount > v_total then
      raise exception 'Diskon melebihi total belanja';
    end if;
  end if;

  v_final := v_total - v_discount;

  if p_payment_method = 'Tunai' and p_amount_paid is not null then
    if p_amount_paid < v_final then
      raise exception 'Uang diterima kurang dari total';
    end if;
    v_paid := p_amount_paid;
    v_change := p_amount_paid - v_final;
  else
    v_paid := v_final;
  end if;

  update orders
  set total_amount = v_final,
      discount_amount = v_discount,
      discount_approved_by = v_approver,
      amount_paid = v_paid,
      change_amount = v_change
  where id = v_order_id;

  return v_order_id;
end;
$function$;
revoke all on function public.proses_checkout(jsonb, text, uuid, numeric) from public, anon;
grant execute on function public.proses_checkout(jsonb, text, uuid, numeric) to authenticated;
