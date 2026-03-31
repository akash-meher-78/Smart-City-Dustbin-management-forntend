import { useCallback, useState } from 'react';
import { authApi, userApi, binApi } from '../utils/api';


export const useAuth = () => {
  const [loading, setLoading] = useState({
    login: false,
    register: false,
  });
  const [error, setError] = useState(null);

  const register = useCallback(async (name, email, password, role) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.register({ name, email, password, role });
      if (!res.ok) throw new Error(res.data?.message || 'Registration failed');
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.login({ email, password });
      if (!res.ok) throw new Error(res.data?.message || 'Login failed');
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.logout();
      if (!res.ok) throw new Error(res.data?.message || 'Logout failed');
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendOtp = useCallback(async (email) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.sendOtp({ email });
      if (!res.ok) throw new Error(res.data?.message || 'OTP send failed');
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyOtp = useCallback(async (email, otp) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.verifyOtp({ email, otp });
      if (!res.ok) throw new Error(res.data?.message || 'OTP verification failed');
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { register, login, logout, sendOtp, verifyOtp, loading, error };
};

/**
 * Custom hook for User API calls with loading and error states
 * Usage: const { currentUser, updateUser, loading, error } = useUser();
 */
export const useUser = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getCurrentUser = useCallback(async () => {
    setLoading(true);
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
    }
  }, []);

  const getAllUsers = useCallback(async () => {
    setLoading(true);
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
    }
  }, []);

  const updateCurrentUser = useCallback(async (updates) => {
    setLoading(true);
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
    }
  }, []);

  const deleteCurrentUser = useCallback(async () => {
    setLoading(true);
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
    }
  }, []);

  return { getCurrentUser, getAllUsers, updateCurrentUser, deleteCurrentUser, loading, error };
};

/**
 * Custom hook for Bin API calls with loading and error states
 * Usage: const { bins, createBin, loading, error } = useBin();
 */
export const useBin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getAllBins = useCallback(async () => {
    setLoading(true);
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
    }
  }, []);

  const createBin = useCallback(async (location, binHeight, binNumber) => {
    setLoading(true);
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
    }
  }, []);

  const getBinById = useCallback(async (binId) => {
    setLoading(true);
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
    }
  }, []);

  return { getAllBins, createBin, getBinById, loading, error };
};

export default { useAuth, useUser, useBin };
