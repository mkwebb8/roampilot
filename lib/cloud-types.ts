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

export interface AlphaAccessStatus { allowed: boolean; isAdmin: boolean; programOpen: boolean; testerStatus: "invited" | "active" | "revoked" | "not_invited"; }
export interface AlphaTester { id: string; email: string; status: "invited" | "active" | "revoked"; user_id: string | null; invited_at: string; activated_at: string | null; revoked_at: string | null; }
export type FeedbackCategory = "missing_campground" | "incorrect_campground_data" | "routing_issue" | "rig_fit_issue" | "bug" | "feature_request" | "other";
