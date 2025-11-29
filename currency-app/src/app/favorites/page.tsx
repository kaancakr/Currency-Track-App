'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, type Favorite, type Rate } from '@/lib/api-client';
import { FavoritesTable } from '@/components/FavoritesTable';
import { RatesTable } from '@/components/RatesTable';
import { RefreshCw, Star } from 'lucide-react';

const normalizeCurrency = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3);

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [formBase, setFormBase] = useState('USD');
  const [formQuote, setFormQuote] = useState('EUR');

  // In a real app, get userId from auth context/session
  useEffect(() => {
    // For demo purposes, using user ID 1
    // In production, get from auth context
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(parseInt(storedUserId, 10));
    } else {
      // Default to user 1 for demo
      setUserId(1);
    }
  }, []);

  const loadFavorites = useCallback(async () => {
    if (!userId) return;
    try {
      setIsLoading(true);
      const { data } = await api.users.favorites.get(userId);
      setFavorites(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load favorites');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const loadRates = useCallback(async () => {
    if (!userId) return;
    try {
      const { data } = await api.users.rates.get(userId, undefined, true);
      setRates(data);
    } catch (err) {
      console.error('Failed to load rates:', err);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      void loadFavorites();
      void loadRates();
    }
  }, [userId, loadFavorites, loadRates]);

  const handleAddFavorite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) {
      setError('Please log in to add favorites');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { data } = await api.users.favorites.add(userId, formBase, formQuote);
      setFavorites([data, ...favorites]);
      setFormQuote('');
      await loadRates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add favorite');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveFavorite = async (item: Favorite) => {
    if (!userId) return;
    setError(null);
    try {
      await api.users.favorites.remove(userId, item.id);
      setFavorites(favorites.filter((fav) => fav.id !== item.id));
      await loadRates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove favorite');
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-8">
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-10">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
            <p className="text-white/70">Please log in to view your favorites</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-8">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-4">
          <p className="text-sm uppercase tracking-[0.3em] text-white/70">User Favorites</p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                My Favorites
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-white/70 sm:text-base">
                Manage your favorite currency pairs and view their current rates.
              </p>
            </div>
            <button
              className="flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/20"
              onClick={() => {
                void loadFavorites();
                void loadRates();
              }}
              disabled={isLoading}
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1fr,400px]">
          <div className="flex flex-col gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-900/40 backdrop-blur">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">Favorite Pairs</h2>
                  <p className="text-sm text-white/60">
                    {favorites.length} {favorites.length === 1 ? 'favorite' : 'favorites'}
                  </p>
                </div>
              </div>

              <FavoritesTable
                data={favorites}
                onRemove={handleRemoveFavorite}
                isLoading={isLoading}
              />
            </div>

            {rates.length > 0 && (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-900/40 backdrop-blur">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold">Favorite Rates</h2>
                    <p className="text-sm text-white/60">Current rates for your favorites</p>
                  </div>
                </div>

                <RatesTable data={rates} />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <form
              onSubmit={handleAddFavorite}
              className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/0 p-6 backdrop-blur"
            >
              <div className="flex items-center gap-2 mb-4">
                <Star size={20} />
                <h3 className="text-lg font-semibold">Add Favorite</h3>
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
                {isSubmitting ? 'Adding...' : 'Add Favorite'}
              </button>
            </form>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}

