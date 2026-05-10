"use client";

import useSWR from "swr";
import { AlertCircle } from "lucide-react";

interface OllamaStatus {
  ok: boolean;
  model?: string;
  error?: string;
}

const fetcher = (url: string): Promise<OllamaStatus> =>
  fetch(url).then((r) => r.json());

export function AIStatusBanner() {
  const { data } = useSWR<OllamaStatus>("/api/ai/health", fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
  });

  if (!data || data.ok) return null;

  return (
    <div className="border-amber-500/30 bg-amber-50 text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200 mb-6 flex items-start gap-3 rounded-md border px-4 py-3 text-sm">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-medium">AI generation is offline.</p>
        <p className="mt-0.5 text-xs leading-relaxed opacity-90">
          Start Ollama with{" "}
          <code className="bg-amber-500/15 rounded px-1 py-0.5 font-mono text-xs">
            ollama serve
          </code>{" "}
          and pull the model with{" "}
          <code className="bg-amber-500/15 rounded px-1 py-0.5 font-mono text-xs">
            ollama pull qwen3.5
          </code>
          . Manual planning still works without it.
        </p>
      </div>
    </div>
  );
}
