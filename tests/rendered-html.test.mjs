import assert from "node:assert/strict";
import test from "node:test";
import { recommendTrips } from "../lib/recommendations.ts";
import { defaultFilters, trips } from "../lib/seed.ts";

async function requestWorker(path = "/", init) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, init ?? { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

const render = () => requestWorker();

test("server-renders RoamPilot product shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>RoamPilot RV - Intelligent trip discovery<\/title>/i);
  assert.match(html, /Where are we/);
  assert.match(html, /Find My Next Trip/);
  assert.match(html, /Autumn Ridge/);
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
