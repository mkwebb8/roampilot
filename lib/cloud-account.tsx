"use client";

import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CloudRepository } from "./cloud-repository";
import type { CloudRig, CloudTrip, HouseholdMember, HouseholdMembership, HouseholdRole, MigrationPreview } from "./cloud-types";
import type { RigProfile, ScoredTrip } from "./types";

interface CloudContextValue {
  status: "loading" | "unconfigured" | "signed-out" | "onboarding" | "ready" | "error";
  error: string;
  session: Session | null;
  memberships: HouseholdMembership[];
  activeHouseholdId: string | null;
  activeMembership: HouseholdMembership | null;
  householdMembers: HouseholdMember[];
  rig: CloudRig | null;
  savedTrips: CloudTrip[];
  migrationPreview: MigrationPreview | null;
  signInSocial(provider: "google" | "apple"): Promise<void>;
  requestOtp(email: string): Promise<void>;
  verifyOtp(email: string, token: string): Promise<void>;
  signOut(): Promise<void>;
  createHousehold(name: string): Promise<void>;
  createInvitation(email: string, role: Exclude<HouseholdRole, "owner">): Promise<string>;
  acceptInvitation(token: string): Promise<void>;
  changeMemberRole(userId: string, role: Exclude<HouseholdRole, "owner">): Promise<void>;
  removeMember(userId: string): Promise<void>;
  transferOwnership(userId: string): Promise<void>;
  switchHousehold(id: string): Promise<void>;
  saveRig(profile: RigProfile): Promise<void>;
  toggleTrip(trip: ScoredTrip): Promise<void>;
  migrateLocal(resolvedTrips: ScoredTrip[]): Promise<void>;
  dismissMigration(): void;
  exportData(): Promise<Record<string, unknown>>;
  requestDeletion(): Promise<void>;
  refresh(): Promise<void>;
}

const CloudContext = createContext<CloudContextValue | null>(null);

export function CloudAccountProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [status, setStatus] = useState<CloudContextValue["status"]>("loading");
  const [error, setError] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [memberships, setMemberships] = useState<HouseholdMembership[]>([]);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);
  const [activeHouseholdId, setActiveHouseholdId] = useState<string | null>(null);
  const [rig, setRig] = useState<CloudRig | null>(null);
  const [savedTrips, setSavedTrips] = useState<CloudTrip[]>([]);
  const [migrationPreview, setMigrationPreview] = useState<MigrationPreview | null>(null);
  const repository = useMemo(() => client ? new CloudRepository(client) : null, [client]);

  useEffect(() => {
    let mounted = true;
    fetch("/api/cloud-config", { cache: "no-store" })
      .then((response) => response.json())
      .then((config: { configured: boolean; url?: string; publishableKey?: string }) => {
        if (!mounted) return;
        if (!config.configured || !config.url || !config.publishableKey) { setStatus("unconfigured"); return; }
        const next = createClient(config.url, config.publishableKey, { auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
        setClient(next);
        next.auth.getSession().then(({ data }) => { if (mounted) setSession(data.session); });
      })
      .catch((reason) => { if (mounted) { setError(message(reason)); setStatus("error"); } });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!client) return;
    const { data } = client.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, [client]);

  const refresh = useCallback(async () => {
    if (!repository || !session) { setStatus(client ? "signed-out" : "loading"); return; }
    try {
      setError("");
      const [profile, nextMemberships] = await Promise.all([repository.profile(), repository.memberships()]);
      setMemberships(nextMemberships);
      if (!nextMemberships.length) { setActiveHouseholdId(null); setStatus("onboarding"); return; }
      const selected = nextMemberships.some((m) => m.household_id === profile?.active_household_id)
        ? profile!.active_household_id!
        : nextMemberships[0].household_id;
      if (selected !== profile?.active_household_id) await repository.setActiveHousehold(selected);
      setActiveHouseholdId(selected);
      const [nextRig, trips, members] = await Promise.all([repository.loadRig(selected), repository.trips(selected), repository.householdMembers(selected)]);
      setRig(nextRig);
      setSavedTrips(trips);
      setHouseholdMembers(members);
      setMigrationPreview(readMigrationPreview(session.user.id));
      setStatus("ready");
    } catch (reason) { setError(message(reason)); setStatus("error"); }
  }, [client, repository, session]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const value = useMemo<CloudContextValue>(() => ({
    status, error, session, memberships, activeHouseholdId,
    activeMembership: memberships.find((item) => item.household_id === activeHouseholdId) ?? null, householdMembers,
    rig, savedTrips, migrationPreview,
    async signInSocial(provider) {
      if (!client) return;
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await client.auth.signInWithOAuth({ provider, options: { redirectTo } });
      if (error) throw error;
    },
    async requestOtp(email) {
      if (!client) return;
      const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (error) throw error;
    },
    async verifyOtp(email, token) {
      if (!client) return;
      const { error } = await client.auth.verifyOtp({ email, token, type: "email" });
      if (error) throw error;
    },
    async signOut() { if (client) await client.auth.signOut({ scope: "local" }); setSession(null); setStatus("signed-out"); },
    async createHousehold(name) { if (!repository) return; await repository.createHousehold(name); await refresh(); },
    async createInvitation(email, role) { if (!repository || !activeHouseholdId) throw new Error("Select a household first."); return repository.createInvitation(activeHouseholdId, email, role); },
    async acceptInvitation(token) { if (!repository) return; const householdId = await repository.acceptInvitation(token); await repository.setActiveHousehold(householdId); await refresh(); },
    async changeMemberRole(userId, role) { if (!repository || !activeHouseholdId) return; await repository.changeMemberRole(activeHouseholdId, userId, role); await refresh(); },
    async removeMember(userId) { if (!repository || !activeHouseholdId) return; await repository.removeMember(activeHouseholdId, userId); await refresh(); },
    async transferOwnership(userId) { if (!repository || !activeHouseholdId) return; await repository.transferOwnership(activeHouseholdId, userId); await refresh(); },
    async switchHousehold(id) { if (!repository) return; await repository.setActiveHousehold(id); setActiveHouseholdId(id); await refresh(); },
    async saveRig(profile) { if (!repository || !activeHouseholdId) return; const next = await repository.saveRig(activeHouseholdId, profile, rig); setRig(next); },
    async toggleTrip(trip) {
      if (!repository || !activeHouseholdId) return;
      const existing = savedTrips.find((item) => item.sourceTripId === trip.id);
      if (existing) await repository.removeTrip(activeHouseholdId, trip.id); else await repository.saveTrip(activeHouseholdId, trip, rig?.pairingId);
      setSavedTrips(await repository.trips(activeHouseholdId));
    },
    async migrateLocal(resolvedTrips) {
      if (!repository || !activeHouseholdId || !migrationPreview || !session) return;
      await repository.migrate(activeHouseholdId, migrationPreview, resolvedTrips);
      localStorage.setItem(`roampilot-migration-complete:${session.user.id}`, new Date().toISOString());
      setMigrationPreview(null);
      await refresh();
    },
    dismissMigration() { if (session) localStorage.setItem(`roampilot-migration-dismissed:${session.user.id}`, new Date().toISOString()); setMigrationPreview(null); },
    async exportData() { if (!repository || !activeHouseholdId) return {}; return repository.exportHousehold(activeHouseholdId); },
    async requestDeletion() { if (!repository) return; await repository.requestAccountDeletion(); if (client) await client.auth.signOut({ scope: "global" }); setStatus("signed-out"); },
    refresh,
  }), [status, error, session, memberships, householdMembers, activeHouseholdId, rig, savedTrips, migrationPreview, client, repository, refresh]);

  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>;
}

export function useCloudAccount(): CloudContextValue {
  const value = useContext(CloudContext);
  if (!value) throw new Error("useCloudAccount must be used inside CloudAccountProvider");
  return value;
}

function readMigrationPreview(userId: string): MigrationPreview | null {
  if (localStorage.getItem(`roampilot-migration-complete:${userId}`) || localStorage.getItem(`roampilot-migration-dismissed:${userId}`)) return null;
  const rigRaw = localStorage.getItem("roampilot-rig-v1");
  const savedRaw = localStorage.getItem("roampilot-saved-v1");
  if (!rigRaw && !savedRaw) return null;
  let rig: RigProfile | null = null;
  let savedTripIds: string[] = [];
  try { rig = rigRaw ? JSON.parse(rigRaw) as RigProfile : null; } catch { /* keep invalid local record out of import */ }
  try { savedTripIds = savedRaw ? JSON.parse(savedRaw) as string[] : []; } catch { /* keep invalid local record out of import */ }
  const source = `${rigRaw ?? ""}|${savedRaw ?? ""}`;
  return { rig, savedTripIds, fingerprint: stableFingerprint(source) };
}

function stableFingerprint(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return `local-v1-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function message(reason: unknown): string { return reason instanceof Error ? reason.message : "Cloud data is temporarily unavailable."; }
