// src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import { UserContext } from "./UserContext";
import API from "../api";

const AuthContext = createContext();

const url = "/api/login";

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token"),
  );

  const [token, setToken] = useState(localStorage.getItem("token"));

  const { setPermissions, setRole, setUserBranches, setUser, setFullName } =
    useContext(UserContext);

  const hydrateUserContext = (session) => {
    if (!session) return;

    setPermissions(session.permissions || []);
    setRole(session.role_id || null);
    setUserBranches(session.branches || []);
    setUser(session.user_id || null);
    setFullName(session.full_name || "");
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
      }
    }
  }, []);

  const login = async (username, password) => {
    try {
      // limpiar sesión vieja antes de iniciar
      localStorage.removeItem("token");
      localStorage.removeItem("session");
      localStorage.removeItem("user");

      const res = await API.post(url, {
        username,
        password,
      });

      const {
        token,
        permissions,
        role_id,
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
        token,
        permissions: permissions || [],
        role_id,
        branches: branches || [],
        user_id,
        user_name,
        full_name,
        tenant,
      };

      localStorage.setItem("token", token);
      localStorage.setItem("session", JSON.stringify(session));
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: user_id,
          user_name,
          full_name,
          role_id,
          tenant,
        }),
      );

      setToken(token);
      hydrateUserContext(session);
      setIsAuthenticated(true);

      return true;
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

    setPermissions([]);
    setRole(null);
    setUserBranches([]);
    setUser(null);
    setFullName("");

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
