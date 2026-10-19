import test from "node:test";
import assert from "node:assert/strict";
import { isForbiddenRequestBodyKey } from "../../src/lib/db/models/compat.ts";

function mergeCustomRequestBodyAttributes(
  targetBody: Record<string, unknown>,
  customAttrs: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!customAttrs || typeof customAttrs !== "object") return targetBody;
  for (const [key, value] of Object.entries(customAttrs)) {
    if (!isForbiddenRequestBodyKey(key)) {
      targetBody[key] = value;
    }
  }
  return targetBody;
}

test("mergeCustomRequestBodyAttributes merges valid attributes and ignores forbidden keys", () => {
  const body: Record<string, unknown> = {
    model: "gpt-4o",
    messages: [{ role: "user", content: "hello" }],
    stream: true,
  };

  const customAttrs = {
    temperature: 0.2,
    top_p: 0.95,
    thinking: { budget_tokens: 2000 },
    model: "hacked-model",
    messages: [],
    stream: false,
    _internalFlag: "drop-me",
  };

  mergeCustomRequestBodyAttributes(body, customAttrs);

  assert.equal(body.model, "gpt-4o");
  assert.equal(Array.isArray(body.messages) && body.messages.length, 1);
  assert.equal(body.stream, true);
  assert.equal(body.temperature, 0.2);
  assert.equal(body.top_p, 0.95);
  assert.deepEqual(body.thinking, { budget_tokens: 2000 });
  assert.equal("_internalFlag" in body, false);
});
