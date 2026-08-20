import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

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
