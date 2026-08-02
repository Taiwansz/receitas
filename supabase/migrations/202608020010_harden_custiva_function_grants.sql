-- Remove legacy direct anon grants that can exist in older Supabase projects.
-- Custiva has no anonymous data API; authentication is required before workspace access.

revoke all on function public.create_workspace(text,text),public.get_current_workspace(),
  public.upsert_ingredient(uuid,text,text,text,text,numeric,numeric,numeric,numeric,text,boolean),
  public.delete_ingredient(uuid),public.save_recipe(uuid,text,text,numeric,text,numeric,text,jsonb),
  public.save_product_price(uuid,uuid,numeric,numeric,numeric,text),
  public.save_supplier(uuid,text,text,text,text,boolean),public.soft_delete_supplier(uuid),
  public.save_packaging(uuid,text,text,text,numeric,numeric,boolean),
  public.save_expense(uuid,text,text,text,text,numeric,text,date,boolean),
  public.create_sales_channel(text,text,numeric,numeric),
  public.register_purchase(uuid,text,timestamptz,jsonb,numeric,numeric,numeric),
  public.register_inventory_adjustment(uuid,numeric,numeric,text),
  public.register_production_batch(uuid,numeric,boolean,text),
  public.receive_purchase(uuid,uuid,timestamptz),
  public.save_product_price_v2(uuid,uuid,numeric,numeric,numeric,numeric,numeric,text)
from anon,public;

grant execute on function public.create_workspace(text,text),public.get_current_workspace(),
  public.upsert_ingredient(uuid,text,text,text,text,numeric,numeric,numeric,numeric,text,boolean),
  public.delete_ingredient(uuid),public.save_recipe(uuid,text,text,numeric,text,numeric,text,jsonb),
  public.save_product_price(uuid,uuid,numeric,numeric,numeric,text),
  public.save_supplier(uuid,text,text,text,text,boolean),public.soft_delete_supplier(uuid),
  public.save_packaging(uuid,text,text,text,numeric,numeric,boolean),
  public.save_expense(uuid,text,text,text,text,numeric,text,date,boolean),
  public.create_sales_channel(text,text,numeric,numeric),
  public.register_purchase(uuid,text,timestamptz,jsonb,numeric,numeric,numeric),
  public.register_inventory_adjustment(uuid,numeric,numeric,text),
  public.register_production_batch(uuid,numeric,boolean,text),
  public.receive_purchase(uuid,uuid,timestamptz),
  public.save_product_price_v2(uuid,uuid,numeric,numeric,numeric,numeric,numeric,text)
to authenticated;

revoke all on public.ingredients_app,public.recipe_summaries_app,
  public.sales_channels_app,public.dashboard_metrics_app from anon;

do $$
declare t text;
begin
  foreach t in array array[
    'user_profiles','organizations','branches','permissions','roles','role_permissions','memberships','membership_roles','membership_branches',
    'measurement_units','unit_conversions','ingredient_categories','suppliers','ingredients','ingredient_suppliers','purchases','purchase_items','ingredient_price_history','packaging_items',
    'recipes','recipe_versions','recipe_ingredients','recipe_sub_recipes','recipe_packaging','cost_centers','expenses','allocation_rules','sales_channels','channel_fees','taxes','pricing_rules','product_prices',
    'inventory_locations','inventory_balances','stock_movements','production_batches','production_consumption','production_losses','scenarios','alerts','attachments','custiva_audit_logs'
  ] loop
    execute format('revoke all on table public.%I from anon',t);
  end loop;
end $$;
