-- Safe global reference data only. No fictitious tenant/business records.

insert into public.permissions (key, description) values
  ('settings.read','View organization and branch settings'),
  ('settings.write','Manage organization and branch settings'),
  ('users.read','View members, roles and permissions'),
  ('users.write','Manage members, roles, permissions and branch scopes'),
  ('ingredients.read','View units, ingredients, suppliers and packaging'),
  ('ingredients.write','Manage units, ingredients, suppliers and packaging'),
  ('purchases.read','View purchases and price history'),
  ('purchases.write','Create, edit and receive purchases'),
  ('recipes.read','View recipes and immutable versions'),
  ('recipes.write','Create recipes and publish versions'),
  ('costs.read','View expenses, cost centers and allocations'),
  ('costs.write','Manage expenses, cost centers and allocations'),
  ('pricing.read','View sales channels, fees, taxes and prices'),
  ('pricing.write','Manage sales channels, fees, taxes and prices'),
  ('inventory.read','View inventory balances and ledger'),
  ('inventory.write','Post inventory movements and adjustments'),
  ('production.read','View production plans and actuals'),
  ('production.write','Manage and complete production batches'),
  ('reports.read','View reports, scenarios and alerts'),
  ('reports.write','Manage scenarios and alerts'),
  ('attachments.read','Download business attachments'),
  ('attachments.write','Upload and remove business attachments'),
  ('audit.read','View tenant audit history')
on conflict (key) do update set description=excluded.description;

insert into public.measurement_units (id,organization_id,code,name,symbol,dimension,scale_to_si,decimal_places) values
  ('10000000-0000-0000-0000-000000000001',null,'mg','Miligrama','mg','mass',0.000001,3),
  ('10000000-0000-0000-0000-000000000002',null,'g','Grama','g','mass',0.001,3),
  ('10000000-0000-0000-0000-000000000003',null,'kg','Quilograma','kg','mass',1,6),
  ('10000000-0000-0000-0000-000000000004',null,'ml','Mililitro','ml','volume',0.000001,3),
  ('10000000-0000-0000-0000-000000000005',null,'l','Litro','L','volume',0.001,6),
  ('10000000-0000-0000-0000-000000000006',null,'un','Unidade','un','count',1,3),
  ('10000000-0000-0000-0000-000000000007',null,'dz','Dúzia','dz','count',12,3),
  ('10000000-0000-0000-0000-000000000008',null,'min','Minuto','min','time',60,2),
  ('10000000-0000-0000-0000-000000000009',null,'h','Hora','h','time',3600,4)
on conflict (id) do update set code=excluded.code,name=excluded.name,symbol=excluded.symbol,
  dimension=excluded.dimension,scale_to_si=excluded.scale_to_si,decimal_places=excluded.decimal_places,is_active=true,deleted_at=null;

insert into public.unit_conversions (id,organization_id,from_unit_id,to_unit_id,factor) values
  ('20000000-0000-0000-0000-000000000001',null,'10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002',0.001),
  ('20000000-0000-0000-0000-000000000002',null,'10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001',1000),
  ('20000000-0000-0000-0000-000000000003',null,'10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003',0.001),
  ('20000000-0000-0000-0000-000000000004',null,'10000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002',1000),
  ('20000000-0000-0000-0000-000000000005',null,'10000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000005',0.001),
  ('20000000-0000-0000-0000-000000000006',null,'10000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000004',1000),
  ('20000000-0000-0000-0000-000000000007',null,'10000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000007',0.0833333333),
  ('20000000-0000-0000-0000-000000000008',null,'10000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000006',12),
  ('20000000-0000-0000-0000-000000000009',null,'10000000-0000-0000-0000-000000000008','10000000-0000-0000-0000-000000000009',0.0166666667),
  ('20000000-0000-0000-0000-000000000010',null,'10000000-0000-0000-0000-000000000009','10000000-0000-0000-0000-000000000008',60)
on conflict (id) do update set factor=excluded.factor,deleted_at=null;

