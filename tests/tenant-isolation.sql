-- Run against a disposable/non-customer database context. This transaction always rolls back.
begin;

do $$
declare
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  household_a uuid := gen_random_uuid();
  household_b uuid := gen_random_uuid();
  rv_a uuid := gen_random_uuid();
  rv_b uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (user_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tenant-a@invalid.test', '', now(), '{}', '{}', now(), now()),
    (user_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tenant-b@invalid.test', '', now(), '{}', '{}', now(), now());

  insert into public.households (id, name, created_by) values
    (household_a, 'Tenant A', user_a), (household_b, 'Tenant B', user_b);
  insert into public.household_memberships (household_id, user_id, role) values
    (household_a, user_a, 'owner'), (household_b, user_b, 'owner');
  insert into public.rvs (id, household_id, model, created_by) values
    (rv_a, household_a, 'Visible RV', user_a), (rv_b, household_b, 'Hidden RV', user_b);

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', user_a, 'role', 'authenticated')::text, true);

  if (select count(*) from public.rvs) <> 1 then
    raise exception 'tenant isolation failed: unexpected visible RV count';
  end if;
  if exists (select 1 from public.rvs where id = rv_b) then
    raise exception 'tenant isolation failed: cross-household RV visible';
  end if;
  update public.rvs set model = 'Unauthorized update' where id = rv_b;
  if found then
    raise exception 'tenant isolation failed: cross-household update succeeded';
  end if;
end $$;

rollback;
