/**
 * Model compatibility protocol keys — shared between client UI and server.
 * Must not import Node or DB code so client components can import safely.
 */

/** Client request shapes from detectFormat — compat options apply when the client uses this protocol */
export const MODEL_COMPAT_PROTOCOL_KEYS = ["openai", "openai-responses", "claude"] as const;

export type ModelCompatProtocolKey = (typeof MODEL_COMPAT_PROTOCOL_KEYS)[number];

export const FORBIDDEN_REQUEST_BODY_KEYS = new Set(["model", "messages", "stream"]);

export function isForbiddenRequestBodyKey(key: string): boolean {
  if (!key || typeof key !== "string") return true;
  const lower = key.trim().toLowerCase();
  if (FORBIDDEN_REQUEST_BODY_KEYS.has(lower)) return true;
  if (lower.startsWith("_")) return true;
  return false;
}

export function validateAndSanitizeCustomRequestBody(
  raw: unknown
): { valid: true; data: Record<string, unknown> } | { valid: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { valid: false, error: "Must be a JSON object" };
  }
  const entries = Object.entries(raw as Record<string, unknown>);
  const forbidden: string[] = [];
  const sanitized: Record<string, unknown> = {};

  for (const [k, v] of entries) {
    if (isForbiddenRequestBodyKey(k)) {
      forbidden.push(k);
    } else {
      sanitized[k] = v;
    }
  }

  if (forbidden.length > 0) {
    return {
      valid: false,
      error: `Keys cannot be overwritten: ${forbidden.join(", ")}`,
    };
  }

  return { valid: true, data: sanitized };
}
