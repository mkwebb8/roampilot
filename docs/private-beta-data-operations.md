# Private Beta Data Operations

## Scope and ownership

Customer records live only in the dedicated RoamPilot Supabase organization and `RoamPilot-Production` project in `us-east-2`. Dragline 3D infrastructure is out of scope and must never be queried or modified for RoamPilot work.

## Access and tenant isolation

- Supabase Auth establishes user identity; Postgres row-level security enforces household isolation.
- Owner, Admin, and Member privileges are enforced in database policies and authenticated RPCs, not only in the UI.
- Service-role credentials are prohibited in browser code and are not required by the current application.
- Support access is disabled by default. Future support access requires a user-approved, time-limited, audited elevation with a documented reason.
- Production logs must not contain OTPs, invitation tokens, OAuth tokens, or unnecessary safety-critical rig details.

## Invitations and identity

Household invitations are email-bound, single-use, stored as hashes, and expire after seven days. Google and Apple credentials are configured in Supabase and Sites secret storage, never Git. Email OTP delivery uses a provider-neutral adapter; the final transactional provider remains an operational configuration decision.

## Export, deletion, and retention

- Household Owners can download a structured JSON export of household data visible to them.
- An account-deletion request disables application access immediately and creates an auditable request.
- Primary customer data is targeted for deletion within 30 days after identity and ownership obligations are resolved.
- Security and deletion audit records may be retained up to 12 months when necessary for abuse prevention, legal compliance, or fulfillment evidence.
- Deleted records may remain in encrypted backups until normal backup expiry and are not restored selectively into production.
- Road Mode must not retain continuous GPS history. A user may explicitly save a stop or trip as a normal trip record.

## Backups, exports, and recovery

Supabase-managed backups are the first recovery layer. Independent encrypted exports use a maturity-based schedule:

| Stage | Trigger | Independent export target |
| --- | --- | --- |
| Early private beta | Low data volume; owner-led testing | Monthly and before material schema changes |
| Active private beta | Regular tester activity or data that cannot be easily recreated | Weekly |
| Early growth | Material customer reliance or recovery-point objective below seven days | Daily automated backups with periodic restore tests |

Exports must be encrypted, access-controlled, stored outside the primary Supabase failure domain, and covered by the same retention/deletion policy. Test a documented restore at least quarterly once weekly exports begin, and after major recovery-process changes.

## Incident and recovery procedure

1. Contain access and rotate affected credentials.
2. Preserve relevant audit evidence without copying unnecessary customer content.
3. Assess affected households and safety-critical records.
4. Recover to a separate environment first and validate tenant isolation and record counts.
5. Obtain production-change approval before restoration.
6. Notify affected users and authorities when contract or law requires it.
7. Record root cause, corrective actions, and Master Product Spec status.

## Credential rotation

Rotate publishable keys when exposure is suspected. OAuth client secrets, Apple client-secret signing material, and SMTP credentials follow provider expiry requirements and must be rotated before expiry. Record owner, creation date, expiry date, last test, and next rotation date in the private operations register—not in this repository.
