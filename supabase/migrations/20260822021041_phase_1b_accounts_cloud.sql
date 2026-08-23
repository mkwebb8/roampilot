create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create type public.household_role as enum ('owner', 'admin', 'member');
create type public.membership_status as enum ('active', 'removed');
create type public.invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
create type public.data_confidence as enum ('verified', 'reported', 'estimated', 'unknown');
create type public.lifecycle_status as enum ('active', 'archived', 'deleted');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale text not null default 'en-US',
  unit_system text not null default 'us' check (unit_system in ('us', 'metric')),
  active_household_id uuid,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  status public.lifecycle_status not null default 'active',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.profiles add constraint profiles_active_household_fk
  foreign key (active_household_id) references public.households(id) on delete set null;

create table public.household_memberships (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.household_role not null default 'member',
  status public.membership_status not null default 'active',
  invited_by uuid references auth.users(id),
  joined_at timestamptz not null default now(),
  removed_at timestamptz,
  primary key (household_id, user_id)
);

create table public.household_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  email extensions.citext not null,
  role public.household_role not null default 'member' check (role <> 'owner'),
  token_hash text not null unique,
  status public.invitation_status not null default 'pending',
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.household_preferences (
  household_id uuid primary key references public.households(id) on delete cascade,
  home_base text,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.rvs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  nickname text,
  year integer check (year between 1900 and 2200),
  manufacturer text,
  model text,
  rv_type text,
  status public.lifecycle_status not null default 'active',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rv_specifications (
  rv_id uuid primary key references public.rvs(id) on delete cascade,
  length_mm integer check (length_mm > 0),
  height_mm integer check (height_mm > 0),
  width_mm integer check (width_mm > 0),
  gvwr_kg numeric(10,3) check (gvwr_kg > 0),
  electrical_service text,
  slides integer check (slides >= 0),
  fresh_tank_l numeric(10,3) check (fresh_tank_l >= 0),
  gray_tank_l numeric(10,3) check (gray_tank_l >= 0),
  black_tank_l numeric(10,3) check (black_tank_l >= 0),
  propane_capacity_kg numeric(10,3) check (propane_capacity_kg >= 0),
  has_generator boolean not null default false,
  confidence public.data_confidence not null default 'reported',
  updated_at timestamptz not null default now()
);

create table public.tow_vehicles (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  nickname text,
  year integer check (year between 1900 and 2200),
  manufacturer text,
  model text,
  engine text,
  fuel_type text,
  status public.lifecycle_status not null default 'active',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tow_vehicle_specifications (
  tow_vehicle_id uuid primary key references public.tow_vehicles(id) on delete cascade,
  tank_capacity_l numeric(10,3) check (tank_capacity_l >= 0),
  estimated_towing_l_per_100km numeric(10,3) check (estimated_towing_l_per_100km > 0),
  gvwr_kg numeric(10,3) check (gvwr_kg > 0),
  gcwr_kg numeric(10,3) check (gcwr_kg > 0),
  payload_kg numeric(10,3) check (payload_kg > 0),
  max_tow_kg numeric(10,3) check (max_tow_kg > 0),
  confidence public.data_confidence not null default 'reported',
  updated_at timestamptz not null default now()
);

create table public.rig_pairings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  rv_id uuid not null references public.rvs(id) on delete cascade,
  tow_vehicle_id uuid references public.tow_vehicles(id) on delete set null,
  nickname text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, rv_id, tow_vehicle_id)
);

create table public.rig_verifications (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  entity_type text not null check (entity_type in ('rv', 'tow_vehicle', 'rig_pairing')),
  entity_id uuid not null,
  field_key text not null,
  confidence public.data_confidence not null,
  source_type text,
  evidence_reference text,
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  supersedes_id uuid references public.rig_verifications(id),
  created_at timestamptz not null default now()
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  source_trip_id text,
  destination text not null,
  region text,
  leave_date date,
  return_date date,
  status public.lifecycle_status not null default 'active',
  active_rig_pairing_id uuid references public.rig_pairings(id) on delete set null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, source_trip_id)
);

create table public.trip_snapshots (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null unique references public.trips(id) on delete cascade,
  schema_version integer not null default 1,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  source_url text,
  license_notes text,
  refresh_policy text,
  created_at timestamptz not null default now()
);

create table public.fact_observations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  field_key text not null,
  value jsonb,
  confidence public.data_confidence not null default 'unknown',
  source_id uuid references public.data_sources(id),
  source_record_id text,
  observed_at timestamptz,
  effective_at timestamptz,
  expires_at timestamptz,
  supersedes_id uuid references public.fact_observations(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.migration_receipts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  fingerprint text not null,
  source_schema_version integer not null,
  imported_counts jsonb not null default '{}'::jsonb,
  skipped_counts jsonb not null default '{}'::jsonb,
  failed_counts jsonb not null default '{}'::jsonb,
  status text not null check (status in ('started', 'completed', 'partial', 'rolled_back')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, fingerprint)
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  household_id uuid references public.households(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  outcome text not null default 'success',
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.data_exports (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  status text not null default 'requested' check (status in ('requested', 'ready', 'downloaded', 'expired', 'failed')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  scope text not null check (scope in ('account', 'household')),
  status text not null default 'pending' check (status in ('pending', 'cancelled', 'processing', 'completed')),
  purge_after timestamptz not null default (now() + interval '30 days'),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((scope = 'account' and user_id is not null) or (scope = 'household' and household_id is not null))
);

create index household_memberships_user_idx on public.household_memberships(user_id, status);
create index household_invitations_household_idx on public.household_invitations(household_id, status);
create index rvs_household_idx on public.rvs(household_id, status);
create index tow_vehicles_household_idx on public.tow_vehicles(household_id, status);
create index rig_pairings_household_idx on public.rig_pairings(household_id, is_active);
create index trips_household_idx on public.trips(household_id, status, updated_at desc);
create index fact_observations_entity_idx on public.fact_observations(entity_type, entity_id, field_key);
create index audit_events_household_idx on public.audit_events(household_id, created_at desc);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.is_active_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and not exists (
    select 1 from public.deletion_requests d
    where d.user_id = (select auth.uid()) and d.scope = 'account' and d.status in ('pending', 'processing')
  );
$$;

create or replace function private.is_household_member(target_household uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_active_user() and exists (
    select 1 from public.household_memberships m
    where m.household_id = target_household and m.user_id = (select auth.uid()) and m.status = 'active'
  ) and not exists (
    select 1 from public.deletion_requests d
    where d.household_id = target_household and d.scope = 'household' and d.status in ('pending', 'processing')
  );
$$;

create or replace function private.has_household_role(target_household uuid, allowed public.household_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_active_user() and exists (
    select 1 from public.household_memberships m
    where m.household_id = target_household and m.user_id = (select auth.uid())
      and m.status = 'active' and m.role = any(allowed)
  );
$$;

revoke all on all functions in schema private from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_active_user() to authenticated;
grant execute on function private.is_household_member(uuid) to authenticated;
grant execute on function private.has_household_role(uuid, public.household_role[]) to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.create_household(household_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if (select auth.uid()) is null or not private.is_active_user() then raise exception 'Authentication required'; end if;
  if char_length(trim(household_name)) not between 1 and 100 then raise exception 'Invalid household name'; end if;
  insert into public.households(name, created_by) values (trim(household_name), (select auth.uid())) returning id into new_id;
  insert into public.household_memberships(household_id, user_id, role) values (new_id, (select auth.uid()), 'owner');
  update public.profiles set active_household_id = new_id, onboarding_completed_at = coalesce(onboarding_completed_at, now()), updated_at = now() where id = (select auth.uid());
  insert into public.audit_events(household_id, actor_id, action, target_type, target_id) values (new_id, (select auth.uid()), 'household.created', 'household', new_id::text);
  return new_id;
end;
$$;
revoke all on function public.create_household(text) from public, anon;
grant execute on function public.create_household(text) to authenticated;

create or replace function public.request_account_deletion()
returns uuid language plpgsql security definer set search_path = '' as $$
declare request_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  insert into public.deletion_requests(user_id, requested_by, scope)
  values ((select auth.uid()), (select auth.uid()), 'account') returning id into request_id;
  insert into public.audit_events(actor_id, action, target_type, target_id) values ((select auth.uid()), 'account.deletion_requested', 'user', (select auth.uid())::text);
  return request_id;
end;
$$;
revoke all on function public.request_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;

create or replace function public.create_household_invitation(target_household uuid, recipient_email text, invited_role public.household_role default 'member')
returns text language plpgsql security definer set search_path = '' as $$
declare raw_token text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if invited_role = 'owner' then raise exception 'Owner invitations are not allowed'; end if;
  if not private.has_household_role(target_household, array['owner','admin']::public.household_role[]) then raise exception 'Permission denied'; end if;
  insert into public.household_invitations(household_id, email, role, token_hash, invited_by)
  values (target_household, lower(trim(recipient_email))::extensions.citext, invited_role, encode(extensions.digest(raw_token, 'sha256'), 'hex'), (select auth.uid()));
  insert into public.audit_events(household_id, actor_id, action, target_type, outcome)
  values (target_household, (select auth.uid()), 'household.invitation_created', 'invitation', 'success');
  return raw_token;
end;
$$;
revoke all on function public.create_household_invitation(uuid, text, public.household_role) from public, anon;
grant execute on function public.create_household_invitation(uuid, text, public.household_role) to authenticated;

create or replace function public.accept_household_invitation(raw_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare invitation public.household_invitations%rowtype; current_email text; existing_owner boolean;
begin
  if (select auth.uid()) is null or not private.is_active_user() then raise exception 'Authentication required'; end if;
  select lower(email::text) into current_email from auth.users where id = (select auth.uid());
  select * into invitation from public.household_invitations
  where token_hash = encode(extensions.digest(raw_token, 'sha256'), 'hex') and status = 'pending' for update;
  if invitation.id is null or invitation.expires_at <= now() then raise exception 'Invitation is invalid or expired'; end if;
  if lower(invitation.email::text) <> current_email then raise exception 'Invitation email does not match this account'; end if;
  insert into public.household_memberships(household_id, user_id, role, invited_by)
  values (invitation.household_id, (select auth.uid()), invitation.role, invitation.invited_by)
  on conflict (household_id, user_id) do update set role = excluded.role, status = 'active', removed_at = null;
  update public.household_invitations set status = 'accepted', accepted_by = (select auth.uid()), accepted_at = now() where id = invitation.id;
  update public.profiles set active_household_id = coalesce(active_household_id, invitation.household_id), onboarding_completed_at = coalesce(onboarding_completed_at, now()) where id = (select auth.uid());
  insert into public.audit_events(household_id, actor_id, action, target_type, target_id)
  values (invitation.household_id, (select auth.uid()), 'household.invitation_accepted', 'invitation', invitation.id::text);
  return invitation.household_id;
end;
$$;
revoke all on function public.accept_household_invitation(text) from public, anon;
grant execute on function public.accept_household_invitation(text) to authenticated;

create or replace function public.change_household_member_role(target_household uuid, target_user uuid, next_role public.household_role)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_household_role(target_household, array['owner']::public.household_role[]) then raise exception 'Owner permission required'; end if;
  if target_user = (select auth.uid()) then raise exception 'Use ownership transfer for the current owner'; end if;
  if next_role = 'owner' then raise exception 'Use ownership transfer'; end if;
  update public.household_memberships set role = next_role where household_id = target_household and user_id = target_user and status = 'active' and role <> 'owner';
  if not found then raise exception 'Member not found or cannot be changed'; end if;
  insert into public.audit_events(household_id, actor_id, action, target_type, target_id, metadata)
  values (target_household, (select auth.uid()), 'household.member_role_changed', 'user', target_user::text, jsonb_build_object('role', next_role));
end;
$$;
revoke all on function public.change_household_member_role(uuid, uuid, public.household_role) from public, anon;
grant execute on function public.change_household_member_role(uuid, uuid, public.household_role) to authenticated;

create or replace function public.remove_household_member(target_household uuid, target_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_role public.household_role; target_role public.household_role;
begin
  select role into actor_role from public.household_memberships where household_id = target_household and user_id = (select auth.uid()) and status = 'active';
  select role into target_role from public.household_memberships where household_id = target_household and user_id = target_user and status = 'active';
  if actor_role not in ('owner','admin') then raise exception 'Permission denied'; end if;
  if target_role = 'owner' then raise exception 'The owner cannot be removed'; end if;
  if actor_role = 'admin' and target_role = 'admin' then raise exception 'Admins cannot remove other admins'; end if;
  update public.household_memberships set status = 'removed', removed_at = now() where household_id = target_household and user_id = target_user;
  update public.profiles set active_household_id = null where id = target_user and active_household_id = target_household;
  insert into public.audit_events(household_id, actor_id, action, target_type, target_id)
  values (target_household, (select auth.uid()), 'household.member_removed', 'user', target_user::text);
end;
$$;
revoke all on function public.remove_household_member(uuid, uuid) from public, anon;
grant execute on function public.remove_household_member(uuid, uuid) to authenticated;

create or replace function public.transfer_household_ownership(target_household uuid, next_owner uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_household_role(target_household, array['owner']::public.household_role[]) then raise exception 'Owner permission required'; end if;
  if not exists (select 1 from public.household_memberships where household_id = target_household and user_id = next_owner and status = 'active') then raise exception 'New owner must be an active member'; end if;
  update public.household_memberships set role = case when user_id = next_owner then 'owner'::public.household_role else 'admin'::public.household_role end
  where household_id = target_household and user_id in ((select auth.uid()), next_owner);
  insert into public.audit_events(household_id, actor_id, action, target_type, target_id)
  values (target_household, (select auth.uid()), 'household.ownership_transferred', 'user', next_owner::text);
end;
$$;
revoke all on function public.transfer_household_ownership(uuid, uuid) from public, anon;
grant execute on function public.transfer_household_ownership(uuid, uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_memberships enable row level security;
alter table public.household_invitations enable row level security;
alter table public.user_preferences enable row level security;
alter table public.household_preferences enable row level security;
alter table public.rvs enable row level security;
alter table public.rv_specifications enable row level security;
alter table public.tow_vehicles enable row level security;
alter table public.tow_vehicle_specifications enable row level security;
alter table public.rig_pairings enable row level security;
alter table public.rig_verifications enable row level security;
alter table public.trips enable row level security;
alter table public.trip_snapshots enable row level security;
alter table public.data_sources enable row level security;
alter table public.fact_observations enable row level security;
alter table public.migration_receipts enable row level security;
alter table public.audit_events enable row level security;
alter table public.data_exports enable row level security;
alter table public.deletion_requests enable row level security;

create policy profiles_select on public.profiles for select to authenticated using (id = (select auth.uid()) and private.is_active_user());
create policy profiles_update on public.profiles for update to authenticated using (id = (select auth.uid()) and private.is_active_user()) with check (id = (select auth.uid()));
create policy households_select on public.households for select to authenticated using (private.is_household_member(id));
create policy households_update on public.households for update to authenticated using (private.has_household_role(id, array['owner','admin']::public.household_role[])) with check (private.has_household_role(id, array['owner','admin']::public.household_role[]));
create policy memberships_select on public.household_memberships for select to authenticated using (private.is_household_member(household_id));
create policy invitations_select on public.household_invitations for select to authenticated using (private.has_household_role(household_id, array['owner','admin']::public.household_role[]));
create policy invitations_insert on public.household_invitations for insert to authenticated with check (invited_by = (select auth.uid()) and private.has_household_role(household_id, array['owner','admin']::public.household_role[]));
create policy invitations_update on public.household_invitations for update to authenticated using (private.has_household_role(household_id, array['owner','admin']::public.household_role[])) with check (private.has_household_role(household_id, array['owner','admin']::public.household_role[]));
create policy user_preferences_all on public.user_preferences for all to authenticated using (user_id = (select auth.uid()) and private.is_active_user()) with check (user_id = (select auth.uid()));
create policy household_preferences_select on public.household_preferences for select to authenticated using (private.is_household_member(household_id));
create policy household_preferences_write on public.household_preferences for all to authenticated using (private.has_household_role(household_id, array['owner','admin']::public.household_role[])) with check (private.has_household_role(household_id, array['owner','admin']::public.household_role[]));

create policy rvs_select on public.rvs for select to authenticated using (private.is_household_member(household_id));
create policy rvs_insert on public.rvs for insert to authenticated with check (created_by = (select auth.uid()) and private.is_household_member(household_id));
create policy rvs_update on public.rvs for update to authenticated using (private.is_household_member(household_id)) with check (private.is_household_member(household_id));
create policy rvs_delete on public.rvs for delete to authenticated using (private.has_household_role(household_id, array['owner','admin']::public.household_role[]));
create policy rv_specs_select on public.rv_specifications for select to authenticated using (exists (select 1 from public.rvs r where r.id = rv_id and private.is_household_member(r.household_id)));
create policy rv_specs_write on public.rv_specifications for all to authenticated using (exists (select 1 from public.rvs r where r.id = rv_id and private.is_household_member(r.household_id))) with check (exists (select 1 from public.rvs r where r.id = rv_id and private.is_household_member(r.household_id)));
create policy tow_select on public.tow_vehicles for select to authenticated using (private.is_household_member(household_id));
create policy tow_insert on public.tow_vehicles for insert to authenticated with check (created_by = (select auth.uid()) and private.is_household_member(household_id));
create policy tow_update on public.tow_vehicles for update to authenticated using (private.is_household_member(household_id)) with check (private.is_household_member(household_id));
create policy tow_delete on public.tow_vehicles for delete to authenticated using (private.has_household_role(household_id, array['owner','admin']::public.household_role[]));
create policy tow_specs_select on public.tow_vehicle_specifications for select to authenticated using (exists (select 1 from public.tow_vehicles t where t.id = tow_vehicle_id and private.is_household_member(t.household_id)));
create policy tow_specs_write on public.tow_vehicle_specifications for all to authenticated using (exists (select 1 from public.tow_vehicles t where t.id = tow_vehicle_id and private.is_household_member(t.household_id))) with check (exists (select 1 from public.tow_vehicles t where t.id = tow_vehicle_id and private.is_household_member(t.household_id)));
create policy pairings_select on public.rig_pairings for select to authenticated using (private.is_household_member(household_id));
create policy pairings_write on public.rig_pairings for all to authenticated using (private.is_household_member(household_id)) with check (private.is_household_member(household_id));
create policy verifications_select on public.rig_verifications for select to authenticated using (private.is_household_member(household_id));
create policy verifications_write on public.rig_verifications for all to authenticated using (private.is_household_member(household_id)) with check (private.is_household_member(household_id) and verified_by = (select auth.uid()));

create policy trips_select on public.trips for select to authenticated using (private.is_household_member(household_id));
create policy trips_insert on public.trips for insert to authenticated with check (created_by = (select auth.uid()) and private.is_household_member(household_id));
create policy trips_update on public.trips for update to authenticated using (private.is_household_member(household_id)) with check (private.is_household_member(household_id));
create policy trips_delete on public.trips for delete to authenticated using (private.is_household_member(household_id));
create policy trip_snapshots_select on public.trip_snapshots for select to authenticated using (exists (select 1 from public.trips t where t.id = trip_id and private.is_household_member(t.household_id)));
create policy trip_snapshots_insert on public.trip_snapshots for insert to authenticated with check (exists (select 1 from public.trips t where t.id = trip_id and private.is_household_member(t.household_id)));

create policy sources_select on public.data_sources for select to authenticated using (true);
create policy facts_select on public.fact_observations for select to authenticated using (household_id is null or private.is_household_member(household_id));
create policy facts_write on public.fact_observations for all to authenticated using (household_id is not null and private.is_household_member(household_id)) with check (household_id is not null and private.is_household_member(household_id) and created_by = (select auth.uid()));
create policy migrations_select on public.migration_receipts for select to authenticated using (user_id = (select auth.uid()) and private.is_household_member(household_id));
create policy migrations_insert on public.migration_receipts for insert to authenticated with check (user_id = (select auth.uid()) and private.is_household_member(household_id));
create policy migrations_update on public.migration_receipts for update to authenticated using (user_id = (select auth.uid()) and private.is_household_member(household_id)) with check (user_id = (select auth.uid()) and private.is_household_member(household_id));
create policy audit_select on public.audit_events for select to authenticated using (actor_id = (select auth.uid()) or (household_id is not null and private.has_household_role(household_id, array['owner']::public.household_role[])));
create policy exports_select on public.data_exports for select to authenticated using (requested_by = (select auth.uid()) and private.has_household_role(household_id, array['owner']::public.household_role[]));
create policy exports_insert on public.data_exports for insert to authenticated with check (requested_by = (select auth.uid()) and private.has_household_role(household_id, array['owner']::public.household_role[]));
create policy deletions_select on public.deletion_requests for select to authenticated using (requested_by = (select auth.uid()));

grant select, update on public.profiles to authenticated;
grant select on public.households, public.household_memberships, public.data_sources, public.audit_events, public.deletion_requests to authenticated;
grant select, insert, update on public.household_invitations, public.user_preferences, public.household_preferences, public.rv_specifications, public.tow_vehicle_specifications, public.rig_pairings, public.rig_verifications, public.fact_observations, public.migration_receipts, public.data_exports to authenticated;
grant select, insert, update, delete on public.rvs, public.tow_vehicles, public.trips to authenticated;
grant select, insert on public.trip_snapshots to authenticated;

insert into public.data_sources(key, name, source_url, refresh_policy) values
  ('owner', 'RV owner', null, 'Owner maintained'),
  ('roampilot-mock', 'RoamPilot planning data', null, 'Mock — not live'),
  ('nps', 'National Park Service', 'https://www.nps.gov/subjects/developer/', 'Provider dependent'),
  ('ridb', 'Recreation.gov RIDB', 'https://ridb.recreation.gov/', 'Provider dependent')
on conflict (key) do nothing;
