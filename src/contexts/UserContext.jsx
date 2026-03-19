import React, { createContext, useState, useEffect } from 'react';
import API from '../api'; // Asegúrate de que la ruta sea correcta

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [permissions, setPermissions] = useState([]);
    const [role, setRole] = useState(null);
    const [userBranches, setUserBranches] = useState([]);
    const [user, setUser] = useState(null);
    const [favorites, setFavorites] = useState([]);
    const [fullName, setFullName] = useState(null);

    // Cargar favoritos del usuario
    const loadFavorites = async () => {
        if (!user) return;
        try {
            const res = await API.get(`/api/favorites/${user}`);
            setFavorites(res.data);
        } catch (err) {
            console.error('Error al cargar favoritos:', err.message);
        }
    };

    // Agregar favorito
    const addFavorite = async (item) => {
        console.log(user);

        try {
            await API.post('/api/favorites', {
                user_id: user,
                route: item.to,
                label: item.label,
                icon: item.iconName || 'FaQuestion'
            });
            await loadFavorites();
        } catch (err) {
            console.error('Error al agregar favorito:', err.message);
        }
    };

    // Eliminar favorito
    const removeFavorite = async (route) => {
        try {
            await API.delete(`/api/favorites/${user}`, {
                params: { route }
            });
            await loadFavorites();
        } catch (err) {
            console.error('Error al eliminar favorito:', err.message);
        }
    };

    useEffect(() => {
        loadFavorites();
    }, [user]);

    return (
        <UserContext.Provider
            value={{
                permissions, setPermissions,
                role, setRole,
                userBranches, setUserBranches,
                user, setUser,
                fullName, setFullName,
                favorites, loadFavorites, addFavorite, removeFavorite
            }}
        >
            {children}
        </UserContext.Provider>
    );
};
