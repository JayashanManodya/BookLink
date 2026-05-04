import axios from 'axios';
import Constants from 'expo-constants';

function resolveBaseUrl() {
  const fromEnv =
    typeof process.env.EXPO_PUBLIC_API_URL === 'string' ? process.env.EXPO_PUBLIC_API_URL.trim() : '';
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (typeof hostUri === 'string' && hostUri.length > 0) {
    const host = hostUri.split(':')[0];
    if (host) return `http://${host}:5000`;
  }

  return 'http://localhost:5000';
}

function isMultipartBody(data) {
  if (data == null) return false;
  if (typeof FormData !== 'undefined' && data instanceof FormData) return true;
  return typeof data.append === 'function' && typeof data.getParts === 'function';
}

/** Let the runtime set multipart boundaries (avoids Axios default JSON Content-Type breaking uploads on React Native). */
function stripContentTypeForMultipart(config) {
  if (!isMultipartBody(config.data)) return;
  const h = config.headers;
  if (h) {
    try {
      if (typeof h.delete === 'function') {
        h.delete('Content-Type');
        h.delete('content-type');
      } else {
        delete h['Content-Type'];
        delete h['content-type'];
      }
    } catch (_) {
      /* ignore */
    }
  }
  if (config.timeout == null) config.timeout = 120_000;
}

const MULTIPART_TIMEOUT_MS = 120_000;

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
  stripContentTypeForMultipart(config);
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

/**
 * Upload multipart/form-data using `fetch`. On Android release APKs, axios + FormData often fails with ERR_NETWORK while JSON requests succeed.
 * Uses the same base URL and Clerk token as {@link api}.
 * @param {string} path e.g. `/api/upload/image`
 * @param {FormData} formData
 * @returns {Promise<{ data: unknown }>}
 */
export async function apiPostFormData(path, formData) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${baseURL}${normalizedPath}`;
  /** @type {Record<string, string>} */
  const headers = {};
  try {
    const token = await authTokenProvider();
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch (err) {
    console.error('apiPostFormData auth:', err);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MULTIPART_TIMEOUT_MS);
  /** @type {Response} */
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal,
    });
  } catch (e) {
    const isAbort =
      e && typeof e === 'object' && 'name' in e && e.name === 'AbortError';
    const err = new Error(
      isAbort
        ? `timeout of ${MULTIPART_TIMEOUT_MS}ms exceeded`
        : typeof e?.message === 'string'
          ? e.message
          : 'Network Error',
    );
    err.code = isAbort ? 'ECONNABORTED' : 'ERR_NETWORK';
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || `Request failed (${res.status})` };
  }

  if (!res.ok) {
    const srvMsg =
      data && typeof data === 'object' && typeof data.error === 'string'
        ? data.error
        : `Request failed (${res.status})`;
    const err = new Error(srvMsg);
    err.response = { status: res.status, data };
    throw err;
  }

  return { data };
}

/** Separate axios instance with its own token getter (e.g. right after OAuth before global provider updates). */
export function createAuthAxios(getToken) {
  const instance = axios.create({ baseURL });
  instance.interceptors.request.use(async (config) => {
    stripContentTypeForMultipart(config);
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
  const msgLower =
    typeof error?.message === 'string' ? error.message.toLowerCase() : '';

  const looksUnreachable =
    error?.code === 'ERR_NETWORK' ||
    error?.code === 'ECONNABORTED' ||
    error?.name === 'AbortError' ||
    (!error?.response &&
      (msgLower.includes('network request failed') ||
        msgLower.includes('failed to fetch'))) ||
    (axios.isAxiosError(error) &&
      (error.code === 'ERR_NETWORK' ||
        error.code === 'ECONNABORTED' ||
        (!error.response &&
          typeof error.message === 'string' &&
          error.message.toLowerCase().includes('network'))));

  if (looksUnreachable) {
    const hint =
      'Could not reach the API. Check internet. On EAS builds, confirm EXPO_PUBLIC_API_URL is set in eas.json for your profile and rebuild.';
    const base =
      typeof error?.message === 'string' && error.message.trim() ? error.message : 'Network error';
    return `${base}${base.endsWith('.') ? '' : '.'} ${hint}`;
  }

  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === 'object' && typeof data.error === 'string') {
      return data.error;
    }
    if (error.message) return error.message;
  }
  const plainData = error?.response?.data;
  if (
    plainData &&
    typeof plainData === 'object' &&
    typeof plainData.error === 'string'
  ) {
    return plainData.error;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export default api;
