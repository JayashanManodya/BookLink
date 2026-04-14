import axios from 'axios';
import Constants from 'expo-constants';

function resolveBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (typeof hostUri === 'string' && hostUri.length > 0) {
    const host = hostUri.split(':')[0];
    if (host) return `http://${host}:5000`;
  }

  return 'http://localhost:5000';
}

const baseURL = resolveBaseUrl();

/** Shared client; attach Clerk token via {@link setAuthTokenProvider}. */
export const api = axios.create({ baseURL });

let authTokenProvider = async () => null;

/**
 * Called from navigation (after Clerk is ready) so all `api.*` requests send Bearer JWT.
 * @param {() => Promise<string | null | undefined>} getToken
 */
export function setAuthTokenProvider(getToken) {
  authTokenProvider = typeof getToken === 'function' ? getToken : async () => null;
}

api.interceptors.request.use(async (config) => {
  try {
    const token = await authTokenProvider();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.error('api auth interceptor:', err);
  }
  return config;
});

/** Separate axios instance with its own token getter (e.g. right after OAuth before global provider updates). */
export function createAuthAxios(getToken) {
  const instance = axios.create({ baseURL });
  instance.interceptors.request.use(async (config) => {
    try {
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.error('createAuthAxios interceptor:', err);
    }
    return config;
  });
  return instance;
}

/**
 * Human-readable message from failed `api` calls (uses server `error` when present).
 * @param {unknown} error
 * @param {string} [fallback]
 */
export function apiErrorMessage(error, fallback = 'Something went wrong') {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === 'object' && typeof data.error === 'string') {
      return data.error;
    }
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export default api;
