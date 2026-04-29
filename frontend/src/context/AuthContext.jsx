import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { apiUrl } from '../config/api';

const AuthContext = createContext();
const AUTH_CHANGE_EVENT = 'rescuesync-auth-change';
const USER_TOKEN_KEY = 'rescuesync_user_token';
const USER_DATA_KEY = 'rescuesync_user_data';
const ADMIN_TOKEN_KEY = 'rescuesync_admin_token';
const LEGACY_USER_TOKEN_KEY = 'kinetic_user_token';
const LEGACY_USER_DATA_KEY = 'kinetic_user_data';
const LEGACY_ADMIN_TOKEN_KEY = 'kinetic_admin_token';

function getStoredUserData() {
  const savedUser = localStorage.getItem(USER_DATA_KEY) || localStorage.getItem(LEGACY_USER_DATA_KEY);

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser);
  } catch {
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem(LEGACY_USER_DATA_KEY);
    return null;
  }
}

function getAuthSnapshot() {
  const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY) || localStorage.getItem(LEGACY_ADMIN_TOKEN_KEY);
  const userToken = localStorage.getItem(USER_TOKEN_KEY) || localStorage.getItem(LEGACY_USER_TOKEN_KEY);
  const userData = getStoredUserData();

  return {
    isAdminAuthenticated: Boolean(adminToken),
    isAuthenticated: Boolean(userToken && userData),
    user: userData,
  };
}

function notifyAuthChange() {
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function AuthProvider({ children }) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => getAuthSnapshot().isAdminAuthenticated);
  const [isAuthenticated, setIsAuthenticated] = useState(() => getAuthSnapshot().isAuthenticated);
  const [user, setUser] = useState(() => getAuthSnapshot().user);

  useEffect(() => {
    const syncAuthState = () => {
      const snapshot = getAuthSnapshot();
      setIsAdminAuthenticated(snapshot.isAdminAuthenticated);
      setIsAuthenticated(snapshot.isAuthenticated);
      setUser(snapshot.user);
    };

    window.addEventListener('storage', syncAuthState);
    window.addEventListener(AUTH_CHANGE_EVENT, syncAuthState);

    return () => {
      window.removeEventListener('storage', syncAuthState);
      window.removeEventListener(AUTH_CHANGE_EVENT, syncAuthState);
    };
  }, []);

  // ── User Register ──────────────────────────────────────────────────────────
  const registerUser = async (userData) => {
    try {
      const res = await axios.post(apiUrl('/auth/register'), userData);
      localStorage.setItem(USER_TOKEN_KEY, res.data.token);
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(res.data.user));
      localStorage.removeItem(LEGACY_USER_TOKEN_KEY);
      localStorage.removeItem(LEGACY_USER_DATA_KEY);
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      setIsAuthenticated(true);
      setIsAdminAuthenticated(false);
      setUser(res.data.user);
      notifyAuthChange();
      return { success: true, role: res.data.user.role };
    } catch (err) {
      const msg = err.response?.data?.msg || 'Registration failed';
      return { success: false, msg };
    }
  };


  const loginUser = async (email, password) => {
    try {
      const res = await axios.post(apiUrl('/auth/login'), { email, password });
      localStorage.setItem(USER_TOKEN_KEY, res.data.token);
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(res.data.user));
      localStorage.removeItem(LEGACY_USER_TOKEN_KEY);
      localStorage.removeItem(LEGACY_USER_DATA_KEY);
      if (res.data.user?.role === 'ADMIN') {
        localStorage.setItem(ADMIN_TOKEN_KEY, res.data.token);
        setIsAdminAuthenticated(true);
      } else {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        setIsAdminAuthenticated(false);
      }
      setIsAuthenticated(true);
      setUser(res.data.user);
      notifyAuthChange();
      return { success: true, role: res.data.user.role };
    } catch (err) {
      const msg = err.response?.data?.msg || 'Login failed';
      return { success: false, msg };
    }
  };

  
  const loginAdmin = async (email, password) => {
    return loginUser(email, password);
  };

  
  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY);
    notifyAuthChange();
  };

  const logoutUser = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem(USER_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem(LEGACY_USER_TOKEN_KEY);
    localStorage.removeItem(LEGACY_USER_DATA_KEY);
    notifyAuthChange();
  };

  const updateUserProfile = (nextUser) => {
    if (!nextUser) {
      return;
    }

    localStorage.setItem(USER_DATA_KEY, JSON.stringify(nextUser));
    localStorage.removeItem(LEGACY_USER_DATA_KEY);
    setUser(nextUser);
    notifyAuthChange();
  };

  return (
    <AuthContext.Provider
      value={{ isAdminAuthenticated, isAuthenticated, user, registerUser, loginUser, loginAdmin, logoutAdmin, logoutUser, updateUserProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
