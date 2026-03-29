import test from "node:test";
import assert from "node:assert/strict";
import { LlmCallLimiter } from "../infrastructure/LlmCallLimiter";

test("LlmCallLimiter blocks after reaching max calls within one hour", () => {
  const limiter = new LlmCallLimiter();
  const now = Date.now();

  limiter.recordCall(now - 1000);
  limiter.recordCall(now - 500);

  assert.equal(limiter.canCall(2, now), false);
  assert.equal(limiter.canCall(3, now), true);
});

test("LlmCallLimiter prunes calls older than one hour", () => {
  const limiter = new LlmCallLimiter();
  const now = Date.now();

  limiter.recordCall(now - 61 * 60 * 1000);
  limiter.recordCall(now - 1000);

  assert.equal(limiter.canCall(2, now), true);
});
