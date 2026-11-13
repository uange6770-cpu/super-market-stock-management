create extension if not exists pgcrypto;
do $$ begin
  create type public.app_role as enum ('admin','staff');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.movement_type as enum ('in','out','adjustment');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles(id uuid primary key references auth.users(id) on delete cascade, full_name text not null default '', role public.app_role not null default 'staff', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.categories(id uuid primary key default gen_random_uuid(), name text not null unique, description text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.suppliers(id uuid primary key default gen_random_uuid(), name text not null, company_name text, phone text, email text, address text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.products(id uuid primary key default gen_random_uuid(), name text not null, barcode text unique, category_id uuid references public.categories(id) on delete set null, description text, purchase_price numeric(12,2) not null check(purchase_price>=0), selling_price numeric(12,2) not null check(selling_price>=0), quantity integer not null default 0 check(quantity>=0), min_stock_level integer not null default 0 check(min_stock_level>=0), unit text not null default 'pcs', expiry_date date, supplier_id uuid references public.suppliers(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.purchases(id uuid primary key default gen_random_uuid(), purchase_number text not null unique default ('P-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))), supplier_id uuid references public.suppliers(id) on delete set null, total_amount numeric(12,2) not null default 0 check(total_amount>=0), created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.purchase_items(id uuid primary key default gen_random_uuid(), purchase_id uuid not null references public.purchases(id) on delete cascade, product_id uuid not null references public.products(id), quantity integer not null check(quantity>0), unit_cost numeric(12,2) not null check(unit_cost>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.sales(id uuid primary key default gen_random_uuid(), sale_number text not null unique default ('S-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))), total_amount numeric(12,2) not null default 0 check(total_amount>=0), created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.sale_items(id uuid primary key default gen_random_uuid(), sale_id uuid not null references public.sales(id) on delete cascade, product_id uuid not null references public.products(id), quantity integer not null check(quantity>0), unit_price numeric(12,2) not null check(unit_price>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.stock_movements(id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id), movement_type public.movement_type not null, quantity integer not null check(quantity>0), reason text, purchase_id uuid references public.purchases(id), sale_id uuid references public.sales(id), performed_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name','')); return new; end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin') $$;
create index if not exists products_name_idx on public.products using gin(to_tsvector('simple',name));
create index if not exists products_barcode_idx on public.products(barcode);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists sales_created_idx on public.sales(created_at desc);
create index if not exists movements_created_idx on public.stock_movements(created_at desc);
create index if not exists movements_product_idx on public.stock_movements(product_id,created_at desc);

create or replace function public.create_sale(p_items jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare v_sale_id uuid; v_item jsonb; v_product public.products%rowtype; v_qty integer; v_total numeric(12,2):=0;
begin
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Sale requires at least one item'; end if;
 for v_item in select * from jsonb_array_elements(p_items) loop
  v_qty:=(v_item->>'quantity')::integer; if v_qty<=0 then raise exception 'Quantity must be positive'; end if;
  select * into v_product from public.products where id=(v_item->>'product_id')::uuid for update;
  if not found then raise exception 'Product not found'; end if;
  if v_product.quantity<v_qty then raise exception 'Insufficient stock for %',v_product.name; end if;
  v_total:=v_total+(v_product.selling_price*v_qty);
 end loop;
 insert into public.sales(total_amount,created_by) values(v_total,auth.uid()) returning id into v_sale_id;
 for v_item in select * from jsonb_array_elements(p_items) loop
  v_qty:=(v_item->>'quantity')::integer; select * into v_product from public.products where id=(v_item->>'product_id')::uuid for update;
  insert into public.sale_items(sale_id,product_id,quantity,unit_price) values(v_sale_id,v_product.id,v_qty,v_product.selling_price);
  update public.products set quantity=quantity-v_qty,updated_at=now() where id=v_product.id;
  insert into public.stock_movements(product_id,movement_type,quantity,reason,sale_id,performed_by) values(v_product.id,'out',v_qty,'Sale',v_sale_id,auth.uid());
 end loop; return v_sale_id;
end $$;

create or replace function public.receive_stock(p_items jsonb,p_supplier_id uuid default null) returns uuid language plpgsql security definer set search_path=public as $$
declare v_purchase_id uuid; v_item jsonb; v_qty integer; v_product public.products%rowtype; v_total numeric(12,2):=0;
begin
 if not public.is_admin() then raise exception 'Admin role required'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Purchase requires at least one item'; end if;
 insert into public.purchases(supplier_id,created_by) values(p_supplier_id,auth.uid()) returning id into v_purchase_id;
 for v_item in select * from jsonb_array_elements(p_items) loop
  v_qty:=(v_item->>'quantity')::integer; if v_qty<=0 then raise exception 'Quantity must be positive'; end if;
  select * into v_product from public.products where id=(v_item->>'product_id')::uuid for update;
  if not found then raise exception 'Product not found'; end if;
  insert into public.purchase_items(purchase_id,product_id,quantity,unit_cost) values(v_purchase_id,v_product.id,v_qty,coalesce((v_item->>'unit_cost')::numeric,v_product.purchase_price));
  update public.products set quantity=quantity+v_qty,updated_at=now() where id=v_product.id;
  insert into public.stock_movements(product_id,movement_type,quantity,reason,purchase_id,performed_by) values(v_product.id,'in',v_qty,'Purchase receipt',v_purchase_id,auth.uid());
  v_total:=v_total+(v_qty*coalesce((v_item->>'unit_cost')::numeric,v_product.purchase_price));
 end loop; update public.purchases set total_amount=v_total where id=v_purchase_id; return v_purchase_id;
end $$;
create or replace function public.adjust_stock(p_product_id uuid,p_movement_type public.movement_type,p_quantity integer,p_reason text) returns uuid language plpgsql security definer set search_path=public as $$
declare v_product public.products%rowtype; v_id uuid; v_delta integer;
begin
 if not public.is_admin() then raise exception 'Admin role required'; end if;
 if (p_movement_type='adjustment' and p_quantity<0) or (p_movement_type<>'adjustment' and p_quantity<=0) or trim(p_reason)='' then raise exception 'Valid quantity and reason are required'; end if;
 select * into v_product from public.products where id=p_product_id for update;
 if not found then raise exception 'Product not found'; end if;
 v_delta:=case when p_movement_type='in' then p_quantity else -p_quantity end;
 if p_movement_type='adjustment' then v_delta:=p_quantity-v_product.quantity; end if;
 if v_delta=0 then raise exception 'New quantity must differ from current quantity'; end if;
 if v_product.quantity+v_delta<0 then raise exception 'Stock cannot be negative'; end if;
 update public.products set quantity=quantity+v_delta,updated_at=now() where id=p_product_id;
 insert into public.stock_movements(product_id,movement_type,quantity,reason,performed_by) values(p_product_id,p_movement_type,abs(v_delta),p_reason,auth.uid()) returning id into v_id;
 return v_id;
end $$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.stock_movements enable row level security;
drop policy if exists "Authenticated users read profiles" on public.profiles;
create policy "Authenticated users read profiles" on public.profiles for select to authenticated using(true);
drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles for select to authenticated using(id=auth.uid());
revoke update on public.profiles from authenticated;
grant update(full_name) on public.profiles to authenticated;
do $$ declare t text; begin foreach t in array array['categories','suppliers','products','purchases','purchase_items','sales','sale_items','stock_movements'] loop execute format('drop policy if exists "Authenticated read %1$s" on public.%1$I',t); execute format('create policy "Authenticated read %1$s" on public.%1$I for select to authenticated using(true)',t); end loop; end $$;
grant execute on function public.create_sale(jsonb) to authenticated;
grant execute on function public.receive_stock(jsonb,uuid) to authenticated;
grant execute on function public.adjust_stock(uuid,public.movement_type,integer,text) to authenticated;

