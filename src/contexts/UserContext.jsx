import React, { createContext, useState, useEffect, useCallback } from "react";
import API from "../api";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [permissions, setPermissions] = useState([]);
  const [role, setRole] = useState(null);
  const [userBranches, setUserBranches] = useState([]);
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [fullName, setFullName] = useState(null);

  const hasSession = () => {
    const token = localStorage.getItem("token");
    return Boolean(token);
  };

  const loadFavorites = useCallback(async () => {
    if (!user || !hasSession()) return;

    try {
      const res = await API.get(`/api/favorites/${user}`);
      setFavorites(res.data || []);
    } catch (err) {
      if (err.response?.status === 401) return;
      console.error("Error al cargar favoritos:", err.message);
    }
  }, [user]);

  const addFavorite = async (item) => {
    if (!user || !hasSession()) return;

    try {
      await API.post("/api/favorites", {
        user_id: user,
        route: item.to,
        label: item.label,
        icon: item.iconName || "FaQuestion",
      });

      await loadFavorites();
    } catch (err) {
      if (err.response?.status === 401) return;
      console.error("Error al agregar favorito:", err.message);
    }
  };

  const removeFavorite = async (route) => {
    if (!user || !hasSession()) return;

    try {
      await API.delete(`/api/favorites/${user}`, {
        params: { route },
      });

      await loadFavorites();
    } catch (err) {
      if (err.response?.status === 401) return;
      console.error("Error al eliminar favorito:", err.message);
    }
  };

  useEffect(() => {
    if (!user || !hasSession()) return;

    loadFavorites();
  }, [user, loadFavorites]);

  return (
    <UserContext.Provider
      value={{
        permissions,
        setPermissions,
        role,
        setRole,
        userBranches,
        setUserBranches,
        user,
        setUser,
        fullName,
        setFullName,
        favorites,
        loadFavorites,
        addFavorite,
        removeFavorite,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
