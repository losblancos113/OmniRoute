import test from "node:test";
import assert from "node:assert/strict";
import {
  isForbiddenRequestBodyKey,
  validateAndSanitizeCustomRequestBody,
  deepMergeCompatByProtocol,
  type CompatByProtocolMap,
} from "../../src/lib/db/models/compat.ts";

test("isForbiddenRequestBodyKey correctly identifies forbidden keys", () => {
  assert.equal(isForbiddenRequestBodyKey("model"), true);
  assert.equal(isForbiddenRequestBodyKey("messages"), true);
  assert.equal(isForbiddenRequestBodyKey("stream"), true);
  assert.equal(isForbiddenRequestBodyKey("MODEL"), true);
  assert.equal(isForbiddenRequestBodyKey("_internal"), true);
  assert.equal(isForbiddenRequestBodyKey("_toolNameMap"), true);
  assert.equal(isForbiddenRequestBodyKey("temperature"), false);
  assert.equal(isForbiddenRequestBodyKey("thinking"), false);
  assert.equal(isForbiddenRequestBodyKey("max_tokens"), false);
});

test("validateAndSanitizeCustomRequestBody rejects non-objects and forbidden keys", () => {
  assert.equal(validateAndSanitizeCustomRequestBody(null).valid, false);
  assert.equal(validateAndSanitizeCustomRequestBody("string").valid, false);
  assert.equal(validateAndSanitizeCustomRequestBody([1, 2, 3]).valid, false);

  const forbiddenResult = validateAndSanitizeCustomRequestBody({
    temperature: 0.7,
    model: "evil-override",
  });
  assert.equal(forbiddenResult.valid, false);
  assert.match((forbiddenResult as { error: string }).error, /model/i);

  const internalResult = validateAndSanitizeCustomRequestBody({
    _hidden: true,
  });
  assert.equal(internalResult.valid, false);

  const validResult = validateAndSanitizeCustomRequestBody({
    temperature: 0.7,
    thinking: { type: "enabled", budget_tokens: 1024 },
  });
  assert.equal(validResult.valid, true);
  if (validResult.valid) {
    assert.deepEqual(validResult.data, {
      temperature: 0.7,
      thinking: { type: "enabled", budget_tokens: 1024 },
    });
  }
});

test("deepMergeCompatByProtocol persists and deletes customRequestBody correctly", () => {
  const initial: CompatByProtocolMap = {};
  const updated = deepMergeCompatByProtocol(initial, {
    openai: {
      customRequestBody: { temperature: 0.5 },
    },
  });
  assert.deepEqual(updated.openai?.customRequestBody, { temperature: 0.5 });

  const cleared = deepMergeCompatByProtocol(updated, {
    openai: {
      customRequestBody: {},
    },
  });
  assert.equal(cleared.openai?.customRequestBody, undefined);
});

test("getModelCustomRequestBody returns empty object when not found or missing provider/model", async () => {
  const { getModelCustomRequestBody } = await import("../../src/lib/db/models.ts");
  assert.deepEqual(getModelCustomRequestBody("", ""), {});
  assert.deepEqual(
    getModelCustomRequestBody("nonexistent-provider", "nonexistent-model", "openai"),
    {}
  );
});
