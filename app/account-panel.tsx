"use client";

import { useState } from "react";
import { useCloudAccount } from "../lib/cloud-account";
import type { FeedbackCategory } from "../lib/cloud-types";

export function AccountPanel({ onClose }: { onClose: () => void }) {
  const account = useCloudAccount();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviteUrl, setInviteUrl] = useState("");
  const [alphaEmail, setAlphaEmail] = useState("");
  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>("missing_campground");
  const [feedbackDetails, setFeedbackDetails] = useState("");
  const active = account.activeMembership;

  const download = async () => {
    setBusy(true);
    try {
      const data = await account.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `roampilot-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage("Private data export downloaded.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="account-overlay" role="dialog" aria-modal="true" aria-label="Account and household">
    <button className="account-scrim" aria-label="Close account panel" onClick={onClose}/>
    <aside className="account-panel">
      <button className="panel-close" onClick={onClose}>×</button>
      <small>ACCOUNT & HOUSEHOLD</small>
      <h2>{active?.households?.name ?? "RoamPilot household"}</h2>
      <p>{account.session?.user.email}</p>
      <span className="role-pill">{active?.role ?? "member"}</span>
      {account.memberships.length > 1 && <label>Active household
        <select value={account.activeHouseholdId ?? ""} onChange={(event) => void account.switchHousehold(event.target.value)}>
          {account.memberships.map((item) => <option key={item.household_id} value={item.household_id}>{item.households?.name ?? "Household"}</option>)}
        </select>
      </label>}
      {(active?.role === "owner" || active?.role === "admin") && <section className="member-section">
        <small>INVITE SOMEONE</small>
        <label>Email<input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="traveler@example.com" /></label>
        <label>Role<select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "admin" | "member")}><option value="member">Member</option><option value="admin">Admin</option></select></label>
        <button disabled={busy || !inviteEmail} onClick={() => void (async () => { setBusy(true); try { const token = await account.createInvitation(inviteEmail, inviteRole); setInviteUrl(`${window.location.origin}/?invite=${encodeURIComponent(token)}`); setMessage("Invitation created. Transactional email is not configured yet, so copy the secure link below."); } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Invitation failed."); } finally { setBusy(false); } })()}>Create invitation</button>
        {inviteUrl && <label>Secure invitation link<input readOnly value={inviteUrl} onFocus={(event) => event.currentTarget.select()} /></label>}
      </section>}
      <section className="member-section"><small>HOUSEHOLD MEMBERS</small>{account.householdMembers.map((member) => <div className="member-row" key={member.user_id}><div><b>{member.user_id === account.session?.user.id ? "You" : `Member ${member.user_id.slice(0, 8)}`}</b><span>{member.role}</span></div>{active?.role === "owner" && member.user_id !== account.session?.user.id && <div><button onClick={() => void account.changeMemberRole(member.user_id, member.role === "admin" ? "member" : "admin")}>{member.role === "admin" ? "Make member" : "Make admin"}</button><button onClick={() => void account.transferOwnership(member.user_id)}>Transfer ownership</button><button onClick={() => void account.removeMember(member.user_id)}>Remove</button></div>}</div>)}</section>
      {account.alphaStatus?.isAdmin && <section className="member-section"><small>ALPHA ACCESS</small><p>Alpha is <b>{account.alphaStatus.programOpen ? "open" : "closed"}</b>.</p><label>Tester Google email<input type="email" value={alphaEmail} onChange={(event) => setAlphaEmail(event.target.value)} placeholder="tester@example.com" /></label><button disabled={busy || !alphaEmail.trim()} onClick={() => void (async () => { setBusy(true); try { await account.addAlphaTester(alphaEmail); setAlphaEmail(""); setMessage("Tester added to the allowlist. No invitation has been sent."); } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Tester could not be added."); } finally { setBusy(false); } })()}>Add tester</button>{account.alphaTesters.map((tester) => <div className="member-row" key={tester.id}><div><b>{tester.email}</b><span>{tester.status}</span></div>{tester.status !== "revoked" && tester.user_id !== account.session?.user.id && <button onClick={() => void account.revokeAlphaTester(tester.id)}>Revoke</button>}</div>)}<button className={account.alphaStatus.programOpen ? "danger-button" : ""} onClick={() => void account.setAlphaOpen(!account.alphaStatus!.programOpen)}>{account.alphaStatus.programOpen ? "Close alpha" : "Reopen alpha"}</button></section>}
      <section className="member-section"><small>REPORT FEEDBACK OR DATA</small><label>Category<select value={feedbackCategory} onChange={(event) => setFeedbackCategory(event.target.value as FeedbackCategory)}><option value="missing_campground">Missing campground</option><option value="incorrect_campground_data">Incorrect campground data</option><option value="routing_issue">Routing issue</option><option value="rig_fit_issue">Rig-fit issue</option><option value="bug">App problem</option><option value="feature_request">Feature idea</option><option value="other">Other</option></select></label><label>What happened?<textarea rows={4} value={feedbackDetails} onChange={(event) => setFeedbackDetails(event.target.value)} placeholder="Include the campground or place name and what you expected." /></label><button disabled={busy || feedbackDetails.trim().length < 5} onClick={() => void (async () => { setBusy(true); try { await account.submitFeedback(feedbackCategory, feedbackDetails); setFeedbackDetails(""); setMessage("Thank you — your report was saved privately."); } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Feedback could not be saved."); } finally { setBusy(false); } })()}>Send report</button></section>
      <details className="member-section"><summary>Alpha safety notice</summary><p>Campground coverage is incomplete. Prices, availability, weather, and site details may be estimated, stale, or mock. Routes are standard-vehicle estimates and are not RV-safe. Verify all safety-critical facts with authoritative sources before travel.</p></details>
      <div className="panel-actions">
        <button disabled={busy || active?.role !== "owner"} onClick={() => void download()}>Export household data</button>
        <button onClick={() => void account.signOut()}>Sign out</button>
        <button className="danger-button" onClick={() => {
          if (window.confirm("Request account deletion? Access will be disabled and primary data is scheduled for deletion within 30 days.")) void account.requestDeletion();
        }}>Request account deletion</button>
      </div>
      {active?.role !== "owner" && <p className="privacy-note">Only the household owner can export shared household data.</p>}
      {message && <p className="panel-message">{message}</p>}
      <p className="privacy-note">RoamPilot does not retain continuous Road Mode GPS history. Support access is disabled by default.</p>
    </aside>
  </div>;
}
