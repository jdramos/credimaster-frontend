// src/contexts/AuthContext.js
import React, { createContext, useState, useContext } from "react";
import { ToastContainer, toast } from "react-toastify";
import { UserContext } from "./UserContext";
import API from "../api";

const AuthContext = createContext();

const url = "/api/login";

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);

  const { setPermissions, setRole, setUserBranches, setUser, setFullName } =
    useContext(UserContext);

  const login = async (username, password) => {
    try {
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
        full_name,
        message,
      } = res.data;

      if (!token) {
        toast.error(message || "Usuario o contraseña incorrectos");
        return false;
      }

      setToken(token);
      setPermissions(permissions || []);
      setRole(role_id);
      setUserBranches(branches || []);
      setUser(user_id);
      setFullName(full_name);
      setIsAuthenticated(true);

      localStorage.setItem("token", token);

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
  };

  return (
    <>
      <AuthContext.Provider value={{ isAuthenticated, token, login, logout }}>
        {children}
      </AuthContext.Provider>
      <ToastContainer />
    </>
  );
};

export const useAuth = () => useContext(AuthContext);
