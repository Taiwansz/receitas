-- Core tenancy, identity and authorization primitives.
-- PostgreSQL/Supabase migration; all business identifiers use UUID.

create extension if not exists pgcrypto;
create extension if not exists citext;

create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to authenticated, service_role;

create or replace function app.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  locale text not null default 'pt-BR',
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_full_name_length check (full_name is null or char_length(full_name) between 1 and 160)
);

comment on table public.user_profiles is 'Application profile for each Supabase Auth user; credentials remain only in auth.users.';

create or replace function app.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_profiles (id, full_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function app.handle_new_auth_user();

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  display_name text not null,
  name text generated always as (display_name) stored,
  slug citext not null unique,
  tax_id text,
  currency_code text not null default 'BRL',
  currency text generated always as (currency_code) stored,
  locale text not null default 'pt-BR',
  timezone text not null default 'America/Sao_Paulo',
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  settings jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint organizations_name_length check (char_length(legal_name) between 1 and 200 and char_length(display_name) between 1 and 120),
  constraint organizations_slug_format check (slug::text ~ '^[a-z0-9][a-z0-9-]{2,62}$'),
  constraint organizations_currency_code check (currency_code ~ '^[A-Z]{3}$'),
  constraint organizations_status check (status in ('active', 'suspended', 'closed')),
  constraint organizations_settings_object check (jsonb_typeof(settings) = 'object')
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  code citext not null,
  tax_id text,
  timezone text not null default 'America/Sao_Paulo',
  address jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id),
  unique (organization_id, code),
  constraint branches_name_length check (char_length(name) between 1 and 120),
  constraint branches_status check (status in ('active', 'inactive')),
  constraint branches_address_object check (jsonb_typeof(address) = 'object')
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text not null,
  created_at timestamptz not null default now(),
  constraint permissions_key_format check (key ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$')
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id),
  unique (organization_id, name),
  constraint roles_name_length check (char_length(name) between 1 and 80)
);

create table public.role_permissions (
  organization_id uuid not null,
  role_id uuid not null,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id),
  foreign key (organization_id, role_id) references public.roles(organization_id, id) on delete cascade
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'invited',
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, user_id),
  constraint memberships_status check (status in ('invited', 'active', 'suspended')),
  constraint memberships_joined_state check ((status = 'active' and joined_at is not null) or status <> 'active')
);

create table public.membership_roles (
  organization_id uuid not null,
  membership_id uuid not null,
  role_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (membership_id, role_id),
  foreign key (organization_id, membership_id) references public.memberships(organization_id, id) on delete cascade,
  foreign key (organization_id, role_id) references public.roles(organization_id, id) on delete cascade
);

-- No rows means access to all branches in the organization; one or more rows scope the member.
create table public.membership_branches (
  organization_id uuid not null,
  membership_id uuid not null,
  branch_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (membership_id, branch_id),
  foreign key (organization_id, membership_id) references public.memberships(organization_id, id) on delete cascade,
  foreign key (organization_id, branch_id) references public.branches(organization_id, id) on delete cascade
);

create index memberships_user_active_idx on public.memberships (user_id, organization_id) where status = 'active';
create index membership_roles_role_idx on public.membership_roles (role_id, membership_id);
create index membership_branches_branch_idx on public.membership_branches (branch_id, membership_id);
create index branches_org_active_idx on public.branches (organization_id, name) where deleted_at is null;

create trigger user_profiles_set_updated_at before update on public.user_profiles
for each row execute function app.set_updated_at();
create trigger organizations_set_updated_at before update on public.organizations
for each row execute function app.set_updated_at();
create trigger branches_set_updated_at before update on public.branches
for each row execute function app.set_updated_at();
create trigger roles_set_updated_at before update on public.roles
for each row execute function app.set_updated_at();
create trigger memberships_set_updated_at before update on public.memberships
for each row execute function app.set_updated_at();

create or replace function app.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = target_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and o.status = 'active'
      and o.deleted_at is null
  );
$$;

create or replace function app.has_permission(target_organization_id uuid, permission_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    join public.organizations o on o.id = m.organization_id
    join public.membership_roles mr
      on mr.organization_id = m.organization_id and mr.membership_id = m.id
    join public.role_permissions rp
      on rp.organization_id = m.organization_id and rp.role_id = mr.role_id
    join public.permissions p on p.id = rp.permission_id
    where m.organization_id = target_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and o.status = 'active'
      and o.deleted_at is null
      and p.key = permission_key
  );
$$;

create or replace function app.can_access_branch(target_organization_id uuid, target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.organization_id = target_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and (
        target_branch_id is null
        or not exists (select 1 from public.membership_branches mb0 where mb0.membership_id = m.id)
        or exists (
          select 1 from public.membership_branches mb
          where mb.membership_id = m.id and mb.branch_id = target_branch_id
        )
      )
  );
$$;

create or replace function app.has_branch_permission(
  target_organization_id uuid,
  target_branch_id uuid,
  permission_key text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.has_permission(target_organization_id, permission_key)
     and app.can_access_branch(target_organization_id, target_branch_id);
$$;

create or replace function app.can_view_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_user_id = auth.uid() or exists (
    select 1
    from public.memberships mine
    join public.memberships theirs on theirs.organization_id = mine.organization_id
    where mine.user_id = auth.uid() and mine.status = 'active'
      and theirs.user_id = target_user_id and theirs.status in ('active', 'invited')
  );
$$;

revoke all on all functions in schema app from public;
grant execute on function app.is_org_member(uuid) to authenticated, service_role;
grant execute on function app.has_permission(uuid, text) to authenticated, service_role;
grant execute on function app.can_access_branch(uuid, uuid) to authenticated, service_role;
grant execute on function app.has_branch_permission(uuid, uuid, text) to authenticated, service_role;
grant execute on function app.can_view_profile(uuid) to authenticated, service_role;
