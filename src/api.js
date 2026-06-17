// src/api.js

import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let isLoggingOut = false;

const logoutExpiredSession = () => {
  if (isLoggingOut) return;

  isLoggingOut = true;

  localStorage.setItem(
    "sessionExpiredMessage",
    "Su sesión expiró por seguridad. Debe iniciar sesión nuevamente.",
  );

  localStorage.removeItem("token");
  localStorage.removeItem("permissions");
  localStorage.removeItem("role_id");
  localStorage.removeItem("branches");
  localStorage.removeItem("user_id");
  localStorage.removeItem("user_name");
  localStorage.removeItem("full_name");
  localStorage.removeItem("tenant");

  window.location.replace("/login");
};

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (!token) {
      return config;
    }

    config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Sesión expirada");
      logoutExpiredSession();
    }

    return Promise.reject(error);
  },
);

export default API;
