import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import worker from "../worker/index.js";

test("serves existing static assets without a fallback", async () => {
  const calls = [];
  const response = await worker.fetch(new Request("https://example.test/assets/app.js"), {
    ASSETS: {
      fetch: async (request) => {
        calls.push(new URL(request.url).pathname);
        return new Response("asset", { status: 200 });
      },
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["/assets/app.js"]);
});

test("falls back to index.html for an unknown app route", async () => {
  const calls = [];
  const response = await worker.fetch(
    new Request("https://example.test/flow/step-two?source=share", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async (request) => {
          const url = new URL(request.url);
          calls.push(url.pathname + url.search);
          return new Response(url.pathname === "/index.html" ? "app" : "missing", {
            status: url.pathname === "/index.html" ? 200 : 404,
          });
        },
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["/flow/step-two?source=share", "/index.html"]);
});

test("does not turn API or write requests into the app shell", async () => {
  for (const request of [
    new Request("https://example.test/api/missing", { headers: { accept: "application/json" } }),
    new Request("https://example.test/flow", { method: "POST", headers: { accept: "text/html" } }),
  ]) {
    let calls = 0;
    const response = await worker.fetch(request, {
      ASSETS: {
        fetch: async () => {
          calls += 1;
          return new Response("missing", { status: 404 });
        },
      },
    });

    assert.equal(response.status, request.url.includes("/api/") ? 503 : 404);
    assert.equal(calls, request.url.includes("/api/") ? 0 : 1);
  }
});

test("emits the files required by Sites packaging", async () => {
  await access(new URL("../dist/client/index.html", import.meta.url));
  await access(new URL("../dist/server/index.js", import.meta.url));
  await access(new URL("../dist/.openai/hosting.json", import.meta.url));
  await access(new URL("../dist/.openai/drizzle/0000_init.sql", import.meta.url));
  await access(new URL("../dist/.openai/drizzle/0001_term_details.sql", import.meta.url));
  await access(new URL("../dist/.openai/drizzle/0002_plain_language_details.sql", import.meta.url));
});

test("plain-language migration only replaces untouched seed details", async () => {
  const migration = await readFile(new URL("../db/migrations/0002_plain_language_details.sql", import.meta.url), "utf8");
  const updates = migration.match(/^UPDATE terms /gm) || [];
  assert.equal(updates.length, 62);
  assert.equal((migration.match(/ AND details_json=/g) || []).length, 62);
});

test("all seeded terms include actionable implementation details", async () => {
  const catalog = JSON.parse(await readFile(new URL("../public/catalog-seed.json", import.meta.url), "utf8"));
  const terms = catalog.categories.flatMap(category => category.groups.flatMap(group => group.terms));
  assert.equal(terms.length, 62);
  for (const term of terms) {
    assert.ok(term.details.definition, term.name_zh);
    assert.ok(term.details.why_it_matters, term.name_zh);
    assert.ok(term.details.implementation_steps.length, term.name_zh);
    assert.ok(term.details.recommended_tools.length, term.name_zh);
    assert.ok(term.details.codex_task.includes("验收："), term.name_zh);
  }
});
