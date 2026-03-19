// src/contexts/AuthContext.js
import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [token, setToken] = useState(null);

	const login = async (username, password) => {
		try {
			const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/login/`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ username, password }),
			});

			if (res.ok) {
				const data = await res.json();
				setToken(data.token);
				setIsAuthenticated(true);
				localStorage.setItem('token', data.token); // Guardar el token en localStorage
			} else {
				alert('Credenciales inválidas');
			}
		} catch (err) {
			console.error('Error al iniciar sesión:', err);
			alert('Error al iniciar sesión');
		}
	};

	const logout = () => {
		setToken(null);
		setIsAuthenticated(false);
		localStorage.removeItem('token'); // Eliminar el token de localStorage al cerrar sesión
	};

	return (
		<AuthContext.Provider value={{ isAuthenticated, login, logout }}>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => useContext(AuthContext);
