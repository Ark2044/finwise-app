import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

// Use environment variable for encryption key - NEVER hardcode in production!
const ENCRYPTION_KEY = process.env.EXPO_PUBLIC_ENCRYPTION_KEY || 'finwise-secure-key-2024-DEVELOPMENT-ONLY';

if (!process.env.EXPO_PUBLIC_ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('EXPO_PUBLIC_ENCRYPTION_KEY must be set in production environment');
}

/**
 * Encrypt sensitive data
 */
export const encrypt = (data: string): string => {
  return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
};

/**
 * Decrypt encrypted data
 */
export const decrypt = (encryptedData: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

/**
 * Hash data using SHA256
 */
export const hashData = (data: string): string => {
  return CryptoJS.SHA256(data).toString();
};

/**
 * Securely store data
 */
export const secureStore = async (key: string, value: string): Promise<void> => {
  const encrypted = encrypt(value);
  await SecureStore.setItemAsync(key, encrypted);
};

/**
 * Retrieve securely stored data
 */
export const secureRetrieve = async (key: string): Promise<string | null> => {
  const encrypted = await SecureStore.getItemAsync(key);
  if (!encrypted) return null;
  return decrypt(encrypted);
};

/**
 * Delete securely stored data
 */
export const secureDelete = async (key: string): Promise<void> => {
  await SecureStore.deleteItemAsync(key);
};

/**
 * Check if biometric authentication is available
 */
export const isBiometricAvailable = async (): Promise<boolean> => {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
};

/**
 * Authenticate using biometrics
 */
export const authenticateBiometric = async (
  promptMessage: string = 'Authenticate to continue'
): Promise<boolean> => {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use PIN',
      disableDeviceFallback: false,
    });
    return result.success;
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return false;
  }
};

/**
 * Validate UPI PIN format (4-6 digits)
 */
export const validateUPIPin = (pin: string): boolean => {
  return /^\d{4,6}$/.test(pin);
};

/**
 * Validate UPI VPA format
 */
export const validateVPA = (vpa: string): boolean => {
  // Format: username@bankname
  return /^[a-zA-Z0-9.\-_]{3,}@[a-zA-Z]{3,}$/.test(vpa);
};

/**
 * Generate secure transaction ID
 */
export const generateTransactionId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `TXN${timestamp}${random}`.toUpperCase();
};

/**
 * Generate UTR (Unique Transaction Reference)
 */
export const generateUTR = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}${random}`.toUpperCase();
};
