const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getToken(): string | null {
  return localStorage.getItem('token');
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface LoginResponse {
  access_token: string;
  role: string;
  user_id: string;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Login failed');
  }
  return res.json();
}

export async function uploadBaseline(shelfId: string, image: File): Promise<unknown> {
  const form = new FormData();
  form.append('shelf_id', shelfId);
  form.append('image', image);
  const res = await fetch(`${API_URL}/baseline`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Baseline upload failed');
  }
  return res.json();
}

export async function analyzeShelf(shelfId: string, image: File): Promise<unknown> {
  const form = new FormData();
  form.append('shelf_id', shelfId);
  form.append('image', image);
  const res = await fetch(`${API_URL}/analyze`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Analysis failed');
  }
  return res.json();
}

export async function getHistory(params?: {
  shelf_id?: string;
  limit?: number;
  page?: number;
}): Promise<unknown> {
  const query = new URLSearchParams();
  if (params?.shelf_id) query.set('shelf_id', params.shelf_id);
  if (params?.limit != null) query.set('limit', String(params.limit));
  if (params?.page != null) query.set('page', String(params.page));
  const res = await fetch(`${API_URL}/history?${query}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch history');
  }
  return res.json();
}
