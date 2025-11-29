const API_BASE = '/api';

export type ApiResponse<T> = {
  data: T;
  message?: string;
};

export type Rate = {
  pair: string;
  base: string;
  quote: string;
  rate: number;
  fetched_at: string;
};

export type WatchlistItem = {
  id: number;
  base: string;
  quote: string;
  created_at: string;
};

export type User = {
  id: number;
  name: string;
  email: string;
  created_at: string;
};

export type Favorite = {
  id: number;
  base: string;
  quote: string;
  created_at: string;
};

export type HealthResponse = {
  status: string;
  redis: boolean;
};

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (options?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const parsed = await response.json();
      if (parsed?.message) {
        message = parsed.message;
      }
    } catch {
      // ignore parsing issues
    }
    throw new Error(message || 'Request failed');
  }

  return response.json();
}

export const api = {
  health: {
    get: () => fetchJson<HealthResponse>('/health'),
  },
  rates: {
    get: (pairs?: string) => {
      const query = pairs ? `?pairs=${encodeURIComponent(pairs)}` : '';
      return fetchJson<ApiResponse<Rate[]>>(`/rates${query}`);
    },
  },
  watchlist: {
    get: () => fetchJson<ApiResponse<WatchlistItem[]>>('/watchlist'),
    add: (base: string, quote: string) =>
      fetchJson<ApiResponse<WatchlistItem>>('/watchlist', {
        method: 'POST',
        body: JSON.stringify({ base, quote }),
      }),
    remove: (id: number) =>
      fetchJson<{ message: string }>(`/watchlist/${id}`, {
        method: 'DELETE',
      }),
  },
  auth: {
    login: (email: string, password: string) =>
      fetchJson<ApiResponse<{ token: string; user: User }>>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    logout: (token?: string) =>
      fetchJson<{ message: string }>('/auth/logout', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }),
  },
  users: {
    create: (name: string, email: string, password: string) =>
      fetchJson<ApiResponse<User>>('/users', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      }),
    get: (id: number) => fetchJson<ApiResponse<User>>(`/users/${id}`),
    favorites: {
      get: (userId: number) =>
        fetchJson<ApiResponse<Favorite[]>>(`/users/${userId}/favorites`),
      add: (userId: number, base: string, quote: string) =>
        fetchJson<ApiResponse<Favorite>>(`/users/${userId}/favorites`, {
          method: 'POST',
          body: JSON.stringify({ base, quote }),
        }),
      remove: (userId: number, favId: number) =>
        fetchJson<{ message: string }>(`/users/${userId}/favorites/${favId}`, {
          method: 'DELETE',
        }),
    },
    rates: {
      get: (userId: number, pairs?: Array<{ base: string; quote: string }>, useFavorites?: boolean) =>
        fetchJson<ApiResponse<Rate[]>>(`/users/${userId}/rates`, {
          method: 'POST',
          body: JSON.stringify({ pairs, use_favorites: useFavorites }),
        }),
    },
  },
};

