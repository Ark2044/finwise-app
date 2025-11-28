import { API_BASE_URL, TOKEN_KEYS } from '@/constants/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

// UPI Profile - stored separately for financial data
interface UPIProfile {
  id: string;
  vpa: string;
  balance: number;
  upiPinSet: boolean;
}

// Combined user type for the app
interface AppUser {
  id: string;
  email: string | null;
  name: string | null;
  vpa?: string;
  balance?: number;
  upiPinSet?: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasUPIProfile: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setupUPIProfile: (vpa: string, upiPin: string) => Promise<{ success: boolean; error?: string }>;
  verifyUPIPin: (pin: string) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  vpa: string;
  upiPin: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage helper for cross-platform support
const storage = {
  async getItem(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    return AsyncStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    return AsyncStorage.removeItem(key);
  },
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [upiProfile, setUpiProfile] = useState<UPIProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;
  const hasUPIProfile = !!upiProfile?.upiPinSet;

  // Initialize auth state
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Check for stored user session
      const storedUser = await storage.getItem(TOKEN_KEYS.USER);
      const storedProfile = await storage.getItem(TOKEN_KEYS.UPI_PROFILE);

      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        
        if (storedProfile) {
          const parsedProfile = JSON.parse(storedProfile);
          setUpiProfile(parsedProfile);
          // Merge UPI data into user
          setUser(prev => prev ? {
            ...prev,
            vpa: parsedProfile.vpa,
            balance: parsedProfile.balance,
            upiPinSet: parsedProfile.upiPinSet,
          } : null);
        }
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAuthData = async () => {
    await Promise.all([
      storage.removeItem(TOKEN_KEYS.ACCESS),
      storage.removeItem(TOKEN_KEYS.REFRESH),
      storage.removeItem(TOKEN_KEYS.USER),
      storage.removeItem(TOKEN_KEYS.UPI_PROFILE),
    ]);
    setUser(null);
    setUpiProfile(null);
  };

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      const appUser: AppUser = {
        id: data.user.id,
        email: email,
        name: data.user.name,
        vpa: data.user.vpa,
        balance: data.user.balance,
        upiPinSet: true, // Assuming PIN is set if login succeeds (since we auto-gen it)
      };

      await storage.setItem(TOKEN_KEYS.USER, JSON.stringify(appUser));
      await storage.setItem(TOKEN_KEYS.ACCESS, data.accessToken);
      await storage.setItem(TOKEN_KEYS.REFRESH, data.refreshToken);
      
      setUser(appUser);

      // Set UPI profile
      const profile: UPIProfile = {
        id: data.user.id,
        vpa: data.user.vpa,
        balance: data.user.balance,
        upiPinSet: true,
      };
      await storage.setItem(TOKEN_KEYS.UPI_PROFILE, JSON.stringify(profile));
      setUpiProfile(profile);

      return { success: true };
    } catch (error: unknown) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      return { success: false, error: errorMessage };
    }
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        return { success: false, error: responseData.error || 'Registration failed' };
      }

      const appUser: AppUser = {
        id: responseData.user.id,
        email: data.email,
        name: responseData.user.name,
        vpa: responseData.user.vpa,
        balance: responseData.user.balance,
        upiPinSet: true,
      };

      await storage.setItem(TOKEN_KEYS.USER, JSON.stringify(appUser));
      await storage.setItem(TOKEN_KEYS.ACCESS, responseData.accessToken);
      await storage.setItem(TOKEN_KEYS.REFRESH, responseData.refreshToken);
      
      setUser(appUser);

      // Set UPI profile
      const profile: UPIProfile = {
        id: responseData.user.id,
        vpa: responseData.user.vpa,
        balance: responseData.user.balance,
        upiPinSet: true,
      };
      await storage.setItem(TOKEN_KEYS.UPI_PROFILE, JSON.stringify(profile));
      setUpiProfile(profile);

      return { success: true };
    } catch (error: unknown) {
      console.error('Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const accessToken = await storage.getItem(TOKEN_KEYS.ACCESS);
      if (accessToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
    await clearAuthData();
    router.replace('/login');
  }, []);

  // UPI Profile Management - This is the financial layer
  const setupUPIProfile = useCallback(async (vpa: string, upiPin: string): Promise<{ success: boolean; error?: string }> => {
    // This might be redundant now if we auto-setup on register, but keeping for flexibility
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    // ... existing implementation if needed, or just return success
    return { success: true };
  }, [user]);

  const verifyUPIPin = useCallback(async (pin: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const accessToken = await storage.getItem(TOKEN_KEYS.ACCESS);
      const response = await fetch(`${API_BASE_URL}/auth/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          pin,
        }),
      });

      const data = await response.json();
      return data.valid === true;
    } catch (error) {
      console.error('PIN verification error:', error);
      return false;
    }
  }, [user]);

  const fetchUPIProfile = async (userId: string) => {
      // No longer needed as profile is returned on login/register
      // But keeping empty function to satisfy interface if called elsewhere
  };

  const refreshProfile = useCallback(async () => {
    // Implement if needed to re-fetch balance
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        hasUPIProfile,
        login,
        register,
        logout,
        setupUPIProfile,
        verifyUPIPin,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
