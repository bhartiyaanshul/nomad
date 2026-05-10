// Ollama client. Schema-constrained JSON output via the `format` field.
// 60s timeout, one retry on JSON.parse failure (smaller models occasionally
// emit a stray non-JSON token), structured errors so the API route can
// return a friendly message.

const DEFAULT_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const DEFAULT_MODEL = process.env.OLLAMA_MODEL ?? "qwen3.5";

export class OllamaError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "OllamaError";
  }
}

export class OllamaUnavailableError extends OllamaError {
  constructor(cause?: unknown) {
    super(
      "Ollama isn't reachable. Start it with `ollama serve` and run `ollama pull qwen3.5`.",
      cause,
    );
    this.name = "OllamaUnavailableError";
  }
}

export interface GenerateArgs<T> {
  /** System prompt */
  system: string;
  /** User prompt with template variables already substituted */
  user: string;
  /**
   * JSON Schema (draft-07 subset) passed to Ollama's `format` field.
   * The model is constrained to emit JSON matching this shape.
   */
  schema: Record<string, unknown>;
  /** Sampling temperature; default 0.7 */
  temperature?: number;
  /** Override OLLAMA_MODEL env */
  model?: string;
  /** Override OLLAMA_BASE_URL env */
  baseUrl?: string;
  /** Override default 60s timeout */
  timeoutMs?: number;
  /** Validate the parsed JSON; if it throws, we retry once */
  validate?: (raw: unknown) => T;
}

export async function generate<T = unknown>(args: GenerateArgs<T>): Promise<T> {
  const baseUrl = (args.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = args.model ?? DEFAULT_MODEL;
  const timeoutMs = args.timeoutMs ?? 60_000;
  const temperature = args.temperature ?? 0.7;

  const body = {
    model,
    stream: false,
    format: args.schema,
    options: { temperature },
    messages: [
      { role: "system", content: args.system },
      { role: "user", content: args.user },
    ],
  };

  const attempt = async (): Promise<T> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new OllamaError(
          `Ollama returned ${res.status}: ${text.slice(0, 200) || res.statusText}`,
        );
      }

      const json = (await res.json()) as { message?: { content?: string } };
      const content = json?.message?.content?.trim();
      if (!content) {
        throw new OllamaError("Ollama returned an empty response");
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch (err) {
        throw new OllamaError(`Could not parse Ollama JSON: ${stripJSON(content)}`, err);
      }

      if (args.validate) return args.validate(parsed);
      return parsed as T;
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    return await attempt();
  } catch (err) {
    if (isFetchAbort(err)) {
      throw new OllamaError("Ollama request timed out", err);
    }
    if (isFetchNetwork(err)) {
      throw new OllamaUnavailableError(err);
    }
    if (err instanceof OllamaError) {
      // One retry on parse / validation failure.
      try {
        return await attempt();
      } catch (err2) {
        if (isFetchNetwork(err2)) throw new OllamaUnavailableError(err2);
        throw err2 instanceof OllamaError
          ? err2
          : new OllamaError("Ollama call failed after retry", err2);
      }
    }
    throw err;
  }
}

function isFetchAbort(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === "object" &&
      "name" in err &&
      (err as { name: string }).name === "AbortError",
  );
}

function isFetchNetwork(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { cause?: { code?: string }; code?: string; message?: string };
  const code = e.cause?.code ?? e.code ?? "";
  return (
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "EHOSTUNREACH" ||
    /fetch failed/i.test(e.message ?? "")
  );
}

function stripJSON(text: string): string {
  return text.length > 200 ? `${text.slice(0, 200)}…` : text;
}

export async function ollamaHealth(
  baseUrl?: string,
): Promise<{ ok: boolean; model?: string; error?: string }> {
  const url = (baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2_000);
    const res = await fetch(`${url}/api/tags`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const json = (await res.json()) as {
      models?: Array<{ name?: string }>;
    };
    const has = json.models?.some(
      (m) => m.name === DEFAULT_MODEL || m.name?.startsWith(`${DEFAULT_MODEL}:`),
    );
    return { ok: Boolean(has), model: DEFAULT_MODEL };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unreachable",
    };
  }
}
