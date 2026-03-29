import test from "node:test";
import assert from "node:assert/strict";
import { DocMarkdownGenerator } from "../application/DocMarkdownGenerator";

const now = "2026-03-29T00:00:00.000Z";

test("DocMarkdownGenerator initializes expected sections", () => {
  const generator = new DocMarkdownGenerator();
  const initial = generator.initial();

  assert.match(initial, /# VibezDocs/);
  assert.match(initial, /## Architecture/);
  assert.match(initial, /## C4 Diagram \(Mermaid format\)/);
});

test("DocMarkdownGenerator merges incrementally without duplicates", () => {
  const generator = new DocMarkdownGenerator();
  const base = generator.initial();

  const once = generator.merge(base, {
    architecture: ["backend api activity detected in src/api/users.ts"],
    apis: ["- API change in src/api/users.ts: router.get(\"/users\", listUsers)"],
    components: [],
    database: [],
    pages: [],
    timeline: [{ timestamp: now, file: "src/api/users.ts", action: "Updated", feature: "api" }],
    llmSummary: "- Added users API endpoint",
  });

  const twice = generator.merge(once, {
    architecture: ["backend api activity detected in src/api/users.ts"],
    apis: ["- API change in src/api/users.ts: router.get(\"/users\", listUsers)"],
    components: [],
    database: [],
    pages: [],
    timeline: [{ timestamp: now, file: "src/api/users.ts", action: "Updated", feature: "api" }],
    llmSummary: "- Added users API endpoint",
  });

  const occurrences = (twice.match(/Added users API endpoint/g) || []).length;
  assert.equal(occurrences, 1);
});

test("DocMarkdownGenerator normalizes verbose multiline LLM architecture summaries", () => {
  const generator = new DocMarkdownGenerator();
  const base = generator.initial();

  const merged = generator.merge(base, {
    architecture: ["backend api activity detected in backend/server.js"],
    apis: [],
    components: [],
    database: [],
    pages: [],
    timeline: [{ timestamp: now, file: "backend/server.js", action: "Updated", feature: "api" }],
    llmSummary: [
      "Here are 2 concise bullets summarizing the development change:",
      "",
      "* **Backend auth routes added**: Added signup/login handlers and basic status endpoint.",
      "* **Database bootstrap**: Added mysql pool setup and schema initialization script for local setup.",
    ].join("\n"),
  });

  assert.doesNotMatch(merged, /Here are 2 concise bullets/i);
  assert.match(merged, /Backend auth routes added: Added signup\/login handlers and basic status endpoint\./);
  assert.match(merged, /Database bootstrap: Added mysql pool setup and schema initialization script for local setup\./);
});

test("DocMarkdownGenerator removes placeholder from populated sections", () => {
  const generator = new DocMarkdownGenerator();
  const base = generator.initial();

  const merged = generator.merge(base, {
    architecture: ["backend api activity detected in src/api/users.ts"],
    apis: ["- API change in src/api/users.ts: router.get('/users', listUsers)"],
    components: [],
    database: [],
    pages: [],
    timeline: [{ timestamp: now, file: "src/api/users.ts", action: "Updated", feature: "api" }],
    llmSummary: "",
  });

  assert.match(merged, /## Architecture\n- backend api activity detected in src\/api\/users.ts/);
  assert.match(merged, /## APIs\n- API change in src\/api\/users.ts: router.get\('\/users', listUsers\)/);
  assert.match(merged, /## Components\n- \(none yet\)/);
});
