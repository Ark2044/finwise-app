import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { usePayment } from '@/context/PaymentContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import apiService from '@/services/api';
import { UPITransaction } from '@/types/upi';
import { generateTransactionId, generateUTR } from '@/utils/security';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PaymentProcessingScreen() {
  const params = useLocalSearchParams<{
    amount: string;
    receiverVPA: string;
    receiverName: string;
    note: string;
    mcc?: string;
    category?: string;
    merchantType?: string;
    paymentMethod?: string;
  }>();

  const { addTransaction, refreshBalance } = usePayment();
  const [status, setStatus] = useState<'processing' | 'success' | 'failed'>('processing');
  const [transactionId, setTransactionId] = useState('');
  const [utr, setUtr] = useState('');
  const scaleAnim = new Animated.Value(0);

  const primaryColor = useThemeColor({}, 'primary');
  const successColor = useThemeColor({}, 'success');
  const errorColor = useThemeColor({}, 'error');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const secondaryTextColor = useThemeColor({}, 'tabIconDefault');

  useEffect(() => {
    processPayment();
  }, []);

  useEffect(() => {
    if (status !== 'processing') {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  }, [status]);

  const processPayment = async () => {
    try {
      const txnId = generateTransactionId();
      setTransactionId(txnId);

      const paymentData = {
        amount: parseFloat(params.amount),
        receiverVPA: params.receiverVPA,
        receiverName: params.receiverName,
        note: Array.isArray(params.note) ? (params.note[0] || '') : (params.note || ''),
        mcc: params.mcc,
        category: params.category,
        merchantType: params.merchantType,
        paymentMethod: Array.isArray(params.paymentMethod) ? params.paymentMethod[0] : params.paymentMethod,
      };

      // Call actual backend API to process payment
      const result = await apiService.initiatePayment(paymentData);
      
      if (result && result.transactionId) {
        const generatedUTR = generateUTR();
        setUtr(generatedUTR);

        const transaction: UPITransaction = {
          id: result.transactionId,
          amount: paymentData.amount,
          receiverVPA: paymentData.receiverVPA,
          receiverName: paymentData.receiverName,
          transactionNote: paymentData.note,
          timestamp: Date.now(),
          status: 'success',
          transactionRef: generatedUTR,
          paymentMethod: 'UPI',
          mcc: params.mcc,
          category: params.category as any,
          merchantType: params.merchantType,
        };

        await addTransaction(transaction);
        await refreshBalance(); // Refresh balance from backend
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setStatus('success');
      } else {
        throw new Error('Payment initiation failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setStatus('failed');
    }
  };

  const handleDone = () => {
    router.replace('/(tabs)');
  };

  const handleRetry = () => {
    router.back();
  };

  if (status === 'processing') {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color={primaryColor} />
        <ThemedText style={styles.processingText}>Processing Payment...</ThemedText>
        <ThemedText style={[styles.processingSubtext, { color: secondaryTextColor }]}>Please wait</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Animated.View style={[styles.resultContainer, { transform: [{ scale: scaleAnim }] }]}>
        {status === 'success' ? (
          <>
            <View style={styles.successIconContainer}>
              <IconSymbol name="checkmark.circle.fill" size={100} color={successColor} />
            </View>
            <ThemedText style={[styles.successTitle, { color: successColor }]}>Payment Successful!</ThemedText>
            <ThemedText style={styles.amount}>₹{parseFloat(params.amount).toFixed(2)}</ThemedText>

            <View style={[styles.detailsCard, { backgroundColor: cardColor }]}>
              <View style={styles.detailRow}>
                <ThemedText style={[styles.detailLabel, { color: secondaryTextColor }]}>Paid to</ThemedText>
                <ThemedText style={styles.detailValue}>{params.receiverName}</ThemedText>
              </View>
              <View style={styles.detailRow}>
                <ThemedText style={[styles.detailLabel, { color: secondaryTextColor }]}>UPI ID</ThemedText>
                <ThemedText style={styles.detailValue}>{params.receiverVPA}</ThemedText>
              </View>
              {params.note ? (
                <View style={styles.detailRow}>
                  <ThemedText style={[styles.detailLabel, { color: secondaryTextColor }]}>Note</ThemedText>
                  <ThemedText style={styles.detailValue}>{params.note}</ThemedText>
                </View>
              ) : null}
              <View style={styles.detailRow}>
                <ThemedText style={[styles.detailLabel, { color: secondaryTextColor }]}>Transaction ID</ThemedText>
                <ThemedText style={[styles.detailValue, styles.monospace]}>{transactionId}</ThemedText>
              </View>
              <View style={styles.detailRow}>
                <ThemedText style={[styles.detailLabel, { color: secondaryTextColor }]}>UTR</ThemedText>
                <ThemedText style={[styles.detailValue, styles.monospace]}>{utr}</ThemedText>
              </View>
            </View>

            <TouchableOpacity style={[styles.doneButton, { backgroundColor: primaryColor }]} onPress={handleDone}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.failedIconContainer}>
              <IconSymbol name="xmark.circle.fill" size={100} color={errorColor} />
            </View>
            <ThemedText style={[styles.failedTitle, { color: errorColor }]}>Payment Failed</ThemedText>
            <ThemedText style={[styles.failedSubtext, { color: secondaryTextColor }]}>
              Your payment could not be processed. Please try again.
            </ThemedText>

            <View style={styles.buttonGroup}>
              <TouchableOpacity style={[styles.retryButton, { backgroundColor: primaryColor }]} onPress={handleRetry}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.cancelButton, { backgroundColor: cardColor }]} onPress={handleDone}>
                <Text style={[styles.cancelButtonText, { color: textColor }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  processingText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
  },
  processingSubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  resultContainer: {
    width: '100%',
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  amount: {
    fontSize: 48,
    fontWeight: '800',
    marginBottom: 32,
  },
  detailsCard: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  monospace: {
    fontFamily: 'Courier',
  },
  doneButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  failedIconContainer: {
    marginBottom: 24,
  },
  failedTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  failedSubtext: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
