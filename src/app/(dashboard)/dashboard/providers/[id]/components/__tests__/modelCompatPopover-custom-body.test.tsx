// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent } from "@testing-library/react";
import ModelCompatPopover from "../ModelCompatPopover";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

let container: HTMLDivElement;
let root: Root;

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function openPopover() {
  const trigger = container.querySelector("button") as HTMLButtonElement;
  await act(async () => trigger.click());
  await flushEffects();
}

describe("ModelCompatPopover - Advanced Body (JSON)", () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({ ok: true, json: async () => ({}), text: async () => "" } as Response)
      )
    );
  });

  afterEach(() => {
    act(() => root.unmount());
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("loads existing customRequestBody and updates on blur with valid JSON", async () => {
    const onCompatPatch = vi.fn();

    act(() => {
      root.render(
        <ModelCompatPopover
          t={(key) => key}
          providerId="openai"
          modelId="gpt-4o"
          effectiveModelNormalize={() => false}
          effectiveModelPreserveDeveloper={() => true}
          getUpstreamHeadersRecord={() => ({})}
          getCustomRequestBodyRecord={(p) => (p === "openai" ? { temperature: 0.7 } : undefined)}
          onCompatPatch={onCompatPatch}
        />
      );
    });

    await openPopover();

    const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(textarea.value).toContain('"temperature": 0.7');

    // Type new valid JSON
    fireEvent.change(textarea, {
      target: { value: JSON.stringify({ temperature: 0.9, top_p: 0.95 }) },
    });

    // Blur triggers save
    fireEvent.blur(textarea);

    expect(onCompatPatch).toHaveBeenCalledWith("openai", {
      customRequestBody: { temperature: 0.9, top_p: 0.95 },
    });
  });

  it("displays inline error and does NOT patch when JSON is invalid", async () => {
    const onCompatPatch = vi.fn();

    act(() => {
      root.render(
        <ModelCompatPopover
          t={(key) => key}
          providerId="openai"
          modelId="gpt-4o"
          effectiveModelNormalize={() => false}
          effectiveModelPreserveDeveloper={() => true}
          getUpstreamHeadersRecord={() => ({})}
          getCustomRequestBodyRecord={() => undefined}
          onCompatPatch={onCompatPatch}
        />
      );
    });

    await openPopover();

    const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();

    fireEvent.change(textarea, { target: { value: "{ invalid_json: " } });
    fireEvent.blur(textarea);

    expect(onCompatPatch).not.toHaveBeenCalled();
    const alert = document.querySelector('[role="alert"]');
    expect(alert).toBeTruthy();
    expect(alert?.textContent).toContain("Invalid JSON format");
  });

  it("displays inline error and does NOT patch when forbidden keys are used", async () => {
    const onCompatPatch = vi.fn();

    act(() => {
      root.render(
        <ModelCompatPopover
          t={(key) => key}
          providerId="openai"
          modelId="gpt-4o"
          effectiveModelNormalize={() => false}
          effectiveModelPreserveDeveloper={() => true}
          getUpstreamHeadersRecord={() => ({})}
          getCustomRequestBodyRecord={() => undefined}
          onCompatPatch={onCompatPatch}
        />
      );
    });

    await openPopover();

    const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();

    fireEvent.change(textarea, {
      target: { value: JSON.stringify({ model: "overwrite", messages: [] }) },
    });
    fireEvent.blur(textarea);

    expect(onCompatPatch).not.toHaveBeenCalled();
    const alert = document.querySelector('[role="alert"]');
    expect(alert).toBeTruthy();
    expect(alert?.textContent).toContain("Keys cannot be overwritten: model, messages");
  });

  it("patches null when textarea is cleared on blur", async () => {
    const onCompatPatch = vi.fn();

    act(() => {
      root.render(
        <ModelCompatPopover
          t={(key) => key}
          providerId="openai"
          modelId="gpt-4o"
          effectiveModelNormalize={() => false}
          effectiveModelPreserveDeveloper={() => true}
          getUpstreamHeadersRecord={() => ({})}
          getCustomRequestBodyRecord={() => ({ temperature: 0.7 })}
          onCompatPatch={onCompatPatch}
        />
      );
    });

    await openPopover();

    const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();

    fireEvent.change(textarea, { target: { value: "   " } });
    fireEvent.blur(textarea);

    expect(onCompatPatch).toHaveBeenCalledWith("openai", {
      customRequestBody: null,
    });
  });
});
