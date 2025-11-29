'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, type Rate, type HealthResponse } from '@/lib/api-client';
import { RatesTable } from '@/components/RatesTable';
import { RefreshCw } from 'lucide-react';

const REFRESH_INTERVAL_MS = 15_000;

const formatTimestamp = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, { timeStyle: 'medium' }).format(new Date(value))
    : '—';

export default function Dashboard() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('loading');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const data = await api.health.get();
      setHealth(data);
    } catch (err) {
      console.error('Health check failed:', err);
    }
  }, []);

  const loadRates = useCallback(async () => {
    try {
      const { data } = await api.rates.get();
      setRates(data);
      setLastUpdated(new Date().toISOString());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rates');
      throw err;
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setStatus('loading');
    try {
      await Promise.all([loadRates(), fetchHealth()]);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
    }
  }, [loadRates, fetchHealth]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const interval = setInterval(() => {
      void loadRates();
      void fetchHealth();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadRates, fetchHealth]);

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
                Streaming live forex rates from the Flask + Redis backend. Monitor currency pairs
                and track market movements in real-time.
              </p>
            </div>
            <button
              className="flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/20"
              onClick={() => void refreshAll()}
              disabled={status === 'loading'}
            >
              <RefreshCw size={16} className={status === 'loading' ? 'animate-spin' : ''} />
              Refresh now
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Status"
            value={status === 'loading' ? 'Syncing' : 'Live'}
            subtitle={health?.status ?? '—'}
          />
          <StatCard
            title="Redis"
            value={health?.redis ? 'Connected' : 'Checking'}
            subtitle="Cache layer"
          />
          <StatCard title="Pairs" value={rates.length.toString()} subtitle="Active rates" />
          <StatCard
            title="Last Update"
            value={formatTimestamp(lastUpdated)}
            subtitle="Auto refresh every 15s"
          />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-900/40 backdrop-blur">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">Live Rates</h2>
              <p className="text-sm text-white/60">Quoted directly from your Flask API</p>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300">
              {rates.length} active pairs
            </span>
          </div>

          <RatesTable data={rates} isLoading={status === 'loading'} />

          {error && (
            <p className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          )}
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
