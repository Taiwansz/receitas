-- Additional transactional contracts used by operational frontend modules.

create or replace function public.save_supplier(p_id uuid,p_name text,p_tax_id text,p_email text,p_phone text,p_active boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare target_org uuid:=app.current_workspace_org(); target_id uuid:=coalesce(p_id,gen_random_uuid());
begin
  if target_org is null or not app.has_permission(target_org,'ingredients.write') then raise exception 'Forbidden' using errcode='42501'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'Supplier name is required' using errcode='22023'; end if;
  insert into public.suppliers(id,organization_id,legal_name,tax_id,email,phone,status)
  values(target_id,target_org,trim(p_name),nullif(trim(p_tax_id),''),nullif(trim(p_email),''),nullif(trim(p_phone),''),case when p_active then 'active' else 'inactive' end)
  on conflict(id) do update set legal_name=excluded.legal_name,tax_id=excluded.tax_id,email=excluded.email,phone=excluded.phone,status=excluded.status,deleted_at=null
  where public.suppliers.organization_id=target_org;
  if not exists(select 1 from public.suppliers where id=target_id and organization_id=target_org) then raise exception 'Supplier not found or forbidden' using errcode='42501'; end if;
  return target_id;
end; $$;

create or replace function public.soft_delete_supplier(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare target_org uuid:=app.current_workspace_org();
begin
  if not app.has_permission(target_org,'ingredients.write') then raise exception 'Forbidden' using errcode='42501'; end if;
  update public.suppliers set status='inactive',deleted_at=now() where id=p_id and organization_id=target_org;
  if not found then raise exception 'Supplier not found' using errcode='P0002'; end if;
end; $$;

create or replace function public.save_packaging(p_id uuid,p_name text,p_sku text,p_unit_code text,p_unit_cost numeric,p_minimum_stock numeric,p_active boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare target_org uuid:=app.current_workspace_org(); target_id uuid:=coalesce(p_id,gen_random_uuid()); target_unit uuid;
begin
  if not app.has_permission(target_org,'ingredients.write') then raise exception 'Forbidden' using errcode='42501'; end if;
  if nullif(trim(p_name),'') is null or p_unit_cost<0 or p_minimum_stock<0 then raise exception 'Invalid packaging values' using errcode='22023'; end if;
  select id into target_unit from public.measurement_units where code=p_unit_code and deleted_at is null and (organization_id is null or organization_id=target_org)
    order by (organization_id=target_org) desc limit 1;
  if target_unit is null then raise exception 'Unknown unit code' using errcode='22023'; end if;
  insert into public.packaging_items(id,organization_id,name,sku,unit_id,current_unit_cost,minimum_stock,status)
  values(target_id,target_org,trim(p_name),nullif(trim(p_sku),''),target_unit,p_unit_cost,p_minimum_stock,case when p_active then 'active' else 'inactive' end)
  on conflict(id) do update set name=excluded.name,sku=excluded.sku,unit_id=excluded.unit_id,current_unit_cost=excluded.current_unit_cost,
    minimum_stock=excluded.minimum_stock,status=excluded.status,deleted_at=null where public.packaging_items.organization_id=target_org;
  if not exists(select 1 from public.packaging_items where id=target_id and organization_id=target_org) then raise exception 'Packaging not found or forbidden' using errcode='42501'; end if;
  return target_id;
end; $$;

create or replace function public.save_expense(p_id uuid,p_name text,p_category text,p_behavior text,p_attribution text,p_amount numeric,p_recurrence text,p_effective_from date,p_active boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare target_org uuid:=app.current_workspace_org(); target_branch uuid:=app.current_workspace_branch(target_org); target_id uuid:=coalesce(p_id,gen_random_uuid());
begin
  if not app.has_branch_permission(target_org,target_branch,'costs.write') then raise exception 'Forbidden' using errcode='42501'; end if;
  insert into public.expenses(id,organization_id,branch_id,name,category,behavior,attribution,amount,recurrence,effective_from,status)
  values(target_id,target_org,target_branch,trim(p_name),p_category,p_behavior,p_attribution,p_amount,p_recurrence,p_effective_from,case when p_active then 'active' else 'inactive' end)
  on conflict(id) do update set name=excluded.name,category=excluded.category,behavior=excluded.behavior,attribution=excluded.attribution,
    amount=excluded.amount,recurrence=excluded.recurrence,effective_from=excluded.effective_from,status=excluded.status,deleted_at=null
  where public.expenses.organization_id=target_org;
  if not found then raise exception 'Expense not found or invalid' using errcode='22023'; end if;
  return target_id;
end; $$;

create or replace function public.create_sales_channel(p_name text,p_channel_type text,p_percentage_fee numeric default 0,p_fixed_fee numeric default 0)
returns uuid language plpgsql security definer set search_path='' as $$
declare target_org uuid:=app.current_workspace_org(); target_branch uuid:=app.current_workspace_branch(target_org); target_id uuid:=gen_random_uuid();
begin
  if not app.has_branch_permission(target_org,target_branch,'pricing.write') then raise exception 'Forbidden' using errcode='42501'; end if;
  if nullif(trim(p_name),'') is null or p_percentage_fee<0 or p_percentage_fee>=100 or p_fixed_fee<0 or (p_percentage_fee>0 and p_fixed_fee>0) then
    raise exception 'Use either a percentage fee or a fixed fee' using errcode='22023';
  end if;
  insert into public.sales_channels(id,organization_id,branch_id,name,channel_type) values(target_id,target_org,target_branch,trim(p_name),p_channel_type);
  if p_percentage_fee>0 then
    insert into public.channel_fees(organization_id,sales_channel_id,name,fee_type,percentage_rate,effective_from)
    values(target_org,target_id,'Taxa padrão','other',p_percentage_fee/100,current_date);
  elsif p_fixed_fee>0 then
    insert into public.channel_fees(organization_id,sales_channel_id,name,fee_type,fixed_amount,effective_from)
    values(target_org,target_id,'Taxa padrão','other',p_fixed_fee,current_date);
  end if;
  return target_id;
end; $$;

create or replace function public.register_purchase(p_supplier_id uuid,p_document text,p_purchased_at timestamptz,p_items jsonb,p_freight numeric,p_tax numeric,p_discount numeric)
returns uuid language plpgsql security definer set search_path='' as $$
declare target_org uuid:=app.current_workspace_org(); target_branch uuid:=app.current_workspace_branch(target_org); target_location uuid; purchase_id uuid:=gen_random_uuid();
  item jsonb; line_no integer:=0; line_count integer; gross_total numeric:=0; line_value numeric; allocated_freight numeric:=0; allocated_tax numeric:=0; allocated_discount numeric:=0;
  this_freight numeric; this_tax numeric; this_discount numeric; ingredient_id uuid; unit_id uuid; qty numeric; net_qty numeric; usable_qty numeric; unit_price numeric;
begin
  if not app.has_branch_permission(target_org,target_branch,'purchases.write') or not app.has_branch_permission(target_org,target_branch,'inventory.write') then raise exception 'Forbidden' using errcode='42501'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 or least(p_freight,p_tax,p_discount)<0 then raise exception 'Invalid purchase values' using errcode='22023'; end if;
  if p_supplier_id is not null and not exists(select 1 from public.suppliers where id=p_supplier_id and organization_id=target_org and deleted_at is null) then raise exception 'Supplier unavailable' using errcode='42501'; end if;
  select id into target_location from public.inventory_locations where organization_id=target_org and branch_id=target_branch and status='active' and deleted_at is null order by created_at,id limit 1;
  if target_location is null then raise exception 'Active inventory location required' using errcode='23514'; end if;
  select count(*),sum((value->>'quantity')::numeric*(value->>'unit_price')::numeric) into line_count,gross_total from jsonb_array_elements(p_items);
  if gross_total<=0 or p_discount>gross_total+p_freight+p_tax then raise exception 'Invalid purchase totals' using errcode='22023'; end if;
  insert into public.purchases(id,organization_id,branch_id,supplier_id,document_number,purchased_at,status,header_discount,freight_total,tax_total)
  values(purchase_id,target_org,target_branch,p_supplier_id,nullif(trim(p_document),''),coalesce(p_purchased_at,now()),'draft',p_discount,p_freight,p_tax);
  for item in select value from jsonb_array_elements(p_items) loop
    line_no:=line_no+1; ingredient_id:=(item->>'ingredient_id')::uuid; qty:=(item->>'quantity')::numeric;
    net_qty:=coalesce(nullif(item->>'net_quantity','')::numeric,qty); usable_qty:=coalesce(nullif(item->>'usable_quantity','')::numeric,net_qty); unit_price:=(item->>'unit_price')::numeric;
    if not app.can_access_ingredient(target_org,ingredient_id,'ingredients.read') or qty<=0 or unit_price<0 then raise exception 'Invalid purchase item' using errcode='22023'; end if;
    select id into unit_id from public.measurement_units where code=item->>'unit_code' and deleted_at is null and (organization_id is null or organization_id=target_org) order by (organization_id=target_org) desc limit 1;
    if unit_id is null then raise exception 'Unknown purchase unit' using errcode='22023'; end if;
    line_value:=qty*unit_price;
    if line_no=line_count then
      this_freight:=p_freight-allocated_freight; this_tax:=p_tax-allocated_tax; this_discount:=p_discount-allocated_discount;
    else
      this_freight:=round(p_freight*line_value/gross_total,4); this_tax:=round(p_tax*line_value/gross_total,4); this_discount:=round(p_discount*line_value/gross_total,4);
      allocated_freight:=allocated_freight+this_freight; allocated_tax:=allocated_tax+this_tax; allocated_discount:=allocated_discount+this_discount;
    end if;
    insert into public.purchase_items(organization_id,purchase_id,ingredient_id,purchase_unit_id,gross_quantity,net_quantity,usable_quantity,unit_price,
      discount_amount,freight_amount,tax_amount,expiration_date,lot_code)
    values(target_org,purchase_id,ingredient_id,unit_id,qty,net_qty,usable_qty,unit_price,this_discount,this_freight,this_tax,
      nullif(item->>'expiration_date','')::date,nullif(item->>'lot_code',''));
  end loop;
  perform app.receive_purchase(purchase_id,target_location,now());
  return purchase_id;
end; $$;

create or replace function public.register_inventory_adjustment(p_ingredient_id uuid,p_quantity_delta numeric,p_unit_cost numeric,p_notes text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare target_org uuid:=app.current_workspace_org(); target_branch uuid:=app.current_workspace_branch(target_org); target_location uuid;
begin
  if p_quantity_delta=0 or p_unit_cost<0 or not app.has_branch_permission(target_org,target_branch,'inventory.write') then raise exception 'Invalid or forbidden adjustment' using errcode='42501'; end if;
  if not app.can_access_ingredient(target_org,p_ingredient_id,'ingredients.read') then raise exception 'Ingredient unavailable' using errcode='42501'; end if;
  select id into target_location from public.inventory_locations where organization_id=target_org and branch_id=target_branch and status='active' and deleted_at is null order by created_at,id limit 1;
  return app.apply_stock_movement(target_org,target_location,p_ingredient_id,case when p_quantity_delta>0 then 'adjustment_in' else 'adjustment_out' end,
    p_quantity_delta,p_unit_cost,'','infinity'::date,'ingredient',p_ingredient_id,p_notes,now());
end; $$;

create or replace function public.register_production_batch(p_recipe_id uuid,p_quantity numeric,p_complete boolean default true,p_notes text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare target_org uuid:=app.current_workspace_org(); target_branch uuid:=app.current_workspace_branch(target_org); target_location uuid; version_row public.recipe_versions%rowtype;
  batch_id uuid:=gen_random_uuid(); batch_code text; line record; required_qty numeric; remaining numeric; bal record; movement_id uuid; consumed_cost numeric; total_actual numeric:=0;
begin
  if p_quantity<=0 or not app.has_branch_permission(target_org,target_branch,'production.write') or not app.has_branch_permission(target_org,target_branch,'inventory.write') then raise exception 'Invalid or forbidden production' using errcode='42501'; end if;
  select rv.* into version_row from public.recipes r join public.recipe_versions rv on rv.id=r.current_version_id
    where r.id=p_recipe_id and r.organization_id=target_org and r.deleted_at is null
      and app.has_branch_permission(target_org,r.branch_id,'production.write');
  if not found then raise exception 'Recipe unavailable' using errcode='P0002'; end if;
  select id into target_location from public.inventory_locations where organization_id=target_org and branch_id=target_branch and status='active' and deleted_at is null order by created_at,id limit 1;
  batch_code:='PRD-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS')||'-'||left(replace(batch_id::text,'-',''),6);
  insert into public.production_batches(id,organization_id,branch_id,inventory_location_id,recipe_version_id,batch_code,status,
    planned_quantity,planned_yield,planned_cost,planned_start_at,notes)
  values(batch_id,target_org,target_branch,target_location,version_row.id,batch_code,case when p_complete then 'in_progress' else 'planned' end,
    p_quantity,version_row.net_yield*p_quantity/version_row.portions,version_row.portion_cost*p_quantity,now(),p_notes);
  for line in
    select ri.ingredient_id,ri.usable_quantity*coalesce(c.factor,case when ri.unit_id=i.base_unit_id then 1 end) base_quantity
    from public.recipe_ingredients ri join public.ingredients i on i.id=ri.ingredient_id
    left join lateral (select uc.factor from public.unit_conversions uc where uc.from_unit_id=ri.unit_id and uc.to_unit_id=i.base_unit_id and uc.deleted_at is null
      and (uc.organization_id is null or uc.organization_id=target_org) and (uc.ingredient_id is null or uc.ingredient_id=i.id)
      order by (uc.ingredient_id is not null) desc,(uc.organization_id is not null) desc limit 1) c on true
    where ri.recipe_version_id=version_row.id
  loop
    required_qty:=line.base_quantity*p_quantity/version_row.portions;
    if required_qty is null then raise exception 'Missing ingredient unit conversion' using errcode='23514'; end if;
    insert into public.production_consumption(organization_id,production_batch_id,ingredient_id,planned_quantity,unit_cost_snapshot)
    values(target_org,batch_id,line.ingredient_id,required_qty,0);
    if p_complete then
      remaining:=required_qty; consumed_cost:=0;
      for bal in select b.* from public.inventory_balances b where b.inventory_location_id=target_location and b.ingredient_id=line.ingredient_id and b.quantity>0
        order by b.expiration_date,b.updated_at,b.id for update loop
        exit when remaining<=0;
        movement_id:=app.apply_stock_movement(target_org,target_location,line.ingredient_id,'production_consumption',
          -least(remaining,bal.quantity),bal.weighted_average_cost,bal.lot_code,bal.expiration_date,'production_batch',batch_id,null,now());
        consumed_cost:=consumed_cost+least(remaining,bal.quantity)*bal.weighted_average_cost;
        remaining:=remaining-least(remaining,bal.quantity);
      end loop;
      if remaining>0 then raise exception 'Insufficient stock for production' using errcode='23514'; end if;
      update public.production_consumption set actual_quantity=required_qty,unit_cost_snapshot=consumed_cost/required_qty,stock_movement_id=movement_id
        where production_batch_id=batch_id and ingredient_id=line.ingredient_id;
      total_actual:=total_actual+consumed_cost;
    end if;
  end loop;
  if p_complete then update public.production_batches set status='completed',started_at=now(),completed_at=now(),actual_quantity=p_quantity,
    actual_yield=version_row.net_yield*p_quantity/version_row.portions,actual_cost=total_actual where id=batch_id; end if;
  return batch_id;
end; $$;

create or replace function public.receive_purchase(p_purchase_id uuid,p_inventory_location_id uuid,p_received_at timestamptz default now())
returns void language sql security invoker set search_path='' as $$ select app.receive_purchase(p_purchase_id,p_inventory_location_id,p_received_at); $$;

revoke all on function public.save_supplier(uuid,text,text,text,text,boolean),public.soft_delete_supplier(uuid),
 public.save_packaging(uuid,text,text,text,numeric,numeric,boolean),public.save_expense(uuid,text,text,text,text,numeric,text,date,boolean),
 public.create_sales_channel(text,text,numeric,numeric),public.register_purchase(uuid,text,timestamptz,jsonb,numeric,numeric,numeric),
 public.register_inventory_adjustment(uuid,numeric,numeric,text),public.register_production_batch(uuid,numeric,boolean,text),
 public.receive_purchase(uuid,uuid,timestamptz) from public;
grant execute on function public.save_supplier(uuid,text,text,text,text,boolean),public.soft_delete_supplier(uuid),
 public.save_packaging(uuid,text,text,text,numeric,numeric,boolean),public.save_expense(uuid,text,text,text,text,numeric,text,date,boolean),
 public.create_sales_channel(text,text,numeric,numeric),public.register_purchase(uuid,text,timestamptz,jsonb,numeric,numeric,numeric),
 public.register_inventory_adjustment(uuid,numeric,numeric,text),public.register_production_batch(uuid,numeric,boolean,text),
 public.receive_purchase(uuid,uuid,timestamptz) to authenticated;
