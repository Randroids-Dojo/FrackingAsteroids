import { describe, it } from "node:test";
import assert from "node:assert/strict";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

describe("smoke tests", () => {
  it("serves the homepage", async () => {
    const res = await fetch(`${BASE_URL}/`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes("FrackingAsteroids"));
  });

  it("health endpoint returns ok", async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { status: string };
    assert.equal(body.status, "ok");
  });

  it("version endpoint returns version", async () => {
    const res = await fetch(`${BASE_URL}/api/version`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { version: string };
    assert.ok(typeof body.version === "string");
  });
});
