import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { initializeDatabase } from '../database/sqlite';
import { syncService } from '../services/syncService';
import { getOrCreateDeviceId, setUserId } from '../services/localMetadata';
import { authService } from '../services/authService';
import { tokenStore } from '../services/tokenStore';
import { metadataService } from '../services/metadataService';
import { brandingService, Branding } from '../services/brandingService';

type AppContextValue = {
  ready: boolean;
  isAuthenticated: boolean;
  isOnline: boolean;
  syncInProgress: boolean;
  lastSyncMessage: string;
  deviceId: string;
  userId: string;
  toastMessage: string;
  branding: Branding;
  signIn: (payload: { identifier: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  runSync: (options?: { forceFull?: boolean; retryFailedOnly?: boolean }) => Promise<void>;
  showToast: (message: string) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

const AUTH_KEY = 'niger_hmis_authenticated';

const DEFAULT_BRANDING: Branding = { appName: 'Niger State HMIS Outreach', logoUrl: null };

export const AppProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [lastSyncMessage, setLastSyncMessage] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [userId, setUserIdState] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);

  useEffect(() => {
    const bootstrap = async () => {
      await initializeDatabase();

      const [auth, token, localDeviceId, cachedBranding] = await Promise.all([
        AsyncStorage.getItem(AUTH_KEY),
        tokenStore.get(),
        getOrCreateDeviceId(),
        brandingService.getCached(),
      ]);

      const localUserId = (await AsyncStorage.getItem('niger_hmis_user_id')) ?? 'unknown';

      setBranding(cachedBranding);
      setDeviceId(localDeviceId);
      setUserIdState(localUserId);
      setIsAuthenticated(auth === 'true' && token !== null);
      setReady(true);

      // Refresh branding and metadata in background after UI is ready
      brandingService.fetch().then(setBranding).catch(() => undefined);
      if (token) {
        metadataService.refreshAdministrativeMetadata(token).catch(() => undefined);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const nextOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(nextOnline);
      if (nextOnline) {
        void runSync();
        brandingService.fetch().then(setBranding).catch(() => undefined);
      }
    });
    return () => unsubscribe();
  }, []);

  const signIn = async ({ identifier, password }: { identifier: string; password: string }) => {
    const { token, userId: resolvedUserId } = await authService.login(identifier, password);
    await tokenStore.save(token);
    await AsyncStorage.setItem(AUTH_KEY, 'true');
    await setUserId(resolvedUserId);
    setUserIdState(resolvedUserId);
    setIsAuthenticated(true);
    // Refresh metadata and branding after successful login
    metadataService.refreshAdministrativeMetadata(token).catch(() => undefined);
    brandingService.fetch().then(setBranding).catch(() => undefined);
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(AUTH_KEY);
    await tokenStore.clear();
    setIsAuthenticated(false);
  };

  const runSync = async (options?: { forceFull?: boolean; retryFailedOnly?: boolean }) => {
    if (syncInProgress) return;
    setSyncInProgress(true);
    const result = await syncService.flushPendingSync(options);
    setLastSyncMessage(result.message);
    showToast(result.message);
    setSyncInProgress(false);
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const value = useMemo<AppContextValue>(
    () => ({ ready, isAuthenticated, isOnline, syncInProgress, lastSyncMessage, deviceId, userId, toastMessage, branding, signIn, signOut, runSync, showToast }),
    [ready, isAuthenticated, isOnline, syncInProgress, lastSyncMessage, deviceId, userId, toastMessage, branding]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
