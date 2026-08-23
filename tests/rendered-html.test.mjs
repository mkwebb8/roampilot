import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { recommendTrips } from "../lib/recommendations.ts";
import { defaultFilters, trips } from "../lib/seed.ts";
import { mergeProviderCandidates, qualifyRoutes } from "../lib/services/route-resilience.ts";

async function requestWorker(path = "/", init) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, init ?? { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

const render = () => requestWorker();

test("server-renders the private-beta account boundary", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>RoamPilot RV - Intelligent trip discovery<\/title>/i);
  assert.match(html, /Preparing your private garage/i);
  assert.match(html, /ROAMPILOT PRIVATE BETA/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("emits installable app metadata", async () => {
  const html = await (await render()).text();
  assert.match(html, /manifest\.webmanifest/);
  assert.match(html, /theme-color/);
});

test("returns every destination inside an eight-hour drive window", () => {
  const recommendations = recommendTrips(trips, { ...defaultFilters, maxDriveHours: 8 });

  assert.equal(recommendations.length, trips.length);
  assert.deepEqual(
    recommendations.map(({ score }) => score),
    recommendations.map(({ score }) => score).toSorted((a, b) => b - a),
  );
});

test("excludes destinations beyond a shorter drive window", () => {
  const maxDriveHours = 3;
  const recommendations = recommendTrips(trips, { ...defaultFilters, maxDriveHours });
  const recommendationIds = new Set(recommendations.map(({ id }) => id));

  assert.ok(recommendations.length < trips.length);
  assert.ok(recommendations.every(({ driveMinutes }) => driveMinutes <= maxDriveHours * 60 + 20));
  assert.ok(
    trips
      .filter(({ driveMinutes }) => driveMinutes > maxDriveHours * 60 + 20)
      .every(({ id }) => !recommendationIds.has(id)),
  );
});

test("cloud configuration never exposes a secret service key", async () => {
  const response = await requestWorker("/api/cloud-config");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.configured, false);
  assert.equal("serviceRoleKey" in payload, false);
  assert.equal("secretKey" in payload, false);
});

test("Phase 1B schema enables RLS on every customer-data table", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260822021041_phase_1b_accounts_cloud.sql", import.meta.url), "utf8");
  const customerTables = ["profiles", "households", "household_memberships", "rvs", "tow_vehicles", "rig_pairings", "trips", "trip_snapshots", "migration_receipts", "audit_events", "data_exports", "deletion_requests"];
  for (const table of customerTables) assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  assert.doesNotMatch(migration, /auth\.role\(\)/i);
});

test("validation-stage sign-in exposes Google while keeping deferred providers out of the UI", async () => {
  const gate = await readFile(new URL("../app/account-gate.tsx", import.meta.url), "utf8");
  assert.match(gate, /Continue with Google/);
  assert.match(gate, /Apple sign-in and email codes remain planned/);
  assert.doesNotMatch(gate, /Continue with Apple/);
  assert.doesNotMatch(gate, /Email me a code/);
});

test("OAuth callback performs exactly one explicit PKCE exchange", async () => {
  const callback = await readFile(new URL("../app/auth/callback/page.tsx", import.meta.url), "utf8");
  assert.match(callback, /exchangeCodeForSession\(code\)/);
  assert.match(callback, /detectSessionInUrl:\s*false/);
});

test("My Rig makes no RV-safe routing or browser-only persistence claim", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /RV-aware routing is not active yet/);
  assert.match(page, /synchronized across signed-in devices/);
  assert.doesNotMatch(page, /safer routing/);
  assert.doesNotMatch(page, /stored only in this browser/);
});

test("increasing the drive window can add discovered destinations", () => {
  const shortWindow = recommendTrips(trips, { ...defaultFilters, maxDriveHours: 3 });
  const longWindow = recommendTrips(trips, { ...defaultFilters, maxDriveHours: 8 });

  assert.ok(longWindow.length > shortWindow.length);
  assert.ok(shortWindow.every(({ id }) => longWindow.some((trip) => trip.id === id)));
});

test("discovery clearly labels curated fallback when provider keys are absent", async () => {
  const response = await requestWorker("/api/discover", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(defaultFilters),
  });
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.mode, "fallback");
  assert.match(data.message, /curated fallback/i);
  assert.deepEqual(data.providers.map(({ status }) => status), ["missing_key", "missing_key"]);
});

test("routing provider 502 falls back to a conservative estimate", async () => {
  const candidate = { id: "one", name: "Nearby Park", coordinates: { latitude: 38.2, longitude: -85.8 } };
  const results = await qualifyRoutes([candidate], "Home", { latitude: 38, longitude: -86 }, 240, async () => {
    throw new Error("OSRM returned 502");
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].routeSource, "estimated");
  assert.equal(results[0].route.source, "estimate");
  assert.match(results[0].routeError.message, /502/);
});

test("mixed routing responses retain both live and estimated destinations", async () => {
  const candidates = [
    { id: "live", name: "Live Park", coordinates: { latitude: 38.1, longitude: -85.9 } },
    { id: "estimated", name: "Estimated Park", coordinates: { latitude: 38.3, longitude: -85.7 } },
  ];
  const results = await qualifyRoutes(candidates, "Home", { latitude: 38, longitude: -86 }, 240, async (candidate) => {
    if (candidate.id === "estimated") throw new Error("Temporary failure");
    return { from: "Home", to: candidate.name, distanceMiles: 20, driveMinutes: 30, source: "live" };
  });

  assert.deepEqual(results.map(({ routeSource }) => routeSource), ["live", "estimated"]);
});

test("increasing drive time returns more NPS candidates when routes are estimated", async () => {
  const origin = { latitude: 38, longitude: -86 };
  const candidates = [
    { id: "near", name: "Near NPS", coordinates: { latitude: 38.2, longitude: -86 } },
    { id: "middle", name: "Middle NPS", coordinates: { latitude: 39.2, longitude: -86 } },
    { id: "far", name: "Far NPS", coordinates: { latitude: 40.5, longitude: -86 } },
  ];
  const unavailable = async () => { throw new Error("OSRM unavailable"); };
  const shortWindow = await qualifyRoutes(candidates, "Home", origin, 120, unavailable);
  const longWindow = await qualifyRoutes(candidates, "Home", origin, 480, unavailable);

  assert.ok(longWindow.length > shortWindow.length);
});

test("empty RIDB response does not remove NPS candidates", () => {
  const nps = [{ id: "nps-one", name: "NPS Park", coordinates: { latitude: 38, longitude: -85 } }];
  assert.deepEqual(mergeProviderCandidates(nps, []), nps);
});
