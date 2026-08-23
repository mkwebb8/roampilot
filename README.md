# RoamPilot RV

RoamPilot is a mobile-first RV trip discovery application for travelers who know when they can travel but not necessarily where to go. It recommends complete trips instead of presenting a wall of campground pins.

## Current build

- Home, Discover, Road Mode, Saved Trips, My Rig, destination detail, and destination-first planning
- Deterministic trip scoring with an inspectable weighted breakdown
- Seeded regional trip, campground, road-stop, weather, event, and cost values, visibly labeled as mock or estimated
- Validation-beta account boundary with Google sign-in active
- Supabase-backed profiles, multiple households, Owner/Admin/Member roles, invitations, rigs, tow vehicles, rig pairings, and saved-trip snapshots
- Row-level security on every customer-data table and database-tested tenant isolation
- Explicit one-time import of legacy browser-local rig and saved-trip data
- Cross-device cloud synchronization for the active household
- Household data export and account-deletion request workflow
- Product-wide data-confidence values: Verified, Reported, Estimated, and Unknown
- Responsive mobile-first UI and installable PWA metadata

Google is the active authentication path for internal and close-circle validation. Apple and six-digit email OTP remain implemented architectural paths but are intentionally unavailable in the current UI: Apple is deferred until broader iPhone/TestFlight/App Store testing, and email OTP is deferred until RoamPilot has a permanent domain, custom SMTP, and an editable OTP template. These remain V1 requirements rather than implementation failures. Transactional email stays behind an adapter boundary. RoamPilot does not yet provide RV-aware routing and makes no RV-safe route claim.

## Architecture

The app uses React 19, TypeScript, vinext, and a Cloudflare Sites-compatible application router. Supabase provides Auth and Postgres. Browser code receives only the project URL and publishable key through `/api/cloud-config`; no service-role key is used by the application.

```text
app/                       Product UI, account boundary, callbacks, and API adapters
lib/types.ts               Core discovery domain models
lib/cloud-types.ts         Cloud account and household contracts
lib/cloud-account.tsx      Auth/session/cloud synchronization context
lib/cloud-repository.ts    Supabase persistence adapter
lib/email-adapter.ts       Provider-neutral transactional-email boundary
lib/recommendations.ts     Pure recommendation scoring
lib/seed.ts                Seeded development data
supabase/migrations/       Versioned schema, RLS, RPC, and hardening migrations
tests/                     Render, regression, security, and database test assets
docs/                      Private-beta operational policies
.openai/hosting.json       Sites hosting declaration
```

Recommendation weights remain 25% campground/rig fit, 20% drive-time fit, 15% weather, 15% activities/events, 10% price, 10% preferences/history, and 5% novelty. Structured deterministic data—not AI—must govern safety and feasibility.

## Local setup

Requirements: Node.js 22.13 or newer and npm.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `.env.local`. Never commit `.env.local`, OAuth secrets, SMTP credentials, or a Supabase service-role key.

Validation:

```bash
npm run lint
npm run typecheck
npm test
```

`npm test` performs a production build before the test suite.

## Database changes

Database changes are additive SQL migrations in `supabase/migrations`. Apply them to the dedicated `RoamPilot-Production` project only. Never use or modify the Dragline 3D organization. Run Supabase security and performance advisors after every DDL change, and execute `tests/tenant-isolation.sql` in a non-user-data transaction.

## Mock-data and safety limitations

Destination drive times, route shapes, campground details, site compatibility, weather, events, fuel prices, costs, availability, and Road Mode direction are currently seeded or conservative estimates. They are not live travel-safety information. Rig dimensions and weights are owner-reported until independently verified. RoamPilot does not currently calculate an RV-safe route.

The approved future routing gate requires commercial/licensing approval for Trimble, HERE benchmarking, and a RoamPilot-controlled restriction test corpus before any route may be represented as RV-safe.

## Integration boundaries

Future adapters may use permitted APIs from NOAA/NWS, Recreation.gov RIDB, mapping/POI providers, campground partners, event sources, and fuel-data providers. Proprietary campground networks must not be scraped. External campground booking handoff is planned; RoamPilot does not process reservation payments in V1.

## Privacy and operations

See [Private Beta Data Operations](docs/private-beta-data-operations.md) for tenant isolation, least privilege, export, deletion, retention, support access, backups, recovery, and credential rotation. Continuous Road Mode GPS history is not retained.

## Deployment

Production is hosted through OpenAI Sites. Runtime environment values belong in Sites environment configuration, not Git. The delivery gate for every phase is: implement → validate automated tests → deploy → production test → product-owner review → fix issues → update the Master Product Spec/current status → commit/push → approve the next phase.

Phase 1B must stop at the production-candidate/product-owner review checkpoint. Phase 2 does not begin automatically.
