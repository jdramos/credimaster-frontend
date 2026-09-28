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

// Mensajes que SÍ significan "el token ya no sirve" (emitidos únicamente por
// middleware/auth.js y middleware/tenantDb.js). Antes se trataba CUALQUIER
// 401 que no viniera de /api/login como sesión caducada -- pero varios
// endpoints de negocio (ej. cambiar contraseña con la contraseña actual
// incorrecta) también respondían 401 por su cuenta, y eso disparaba un
// logout forzado (window.location.replace) en medio de un formulario válido,
// que es el bug reportado como "me saca al login al navegar". Ahora el
// interceptor solo actúa sobre las señales exactas que emite el propio
// middleware de autenticación, nunca sobre un 401 de validación de negocio.
const SESSION_INVALID_MESSAGES = new Set([
  "Token missing",
  "Session expired",
  "Invalid token",
  "Authentication failed",
]);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginAttempt = error.config?.url === "/api/login";
    const data = error.response?.data;
    const isSessionReplaced = data?.code === "SESSION_REPLACED";
    const isSessionInvalid = SESSION_INVALID_MESSAGES.has(data?.message);

    if (error.response?.status === 401 && !isLoginAttempt && (isSessionReplaced || isSessionInvalid)) {
      console.warn("Sesión expirada");
      logoutExpiredSession(
        isSessionReplaced ? "Tu sesión se cerró porque se inició sesión en otro equipo." : undefined,
      );
    }

    return Promise.reject(error);
  },
);

export default API;
