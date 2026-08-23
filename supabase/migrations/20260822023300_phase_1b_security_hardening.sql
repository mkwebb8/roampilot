-- Supabase creates this helper for automatic RLS enablement. It is not an application RPC.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

create index if not exists profiles_active_household_idx on public.profiles(active_household_id);
create index if not exists households_created_by_idx on public.households(created_by);
create index if not exists audit_events_actor_idx on public.audit_events(actor_id);
create index if not exists data_exports_household_idx on public.data_exports(household_id);
create index if not exists data_exports_requested_by_idx on public.data_exports(requested_by);
create index if not exists deletion_requests_user_idx on public.deletion_requests(user_id, status);
create index if not exists deletion_requests_household_idx on public.deletion_requests(household_id, status);
create index if not exists deletion_requests_requested_by_idx on public.deletion_requests(requested_by);
create index if not exists facts_household_idx on public.fact_observations(household_id);
create index if not exists facts_source_idx on public.fact_observations(source_id);
create index if not exists facts_created_by_idx on public.fact_observations(created_by);
create index if not exists facts_supersedes_idx on public.fact_observations(supersedes_id);
create index if not exists migration_receipts_household_idx on public.migration_receipts(household_id);
create index if not exists rig_pairings_rv_idx on public.rig_pairings(rv_id);
create index if not exists rig_pairings_tow_idx on public.rig_pairings(tow_vehicle_id);
create index if not exists rig_verifications_household_idx on public.rig_verifications(household_id);
create index if not exists rig_verifications_verified_by_idx on public.rig_verifications(verified_by);
create index if not exists rig_verifications_supersedes_idx on public.rig_verifications(supersedes_id);
create index if not exists rvs_created_by_idx on public.rvs(created_by);
create index if not exists tow_vehicles_created_by_idx on public.tow_vehicles(created_by);
create index if not exists trips_created_by_idx on public.trips(created_by);
create index if not exists trips_pairing_idx on public.trips(active_rig_pairing_id);

-- Replace FOR ALL policies where a dedicated SELECT policy already exists.
drop policy if exists household_preferences_write on public.household_preferences;
create policy household_preferences_insert on public.household_preferences for insert to authenticated
  with check (private.has_household_role(household_id, array['owner','admin']::public.household_role[]));
create policy household_preferences_update on public.household_preferences for update to authenticated
  using (private.has_household_role(household_id, array['owner','admin']::public.household_role[]))
  with check (private.has_household_role(household_id, array['owner','admin']::public.household_role[]));

drop policy if exists rv_specs_write on public.rv_specifications;
create policy rv_specs_insert on public.rv_specifications for insert to authenticated with check
  (exists (select 1 from public.rvs r where r.id = rv_id and private.is_household_member(r.household_id)));
create policy rv_specs_update on public.rv_specifications for update to authenticated using
  (exists (select 1 from public.rvs r where r.id = rv_id and private.is_household_member(r.household_id))) with check
  (exists (select 1 from public.rvs r where r.id = rv_id and private.is_household_member(r.household_id)));

drop policy if exists tow_specs_write on public.tow_vehicle_specifications;
create policy tow_specs_insert on public.tow_vehicle_specifications for insert to authenticated with check
  (exists (select 1 from public.tow_vehicles t where t.id = tow_vehicle_id and private.is_household_member(t.household_id)));
create policy tow_specs_update on public.tow_vehicle_specifications for update to authenticated using
  (exists (select 1 from public.tow_vehicles t where t.id = tow_vehicle_id and private.is_household_member(t.household_id))) with check
  (exists (select 1 from public.tow_vehicles t where t.id = tow_vehicle_id and private.is_household_member(t.household_id)));

drop policy if exists pairings_write on public.rig_pairings;
create policy pairings_insert on public.rig_pairings for insert to authenticated with check (private.is_household_member(household_id));
create policy pairings_update on public.rig_pairings for update to authenticated using (private.is_household_member(household_id)) with check (private.is_household_member(household_id));
create policy pairings_delete on public.rig_pairings for delete to authenticated using (private.has_household_role(household_id, array['owner','admin']::public.household_role[]));

drop policy if exists verifications_write on public.rig_verifications;
create policy verifications_insert on public.rig_verifications for insert to authenticated with check (private.is_household_member(household_id) and verified_by = (select auth.uid()));
create policy verifications_update on public.rig_verifications for update to authenticated using (private.is_household_member(household_id) and verified_by = (select auth.uid())) with check (private.is_household_member(household_id) and verified_by = (select auth.uid()));

drop policy if exists facts_write on public.fact_observations;
create policy facts_insert on public.fact_observations for insert to authenticated with check (household_id is not null and private.is_household_member(household_id) and created_by = (select auth.uid()));
create policy facts_update on public.fact_observations for update to authenticated using (household_id is not null and private.is_household_member(household_id) and created_by = (select auth.uid())) with check (household_id is not null and private.is_household_member(household_id) and created_by = (select auth.uid()));
