import { useCallback, useMemo, useState, type FormEvent } from "react";
import {
  SAMPLE_LABELS,
  SAMPLE_ORDER,
  SAMPLE_PAYLOADS,
  type EmbeddedSampleKey,
} from "./embeddedExamples";
import { CopyableHash } from "./linkify";

export type SampleKey = EmbeddedSampleKey | "custom";

const LABELS: Record<SampleKey, string> = {
  ...SAMPLE_LABELS,
  custom: "Custom JSON (edited in textarea)",
};

type Props = {
  onSent: () => void | Promise<void>;
};

function normalizeJson(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s));
  } catch {
    return s.trim();
  }
}

type SuccessState = {
  step: string;
  cls: string;
  hash: string;
  ec: string;
};

export function SendEventPanel({ onSent }: Props) {
  const [sampleKey, setSampleKey] = useState<SampleKey>(SAMPLE_ORDER[0]);
  const [body, setBody] = useState(SAMPLE_PAYLOADS[SAMPLE_ORDER[0]]);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const previewLabel = useMemo(() => LABELS[sampleKey], [sampleKey]);

  const applySample = useCallback((key: EmbeddedSampleKey) => {
    setSampleKey(key);
    setBody(SAMPLE_PAYLOADS[key]);
    setErr(null);
    setSuccess(null);
  }, []);

  const chooseCustomMode = useCallback(() => {
    setSampleKey("custom");
    setErr(null);
    setSuccess(null);
  }, []);

  const onTextareaChange = useCallback((value: string) => {
    setBody(value);
    setErr(null);
    setSuccess(null);
    const n = normalizeJson(value);
    let matched: SampleKey = "custom";
    for (const k of SAMPLE_ORDER) {
      if (n === normalizeJson(SAMPLE_PAYLOADS[k])) {
        matched = k;
        break;
      }
    }
    setSampleKey(matched);
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSuccess(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(body) as Record<string, unknown>;
    } catch {
      setErr("Invalid JSON — fix the textarea or pick a sample again.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const text = await res.text();
      if (!res.ok) {
        setErr(text || `HTTP ${res.status}`);
        return;
      }
      let out: Record<string, unknown> = {};
      try {
        out = JSON.parse(text) as Record<string, unknown>;
      } catch {
        out = {};
      }
      const hash = typeof out.hash === "string" ? out.hash : "";
      const ec = out.eventCount;
      const cls = typeof out.classification === "string" ? out.classification : "";
      const step =
        typeof parsed.bizStep === "string" ? parsed.bizStep : "event";
      setSuccess({
        step,
        cls,
        hash,
        ec: String(ec ?? "—"),
      });
      await Promise.resolve(onSent());
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="border-b border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/50">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        1. Send EPCIS event
      </h2>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        Choose a construction-lifecycle sample or edit the JSON. After send, the graph and timeline
        refresh.
      </p>
      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
        Full EPCIS 2.0 field sets and CBV vocabulary are defined by GS1 — use the textarea to align
        payloads with your integration; you can cross-check event shapes against the official EPCIS
        spec when needed.
      </p>

      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100">
        <span className="font-semibold">Active payload:</span> {previewLabel}
      </div>

      <form onSubmit={submit} className="mt-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="epcis-sample"
            className="text-xs font-medium text-slate-600 dark:text-slate-400"
          >
            Sample
          </label>
          <select
            id="epcis-sample"
            className="max-w-[min(100%,28rem)] rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            value={sampleKey}
            onChange={(e) => {
              const v = e.target.value as SampleKey;
              if (v === "custom") {
                chooseCustomMode();
                return;
              }
              applySample(v);
            }}
          >
            {SAMPLE_ORDER.map((k) => (
              <option key={k} value={k}>
                {SAMPLE_LABELS[k]}
              </option>
            ))}
            <option value="custom">{LABELS.custom}</option>
          </select>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send event"}
          </button>
        </div>
        <textarea
          value={body}
          onChange={(e) => onTextareaChange(e.target.value)}
          spellCheck={false}
          aria-label="EPCIS JSON-LD body"
          className="h-44 w-full resize-y rounded-lg border border-slate-300 bg-white p-3 font-mono text-[11px] leading-relaxed text-slate-800 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
        />
        {err && (
          <p className="text-xs text-red-600 dark:text-red-400" role="alert">
            {err}
          </p>
        )}
        {success && (
          <div
            className="rounded-lg border border-emerald-300 bg-emerald-100/90 px-3 py-2 text-xs font-medium text-emerald-950 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100"
            role="status"
          >
            <span>
              Accepted · {success.step}
              {success.cls ? ` · ${success.cls}` : ""} · SHA-256:{" "}
              {success.hash ? (
                <CopyableHash
                  full={success.hash}
                  short={
                    success.hash.length > 14
                      ? `${success.hash.slice(0, 10)}…`
                      : success.hash
                  }
                  className="text-emerald-950 dark:text-emerald-100"
                />
              ) : (
                "—"
              )}{" "}
              · total events {success.ec}
            </span>
            <span className="mt-1 block font-normal text-emerald-800/90 dark:text-emerald-200/90">
              Graph and timeline should show the new step on the right (horizontal timeline).
            </span>
          </div>
        )}
      </form>
    </section>
  );
}
