import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from './types';
import { api } from './api';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthReady: boolean;
  login: (data: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAuthReady: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const fetchUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      setIsAuthReady(true);
      return;
    }

    try {
      const data = await api.auth.me();
      setUser(data);
      setProfile(data);
    } catch (error: any) {
      console.error("Auth error:", error);
      // If it's a 404, 401, 403 or contains session expired message, the session is invalid
      const isAuthError = 
        error.message.includes('404') || 
        error.message.includes('401') || 
        error.message.includes('403') ||
        error.message.includes('Forbidden') ||
        error.message.includes('expired') ||
        error.message.includes('not found');

      if (isAuthError) {
        localStorage.removeItem('token');
        setUser(null);
        setProfile(null);
      }
    } finally {
      setLoading(false);
      setIsAuthReady(true);
    }
  };

  const refreshProfile = async () => {
    try {
      const data = await api.auth.me();
      setUser(data);
      setProfile(data);
    } catch (error: any) {
      console.error("Refresh profile error:", error);
      const isAuthError = 
        error.message.includes('404') || 
        error.message.includes('401') || 
        error.message.includes('403') ||
        error.message.includes('Forbidden') ||
        error.message.includes('expired') ||
        error.message.includes('not found');

      if (isAuthError) {
        localStorage.removeItem('token');
        setUser(null);
        setProfile(null);
      }
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (data: any) => {
    const res = await api.auth.login(data);
    localStorage.setItem('token', res.token);
    setUser(res.user);
    setProfile(res.user);
  };

  const register = async (data: any) => {
    const res = await api.auth.register(data);
    localStorage.setItem('token', res.token);
    setUser(res.user);
    setProfile(res.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAuthReady, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
