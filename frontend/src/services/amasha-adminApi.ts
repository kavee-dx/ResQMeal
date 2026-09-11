import axios from 'axios';
import api from './api';
import { getAdminSession, clearAdminSession } from '../utils/amasha-admin-authStorage';

const adminApi = axios.create({
  baseURL: api.defaults.baseURL,
});

adminApi.interceptors.request.use(async (config) => {
  const { token } = await getAdminSession();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      await clearAdminSession();
    }
    return Promise.reject(error);
  }
);

export default adminApi;