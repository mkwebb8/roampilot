import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { RigProfile, ScoredTrip } from "./types";
import type { CloudRig, CloudTrip, HouseholdMember, HouseholdMembership, HouseholdRole, MigrationPreview } from "./cloud-types";

const MM_PER_FOOT = 304.8;
const KG_PER_POUND = 0.45359237;
const L_PER_GALLON = 3.785411784;
const L_PER_100KM_PER_MPG = 235.214583;

export class CloudRepository {
  constructor(private readonly client: SupabaseClient) {}

  async memberships(): Promise<HouseholdMembership[]> {
    const { data, error } = await this.client
      .from("household_memberships")
      .select("household_id,role,households(id,name)")
      .eq("status", "active");
    if (error) throw error;
    return (data ?? []) as unknown as HouseholdMembership[];
  }

  async createHousehold(name: string): Promise<string> {
    const { data, error } = await this.client.rpc("create_household", { household_name: name });
    if (error) throw error;
    return data as string;
  }

  async householdMembers(householdId: string): Promise<HouseholdMember[]> {
    const { data, error } = await this.client.from("household_memberships").select("household_id,user_id,role,status,joined_at").eq("household_id", householdId).eq("status", "active").order("joined_at");
    if (error) throw error;
    return (data ?? []) as HouseholdMember[];
  }

  async createInvitation(householdId: string, email: string, role: Exclude<HouseholdRole, "owner">): Promise<string> {
    const { data, error } = await this.client.rpc("create_household_invitation", { target_household: householdId, recipient_email: email, invited_role: role });
    if (error) throw error;
    return data as string;
  }

  async acceptInvitation(token: string): Promise<string> {
    const { data, error } = await this.client.rpc("accept_household_invitation", { raw_token: token });
    if (error) throw error;
    return data as string;
  }

  async changeMemberRole(householdId: string, userId: string, role: Exclude<HouseholdRole, "owner">): Promise<void> {
    const { error } = await this.client.rpc("change_household_member_role", { target_household: householdId, target_user: userId, next_role: role });
    if (error) throw error;
  }

  async removeMember(householdId: string, userId: string): Promise<void> {
    const { error } = await this.client.rpc("remove_household_member", { target_household: householdId, target_user: userId });
    if (error) throw error;
  }

  async transferOwnership(householdId: string, userId: string): Promise<void> {
    const { error } = await this.client.rpc("transfer_household_ownership", { target_household: householdId, next_owner: userId });
    if (error) throw error;
  }

  async setActiveHousehold(householdId: string): Promise<void> {
    const { error } = await this.client.from("profiles").update({ active_household_id: householdId }).eq("id", (await this.user()).id);
    if (error) throw error;
  }

  async profile(): Promise<{ active_household_id: string | null; display_name: string | null } | null> {
    const { data, error } = await this.client.from("profiles").select("active_household_id,display_name").maybeSingle();
    if (error) throw error;
    return data;
  }

  async loadRig(householdId: string): Promise<CloudRig | null> {
    const { data: pairing, error } = await this.client
      .from("rig_pairings")
      .select("id,rv_id,tow_vehicle_id")
      .eq("household_id", householdId)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    if (!pairing?.rv_id || !pairing.tow_vehicle_id) return null;
    const [{ data: rv, error: rvError }, { data: tow, error: towError }, { data: prefs, error: prefsError }] = await Promise.all([
      this.client.from("rvs").select("year,manufacturer,model,rv_type,rv_specifications(*)").eq("id", pairing.rv_id).single(),
      this.client.from("tow_vehicles").select("year,manufacturer,model,engine,fuel_type,tow_vehicle_specifications(*)").eq("id", pairing.tow_vehicle_id).single(),
      this.client.from("household_preferences").select("home_base").eq("household_id", householdId).maybeSingle(),
    ]);
    if (rvError) throw rvError;
    if (towError) throw towError;
    if (prefsError) throw prefsError;
    const rvSpec = firstRelated(rv.rv_specifications);
    const towSpec = firstRelated(tow.tow_vehicle_specifications);
    return {
      rvId: pairing.rv_id,
      towVehicleId: pairing.tow_vehicle_id,
      pairingId: pairing.id,
      confidence: (rvSpec?.confidence ?? "reported") as CloudRig["confidence"],
      profile: {
        home: prefs?.home_base ?? "",
        rv: {
          year: rv.year ?? 0,
          manufacturer: rv.manufacturer ?? "",
          model: rv.model ?? "",
          type: rv.rv_type ?? "",
          lengthFt: round((rvSpec?.length_mm ?? 0) / MM_PER_FOOT, 2),
          heightFt: round((rvSpec?.height_mm ?? 0) / MM_PER_FOOT, 2),
          widthFt: round((rvSpec?.width_mm ?? 0) / MM_PER_FOOT, 2),
          gvwr: Math.round((rvSpec?.gvwr_kg ?? 0) / KG_PER_POUND),
          service: rvSpec?.electrical_service ?? "",
          slides: rvSpec?.slides ?? 0,
          freshTank: round((rvSpec?.fresh_tank_l ?? 0) / L_PER_GALLON, 1),
          generator: Boolean(rvSpec?.has_generator),
        },
        towVehicle: {
          year: tow.year ?? 0,
          manufacturer: tow.manufacturer ?? "",
          model: tow.model ?? "",
          engine: tow.engine ?? "",
          fuel: tow.fuel_type ?? "",
          tankGallons: round((towSpec?.tank_capacity_l ?? 0) / L_PER_GALLON, 1),
          towingMpg: round(L_PER_100KM_PER_MPG / (towSpec?.estimated_towing_l_per_100km || 1), 1),
        },
      },
    };
  }

  async saveRig(householdId: string, rig: RigProfile, existing?: CloudRig | null): Promise<CloudRig> {
    const user = await this.user();
    const rvPayload = { household_id: householdId, year: rig.rv.year, manufacturer: rig.rv.manufacturer, model: rig.rv.model, rv_type: rig.rv.type, created_by: user.id };
    const towPayload = { household_id: householdId, year: rig.towVehicle.year, manufacturer: rig.towVehicle.manufacturer, model: rig.towVehicle.model, engine: rig.towVehicle.engine, fuel_type: rig.towVehicle.fuel, created_by: user.id };
    const rvResult = existing
      ? await this.client.from("rvs").update(rvPayload).eq("id", existing.rvId).select("id").single()
      : await this.client.from("rvs").insert(rvPayload).select("id").single();
    if (rvResult.error) throw rvResult.error;
    const towResult = existing
      ? await this.client.from("tow_vehicles").update(towPayload).eq("id", existing.towVehicleId).select("id").single()
      : await this.client.from("tow_vehicles").insert(towPayload).select("id").single();
    if (towResult.error) throw towResult.error;
    const rvId = rvResult.data.id as string;
    const towVehicleId = towResult.data.id as string;
    const { error: rvSpecError } = await this.client.from("rv_specifications").upsert({
      rv_id: rvId,
      length_mm: Math.round(rig.rv.lengthFt * MM_PER_FOOT),
      height_mm: Math.round(rig.rv.heightFt * MM_PER_FOOT),
      width_mm: Math.round(rig.rv.widthFt * MM_PER_FOOT),
      gvwr_kg: rig.rv.gvwr * KG_PER_POUND,
      electrical_service: rig.rv.service,
      slides: rig.rv.slides,
      fresh_tank_l: rig.rv.freshTank * L_PER_GALLON,
      has_generator: rig.rv.generator,
      confidence: "reported",
    });
    if (rvSpecError) throw rvSpecError;
    const { error: towSpecError } = await this.client.from("tow_vehicle_specifications").upsert({
      tow_vehicle_id: towVehicleId,
      tank_capacity_l: rig.towVehicle.tankGallons * L_PER_GALLON,
      estimated_towing_l_per_100km: L_PER_100KM_PER_MPG / Math.max(rig.towVehicle.towingMpg, 0.1),
      confidence: "estimated",
    });
    if (towSpecError) throw towSpecError;
    await this.client.from("rig_pairings").update({ is_active: false }).eq("household_id", householdId);
    const pairingResult = existing
      ? await this.client.from("rig_pairings").update({ rv_id: rvId, tow_vehicle_id: towVehicleId, is_active: true }).eq("id", existing.pairingId).select("id").single()
      : await this.client.from("rig_pairings").insert({ household_id: householdId, rv_id: rvId, tow_vehicle_id: towVehicleId, is_active: true }).select("id").single();
    if (pairingResult.error) throw pairingResult.error;
    const { error: prefsError } = await this.client.from("household_preferences").upsert({ household_id: householdId, home_base: rig.home });
    if (prefsError) throw prefsError;
    return { rvId, towVehicleId, pairingId: pairingResult.data.id, profile: rig, confidence: "reported" };
  }

  async trips(householdId: string): Promise<CloudTrip[]> {
    const { data, error } = await this.client.from("trips").select("id,source_trip_id,created_at,trip_snapshots(snapshot)").eq("household_id", householdId).eq("status", "active").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).flatMap((row) => {
      const snapshot = firstRelated(row.trip_snapshots)?.snapshot as ScoredTrip | undefined;
      return snapshot ? [{ id: row.id, sourceTripId: row.source_trip_id, trip: snapshot, savedAt: row.created_at }] : [];
    });
  }

  async saveTrip(householdId: string, trip: ScoredTrip, pairingId?: string): Promise<void> {
    const user = await this.user();
    const { data, error } = await this.client.from("trips").upsert({ household_id: householdId, source_trip_id: trip.id, destination: trip.destination, region: trip.region, active_rig_pairing_id: pairingId ?? null, created_by: user.id, status: "active", updated_at: new Date().toISOString() }, { onConflict: "household_id,source_trip_id" }).select("id").single();
    if (error) throw error;
    const { error: snapshotError } = await this.client.from("trip_snapshots").upsert({ trip_id: data.id, schema_version: 1, snapshot: trip }, { onConflict: "trip_id", ignoreDuplicates: true });
    if (snapshotError) throw snapshotError;
  }

  async removeTrip(householdId: string, sourceTripId: string): Promise<void> {
    const { error } = await this.client.from("trips").update({ status: "archived", updated_at: new Date().toISOString() }).eq("household_id", householdId).eq("source_trip_id", sourceTripId);
    if (error) throw error;
  }

  async migrate(householdId: string, preview: MigrationPreview, resolvedTrips: ScoredTrip[]): Promise<void> {
    const user = await this.user();
    const { data: prior } = await this.client.from("migration_receipts").select("status").eq("user_id", user.id).eq("fingerprint", preview.fingerprint).maybeSingle();
    if (prior?.status === "completed") return;
    const { data: receipt, error } = await this.client.from("migration_receipts").upsert({ household_id: householdId, user_id: user.id, fingerprint: preview.fingerprint, source_schema_version: 1, status: "started" }, { onConflict: "user_id,fingerprint" }).select("id").single();
    if (error) throw error;
    let rigCount = 0;
    if (preview.rig) { await this.saveRig(householdId, preview.rig); rigCount = 1; }
    for (const trip of resolvedTrips) await this.saveTrip(householdId, trip);
    const { error: completeError } = await this.client.from("migration_receipts").update({ status: "completed", completed_at: new Date().toISOString(), imported_counts: { rigs: rigCount, trips: resolvedTrips.length }, skipped_counts: { trips: preview.savedTripIds.length - resolvedTrips.length }, failed_counts: {} }).eq("id", receipt.id);
    if (completeError) throw completeError;
  }

  async exportHousehold(householdId: string): Promise<Record<string, unknown>> {
    const tables = ["households", "household_memberships", "household_preferences", "rvs", "rv_specifications", "tow_vehicles", "tow_vehicle_specifications", "rig_pairings", "rig_verifications", "trips", "trip_snapshots", "fact_observations", "migration_receipts"] as const;
    const output: Record<string, unknown> = { exportedAt: new Date().toISOString(), schemaVersion: 1, householdId };
    for (const table of tables) {
      let query = this.client.from(table).select("*");
      if (!["rv_specifications", "tow_vehicle_specifications", "trip_snapshots"].includes(table)) query = query.eq(table === "households" ? "id" : "household_id", householdId);
      const { data, error } = await query;
      if (error) throw error;
      output[table] = data;
    }
    return output;
  }

  async requestAccountDeletion(): Promise<void> {
    const { error } = await this.client.rpc("request_account_deletion");
    if (error) throw error;
  }

  private async user(): Promise<User> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) throw error ?? new Error("Authentication required");
    return data.user;
  }
}

function firstRelated<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

function round(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
