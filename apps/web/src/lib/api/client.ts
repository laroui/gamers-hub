import axios, { type AxiosInstance, type AxiosError } from "axios";

// ── Token store (in-memory only — never localStorage) ─────────
let accessToken: string | null = null;

export const tokenStore = {
  get: () => accessToken,
  set: (token: string) => { accessToken = token; },
  clear: () => { accessToken = null; },
};

// ── Axios instance ────────────────────────────────────────────
export const api: AxiosInstance = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) ?? "/api/v1",
  withCredentials: true, // send httpOnly refresh token cookie
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// ── Request interceptor: attach access token ──────────────────
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: auto-refresh on 401 ─────────────────
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (token) => {
              originalRequest.headers!.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post<{ accessToken: string }>(
          "/api/v1/auth/refresh",
          {},
          { withCredentials: true },
        );

        tokenStore.set(data.accessToken);

        // Flush queued requests
        refreshQueue.forEach((q) => q.resolve(data.accessToken));
        refreshQueue = [];

        originalRequest.headers!.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        refreshQueue.forEach((q) => q.reject(refreshError));
        refreshQueue = [];
        tokenStore.clear();

        // Redirect to login
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
