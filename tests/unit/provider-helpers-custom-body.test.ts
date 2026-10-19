import test from "node:test";
import assert from "node:assert/strict";
import { effectiveCustomRequestBodyForProtocol } from "../../src/app/(dashboard)/dashboard/providers/[id]/providerPageHelpers.ts";

test("effectiveCustomRequestBodyForProtocol resolves protocol-specific custom request body", () => {
  const customMap = new Map([
    [
      "custom-model",
      {
        id: "custom-model",
        compatByProtocol: {
          openai: { customRequestBody: { temperature: 0.8 } },
        },
      },
    ],
  ]);
  const overrideMap = new Map();

  const result = effectiveCustomRequestBodyForProtocol(
    "custom-model",
    "openai",
    customMap,
    overrideMap
  );
  assert.deepEqual(result, { temperature: 0.8 });

  const none = effectiveCustomRequestBodyForProtocol(
    "custom-model",
    "claude",
    customMap,
    overrideMap
  );
  assert.equal(none, undefined);
});
