"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ApiEnvelope<T> = {
  data: T;
};

type HealthResponse = {
  status: string;
  redis: boolean;
};

type Rate = {
  pair: string;
  base: string;
  quote: string;
  rate: number;
  fetched_at: string;
};

type WatchlistItem = {
  id: number;
  base: string;
  quote: string;
  created_at: string;
};

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!RAW_API_BASE) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL is not defined in your .env.local file.");
}

const API_BASE = RAW_API_BASE.replace(/\/$/, "");
const REFRESH_INTERVAL_MS = 15_000;

const formatNumber = (value: number) =>
  new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value);

const formatTimestamp = (value: string | null) =>
  value ? new Intl.DateTimeFormat(undefined, { timeStyle: "medium" }).format(new Date(value)) : "—";

const normalizeCurrency = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 3);

async function toJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

export default function Home() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [formBase, setFormBase] = useState("USD");
  const [formQuote, setFormQuote] = useState("EUR");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchJson = useCallback(
    async <T,>(path: string, options?: RequestInit): Promise<T> => {
      const headers = new Headers(options?.headers);
      if (options?.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      const response = await fetch(`${API_BASE}${path}`, {
        cache: "no-store",
        ...options,
        headers,
      });

      if (!response.ok) {
        let message = response.statusText;
        try {
          const parsed = await toJson<{ message?: string }>(response.clone());
          if (parsed?.message) {
            message = parsed.message;
          }
        } catch {
          // ignore parsing issues
        }
        throw new Error(message || "Request failed");
      }

      try {
        return await toJson<T>(response);
      } catch {
        return {} as T;
      }
    },
    []
  );

  const loadWatchlist = useCallback(async () => {
    const { data } = await fetchJson<ApiEnvelope<WatchlistItem[]>>("/watchlist");
    setWatchlist(data);
    return data;
  }, [fetchJson]);

  const loadRates = useCallback(
    async (pairsOverride?: WatchlistItem[]) => {
      const source = pairsOverride ?? watchlist;
      const pairQuery = source.length
        ? `?pairs=${source.map((item) => `${item.base}:${item.quote}`).join(",")}`
        : "";
      const { data } = await fetchJson<ApiEnvelope<Rate[]>>(`/rates${pairQuery}`);
      setRates(data);
      setLastUpdated(new Date().toISOString());
    },
    [fetchJson, watchlist]
  );

  const fetchHealth = useCallback(async () => {
    const data = await fetchJson<HealthResponse>("/health");
    setHealth(data);
  }, [fetchJson]);

  const refreshAll = useCallback(async () => {
    setStatus("loading");
    try {
      const latestWatchlist = await loadWatchlist();
      await Promise.all([loadRates(latestWatchlist), fetchHealth()]);
      setError(null);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }, [fetchHealth, loadRates, loadWatchlist]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const interval = setInterval(() => {
      void loadRates();
      void fetchHealth();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchHealth, loadRates]);

  const handleAddPair = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = { base: formBase, quote: formQuote };
      const { data } = await fetchJson<ApiEnvelope<WatchlistItem>>("/watchlist", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const updatedList = [data, ...watchlist];
      setWatchlist(updatedList);
      await loadRates(updatedList);
      setFormQuote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add pair");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePair = async (item: WatchlistItem) => {
    setError(null);
    try {
      await fetchJson(`/watchlist/${item.id}`, { method: "DELETE" });
      const updated = watchlist.filter((pair) => pair.id !== item.id);
      setWatchlist(updated);
      await loadRates(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove pair");
    }
  };

  const watchlistSummary = useMemo(() => {
    if (!watchlist.length) {
      return "Using backend defaults";
    }
    return watchlist.map((pair) => `${pair.base}/${pair.quote}`).join(", ");
  }, [watchlist]);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-8">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-4">
          <p className="text-sm uppercase tracking-[0.3em] text-white/70">Live FX Monitor</p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Currency Tracking Dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-white/70 sm:text-base">
                Streaming live forex rates from the Flask + Redis backend. Manage your watchlist and keep
                teams aligned with the latest market moves.
              </p>
            </div>
            <button
              className="rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/20"
              onClick={() => void refreshAll()}
            >
              Refresh now
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Status" value={status === "loading" ? "Syncing" : "Live"} subtitle={health?.status ?? "—"} />
          <StatCard title="Redis" value={health?.redis ? "Connected" : "Checking"} subtitle="Cache layer" />
          <StatCard title="Pairs" value={watchlist.length.toString()} subtitle={watchlistSummary} />
          <StatCard title="Last Update" value={formatTimestamp(lastUpdated)} subtitle="Auto refresh every 15s" />
        </section>

        <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-900/40 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Live Rates</h2>
                <p className="text-sm text-white/60">Quoted directly from your Flask API</p>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300">
                {rates.length} active pairs
              </span>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
              <table className="min-w-full divide-y divide-white/5 text-sm">
                <thead className="bg-white/5 text-left uppercase tracking-[0.2em] text-white/60">
                  <tr>
                    <th className="px-4 py-3">Pair</th>
                    <th className="px-4 py-3">Rate</th>
                    <th className="px-4 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rates.map((rate) => (
                    <tr key={rate.pair} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-medium">{rate.base}/{rate.quote}</td>
                      <td className="px-4 py-3 font-mono text-lg">{formatNumber(rate.rate)}</td>
                      <td className="px-4 py-3 text-white/60">{formatTimestamp(rate.fetched_at)}</td>
                    </tr>
                  ))}
                  {!rates.length && (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-sm text-white/60">
                        {status === "loading" ? "Fetching rates..." : "No data yet"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {error && (
              <p className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <form
              onSubmit={handleAddPair}
              className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/0 p-6 backdrop-blur"
            >
              <h3 className="text-lg font-semibold">Add to watchlist</h3>
              <p className="text-sm text-white/60">Use ISO 4217 currency codes.</p>
              <div className="mt-4 flex flex-col gap-4">
                <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                  Base currency
                  <input
                    className="mt-2 w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-lg font-semibold uppercase tracking-[0.3em] outline-none transition focus:border-white/60"
                    value={formBase}
                    onChange={(event) => setFormBase(normalizeCurrency(event.target.value))}
                    maxLength={3}
                    required
                  />
                </label>
                <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                  Quote currency
                  <input
                    className="mt-2 w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-lg font-semibold uppercase tracking-[0.3em] outline-none transition focus:border-white/60"
                    value={formQuote}
                    onChange={(event) => setFormQuote(normalizeCurrency(event.target.value))}
                    maxLength={3}
                    required
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 w-full rounded-2xl bg-white px-4 py-3 font-semibold text-slate-900 transition disabled:cursor-not-allowed disabled:bg-white/60"
              >
                {isSubmitting ? "Adding..." : "Add Pair"}
              </button>
            </form>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Watchlist</h3>
                <span className="text-xs uppercase tracking-[0.3em] text-white/60">
                  {watchlist.length || "Empty"}
                </span>
              </div>
              <div className="mt-4 flex flex-col gap-3">
                {watchlist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div>
                      <p className="text-lg font-semibold">
                        {item.base}/{item.quote}
                      </p>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                        Added {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => void handleRemovePair(item)}
                      className="text-sm text-rose-300 transition hover:text-rose-200"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {!watchlist.length && (
                  <p className="rounded-2xl border border-dashed border-white/20 px-4 py-6 text-center text-sm text-white/60">
                    No custom pairs yet. Add your first above.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

type StatCardProps = {
  title: string;
  value: string;
  subtitle: string;
};

function StatCard({ title, value, subtitle }: StatCardProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 shadow shadow-slate-900/40">
      <p className="text-xs uppercase tracking-[0.3em] text-white/60">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="text-xs text-white/60">{subtitle}</p>
    </div>
  );
}
