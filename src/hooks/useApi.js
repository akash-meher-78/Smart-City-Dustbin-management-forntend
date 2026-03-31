import { useCallback, useState } from 'react';
import { useGlobalLoading } from '../App';
import { authApi, userApi, binApi } from '../utils/api';

/**
 * AUTH HOOK
 */
export const useAuth = () => {
  const [loading, setLoading] = useState({
    login: false,
    register: false,
    logout: false,
    sendOtp: false,
    verifyOtp: false,
  });

  const [error, setError] = useState(null);
  const { setLoading: setGlobalLoading } = useGlobalLoading();

  const register = useCallback(async (name, email, password, role) => {
    setLoading(prev => ({ ...prev, register: true }));
    setGlobalLoading(true);
    setError(null);

    try {
      const res = await authApi.register({ name, email, password, role });
      if (!res.ok) throw new Error(res.data?.message || 'Registration failed');
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, register: false }));
      setGlobalLoading(false);
    }
  }, [setGlobalLoading]);

  const login = useCallback(async (email, password) => {
    setLoading(prev => ({ ...prev, login: true }));
    setGlobalLoading(true);
    setError(null);

    try {
      const res = await authApi.login({ email, password });
      if (!res.ok) throw new Error(res.data?.message || 'Login failed');
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, login: false }));
      setGlobalLoading(false);
    }
  }, [setGlobalLoading]);

  const logout = useCallback(async () => {
    setLoading(prev => ({ ...prev, logout: true }));
    setGlobalLoading(true);
    setError(null);

    try {
      const res = await authApi.logout();
      if (!res.ok) throw new Error(res.data?.message || 'Logout failed');
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, logout: false }));
      setGlobalLoading(false);
    }
  }, [setGlobalLoading]);

  const sendOtp = useCallback(async (email) => {
    setLoading(prev => ({ ...prev, sendOtp: true }));
    setGlobalLoading(true);
    setError(null);

    try {
      const res = await authApi.sendOtp({ email });
      if (!res.ok) throw new Error(res.data?.message || 'OTP send failed');
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, sendOtp: false }));
      setGlobalLoading(false);
    }
  }, [setGlobalLoading]);

  const verifyOtp = useCallback(async (email, otp) => {
    setLoading(prev => ({ ...prev, verifyOtp: true }));
    setGlobalLoading(true);
    setError(null);

    try {
      const res = await authApi.verifyOtp({ email, otp });
      if (!res.ok) throw new Error(res.data?.message || 'OTP verification failed');
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, verifyOtp: false }));
      setGlobalLoading(false);
    }
  }, [setGlobalLoading]);

  return { register, login, logout, sendOtp, verifyOtp, loading, error };
};


/**
 * USER HOOK
 */
export const useUser = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { setLoading: setGlobalLoading } = useGlobalLoading();

  const getCurrentUser = useCallback(async () => {
    setLoading(true);
    setGlobalLoading(true);
    setError(null);

    try {
      const res = await userApi.getCurrent();
      if (!res.ok) throw new Error(res.data?.message || 'Failed to fetch current user');
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  }, [setGlobalLoading]);

  const getAllUsers = useCallback(async () => {
    setLoading(true);
    setGlobalLoading(true);
    setError(null);

    try {
      const res = await userApi.getAll();
      if (!res.ok) throw new Error(res.data?.message || 'Failed to fetch users');
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  }, [setGlobalLoading]);

  const updateCurrentUser = useCallback(async (updates) => {
    setLoading(true);
    setGlobalLoading(true);
    setError(null);

    try {
      const res = await userApi.updateCurrent(updates);
      if (!res.ok) throw new Error(res.data?.message || 'Failed to update user');
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  }, [setGlobalLoading]);

  const deleteCurrentUser = useCallback(async () => {
    setLoading(true);
    setGlobalLoading(true);
    setError(null);

    try {
      const res = await userApi.deleteCurrent();
      if (!res.ok) throw new Error(res.data?.message || 'Failed to delete user');
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  }, [setGlobalLoading]);

  return { getCurrentUser, getAllUsers, updateCurrentUser, deleteCurrentUser, loading, error };
};


/**
 * BIN HOOK
 */
export const useBin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { setLoading: setGlobalLoading } = useGlobalLoading();

  const getAllBins = useCallback(async () => {
    setLoading(true);
    setGlobalLoading(true);
    setError(null);

    try {
      const res = await binApi.getAll();
      if (!res.ok) throw new Error(res.data?.message || 'Failed to fetch bins');
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  }, [setGlobalLoading]);

  const createBin = useCallback(async (location, binHeight, binNumber) => {
    setLoading(true);
    setGlobalLoading(true);
    setError(null);

    try {
      const res = await binApi.create({ location, binHeight, binNumber });
      if (!res.ok) throw new Error(res.data?.message || 'Failed to create bin');
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  }, [setGlobalLoading]);

  const getBinById = useCallback(async (binId) => {
    setLoading(true);
    setGlobalLoading(true);
    setError(null);

    try {
      const res = await binApi.getById(binId);
      if (!res.ok) throw new Error(res.data?.message || 'Failed to fetch bin');
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  }, [setGlobalLoading]);

  return { getAllBins, createBin, getBinById, loading, error };
};


export default { useAuth, useUser, useBin };