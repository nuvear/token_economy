// LLM provider adapters for insight runs (PRD §3 "AI-native Insights v1").
// Providers: anthropic, openai, gemini, grok, local_gemma — plus a
// deterministic offline 'mock' provider used whenever no API key is stored,
// so the app is fully functional offline.
// Keys live in provider_keys (admin-managed, obfuscated at rest, never
// returned to clients after save).
import type { Db } from "./db";

export type ProviderName =
  | "anthropic"
  | "openai"
  | "gemini"
  | "grok"
  | "local_gemma"
  | "mock";

export interface CompletionRequest {
  model: string;
  prompt: string;
}

export interface Provider {
  /** The provider actually used (mock when no key is configured). */
  name: ProviderName;
  complete(req: CompletionRequest): Promise<string>;
}

// ————— Key storage (pilot-grade obfuscation: XOR + base64, never plaintext at rest) —————

const KEY_SECRET = process.env.DEALSPINE_KEY_SECRET ?? "dealspine-pilot-key-secret";

export function encryptProviderKey(plain: string): string {
  const buf = Buffer.from(plain, "utf8");
  const sec = Buffer.from(KEY_SECRET, "utf8");
  const out = Buffer.from(buf.map((b, i) => b ^ sec[i % sec.length]));
  return "xor1:" + out.toString("base64");
}

export function decryptProviderKey(ciphertext: string): string {
  const b64 = ciphertext.startsWith("xor1:") ? ciphertext.slice(5) : ciphertext;
  const buf = Buffer.from(b64, "base64");
  const sec = Buffer.from(KEY_SECRET, "utf8");
  return Buffer.from(buf.map((b, i) => b ^ sec[i % sec.length])).toString("utf8");
}

export function getStoredKey(db: Db, provider: string): string | null {
  const row = db
    .prepare("SELECT key_ciphertext FROM provider_keys WHERE provider = ?")
    .get(provider) as { key_ciphertext: string | null } | undefined;
  if (!row?.key_ciphertext) return null;
  return decryptProviderKey(row.key_ciphertext);
}

// ————— Deterministic mock provider (offline default) —————

function extractSection(md: string, heading: RegExp): string | null {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => heading.test(l));
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^#{1,2} /.test(l));
  return rest.slice(0, end === -1 ? undefined : end).join("\n").trim();
}

/** Structured Markdown analysis computed deterministically from the packaged data. */
export function mockComplete(req: CompletionRequest): string {
  const { prompt } = req;
  // Count only gate-table status cells — "FAILED"/"hard failures" in the verdict
  // prose must not register as gate failures.
  const passCount = (prompt.match(/\| PASS \|/g) ?? []).length;
  const failCount = (prompt.match(/\| FAIL \|/g) ?? []).length;
  const warnCount = (prompt.match(/\| WARNING \|/g) ?? []).length;
  const headings = (prompt.match(/^#{1,2} .+$/gm) ?? []).map((h) => h.replace(/^#+ /, ""));
  const governance = extractSection(prompt, /^## Governance verdict/);
  const tables = (prompt.match(/^\| /gm) ?? []).length;

  const lines: string[] = [];
  lines.push("## Insight (offline deterministic analysis — mock provider)");
  lines.push("");
  lines.push("_No LLM API key is configured for this provider; this structured analysis is computed locally from the packaged data._");
  lines.push("");
  lines.push("### Packaged data profile");
  lines.push("");
  lines.push(`- Characters packaged: ${prompt.length.toLocaleString("en-US")}`);
  lines.push(`- Sections: ${headings.length}${headings.length ? " (" + headings.slice(0, 8).join(" · ") + ")" : ""}`);
  lines.push(`- Table rows: ${tables}`);
  if (passCount + failCount + warnCount > 0) {
    lines.push("");
    lines.push("### Gate signal");
    lines.push("");
    lines.push(`- PASS markers: ${passCount}`);
    lines.push(`- FAIL markers: ${failCount}`);
    lines.push(`- WARNING markers: ${warnCount}`);
  }
  if (governance) {
    lines.push("");
    lines.push("### Governance verdict (verbatim from record)");
    lines.push("");
    lines.push(governance);
  }
  lines.push("");
  lines.push("### Reading");
  lines.push("");
  if (failCount > 0) {
    lines.push("- The record carries hard failures: it cannot proceed without deal-desk action (re-scope, tier restructure, or an approved time-boxed exception).");
  } else if (warnCount > 0) {
    lines.push("- The record is economically viable but carries unresolved warnings; route to deal-desk review before customer commitment.");
  } else {
    lines.push("- No failing gate markers detected in the packaged data; the record reads as within policy.");
  }
  lines.push("- Re-run this insight with a configured provider key for a full narrative analysis.");
  lines.push("");
  return lines.join("\n");
}

// ————— Real adapters (used only when a key is stored; all speak fetch/JSON) —————

async function anthropicComplete(key: string, req: CompletionRequest): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: req.model,
      max_tokens: 2048,
      messages: [{ role: "user", content: req.prompt }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  return data.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n");
}

async function openaiStyleComplete(
  baseUrl: string,
  key: string,
  req: CompletionRequest,
  label: string,
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: req.model,
      messages: [{ role: "user", content: req.prompt }],
    }),
  });
  if (!res.ok) throw new Error(`${label} ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content ?? "";
}

async function geminiComplete(key: string, req: CompletionRequest): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(req.model)}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: req.prompt }] }] }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("\n");
}

async function localGemmaComplete(req: CompletionRequest): Promise<string> {
  // Local on-device model (ollama-compatible endpoint) — no key leaves the machine.
  const base = process.env.DEALSPINE_LOCAL_LLM_URL ?? "http://127.0.0.1:11434";
  const res = await fetch(`${base}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: req.model, prompt: req.prompt, stream: false }),
  });
  if (!res.ok) throw new Error(`local_gemma ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { response?: string };
  return data.response ?? "";
}

/**
 * Resolve the provider adapter for a button's declared provider.
 * Falls back to the deterministic mock provider when no key is stored
 * (local_gemma needs no key but falls back to mock unless explicitly enabled).
 */
export function getProvider(db: Db, declared: string): Provider {
  if (declared === "local_gemma") {
    if (process.env.DEALSPINE_LOCAL_LLM_URL) {
      return { name: "local_gemma", complete: (r) => localGemmaComplete(r) };
    }
    return { name: "mock", complete: async (r) => mockComplete(r) };
  }
  const key = getStoredKey(db, declared);
  if (!key) return { name: "mock", complete: async (r) => mockComplete(r) };
  switch (declared) {
    case "anthropic":
      return { name: "anthropic", complete: (r) => anthropicComplete(key, r) };
    case "openai":
      return { name: "openai", complete: (r) => openaiStyleComplete("https://api.openai.com/v1", key, r, "openai") };
    case "grok":
      return { name: "grok", complete: (r) => openaiStyleComplete("https://api.x.ai/v1", key, r, "grok") };
    case "gemini":
      return { name: "gemini", complete: (r) => geminiComplete(key, r) };
    default:
      return { name: "mock", complete: async (r) => mockComplete(r) };
  }
}
