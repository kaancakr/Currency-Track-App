'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { data } = await api.auth.login(email, password);
      // Store token and user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user.id.toString());
      localStorage.setItem('userName', data.user.name);
      // Redirect to dashboard
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-8 flex items-center justify-center">
      <main className="w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-900/40 backdrop-blur">
          <div className="flex items-center gap-3 mb-6">
            <LogIn size={24} />
            <h1 className="text-3xl font-semibold">Login</h1>
          </div>
          <p className="text-sm text-white/60 mb-6">
            Sign in to access your favorites and personalized features.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="text-xs uppercase tracking-[0.3em] text-white/60">
              Email
              <input
                type="email"
                className="mt-2 w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-white/60"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="text-xs uppercase tracking-[0.3em] text-white/60">
              Password
              <input
                type="password"
                className="mt-2 w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-white/60"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {error && (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-4 w-full rounded-2xl bg-white px-4 py-3 font-semibold text-slate-900 transition disabled:cursor-not-allowed disabled:bg-white/60"
            >
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/60">
            Don&apos;t have an account?{' '}
            <a href="/register" className="text-white hover:underline">
              Register
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

