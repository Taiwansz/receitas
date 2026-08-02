-- Inventory ledger, production, scenarios, alerts, attachments and audit trail.

create table public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null,
  name text not null,
  location_type text not null default 'storage',
  allow_negative_stock boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id),
  unique (organization_id, branch_id, name),
  foreign key (organization_id, branch_id) references public.branches(organization_id, id) on delete restrict,
  constraint inventory_locations_type check (location_type in ('storage', 'production', 'waste', 'transit')),
  constraint inventory_locations_status check (status in ('active', 'inactive'))
);

create table public.inventory_balances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  inventory_location_id uuid not null,
  ingredient_id uuid not null,
  lot_code text not null default '',
  expiration_date date not null default 'infinity'::date,
  quantity numeric(20,6) not null default 0,
  weighted_average_cost numeric(19,6) not null default 0,
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (inventory_location_id, ingredient_id, lot_code, expiration_date),
  foreign key (organization_id, inventory_location_id) references public.inventory_locations(organization_id, id) on delete cascade,
  foreign key (organization_id, ingredient_id) references public.ingredients(organization_id, id) on delete restrict,
  constraint inventory_balances_cost check (weighted_average_cost >= 0)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  inventory_location_id uuid not null,
  ingredient_id uuid not null,
  movement_type text not null,
  quantity numeric(20,6) not null,
  unit_cost_snapshot numeric(19,6) not null,
  resulting_quantity numeric(20,6) not null,
  resulting_weighted_average_cost numeric(19,6) not null,
  lot_code text not null default '',
  expiration_date date not null default 'infinity'::date,
  occurred_at timestamptz not null default now(),
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, inventory_location_id) references public.inventory_locations(organization_id, id) on delete restrict,
  foreign key (organization_id, ingredient_id) references public.ingredients(organization_id, id) on delete restrict,
  constraint stock_movements_type check (movement_type in ('opening_balance', 'purchase_receipt', 'production_consumption', 'production_loss', 'adjustment_in', 'adjustment_out', 'transfer_in', 'transfer_out', 'return_in', 'return_out')),
  constraint stock_movements_quantity check (quantity <> 0),
  constraint stock_movements_cost check (unit_cost_snapshot >= 0 and resulting_weighted_average_cost >= 0),
  constraint stock_movements_reference check ((reference_type is null) = (reference_id is null))
);
create index stock_movements_ingredient_timeline_idx on public.stock_movements (ingredient_id, occurred_at desc);
create index stock_movements_reference_idx on public.stock_movements (reference_type, reference_id) where reference_id is not null;

create table public.production_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  branch_id uuid not null,
  inventory_location_id uuid not null,
  recipe_version_id uuid not null,
  batch_code text not null,
  status text not null default 'planned',
  planned_quantity numeric(20,6) not null,
  actual_quantity numeric(20,6),
  planned_yield numeric(20,6) not null,
  actual_yield numeric(20,6),
  planned_cost numeric(19,4) not null default 0,
  actual_cost numeric(19,4),
  planned_start_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  expiration_date date,
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id),
  unique (organization_id, batch_code),
  foreign key (organization_id, branch_id) references public.branches(organization_id, id) on delete restrict,
  foreign key (organization_id, inventory_location_id) references public.inventory_locations(organization_id, id) on delete restrict,
  foreign key (organization_id, recipe_version_id) references public.recipe_versions(organization_id, id) on delete restrict,
  constraint production_batches_status check (status in ('planned', 'in_progress', 'completed', 'cancelled')),
  constraint production_batches_quantities check (planned_quantity > 0 and (actual_quantity is null or actual_quantity >= 0) and planned_yield > 0 and (actual_yield is null or actual_yield >= 0)),
  constraint production_batches_costs check (planned_cost >= 0 and (actual_cost is null or actual_cost >= 0)),
  constraint production_batches_dates check ((started_at is null or planned_start_at is null or started_at >= planned_start_at) and (completed_at is null or started_at is null or completed_at >= started_at)),
  constraint production_batches_completed check ((status = 'completed' and completed_at is not null and actual_quantity is not null and actual_yield is not null and actual_cost is not null) or status <> 'completed')
);

create table public.production_consumption (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  production_batch_id uuid not null,
  ingredient_id uuid not null,
  planned_quantity numeric(20,6) not null,
  actual_quantity numeric(20,6),
  unit_cost_snapshot numeric(19,6) not null,
  stock_movement_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (production_batch_id, ingredient_id),
  foreign key (organization_id, production_batch_id) references public.production_batches(organization_id, id) on delete cascade,
  foreign key (organization_id, ingredient_id) references public.ingredients(organization_id, id) on delete restrict,
  foreign key (organization_id, stock_movement_id) references public.stock_movements(organization_id, id) on delete restrict,
  constraint production_consumption_values check (planned_quantity > 0 and (actual_quantity is null or actual_quantity >= 0) and unit_cost_snapshot >= 0)
);

create table public.production_losses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  production_batch_id uuid not null,
  ingredient_id uuid,
  loss_type text not null,
  quantity numeric(20,6) not null,
  unit_cost_snapshot numeric(19,6) not null default 0,
  reason text,
  stock_movement_id uuid,
  recorded_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, production_batch_id) references public.production_batches(organization_id, id) on delete cascade,
  foreign key (organization_id, ingredient_id) references public.ingredients(organization_id, id) on delete restrict,
  foreign key (organization_id, stock_movement_id) references public.stock_movements(organization_id, id) on delete restrict,
  constraint production_losses_type check (loss_type in ('preparation', 'cooking', 'spoilage', 'quality_rejection', 'unusable_leftover', 'other')),
  constraint production_losses_values check (quantity > 0 and unit_cost_snapshot >= 0)
);

create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid,
  name text not null,
  scenario_type text not null,
  assumptions jsonb not null,
  results jsonb,
  status text not null default 'draft',
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  calculated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, branch_id) references public.branches(organization_id, id) on delete restrict,
  constraint scenarios_type check (scenario_type in ('conservative', 'expected', 'optimistic', 'custom', 'break_even')),
  constraint scenarios_json check (jsonb_typeof(assumptions) = 'object' and (results is null or jsonb_typeof(results) = 'object')),
  constraint scenarios_status check (status in ('draft', 'calculated', 'archived')),
  constraint scenarios_calculated check ((status = 'calculated' and calculated_at is not null and results is not null) or status <> 'calculated')
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid,
  alert_type text not null,
  severity text not null,
  title text not null,
  message text not null,
  entity_type text,
  entity_id uuid,
  status text not null default 'open',
  detected_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, branch_id) references public.branches(organization_id, id) on delete restrict,
  constraint alerts_type check (alert_type in ('low_stock', 'expiration', 'cost_increase', 'negative_margin', 'price_below_minimum', 'production_variance', 'data_quality', 'other')),
  constraint alerts_severity check (severity in ('info', 'warning', 'critical')),
  constraint alerts_status check (status in ('open', 'acknowledged', 'resolved', 'dismissed')),
  constraint alerts_entity check ((entity_type is null) = (entity_id is null)),
  constraint alerts_ack check ((status = 'acknowledged' and acknowledged_at is not null and acknowledged_by is not null) or status <> 'acknowledged'),
  constraint alerts_resolved check ((status = 'resolved' and resolved_at is not null) or status <> 'resolved')
);
create index alerts_open_idx on public.alerts (organization_id, severity, detected_at desc) where status in ('open', 'acknowledged');

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid,
  entity_type text not null,
  entity_id uuid not null,
  bucket_id text not null default 'business-attachments',
  object_path text not null,
  original_filename text not null,
  mime_type text not null,
  byte_size bigint not null,
  checksum_sha256 text,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id),
  unique (bucket_id, object_path),
  foreign key (organization_id, branch_id) references public.branches(organization_id, id) on delete restrict,
  constraint attachments_entity_type check (entity_type in ('purchase', 'supplier', 'ingredient', 'recipe', 'production_batch', 'expense', 'other')),
  constraint attachments_bucket check (bucket_id = 'business-attachments'),
  constraint attachments_size check (byte_size > 0 and byte_size <= 26214400),
  constraint attachments_checksum check (checksum_sha256 is null or checksum_sha256 ~ '^[a-f0-9]{64}$'),
  constraint attachments_path check (object_path like organization_id::text || '/' || id::text || '/%'),
  constraint attachments_filename check (char_length(original_filename) between 1 and 255)
);
create index attachments_entity_idx on public.attachments (organization_id, entity_type, entity_id) where deleted_at is null;

create table public.custiva_audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  branch_id uuid,
  table_name text not null,
  row_id uuid,
  operation text not null,
  old_values jsonb,
  new_values jsonb,
  changed_by uuid references auth.users(id) on delete set null,
  request_id text,
  changed_at timestamptz not null default now(),
  foreign key (organization_id, branch_id) references public.branches(organization_id, id) on delete restrict,
  constraint custiva_audit_logs_operation check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  constraint custiva_audit_logs_payload check (old_values is not null or new_values is not null)
);
create index custiva_audit_logs_entity_idx on public.custiva_audit_logs (organization_id, table_name, row_id, changed_at desc);
create index custiva_audit_logs_actor_idx on public.custiva_audit_logs (organization_id, changed_by, changed_at desc);

create or replace function app.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_row jsonb := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end;
  after_row jsonb := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end;
  source_row jsonb := coalesce(after_row, before_row);
  target_org uuid;
  target_branch uuid;
  target_id uuid;
begin
  target_org := coalesce(nullif(source_row ->> 'organization_id', '')::uuid,
                         case when tg_table_name = 'organizations' then nullif(source_row ->> 'id', '')::uuid else null end);
  if target_org is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  target_branch := nullif(source_row ->> 'branch_id', '')::uuid;
  target_id := nullif(source_row ->> 'id', '')::uuid;
  insert into public.custiva_audit_logs (
    organization_id, branch_id, table_name, row_id, operation,
    old_values, new_values, changed_by, request_id
  ) values (
    target_org, target_branch, tg_table_name, target_id, tg_op,
    before_row, after_row, auth.uid(), nullif(nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-request-id', '')
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function app.apply_stock_movement(
  target_organization_id uuid,
  target_location_id uuid,
  target_ingredient_id uuid,
  movement_kind text,
  movement_quantity numeric,
  movement_unit_cost numeric,
  movement_lot_code text default '',
  movement_expiration_date date default 'infinity'::date,
  movement_reference_type text default null,
  movement_reference_id uuid default null,
  movement_notes text default null,
  movement_occurred_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  balance_row public.inventory_balances%rowtype;
  location_row public.inventory_locations%rowtype;
  next_quantity numeric(20,6);
  next_cost numeric(19,6);
  movement_id uuid := gen_random_uuid();
begin
  if not app.has_permission(target_organization_id, 'inventory.write') then
    raise exception 'Insufficient inventory permission' using errcode = '42501';
  end if;
  if movement_quantity = 0 or movement_unit_cost < 0 then
    raise exception 'Invalid movement quantity or cost' using errcode = '22003';
  end if;
  select * into location_row from public.inventory_locations
  where id = target_location_id and organization_id = target_organization_id and status = 'active' and deleted_at is null;
  if not found or not app.can_access_branch(target_organization_id, location_row.branch_id) then
    raise exception 'Inventory location is unavailable' using errcode = '42501';
  end if;
  if not exists (select 1 from public.ingredients i where i.id = target_ingredient_id and i.organization_id = target_organization_id and i.deleted_at is null) then
    raise exception 'Ingredient is unavailable' using errcode = '23503';
  end if;

  insert into public.inventory_balances (
    organization_id, inventory_location_id, ingredient_id, lot_code, expiration_date
  ) values (
    target_organization_id, target_location_id, target_ingredient_id,
    coalesce(movement_lot_code, ''), coalesce(movement_expiration_date, 'infinity'::date)
  ) on conflict (inventory_location_id, ingredient_id, lot_code, expiration_date) do nothing;

  select * into balance_row from public.inventory_balances
  where inventory_location_id = target_location_id
    and ingredient_id = target_ingredient_id
    and lot_code = coalesce(movement_lot_code, '')
    and expiration_date = coalesce(movement_expiration_date, 'infinity'::date)
  for update;

  next_quantity := balance_row.quantity + movement_quantity;
  if next_quantity < 0 and not location_row.allow_negative_stock then
    raise exception 'Movement would create negative stock' using errcode = '23514';
  end if;
  if movement_quantity > 0 and next_quantity > 0 then
    next_cost := round(((balance_row.quantity * balance_row.weighted_average_cost) + (movement_quantity * movement_unit_cost)) / next_quantity, 6);
  else
    next_cost := balance_row.weighted_average_cost;
  end if;

  update public.inventory_balances
  set quantity = next_quantity, weighted_average_cost = next_cost, updated_at = now()
  where id = balance_row.id;

  insert into public.stock_movements (
    id, organization_id, inventory_location_id, ingredient_id, movement_type, quantity,
    unit_cost_snapshot, resulting_quantity, resulting_weighted_average_cost,
    lot_code, expiration_date, occurred_at, reference_type, reference_id, notes
  ) values (
    movement_id, target_organization_id, target_location_id, target_ingredient_id, movement_kind, movement_quantity,
    movement_unit_cost, next_quantity, next_cost, coalesce(movement_lot_code, ''),
    coalesce(movement_expiration_date, 'infinity'::date), movement_occurred_at,
    movement_reference_type, movement_reference_id, movement_notes
  );
  return movement_id;
end;
$$;

create or replace function app.receive_purchase(target_purchase_id uuid, target_location_id uuid, receipt_time timestamptz default now())
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  purchase_row public.purchases%rowtype;
  location_branch uuid;
  line public.purchase_items%rowtype;
  totals record;
begin
  select * into purchase_row from public.purchases where id = target_purchase_id for update;
  if not found or purchase_row.deleted_at is not null then raise exception 'Purchase not found' using errcode = 'P0002'; end if;
  if not app.has_branch_permission(purchase_row.organization_id, purchase_row.branch_id, 'purchases.write')
     or not app.has_branch_permission(purchase_row.organization_id, purchase_row.branch_id, 'inventory.write') then
    raise exception 'Insufficient purchase/inventory permission' using errcode = '42501';
  end if;
  if purchase_row.status <> 'draft' then raise exception 'Only draft purchases can be received' using errcode = '55000'; end if;
  select branch_id into location_branch from public.inventory_locations
    where id = target_location_id and organization_id = purchase_row.organization_id and status = 'active' and deleted_at is null;
  if not found or location_branch <> purchase_row.branch_id then raise exception 'Inventory location must belong to purchase branch' using errcode = '23514'; end if;
  if not exists (select 1 from public.purchase_items where purchase_id = target_purchase_id) then
    raise exception 'Purchase must contain at least one item' using errcode = '23514';
  end if;
  select coalesce(sum(discount_amount),0) discount, coalesce(sum(freight_amount),0) freight,
         coalesce(sum(tax_amount),0) tax, coalesce(sum(additional_fee_amount),0) fees
    into totals from public.purchase_items where purchase_id = target_purchase_id;
  if totals.discount <> purchase_row.header_discount or totals.freight <> purchase_row.freight_total
     or totals.tax <> purchase_row.tax_total or totals.fees <> purchase_row.additional_fees_total then
    raise exception 'Header amounts must be fully allocated among purchase items' using errcode = '23514';
  end if;

  for line in select * from public.purchase_items where purchase_id = target_purchase_id order by id loop
    insert into public.ingredient_price_history (
      organization_id, ingredient_id, supplier_id, purchase_item_id, effective_at, source,
      currency_code, acquisition_cost, usable_quantity, base_unit_cost
    ) values (
      purchase_row.organization_id, line.ingredient_id, purchase_row.supplier_id, line.id,
      receipt_time, 'purchase', purchase_row.currency_code, line.total_cost, line.usable_quantity*line.unit_to_base_factor, line.cost_per_usable_unit
    );
    perform app.apply_stock_movement(
      purchase_row.organization_id, target_location_id, line.ingredient_id, 'purchase_receipt',
      line.usable_quantity*line.unit_to_base_factor, line.cost_per_usable_unit, coalesce(line.lot_code,''),
      coalesce(line.expiration_date,'infinity'::date), 'purchase', purchase_row.id, null, receipt_time
    );
  end loop;
  perform set_config('app.receiving_purchase', 'true', true);
  update public.purchases set status = 'received', received_at = receipt_time where id = target_purchase_id;
end;
$$;

create or replace function app.enforce_purchase_receipt_workflow()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'draft' and new.status = 'received'
     and current_setting('app.receiving_purchase', true) is distinct from 'true' then
    raise exception 'Use app.receive_purchase() to receive a purchase atomically' using errcode = '55000';
  end if;
  return new;
end;
$$;
create trigger purchases_receipt_workflow before update on public.purchases
for each row execute function app.enforce_purchase_receipt_workflow();

create or replace function app.validate_production_batch_scope()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.inventory_locations l where l.id=new.inventory_location_id and l.organization_id=new.organization_id and l.branch_id=new.branch_id) then
    raise exception 'Production inventory location must belong to the batch branch' using errcode='23514';
  end if;
  if not exists(select 1 from public.recipe_versions rv join public.recipes r on r.id=rv.recipe_id
    where rv.id=new.recipe_version_id and rv.organization_id=new.organization_id and (r.branch_id is null or r.branch_id=new.branch_id)) then
    raise exception 'Recipe version is unavailable to the batch branch' using errcode='23514';
  end if;
  return new;
end; $$;
create trigger production_batches_validate_scope before insert or update on public.production_batches
for each row execute function app.validate_production_batch_scope();

create trigger stock_movements_immutable before update or delete on public.stock_movements
for each row execute function app.prevent_immutable_history_change();
create trigger custiva_audit_logs_immutable before update or delete on public.custiva_audit_logs
for each row execute function app.prevent_immutable_history_change();

do $$
declare t text;
begin
  foreach t in array array[
    'inventory_locations','production_batches','production_consumption','scenarios','alerts'
  ] loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function app.set_updated_at()', t, t);
  end loop;
end $$;

revoke all on function app.apply_stock_movement(uuid,uuid,uuid,text,numeric,numeric,text,date,text,uuid,text,timestamptz) from public;
revoke all on function app.receive_purchase(uuid,uuid,timestamptz) from public;
grant execute on function app.apply_stock_movement(uuid,uuid,uuid,text,numeric,numeric,text,date,text,uuid,text,timestamptz) to authenticated, service_role;
grant execute on function app.receive_purchase(uuid,uuid,timestamptz) to authenticated, service_role;
