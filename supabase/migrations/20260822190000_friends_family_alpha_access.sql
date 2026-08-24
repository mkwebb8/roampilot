-- Friends & Family Alpha access control, kill switch, and tester feedback.
-- Existing household policies remain in force. Alpha policies are RESTRICTIVE.

create schema if not exists private;

create table private.alpha_program_settings (
  singleton boolean primary key default true check (singleton),
  is_open boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

insert into private.alpha_program_settings (singleton, is_open)
values (true, false)
on conflict (singleton) do nothing;

create table private.alpha_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table private.alpha_testers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  normalized_email text generated always as (lower(trim(email))) stored,
  user_id uuid unique references auth.users(id) on delete set null,
  status text not null default 'invited' check (status in ('invited', 'active', 'revoked')),
  invited_by uuid references auth.users(id),
  invited_at timestamptz not null default now(),
  activated_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (normalized_email)
);

-- The production owner seed is an environment-specific operational action.
-- It must be completed and verified before enabling the signup hook; generated
-- auth user IDs and customer email addresses do not belong in migrations.

create or replace function private.is_alpha_admin(target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select target_user is not null and exists (
    select 1 from private.alpha_admins where user_id = target_user
  );
$$;

create or replace function private.has_alpha_access(target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select target_user is not null and (
    private.is_alpha_admin(target_user)
    or (
      (select is_open from private.alpha_program_settings where singleton = true)
      and exists (
        select 1 from private.alpha_testers
        where user_id = target_user and status = 'active'
      )
    )
  );
$$;

revoke all on function private.is_alpha_admin(uuid) from public, anon, authenticated;
revoke all on function private.has_alpha_access(uuid) from public, anon, authenticated;

create or replace function public.alpha_access_status()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  tester_status text;
  program_open boolean;
  admin boolean;
begin
  if caller is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select is_open into program_open from private.alpha_program_settings where singleton = true;
  admin := private.is_alpha_admin(caller);
  select status into tester_status from private.alpha_testers where user_id = caller;
  return jsonb_build_object(
    'allowed', private.has_alpha_access(caller),
    'isAdmin', admin,
    'programOpen', coalesce(program_open, false),
    'testerStatus', coalesce(tester_status, 'not_invited')
  );
end;
$$;

create or replace function public.list_alpha_testers()
returns table(id uuid, email text, status text, user_id uuid, invited_at timestamptz, activated_at timestamptz, revoked_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_alpha_admin(auth.uid()) then raise exception 'Alpha owner access required' using errcode = '42501'; end if;
  return query select t.id, t.email, t.status, t.user_id, t.invited_at, t.activated_at, t.revoked_at
    from private.alpha_testers t order by t.invited_at desc;
end;
$$;

create or replace function public.add_alpha_tester(tester_email text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare tester_id uuid; normalized text := lower(trim(tester_email));
begin
  if not private.is_alpha_admin(auth.uid()) then raise exception 'Alpha owner access required' using errcode = '42501'; end if;
  if normalized !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'Enter a valid email address'; end if;
  insert into private.alpha_testers (email, status, invited_by, revoked_at)
  values (normalized, 'invited', auth.uid(), null)
  on conflict (normalized_email) do update set email = excluded.email, status = case when private.alpha_testers.user_id is null then 'invited' else 'active' end,
    invited_by = auth.uid(), invited_at = now(), revoked_at = null, updated_at = now()
  returning id into tester_id;
  return tester_id;
end;
$$;

create or replace function public.revoke_alpha_tester(tester_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare target_user uuid;
begin
  if not private.is_alpha_admin(auth.uid()) then raise exception 'Alpha owner access required' using errcode = '42501'; end if;
  select user_id into target_user from private.alpha_testers where id = tester_id;
  if target_user is not null and private.is_alpha_admin(target_user) then raise exception 'The production alpha owner cannot be revoked'; end if;
  update private.alpha_testers set status = 'revoked', revoked_at = now(), updated_at = now() where id = tester_id;
  if not found then raise exception 'Tester not found'; end if;
  if target_user is not null then delete from auth.sessions where user_id = target_user; end if;
end;
$$;

create or replace function public.set_alpha_open(next_open boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_alpha_admin(auth.uid()) then raise exception 'Alpha owner access required' using errcode = '42501'; end if;
  update private.alpha_program_settings set is_open = next_open, updated_at = now(), updated_by = auth.uid() where singleton = true;
end;
$$;

create or replace function private.before_user_created_hook(event jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare incoming_email text := lower(trim(event->'user'->>'email')); allowed boolean;
begin
  select exists (
    select 1 from private.alpha_testers t
    where t.normalized_email = incoming_email and t.status in ('invited', 'active')
  ) into allowed;
  if not allowed then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'This Google account is not invited to the RoamPilot alpha.'));
  end if;
  return '{}'::jsonb;
end;
$$;

create or replace function private.activate_alpha_tester()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update private.alpha_testers set user_id = new.id, status = 'active', activated_at = coalesce(activated_at, now()), revoked_at = null, updated_at = now()
  where normalized_email = lower(trim(new.email));
  return new;
end;
$$;

drop trigger if exists activate_alpha_tester_after_signup on auth.users;
create trigger activate_alpha_tester_after_signup after insert or update of email on auth.users
for each row execute function private.activate_alpha_tester();

grant usage on schema private to supabase_auth_admin;
grant execute on function private.before_user_created_hook(jsonb) to supabase_auth_admin;
revoke execute on function private.before_user_created_hook(jsonb) from public, anon, authenticated;

revoke all on function public.alpha_access_status() from public, anon;
revoke all on function public.list_alpha_testers() from public, anon;
revoke all on function public.add_alpha_tester(text) from public, anon;
revoke all on function public.revoke_alpha_tester(uuid) from public, anon;
revoke all on function public.set_alpha_open(boolean) from public, anon;
grant execute on function public.alpha_access_status() to authenticated;
grant execute on function public.list_alpha_testers() to authenticated;
grant execute on function public.add_alpha_tester(text) to authenticated;
grant execute on function public.revoke_alpha_tester(uuid) to authenticated;
grant execute on function public.set_alpha_open(boolean) to authenticated;

create table public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  category text not null check (category in ('missing_campground','incorrect_campground_data','routing_issue','rig_fit_issue','bug','feature_request','other')),
  details text not null check (char_length(trim(details)) between 5 and 4000),
  page_path text,
  related_item_id text,
  context jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new','reviewing','resolved','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index feedback_reports_user_id_idx on public.feedback_reports(user_id);
create index feedback_reports_household_id_idx on public.feedback_reports(household_id);
alter table public.feedback_reports enable row level security;
create policy feedback_own_select on public.feedback_reports for select to authenticated
  using (user_id = (select auth.uid()) and private.is_household_member(household_id));
create policy feedback_own_insert on public.feedback_reports for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_household_member(household_id));
create policy feedback_alpha_access on public.feedback_reports as restrictive for all to authenticated
  using ((select private.has_alpha_access())) with check ((select private.has_alpha_access()));

-- Add an independent alpha-access requirement to every existing exposed table.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','households','household_memberships','household_invitations','user_preferences','household_preferences',
    'rvs','rv_specifications','tow_vehicles','tow_vehicle_specifications','rig_pairings','rig_verifications',
    'trips','trip_snapshots','data_sources','fact_observations','migration_receipts','audit_events','data_exports','deletion_requests'
  ] loop
    execute format('create policy alpha_access_required on public.%I as restrictive for all to authenticated using ((select private.has_alpha_access())) with check ((select private.has_alpha_access()))', table_name);
  end loop;
end $$;

-- Existing SECURITY DEFINER household helpers now also enforce alpha access.
create or replace function private.is_active_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_alpha_access(auth.uid()) and not exists (
    select 1 from public.deletion_requests d
    where d.user_id = auth.uid() and d.scope = 'account' and d.status in ('pending', 'processing')
  );
$$;
create or replace function private.is_household_member(target_household uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_alpha_access(auth.uid()) and exists (
    select 1 from public.household_memberships m where m.household_id = target_household and m.user_id = auth.uid() and m.status = 'active'
  );
$$;
create or replace function private.has_household_role(target_household uuid, allowed public.household_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_alpha_access(auth.uid()) and exists (
    select 1 from public.household_memberships m where m.household_id = target_household and m.user_id = auth.uid() and m.status = 'active' and m.role = any(allowed)
  );
$$;

-- Two legacy privileged RPCs did not call the shared membership helpers.
create or replace function public.request_account_deletion()
returns uuid language plpgsql security definer set search_path = '' as $$
declare request_id uuid;
begin
  if auth.uid() is null or not private.has_alpha_access(auth.uid()) then raise exception 'Active alpha access required' using errcode = '42501'; end if;
  insert into public.deletion_requests(user_id, requested_by, scope)
  values (auth.uid(), auth.uid(), 'account') returning id into request_id;
  insert into public.audit_events(actor_id, action, target_type, target_id)
  values (auth.uid(), 'account.deletion_requested', 'user', auth.uid()::text);
  return request_id;
end;
$$;

create or replace function public.remove_household_member(target_household uuid, target_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_role public.household_role; target_role public.household_role;
begin
  if not private.has_alpha_access(auth.uid()) then raise exception 'Active alpha access required' using errcode = '42501'; end if;
  select role into actor_role from public.household_memberships where household_id = target_household and user_id = auth.uid() and status = 'active';
  select role into target_role from public.household_memberships where household_id = target_household and user_id = target_user and status = 'active';
  if actor_role not in ('owner','admin') then raise exception 'Permission denied'; end if;
  if target_role = 'owner' then raise exception 'The owner cannot be removed'; end if;
  if actor_role = 'admin' and target_role = 'admin' then raise exception 'Admins cannot remove other admins'; end if;
  update public.household_memberships set status = 'removed', removed_at = now() where household_id = target_household and user_id = target_user;
  update public.profiles set active_household_id = null where id = target_user and active_household_id = target_household;
  insert into public.audit_events(household_id, actor_id, action, target_type, target_id)
  values (target_household, auth.uid(), 'household.member_removed', 'user', target_user::text);
end;
$$;
