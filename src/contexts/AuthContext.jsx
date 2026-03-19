// src/contexts/AuthContext.js
import React, { createContext, useState, useContext } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { UserContext } from './UserContext';

const AuthContext = createContext();
const url = process.env.REACT_APP_API_BASE_URL + '/api/login';
const token = process.env.REACT_APP_API_TOKEN;
const headers = { Authorization: token };

export const AuthProvider = ({ children }) => {

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [token, setToken] = useState(null);
    const { setPermissions, setRole, setUserBranches, setUser, setFullName } = useContext(UserContext);


    const login = async (username, password) => {

        try {

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password }) // Verifica que esto está correcto
            });

            if (res.ok) {
                const data = await res.json();
                const { token, permissions, role_id, branches, user_id, full_name } = data;
                setToken(token);

                setPermissions(permissions);

                setRole(role_id);

                setIsAuthenticated(true);

                setUserBranches(branches);

                setUser(user_id);
                setFullName(full_name);
                
                return true
            } else {
                const errorData = await res.json();
                toast.error(`Login failed: ${errorData.message}`);
            }
        } catch (err) {
            console.error(err);
            //alert('Error logging in');
        }
    };

    const logout = () => {
        setToken(null);
        setIsAuthenticated(false);
    };

    return (
        <div>
            <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
                {children}
            </AuthContext.Provider>
            <ToastContainer />
        </div>

    );
};

export const useAuth = () => useContext(AuthContext);

