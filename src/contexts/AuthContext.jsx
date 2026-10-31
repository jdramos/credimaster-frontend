// src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from "react";
import { ToastContainer, toast } from "react-toastify";
import { UserContext } from "./UserContext";
import API, { MODULE_DISABLED_EVENT } from "../api";
import { getTrustedDeviceToken, saveTrustedDeviceToken } from "../api/mfa";
import { invalidateCache } from "../hooks/useCachedFetch";

const AuthContext = createContext();

const url = "/api/login";

// Respuestas 401 del primer paso que NO son un error: la contraseña fue
// correcta pero falta el segundo factor (ver LoginController.mfaPendingResponse).
const MFA_STEP_CODES = new Set(["MFA_REQUIRED", "MFA_ENROLL_REQUIRED"]);

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

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getStoredToken());

  const [token, setToken] = useState(getStoredToken());

  const [tenant, setTenant] = useState(() => {
    try {
      const session = JSON.parse(localStorage.getItem("session") || "null");
      return session?.tenant || null;
    } catch {
      return null;
    }
  });

  const [sessionType, setSessionType] = useState(() => {
    try {
      const session = JSON.parse(localStorage.getItem("session") || "null");
      return session?.type || "TENANT";
    } catch {
      return "TENANT";
    }
  });

  const [authUser, setAuthUser] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      return user || null;
    } catch {
      return null;
    }
  });

  const { setPermissions, setRole, setUserBranches, setUser, setFullName, setDepartmentId } =
    useContext(UserContext);

  const hydrateUserContext = (session) => {
    if (!session) return;

    setPermissions(session.permissions || []);
    setRole(session.role_id || null);
    setUserBranches(session.branches || []);
    setUser(session.user_id || null);
    setFullName(session.full_name || "");
    setDepartmentId(session.department_id || null);

    setTenant(session.tenant || null);

    setAuthUser({
      id: session.user_id,
      user_name: session.user_name,
      full_name: session.full_name,
      role_id: session.role_id,
      tenant: session.tenant || null,
    });
  };

  useEffect(() => {
    const rawSession = localStorage.getItem("session");

    if (rawSession) {
      try {
        hydrateUserContext(JSON.parse(rawSession));
      } catch (error) {
        console.error("Error leyendo sesión:", error);
        localStorage.clear();
        setIsAuthenticated(false);
        setToken(null);
        setTenant(null);
        setAuthUser(null);
      }
    }
  }, []);

  // Guarda la sesión que devuelve el backend (login de un paso o el segundo
  // paso de 2FA, que responden exactamente lo mismo).
  const establishSession = (data) => {
    const {
      type,
      token,
      permissions,
      role_id,
      department_id,
      branches,
      user_id,
      user_name,
      full_name,
      tenant,
    } = data;

    const session = {
      type: type || "TENANT",
      token,
      permissions: permissions || [],
      role_id,
      department_id,
      branches: branches || [],
      user_id,
      user_name,
      full_name,
      tenant,
    };

    const userToStore = {
      id: user_id,
      user_name,
      full_name,
      role_id,
      tenant,
    };

    localStorage.setItem("token", token);
    localStorage.setItem("session", JSON.stringify(session));
    localStorage.setItem("user", JSON.stringify(userToStore));

    setToken(token);
    setTenant(tenant || null);
    setSessionType(session.type);
    setAuthUser(userToStore);
    hydrateUserContext(session);
    setIsAuthenticated(true);

    return { ok: true, type: session.type };
  };

  // Módulos vigentes de la empresa: el login los trae, pero el superadmin
  // puede cambiar el paquete en cualquier momento. Se releen al cargar, al
  // volver a la pestaña y cuando una ruta responde MODULE_DISABLED, y se
  // guardan en la sesión para que el menú no parpadee al recargar.
  const lastModulesRefresh = useRef(0);
  const refreshTenantModules = useCallback(async () => {
    lastModulesRefresh.current = Date.now();
    try {
      const res = await API.get("/api/session/modules");
      const modules = res.data?.data;
      if (!modules) return;
      setTenant((prev) => {
        const next = { ...(prev || {}), ...modules };
        try {
          const session = JSON.parse(localStorage.getItem("session") || "null");
          if (session) localStorage.setItem("session", JSON.stringify({ ...session, tenant: next }));
        } catch {
          // Sesión ilegible: el próximo login la reescribe.
        }
        return next;
      });
    } catch {
      // Sin red o sesión vencida: se queda lo que había (el interceptor de
      // API ya maneja la sesión vencida).
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || sessionType === "SUPERADMIN") return undefined;
    refreshTenantModules();
    const onFocus = () => {
      if (Date.now() - lastModulesRefresh.current > 30 * 1000) refreshTenantModules();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener(MODULE_DISABLED_EVENT, refreshTenantModules);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(MODULE_DISABLED_EVENT, refreshTenantModules);
    };
  }, [isAuthenticated, sessionType, refreshTenantModules]);

  const login = async (username, password) => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("session");
      localStorage.removeItem("user");

      const trustedDeviceToken = getTrustedDeviceToken(username);
      const res = await API.post(url, {
        username,
        password,
        // Web y app móvil se contratan por separado: el backend deja entrar
        // solo a usuarios con acceso web por este canal.
        client_channel: "web",
        ...(trustedDeviceToken ? { trusted_device_token: trustedDeviceToken } : {}),
      });

      if (!res.data?.token) {
        toast.error(res.data?.message || "Usuario o contraseña incorrectos");
        return false;
      }

      return establishSession(res.data);
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 401 && MFA_STEP_CODES.has(data?.code) && data?.mfa_token) {
        return {
          mfa: {
            mode: data.code === "MFA_ENROLL_REQUIRED" ? "enroll" : "verify",
            mfa_token: data.mfa_token,
            full_name: data.full_name,
            remember_device_days: data.remember_device_days ?? 0,
            username,
          },
        };
      }

      // No se imprime el error completo: el objeto de axios incluye la
      // configuración de la petición (con la contraseña en el body).
      console.error("Error al iniciar sesión:", err.response?.status || err.message);

      const message =
        err.response?.data?.message ||
        err.response?.data?.errors ||
        "Error al iniciar sesión";

      toast.error(message);
      return false;
    }
  };

  // Cierra el segundo paso de 2FA: guarda la sesión y, si el usuario pidió
  // recordar el equipo, el token para saltarse el código las próximas veces.
  const completeMfaLogin = (data, username) => {
    if (data?.trusted_device_token) saveTrustedDeviceToken(username, data.trusted_device_token);
    return establishSession(data);
  };

  const logout = () => {
    // Cierra también la sesión en el servidor (best-effort): sin esto el JWT
    // robado de un equipo seguía sirviendo hasta 8 h después de "Cerrar
    // sesión". El token se captura antes de limpiar el almacenamiento.
    const currentToken = getStoredToken();
    if (currentToken && sessionType !== "SUPERADMIN") {
      API.post("/api/session/logout", null, {
        headers: { Authorization: `Bearer ${currentToken}` },
      }).catch(() => {});
    }
    // Los catálogos cacheados (sucursales, cuentas, roles...) son del usuario
    // y empresa que cerró sesión: no deben verse en el siguiente login.
    invalidateCache();

    setToken(null);
    setIsAuthenticated(false);
    setTenant(null);
    setSessionType("TENANT");
    setAuthUser(null);

    setPermissions([]);
    setRole(null);
    setUserBranches([]);
    setUser(null);
    setFullName("");
    setDepartmentId(null);

    localStorage.removeItem("token");
    localStorage.removeItem("session");
    localStorage.removeItem("user");
  };

  return (
    <>
      <AuthContext.Provider
        value={{
          isAuthenticated,
          token,
          tenant,
          sessionType,
          isSuperAdmin: sessionType === "SUPERADMIN",
          user: authUser,
          login,
          completeMfaLogin,
          logout,
          refreshTenantModules,
        }}
      >
        {children}
      </AuthContext.Provider>

      <ToastContainer />
    </>
  );
};

export const useAuth = () => useContext(AuthContext);
