import { useAuth } from '@/context/AuthContext';
import apiService from '@/services/api';
import { UPITransaction, User } from '@/types/upi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface WalletBalances {
  bankBalance: number;
  upiLiteBalance: number;
}

interface PaymentContextType {
  user: User | null;
  transactions: UPITransaction[];
  balance: number;
  walletBalances: WalletBalances;
  isLoading: boolean;
  addTransaction: (transaction: UPITransaction) => void;
  refreshBalance: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshWalletBalances: () => Promise<void>;
  updateBalance: (newBalance: number) => void;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const PaymentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user: authUser, isAuthenticated } = useAuth();
  const [transactions, setTransactions] = useState<UPITransaction[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [walletBalances, setWalletBalances] = useState<WalletBalances>({
    bankBalance: 0,
    upiLiteBalance: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Sync with auth user
  const user: User | null = authUser ? {
    id: authUser.id,
    name: authUser.name || 'User',
    vpa: authUser.vpa || '',
    mobileNumber: '',
    balance: balance,
  } : null;

  useEffect(() => {
    if (isAuthenticated && authUser) {
      setBalance(authUser.balance || 0);
      loadTransactions();
      loadWalletBalances();
    } else {
      setTransactions([]);
      setBalance(0);
      setWalletBalances({ bankBalance: 0, upiLiteBalance: 0 });
    }
    setIsLoading(false);
  }, [isAuthenticated, authUser]);

  const loadTransactions = async () => {
    try {
      const storedTransactions = await AsyncStorage.getItem('transactions');
      if (storedTransactions) {
        setTransactions(JSON.parse(storedTransactions));
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const addTransaction = async (transaction: UPITransaction) => {
    const updatedTransactions = [transaction, ...transactions];
    setTransactions(updatedTransactions);
    await AsyncStorage.setItem('transactions', JSON.stringify(updatedTransactions));
    
    // Update balance
    if (transaction.status === 'success') {
      const newBalance = balance - transaction.amount;
      setBalance(newBalance);
    }
  };

  const updateBalance = (newBalance: number) => {
    setBalance(newBalance);
  };

  const refreshBalance = async () => {
    if (!isAuthenticated) return;
    try {
      const newBalance = await apiService.getBalance();
      setBalance(newBalance);
    } catch (error: any) {
      console.error('Balance fetch error:', error);
      // Don't throw, just silently fail
    }
  };

  const refreshTransactions = async () => {
    if (!isAuthenticated) return;
    try {
      const newTransactions = await apiService.getTransactionHistory();
      setTransactions(newTransactions);
      await AsyncStorage.setItem('transactions', JSON.stringify(newTransactions));
    } catch (error: any) {
      console.error('Error refreshing transactions:', error);
      // Don't throw, just silently fail
    }
  };

  const loadWalletBalances = async () => {
    if (!isAuthenticated) return;
    try {
      const balances = await apiService.getWalletBalances();
      setWalletBalances(balances);
    } catch (error: any) {
      console.error('Wallet balances error:', error);
      // Don't throw, just silently fail
    }
  };

  const refreshWalletBalances = async () => {
    await loadWalletBalances();
  };

  return (
    <PaymentContext.Provider
      value={{
        user,
        transactions,
        balance,
        walletBalances,
        isLoading,
        addTransaction,
        refreshBalance,
        refreshTransactions,
        refreshWalletBalances,
        updateBalance,
      }}
    >
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};
