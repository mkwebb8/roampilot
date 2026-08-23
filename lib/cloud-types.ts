import type { RigProfile, ScoredTrip } from "./types";

export type HouseholdRole = "owner" | "admin" | "member";
export type Confidence = "verified" | "reported" | "estimated" | "unknown";

export interface HouseholdMembership {
  household_id: string;
  role: HouseholdRole;
  households: { id: string; name: string } | null;
}

export interface HouseholdMember {
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  status: "active" | "removed";
  joined_at: string;
}

export interface CloudRig {
  rvId: string;
  towVehicleId: string;
  pairingId: string;
  profile: RigProfile;
  confidence: Confidence;
}

export interface CloudTrip {
  id: string;
  sourceTripId: string | null;
  trip: ScoredTrip;
  savedAt: string;
}

export interface MigrationPreview {
  rig: RigProfile | null;
  savedTripIds: string[];
  fingerprint: string;
}
