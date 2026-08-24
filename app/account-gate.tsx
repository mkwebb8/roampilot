"use client";

import { useState } from "react";
import { trips } from "../lib/seed";
import { recommendTrips } from "../lib/recommendations";
import { defaultFilters } from "../lib/seed";
import { useCloudAccount } from "../lib/cloud-account";

export function AccountGate({ children }: { children: React.ReactNode }) {
  const account = useCloudAccount();
  const [householdName, setHouseholdName] = useState("Our household");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [inviteToken, setInviteToken] = useState(() => {
    if (typeof window === "undefined") return "";
    const queryToken = new URLSearchParams(window.location.search).get("invite");
    if (queryToken) sessionStorage.setItem("roampilot-invite", queryToken);
    return queryToken ?? sessionStorage.getItem("roampilot-invite") ?? "";
  });
  const [warningAccepted, setWarningAccepted] = useState(() => typeof window !== "undefined" && Boolean(localStorage.getItem("roampilot-alpha-warning-accepted")));
  const run = async (operation: () => Promise<void>) => { setBusy(true); setError(""); try { await operation(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Please try again."); } finally { setBusy(false); } };

  if (account.status === "loading") return <GateCard title="Preparing your private garage…" copy="Loading secure account services." />;
  if (account.status === "unconfigured") return <GateCard title="Private beta setup is in progress." copy="The dedicated RoamPilot cloud environment has not been connected to this build yet." />;
  if (account.status === "error") return <GateCard title="We couldn’t open your travel profile." copy={account.error} action={<button onClick={() => void account.refresh()}>Try again</button>} />;
  if (account.status === "access-denied") return <GateCard title="This account is not invited." copy="Ask the RoamPilot alpha owner to add the exact Google email you used, then sign in again." action={<button onClick={() => void account.signOut()}>Use another account</button>} />;
  if (account.status === "alpha-closed") return <GateCard title="The RoamPilot alpha is temporarily closed." copy="Your private data remains stored, but product access is paused by the alpha owner." action={<button onClick={() => void account.signOut()}>Sign out</button>} />;
  if (account.status === "signed-out") return <main className="auth-shell"><section className="auth-card"><small>ROAMPILOT VALIDATION BETA</small><h1>Your trips. Your rigs. One private home.</h1><p>Sign in with an approved Google account to keep your garage and saved trips synchronized across devices.</p><div className="social-auth"><button disabled={busy} onClick={() => void run(() => account.signInSocial("google"))}>{busy ? "Opening Google…" : "Continue with Google"}</button></div>{error&&<p className="form-error">{error}</p>}<p className="privacy-note">Apple sign-in and email codes remain planned for the broader V1 beta after production domain and delivery infrastructure are ready.</p><p className="privacy-note">RoamPilot never uses AI to invent or override safety-critical rig facts.</p></section></main>;
  if (account.status === "onboarding" && inviteToken) return <main className="auth-shell"><section className="auth-card"><small>HOUSEHOLD INVITATION</small><h1>Join your RoamPilot household.</h1><p>Accept the invitation to share its rigs and saved trips with the role chosen by the household owner.</p><button className="cta" disabled={busy} onClick={() => void run(async () => { await account.acceptInvitation(inviteToken); sessionStorage.removeItem("roampilot-invite"); window.history.replaceState({}, "", window.location.pathname); setInviteToken(""); })}>{busy ? "Joining…" : "Accept invitation"}<span>→</span></button>{error&&<p className="form-error">{error}</p>}<p className="privacy-note">Invitation tokens are single-use and expire automatically.</p></section></main>;
  if (account.status === "onboarding") return <main className="auth-shell"><section className="auth-card"><small>WELCOME TO ROAMPILOT</small><h1>Create your household.</h1><p>Your household is the private space shared by its people, rigs, and trips. You can belong to more than one later.</p><label>Household name<input value={householdName} onChange={(event) => setHouseholdName(event.target.value)} /></label><button className="cta" disabled={busy || !householdName.trim()} onClick={() => void run(() => account.createHousehold(householdName))}>{busy ? "Creating…" : "Create Household"}<span>→</span></button>{error&&<p className="form-error">{error}</p>}</section></main>;
  if (account.migrationPreview) {
    const resolved = recommendTrips(trips, { ...defaultFilters, maxDriveHours: 12 }).filter((trip) => account.migrationPreview!.savedTripIds.includes(trip.id));
    return <main className="auth-shell"><section className="auth-card migration-card"><small>FOUND ON THIS DEVICE</small><h1>Bring your existing RoamPilot data with you?</h1><p>We found {account.migrationPreview.rig ? "one rig profile" : "no rig profile"} and {account.migrationPreview.savedTripIds.length} saved trip{account.migrationPreview.savedTripIds.length === 1 ? "" : "s"}. They will be copied into your active household only after you confirm.</p><div className="migration-summary"><span>Rig profile <b>{account.migrationPreview.rig ? "Ready" : "None"}</b></span><span>Recognized saved trips <b>{resolved.length}</b></span><span>Unrecognized local trip IDs <b>{account.migrationPreview.savedTripIds.length - resolved.length}</b></span></div><button className="cta" disabled={busy} onClick={() => void run(() => account.migrateLocal(resolved))}>{busy ? "Importing safely…" : "Import to this household"}<span>→</span></button><button className="quiet-button" disabled={busy} onClick={account.dismissMigration}>Not now</button>{error&&<p className="form-error">{error}</p>}<p className="privacy-note">The browser copy is not automatically deleted. You can clear it after confirming your cloud data.</p></section></main>;
  }
  if (!warningAccepted) return <main className="auth-shell"><section className="auth-card"><small>FRIENDS & FAMILY ALPHA</small><h1>Plan with RoamPilot. Verify before you tow.</h1><p>This early build contains incomplete and estimated campground data. Campground coverage is not comprehensive, availability and prices may be stale or mock, and routes are standard-vehicle estimates—not RV-safe routes.</p><p>Always verify clearance, weight, width, length, propane restrictions, road restrictions, campground fit, availability, weather, and safety information with authoritative sources before travel.</p><button className="cta" onClick={() => { localStorage.setItem("roampilot-alpha-warning-accepted", new Date().toISOString()); setWarningAccepted(true); }}>I understand — enter the alpha<span>→</span></button></section></main>;
  return <>{children}</>;
}

function GateCard({ title, copy, action }: { title: string; copy: string; action?: React.ReactNode }) {
  return <main className="auth-shell"><section className="auth-card"><small>ROAMPILOT PRIVATE BETA</small><h1>{title}</h1><p>{copy}</p>{action}</section></main>;
}
