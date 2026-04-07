import axios from 'axios';

<<<<<<< Updated upstream
const baseURL = process.env.EXPO_PUBLIC_API_URL;

const instance = axios.create({
    baseURL,
});

export const createAuthAxios = (getToken) => {
    const authInstance = axios.create({
        baseURL,
    });

    authInstance.interceptors.request.use(
        async (config) => {
            try {
                const token = await getToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            } catch (error) {
                console.error('Error getting token for axios interceptor:', error);
            }
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    return authInstance;
};

export default instance;
=======
const baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL,
});

export const createAuthAxios = (getToken) => {
  const authApi = axios.create({
    baseURL,
  });

  authApi.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return authApi;
};

export default api;
>>>>>>> Stashed changes
