# RoamPilot Master Product Spec

**Document status:** Living source of truth  
**Created:** August 20, 2026  
**Product:** RoamPilot RV  
**Current build status:** Phase 1B validation-stage production candidate  

## Purpose of this document

This document is the canonical product and implementation reference for RoamPilot RV. Future product decisions, requirements, constraints, terminology, milestones, and implementation notes should be consolidated here so decisions do not become fragmented across chats, development sessions, or tools.

When this document conflicts with an older chat, summary, prototype note, or informal instruction, this document should control once the relevant section has been explicitly updated and approved.

## Document conventions

- **Current Build** records what exists today. It should remain factual and evidence-based.
- **Approved Product Direction** will contain product decisions explicitly approved after this baseline.
- **Planned Requirements** will contain intended work that has not yet shipped.
- **Open Decisions** will identify questions that still require a product decision.
- **Change Log** will record meaningful changes to this specification.
- Mock, estimated, live, and verified data must be described distinctly.
- Safety-critical RV feasibility must be determined by structured, authoritative data—not generative AI.

---

# Current Build

## Snapshot

**Snapshot date:** August 22, 2026  
**Overall status:** Phase 1B validation-stage production candidate  
**Repository:** https://github.com/mkwebb8/roampilot  
**Live app:** https://roampilot-rv.mkwebb8.chatgpt.site  
**Deployed baseline before the Phase 1B candidate:** Sites version 5 at Git commit `e61a8af` — Harden live discovery routing  
**Hosted access:** Private, owner-only

The committed `main` branch matches the version 5 deployment. The local working tree contains the Phase 1B accounts-and-cloud candidate described below; it must pass the phase deployment and production-test gate before Phase 1B is declared complete.

## Phase 1B validation-stage decision

Product validation now precedes purchase of broader production identity infrastructure. Google authentication is sufficient for internal and close-circle testing. Apple authentication remains a V1 requirement but is deferred until broader iPhone, TestFlight, or App Store preparation. Six-digit email OTP remains implemented behind the authentication adapter but is unavailable in the validation UI until RoamPilot has a permanent domain, custom SMTP, authenticated sending records, and an editable OTP email template. These are deferred production-readiness dependencies, not implementation failures, and do not remove Google + Apple + email fallback from long-term V1 scope.

The current stage must not purchase or configure a permanent domain, Apple Developer membership, or paid transactional-email service. Phase 1B may reach validation-stage completion when the Google path, household isolation, cloud persistence, migration, export/deletion request, automated tests, deployment, and production validation pass. Broader-beta readiness remains blocked on the deferred identity items.

## Product vision and purpose

RoamPilot RV is intended to be an intelligent RV travel agent—not another campground directory or generic route planner.

The primary customer problem is:

> “I want to go camping, but I don’t know where to go or when.”

Instead of forcing users to inspect hundreds of campground pins, the product should recommend a small number of complete trip ideas based on:

- Starting location
- Available dates
- Maximum drive time
- RV dimensions, weight, electrical needs, and other constraints
- Tow vehicle, fuel type, tank capacity, and towing MPG
- Travel party
- Camping preferences
- Interests
- Weather and alerts
- Campground suitability
- Activities and events
- Estimated fuel, campground, and total trip cost
- Previous preferences and travel history
- Novelty

The second major use case is:

> “I’m done driving. Find me somewhere good to stop ahead.”

That experience is ultimately intended to use GPS location and direction of travel, prioritize stops ahead rather than behind, and account for RV compatibility and off-route distance.

The product principle is to return approximately five ranked, complete trip recommendations—not a cluttered map full of campground results.

## Design direction

The implemented visual direction is premium, modern, automotive, and upscale RV.

Current styling includes:

- Warm off-white backgrounds
- Graphite and charcoal surfaces
- Restrained bronze/tan accents
- Large destination photography
- Editorial serif display typography
- Rounded cards
- Subtle shadows
- Automotive-style metric panels
- Spacious layouts
- Persistent mobile bottom navigation

The app avoids cartoon camping graphics, excessive green, crowded maps, and generic Bootstrap/SaaS styling.

## Architecture and technology stack

### Front end

- React 19
- TypeScript 5.9
- Next-style App Router APIs through Vinext
- Tailwind CSS 4 pipeline
- Handwritten responsive CSS
- Client-side React state for screen navigation and interactions
- Supabase-backed household, rig, tow-vehicle, and saved-trip persistence
- Browser `localStorage` retained only as the source for an explicit one-time migration flow

### Runtime and build

- Vinext 1.0 beta
- Vite 8
- Cloudflare Worker-compatible server output
- Edge API routes
- Node.js 22.13 or newer
- OpenAI Sites hosting integration

### Installed infrastructure packages

- Drizzle ORM
- Drizzle Kit
- Cloudflare Vite plugin
- OpenAI Sites Vite plugin
- Supabase JavaScript client, pinned to an exact version
- ESLint
- TypeScript tooling

The application uses the dedicated `RoamPilot-Production` Supabase Postgres project in `us-east-2`. OpenAI Sites D1 and R2 remain unused.

### Main source structure

- `app/page.tsx` — principal screens and client interaction logic
- `app/globals.css` — main visual system
- `app/discovery.css` — discovery/provider states
- `app/features.css` — planner and newer feature styling
- `app/api/discover/route.ts` — destination discovery endpoint
- `app/api/route-plan/route.ts` — multi-city routing endpoint
- `app/api/trip-data/route.ts` — trip-detail enrichment endpoint
- `app/api/cloud-config/route.ts` — safe runtime delivery of the Supabase URL and publishable key
- `app/account-gate.tsx` — validation-stage authentication, onboarding, invitations, and migration gate
- `app/account-panel.tsx` — household switching, membership, export, sign-out, and deletion request
- `app/auth/callback/page.tsx` — OAuth PKCE callback exchange
- `lib/types.ts` — domain models
- `lib/seed.ts` — seeded rig, curated trips, and Road Mode stops
- `lib/recommendations.ts` — deterministic scoring
- `lib/storage.ts` — browser persistence
- `lib/cloud-account.tsx` — session and synchronized household state
- `lib/cloud-repository.ts` — Supabase repository adapter
- `lib/cloud-types.ts` — cloud-facing TypeScript contracts
- `lib/email-adapter.ts` — deferred transactional-email adapter boundary
- `lib/services/*` — provider adapters
- `supabase/migrations/*` — canonical schema, RLS, RPC, and hardening migrations
- `tests/tenant-isolation.sql` — rollback-only cross-household database test
- `worker/index.ts` — Cloudflare-compatible entry point
- `.openai/hosting.json` — hosting declaration

## Git and current source status

The pre-Phase 1B committed branch history is:

1. `e61a8af` — Harden live discovery routing
2. `bad4f9e` — Add live destination discovery
3. `a2e30e0` — Fix Discover results cap
4. `06e2d37` — Add multi-city planning and live trip data adapters
4. `a02457f` — Initial RoamPilot RV application

`main` matches `origin/main` at `bad4f9e`.

### Uncommitted local work

The local working tree is dirty. Modified files include:

- `lib/services/campgrounds.ts`
- `lib/services/discovery.ts`
- `lib/services/geocoding.ts`
- `lib/services/http.ts`
- `lib/services/routing.ts`
- `lib/types.ts`

There is also a new untracked file:

- `lib/services/route-resilience.ts`

This unfinished work appears intended to add:

- Provider-specific error types
- Timeouts and retries
- Structured provider-error logging
- Route-request concurrency limits
- Candidate caps
- Better RIDB facility and recreation-area discovery
- Candidate deduplication
- Conservative coordinate-based routing estimates when OSRM fails
- Explicit `live` versus `estimated` route labeling

These changes have not been committed, pushed, deployed, or verified through the normal test/build workflow. This dirty working tree should be resolved before unrelated development begins.

## What is already built and working

### Application navigation

The app has working client-side navigation among:

- Home
- Discover
- Multi-city planner
- Road Mode
- Saved Trips
- My Rig
- Trip Detail

Navigation is state-based within one application page rather than URL-based.

### Seeded development rig

**Home**

- Pendleton, Kentucky 40055

**RV**

- 2022 Starcraft Autumn Ridge 26BHS
- Travel trailer
- 30.75 feet long
- 11.08 feet high
- 8 feet wide
- 7,500-pound GVWR
- 30-amp electrical service
- One slide
- 42-gallon fresh-water tank
- No onboard generator

**Tow vehicle**

- 2025 Chevrolet Silverado 2500HD
- 6.6L gasoline V8
- Gasoline
- 36-gallon tank
- 9 MPG seeded towing estimate

### Local persistence

Two local-storage records are used:

- `roampilot-rig-v1`
- `roampilot-saved-v1`

The rig and saved-trip IDs persist in the current browser.

### Deterministic recommendation engine

Recommendation scoring is separate from the UI.

| Signal | Weight |
|---|---:|
| Campground/rig fit | 25% |
| Drive-time fit | 20% |
| Weather | 15% |
| Activities/events | 15% |
| Price | 10% |
| Preferences | 10% |
| Novelty | 5% |

Trips are filtered against the drive-time window and sorted by score.

The earlier five-result cap was removed. Live discovery can now return more than five results, although the product vision still favors approximately five strong recommendations.

### Curated fallback destinations

Six destinations are available as fallback data:

- Red River Gorge, Kentucky
- Brown County, Indiana
- Mammoth Cave, Kentucky
- Hocking Hills, Ohio
- Land Between the Lakes, Kentucky
- New River Gorge, West Virginia

Each includes coordinates, planning drive time and distance, planning weather, campground names/counts, activity tags, cost estimates, scoring inputs, explanation copy, route notes, and destination image attribution.

### Live discovery architecture

A server-side `/api/discover` endpoint is implemented.

When provider credentials are configured, it can:

1. Geocode the user’s origin.
2. Calculate a search radius from drive-time tolerance.
3. Load National Park Service destinations.
4. Load Recreation.gov RIDB facilities.
5. Require suitable destination photography and attribution.
6. Check candidate road travel time.
7. Exclude candidates beyond the drive window.
8. Enrich candidates with weather, campgrounds, and events.
9. Normalize candidates into the common trip model.
10. Apply deterministic recommendation scoring.
11. Report live, partial, fallback, empty, or error status.

Responses are cached in process memory for 15 minutes.

### Live trip-detail enrichment

Opening a trip detail calls `/api/trip-data` and attempts to refresh:

- Weather
- Road distance
- Drive time
- Nearby campground names
- Nearby events

The UI indicates whether live data was found or curated planning values remain in use.

### Multi-city trip planner

Users can:

- Begin from their saved home location
- Add multiple cities or destinations
- Use between 2 and 8 route points
- Assign nights to destinations
- Remove intermediate destinations
- Calculate every road leg
- See total stops, nights, mileage, and drive time

### PWA groundwork

The application has a web manifest with standalone display mode, app name, short name, theme/background colors, start URL, and favicon reference. It does not yet include offline support or a service worker strategy.

## Current screens and behavior

### Home

Displays:

- “Where are we going?”
- Find My Next Trip
- Build a Road Trip
- I’m On The Road
- Current RV/tow-vehicle combination
- Estimated towing MPG
- Link to My Rig

The original “Plan a Destination” action evolved into “Build a Road Trip.”

### Discover

Inputs:

- Starting location
- Leave date
- Return date
- Maximum drive time
- Adults
- Kids
- Dogs
- Camping preferences
- Interests

After submission it displays loading and provider states, live/partial/fallback labeling, ranked trip cards, match score, drive time, distance, weather status, campground count, estimated cost, tags, explanation, saving, detail navigation, and scoring information.

### Trip Detail

Displays destination photography and attribution, match percentage, drive time, mileage, weather, route note, score breakdown, campground options, activities/events, and estimated fuel, campground, other, and total costs.

Actions:

- Save Trip
- Show Me Another
- Build This Weekend

A live enrichment request runs when the detail screen opens.

### Multi-city planner

Users can enter a starting point, add destinations, set nights, add/remove stops, calculate the itinerary, review each leg, and review total mileage, drive time, and nights.

It currently provides standard-vehicle routing, not RV-aware routing.

### Road Mode

Users can select 30 minutes, 1 hour, 2 hours, or a custom remaining drive time.

Results display minutes ahead, distance off route, stop type, maximum seeded rig length, pull-through status, electrical service, dog friendliness, estimated price, and an availability placeholder.

The results are seeded and are not based on live GPS or actual direction of travel.

### Saved Trips

Displays saved curated trips and allows reopening or removing them. Data is local to one browser.

### My Rig

Editable RV fields include year, manufacturer, model, type, length, height, width, GVWR, electrical service, slides, fresh tank, and generator.

Editable tow-vehicle fields include year, manufacturer, model, engine, fuel, tank capacity, and towing MPG. The active rig pairing persists to the signed-in household and synchronizes across devices. Safety-critical values are stored with confidence metadata and remain owner-reported unless independently verified.

## Current database and data structure

### Database status

The dedicated `RoamPilot-Production` Supabase Postgres database is active in `us-east-2`. The schema is versioned in three Phase 1B migrations. All customer-data tables in the exposed schema have Row Level Security enabled. Database functions perform explicit authenticated-user and household-role checks, and execution grants are restricted to the intended authenticated role.

The schema includes profiles, households, memberships, invitations, user and household preferences, RVs and specifications, tow vehicles and specifications, rig pairings and verification records, trips and immutable snapshots, data sources and fact observations, migration receipts, audit events, export records, and deletion requests. The four confidence states are `verified`, `reported`, `estimated`, and `unknown`.

OpenAI Sites `d1` and `r2` remain `null`; Supabase is the approved system of record.

### Current persistent storage

Cloud persistence currently covers:

- User profile and active-household selection
- Multiple household memberships and Owner/Admin/Member roles
- Household invitations through single-use, hashed, expiring tokens
- Active RV, tow vehicle, specifications, and pairing
- Saved trip records and full scored-trip snapshots
- One-time local-data migration receipts and imported counts
- Household export records and account-deletion requests

Legacy browser data is read only for an explicit, user-confirmed migration. It is not silently deleted after import.

### Important TypeScript models

- `RigProfile`
- `Trip`
- `ScoredTrip`
- `DiscoverFilters`
- `RoadStop`
- `ItineraryStop`
- `RouteLeg`
- `Coordinates`
- `ImageCredit`
- `LiveTripData`
- `DiscoveryResponse`
- `DiscoveryProviderStatus`

Curated and provider-derived destinations are normalized into the same `Trip` interface.

## Current AI functionality

There is no active AI model integration.

The app currently has:

- No OpenAI API calls
- No LLM-generated itineraries
- No AI travel-agent chat
- No embeddings
- No vector search
- No AI personalization
- No runtime AI-generated explanation

“Why we picked it” text comes from curated static copy or cleaned provider descriptions. Recommendation ranking is deterministic.

An eventual AI layer should explain structured results but must not override dimension, clearance, weight, road, campsite, or safety rules.

## Current campground and trip-planning functionality

### Campground data

The app currently supports:

- Curated campground names for seeded trips
- RIDB facility searches near live destinations
- Campground counts
- Generic camping-preference tags
- Seeded Road Mode stops

It does not currently provide individual campsite dimensions, site-level maximum RV length, verified pull-through information, verified hookups, live availability, reservation inventory, real nightly pricing, cancellation policies, verified dog rules, verified site compatibility, or booking.

### Rig compatibility

Rig compatibility is not production-grade.

For curated destinations, `rigFit` is a seeded score. For live-discovered destinations, `rigFit` is currently a generic value of `80`.

The saved rig dimensions are not yet checked against bridge clearances, tunnels, propane restrictions, road width, weight limits, trailer-prohibited roads, grades, campground road geometry, site length, slide clearance, or electrical requirements.

### Trip cost calculation

Current live-discovery estimates assume:

- 9 MPG
- $3.35 per gallon
- Round-trip mileage
- $80 campground cost when campgrounds are found
- $25 other cost

The estimate does not use the user-edited towing MPG, live fuel prices, actual campground rates, taxes, meals, reservation fees, or activity prices.

## Current routing functionality

### Geocoding

OpenStreetMap Nominatim converts U.S. place names into coordinates.

### Road routing

The public OSRM server provides standard road distance, drive duration, and multi-city leg calculations.

### Critical routing limitation

OSRM is not RV-aware. It does not account for RV height, width, combined length, GVWR, axle limits, propane restrictions, low bridges, narrow roads, severe grades, trailer prohibitions, or tow-specific turns.

The UI warns users that routes must be independently verified.

### Maps

There is no interactive map. The trip-detail route area is a styled schematic rather than a real route map or polyline.

### Routing resilience

When the standard routing provider fails, the application may use a clearly estimated, conservative coordinate-based fallback for discovery continuity. Neither live OSRM routes nor fallback estimates are represented as RV-safe.

## APIs and data sources

### Implemented without project API keys

- OpenStreetMap Nominatim — geocoding
- Public OSRM server — standard routing
- Open-Meteo — weather forecasts

### Implemented but requiring keys

- National Park Service API — park and destination discovery
- Recreation.gov RIDB — facilities, recreation areas, campgrounds, and media
- Ticketmaster Discovery API — nearby events

### Planned but not implemented

- NOAA/NWS weather alerts
- Google Maps Routes/Places or another production provider
- RV-specific routing provider
- Fuel-price provider
- Private campground integrations
- Campground availability APIs
- Reservation APIs
- Licensed membership-network integrations
- Regional tourism/event feeds

### Hosted configuration

The production environment has entries for `NPS_API_KEY` and `RIDB_API_KEY`, but neither currently has a configured value. No production `TICKETMASTER_API_KEY` is configured.

Therefore:

- Deployed Discover cannot currently return genuine NPS/RIDB destination results.
- Discover falls back to curated trips and labels that state.
- RIDB campground enrichment is unavailable.
- Ticketmaster event enrichment is unavailable.
- Open-Meteo, OSRM, and Nominatim can still be called because they do not require configured keys.

## Authentication and user accounts

Application authentication and the private customer-data boundary are active in the Phase 1B candidate.

- Google OAuth through Supabase Auth is the sole visible validation-stage sign-in method.
- OAuth uses PKCE and returns through the allowlisted `/auth/callback` page.
- First sign-in creates the application profile automatically.
- Users without a household create one or may accept an email-bound invitation link.
- The account panel supports active-household switching, role-aware membership controls, sign-out, Owner export, and deletion request.
- Saved trips and My Rig synchronize through the active household.
- The Sites hosting access policy remains a separate outer access boundary.

Apple and six-digit email OTP remain long-term V1 requirements. Their application boundaries are preserved, but their controls are intentionally absent from the validation UI. Apple is deferred until broader Apple-platform testing. Email OTP is deferred until a permanent domain and custom SMTP allow the OTP template and reliable external delivery.

## Hosting and deployment status

The application is deployed at https://roampilot-rv.mkwebb8.chatgpt.site.

Pre-candidate baseline:

- Site is active
- Latest hosted baseline is version 5 at commit `e61a8af`
- Access is custom and owner-only
- No external visitors or allowed groups
- No D1 or R2 storage
- Supabase runtime configuration points only to the dedicated RoamPilot project

This section must be updated with the new Sites version and production-test outcome after the validation candidate is deployed.

## Mobile and responsive status

The app is mobile-first.

Implemented:

- Fixed mobile bottom navigation
- Large touch targets
- Stacked mobile forms
- Responsive cards
- Mobile hero layout
- Viewport-fit configuration
- Tablet/desktop breakpoints
- Multi-column desktop layouts
- Standalone PWA manifest

Not yet comprehensively verified:

- Physical iPhone testing
- Safari-specific behavior
- Android Chrome
- Landscape layouts
- Dynamic text scaling
- Screen-reader flows
- Full keyboard navigation
- Reduced-motion behavior
- Slow-network behavior
- Offline behavior
- Installed PWA behavior

## Partially built functionality

### Live discovery

The architecture is implemented, but provider credentials are missing in production. The deployed experience uses curated fallback results.

### Live trip details

Weather and standard routing can work without credentials. Live campgrounds and events require missing RIDB and Ticketmaster credentials.

### Multi-city planner

Basic route planning works, but it lacks an interactive map, drag-to-reorder, route optimization, return-to-home control, day-by-day itinerary, campground selection, cost roll-up, saved-trip integration, and RV-specific validation.

### Road Mode

The UI and seeded filtering work, but Road Mode lacks GPS, compass/heading, actual travel corridor, live stop discovery, real off-route calculations, live availability, and actual ahead-versus-behind logic.

### My Rig

Editing and persistence work, but most rig fields are not consumed by routing, campground fit, or pricing.

### Saved Trips

Curated trip IDs persist. Live-discovered trips are not stored as full snapshots and may not reappear in Saved Trips.

### Build This Weekend

The button remains a prototype action. It does not create a durable itinerary or reservation workflow.

## Known bugs and issues

### High priority

1. Live discovery credentials are missing in production.
2. Routing is not RV-safe.
3. Rig compatibility is mostly representational.
4. Live-discovered saved trips are not durable.
5. There is no active user-account or cloud-persistence system.
6. The repository has unfinished, uncommitted work.

### Medium priority

7. Weather beyond the provider forecast horizon can be misleading. The Open-Meteo adapter caps requests to 16 days and may use the last available forecast day for a later trip date.
8. Fuel calculations ignore the edited rig profile.
9. Fuel price is hard-coded at $3.35 per gallon.
10. Public Nominatim and OSRM endpoints are not ideal production dependencies.
11. Live activity/preference classification uses basic keyword matching.
12. Live trips default to “Dog friendly” without authoritative verification.
13. Campground costs are placeholders.
14. Availability is not live.
15. The application is one client-side page with no deep links or shareable trip URLs.
16. Discovery caching is in-memory and not shared or durable.
17. Provider failure handling is limited in the deployed commit.

### Lower priority

18. Tests are primarily render/source checks rather than comprehensive unit or end-to-end tests.
19. No interactive route or destination map exists.
20. No service worker or offline caching exists.
21. Destination images are hotlinked from provider sources.
22. “RoamPilot” versus “Roam Pilot” naming/spacing should be finalized.
23. The README does not fully document the newer live discovery and multi-city planner.

## Technical debt and shortcuts

- Most UI code is concentrated in one large `app/page.tsx`.
- Navigation uses local state rather than URL routing.
- CSS is large, compressed, and distributed across global files.
- No component test suite exists.
- No durable persistence abstraction exists.
- Drizzle is installed without an active schema.
- An authentication helper exists but is unused.
- Curated and live data share a broad `Trip` model that mixes facts, estimates, scores, and display copy.
- Rig fit, fuel cost, campground cost, and several scores contain hard-coded assumptions.
- Provider calls use public routing/geocoding infrastructure.
- Live discovery can trigger many provider calls.
- Image-rights information is stored as free-form text rather than a formal media policy.
- No analytics, crash reporting, persistent logs, or provider-health dashboard exists.
- No comprehensive accessibility or device QA has been completed.

## Discussed but not implemented

- Commercial RV-aware routing
- Bridge, tunnel, width, height, weight, and propane restrictions
- Campsite-level fit
- Live availability
- Booking or reservation handoff
- Private campground partnerships
- Harvest Hosts or other licensed membership networks
- NOAA/NWS alerts
- Live fuel pricing
- Fuel-stop planning
- GPS-driven Road Mode
- Heading-aware ahead/behind filtering
- Interactive route maps
- Destination maps
- User accounts
- Cloud profile sync
- Cloud saved trips
- Preference/history learning
- Novelty based on actual travel history
- AI travel-agent chat
- AI-written itinerary explanations
- Full day-by-day itinerary generation
- Activity scheduling
- Reservation and event links
- Notifications
- Trip sharing
- Collaboration
- Offline Road Mode
- Production analytics and monitoring
- Full accessibility testing
- Full mobile-device testing

## Recommended next development step

The next phase should be stabilization rather than another visible feature.

### Recommended sequence

1. **Resolve the dirty working tree.**
   - Review the provider-resilience changes.
   - Add targeted tests.
   - Commit them coherently or intentionally discard them.
   - Return the repository to a known clean state.

2. **Make live discovery operational in production.**
   - Configure NPS and RIDB credentials securely.
   - Configure Ticketmaster only if events remain in immediate scope.
   - Verify provider terms, quotas, attribution, and failure behavior.
   - Test live, partial, empty, and fallback states.

3. **Fix saved-trip persistence.**
   - Save complete normalized trip snapshots rather than IDs.
   - Support curated and live-discovered trips.
   - Version the stored-record format.

4. **Introduce minimal durable account storage.**
   - Activate authentication.
   - Add user, rig, saved-trip, and preference tables.
   - Preserve local-first behavior.
   - Provide migration from browser storage.

5. **Begin RV-safety integration after the foundation is stable.**
   - Select a production RV-aware routing provider.
   - Separate standard road estimates from verified RV routes.
   - Introduce explicit safety and data-confidence states.

The immediate recommendation is to finish and verify the provider-resilience work, restore a clean Git state, configure live discovery providers, and fix persistence for live-discovered trips before adding more product surface area.

---

# Approved Product Direction

The next product milestone is **V1 Private Beta**. This section records approved direction for that release.

## Product positioning

RoamPilot is an intelligent RV travel agent and readiness companion. It helps households decide where to go, assess whether a campground plausibly fits their rig, plan the journey and onboard resources, stay ready to travel, and find RV services while underway. It is not merely a campground directory, a standard passenger-vehicle route planner, a reservation payment processor, or an AI chatbot without authoritative structured data.

## Target users

- Weekend and vacation RV travelers who need help deciding where to go.
- Full-time and long-duration RV travelers who need stops, resources, and services while underway.
- Households with multiple travelers, tow vehicles, or RVs.
- Owners who want their specifications, maintenance records, readiness tasks, trips, and preferences synchronized across devices.

## Core user journeys

1. Sign in, create or join a household, and manage multiple users and rigs.
2. Build an expanded rig profile and owner-verify safety-critical specifications.
3. Discover trips across the entire reachable area up to a selected maximum drive time.
4. Review curated recommendations or browse View All Campgrounds.
5. Evaluate rig fit, hookups, sites, prices, booking sources, connectivity, freshness, and confidence.
6. Leave RoamPilot to book through an external provider.
7. Prepare through Trip Readiness, maintenance reminders, and customizable checklists.
8. Estimate fresh/gray/black tank, propane, battery, solar, generator, and off-grid duration.
9. Use route-aware Road Mode to find campgrounds and essential RV services ahead.
10. Ask RoamPilot questions grounded in the household's authorized structured data.
11. Report incorrect data during the private beta.

## Product principles

1. **Complete trips over result overload.** Curated recommendations remain primary; comprehensive browsing remains available.
2. **Search the whole reachable area.** Candidate discovery covers zero through the selected maximum drive time and must not cluster around the outer boundary.
3. **Structured facts before AI.** Safety, fit, routing, maintenance, and capacity calculations remain deterministic.
4. **Confidence is visible.** Material facts expose confidence, source, and freshness where applicable.
5. **Household data is private.** It is cloud-stored, synchronized, and accessible only to authorized household users.
6. **One garage powers the product.** Rig data flows into fit, routing, cost, readiness, Road Mode, resources, and AI context.
7. **No false certainty.** Unknown remains Unknown; estimates remain labeled.
8. **Booking handoff, not payment processing.** RoamPilot does not process reservation payments in V1.
9. **Feedback is a product capability.** Private-beta testers can report incorrect data in context.

## Information architecture

- **Home:** Primary trip actions, active household/rig, readiness summary, and reminders.
- **Discover:** Curated trips plus View All Campgrounds across the complete reachable area.
- **Trip/Campground Detail:** Campground intelligence, confidence, connectivity, costs, route status, and external booking.
- **Road Mode:** Ahead-of-route campgrounds and RV services.
- **Saved/Trips:** Durable cross-device saved trips and plans.
- **My Rig/Garage:** Multiple rigs, detailed specifications, systems, maintenance, readiness, and checklists.
- **Ask RoamPilot:** Conversational access to authorized structured data.
- **Account/Household:** Authentication, membership, privacy, and active-rig selection.
- **Feedback:** Contextual incorrect-data reporting.

## Recommendation strategy

The existing weighted recommendation model remains a starting point, but V1 must separate eligibility and safety gates, campground/site compatibility, preference scoring, trip attractiveness, data confidence, and freshness. A known incompatibility cannot be overcome by a high attractiveness score, and Unknown safety-critical data cannot be silently treated as compatible.

Discover provides two related experiences:

1. **Curated/Recommended Trips:** A concise ranked set with explanations.
2. **View All Campgrounds:** All qualifying campground records throughout the reachable area, subject to provider coverage and visible filters.

## Data and integration strategy

V1 requires a durable cloud data layer for users, authentication identities, households, memberships, rigs, tow vehicles, owner verification, systems, capacities, maintenance, checklist templates and runs, saved trips, campground snapshots, preferences, feedback, provenance, freshness, and confidence.

External records must be normalized behind provider adapters. Licensing, attribution, quotas, caching, freshness, and permitted uses must be documented. V1 links to external booking sources; RoamPilot does not accept payment, store card details, or guarantee external availability.

## Business model

The V1 Private Beta business model remains open. V1 must not depend on RoamPilot processing reservation payments. External booking handoff should preserve future subscription, referral, affiliate, or partnership options without assuming one now.

## Trust, safety, and data-confidence requirements

### Product-wide confidence model

| Confidence | Meaning | Examples |
|---|---|---|
| **Verified** | Confirmed by an authoritative source, or owner-verified for owner-controlled rig information. | Manufacturer specification, official restriction, operator-confirmed hookup, owner-verified travel height. |
| **Reported** | Supplied by a provider, operator, partner, community member, or beta tester but not independently verified by RoamPilot. | Reported cellular performance or campground-submitted site details. |
| **Estimated** | Calculated or inferred from known inputs using disclosed logic. | Fuel cost, off-grid duration, routing fallback, probable Starlink suitability. |
| **Unknown** | Missing, conflicting, stale beyond policy, or not sufficiently reliable. | Unpublished site length or unavailable clearance. |

Rules:

- Unknown never becomes a positive compatibility result by default.
- Estimated is never presented as Verified or Reported.
- Reported data identifies its source type and date where available.
- Verified data retains source, method, and verification time.
- Owner verification applies only to the owner's rig facts, not external campground or road facts.
- Conflicts are retained or resolved by explicit precedence rules, never silently overwritten.
- Safety-critical facts show source and freshness at the point of use.
- Stale data is warned or downgraded according to a field-specific freshness policy.
- AI must preserve confidence labels and communicate uncertainty.

### AI safety boundary

Ask RoamPilot may explain, recommend among eligible options, organize, summarize, and draft plans using authorized structured data. It may never invent missing safety-critical values, override restrictions or incompatibilities, treat Unknown as safe, present standard routing as RV-safe, guarantee connectivity/availability/booking, or conceal material source and confidence information.

### Owner verification

Authorized household users can verify safety-critical rig facts such as travel height, width, length, weight ratings, towing constraints, propane presence, electrical service, tanks, battery, solar, and generator configuration. Verification records who verified the value and when. Editing a verified value requires renewed verification.

---

# Planned Requirements

## V1 Private Beta scope

### Identity, privacy, households, and synchronization

- Google sign-in, Apple sign-in, and email fallback.
- Private cloud-stored customer data and cross-device synchronization.
- Multiple users and multiple rigs per household.
- Household membership, authorization, and active-rig selection.
- Private-by-default access and a migration path for prototype browser data.

### Expanded My Rig and garage

- Multiple RVs and tow vehicles with applicable pairings.
- Manufacturer, model, year, type, travel dimensions, weight ratings, towing attributes, hitch configuration, and fuel information.
- Electrical service, slides, fresh/gray/black tanks, propane, battery, solar, generator, and other readiness/resource systems.
- Owner verification, verifier, date, source, freshness, and confidence for applicable safety-critical fields.

### Discover

- Search the complete reachable area from the origin through the maximum drive time.
- Do not cluster candidate collection around the maximum-drive boundary.
- Provide curated/recommended trips and View All Campgrounds.
- Preserve preference, weather, activity, price, novelty, and drive-time ranking.
- Treat known fit/safety conflicts as eligibility constraints, not soft penalties.
- Display material confidence and freshness.

### Campground intelligence and booking handoff

- Rig fit, hookups, dimensional/site information, pull-through status, pet rules, pricing, and booking source where available.
- Data source, freshness, confidence, and clear Unknown states.
- External campground booking handoff.
- No reservation-payment processing by RoamPilot in V1.
- Contextual report-incorrect-data functionality.

### Starlink and connectivity

- Basic Starlink suitability and connectivity assessment.
- Open-sky, tree-cover, obstruction, or terrain factors where supported.
- Source, freshness, and confidence labeling.
- Clear distinction between measured/reported connectivity and estimated suitability.
- No service-quality guarantee.

### RV-aware routing foundation

- Associate route requests with the selected rig.
- Model height, width, length, weight, propane, and relevant towing restrictions.
- Add road-restriction provider adapters and conflict handling.
- Distinguish standard, partial, estimated, and verified RV-aware routing coverage.
- Never represent unverified standard routing as RV-safe.

### Road Mode

Use active route and direction of travel to find services ahead:

- Campgrounds
- Fuel
- Dump stations
- Potable water
- Propane
- Rest areas and overnight locations
- RV repair
- Tire service

Rank with minutes ahead, off-route distance, direction, active rig, compatibility, status, source, freshness, and confidence where available.

### Boondocking and onboard-resource planning

- Fresh-water capacity and consumption.
- Gray- and black-tank capacity and accumulation.
- Propane capacity and usage.
- Battery capacity, solar generation, and generator configuration.
- Household size and adjustable consumption assumptions.
- Estimated off-grid duration with disclosed assumptions and confidence.
- Separate rated capacity, current level, reported usage, and estimated duration.

### Maintenance and Trip Readiness

- Maintenance history tied to each rig.
- Maintenance dates, mileage/hours, provider, notes, and attachment-ready records.
- Maintenance reminders and due/overdue status.
- Trip Readiness summary.
- Customizable pre-trip, setup, teardown, winterization, and de-winterization checklists.
- Household- or rig-scoped templates and completion history.
- Safety-critical readiness items distinguished from optional tasks.

### Ask RoamPilot

- Basic conversational interface with access only to the signed-in user's authorized household data.
- Context from rigs, trips, preferences, maintenance, readiness, checklists, and resource plans.
- Ability to explain, recommend, organize, summarize, and draft plans.
- Deterministic tools for safety-critical lookups and calculations.
- Source/confidence preservation and refusal to invent or override critical facts.

### Private-beta feedback

- Report incorrect campground, route, service, connectivity, trip, and fit data in context.
- Capture record, category/field, report, user, timestamp, notes, and optional evidence.
- Track review status.
- Never promote one unreviewed report directly to Verified.
- Provide a general beta-feedback channel in addition to record-specific reports.

---

# Proposed V1 Phased Development Plan

This dependency-ordered phase structure is approved. Implementation still requires explicit authorization to begin Phase 1.

## Mandatory development gate for every phase

Every phase follows this sequence without exception:

1. **Implement** the approved scope only.
2. **Validate automated tests** appropriate to the risk and affected system.
3. **Deploy** the exact validated commit through the approved release process.
4. **Production test** the deployed version against phase acceptance criteria.
5. **User/product review where applicable** and record decisions or rejected outcomes.
6. **Fix issues** discovered during automated, production, or product review; repeat validation and deployment as needed.
7. **Update the Master Product Spec/current status** to reflect what actually shipped, limitations, decisions, and remaining risks.
8. **Commit and push** the final verified documentation and implementation so the repository, deployment, and specification identify the same source state.
9. **Approve the next phase** explicitly before any work from it begins.

A phase is not complete merely because code was written or automated tests passed. The deployed production state, Git commit, and Master Product Spec must agree. **Phase 2 must not begin automatically after Phase 1.**

## Phase 0 — Baseline stabilization and architecture decisions

**Purpose:** Establish a known starting point and settle decisions required by later phases.

**Scope:**

- Resolve the current uncommitted provider-resilience work and restore a clean, tested baseline.
- Update technical documentation to match the current build.
- Choose the authentication and cloud-data platform.
- Define household authorization and privacy rules.
- Define canonical records, identifiers, provenance, confidence, and field-level freshness policies.
- Select or shortlist routing, restriction, campground, connectivity, and service providers.
- Document licensing, attribution, caching, quotas, observability, backups, migrations, and secret management.

**Exit criteria:** Clean repository; approved architecture, data model, provider plan, confidence model, and privacy rules.

## Phase 1A — Foundation Decisions and Architecture

**Purpose:** Reconcile the production baseline and make informed architecture, vendor, privacy, and data-model recommendations before committing the application to a backend or routing platform.

**Scope:** Production/Sites/Git baseline reconciliation; RV-aware routing-provider research; authentication/cloud-database platform research; email-fallback recommendation; canonical user/household/rig/tow-vehicle/trip/provenance model; household-role and multi-household analysis; localStorage migration design; private-beta privacy/deletion/retention/export/backup/recovery/support-access standards; infrastructure/API cost projections; and architectural decision records with alternatives.

**Explicit exclusions:** Do not implement authentication, a cloud database, schema migrations, households, cloud synchronization, local-data migration, or a new routing provider during Phase 1A. Do not purchase or contract with a major vendor without product-owner approval.

**Depends on:** Phase 0.

**Exit criteria:** The production baseline is authoritative; research and architecture deliverables are complete; alternatives, costs, risks, and portability implications are documented; recommendations and approval decisions are presented to the product owner; and work stops. Phase 1B requires explicit approval of the Phase 1A architecture and vendors.

## Phase 1B — Accounts and Cloud Foundation

**Purpose:** Implement the secure customer identity, household, authorization, and cloud-data foundation approved at the Phase 1A checkpoint.

**Scope:** Approved Google, Apple, and email authentication architecture; approved database; user, household, membership, invitation, and role records; server-side authorization; private cloud persistence; cross-device synchronization; active household/rig foundations; cloud My Rig and saved trips; localStorage migration; account recovery/deletion/sign-out; privacy and operational controls; automated validation; deployment; and production testing. For the validation stage, Google alone is release-active; Apple and production email delivery are deferred without changing long-term V1 requirements.

**Depends on:** Explicit product-owner approval of Phase 1A decisions.

**Validation-stage exit criteria:** Google authentication works for approved testers; authorized household data synchronizes across devices; unauthorized access is blocked; migration and account lifecycle work as approved; automated tests, deployment, and production validation pass; deferred Apple/email requirements are documented; and the product owner reviews the candidate. Broader V1 beta readiness still requires Google + Apple + email fallback. Phase 2 remains blocked pending separate approval.

## Phase 2 — Garage, systems, maintenance, and readiness foundation

**Purpose:** Establish the structured source of truth for every rig before fit, routing, resources, or AI rely on it.

**Scope:** Multiple RVs/tow vehicles, expanded specifications and systems, owner verification, field-level provenance, maintenance history/reminders, checklist templates/runs, and initial Trip Readiness logic.

**Depends on:** Phase 1.

**Exit criteria:** Households manage multiple complete rigs; verification is auditable; maintenance/checklists synchronize; readiness distinguishes blocking, warning, optional, and Unknown states.

## Phase 3 — Campground data platform and complete-area discovery

**Purpose:** Build trustworthy campground records and correct discovery coverage.

**Scope:** Normalized campground/site model; provider provenance; full reachable-area candidate search; recommended trips; View All Campgrounds; deterministic rig-fit rules; hookups/sites/pricing/booking sources; external booking handoff; Starlink/connectivity assessment; durable live-trip saving; incorrect-data reporting; provider health, caching, rate limits, retries, and fallback behavior.

**Depends on:** Phases 0–2.

**Exit criteria:** Discovery covers the whole reachable area; recommended and View All share one data foundation; facts show confidence/freshness; known incompatibilities block a positive fit; booking leaves RoamPilot clearly.

## Phase 4 — Resource planning and trip-specific readiness

**Purpose:** Convert structured rig systems and trip context into useful planning tools.

**Scope:** Fresh/gray/black tank planning; propane; battery/solar/generator planning; household assumptions; estimated off-grid duration; adjustable inputs; trip-specific readiness; maintenance due/overdue logic; and trip checklists.

**Depends on:** Phases 2 and 3.

**Exit criteria:** Users can build a disclosed, confidence-labeled off-grid estimate and receive a useful readiness/checklist summary for a planned trip.

## Phase 5 — RV-aware routing foundation and route-aware Road Mode

**Purpose:** Apply selected-rig facts to route feasibility and locate services genuinely ahead.

**Scope:** RV-aware provider integration or explicitly bounded partial coverage; height/width/length/weight/propane restrictions; conflict and Unknown handling; route provenance/confidence; active route and heading; ahead-of-route search corridor; campgrounds, fuel, dumps, water, propane, overnight locations, repair, and tire service; off-route/time-ahead ranking.

**Depends on:** Phases 0, 2, and 3.

**Exit criteria:** Road Mode uses route and direction; behind-route results are not presented as ahead; conflicts are deterministic; partial coverage is never presented as verified safety.

## Phase 6 — Ask RoamPilot

**Purpose:** Add conversational value after the structured foundations exist.

**Scope:** Conversational UI; authorized household retrieval; structured tools for rigs, trips, campgrounds, resources, maintenance, readiness, checklists, and routes; grounded explanations/plans; source/confidence references; safety refusals; prompt-injection defenses; cross-household isolation; and private-data AI evaluation.

**Depends on:** Phases 1–5. A deliberately limited beta scope may expose only completed tools.

**Exit criteria:** Answers use authorized data, safety claims are tool-grounded, Unknown remains Unknown, and evaluation covers hallucination, isolation, and unsafe overrides.

## Phase 7 — Private-beta hardening and release

**Purpose:** Validate the integrated product before inviting beta households.

**Scope:** End-to-end tests; iPhone/Safari and Android testing; accessibility, security, authorization, and privacy reviews; export/deletion verification; failure/staleness/load tests; observability and alerts; support/feedback workflows; onboarding; known-limitations disclosure; release criteria; and rollback plan.

**Depends on:** Every V1 capability selected for beta.

**Exit criteria:** Approved readiness checklist; no critical privacy/safety defects; core journeys work on target devices; support and incident workflows are operational.

---

# Detailed Phase 1A Plan — Foundation Decisions and Architecture

**Phase objective:** Establish an authoritative production baseline and present evidence-based architecture, vendor, cost, privacy, migration, and canonical-data recommendations before any backend commitment or product-feature implementation.

**Phase 1A is a decision phase, not an implementation phase.** Do not implement authentication, a database, database migrations, households, cloud persistence, cross-device synchronization, localStorage migration, or a new routing provider. Do not purchase, contract with, or independently select a major vendor. Research begins only after the product owner explicitly authorizes Phase 1A.

## Workstream 1 — Production baseline reconciliation

### Tasks

1. Inspect the production Sites project, deployment history, version records, and currently active deployment.
2. Inspect GitHub `main`, local `main`, relevant tags/branches, and commits `bad4f9e` and `e61a8af` if present.
3. Determine whether version 4/`bad4f9e` or version 5/`e61a8af` is actually serving production.
4. Compare the active deployed artifact with its recorded source commit and confirm the repository contains that exact state.
5. Identify the cause of the conflicting reports: stale documentation, an unrecorded deployment, an unpublished commit, a different workspace, or another source mismatch.
6. Resolve the discrepancy without overwriting newer valid work.
7. Record an authoritative baseline containing Sites project, production URL, Sites version, deployment status, source commit, GitHub branch, date verified, and any remaining local changes.
8. Update the Current Build section only after evidence is conclusive.

### Acceptance criteria

- One production baseline is supported by both Sites and Git evidence.
- The live deployment's source commit exists on the documented GitHub branch.
- The Master Product Spec contains no contradictory live-version statements.
- Any uncommitted work is explicitly preserved, resolved, or separated before Phase 1 implementation continues.
- No production deployment is changed merely to make documentation convenient; any deployment correction follows the phase gate.

## Workstream 2 — RV-aware routing provider research and recommendation

### Tasks

1. Define a weighted evaluation rubric before comparing vendors.
2. Research current production-capable providers using primary documentation and direct commercial information where available.
3. Evaluate at minimum:
   - RV/truck routing support and U.S. coverage
   - Height, width, length, gross weight, axle weight/count, trailer, hazmat/propane, and vehicle-type inputs
   - Low-clearance, weight, bridge, tunnel, grade, seasonal, closure, and trailer restriction coverage
   - Route matrix, corridor/search-along-route, waypoint, rerouting, traffic, and navigation capabilities
   - Restriction provenance, freshness, confidence, and explainability
   - API latency, reliability, rate limits, quotas, caching permissions, and SLA
   - Licensing for consumer applications, stored routes, derived data, maps, and display requirements
   - SDK/platform support for responsive web/PWA and possible future native apps
   - Pricing at private-beta, early-production, and growth volumes
   - Privacy implications of sending location, route, and vehicle attributes
   - Vendor lock-in, data portability, fallback options, and operational risk
4. Produce a comparison matrix and written recommendation with runner-up and rejection reasons.
5. Identify every canonical rig, vehicle, route, restriction, provenance, and confidence field required by the recommended provider.
6. Identify provider-specific fields that should remain isolated in an adapter rather than leak into the core domain model.
7. Define a proposed standard-route/RV-aware/partial/estimated/unknown route-status model.
8. Document integration prerequisites, estimated cost, proof-of-concept scope, contractual questions, and risks.
9. Obtain product approval of the recommendation before treating it as an architecture decision.

### Acceptance criteria

- The research uses current authoritative vendor documentation and clearly dates pricing/coverage findings.
- The rubric and comparison include safety coverage, commercial terms, technical fit, privacy, and reliability.
- One provider is recommended, with a documented alternative and explicit tradeoffs.
- The provider's requirements are reflected in the proposed canonical data model before migrations are finalized.
- No new routing provider is integrated, called by production, or purchased as part of Phase 1 without separate approval.

## Workstream 3 — Authentication/database research and canonical architecture

### Tasks

1. Research credible authentication and cloud-database platform options using current primary documentation, pricing, portability, operational, security, and ecosystem evidence.
2. Compare combined platforms against composable authentication/database approaches.
3. Recommend an authentication/cloud-data architecture, but leave the final vendor decision to the product owner.
4. Recommend the email fallback method—such as magic link, one-time code, or password—using security, deliverability, support, and UX tradeoffs.
5. Define canonical entities and relationships for:
   - User
   - Authentication identity
   - Household
   - Household membership
   - Invitation
   - Rig
   - Tow vehicle
   - Rig/tow-vehicle pairing
   - User preference
   - Saved trip snapshot
   - Data source/provenance
   - Field-level confidence/freshness/verification metadata
   - Audit/security events
6. Include routing-provider-required rig and vehicle fields in the canonical model, but do not implement routing calls.
7. Define stable identifiers, timestamps, soft-deletion/retention rules, versioning, and optimistic-concurrency behavior.
8. Recommend household roles and determine whether multiple-household membership is needed for V1.
9. Define tenant boundaries and row-level/server-side authorization rules for every household-owned entity.
10. Design localStorage-to-cloud migration, duplicate detection, rollback, and conflict handling without executing the migration.
11. Define private-beta privacy, deletion, retention, export, backup, recovery, audit, and support-access standards.
12. Estimate authentication, database, storage, email, routing, maps, and other expected infrastructure/API costs for the private beta and reasonable early growth scenarios.
13. Produce architectural decision records covering the recommendation, alternatives, tradeoffs, portability, cost, and reasons rejected.
14. Review the model against later Phase 2–6 requirements to avoid preventable dead ends.

### Acceptance criteria

- The proposed schema supports multiple users, households, rigs, and devices without hard-coding the seeded household.
- Proposed authorization rules prevent household-owned records from being queried or mutated outside authorized membership.
- Confidence/provenance are modeled as first-class data rather than presentation-only labels.
- Routing requirements inform the core model without coupling it to one vendor.
- Migration and rollback designs exist before production schema changes.
- Cost projections show assumptions for the private beta and at least one reasonable early-growth scenario.
- Major recommendations include alternatives and portability implications.

## Phase 1A deliverables

Codex must present one review package containing:

1. Authoritative production baseline report resolving Sites version 4/`bad4f9e` versus version 5/`e61a8af`.
2. RV-aware routing-provider comparison, recommendation, runner-up, costs, risks, and canonical-data implications.
3. Authentication/cloud-database comparison and recommendation, including costs and portability.
4. Email fallback recommendation.
5. Canonical data model and relationship diagram/specification.
6. Proposed household roles and multi-household recommendation.
7. LocalStorage-to-cloud migration design and rollback strategy.
8. Private-beta privacy, deletion, retention, export, backup, recovery, audit, and support-access standards.
9. Infrastructure/API cost model for private beta and reasonable early growth.
10. Architectural decision records with alternatives and rejected-option reasoning.
11. A consolidated list of decisions requiring product-owner approval.

## Phase 1A decisions requiring product-owner approval

| Decision | Required recommendation content |
|---|---|
| Authentication/cloud-database platform | Cost, portability, operational burden, security model, provider lock-in, migration path, and alternatives. |
| Email fallback method | UX, deliverability, account recovery, abuse resistance, and support implications. |
| RV-aware routing provider | Safety/restriction coverage, data freshness, reliability, price, licensing, privacy, lock-in, runner-up, and rejected options. |
| Household role model | Permissions for invitations, rigs, trips, deletion, billing-ready ownership, and administration. |
| Multiple-household membership | User need, UX cost, authorization complexity, and future migration impact. |
| Canonical data model | Major entities, relationships, tenancy, confidence/provenance, routing requirements, versioning, and portability. |
| Local-data migration strategy | Import/merge/skip behavior, conflicts, idempotency, rollback, and user consent. |
| Private-beta data standards | Privacy, deletion, retention, export, backup, recovery, audit, and support access. |
| Expected operating-cost envelope | Private-beta assumptions, early-growth assumptions, variable-cost drivers, and warning thresholds. |
| Baseline correction, if needed | Evidence and impact before any destructive Git action or corrective production deployment. |

## Phase 1A acceptance criteria and stop gate

- Production baseline evidence is conclusive and documented.
- Vendor research uses current authoritative sources and clearly dates changeable facts such as price and coverage.
- Authentication/database and RV-routing recommendations include meaningful alternatives rather than a unilateral Codex selection.
- The canonical model covers approved V1 needs without prematurely binding the domain to one vendor.
- Migration, privacy, security, backup, recovery, support-access, and cost designs are documented.
- The Master Product Spec is updated with the actual Phase 1A findings and unresolved risks.
- Phase 1A documentation is committed and pushed after review and correction.
- Codex presents the approval package and stops.
- No Phase 1B implementation begins until the product owner explicitly approves the architecture and vendors.

For a research/documentation-only Phase 1A, the universal phase gate is applied proportionately: automated document/source checks and baseline production verification are required; no artificial product deployment is required when no runtime source changed. If an approved baseline correction changes runtime source or production, the full deploy and production-test sequence applies.

---

# Detailed Phase 1B Plan — Accounts and Cloud Foundation

**Status:** Approved and implemented to validation-stage production-candidate status. Google is the active validation authentication path; Apple and production email OTP are approved deferrals that remain required before broader V1 beta readiness.

**Objective:** Implement the approved authentication, database, household authorization, cloud persistence, synchronization, local-data migration, privacy, and account-lifecycle foundation.

## Phase 1B Workstream 1 — Authentication and account lifecycle

### Tasks

1. Implement Google sign-in.
2. Implement Apple sign-in.
3. Implement an approved email fallback method.
4. Implement secure session handling, sign-out, session expiry, and account recovery as supported by the chosen platform.
5. Create/update the application user record on successful authentication without duplicating identities.
6. Add account deletion and data-deletion handling appropriate to the private beta.
7. Handle provider cancellation, expired links/tokens, duplicate emails, identity linking, and unavailable provider cases.
8. Remove or replace the current static avatar behavior with an authenticated account state.
9. Protect authenticated screens and server operations.

### Acceptance criteria

- Google, Apple, and email fallback work in production on supported target devices.
- Failed/cancelled authentication returns users to a safe recoverable state.
- Sessions use secure production settings.
- Duplicate authentication identities do not silently create duplicate customer accounts.
- Sign-out and account deletion behave as documented.

## Phase 1B Workstream 2 — Households and authorization

### Tasks

1. Create a household during first-user onboarding.
2. Allow an authorized user to invite another household member.
3. Implement the approved minimum role model.
4. Implement household switching if a user may belong to more than one household.
5. Implement active-household and active-rig selection foundations.
6. Enforce household scoping on every read and write.
7. Add authorization-negative tests for cross-household access, guessed IDs, direct API calls, and removed members.
8. Define ownership transfer and last-owner behavior if included in approved scope.

### Acceptance criteria

- Multiple authorized users can access the same household data across devices.
- Users cannot access another household through UI, API, identifier guessing, or stale client state.
- Removing a member revokes access according to documented session timing.
- Household roles behave exactly as approved.

## Phase 1B Workstream 3 — Cloud persistence and synchronization

### Tasks

1. Persist current rig/profile and saved-trip data in the cloud under the household boundary.
2. Preserve or migrate prototype `localStorage` data through an explicit, user-safe flow.
3. Define client cache, refresh, conflict, retry, and offline-error behavior.
4. Synchronize changes across authenticated devices.
5. Version saved-trip snapshots so provider changes do not corrupt historical records.
6. Keep local storage only where deliberately useful as a cache or migration source.
7. Add timestamps and audit information needed to resolve conflicts.

### Acceptance criteria

- Rig/profile and saved-trip records survive browser-storage clearing after cloud sync.
- The same authorized household data appears on a second device.
- Concurrent edits follow documented conflict behavior.
- Migration is idempotent and does not duplicate records.
- Live-discovered trips can be saved and reopened as durable snapshots.

## Phase 1B Workstream 4 — Privacy, security, and operations

### Tasks

1. Create a data inventory and classify identity, household, vehicle, travel, maintenance, and location information.
2. Apply least-privilege access and keep provider/service credentials server-side.
3. Define retention, deletion, export, logging, and support-access policies for private beta.
4. Add safe structured logging that excludes secrets and unnecessary personal data.
5. Add monitoring for authentication failures, authorization denials, sync errors, and migration failures.
6. Document incident, rollback, backup, and recovery procedures.
7. Perform a focused authorization and privacy review before production deployment.

### Acceptance criteria

- No secret is exposed to the client or committed.
- Logs do not contain authentication tokens or unnecessary private data.
- Data export/deletion and backup/recovery behavior are documented and tested to the agreed beta standard.
- Security tests demonstrate tenant isolation.

## Phase 1B Workstream 5 — Automated validation

Codex should add and pass automated coverage for:

- Data-model constraints and migrations
- Authentication callbacks and account lifecycle where testable
- Household authorization and negative cross-tenant cases
- Invitation and membership-role transitions
- Cloud persistence and local migration
- Saved live-trip snapshots
- Synchronization/conflict behavior
- Confidence/provenance persistence
- Existing recommendation, discovery, planner, Road Mode, and rig-profile regression behavior
- Server-rendering/build checks
- Secret scanning and production configuration validation

Acceptance requires lint, type checking, unit/integration tests, production build, and the approved security-oriented tests. Passing automated tests does not replace production testing.

## Phase 1B Workstream 6 — Deployment, production testing, review, and closure

Follow the mandatory development gate:

1. Deploy the exact validated commit.
2. Confirm Sites version and Git commit immediately after deployment.
3. Production-test Google, Apple, and email sign-in on target devices.
4. Test household onboarding, invitation, role enforcement, cross-device sync, save/reopen, sign-out, recovery, deletion, and migration.
5. Confirm legacy public/private prototype data does not leak across households.
6. Conduct user/product review of onboarding, household language, privacy messaging, and synchronization behavior.
7. Fix issues and repeat test/deploy/review cycles.
8. Update Current Build, decisions, limitations, deployment baseline, and change log in this specification.
9. Commit and push the final verified state.
10. Stop and request explicit Phase 2 approval.

## Phase 1B approved inputs

Phase 1B must consume the product-owner-approved Phase 1A decisions. Codex may not substitute a different authentication provider, database, email method, household model, migration policy, privacy standard, or major architectural approach without returning for approval.

The RV-aware routing selection informs the canonical data model, but routing-provider integration remains outside Phase 1B.

## What Codex should implement in Phase 1B

Once Phase 1B is explicitly authorized, Codex should implement only:

- The approved authentication flows.
- User, household, membership, invitation, and minimal rig/saved-trip persistence foundations.
- Server-enforced household authorization.
- Active household and active rig foundations.
- Cross-device cloud synchronization.
- Safe migration of existing local rig and saved-trip data.
- Durable saved-trip snapshots, including live-discovered trips.
- Confidence/provenance fields required by the canonical model.
- Privacy/security/operational controls necessary for the private beta.
- Automated tests, deployment validation, production testing support, and documentation updates required by the phase gate.
- The approved canonical routing-related fields needed by future phases, but **not** the new routing-provider integration.

Codex should not implement expanded Phase 2 rig screens, maintenance, readiness, checklists, campground-platform changes, Road Mode changes, resource planning, Ask RoamPilot, or the new routing provider during Phase 1B.

## Phase 1B completion rule

Phase 1B is complete only when all acceptance criteria have passed, production has been tested, the product owner has reviewed applicable flows, issues have been fixed, the Master Product Spec reflects the deployed reality, and the final verified state is committed and pushed. Completion does not authorize Phase 2. Codex must stop and request explicit approval.

---

# Phase 1A Product-Owner Review Package

Status: **Research complete; recommendations awaiting product-owner approval. Phase 1B is not authorized.**

Research date: August 20, 2026. Pricing and vendor terms are point-in-time findings and must be reconfirmed before purchase or production configuration.

## 1. Verified production and Git baseline

The previously conflicting deployment records are reconciled.

| Item | Verified current state |
|---|---|
| Git repository | `https://github.com/mkwebb8/roampilot.git` |
| Local branch | `main`, aligned with `origin/main` at inspection time |
| Current source commit | `e61a8afba1eb6ef304c450e002973b87368a9b72` — “Harden live discovery routing” |
| Prior relevant commit | `bad4f9e8a70e588c4670ce6d99853b26ef60dea7` — “Add live destination discovery” |
| Sites project | `appgprj_6a864fe00c188191b25a65b19e8f2908` |
| Current deployment | Sites version 5, sourced from `e61a8afba1eb6ef304c450e002973b87368a9b72` |
| Prior deployment | Sites version 4, sourced from `bad4f9e8a70e588c4670ce6d99853b26ef60dea7` |
| Production URL | `https://roampilot-rv.mkwebb8.chatgpt.site` |
| Site status/access | Active; private custom owner access at inspection time |

Conclusion: version 5/`e61a8af` is the production baseline. Version 4/`bad4f9e` is a valid prior deployment record, not a competing current state. No rollback or source reconciliation is required.

The Master Product Spec remains an untracked working document at the end of Phase 1A research; application source and deployment were not changed.

## 2. RV-aware routing provider research

### Evaluation criteria

The comparison prioritizes explicit RV support; vehicle and trailer dimensions; gross and axle weights; propane/hazardous-material restrictions; tunnel, bridge, road-class, turn, and legal restrictions; route matrix and isochrone support for Discover; along-route search and direction-of-travel support for Road Mode; North American coverage; navigation potential; commercial terms; data freshness; explainability; and vendor portability.

### Comparison

| Provider | Strengths for RoamPilot | Gaps/risks | Commercial finding | Assessment |
|---|---|---|---|---|
| **Trimble Maps / PC*Miler / CoPilot** | Explicit North American `RV` vehicle type and preset; custom height, width, length, weight and axle values; explicit propane-restriction field; hazmat and tunnel settings; commercial/legal restrictions; isochrones, matrices, route comparison, reports, along-route places, and a path toward embedded CoPilot navigation. | Fleet/commercial product orientation; more complex licensing; pricing is not publicly self-service; some mapping/navigation capabilities require separate licenses; must validate RV coverage and consumer-app licensing in a proof of concept and contract. | A 30-day trial offers 500 routing calls/month. Production and add-on pricing require a sales quote and licensing agreement. | **Recommended first-choice candidate for commercial and technical validation.** It is the clearest semantic fit for an RV product. |
| **HERE Routing** | Mature truck routing; gross/current weight, axle and axle-group weight, height, width, length, hazmat and tunnel categories; traffic, incidents, tolls and broad global coverage; strong platform and self-hosting options. | No equally explicit RV profile found; RV/trailer and propane meaning would need careful mapping to truck parameters. HERE’s published plan exclusions identify asset-management and optimization use cases that may overlap Road Mode, tracking, or route analysis, requiring written licensing clarification. | Limited plan advertises 1,000 daily requests and 10 truck-routing requests/second, but excluded use cases may require a commercial agreement. | **Strong second choice.** Best fallback if Trimble terms or economics are unsuitable. |
| **TomTom Orbis Routing** | Truck dimensions, weight, axle weight, hazardous loads and tunnel restrictions; broad mapping and traffic ecosystem; published entry allowance can support inexpensive prototyping. | Official material directs new integrations away from legacy Routing API v1 toward Orbis; product transition increases implementation and contract uncertainty. No explicit RV/propane model comparable to Trimble was verified. | Published pricing indicates a free allowance of 20,000 Routing API requests/month for applicable products, with usage-based or enterprise pricing beyond it; exact Orbis feature pricing must be reconfirmed. | **Viable third choice**, especially for cost-sensitive prototyping after Orbis feature parity is confirmed. |
| **PTV Logistics APIs** | Strong commercial-vehicle and logistics heritage; configurable profiles and vehicle attributes; credible routing engine. | Less evidence of a first-class consumer RV profile, propane semantics, and U.S. RV-focused coverage; public pricing and licensing are comparatively opaque. | Quote/contract discovery is required for the intended use. | **Alternative/specialist option**, not the recommended first negotiation. |

### Routing recommendation

Proceed in a future authorized phase with a **time-boxed Trimble Maps technical and commercial validation**, not a purchase commitment. Request a written quote and written confirmation that RoamPilot may use the selected APIs for consumer RV trip discovery, saved routes, Road Mode, route-corridor searches, and—if later desired—turn-by-turn navigation.

The proof of concept should test a representative North American route suite containing known low clearances, weight restrictions, propane/tunnel restrictions, narrow or unsuitable roads, trailer combinations, campground approach roads, ferries, and benign controls. Compare results with HERE as the benchmark fallback. Require the provider to identify update cadence, incident/closure behavior, geographic exceptions, attribution rules, cache/storage rights, derived-data rights, SLA/support, overage behavior, and termination/export terms.

No routing provider should be represented as guaranteeing safety. Deterministic owner-verified rig facts and provider restriction data must produce warnings, source/freshness labels, and conservative failure behavior. Users remain responsible for signs, conditions, and legal operation.

### Routing-neutral architecture decision

The canonical model must not store a vendor request object as the source of truth. It should store normalized RoamPilot units and concepts, then use adapters to translate them:

- physical dimensions in millimetres and displayed in user-preferred units;
- mass in kilograms and displayed in pounds where appropriate;
- RV body, trailer, tow vehicle, axle, and combination facts separately;
- propane presence/capacity and restriction policy separately from generic hazardous-material codes;
- route constraints, avoidances, confidence, source, observation time, and provider response version;
- provider route IDs only as optional external references;
- immutable route-request snapshots on saved/built trips so later data changes remain explainable.

Official research references: [Trimble Routing APIs](https://developer.trimblemaps.com/restful-apis/routing/introduction/), [Trimble Vehicle Routing Profiles](https://developer.trimblemaps.com/restful-apis/routing/vehicle-routing-profiles/overview/), [Trimble trial access](https://developer.trimblemaps.com/get-an-api-key/na/), [HERE truck routing](https://docs.here.com/routing/docs/routing-v8-truck-routing), [HERE plan limits and excluded uses](https://www.here.com/get-started/pricing/rps-limits-excluded-use-cases), [TomTom Routing API introduction](https://docs.tomtom.com/routing-api/documentation/tomtom-maps/v1/product-information/introduction), and [TomTom pricing](https://docs.tomtom.com/pricing).

## 3. Authentication and cloud database platform research

### Comparison

| Platform | Fit | Principal tradeoffs | Current entry economics |
|---|---|---|---|
| **Supabase Auth + managed Postgres** | One integrated platform for Google, Apple, passwordless email, relational household data, PostGIS-ready geospatial data, storage, realtime, migrations and Postgres Row Level Security. The relational model naturally fits users-to-households, multiple rigs, shared trips, observations, provenance, maintenance and checklist records. Postgres reduces data-model lock-in. | RLS is powerful but security-critical and must be exhaustively tested. The team owns SQL/schema discipline and production email delivery. Auth identities remain easier to move than proprietary data, but provider users may still need re-linking after an auth migration. Apple web OAuth needs six-month secret rotation. | Pro starts at $25/month, includes 100,000 MAU, 8 GB database, 250 GB egress, 100 GB object storage and seven days of daily backups. Seven-day point-in-time recovery is about $100/month if later required. |
| **Firebase Auth + Firestore** | Excellent mobile SDK maturity; Google/Apple/email support; large ecosystem; no-cost auth tier and usage-based scale. | Firestore’s document model is less natural for household membership, provenance, maintenance and reporting; authorization rules and denormalization become more complex; database/query portability is materially weaker. Predicting read/write billing requires workload modelling. | Auth includes 50,000 MAU on Blaze before per-MAU charges; Firestore has free daily quotas and usage-based reads, writes, storage and egress. |
| **Clerk + separate Postgres provider** | Highly polished authentication UI and user-management experience; fast integration; supports consumer auth. | Adds a second core vendor and synchronization boundary; household “organizations” are not the same product concept and can add pricing/semantic coupling; application authorization still belongs in the database; substantially higher retained-user overage at scale. | Hobby supports up to 50,000 monthly retained users. Pro is $20/month billed annually and includes 50,000 retained users, then published per-user overage. Database cost is additional. |
| **Auth0 + separate database** | Mature identity specialist, extensive enterprise features and portability standards. | Highest operational/vendor complexity for this beta; application data and household authorization still require a separate platform; paid tiers become expensive earlier; unnecessary enterprise surface for current needs. | Free supports up to 25,000 MAU; paid B2C pricing begins at $35/month for 500 MAU, with higher tiers increasing materially. Database cost is additional. |

### Platform recommendation

Approve **Supabase Pro in a U.S. region, using Supabase Auth and managed Postgres**, for Phase 1B. Use Postgres Row Level Security as defense in depth, but keep authorization rules in version-controlled migrations and test all cross-household negative cases. Use standard Postgres tables and types where practical; isolate Supabase client calls behind application repositories/adapters; keep domain types vendor-neutral; maintain routine logical exports; and never place service-role credentials in the browser.

This recommendation is based on product fit and portability, not merely implementation convenience. A single relational source supports household collaboration, field-level confidence/provenance, multi-rig ownership, saved trip snapshots, maintenance, checklists and later analytics without synchronizing an external identity vendor to a document database.

Firebase is the preferred fallback if native-mobile velocity becomes the overriding priority and the product owner accepts Firestore lock-in and denormalization. Clerk plus Postgres is the preferred fallback if turnkey authentication UX is worth a second vendor and higher scale cost.

Official research references: [Supabase Auth](https://supabase.com/docs/guides/auth), [Supabase pricing](https://supabase.com/pricing), [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase backups](https://supabase.com/docs/guides/platform/backups), [Firebase Authentication](https://firebase.google.com/docs/auth), [Firebase pricing](https://firebase.google.com/pricing), [Clerk pricing](https://clerk.com/pricing), and [Auth0 pricing](https://auth0.com/pricing).

## 4. Email fallback recommendation

Use **passwordless six-digit email OTP** as the email fallback, not passwords and not magic links as the primary fallback.

Reasons:

- It works predictably when a user starts on one device and reads email on another.
- It avoids mobile deep-link and in-app-browser failure modes common to magic links.
- It avoids password storage, password-reset support, password-strength rules and credential-reuse risk.
- The UI can explicitly show expiry, resend timing, remaining attempts and the destination address.

Use a dedicated transactional email provider through custom SMTP; Supabase’s default sender is explicitly not intended for production and is limited to authorized team addresses with a very low rate limit. **Recommend Postmark** for the private beta because transactional delivery and message streams are its core product; **Resend** is the simpler developer-experience alternative. Final vendor selection and price must be reconfirmed immediately before Phase 1B because email pricing changes frequently.

Operational requirements: authenticate the sending domain with SPF/DKIM/DMARC; use a dedicated auth subdomain/from-address; suppress secrets and full OTPs from logs; rate-limit per address, device and network; make responses resistant to account enumeration; test Apple private-relay addresses; and monitor bounce/complaint/delivery health. Social accounts must be linkable only after reauthentication to prevent accidental or hostile account merging.

Apple sign-in requires Apple Developer Program enrollment and, for web OAuth, rotation of the Apple client secret every six months. This is a release-blocking recurring operation and must have two owners and an alert/runbook. [Supabase passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless), [Supabase production SMTP requirements](https://supabase.com/docs/guides/auth/auth-smtp), and [Supabase Apple login requirements](https://supabase.com/docs/guides/auth/social-login/auth-apple).

## 5. Proposed canonical data model

### Core design rules

- Use UUID primary keys, UTC `timestamptz` audit fields, explicit schema versions and reversible migrations.
- Treat a household as the authorization and sharing boundary; never infer access from email domain or client-supplied household ID.
- Separate a physical RV, tow vehicle and their pairing. A route request uses a pairing/configuration snapshot, not mutable current profile values.
- Store canonical SI units; convert only at UI and provider-adapter boundaries.
- Keep structured, deterministic safety facts separate from narrative/AI output.
- Model provenance and confidence at the field/observation level where it matters, not only at the campground or rig record level.
- Snapshot externally sourced facts used for a saved recommendation so “why” remains reproducible.

### Entity groups

**Identity and tenancy**

- `profiles`: application profile keyed to the authentication subject; display name, locale, units, onboarding and lifecycle state.
- `households`: name, owner membership, active/archive state and lifecycle timestamps.
- `household_memberships`: many-to-many user/household relationship, role, status, invitation and accepted timestamps.
- `household_invitations`: hashed token, invited email, role, expiry, inviter and status.
- `user_preferences`: user-level display and recommendation preferences.
- `household_preferences`: shared defaults, home base and trip-planning defaults.

**Garage and safety specifications**

- `rvs`: household-owned identity record—year, manufacturer, make/model, RV type, nickname and status.
- `tow_vehicles`: household-owned identity record—year, manufacturer, model, engine/fuel, cab/bed/drivetrain and nickname.
- `rig_pairings`: RV plus tow vehicle combination, active flag, hitch/connection type and combination notes.
- `rv_specifications`: dimensions, GVWR/GAWR/UVW/CCC where known, axle count, electrical service, slide geometry, generator, propane and tank/system capacities.
- `tow_vehicle_specifications`: dimensions, GVWR/GCWR/GAWR, curb/payload/tow ratings, hitch ratings, fuel/tank, towing MPG and axle facts.
- `rig_verifications`: owner acknowledgement for each safety-critical field, source type, evidence reference, verification timestamp and supersession link.
- `maintenance_records`, `maintenance_schedules`, `checklist_templates`, `checklist_items`, and `checklist_runs`: schema-ready for later V1 phases, not Phase 1B feature scope.

**Discovery, campground and trips**

- `places` and `campgrounds`: stable RoamPilot identity plus normalized location and provider-neutral attributes.
- `campground_sites` and `campground_facts`: site-level dimensions, hookup/service data, amenities, restrictions, pricing/booking references and observations.
- `searches`: origin, date window, maximum drive time, party, preferences, rig pairing, scoring version and status.
- `recommendation_runs` and `recommendation_scores`: normalized score components, weights, exclusions and explanation inputs.
- `trips`: household-owned saved/built trip, destination, dates, lifecycle state, source search and active rig pairing.
- `trip_snapshots`: immutable recommendation, route, campground, price, weather and provenance snapshot used when saved/built.
- `trip_stops`, `trip_activities`, and `trip_cost_estimates`: normalized itinerary and estimate elements.
- `route_requests` and `route_results`: normalized constraints/request snapshot, provider, provider version, response time, geometry reference, warnings and restriction findings.

**Trust, feedback and operations**

- `data_sources`: provider, license/use constraints, refresh policy and trust metadata.
- `fact_observations`: entity type/ID, field key, typed JSON value, confidence state, source, source record, observed/effective/expiry timestamps and supersession chain.
- `feedback_reports`: incorrect-data reports, reporter, affected fact/entity, suggested correction, evidence, triage and resolution.
- `migration_receipts`: device/import fingerprint, schema version, counts, timestamps and result for idempotent local migration.
- `audit_events`: actor, household, action, target, outcome, support-access reason and minimal security metadata.
- `data_exports` and `deletion_requests`: account lifecycle tracking without putting export files or secrets in logs.

### Product-wide confidence model

The existing four states remain authoritative:

- **Verified**: confirmed by an authoritative source or explicitly owner-verified for the owner’s rig; include method and time.
- **Reported**: supplied by a user, campground/operator or partner but not independently confirmed.
- **Estimated**: calculated or inferred; include method/model version and input freshness.
- **Unknown**: absent, contradictory, expired or below the usable threshold.

Confidence never substitutes for provenance. Every material displayed fact should be able to expose source and freshness. Contradictory safety facts resolve conservatively to Unknown/blocking review, not to an averaged value. AI may summarize these records but cannot promote their confidence or overwrite them.

## 6. Household and permissions recommendation

Support **multiple-household membership in the schema from the beginning**, while keeping the private-beta UI focused on one active household at a time. This avoids an expensive tenancy redesign for extended families, shared ownership, a user replacing/leaving a household, or future fleet-like cases.

Use three roles:

- **Owner**: all member capabilities; invite/remove members; change roles; transfer ownership; export/delete household data; delete the household. Exactly one owner is required initially, and the last owner cannot leave without transfer or household deletion.
- **Admin**: all shared product-data capabilities; invite members; manage rigs, trips, maintenance and shared settings; cannot delete the household, transfer ownership or access account credentials.
- **Member**: view and use shared household data; create/edit trips and routine records; cannot manage membership, ownership, deletion or support access.

Authorization must be server/database enforced with deny-by-default RLS, not hidden UI controls. All membership transitions, invitations, exports, deletions and support access are audited. No “support” membership is silently inserted into customer households.

## 7. Local-data migration strategy

At the first authenticated session with eligible local data:

1. Inventory and validate local profile, rig and saved-trip records without uploading.
2. Show the user what will move, which household will receive it, and that cloud sync will begin.
3. Create or select the destination household only after confirmation.
4. Convert local records through a versioned, deterministic mapper; preserve original local IDs as migration references.
5. Submit one idempotent import transaction identified by device/import fingerprint and schema version.
6. Deduplicate seeded/default records by stable seed ID; deduplicate user-created records only by strong identity evidence, never fuzzy matching alone.
7. Return and persist a migration receipt with imported/skipped/failed counts.
8. Verify server reads before marking local migration complete.
9. Keep an encrypted/minimized local fallback for 30 days or until the user explicitly clears it; do not silently delete the only copy.
10. Provide retry and support diagnostics that contain IDs/counts but no sensitive values.

If the same browser later signs into a different account, never auto-import previously detected data. Require an explicit ownership confirmation. Migration conflicts preserve both records or ask the user; they do not silently overwrite newer cloud data. A rollback removes only records tagged to the failed migration receipt and only when they have not subsequently been edited.

## 8. Private-beta privacy, security and lifecycle standard

### Recommended minimum standard

- Collect only data needed for the stated features. Do not retain continuous Road Mode GPS history in V1; process current position/direction ephemerally unless the user explicitly saves a stop/trip.
- Encrypt traffic in transit and rely on the approved platform’s managed encryption at rest; separately protect secrets in managed environment configuration.
- Enable deny-by-default RLS on every customer-data table, use least-privilege service access, and prohibit service-role keys in clients.
- Keep production, preview and development data/projects separate. Never copy production personal data into development.
- Redact tokens, OTPs, precise home/location values and unnecessary personal content from logs and analytics.
- Require MFA for vendor/admin accounts, individual administrator identities, protected branch/deployment practices and secret scanning.
- Default support access to none. Use time-limited, reason-coded, least-privilege break-glass access with audit trails and customer notice where practical. No routine impersonation in private beta.
- Provide household and user JSON export. Treat exported archives as sensitive, time-limited downloads.
- On account deletion, immediately disable access and schedule primary-data purge within 30 days; allow cancellation during that period. Household deletion requires owner confirmation and affects all members. Legal/security holds must be exceptional and documented.
- Purged data may age out of encrypted backups rather than being surgically removed from immutable backups. Target a maximum additional 30 days in backup retention and document that restored backups must replay deletion tombstones before service resumes.
- Retain security/audit events for 12 months; operational application logs for 30 days; support artifacts for 90 days after case closure; unused invitations for 30 days after expiry; migration receipts for account lifetime plus 90 days. Revisit these periods before public launch.
- Perform monthly logical database exports to a separately controlled encrypted location during beta, test a restore before launch and quarterly thereafter, and document recovery ownership. Supabase Pro’s seven daily backups are the immediate recovery layer; paid PITR is deferred until data volume/business impact justifies approximately $100/month.
- Publish a plain-language privacy notice and terms before inviting testers. Obtain explicit consent for AI processing and clearly distinguish saved data from ephemeral prompt/context handling.

### AI data boundary for later V1

Ask RoamPilot should receive only the minimum structured records required for the question, with field confidence/source metadata. Do not train a general model on private customer content; disable provider training where contract/settings permit; define prompt/log retention before Phase 6; and keep deterministic safety checks outside the model. This is a policy/design requirement now, not an implemented Phase 1A capability.

## 9. Private-beta and early-growth cost estimates

These estimates exclude development labor, legal review, commercial campground data, paid AI usage not yet designed, taxes and negotiated discounts. They are planning ranges, not quotes.

### Assumptions

| Scenario | Planning assumption |
|---|---|
| Private beta | 50–250 users, fewer than 100 households, light email, discovery and route-validation traffic |
| Early growth | 5,000–25,000 MAU, 2,000–10,000 households, materially higher discovery/route/weather/place traffic but still below Supabase Pro’s included 100,000 MAU |

### Estimated recurring/one-time costs

| Cost area | Private beta | Early growth | Notes |
|---|---:|---:|---|
| Supabase Pro | $25/month | $25–$100/month | Base includes substantial MAU, database, storage and egress headroom. Higher compute/egress may raise cost before MAU does. |
| Point-in-time recovery | $0 initially | $0–$100/month | Seven-day PITR is roughly $100/month; daily seven-day Pro backups are recommended for beta plus independent logical exports. |
| Transactional email | $0–$20/month | $20–$100/month | Depends on Postmark/Resend plan and OTP volume; validate current quotes. |
| Apple Developer Program | approximately $99/year | approximately $99/year | Required for Sign in with Apple configuration; reconfirm regional price. |
| Routing | trial only, then **quote required** | **quote required; potentially the dominant API cost** | Trimble production pricing is unpublished. Do not approve Phase 1B on an assumed routing price; routing integration is later, but obtain commercial bands before that phase. |
| HERE benchmark | possible limited-plan evaluation | contract/usage dependent | Published allowance exists, but intended Road Mode/asset use needs written license clarification. |
| Hosting/Sites | current entitlement; incremental cost not established | verify before public scale | Current site is active under existing Sites setup. Do not assume future public/private-beta pricing or SLA without confirmation. |
| Weather/federal recreation/public sources | often $0 direct license cost | $0–modest infrastructure | Rate limits, attribution, availability and no-SLA risks still create engineering/operations cost. |
| Backup archive/monitoring | $0–$25/month | $25–$150/month | Depends on storage and observability choices; avoid logging sensitive payloads. |

Expected non-routing platform total: approximately **$35–$75/month plus $99/year** for the private beta, and approximately **$70–$450/month plus routing, AI and premium-data contracts** during early growth. A prudent private-beta contingency budget is **$150/month excluding any production routing license**. No defensible total including RV routing can be stated until Trimble provides permitted-use and volume pricing.

## 10. Major risks, tradeoffs, portability concerns and alternatives

1. **Routing liability and data gaps:** even the best provider can be stale or incomplete, especially on campground approach roads. Mitigate with owner-verified facts, conservative Unknown states, warnings, provider-version/freshness capture, route test suites and incorrect-data feedback.
2. **Trimble commercial fit/cost:** strongest semantic fit but opaque pricing and fleet-oriented terms. Preserve HERE as the benchmark/fallback and keep adapters vendor-neutral.
3. **Authorization complexity:** household sharing plus multi-household membership creates serious cross-tenant risk. Require RLS negative tests, server-side checks for privileged actions and audit logs.
4. **Supabase coupling:** realtime, generated APIs and auth claims can create lock-in. Use standard Postgres schema/migrations, repository interfaces, export drills and minimal provider-specific database functions.
5. **Identity portability:** OAuth/passwordless users cannot always be invisibly migrated. Keep application user IDs separate from provider identity details and plan for account re-linking if the auth vendor changes.
6. **Apple operational burden:** missed six-month web OAuth secret rotation can break login. Treat rotation as an owned, monitored production runbook.
7. **Email dependency:** OTP availability becomes login availability. Use production SMTP, reputation controls, monitoring and a tested social-login alternative.
8. **Migration ownership ambiguity:** shared browsers and seed data can import into the wrong account. Require preview, household selection, idempotency, receipts and no automatic cross-account imports.
9. **Deletion versus backups:** immediate removal from immutable backups is impractical. State the backup-aging policy clearly and replay deletion tombstones after restoration.
10. **Cost uncertainty:** routing and premium campground data may dominate unit economics. Obtain written price bands and cache/derived-data rights before designing high-call-volume experiences.
11. **AI privacy/safety:** structured household data is valuable and sensitive. Minimize context, define retention and prohibit AI from inventing or overriding safety facts.
12. **Sites hosting uncertainty:** current deployment is verified, but public-beta SLA, access mode, custom-domain behavior and cost need confirmation before launch planning.

## 11. Decisions requiring product-owner approval before Phase 1B

Phase 1B must not begin until the product owner explicitly decides each item below:

1. Approve or reject **Supabase Pro (U.S. region) with Supabase Auth + Postgres** as the account/cloud platform.
2. Approve a fallback posture: Firebase for mobile-platform priority, or Clerk + Postgres for turnkey auth priority, if Supabase is rejected.
3. Approve **six-digit passwordless email OTP** as the fallback method and authorize a later Postmark-versus-Resend final quote/configuration decision.
4. Approve Google and Apple sign-in operational prerequisites, including Apple Developer membership and six-month web-secret rotation.
5. Approve the canonical relational data model and provider-neutral adapter boundary described above.
6. Approve multiple-household membership in the schema and the **Owner/Admin/Member** role model.
7. Approve the local-data migration consent, idempotency, deduplication, 30-day local fallback and rollback rules.
8. Approve the privacy/security standard, including no retained continuous GPS history in V1, support-access rules and log redaction.
9. Approve lifecycle periods: primary deletion within 30 days; backup aging up to an additional 30 days; audit 12 months; logs 30 days; support artifacts 90 days; expired invitations 30 days.
10. Approve Supabase Pro daily backups plus monthly independent logical exports for beta, with PITR deferred pending risk/usage.
11. Approve the private-beta budget guardrail of **$150/month excluding routing**, and require approval for any vendor or overage that would exceed it.
12. Approve **Trimble as the routing provider to validate first**, HERE as benchmark/fallback, with no purchase or integration yet.
13. Approve the required Trimble quote/licensing questions and representative route proof-of-concept gate before any later routing implementation.
14. Confirm whether the private beta remains private/owner-access on Sites or requires a different tester-access model during Phase 1B deployment planning.

## 12. Phase 1A closure

Phase 1A research and architecture documentation are complete. No authentication, database, household, synchronization, migration, routing provider, vendor account, API key or product feature was implemented. No deployment was performed. Phase 1B remains blocked by product-owner approval of the decisions above.

---

# Post-V1 Backlog

These ideas remain preserved. They are not rejected; they are outside V1 unless explicitly promoted later.

## Trip and itinerary depth

- Full day-by-day itinerary generation and advanced activity scheduling.
- Route optimization, drag-to-reorder, and return-to-home automation.
- Rich cost rollups and deeper reservation/event orchestration.
- Trip sharing and collaborative planning.
- Notifications and proactive trip alerts.
- Long-term preference/history learning and travel-history novelty.

## Booking and commerce

- RoamPilot-managed reservation payments or in-app checkout.
- Stored payment methods and reservation modification/cancellation.
- Implemented subscription, affiliate, referral, or partnership monetization.

## Provider and network expansion

- Additional private campground partnerships.
- Licensed Harvest Hosts or other membership-network integrations.
- Broader regional tourism/event feeds.
- Expanded fuel-price and reservation-inventory coverage.
- Campground operator and partner tools.

## Advanced AI

- Proactive/autonomous travel-agent behavior.
- Automatic itinerary monitoring and replanning.
- Advanced behavioral personalization.
- AI-generated daily schedules.
- Voice-first Ask RoamPilot.

## Advanced Road Mode and platform maturity

- Full offline Road Mode and offline maps/data.
- Automatic rerouting around closures, hazards, or weather.
- Advanced fuel-stop optimization and roadside-assistance workflows.
- Public launch, native apps if justified, experimentation/analytics, operator portals, and international support.

---

# Open Decisions

1. Final product spelling: “RoamPilot” or “Roam Pilot.”
2. Timing and provider choice for the deferred production email infrastructure.
3. Timing for Apple Developer enrollment and Apple authentication activation.
4. Production RV-aware routing provider and its verified coverage.
5. Campground/provider set for V1 and commercial/licensing terms for each.
6. Data-freshness windows and downgrade rules by field type.
7. Which rig fields require owner verification and the exact verification UX.
8. Starlink assessment methodology and acceptable confidence thresholds.
9. Road Mode service providers and minimum geographic coverage.
10. Trip Readiness rules and which conditions are blocking versus advisory.
11. Private-beta cohort size, eligibility, support model, and success criteria.
12. Private-beta AI retention, evaluation, and customer-data policies.
13. Business model and premium-data partnerships.

---

# Change Log

## August 22, 2026 — Phase 1B validation-stage gate

- Approved Google-only authentication for internal and close-circle product validation.
- Preserved Apple and six-digit email OTP as long-term V1 requirements while deferring their production dependencies.
- Explicitly prohibited purchasing or configuring a permanent domain or paid email provider during this validation stage.
- Implemented the dedicated Supabase account, household, RLS, cloud-rig, saved-trip, migration, export, deletion-request, and synchronization foundation.
- Restricted the validation UI to Google sign-in and clearly labeled the deferred authentication paths.
- Preserved the separate routing gate and made no RV-safe routing claim or provider integration.
- Updated Current Build to reflect the Phase 1B production candidate; deployment and production validation remain part of the active gate.

## August 20, 2026 — Phase 1A research and architecture completed

- Reconciled production to Sites version 5 at Git commit `e61a8af`; confirmed version 4 at `bad4f9e` is the prior deployment.
- Compared Trimble, HERE, TomTom and PTV for RV-aware routing and recommended Trimble for a future commercial/technical validation, with HERE as benchmark/fallback.
- Compared Supabase, Firebase, Clerk and Auth0 and recommended Supabase Auth plus managed Postgres, subject to product-owner approval.
- Recommended passwordless email OTP with production transactional SMTP.
- Proposed the canonical household, garage, trip, routing, provenance, feedback and lifecycle data model.
- Recommended multi-household schema support and Owner/Admin/Member household roles.
- Defined the local-data migration design, privacy/security/retention baseline, backup/recovery posture and support-access rules.
- Added private-beta and early-growth cost estimates, risks, alternatives and the explicit approval register.
- Per Phase 1A scope, made no application-code, deployment, cloud-resource, authentication, database, migration or routing-provider changes.

## August 20, 2026 — Phase 1 split into 1A and 1B

- Split the oversized Phase 1 into Phase 1A Foundation Decisions and Architecture and Phase 1B Accounts and Cloud Foundation.
- Restricted Phase 1A to baseline reconciliation, vendor/platform research, cost analysis, canonical architecture, migration design, and privacy/security decisions.
- Explicitly prohibited authentication, database, household, synchronization, migration, and new routing-provider implementation during Phase 1A.
- Confirmed that Codex recommends major vendors but the product owner makes the selection.
- Added expected private-beta and early-growth infrastructure/API cost analysis to Phase 1A.
- Established a mandatory review-and-approval stop between Phase 1A and Phase 1B.
- Moved account, household, cloud persistence, synchronization, migration, account lifecycle, testing, and deployment implementation into Phase 1B.
- Retained the mandatory development gate and explicit stop before Phase 2.
- Made no application-code, deployment, research, vendor, configuration, or Git-history changes.

## August 20, 2026 — Phase 1 approval additions and development gate

- Approved the V1 phase structure without authorizing implementation.
- Added production-baseline reconciliation to Phase 1, including resolution of version 4/`bad4f9e` versus version 5/`e61a8af`.
- Added production RV-aware routing provider research and recommendation to Phase 1, explicitly excluding provider integration.
- Established the mandatory phase gate: implement, automated validation, deploy, production test, product review, fix, update the Master Product Spec, commit/push, then explicitly approve the next phase.
- Added a detailed Phase 1 plan with workstreams, acceptance criteria, approval decisions, scope boundaries, and closure requirements.
- Explicitly prohibited automatic progression from Phase 1 to Phase 2.
- Made no application-code, deployment, provider, configuration, or Git-history changes.

## August 20, 2026 — V1 Private Beta direction

- Defined the V1 Private Beta release and product principles.
- Added Google, Apple, and email authentication.
- Added private cloud storage, cross-device sync, households, multiple users, and multiple rigs.
- Expanded garage, owner verification, maintenance, readiness, and checklist requirements.
- Required complete-area discovery, curated recommendations, and View All Campgrounds.
- Added campground intelligence, Starlink/connectivity assessment, external booking handoff, and incorrect-data reporting.
- Added RV-aware routing foundations, route-aware Road Mode, and boondocking resource planning.
- Added basic Ask RoamPilot with explicit safety restrictions.
- Established Verified, Reported, Estimated, and Unknown as the product-wide confidence model.
- Organized V1 into dependency-ordered phases 0 through 7.
- Preserved additional ideas in the post-V1 backlog.
- Made no application-code, configuration, deployment, or Git-history changes.

## August 20, 2026 — Initial master specification

- Established this document as the intended living source of truth.
- Captured the comprehensive Current Build baseline.
- Added reserved sections for forthcoming approved product direction and requirements.
- Made no application-code, configuration, deployment, or Git-history changes.
