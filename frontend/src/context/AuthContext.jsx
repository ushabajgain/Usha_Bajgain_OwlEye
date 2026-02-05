import { createContext, useContext, useState, useEffect } from "react";
import api from "../api";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        checkUserLoggedIn();
    }, []);

    const checkUserLoggedIn = () => {
        const token = localStorage.getItem("access_token");
        if (token) {
            try {
                const decoded = jwtDecode(token);
                // Check if token is expired
                if (decoded.exp * 1000 < Date.now()) {
                    logout();
                } else {
                    setUser(decoded);
                    // Ideally fetch full profile here: api.get('/auth/me/')
                }
            } catch (error) {
                logout();
            }
        }
        setLoading(false);
    };

    const login = async (email, password) => {
        try {
            const response = await api.post("/auth/login/", { email, password });
            const { access, refresh } = response.data;

            localStorage.setItem("access_token", access);
            localStorage.setItem("refresh_token", refresh);

            const decoded = jwtDecode(access);
            setUser(decoded);

            // Redirect based on role
            navigate("/dashboard");
            return { success: true };
        } catch (error) {
            console.error("Login failed", error);
            return {
                success: false,
                error: error.response?.data?.detail || "Login failed"
            };
        }
    };

    const register = async (userData) => {
        try {
            await api.post("/auth/register/", userData);
            return { success: true };
        } catch (error) {
            console.error("Registration failed", error);
            return {
                success: false,
                error: error.response?.data || "Registration failed"
            };
        }
    };

    const logout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        setUser(null);
        navigate("/login");
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, register, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
