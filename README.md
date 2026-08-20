# RoamPilot RV

RoamPilot RV is a mobile-first trip discovery prototype for RV travelers who know *when* they can travel, but not necessarily *where* to go. Instead of presenting a wall of campground pins, the app ranks complete trip ideas against a rig profile, drive-time tolerance, interests, camping style, cost, and other planning signals.

## What works today

- Five primary product areas: Home, Discover, Road Mode, Saved Trips, and My Rig
- Interactive discovery inputs for dates, travel party, drive tolerance, camping style, and interests
- Deterministic trip ranking with an inspectable score breakdown
- Five ranked complete-trip recommendations from seeded regional data
- Destination detail with route notes, rig-fit campground options, activities, mock events, and cost breakdown
- Local saved-trip persistence
- Editable RV and tow-vehicle garage with local persistence
- Road Mode time filtering for seeded stops ahead of the traveler
- Responsive mobile-first layouts and installable-web-app manifest

## Architecture

The app uses React 19, TypeScript, Tailwind's CSS pipeline, and the vinext/Cloudflare Sites-compatible application router. The first version intentionally keeps state device-local.

```text
app/                    Product UI, metadata, and responsive styling
lib/types.ts            Domain models
lib/seed.ts             Seeded rig, destinations, and road stops
lib/recommendations.ts  Pure scoring and ranking logic
lib/storage.ts          Browser-local persistence adapter
worker/                 Cloudflare-compatible application entry
.openai/hosting.json    Hosted resource declarations
```

The recommendation engine is separate from rendering. Its initial weights are:

| Signal | Weight |
| --- | ---: |
| Campground / rig fit | 25% |
| Drive-time fit | 20% |
| Weather | 15% |
| Activities / events | 15% |
| Price | 10% |
| Preferences | 10% |
| Novelty | 5% |

Safety and feasibility must remain deterministic. Future conversational explanations should summarize structured results; they should not override vehicle dimensions, site limits, routing restrictions, closures, or alerts.

## Local setup

Requirements: Node.js 22.13 or newer and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Additional checks:

```bash
npm run lint
npm run typecheck
npm run build
```

Copy `.env.example` to `.env.local` only when configuring future integrations. Real environment files and credentials are ignored by Git.

## Mock-data limitations

This version is a functional front-end prototype, not a live travel-safety system. Destination distance and drive time, road-stop direction, campground details, site compatibility, weather, events, fuel price, trip costs, and availability are seeded planning values. The UI labels them accordingly. Do not use these values for navigation or safety decisions.

The profile and saved trips are stored only in the current browser. Clearing browser storage removes them, and they do not sync between devices.

## Integration path

The seed module can be replaced by adapters without changing the scoring or UI contracts. Intended integrations include:

- Google Maps Routes/Places or an equivalent routing and POI provider
- Recreation.gov RIDB for federal recreation data
- NOAA/NWS for forecasts and alerts
- Licensed private-campground and availability partners
- Ticketmaster and regional tourism sources for events
- Fuel-price data providers
- Authentication plus a durable profile/saved-trip store

No proprietary campground network should be scraped. Provider data should be used only through permitted APIs, feeds, or partnerships.

## Deployment

The production build emits a Cloudflare Worker-compatible application. The repository includes the Sites hosting declaration and can be deployed through OpenAI Sites after a successful build. No API keys are required for the current mock-data version. Hosted environment values should be configured through the deployment platform rather than committed.

## Product next steps

1. Add live RV-aware routing and restriction validation.
2. Normalize campground/site records from permitted providers.
3. Add live weather, alert, event, fuel, and availability adapters.
4. Introduce authenticated cloud sync while keeping local-first resilience.
5. Add end-to-end interaction and accessibility testing across target mobile devices.
