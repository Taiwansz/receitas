-- Versioned recipes, operating costs and channel-specific pricing.

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid,
  name text not null,
  sku citext,
  category text,
  description text,
  kind text not null default 'finished_product',
  current_version_id uuid,
  status text not null default 'draft',
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, branch_id) references public.branches(organization_id, id) on delete restrict,
  constraint recipes_name_length check (char_length(name) between 1 and 180),
  constraint recipes_kind check (kind in ('finished_product', 'sub_recipe')),
  constraint recipes_status check (status in ('draft', 'active', 'inactive'))
);
create unique index recipes_org_sku_uidx on public.recipes (organization_id, sku) where sku is not null and deleted_at is null;
create index recipes_org_name_idx on public.recipes (organization_id, name) where deleted_at is null;

create table public.recipe_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  recipe_id uuid not null,
  version_number integer not null,
  status text not null default 'draft',
  change_notes text,
  gross_yield numeric(20,6) not null,
  net_yield numeric(20,6) not null,
  yield_unit_id uuid not null references public.measurement_units(id) on delete restrict,
  portions numeric(20,6) not null,
  portion_size numeric(20,6),
  preparation_loss_rate numeric(9,6) not null default 0,
  cooking_loss_rate numeric(9,6) not null default 0,
  unusable_leftover_rate numeric(9,6) not null default 0,
  preparation_minutes integer not null default 0,
  direct_labor_minutes integer not null default 0,
  instructions text,
  storage_instructions text,
  shelf_life_hours integer,
  ingredient_cost numeric(19,4) not null default 0,
  packaging_cost numeric(19,4) not null default 0,
  direct_labor_cost numeric(19,4) not null default 0,
  direct_variable_cost numeric(19,4) not null default 0,
  allocated_indirect_cost numeric(19,4) not null default 0,
  total_cost numeric(19,4) generated always as
    (round((ingredient_cost + packaging_cost + direct_labor_cost + direct_variable_cost + allocated_indirect_cost)::numeric, 4)) stored,
  portion_cost numeric(19,6) generated always as
    (round(((ingredient_cost + packaging_cost + direct_labor_cost + direct_variable_cost + allocated_indirect_cost) / portions)::numeric, 6)) stored,
  calculated_at timestamptz,
  published_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (recipe_id, version_number),
  foreign key (organization_id, recipe_id) references public.recipes(organization_id, id) on delete cascade,
  constraint recipe_versions_number check (version_number > 0),
  constraint recipe_versions_status check (status in ('draft', 'published', 'archived')),
  constraint recipe_versions_yields check (gross_yield > 0 and net_yield > 0 and net_yield <= gross_yield and portions > 0 and (portion_size is null or portion_size > 0)),
  constraint recipe_versions_losses check (preparation_loss_rate >= 0 and preparation_loss_rate < 1 and cooking_loss_rate >= 0 and cooking_loss_rate < 1 and unusable_leftover_rate >= 0 and unusable_leftover_rate < 1),
  constraint recipe_versions_combined_loss check (preparation_loss_rate + cooking_loss_rate + unusable_leftover_rate < 1),
  constraint recipe_versions_times check (preparation_minutes >= 0 and direct_labor_minutes >= 0 and (shelf_life_hours is null or shelf_life_hours >= 0)),
  constraint recipe_versions_costs check (ingredient_cost >= 0 and packaging_cost >= 0 and direct_labor_cost >= 0 and direct_variable_cost >= 0 and allocated_indirect_cost >= 0),
  constraint recipe_versions_published_state check ((status = 'published' and published_at is not null and calculated_at is not null) or status <> 'published')
);
create index recipe_versions_recipe_idx on public.recipe_versions (recipe_id, version_number desc);

alter table public.recipes
  add foreign key (organization_id, current_version_id) references public.recipe_versions(organization_id, id) on delete restrict;

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  recipe_version_id uuid not null,
  ingredient_id uuid not null,
  unit_id uuid not null references public.measurement_units(id) on delete restrict,
  gross_quantity numeric(20,6) not null,
  usable_quantity numeric(20,6) not null,
  waste_rate numeric(9,6) not null default 0,
  cost_per_unit_snapshot numeric(19,6) not null default 0,
  total_cost_snapshot numeric(19,4) generated always as (round((usable_quantity * cost_per_unit_snapshot)::numeric, 4)) stored,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (recipe_version_id, ingredient_id),
  foreign key (organization_id, recipe_version_id) references public.recipe_versions(organization_id, id) on delete cascade,
  foreign key (organization_id, ingredient_id) references public.ingredients(organization_id, id) on delete restrict,
  constraint recipe_ingredients_quantities check (gross_quantity > 0 and usable_quantity > 0 and usable_quantity <= gross_quantity),
  constraint recipe_ingredients_waste check (waste_rate >= 0 and waste_rate < 1),
  constraint recipe_ingredients_cost check (cost_per_unit_snapshot >= 0),
  constraint recipe_ingredients_sort check (sort_order >= 0)
);

create table public.recipe_sub_recipes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  recipe_version_id uuid not null,
  sub_recipe_version_id uuid not null,
  quantity numeric(20,6) not null,
  unit_id uuid not null references public.measurement_units(id) on delete restrict,
  cost_per_unit_snapshot numeric(19,6) not null default 0,
  total_cost_snapshot numeric(19,4) generated always as (round((quantity * cost_per_unit_snapshot)::numeric, 4)) stored,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (recipe_version_id, sub_recipe_version_id),
  foreign key (organization_id, recipe_version_id) references public.recipe_versions(organization_id, id) on delete cascade,
  foreign key (organization_id, sub_recipe_version_id) references public.recipe_versions(organization_id, id) on delete restrict,
  constraint recipe_sub_recipes_not_self check (recipe_version_id <> sub_recipe_version_id),
  constraint recipe_sub_recipes_quantity check (quantity > 0 and cost_per_unit_snapshot >= 0 and sort_order >= 0)
);

create table public.cost_centers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid,
  name text not null,
  code citext,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, branch_id) references public.branches(organization_id, id) on delete restrict,
  constraint cost_centers_name check (char_length(name) between 1 and 120),
  constraint cost_centers_status check (status in ('active', 'inactive'))
);
create unique index cost_centers_code_uidx on public.cost_centers (organization_id, code) where code is not null and deleted_at is null;

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid,
  cost_center_id uuid,
  name text not null,
  category text not null,
  behavior text not null,
  attribution text not null,
  amount numeric(19,4) not null,
  currency_code text not null default 'BRL',
  recurrence text not null default 'monthly',
  effective_from date not null,
  effective_to date,
  capacity_hours numeric(12,4),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, branch_id) references public.branches(organization_id, id) on delete restrict,
  foreign key (organization_id, cost_center_id) references public.cost_centers(organization_id, id) on delete restrict,
  constraint expenses_name check (char_length(name) between 1 and 160),
  constraint expenses_category check (category in ('labor', 'rent', 'electricity', 'water', 'gas', 'internet', 'accounting', 'marketing', 'cleaning', 'maintenance', 'insurance', 'software', 'depreciation', 'administrative', 'other')),
  constraint expenses_behavior check (behavior in ('fixed', 'variable')),
  constraint expenses_attribution check (attribution in ('direct', 'indirect')),
  constraint expenses_amount check (amount >= 0),
  constraint expenses_currency check (currency_code ~ '^[A-Z]{3}$'),
  constraint expenses_recurrence check (recurrence in ('one_time', 'daily', 'weekly', 'monthly', 'yearly', 'per_hour', 'per_unit')),
  constraint expenses_dates check (effective_to is null or effective_to >= effective_from),
  constraint expenses_capacity check (capacity_hours is null or capacity_hours > 0),
  constraint expenses_status check (status in ('active', 'inactive'))
);

create table public.allocation_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  expense_id uuid not null,
  cost_center_id uuid,
  recipe_id uuid,
  method text not null,
  allocation_rate numeric(9,6),
  allocation_amount numeric(19,4),
  effective_from date not null,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, expense_id) references public.expenses(organization_id, id) on delete cascade,
  foreign key (organization_id, cost_center_id) references public.cost_centers(organization_id, id) on delete restrict,
  foreign key (organization_id, recipe_id) references public.recipes(organization_id, id) on delete restrict,
  constraint allocation_rules_method check (method in ('production_hours', 'labor_hours', 'units_produced', 'revenue', 'manual_rate', 'fixed_amount')),
  constraint allocation_rules_value check ((method = 'fixed_amount' and allocation_amount is not null and allocation_amount >= 0 and allocation_rate is null) or (method <> 'fixed_amount' and allocation_rate is not null and allocation_rate > 0 and allocation_rate <= 1 and allocation_amount is null)),
  constraint allocation_rules_dates check (effective_to is null or effective_to >= effective_from)
);

create table public.sales_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid,
  name text not null,
  channel_type text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id),
  unique (organization_id, name),
  foreign key (organization_id, branch_id) references public.branches(organization_id, id) on delete restrict,
  constraint sales_channels_type check (channel_type in ('in_store', 'direct_delivery', 'marketplace', 'wholesale', 'direct_order', 'other')),
  constraint sales_channels_status check (status in ('active', 'inactive'))
);

create table public.channel_fees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  sales_channel_id uuid not null,
  name text not null,
  fee_type text not null,
  percentage_rate numeric(9,6),
  fixed_amount numeric(19,4),
  effective_from date not null,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, sales_channel_id) references public.sales_channels(organization_id, id) on delete cascade,
  constraint channel_fees_type check (fee_type in ('payment', 'marketplace_commission', 'delivery', 'cashback', 'royalty', 'other')),
  constraint channel_fees_value check ((percentage_rate is not null and percentage_rate >= 0 and percentage_rate < 1 and fixed_amount is null) or (fixed_amount is not null and fixed_amount >= 0 and percentage_rate is null)),
  constraint channel_fees_dates check (effective_to is null or effective_to >= effective_from)
);

create table public.taxes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sales_channel_id uuid,
  name text not null,
  rate numeric(9,6) not null,
  effective_from date not null,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, sales_channel_id) references public.sales_channels(organization_id, id) on delete cascade,
  constraint taxes_rate check (rate >= 0 and rate < 1),
  constraint taxes_dates check (effective_to is null or effective_to >= effective_from)
);

create table public.recipe_packaging (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  recipe_version_id uuid not null,
  packaging_item_id uuid not null,
  sales_channel_id uuid,
  quantity numeric(20,6) not null,
  unit_cost_snapshot numeric(19,6) not null default 0,
  total_cost_snapshot numeric(19,4) generated always as (round((quantity * unit_cost_snapshot)::numeric, 4)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (recipe_version_id, packaging_item_id, sales_channel_id),
  foreign key (organization_id, recipe_version_id) references public.recipe_versions(organization_id, id) on delete cascade,
  foreign key (organization_id, packaging_item_id) references public.packaging_items(organization_id, id) on delete restrict,
  foreign key (organization_id, sales_channel_id) references public.sales_channels(organization_id, id) on delete restrict,
  constraint recipe_packaging_values check (quantity > 0 and unit_cost_snapshot >= 0)
);

create table public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  recipe_id uuid not null,
  sales_channel_id uuid not null,
  name text not null,
  minimum_quantity numeric(20,6) not null default 1,
  maximum_quantity numeric(20,6),
  target_margin_rate numeric(9,6) not null,
  minimum_margin_rate numeric(9,6) not null default 0,
  discount_rate numeric(9,6) not null default 0,
  promotional_price numeric(19,4),
  valid_from timestamptz,
  valid_to timestamptz,
  priority integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, recipe_id) references public.recipes(organization_id, id) on delete cascade,
  foreign key (organization_id, sales_channel_id) references public.sales_channels(organization_id, id) on delete cascade,
  constraint pricing_rules_quantities check (minimum_quantity > 0 and (maximum_quantity is null or maximum_quantity >= minimum_quantity)),
  constraint pricing_rules_margins check (target_margin_rate >= 0 and target_margin_rate < 1 and minimum_margin_rate >= 0 and minimum_margin_rate < 1 and minimum_margin_rate <= target_margin_rate),
  constraint pricing_rules_discount check (discount_rate >= 0 and discount_rate < 1),
  constraint pricing_rules_promo check (promotional_price is null or promotional_price >= 0),
  constraint pricing_rules_dates check (valid_to is null or valid_from is null or valid_to >= valid_from),
  constraint pricing_rules_status check (status in ('active', 'inactive'))
);
create index pricing_rules_lookup_idx on public.pricing_rules (recipe_id, sales_channel_id, minimum_quantity, priority desc) where deleted_at is null and status = 'active';

create table public.product_prices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  recipe_version_id uuid not null,
  sales_channel_id uuid not null,
  pricing_rule_id uuid,
  cost_snapshot numeric(19,4) not null,
  fixed_charges_snapshot numeric(19,4) not null default 0,
  percentage_charges_snapshot numeric(9,6) not null default 0,
  target_margin_snapshot numeric(9,6) not null,
  minimum_price numeric(19,4) not null,
  suggested_price numeric(19,4) not null,
  current_price numeric(19,4),
  notes text,
  currency_code text not null default 'BRL',
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, recipe_version_id) references public.recipe_versions(organization_id, id) on delete restrict,
  foreign key (organization_id, sales_channel_id) references public.sales_channels(organization_id, id) on delete restrict,
  foreign key (organization_id, pricing_rule_id) references public.pricing_rules(organization_id, id) on delete restrict,
  constraint product_prices_costs check (cost_snapshot >= 0 and fixed_charges_snapshot >= 0),
  constraint product_prices_rates check (percentage_charges_snapshot >= 0 and percentage_charges_snapshot < 1 and target_margin_snapshot >= 0 and target_margin_snapshot < 1 and percentage_charges_snapshot + target_margin_snapshot < 1),
  constraint product_prices_values check (minimum_price >= 0 and suggested_price >= minimum_price and (current_price is null or current_price >= 0)),
  constraint product_prices_currency check (currency_code ~ '^[A-Z]{3}$'),
  constraint product_prices_dates check (effective_to is null or effective_to >= effective_from)
);
create index product_prices_timeline_idx on public.product_prices (recipe_version_id, sales_channel_id, effective_from desc);

create or replace function app.calculate_selling_price(
  monetary_cost numeric,
  fixed_charges numeric,
  percentage_charges numeric,
  target_margin numeric
)
returns numeric
language plpgsql
immutable
set search_path = ''
as $$
begin
  if monetary_cost < 0 or fixed_charges < 0 then
    raise exception 'Costs cannot be negative' using errcode = '22003';
  end if;
  if percentage_charges < 0 or target_margin < 0 or percentage_charges + target_margin >= 1 then
    raise exception 'Percentage charges plus margin must be between 0 and 1 (exclusive)' using errcode = '22003';
  end if;
  return round((monetary_cost + fixed_charges) / (1 - percentage_charges - target_margin), 2);
end;
$$;

create or replace function app.guard_recipe_version_children()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare target_version uuid := coalesce(new.recipe_version_id, old.recipe_version_id);
begin
  if not exists (select 1 from public.recipe_versions rv where rv.id = target_version and rv.status = 'draft') then
    raise exception 'Published or archived recipe versions are immutable' using errcode = '55000';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function app.validate_recipe_current_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.current_version_id is not null and not exists (
    select 1 from public.recipe_versions rv
    where rv.id=new.current_version_id and rv.organization_id=new.organization_id and rv.recipe_id=new.id and rv.status='published'
  ) then
    raise exception 'Current version must be a published version of the same recipe' using errcode='23514';
  end if;
  return new;
end;
$$;

create or replace function app.guard_recipe_version_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status in ('published', 'archived') and new is distinct from old then
    raise exception 'Published or archived recipe versions are immutable' using errcode = '55000';
  end if;
  return new;
end;
$$;

create or replace function app.prevent_recipe_cycle()
returns trigger
language plpgsql
set search_path = ''
as $$
declare parent_recipe_id uuid;
begin
  select rv.recipe_id into parent_recipe_id from public.recipe_versions rv where rv.id = new.recipe_version_id;
  if exists (
    with recursive dependencies(version_id, recipe_id) as (
      select rv.id, rv.recipe_id from public.recipe_versions rv where rv.id = new.sub_recipe_version_id
      union
      select child.id, child.recipe_id
      from dependencies d
      join public.recipe_sub_recipes rs on rs.recipe_version_id = d.version_id
      join public.recipe_versions child on child.id = rs.sub_recipe_version_id
      where rs.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    )
    select 1 from dependencies where recipe_id = parent_recipe_id
  ) then
    raise exception 'Circular sub-recipe dependency is not allowed' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger recipe_versions_guard before update on public.recipe_versions
for each row execute function app.guard_recipe_version_update();
create trigger recipes_validate_current_version before insert or update of current_version_id on public.recipes
for each row execute function app.validate_recipe_current_version();
create trigger recipe_sub_recipes_no_cycle before insert or update on public.recipe_sub_recipes
for each row execute function app.prevent_recipe_cycle();

do $$
declare t text;
begin
  foreach t in array array['recipe_ingredients','recipe_sub_recipes','recipe_packaging'] loop
    execute format('create trigger %I_draft_guard before insert or update or delete on public.%I for each row execute function app.guard_recipe_version_children()', t, t);
  end loop;
end $$;

create trigger recipe_versions_validate_unit before insert or update on public.recipe_versions
for each row execute function app.validate_units_belong_to_organization('yield_unit_id');
create trigger recipe_ingredients_validate_unit before insert or update on public.recipe_ingredients
for each row execute function app.validate_units_belong_to_organization('unit_id');
create trigger recipe_sub_recipes_validate_unit before insert or update on public.recipe_sub_recipes
for each row execute function app.validate_units_belong_to_organization('unit_id');

do $$
declare t text;
begin
  foreach t in array array[
    'recipes','recipe_versions','recipe_ingredients','recipe_sub_recipes','recipe_packaging',
    'cost_centers','expenses','allocation_rules','sales_channels','channel_fees','taxes','pricing_rules'
  ] loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function app.set_updated_at()', t, t);
  end loop;
end $$;

create trigger product_prices_immutable before update or delete on public.product_prices
for each row execute function app.prevent_immutable_history_change();

grant execute on function app.calculate_selling_price(numeric, numeric, numeric, numeric) to authenticated, service_role;
