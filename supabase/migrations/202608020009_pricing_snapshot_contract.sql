-- Persist the exact monetary and percentage components shown by the simulator.
create or replace function public.save_product_price_v2(
  p_recipe_id uuid,p_channel_id uuid,p_price numeric,p_target_margin numeric,p_minimum_price numeric,
  p_extra_monetary_cost numeric,p_additional_percentage_rate numeric,p_notes text
) returns uuid language plpgsql security definer set search_path='' as $$
declare target_org uuid:=app.current_workspace_org(); target_branch uuid:=app.current_workspace_branch(target_org);
  target_channel uuid:=p_channel_id; version_id uuid; recipe_cost numeric; channel_pct numeric:=0; fixed_charge numeric:=0;
  tax_pct numeric:=0; total_cost numeric; total_pct numeric; target_rate numeric:=p_target_margin/100;
  floor_price numeric; new_id uuid:=gen_random_uuid();
begin
  if not app.has_branch_permission(target_org,target_branch,'pricing.write') then raise exception 'Forbidden' using errcode='42501'; end if;
  if p_recipe_id is null or p_price is null or p_target_margin is null or p_minimum_price is null
    or p_extra_monetary_cost is null or p_additional_percentage_rate is null then
    raise exception 'Required pricing inputs cannot be null' using errcode='22004';
  end if;
  if least(p_price,p_minimum_price,p_extra_monetary_cost,p_additional_percentage_rate,p_target_margin)<0
    or p_additional_percentage_rate>=100 or p_target_margin>=100 then raise exception 'Invalid pricing inputs' using errcode='22023'; end if;
  select r.current_version_id,rv.portion_cost into version_id,recipe_cost from public.recipes r
    join public.recipe_versions rv on rv.id=r.current_version_id where r.id=p_recipe_id and r.organization_id=target_org
    and app.has_branch_permission(target_org,r.branch_id,'pricing.write');
  if version_id is null then raise exception 'Recipe unavailable' using errcode='42501'; end if;
  if target_channel is null then
    select c.id into target_channel from public.sales_channels c where c.organization_id=target_org
      and (c.channel_type='direct_order' or c.name='Venda direta') and c.deleted_at is null
      order by case when c.branch_id=target_branch then 0 when c.branch_id is null then 1 else 2 end,c.created_at limit 1;
    if target_channel is null then insert into public.sales_channels(organization_id,branch_id,name,channel_type)
      values(target_org,null,'Venda direta','direct_order') returning id into target_channel; end if;
  elsif not app.can_access_sales_channel(target_org,target_channel,'pricing.write') then raise exception 'Channel unavailable' using errcode='42501'; end if;
  select coalesce(sum(cf.percentage_rate),0),coalesce(sum(cf.fixed_amount),0) into channel_pct,fixed_charge
    from public.channel_fees cf where cf.sales_channel_id=target_channel and cf.deleted_at is null
    and cf.effective_from<=current_date and (cf.effective_to is null or cf.effective_to>=current_date);
  select coalesce(sum(t.rate),0) into tax_pct from public.taxes t where t.organization_id=target_org and t.deleted_at is null
    and (t.sales_channel_id is null or t.sales_channel_id=target_channel) and t.effective_from<=current_date
    and (t.effective_to is null or t.effective_to>=current_date);
  total_cost:=recipe_cost+p_extra_monetary_cost; total_pct:=channel_pct+tax_pct+(p_additional_percentage_rate/100);
  if total_pct+target_rate>=1 then raise exception 'Fees, taxes and margin total 100%% or more' using errcode='22023'; end if;
  floor_price:=app.calculate_selling_price(total_cost,fixed_charge,total_pct,0);
  if p_minimum_price<floor_price-0.01 or p_price<p_minimum_price then raise exception 'Saved price is below the calculated floor' using errcode='22023'; end if;
  insert into public.product_prices(id,organization_id,recipe_version_id,sales_channel_id,cost_snapshot,fixed_charges_snapshot,
    percentage_charges_snapshot,target_margin_snapshot,minimum_price,suggested_price,current_price,notes)
  values(new_id,target_org,version_id,target_channel,total_cost,fixed_charge,total_pct,target_rate,p_minimum_price,p_price,p_price,p_notes);
  return new_id;
end; $$;
revoke all on function public.save_product_price_v2(uuid,uuid,numeric,numeric,numeric,numeric,numeric,text) from public;
grant execute on function public.save_product_price_v2(uuid,uuid,numeric,numeric,numeric,numeric,numeric,text) to authenticated;
