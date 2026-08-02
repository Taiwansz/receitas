-- Stable application-facing RPCs and read models. Every definer RPC re-checks tenant permission.

create or replace function app.current_workspace_org()
returns uuid language sql stable security definer set search_path = '' as $$
  select m.organization_id from public.memberships m
  join public.organizations o on o.id=m.organization_id
  where m.user_id=auth.uid() and m.status='active' and o.status='active' and o.deleted_at is null
  order by m.joined_at desc nulls last, m.created_at desc, m.id limit 1;
$$;

create or replace function app.current_workspace_branch(target_org uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select mb.branch_id from public.memberships m join public.membership_branches mb on mb.membership_id=m.id
      join public.branches b on b.id=mb.branch_id and b.deleted_at is null and b.status='active'
      where m.user_id=auth.uid() and m.organization_id=target_org and m.status='active'
      order by b.created_at, b.id limit 1),
    (select b.id from public.branches b where b.organization_id=target_org and b.deleted_at is null and b.status='active'
      order by b.created_at, b.id limit 1)
  );
$$;

create or replace function public.create_workspace(p_name text, p_branch_name text default 'Matriz')
returns table (organization_id uuid, branch_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  new_org uuid := gen_random_uuid();
  new_branch uuid := gen_random_uuid();
  membership_id uuid := gen_random_uuid();
  owner_role uuid := gen_random_uuid();
  admin_role uuid := gen_random_uuid();
  manager_role uuid := gen_random_uuid();
  viewer_role uuid := gen_random_uuid();
  clean_slug text;
begin
  if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if nullif(trim(p_name),'') is null or char_length(trim(p_name)) > 120 then raise exception 'Workspace name is required (max 120 characters)' using errcode='22023'; end if;
  if nullif(trim(p_branch_name),'') is null or char_length(trim(p_branch_name)) > 120 then raise exception 'Branch name is required (max 120 characters)' using errcode='22023'; end if;
  clean_slug := regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g');
  clean_slug := trim(both '-' from clean_slug);
  if char_length(clean_slug)<3 then clean_slug := 'org'; end if;
  clean_slug := left(clean_slug,50)||'-'||left(replace(new_org::text,'-',''),12);

  insert into public.organizations(id,legal_name,display_name,slug,owner_user_id)
  values(new_org,trim(p_name),trim(p_name),clean_slug,actor);
  insert into public.branches(id,organization_id,name,code)
  values(new_branch,new_org,trim(p_branch_name),'main');
  insert into public.inventory_locations(organization_id,branch_id,name,location_type)
  values(new_org,new_branch,'Estoque principal','storage');
  insert into public.roles(id,organization_id,name,description,is_system) values
    (owner_role,new_org,'Owner','Proprietário com controle total',true),
    (admin_role,new_org,'Administrador','Administração do workspace',true),
    (manager_role,new_org,'Gestor','Operação sem gestão de usuários',true),
    (viewer_role,new_org,'Leitor','Acesso somente leitura',true);
  insert into public.role_permissions(organization_id,role_id,permission_id)
    select new_org,owner_role,p.id from public.permissions p;
  insert into public.role_permissions(organization_id,role_id,permission_id)
    select new_org,admin_role,p.id from public.permissions p where p.key <> 'audit.read';
  insert into public.role_permissions(organization_id,role_id,permission_id)
    select new_org,manager_role,p.id from public.permissions p
    where p.key not in ('settings.write','users.write','audit.read');
  insert into public.role_permissions(organization_id,role_id,permission_id)
    select new_org,viewer_role,p.id from public.permissions p where p.key like '%.read' and p.key <> 'audit.read';
  insert into public.memberships(id,organization_id,user_id,status,joined_at)
  values(membership_id,new_org,actor,'active',now());
  insert into public.membership_roles(organization_id,membership_id,role_id)
  values(new_org,membership_id,owner_role);
  return query select new_org,new_branch;
end;
$$;

create or replace function public.get_current_workspace()
returns table (organization_id uuid, display_name text, branch_id uuid, branch_name text, role text)
language sql stable security definer set search_path = '' as $$
  select o.id,o.display_name,app.current_workspace_branch(o.id),
    (select b.name from public.branches b where b.id=app.current_workspace_branch(o.id)),
    coalesce((select string_agg(r.name,', ' order by case r.name when 'Owner' then 0 when 'Administrador' then 1 else 2 end,r.name)
      from public.membership_roles mr join public.roles r on r.id=mr.role_id where mr.membership_id=m.id),'Sem papel')
  from public.memberships m join public.organizations o on o.id=m.organization_id
  where m.user_id=auth.uid() and m.status='active' and o.status='active' and o.deleted_at is null
  order by m.joined_at desc nulls last,m.created_at desc,m.id limit 1;
$$;

create or replace function public.upsert_ingredient(
  p_id uuid, p_name text, p_sku text, p_brand text, p_base_unit_code text,
  p_current_cost numeric, p_yield_percentage numeric, p_current_stock numeric,
  p_minimum_stock numeric, p_cost_method text, p_active boolean
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  target_org uuid := app.current_workspace_org();
  target_branch uuid;
  target_unit uuid;
  target_id uuid := coalesce(p_id,gen_random_uuid());
  location_id uuid;
  previous_cost numeric;
  previous_stock numeric;
  delta numeric;
begin
  target_branch := app.current_workspace_branch(target_org);
  if target_org is null or target_branch is null or not app.has_branch_permission(target_org,target_branch,'ingredients.write') then
    raise exception 'No writable workspace/branch' using errcode='42501';
  end if;
  if nullif(trim(p_name),'') is null or p_current_cost<0 or p_yield_percentage<=0 or p_yield_percentage>100
     or p_current_stock<0 or p_minimum_stock<0 or p_cost_method not in ('latest_purchase','weighted_average','manual_reference') then
    raise exception 'Invalid ingredient values' using errcode='22023';
  end if;
  select u.id into target_unit from public.measurement_units u
  where u.code=p_base_unit_code and u.deleted_at is null and (u.organization_id is null or u.organization_id=target_org)
  order by (u.organization_id=target_org) desc limit 1;
  if target_unit is null then raise exception 'Unknown unit code: %',p_base_unit_code using errcode='22023'; end if;

  if p_id is null then
    insert into public.ingredients(id,organization_id,branch_id,name,sku,brand,base_unit_id,default_yield_rate,
      minimum_stock,cost_method,manual_reference_cost,status)
    values(target_id,target_org,target_branch,trim(p_name),nullif(trim(p_sku),''),nullif(trim(p_brand),''),target_unit,
      p_yield_percentage/100,p_minimum_stock,p_cost_method,case when p_cost_method='manual_reference' then p_current_cost end,
      case when p_active then 'active' else 'inactive' end);
  else
    if not app.can_access_ingredient(target_org,p_id,'ingredients.write') then raise exception 'Ingredient not found or forbidden' using errcode='42501'; end if;
    update public.ingredients set name=trim(p_name),sku=nullif(trim(p_sku),''),brand=nullif(trim(p_brand),''),
      base_unit_id=target_unit,default_yield_rate=p_yield_percentage/100,minimum_stock=p_minimum_stock,
      cost_method=p_cost_method,manual_reference_cost=case when p_cost_method='manual_reference' then p_current_cost end,
      status=case when p_active then 'active' else 'inactive' end,deleted_at=null where id=p_id and organization_id=target_org;
  end if;
  select h.acquisition_cost into previous_cost from public.ingredient_price_history h
    where h.ingredient_id=target_id order by h.effective_at desc,h.created_at desc limit 1;
  if previous_cost is distinct from p_current_cost then
    insert into public.ingredient_price_history(organization_id,ingredient_id,effective_at,source,acquisition_cost,usable_quantity,base_unit_cost)
    values(target_org,target_id,now(),'manual',p_current_cost,p_yield_percentage/100,p_current_cost/(p_yield_percentage/100));
  end if;
  select l.id into location_id from public.inventory_locations l where l.organization_id=target_org and l.branch_id=target_branch
    and l.status='active' and l.deleted_at is null order by l.created_at,l.id limit 1;
  select coalesce(sum(b.quantity),0) into previous_stock from public.inventory_balances b
    join public.inventory_locations l on l.id=b.inventory_location_id
    where b.ingredient_id=target_id and l.branch_id=target_branch;
  delta := p_current_stock-previous_stock;
  if delta<>0 then
    perform app.apply_stock_movement(target_org,location_id,target_id,
      case when delta>0 then 'adjustment_in' else 'adjustment_out' end,delta,p_current_cost,'','infinity'::date,
      'ingredient',target_id,'Saldo informado no cadastro',now());
  end if;
  return target_id;
end;
$$;

create or replace function public.delete_ingredient(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare target_org uuid := app.current_workspace_org();
begin
  if not app.can_access_ingredient(target_org,p_id,'ingredients.write') then raise exception 'Ingredient not found or forbidden' using errcode='42501'; end if;
  if exists(select 1 from public.recipe_ingredients ri where ri.ingredient_id=p_id) then
    update public.ingredients set status='inactive',deleted_at=now() where id=p_id and organization_id=target_org;
  else
    update public.ingredients set status='inactive',deleted_at=now() where id=p_id and organization_id=target_org;
  end if;
end;
$$;

create or replace function public.save_recipe(
  p_recipe_id uuid, p_name text, p_category text, p_yield_quantity numeric, p_yield_unit text,
  p_portions numeric, p_instructions text, p_items jsonb
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  target_org uuid := app.current_workspace_org(); target_branch uuid; target_recipe uuid:=coalesce(p_recipe_id,gen_random_uuid());
  target_version uuid:=gen_random_uuid(); version_no integer; yield_unit_id uuid; item jsonb; item_unit uuid;
  ingredient uuid; child_version uuid; quantity numeric; factor numeric; snapshot numeric; ingredient_total numeric; sub_total numeric;
begin
  target_branch:=app.current_workspace_branch(target_org);
  if target_org is null or not app.has_branch_permission(target_org,target_branch,'recipes.write') then raise exception 'No writable workspace/branch' using errcode='42501'; end if;
  if nullif(trim(p_name),'') is null or p_yield_quantity<=0 or p_portions<=0 or jsonb_typeof(coalesce(p_items,'[]'::jsonb))<>'array' then raise exception 'Invalid recipe values' using errcode='22023'; end if;
  select u.id into yield_unit_id from public.measurement_units u where u.code=p_yield_unit and u.deleted_at is null
    and (u.organization_id is null or u.organization_id=target_org) order by (u.organization_id=target_org) desc limit 1;
  if yield_unit_id is null then raise exception 'Unknown yield unit' using errcode='22023'; end if;
  if p_recipe_id is null then
    insert into public.recipes(id,organization_id,branch_id,name,category,kind,status)
      values(target_recipe,target_org,target_branch,trim(p_name),nullif(trim(p_category),''),'finished_product','active');
    version_no:=1;
  else
    if not exists(select 1 from public.recipes r where r.id=p_recipe_id and r.organization_id=target_org
      and app.has_branch_permission(target_org,r.branch_id,'recipes.write')) then raise exception 'Recipe not found or forbidden' using errcode='42501'; end if;
    update public.recipes set name=trim(p_name),category=nullif(trim(p_category),''),status='active',deleted_at=null where id=p_recipe_id;
    select coalesce(max(v.version_number),0)+1 into version_no from public.recipe_versions v where v.recipe_id=p_recipe_id;
  end if;
  insert into public.recipe_versions(id,organization_id,recipe_id,version_number,gross_yield,net_yield,yield_unit_id,portions,portion_size,instructions)
    values(target_version,target_org,target_recipe,version_no,p_yield_quantity,p_yield_quantity,yield_unit_id,p_portions,p_yield_quantity/p_portions,p_instructions);
  for item in select value from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    quantity:=nullif(item->>'quantity','')::numeric;
    if quantity is null or quantity<=0 then raise exception 'Every recipe item needs a positive quantity' using errcode='22023'; end if;
    select u.id into item_unit from public.measurement_units u where u.code=item->>'unit_code' and u.deleted_at is null
      and (u.organization_id is null or u.organization_id=target_org) order by (u.organization_id=target_org) desc limit 1;
    if item_unit is null then raise exception 'Unknown item unit' using errcode='22023'; end if;
    ingredient:=nullif(item->>'ingredient_id','')::uuid;
    if ingredient is not null then
      if not app.can_access_ingredient(target_org,ingredient,'ingredients.read') then raise exception 'Ingredient unavailable' using errcode='42501'; end if;
      select coalesce(c.factor,case when i.base_unit_id=item_unit then 1 end),
        case i.cost_method when 'manual_reference' then i.manual_reference_cost
          else (select h.base_unit_cost from public.ingredient_price_history h where h.ingredient_id=i.id order by h.effective_at desc,h.created_at desc limit 1) end
        into factor,snapshot from public.ingredients i left join public.unit_conversions c
          on c.from_unit_id=item_unit and c.to_unit_id=i.base_unit_id and c.deleted_at is null
          and (c.organization_id is null or c.organization_id=target_org) and (c.ingredient_id is null or c.ingredient_id=i.id)
        where i.id=ingredient order by (c.ingredient_id is not null) desc,(c.organization_id is not null) desc limit 1;
      if factor is null then raise exception 'Missing conversion to ingredient base unit' using errcode='22023'; end if;
      snapshot:=coalesce(snapshot,0)*factor;
      insert into public.recipe_ingredients(organization_id,recipe_version_id,ingredient_id,unit_id,gross_quantity,usable_quantity,cost_per_unit_snapshot)
        values(target_org,target_version,ingredient,item_unit,quantity,quantity,snapshot);
    else
      child_version:=coalesce(nullif(item->>'sub_recipe_version_id','')::uuid,
        (select r.current_version_id from public.recipes r where r.id=nullif(item->>'sub_recipe_id','')::uuid and r.organization_id=target_org));
      if child_version is null then raise exception 'Recipe item needs ingredient_id or sub_recipe_id/version_id' using errcode='22023'; end if;
      select coalesce(c.factor,case when rv.yield_unit_id=item_unit then 1 end),rv.total_cost/rv.net_yield
        into factor,snapshot from public.recipe_versions rv left join public.unit_conversions c
          on c.from_unit_id=item_unit and c.to_unit_id=rv.yield_unit_id and c.deleted_at is null and (c.organization_id is null or c.organization_id=target_org)
        where rv.id=child_version and rv.organization_id=target_org and rv.status='published' limit 1;
      if factor is null or snapshot is null then raise exception 'Sub-recipe unavailable or missing unit conversion' using errcode='22023'; end if;
      insert into public.recipe_sub_recipes(organization_id,recipe_version_id,sub_recipe_version_id,quantity,unit_id,cost_per_unit_snapshot)
        values(target_org,target_version,child_version,quantity,item_unit,snapshot*factor);
    end if;
  end loop;
  select coalesce(sum(total_cost_snapshot),0) into ingredient_total from public.recipe_ingredients where recipe_version_id=target_version;
  select coalesce(sum(total_cost_snapshot),0) into sub_total from public.recipe_sub_recipes where recipe_version_id=target_version;
  update public.recipe_versions set ingredient_cost=ingredient_total+sub_total,calculated_at=now(),published_at=now(),status='published' where id=target_version;
  update public.recipes set current_version_id=target_version where id=target_recipe;
  return target_recipe;
end;
$$;

create or replace function public.save_product_price(
  p_recipe_id uuid,p_channel_id uuid,p_price numeric,p_target_margin numeric,p_minimum_price numeric,p_notes text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target_org uuid:=app.current_workspace_org(); version_id uuid; cost_value numeric; pct numeric; fixed numeric; target_rate numeric; floor_price numeric; new_id uuid:=gen_random_uuid(); target_channel uuid:=p_channel_id;
begin
  if p_price<0 or p_minimum_price<0 or p_price<p_minimum_price or p_target_margin<0 or p_target_margin>=100 then raise exception 'Invalid price or margin' using errcode='22023'; end if;
  select r.current_version_id,rv.portion_cost into version_id,cost_value from public.recipes r join public.recipe_versions rv on rv.id=r.current_version_id
    where r.id=p_recipe_id and r.organization_id=target_org and app.has_branch_permission(target_org,r.branch_id,'pricing.write');
  if version_id is null then raise exception 'Recipe unavailable' using errcode='42501'; end if;
  if target_channel is null then
    select c.id into target_channel from public.sales_channels c where c.organization_id=target_org and (c.channel_type='direct_order' or c.name='Venda direta') and c.deleted_at is null order by c.created_at limit 1;
    if target_channel is null then
      insert into public.sales_channels(organization_id,branch_id,name,channel_type) values(target_org,null,'Venda direta','direct_order') returning id into target_channel;
    end if;
  end if;
  if not app.can_access_sales_channel(target_org,target_channel,'pricing.write') then raise exception 'Channel unavailable' using errcode='42501'; end if;
  select coalesce(sum(cf.percentage_rate),0),coalesce(sum(cf.fixed_amount),0) into pct,fixed from public.channel_fees cf
    where cf.sales_channel_id=target_channel and cf.deleted_at is null and (cf.effective_from<=current_date and (cf.effective_to is null or cf.effective_to>=current_date));
  select pct+coalesce(sum(t.rate),0) into pct from public.taxes t where t.organization_id=target_org and t.deleted_at is null
    and (t.sales_channel_id is null or t.sales_channel_id=target_channel) and t.effective_from<=current_date and (t.effective_to is null or t.effective_to>=current_date);
  target_rate:=p_target_margin/100;
  floor_price:=app.calculate_selling_price(cost_value,fixed,pct,0);
  if pct+target_rate>=1 then raise exception 'Fees, taxes and target margin total 100%% or more' using errcode='22023'; end if;
  if p_minimum_price<floor_price then raise exception 'Minimum price must be at least %',floor_price using errcode='22023'; end if;
  insert into public.product_prices(id,organization_id,recipe_version_id,sales_channel_id,cost_snapshot,fixed_charges_snapshot,
    percentage_charges_snapshot,target_margin_snapshot,minimum_price,suggested_price,current_price,notes)
  values(new_id,target_org,version_id,target_channel,cost_value,fixed,pct,target_rate,p_minimum_price,p_price,p_price,p_notes);
  return new_id;
end;
$$;

create or replace view public.ingredients_app with (security_invoker=true) as
select i.organization_id,i.branch_id,i.id,i.name,i.sku,i.brand,u.code::text base_unit,
  ph.acquisition_cost raw_cost,
  case i.cost_method when 'manual_reference' then coalesce(i.manual_reference_cost/(i.default_yield_rate),0)
    when 'weighted_average' then coalesce(bs.weighted_cost,ph.base_unit_cost,0)
    else coalesce(ph.base_unit_cost,0) end current_cost,
  i.default_yield_rate*100 yield_percentage,coalesce(bs.current_stock,0) current_stock,
  i.minimum_stock,i.cost_method,(i.status='active' and i.deleted_at is null) active,i.created_at,i.updated_at
from public.ingredients i join public.measurement_units u on u.id=i.base_unit_id
left join lateral (select h.acquisition_cost,h.base_unit_cost from public.ingredient_price_history h where h.ingredient_id=i.id order by h.effective_at desc,h.created_at desc limit 1) ph on true
left join lateral (select sum(b.quantity) current_stock,
  case when sum(b.quantity)>0 then sum(b.quantity*b.weighted_average_cost)/sum(b.quantity) end weighted_cost
  from public.inventory_balances b where b.ingredient_id=i.id) bs on true;

create or replace view public.recipe_summaries_app with (security_invoker=true) as
select r.organization_id,r.branch_id,r.id,r.name,r.category,rv.portions,rv.total_cost,rv.portion_cost unit_cost,
  pp.current_price,case when pp.current_price>0 then round(((pp.current_price-rv.portion_cost)/pp.current_price)*100,2) end margin_percentage,
  (r.status='active' and r.deleted_at is null) active,r.updated_at
from public.recipes r left join public.recipe_versions rv on rv.id=r.current_version_id
left join lateral (select p.current_price from public.product_prices p where p.recipe_version_id=rv.id order by p.effective_from desc,p.created_at desc limit 1) pp on true;

create or replace view public.sales_channels_app with (security_invoker=true) as
select c.organization_id,c.branch_id,c.id,c.name,coalesce(f.percentage_fees,0) percentage_fees,
  coalesce(f.fixed_fee,0) fixed_fee,(c.status='active' and c.deleted_at is null) active
from public.sales_channels c left join lateral (
  select sum(cf.percentage_rate)*100 percentage_fees,sum(cf.fixed_amount) fixed_fee from public.channel_fees cf
  where cf.sales_channel_id=c.id and cf.deleted_at is null and cf.effective_from<=current_date and (cf.effective_to is null or cf.effective_to>=current_date)
) f on true;

create or replace view public.dashboard_metrics_app with (security_invoker=true) as
select o.id organization_id,
  (select count(*) from public.ingredients i where i.organization_id=o.id and i.deleted_at is null) ingredient_count,
  (select count(*) from public.recipes r where r.organization_id=o.id and r.deleted_at is null and r.status='active') active_recipe_count,
  (select count(*) from public.alerts a where a.organization_id=o.id and a.status in ('open','acknowledged')) open_alert_count,
  (select coalesce(sum(b.quantity*b.weighted_average_cost),0) from public.inventory_balances b where b.organization_id=o.id) inventory_value,
  (select count(*) from public.product_prices p where p.organization_id=o.id and p.current_price<p.minimum_price) underpriced_count
from public.organizations o;

revoke all on function app.current_workspace_org(),app.current_workspace_branch(uuid) from public;
grant execute on function app.current_workspace_org(),app.current_workspace_branch(uuid) to authenticated,service_role;
revoke all on function public.create_workspace(text,text),public.get_current_workspace(),
  public.upsert_ingredient(uuid,text,text,text,text,numeric,numeric,numeric,numeric,text,boolean),
  public.delete_ingredient(uuid),public.save_recipe(uuid,text,text,numeric,text,numeric,text,jsonb),
  public.save_product_price(uuid,uuid,numeric,numeric,numeric,text) from public,anon;
grant execute on function public.create_workspace(text,text),public.get_current_workspace(),
  public.upsert_ingredient(uuid,text,text,text,text,numeric,numeric,numeric,numeric,text,boolean),
  public.delete_ingredient(uuid),public.save_recipe(uuid,text,text,numeric,text,numeric,text,jsonb),
  public.save_product_price(uuid,uuid,numeric,numeric,numeric,text) to authenticated;
grant select on public.ingredients_app,public.recipe_summaries_app,public.sales_channels_app,public.dashboard_metrics_app to authenticated;
revoke all on public.ingredients_app,public.recipe_summaries_app,public.sales_channels_app,public.dashboard_metrics_app from anon;
