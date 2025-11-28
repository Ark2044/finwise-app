import { API_BASE_URL, TOKEN_KEYS } from '@/constants/auth';
import { PaymentRequest, TransactionReceipt, UPITransaction } from '@/types/upi';
import { generateTransactionId, hashData } from '@/utils/security';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Platform-safe storage helpers
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      return AsyncStorage.setItem(key, value);
    }
    return SecureStore.setItemAsync(key, value);
  },
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      return AsyncStorage.removeItem(key);
    }
    return SecureStore.deleteItemAsync(key);
  },
};

class APIService {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];
  public readonly apiBaseUrl = API_BASE_URL;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for adding auth tokens
    this.client.interceptors.request.use(
      async (config) => {
        const token = await storage.getItem(TOKEN_KEYS.ACCESS);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for handling token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(this.client(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newToken = await this.refreshToken();
            if (newToken) {
              this.refreshSubscribers.forEach((callback) => callback(newToken));
              this.refreshSubscribers = [];
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client(originalRequest);
            } else {
              await this.clearTokens();
              return Promise.reject(error);
            }
          } catch (refreshError) {
            await this.clearTokens();
            return Promise.reject(error);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Token management methods
  public async getAccessToken(): Promise<string | null> {
    return storage.getItem(TOKEN_KEYS.ACCESS);
  }

  private async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = await storage.getItem(TOKEN_KEYS.REFRESH);
      if (!refreshToken) return null;

      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken,
      });

      const { accessToken } = response.data;
      await storage.setItem(TOKEN_KEYS.ACCESS, accessToken);
      return accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }

  private async clearTokens(): Promise<void> {
    await storage.deleteItem(TOKEN_KEYS.ACCESS);
    await storage.deleteItem(TOKEN_KEYS.REFRESH);
    await storage.deleteItem(TOKEN_KEYS.USER);
  }

  /**
   * Initiate UPI payment
   */
  async initiatePayment(paymentData: PaymentRequest & { paymentMethod?: string }): Promise<{ orderId: string; transactionId: string }> {
    try {
      const transactionId = generateTransactionId();
      const checksum = this.generateChecksum(paymentData, transactionId);

      const response = await this.client.post('/payments/initiate', {
        ...paymentData,
        transactionId,
        checksum,
        timestamp: Date.now(),
      });

      return response.data;
    } catch (error) {
      console.error('Payment initiation error:', error);
      throw new Error('Failed to initiate payment');
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(transactionId: string): Promise<UPITransaction> {
    try {
      const response = await this.client.get(`/payments/verify/${transactionId}`);
      return response.data;
    } catch (error) {
      console.error('Payment verification error:', error);
      throw new Error('Failed to verify payment');
    }
  }

  /**
   * Get transaction receipt
   */
  async getReceipt(transactionId: string): Promise<TransactionReceipt> {
    try {
      const response = await this.client.get(`/transactions/${transactionId}/receipt`);
      return response.data;
    } catch (error) {
      console.error('Receipt fetch error:', error);
      throw new Error('Failed to fetch receipt');
    }
  }

  /**
   * Validate VPA
   */
  async validateVPA(vpa: string): Promise<{ valid: boolean; name?: string }> {
    try {
      const response = await this.client.post('/vpa/validate', { vpa });
      return response.data;
    } catch (error) {
      console.error('VPA validation error:', error);
      return { valid: false };
    }
  }

  /**
   * Verify UPI PIN
   */
  async verifyPIN(pin: string): Promise<{ valid: boolean }> {
    try {
      const response = await this.client.post('/auth/verify-pin', { pin });
      return response.data;
    } catch (error) {
      console.error('PIN verification error:', error);
      return { valid: false };
    }
  }

  /**
   * Check account balance
   */
  async getBalance(): Promise<number> {
    try {
      const response = await this.client.get('/wallet/balance');
      return response.data.balance;
    } catch (error) {
      console.error('Balance fetch error:', error);
      return 0;
    }
  }

  /**
   * Get wallet balances (bank + UPI Lite)
   */
  async getWalletBalances(): Promise<{ bankBalance: number; upiLiteBalance: number }> {
    try {
      const response = await this.client.get('/wallet/balances');
      return response.data;
    } catch (error) {
      console.error('Wallet balances error:', error);
      return { bankBalance: 0, upiLiteBalance: 0 };
    }
  }

  /**
   * Add money to bank account (simulation)
   */
  async addToBankAccount(amount: number): Promise<void> {
    try {
      await this.client.post('/wallet/add-money', { amount });
    } catch (error) {
      console.error('Add money error:', error);
      throw new Error('Failed to add money');
    }
  }

  /**
   * Transfer money from bank to UPI Lite
   */
  async transferToUPILite(amount: number): Promise<void> {
    try {
      await this.client.post('/wallet/transfer-to-upi-lite', { amount });
    } catch (error) {
      console.error('Transfer to UPI Lite error:', error);
      throw new Error('Failed to transfer to UPI Lite');
    }
  }

  /**
   * Transfer money from UPI Lite to bank
   */
  async transferToBank(amount: number): Promise<void> {
    try {
      await this.client.post('/wallet/transfer-to-bank', { amount });
    } catch (error) {
      console.error('Transfer to bank error:', error);
      throw new Error('Failed to transfer to bank');
    }
  }

  /**
   * Initiate Add Money (Razorpay)
   * Creates a Razorpay order for wallet top-up
   */
  async initiateAddMoney(amount: number): Promise<{
    success: boolean;
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
  }> {
    try {
      const response = await this.client.post('/wallet/add-money/initiate', { amount });
      return response.data;
    } catch (error: any) {
      console.error('Initiate add money error:', error);
      throw new Error(error.response?.data?.error || 'Failed to initiate payment');
    }
  }

  /**
   * Verify Add Money (Razorpay)
   * Verifies payment signature and updates wallet balance
   */
  async verifyAddMoney(paymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): Promise<{
    success: boolean;
    newBalance: number;
    message: string;
    paymentDetails?: {
      method: string;
      paymentId: string;
      orderId: string;
    };
  }> {
    try {
      const response = await this.client.post('/wallet/add-money/verify', paymentData);
      return response.data;
    } catch (error: any) {
      console.error('Verify add money error:', error);
      throw error;
    }
  }

  /**
   * Generate checksum for payment verification
   */
  private generateChecksum(data: any, transactionId: string): string {
    // Ensure fields match exactly what the backend expects for checksum generation
    // Use deterministic property order to avoid checksum mismatch
    const checksumData = {
      amount: parseFloat(data.amount.toString()),
      receiverVPA: data.receiverVPA || '',
      receiverName: data.receiverName || '',
      note: (data.note || '').toString().trim(), // Ensure note is always a string and trimmed
      transactionId: transactionId,
      paymentMethod: data.paymentMethod || 'UPI'
    };
    
    // Create payload with sorted keys to ensure consistency
    const sortedPayload = JSON.stringify(checksumData, Object.keys(checksumData).sort());
    return hashData(sortedPayload);
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(limit: number = 50): Promise<UPITransaction[]> {
    try {
      const response = await this.client.get('/transactions', {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      console.error('Transaction history error:', error);
      return [];
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(transactionId: string): Promise<TransactionReceipt> {
    try {
      const response = await this.client.get(`/transactions/${transactionId}/receipt`);
      return response.data;
    } catch (error) {
      console.error('Receipt fetch error:', error);
      throw new Error('Failed to fetch receipt');
    }
  }

  /**
   * Parse UPI QR code data
   */
  parseUPIQR(qrString: string): any {
    try {
      // UPI QR format: upi://pay?pa=...&pn=...&am=...
      if (!qrString.startsWith('upi://pay')) {
        throw new Error('Invalid UPI QR code');
      }

      const url = new URL(qrString);
      const params = url.searchParams;

      return {
        pa: params.get('pa'), // Payee Address (VPA)
        pn: params.get('pn'), // Payee Name
        mc: params.get('mc'), // Merchant Code
        am: params.get('am'), // Amount
        cu: params.get('cu') || 'INR', // Currency
        tn: params.get('tn'), // Transaction Note
        tr: params.get('tr'), // Transaction Reference
        url: params.get('url'),
        mode: params.get('mode'),
      };
    } catch (error) {
      console.error('QR parsing error:', error);
      return null;
    }
  }
}

export default new APIService();