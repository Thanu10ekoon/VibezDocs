import test from "node:test";
import assert from "node:assert/strict";
import { LineDiffEngine } from "../infrastructure/LineDiffEngine";

test("LineDiffEngine detects added and removed lines", () => {
  const engine = new LineDiffEngine();
  const chunks = engine.diff("const a = 1;\nconst b = 2;", "const a = 1;\nconst c = 3;");

  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].type, "removed");
  assert.match(chunks[0].text, /const b = 2;/);
  assert.equal(chunks[1].type, "added");
  assert.match(chunks[1].text, /const c = 3;/);
});

test("LineDiffEngine ignores whitespace-only line changes", () => {
  const engine = new LineDiffEngine();
  const chunks = engine.diff("const value = 1;", "  const value = 1;  ");

  assert.equal(chunks.length, 0);
});
