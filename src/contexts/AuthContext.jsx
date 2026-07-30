// src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import { UserContext } from "./UserContext";
import API from "../api";

const AuthContext = createContext();

const url = "/api/login";

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

  const login = async (username, password) => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("session");
      localStorage.removeItem("user");

      const res = await API.post(url, {
        username,
        password,
      });

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
        message,
      } = res.data;

      if (!token) {
        toast.error(message || "Usuario o contraseña incorrectos");
        return false;
      }

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
    } catch (err) {
      console.error(err);

      const message =
        err.response?.data?.message ||
        err.response?.data?.errors ||
        "Error al iniciar sesión";

      toast.error(message);
      return false;
    }
  };

  const logout = () => {
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
          logout,
        }}
      >
        {children}
      </AuthContext.Provider>

      <ToastContainer />
    </>
  );
};

export const useAuth = () => useContext(AuthContext);
