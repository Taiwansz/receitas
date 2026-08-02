-- Units, ingredients, suppliers, purchases and packaging.

create table public.measurement_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  code citext not null,
  name text not null,
  symbol text not null,
  dimension text not null,
  scale_to_si numeric(20,10),
  decimal_places smallint not null default 3,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id),
  constraint measurement_units_dimension check (dimension in ('mass', 'volume', 'count', 'length', 'time', 'other')),
  constraint measurement_units_scale check (scale_to_si is null or scale_to_si > 0),
  constraint measurement_units_decimal_places check (decimal_places between 0 and 6),
  constraint measurement_units_names check (char_length(name) between 1 and 80 and char_length(symbol) between 1 and 16)
);
create unique index measurement_units_global_code_uidx on public.measurement_units (code) where organization_id is null;
create unique index measurement_units_org_code_uidx on public.measurement_units (organization_id, code) where organization_id is not null;

create table public.unit_conversions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  from_unit_id uuid not null references public.measurement_units(id) on delete restrict,
  to_unit_id uuid not null references public.measurement_units(id) on delete restrict,
  ingredient_id uuid,
  factor numeric(20,10) not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id),
  constraint unit_conversions_factor check (factor > 0),
  constraint unit_conversions_ingredient_scope check (ingredient_id is null or organization_id is not null),
  constraint unit_conversions_distinct_units check (from_unit_id <> to_unit_id)
);
create unique index unit_conversions_global_uidx on public.unit_conversions (from_unit_id, to_unit_id)
where organization_id is null and ingredient_id is null and deleted_at is null;
create unique index unit_conversions_org_uidx on public.unit_conversions (organization_id, from_unit_id, to_unit_id, coalesce(ingredient_id, '00000000-0000-0000-0000-000000000000'::uuid))
where organization_id is not null and deleted_at is null;

create table public.ingredient_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  parent_id uuid,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id),
  unique (organization_id, name),
  foreign key (organization_id, parent_id) references public.ingredient_categories(organization_id, id) on delete restrict,
  constraint ingredient_categories_not_self check (parent_id is null or parent_id <> id),
  constraint ingredient_categories_name_length check (char_length(name) between 1 and 100)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  legal_name text not null,
  trade_name text,
  tax_id text,
  contact_name text,
  email citext,
  phone text,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id),
  constraint suppliers_status check (status in ('active', 'inactive')),
  constraint suppliers_name_length check (char_length(legal_name) between 1 and 200)
);
create unique index suppliers_org_tax_id_uidx on public.suppliers (organization_id, tax_id)
where tax_id is not null and deleted_at is null;

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid,
  category_id uuid,
  name text not null,
  sku citext,
  brand text,
  base_unit_id uuid not null references public.measurement_units(id) on delete restrict,
  preferred_purchase_unit_id uuid references public.measurement_units(id) on delete restrict,
  default_yield_rate numeric(9,6) not null default 1,
  default_waste_rate numeric(9,6) not null default 0,
  minimum_stock numeric(20,6) not null default 0,
  cost_method text not null default 'weighted_average',
  manual_reference_cost numeric(19,4),
  shelf_life_days integer,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, branch_id) references public.branches(organization_id, id) on delete restrict,
  foreign key (organization_id, category_id) references public.ingredient_categories(organization_id, id) on delete restrict,
  constraint ingredients_name_length check (char_length(name) between 1 and 160),
  constraint ingredients_yield check (default_yield_rate > 0 and default_yield_rate <= 1),
  constraint ingredients_waste check (default_waste_rate >= 0 and default_waste_rate < 1),
  constraint ingredients_minimum_stock check (minimum_stock >= 0),
  constraint ingredients_manual_cost check (manual_reference_cost is null or manual_reference_cost >= 0),
  constraint ingredients_shelf_life check (shelf_life_days is null or shelf_life_days >= 0),
  constraint ingredients_cost_method check (cost_method in ('latest_purchase', 'weighted_average', 'manual_reference')),
  constraint ingredients_status check (status in ('active', 'inactive'))
);
create unique index ingredients_org_sku_uidx on public.ingredients (organization_id, sku)
where sku is not null and deleted_at is null;
create index ingredients_org_name_idx on public.ingredients (organization_id, name) where deleted_at is null;

alter table public.unit_conversions
  add foreign key (organization_id, ingredient_id) references public.ingredients(organization_id, id) on delete cascade;

create table public.ingredient_suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  ingredient_id uuid not null,
  supplier_id uuid not null,
  supplier_sku text,
  is_preferred boolean not null default false,
  lead_time_days integer,
  minimum_order_quantity numeric(20,6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id),
  unique (ingredient_id, supplier_id),
  foreign key (organization_id, ingredient_id) references public.ingredients(organization_id, id) on delete cascade,
  foreign key (organization_id, supplier_id) references public.suppliers(organization_id, id) on delete cascade,
  constraint ingredient_suppliers_lead_time check (lead_time_days is null or lead_time_days >= 0),
  constraint ingredient_suppliers_minimum check (minimum_order_quantity is null or minimum_order_quantity > 0)
);
create unique index ingredient_suppliers_one_preferred_idx on public.ingredient_suppliers (ingredient_id)
where is_preferred and deleted_at is null;

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null,
  supplier_id uuid,
  document_number text,
  purchased_at timestamptz not null default now(),
  received_at timestamptz,
  status text not null default 'draft',
  currency_code text not null default 'BRL',
  header_discount numeric(19,4) not null default 0,
  freight_total numeric(19,4) not null default 0,
  tax_total numeric(19,4) not null default 0,
  additional_fees_total numeric(19,4) not null default 0,
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, branch_id) references public.branches(organization_id, id) on delete restrict,
  foreign key (organization_id, supplier_id) references public.suppliers(organization_id, id) on delete restrict,
  constraint purchases_status check (status in ('draft', 'received', 'cancelled')),
  constraint purchases_received_state check ((status = 'received' and received_at is not null) or status <> 'received'),
  constraint purchases_currency check (currency_code ~ '^[A-Z]{3}$'),
  constraint purchases_amounts check (header_discount >= 0 and freight_total >= 0 and tax_total >= 0 and additional_fees_total >= 0)
);
create unique index purchases_supplier_document_uidx on public.purchases (organization_id, supplier_id, document_number)
where supplier_id is not null and document_number is not null and deleted_at is null;
create index purchases_org_date_idx on public.purchases (organization_id, purchased_at desc);

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  purchase_id uuid not null,
  ingredient_id uuid not null,
  purchase_unit_id uuid not null references public.measurement_units(id) on delete restrict,
  gross_quantity numeric(20,6) not null,
  net_quantity numeric(20,6) not null,
  usable_quantity numeric(20,6) not null,
  unit_to_base_factor numeric(20,10) not null default 1,
  unit_price numeric(19,6) not null,
  discount_amount numeric(19,4) not null default 0,
  freight_amount numeric(19,4) not null default 0,
  tax_amount numeric(19,4) not null default 0,
  additional_fee_amount numeric(19,4) not null default 0,
  expiration_date date,
  lot_code text,
  total_cost numeric(19,4) generated always as
    (round(((gross_quantity * unit_price) - discount_amount + freight_amount + tax_amount + additional_fee_amount)::numeric, 4)) stored,
  cost_per_usable_unit numeric(19,6) generated always as
    (round((((gross_quantity * unit_price) - discount_amount + freight_amount + tax_amount + additional_fee_amount) / (usable_quantity * unit_to_base_factor))::numeric, 6)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, purchase_id) references public.purchases(organization_id, id) on delete cascade,
  foreign key (organization_id, ingredient_id) references public.ingredients(organization_id, id) on delete restrict,
  constraint purchase_items_quantities check (gross_quantity > 0 and net_quantity > 0 and usable_quantity > 0 and net_quantity <= gross_quantity and usable_quantity <= net_quantity),
  constraint purchase_items_conversion check (unit_to_base_factor > 0),
  constraint purchase_items_amounts check (unit_price >= 0 and discount_amount >= 0 and freight_amount >= 0 and tax_amount >= 0 and additional_fee_amount >= 0),
  constraint purchase_items_total_nonnegative check ((gross_quantity * unit_price) - discount_amount + freight_amount + tax_amount + additional_fee_amount >= 0)
);
create index purchase_items_purchase_idx on public.purchase_items (purchase_id);
create index purchase_items_ingredient_idx on public.purchase_items (ingredient_id, created_at desc);

create table public.ingredient_price_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  ingredient_id uuid not null,
  supplier_id uuid,
  purchase_item_id uuid,
  effective_at timestamptz not null,
  source text not null,
  currency_code text not null default 'BRL',
  acquisition_cost numeric(19,4) not null,
  usable_quantity numeric(20,6) not null,
  base_unit_cost numeric(19,6) not null,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, ingredient_id) references public.ingredients(organization_id, id) on delete restrict,
  foreign key (organization_id, supplier_id) references public.suppliers(organization_id, id) on delete restrict,
  foreign key (organization_id, purchase_item_id) references public.purchase_items(organization_id, id) on delete restrict,
  constraint ingredient_price_history_source check (source in ('purchase', 'manual', 'opening_balance', 'correction')),
  constraint ingredient_price_history_currency check (currency_code ~ '^[A-Z]{3}$'),
  constraint ingredient_price_history_values check (acquisition_cost >= 0 and usable_quantity > 0 and base_unit_cost >= 0)
);
create unique index ingredient_price_history_purchase_item_uidx on public.ingredient_price_history (purchase_item_id)
where purchase_item_id is not null;
create index ingredient_price_history_timeline_idx on public.ingredient_price_history (ingredient_id, effective_at desc);

create table public.packaging_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  sku citext,
  unit_id uuid not null references public.measurement_units(id) on delete restrict,
  current_unit_cost numeric(19,6) not null default 0,
  minimum_stock numeric(20,6) not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id),
  constraint packaging_items_name check (char_length(name) between 1 and 160),
  constraint packaging_items_cost_stock check (current_unit_cost >= 0 and minimum_stock >= 0),
  constraint packaging_items_status check (status in ('active', 'inactive'))
);
create unique index packaging_items_org_sku_uidx on public.packaging_items (organization_id, sku)
where sku is not null and deleted_at is null;

create or replace function app.validate_units_belong_to_organization()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  column_name text;
  unit_value uuid;
begin
  foreach column_name in array tg_argv loop
    unit_value := nullif(to_jsonb(new) ->> column_name, '')::uuid;
    if unit_value is not null and not exists (
      select 1 from public.measurement_units u
      where u.id = unit_value
        and u.deleted_at is null
        and (u.organization_id is null or u.organization_id = new.organization_id)
    ) then
      raise exception 'Unit % is not available to organization %', unit_value, new.organization_id using errcode = '23514';
    end if;
  end loop;
  return new;
end;
$$;

create trigger unit_conversions_validate_units before insert or update on public.unit_conversions
for each row execute function app.validate_units_belong_to_organization('from_unit_id', 'to_unit_id');
create trigger ingredients_validate_units before insert or update on public.ingredients
for each row execute function app.validate_units_belong_to_organization('base_unit_id', 'preferred_purchase_unit_id');
create trigger purchase_items_validate_units before insert or update on public.purchase_items
for each row execute function app.validate_units_belong_to_organization('purchase_unit_id');
create trigger packaging_items_validate_units before insert or update on public.packaging_items
for each row execute function app.validate_units_belong_to_organization('unit_id');

create or replace function app.set_purchase_item_conversion()
returns trigger
language plpgsql
set search_path = ''
as $$
declare target_base uuid; found_factor numeric;
begin
  select i.base_unit_id into target_base from public.ingredients i
    where i.id=new.ingredient_id and i.organization_id=new.organization_id;
  if target_base=new.purchase_unit_id then new.unit_to_base_factor:=1; return new; end if;
  select c.factor into found_factor from public.unit_conversions c
    where c.from_unit_id=new.purchase_unit_id and c.to_unit_id=target_base and c.deleted_at is null
      and (c.organization_id is null or c.organization_id=new.organization_id)
      and (c.ingredient_id is null or c.ingredient_id=new.ingredient_id)
    order by (c.ingredient_id is not null) desc,(c.organization_id is not null) desc limit 1;
  if found_factor is null then raise exception 'Missing purchase-unit to base-unit conversion' using errcode='23514'; end if;
  new.unit_to_base_factor:=found_factor;
  return new;
end;
$$;
create trigger purchase_items_set_conversion before insert or update on public.purchase_items
for each row execute function app.set_purchase_item_conversion();

create or replace function app.guard_purchase_item_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_purchase_id uuid := coalesce(new.purchase_id, old.purchase_id);
begin
  if not exists (select 1 from public.purchases p where p.id = target_purchase_id and p.status = 'draft' and p.deleted_at is null) then
    raise exception 'Purchase items can only change while purchase is draft' using errcode = '55000';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger purchase_items_guard before insert or update or delete on public.purchase_items
for each row execute function app.guard_purchase_item_mutation();

create or replace function app.guard_received_purchase()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'received' and (
    new.supplier_id is distinct from old.supplier_id or
    new.branch_id is distinct from old.branch_id or
    new.purchased_at is distinct from old.purchased_at or
    new.received_at is distinct from old.received_at or
    new.currency_code is distinct from old.currency_code or
    new.header_discount is distinct from old.header_discount or
    new.freight_total is distinct from old.freight_total or
    new.tax_total is distinct from old.tax_total or
    new.additional_fees_total is distinct from old.additional_fees_total or
    new.deleted_at is distinct from old.deleted_at
  ) then
    raise exception 'Received purchases are financially immutable; post a correction instead' using errcode = '55000';
  end if;
  if old.status = 'received' and new.status = 'draft' then
    raise exception 'Received purchases cannot return to draft' using errcode = '55000';
  end if;
  return new;
end;
$$;
create trigger purchases_guard_received before update on public.purchases
for each row execute function app.guard_received_purchase();

create or replace function app.prevent_immutable_history_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Historical financial records are append-only' using errcode = '55000';
end;
$$;
create trigger ingredient_price_history_immutable before update or delete on public.ingredient_price_history
for each row execute function app.prevent_immutable_history_change();

do $$
declare t text;
begin
  foreach t in array array[
    'measurement_units','unit_conversions','ingredient_categories','suppliers','ingredients',
    'ingredient_suppliers','purchases','purchase_items','packaging_items'
  ] loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function app.set_updated_at()', t, t);
  end loop;
end $$;
