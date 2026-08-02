-- Tenant/branch isolation, least-privilege policies and private attachment storage.

create or replace function app.can_access_ingredient(target_org uuid, target_id uuid, permission_key text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ingredients x where x.organization_id=target_org and x.id=target_id
    and app.has_branch_permission(target_org, x.branch_id, permission_key));
$$;
create or replace function app.can_access_recipe(target_org uuid, target_id uuid, permission_key text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.recipes x where x.organization_id=target_org and x.id=target_id
    and app.has_branch_permission(target_org, x.branch_id, permission_key));
$$;
create or replace function app.can_access_purchase(target_org uuid, target_id uuid, permission_key text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.purchases x where x.organization_id=target_org and x.id=target_id
    and app.has_branch_permission(target_org, x.branch_id, permission_key));
$$;
create or replace function app.can_access_recipe_version(target_org uuid, target_id uuid, permission_key text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.recipe_versions v join public.recipes r on r.id=v.recipe_id
    where v.organization_id=target_org and v.id=target_id
      and app.has_branch_permission(target_org, r.branch_id, permission_key));
$$;
create or replace function app.can_access_sales_channel(target_org uuid, target_id uuid, permission_key text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.sales_channels x where x.organization_id=target_org and x.id=target_id
    and app.has_branch_permission(target_org, x.branch_id, permission_key));
$$;
create or replace function app.can_access_inventory_location(target_org uuid, target_id uuid, permission_key text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.inventory_locations x where x.organization_id=target_org and x.id=target_id
    and app.has_branch_permission(target_org, x.branch_id, permission_key));
$$;
create or replace function app.can_access_production_batch(target_org uuid, target_id uuid, permission_key text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.production_batches x where x.organization_id=target_org and x.id=target_id
    and app.has_branch_permission(target_org, x.branch_id, permission_key));
$$;
create or replace function app.can_access_expense(target_org uuid, target_id uuid, permission_key text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.expenses x where x.organization_id=target_org and x.id=target_id
    and app.has_branch_permission(target_org, x.branch_id, permission_key));
$$;

revoke all on function app.can_access_ingredient(uuid,uuid,text) from public;
revoke all on function app.can_access_recipe(uuid,uuid,text) from public;
revoke all on function app.can_access_purchase(uuid,uuid,text) from public;
revoke all on function app.can_access_recipe_version(uuid,uuid,text) from public;
revoke all on function app.can_access_sales_channel(uuid,uuid,text) from public;
revoke all on function app.can_access_inventory_location(uuid,uuid,text) from public;
revoke all on function app.can_access_production_batch(uuid,uuid,text) from public;
revoke all on function app.can_access_expense(uuid,uuid,text) from public;
grant execute on function app.can_access_ingredient(uuid,uuid,text), app.can_access_recipe(uuid,uuid,text), app.can_access_purchase(uuid,uuid,text),
  app.can_access_recipe_version(uuid,uuid,text), app.can_access_sales_channel(uuid,uuid,text),
  app.can_access_inventory_location(uuid,uuid,text), app.can_access_production_batch(uuid,uuid,text), app.can_access_expense(uuid,uuid,text)
to authenticated, service_role;

do $$
declare t text;
begin
  foreach t in array array[
    'user_profiles','organizations','branches','permissions','roles','role_permissions','memberships','membership_roles','membership_branches',
    'measurement_units','unit_conversions','ingredient_categories','suppliers','ingredients','ingredient_suppliers','purchases','purchase_items','ingredient_price_history','packaging_items',
    'recipes','recipe_versions','recipe_ingredients','recipe_sub_recipes','recipe_packaging','cost_centers','expenses','allocation_rules','sales_channels','channel_fees','taxes','pricing_rules','product_prices',
    'inventory_locations','inventory_balances','stock_movements','production_batches','production_consumption','production_losses','scenarios','alerts','attachments','audit_logs'
  ] loop execute format('alter table public.%I enable row level security', t); end loop;
end $$;

create policy user_profiles_select on public.user_profiles for select to authenticated using (app.can_view_profile(id));
create policy user_profiles_update_self on public.user_profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
create policy organizations_select on public.organizations for select to authenticated using (app.is_org_member(id));
create policy organizations_update on public.organizations for update to authenticated using (app.has_permission(id,'settings.write')) with check (app.has_permission(id,'settings.write'));
create policy branches_select on public.branches for select to authenticated using (app.has_branch_permission(organization_id,id,'settings.read'));
create policy branches_write on public.branches for all to authenticated using (app.has_branch_permission(organization_id,id,'settings.write')) with check (app.has_permission(organization_id,'settings.write'));
create policy permissions_select on public.permissions for select to authenticated using (true);

do $$
declare t text;
begin
  foreach t in array array['roles','role_permissions','memberships','membership_roles','membership_branches'] loop
    execute format('create policy %I_select on public.%I for select to authenticated using (app.is_org_member(organization_id))',t,t);
    execute format('create policy %I_write on public.%I for all to authenticated using (app.has_permission(organization_id,''users.write'')) with check (app.has_permission(organization_id,''users.write''))',t,t);
  end loop;
end $$;

drop policy memberships_select on public.memberships;
create policy memberships_select on public.memberships for select to authenticated
using (user_id=auth.uid() or app.has_permission(organization_id,'users.read'));
do $$ declare t text; begin
  foreach t in array array['roles','role_permissions','membership_roles','membership_branches'] loop
    execute format('drop policy %I_select on public.%I',t,t);
    execute format('create policy %I_select on public.%I for select to authenticated using (app.has_permission(organization_id,''users.read''))',t,t);
  end loop;
end $$;

create policy measurement_units_select on public.measurement_units for select to authenticated
using (organization_id is null or app.has_permission(organization_id,'ingredients.read'));
create policy measurement_units_write on public.measurement_units for all to authenticated
using (organization_id is not null and app.has_permission(organization_id,'ingredients.write'))
with check (organization_id is not null and app.has_permission(organization_id,'ingredients.write'));
create policy unit_conversions_select on public.unit_conversions for select to authenticated
using (organization_id is null or app.has_permission(organization_id,'ingredients.read'));
create policy unit_conversions_write on public.unit_conversions for all to authenticated
using (organization_id is not null and app.has_permission(organization_id,'ingredients.write'))
with check (organization_id is not null and app.has_permission(organization_id,'ingredients.write'));

do $$
declare t text; perm text;
begin
  for t,perm in select * from (values
    ('ingredient_categories','ingredients'),('suppliers','ingredients'),('packaging_items','ingredients'),
    ('cost_centers','costs'),('allocation_rules','costs'),
    ('pricing_rules','pricing'),('product_prices','pricing')
  ) v(t,p) loop
    execute format('create policy %I_select on public.%I for select to authenticated using (app.has_permission(organization_id,%L))',t,t,perm||'.read');
    execute format('create policy %I_write on public.%I for all to authenticated using (app.has_permission(organization_id,%L)) with check (app.has_permission(organization_id,%L))',t,t,perm||'.write',perm||'.write');
  end loop;
end $$;

drop policy cost_centers_select on public.cost_centers;
drop policy cost_centers_write on public.cost_centers;
create policy cost_centers_select on public.cost_centers for select to authenticated
using (app.has_branch_permission(organization_id,branch_id,'costs.read'));
create policy cost_centers_write on public.cost_centers for all to authenticated
using (app.has_branch_permission(organization_id,branch_id,'costs.write'))
with check (app.has_branch_permission(organization_id,branch_id,'costs.write'));
drop policy allocation_rules_select on public.allocation_rules;
drop policy allocation_rules_write on public.allocation_rules;
create policy allocation_rules_select on public.allocation_rules for select to authenticated
using (app.can_access_expense(organization_id,expense_id,'costs.read'));
create policy allocation_rules_write on public.allocation_rules for all to authenticated
using (app.can_access_expense(organization_id,expense_id,'costs.write'))
with check (app.can_access_expense(organization_id,expense_id,'costs.write'));

do $$
declare t text; perm text;
begin
  for t,perm in select * from (values
    ('ingredients','ingredients'),('purchases','purchases'),('recipes','recipes'),('expenses','costs'),
    ('sales_channels','pricing'),('inventory_locations','inventory'),('production_batches','production'),
    ('scenarios','reports'),('alerts','reports'),('attachments','attachments')
  ) v(t,p) loop
    execute format('create policy %I_select on public.%I for select to authenticated using (app.has_branch_permission(organization_id,branch_id,%L))',t,t,perm||'.read');
    execute format('create policy %I_write on public.%I for all to authenticated using (app.has_branch_permission(organization_id,branch_id,%L)) with check (app.has_branch_permission(organization_id,branch_id,%L))',t,t,perm||'.write',perm||'.write');
  end loop;
end $$;

create policy ingredient_suppliers_select on public.ingredient_suppliers for select to authenticated
using (app.can_access_ingredient(organization_id,ingredient_id,'ingredients.read'));
create policy ingredient_suppliers_write on public.ingredient_suppliers for all to authenticated
using (app.can_access_ingredient(organization_id,ingredient_id,'ingredients.write'))
with check (app.can_access_ingredient(organization_id,ingredient_id,'ingredients.write'));
create policy ingredient_price_history_select on public.ingredient_price_history for select to authenticated
using (app.can_access_ingredient(organization_id,ingredient_id,'ingredients.read'));
-- Manual history can be inserted; update/delete remains blocked by trigger.
create policy ingredient_price_history_insert on public.ingredient_price_history for insert to authenticated
with check (app.can_access_ingredient(organization_id,ingredient_id,'ingredients.write'));

create policy purchase_items_select on public.purchase_items for select to authenticated
using (app.can_access_purchase(organization_id,purchase_id,'purchases.read'));
create policy purchase_items_write on public.purchase_items for all to authenticated
using (app.can_access_purchase(organization_id,purchase_id,'purchases.write'))
with check (app.can_access_purchase(organization_id,purchase_id,'purchases.write'));

do $$
declare t text;
begin
  foreach t in array array['recipe_versions','recipe_ingredients','recipe_sub_recipes','recipe_packaging'] loop
    if t='recipe_versions' then
      execute format('create policy %I_select on public.%I for select to authenticated using (app.can_access_recipe_version(organization_id,id,''recipes.read''))',t,t);
      execute format('create policy %I_write on public.%I for all to authenticated using (app.can_access_recipe_version(organization_id,id,''recipes.write'')) with check (app.can_access_recipe(organization_id,recipe_id,''recipes.write''))',t,t);
    else
      execute format('create policy %I_select on public.%I for select to authenticated using (app.can_access_recipe_version(organization_id,recipe_version_id,''recipes.read''))',t,t);
      execute format('create policy %I_write on public.%I for all to authenticated using (app.can_access_recipe_version(organization_id,recipe_version_id,''recipes.write'')) with check (app.can_access_recipe_version(organization_id,recipe_version_id,''recipes.write''))',t,t);
    end if;
  end loop;
end $$;

drop policy pricing_rules_select on public.pricing_rules;
drop policy pricing_rules_write on public.pricing_rules;
create policy pricing_rules_select on public.pricing_rules for select to authenticated
using (app.can_access_recipe(organization_id,recipe_id,'pricing.read') and app.can_access_sales_channel(organization_id,sales_channel_id,'pricing.read'));
create policy pricing_rules_write on public.pricing_rules for all to authenticated
using (app.can_access_recipe(organization_id,recipe_id,'pricing.write') and app.can_access_sales_channel(organization_id,sales_channel_id,'pricing.write'))
with check (app.can_access_recipe(organization_id,recipe_id,'pricing.write') and app.can_access_sales_channel(organization_id,sales_channel_id,'pricing.write'));
drop policy product_prices_select on public.product_prices;
drop policy product_prices_write on public.product_prices;
create policy product_prices_select on public.product_prices for select to authenticated
using (app.can_access_recipe_version(organization_id,recipe_version_id,'pricing.read') and app.can_access_sales_channel(organization_id,sales_channel_id,'pricing.read'));
create policy product_prices_insert on public.product_prices for insert to authenticated
with check (app.can_access_recipe_version(organization_id,recipe_version_id,'pricing.write') and app.can_access_sales_channel(organization_id,sales_channel_id,'pricing.write'));

do $$
declare t text;
begin
  foreach t in array array['channel_fees','taxes'] loop
    execute format('create policy %I_select on public.%I for select to authenticated using (sales_channel_id is null or app.can_access_sales_channel(organization_id,sales_channel_id,''pricing.read''))',t,t);
    execute format('create policy %I_write on public.%I for all to authenticated using (sales_channel_id is null or app.can_access_sales_channel(organization_id,sales_channel_id,''pricing.write'')) with check ((sales_channel_id is null and app.has_permission(organization_id,''pricing.write'')) or app.can_access_sales_channel(organization_id,sales_channel_id,''pricing.write''))',t,t);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array['inventory_balances','stock_movements'] loop
    execute format('create policy %I_select on public.%I for select to authenticated using (app.can_access_inventory_location(organization_id,inventory_location_id,''inventory.read''))',t,t);
  end loop;
end $$;
-- Ledger and balances are only mutated through checked SECURITY DEFINER functions.

do $$
declare t text;
begin
  foreach t in array array['production_consumption','production_losses'] loop
    execute format('create policy %I_select on public.%I for select to authenticated using (app.can_access_production_batch(organization_id,production_batch_id,''production.read''))',t,t);
    execute format('create policy %I_write on public.%I for all to authenticated using (app.can_access_production_batch(organization_id,production_batch_id,''production.write'')) with check (app.can_access_production_batch(organization_id,production_batch_id,''production.write''))',t,t);
  end loop;
end $$;

create policy audit_logs_select on public.audit_logs for select to authenticated
using (app.has_branch_permission(organization_id,branch_id,'audit.read'));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('business-attachments','business-attachments',false,26214400,
  array['application/pdf','image/jpeg','image/png','image/webp','text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function app.storage_path_organization(object_name text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin return split_part(object_name,'/',1)::uuid;
exception when invalid_text_representation then return null;
end; $$;
revoke all on function app.storage_path_organization(text) from public;
grant execute on function app.storage_path_organization(text) to authenticated, service_role;

create or replace function app.can_access_storage_object(object_name text, permission_key text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.attachments a where a.organization_id=app.storage_path_organization(object_name)
    and a.object_path=object_name and a.deleted_at is null
    and app.has_branch_permission(a.organization_id,a.branch_id,permission_key));
$$;
revoke all on function app.can_access_storage_object(text,text) from public;
grant execute on function app.can_access_storage_object(text,text) to authenticated,service_role;

create policy attachments_objects_select on storage.objects for select to authenticated
using (bucket_id='business-attachments' and app.can_access_storage_object(name,'attachments.read'));
create policy attachments_objects_insert on storage.objects for insert to authenticated
with check (bucket_id='business-attachments' and app.has_permission(app.storage_path_organization(name),'attachments.write'));
create policy attachments_objects_update on storage.objects for update to authenticated
using (bucket_id='business-attachments' and app.can_access_storage_object(name,'attachments.write'))
with check (bucket_id='business-attachments' and app.has_permission(app.storage_path_organization(name),'attachments.write'));
create policy attachments_objects_delete on storage.objects for delete to authenticated
using (bucket_id='business-attachments' and app.can_access_storage_object(name,'attachments.write'));

do $$
declare t text;
begin
  foreach t in array array[
    'organizations','branches','roles','role_permissions','memberships','membership_roles','membership_branches',
    'unit_conversions','ingredient_categories','suppliers','ingredients','ingredient_suppliers','purchases','purchase_items','ingredient_price_history','packaging_items',
    'recipes','recipe_versions','recipe_ingredients','recipe_sub_recipes','recipe_packaging','cost_centers','expenses','allocation_rules','sales_channels','channel_fees','taxes','pricing_rules','product_prices',
    'inventory_locations','stock_movements','production_batches','production_consumption','production_losses','scenarios','alerts','attachments'
  ] loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function app.write_audit_log()',t,t);
  end loop;
end $$;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.audit_logs to authenticated;
revoke insert, update, delete on public.audit_logs, public.inventory_balances, public.stock_movements from authenticated;
