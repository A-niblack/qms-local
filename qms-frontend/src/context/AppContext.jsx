// src/context/AppContext.jsx
// MIGRATED FROM FIREBASE TO REST API

import React, { createContext, useState, useEffect, useCallback } from 'react';
import {
  authApi,
  partTypesApi,
  inspectionPlansApi,
  shipmentsApi,
  inspectionsApi,
  quarantineApi,
  warrantyApi,
  gagesApi,
  drawingsApi,
  notificationsApi,
  usersApi,
  getToken,
  clearToken,
  isAuthenticated
} from '../services/api';

// Roles
export const ROLES = {
  ADMIN: 'admin',
  ENGINEER: 'engineer',
  INSPECTOR: 'inspector',
  WARRANTY_MANAGER: 'warranty_manager'
};

// Tiers
export const TIERS = {
  FREE: 'free',
  BASIC: 'basic',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise'
};

// Tier feature definitions
const TIER_FEATURES = {
  [TIERS.FREE]: {
    maxPartTypes: 5,
    maxInspectionsPerMonth: 50,
    maxUsers: 2,
    canExportPdf: false,
    canManageWarranty: false,
    canViewReports: false
  },
  [TIERS.BASIC]: {
    maxPartTypes: 20,
    maxInspectionsPerMonth: 200,
    maxUsers: 5,
    canExportPdf: true,
    canManageWarranty: false,
    canViewReports: true
  },
  [TIERS.PROFESSIONAL]: {
    maxPartTypes: 100,
    maxInspectionsPerMonth: 1000,
    maxUsers: 20,
    canExportPdf: true,
    canManageWarranty: true,
    canViewReports: true
  },
  [TIERS.ENTERPRISE]: {
    maxPartTypes: -1, // unlimited
    maxInspectionsPerMonth: -1,
    maxUsers: -1,
    canExportPdf: true,
    canManageWarranty: true,
    canViewReports: true
  }
};

// Create context
export const AppContext = createContext();

// Provider component
export function AppProvider({ children }) {
  // Auth state
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Data state
  const [allUsers, setAllUsers] = useState([]);
  const [partTypes, setPartTypes] = useState([]);
  const [inspectionPlans, setInspectionPlans] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [quarantineBatches, setQuarantineBatches] = useState([]);
  const [engineeringTasks, setEngineeringTasks] = useState([]);
  const [warrantyClaims, setWarrantyClaims] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [gages, setGages] = useState([]);
  const [drawings, setDrawings] = useState([]);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    if (!getToken()) {
      setLoading(false);
      return;
    }

    try {
      const response = await authApi.me();
      setUser(response.user);
      // Load data after successful auth
      await loadAllData();
    } catch (err) {
      console.error('Auth check failed:', err);
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Load all data
  const loadAllData = async () => {
    try {
      const [
        partTypesRes,
        plansRes,
        shipmentsRes,
        inspectionsRes,
        quarantineRes,
        warrantyRes,
        gagesRes,
        drawingsRes,
        notificationsRes
      ] = await Promise.all([
        partTypesApi.getAll().catch(() => ({ data: [] })),
        inspectionPlansApi.getAll().catch(() => ({ data: [] })),
        shipmentsApi.getAll().catch(() => ({ data: [] })),
        inspectionsApi.getAll().catch(() => ({ data: [] })),
        quarantineApi.getAll().catch(() => ({ data: [] })),
        warrantyApi.getAll().catch(() => ({ data: [] })),
        gagesApi.getAll().catch(() => ({ data: [] })),
        drawingsApi.getAll().catch(() => ({ data: [] })),
        notificationsApi.getAll().catch(() => ({ data: [] }))
      ]);

      setPartTypes(partTypesRes.data || partTypesRes || []);
      setInspectionPlans(plansRes.data || plansRes || []);
      setShipments(shipmentsRes.data || shipmentsRes || []);
      setInspections(inspectionsRes.data || inspectionsRes || []);
      setQuarantineBatches(quarantineRes.data || quarantineRes || []);
      setWarrantyClaims(warrantyRes.data || warrantyRes || []);
      setGages(gagesRes.data || gagesRes || []);
      setDrawings(drawingsRes.data || drawingsRes || []);
      setNotifications(notificationsRes.data || notificationsRes || []);

      // Load users if admin
      if (user?.role === ROLES.ADMIN) {
        try {
          const usersRes = await usersApi.getAll();
          setAllUsers(usersRes.data || usersRes || []);
        } catch (err) {
          console.error('Failed to load users:', err);
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  // Refresh data
  const refreshData = useCallback(async () => {
    if (user) {
      await loadAllData();
    }
  }, [user]);

  // Auth functions
  const login = async (email, password) => {
    try {
      setAuthError(null);
      const response = await authApi.login(email, password);
      setUser(response.user);
      await loadAllData();
      return { success: true };
    } catch (err) {
      setAuthError(err.message);
      return { success: false, error: err.message };
    }
  };

  const register = async (email, password, displayName) => {
    try {
      setAuthError(null);
      const response = await authApi.register(email, password, displayName);
      setUser(response.user);
      await loadAllData();
      return { success: true };
    } catch (err) {
      setAuthError(err.message);
      return { success: false, error: err.message };
    }
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
    setAllUsers([]);
    setPartTypes([]);
    setInspectionPlans([]);
    setShipments([]);
    setInspections([]);
    setQuarantineBatches([]);
    setEngineeringTasks([]);
    setWarrantyClaims([]);
    setNotifications([]);
    setGages([]);
    setDrawings([]);
  };

  // Tier helpers
  const getUserTier = () => user?.tier || TIERS.FREE;

  const getTierLimits = () => TIER_FEATURES[getUserTier()] || TIER_FEATURES[TIERS.FREE];

  const canAccessFeature = (feature) => {
    const limits = getTierLimits();
    return limits[feature] === true || limits[feature] === -1 || limits[feature] > 0;
  };

  // Update user in allUsers list
  const updateUserInList = async (userId, updates) => {
    try {
      await usersApi.update(userId, updates);
      await refreshData();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Context value
  const contextValue = {
    // Auth
    user,
    loading,
    authError,
    login,
    register,
    logout,
    isAuthenticated: !!user,

    // Data
    allUsers,
    partTypes,
    inspectionPlans,
    shipments,
    inspections,
    quarantineBatches,
    engineeringTasks,
    warrantyClaims,
    notifications,
    gages,
    drawings,

    // Actions
    refreshData,
    updateUserInList,

    // Tier helpers
    getUserTier,
    getTierLimits,
    canAccessFeature,

    // Constants
    ROLES,
    TIERS
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export default AppContext;
