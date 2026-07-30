// src/api.js

import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let isLoggingOut = false;

const logoutExpiredSession = (message) => {
  if (isLoggingOut) return;

  isLoggingOut = true;

  localStorage.setItem(
    "sessionExpiredMessage",
    message || "Su sesión expiró por seguridad. Debe iniciar sesión nuevamente.",
  );

  localStorage.removeItem("token");
  localStorage.removeItem("session");
  localStorage.removeItem("user");
  // Llaves planas heredadas de un diseño de auth anterior — ya no se
  // escriben en login(), pero se limpian por si quedaron de una sesión vieja.
  localStorage.removeItem("permissions");
  localStorage.removeItem("role_id");
  localStorage.removeItem("branches");
  localStorage.removeItem("user_id");
  localStorage.removeItem("user_name");
  localStorage.removeItem("full_name");
  localStorage.removeItem("tenant");

  window.location.replace("/login");
};

const getStoredToken = () => {
  const flatToken = localStorage.getItem("token");
  if (flatToken) return flatToken;

  try {
    const session = JSON.parse(localStorage.getItem("session") || "null");
    return session?.token || null;
  } catch {
    return null;
  }
};

API.interceptors.request.use(
  (config) => {
    const token = getStoredToken();

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
    // El propio POST /api/login responde 401 cuando la contraseña es
    // incorrecta — eso es un resultado normal del formulario, no una sesión
    // caducada. Sin esta exclusión, el interceptor lo confundía con un
    // logout forzado y tapaba el mensaje real ("Contraseña incorrecta") con
    // el modal de "Sesión Expirada".
    const isLoginAttempt = error.config?.url === "/api/login";

    if (error.response?.status === 401 && !isLoginAttempt) {
      console.warn("Sesión expirada");
      const isSessionReplaced = error.response?.data?.code === "SESSION_REPLACED";
      logoutExpiredSession(
        isSessionReplaced ? "Tu sesión se cerró porque se inició sesión en otro equipo." : undefined,
      );
    }

    return Promise.reject(error);
  },
);

export default API;
