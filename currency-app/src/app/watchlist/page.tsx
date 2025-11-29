'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, type WatchlistItem } from '@/lib/api-client';
import { WatchlistTable } from '@/components/WatchlistTable';
import { Plus, RefreshCw } from 'lucide-react';

const normalizeCurrency = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3);

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formBase, setFormBase] = useState('USD');
  const [formQuote, setFormQuote] = useState('EUR');

  const loadWatchlist = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data } = await api.watchlist.get();
      setWatchlist(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load watchlist');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWatchlist();
  }, [loadWatchlist]);

  const handleAddPair = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { data } = await api.watchlist.add(formBase, formQuote);
      setWatchlist([data, ...watchlist]);
      setFormQuote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add pair');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePair = async (item: WatchlistItem) => {
    setError(null);
    try {
      await api.watchlist.remove(item.id);
      setWatchlist(watchlist.filter((pair) => pair.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove pair');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-8">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-4">
          <p className="text-sm uppercase tracking-[0.3em] text-white/70">Currency Watchlist</p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Manage Watchlist
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-white/70 sm:text-base">
                Add currency pairs to track and monitor their exchange rates over time.
              </p>
            </div>
            <button
              className="flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/20"
              onClick={() => void loadWatchlist()}
              disabled={isLoading}
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1fr,400px]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-900/40 backdrop-blur">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">Watchlist Items</h2>
                <p className="text-sm text-white/60">
                  {watchlist.length} {watchlist.length === 1 ? 'pair' : 'pairs'} tracked
                </p>
              </div>
            </div>

            <WatchlistTable
              data={watchlist}
              onRemove={handleRemovePair}
              isLoading={isLoading}
            />

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
              <div className="flex items-center gap-2 mb-4">
                <Plus size={20} />
                <h3 className="text-lg font-semibold">Add to Watchlist</h3>
              </div>
              <p className="text-sm text-white/60 mb-4">Use ISO 4217 currency codes.</p>
              <div className="flex flex-col gap-4">
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
                {isSubmitting ? 'Adding...' : 'Add Pair'}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}

