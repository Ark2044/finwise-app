import PINInput from '@/components/payment/PINInput';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { usePayment } from '@/context/PaymentContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import apiService from '@/services/api';
import { validateVPA } from '@/utils/security';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function PaymentConfirmScreen() {
  const params = useLocalSearchParams<{
    receiverVPA: string;
    receiverName: string;
    amount: string;
    note: string;
    mcc?: string;
    category?: string;
    merchantType?: string;
    paymentMethod?: string;
  }>();

  const { balance, walletBalances } = usePayment();
  const [amount, setAmount] = useState(params.amount || '');
  const [note, setNote] = useState(params.note || '');
  const [showPIN, setShowPIN] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'BANK' | 'UPI_LITE'>('BANK');

  const primaryColor = useThemeColor({}, 'primary');
  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const secondaryTextColor = useThemeColor({}, 'tabIconDefault');
  const borderColor = useThemeColor({}, 'border');
  const inputBackgroundColor = useThemeColor({}, 'inputBackground');
  const placeholderColor = useThemeColor({}, 'placeholder');

  const validateReceiver = useCallback(async () => {
    if (!validateVPA(params.receiverVPA)) {
      Alert.alert('Invalid VPA', 'The scanned UPI ID is invalid');
      router.back();
      return;
    }

    setIsValidating(true);
    const result = await apiService.validateVPA(params.receiverVPA);
    setIsValidating(false);

    if (!result.valid) {
      Alert.alert('Invalid VPA', 'This UPI ID does not exist');
      router.back();
    }
  }, [params.receiverVPA]);

  useEffect(() => {
    validateReceiver();
  }, [validateReceiver]);

  useEffect(() => {
    const amountNum = parseFloat(amount);
    if (!isNaN(amountNum) && amountNum > 0 && amountNum <= 2000 && walletBalances.upiLiteBalance >= amountNum) {
      setPaymentMethod('UPI_LITE');
    } else {
      setPaymentMethod('BANK');
    }
  }, [amount, walletBalances]);

  const handleProceedToPay = () => {
    const amountNum = parseFloat(amount);

    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (paymentMethod === 'BANK' && amountNum > balance) {
      Alert.alert('Insufficient Balance', 'You do not have enough balance for this transaction');
      return;
    }

    if (paymentMethod === 'UPI_LITE' && amountNum > walletBalances.upiLiteBalance) {
      Alert.alert('Insufficient UPI Lite Balance', 'Please use Bank Account or top up UPI Lite');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (paymentMethod === 'UPI_LITE') {
      // Skip PIN for UPI Lite
      processPaymentDirectly();
    } else {
      setShowPIN(true);
    }
  };

  const processPaymentDirectly = async () => {
    try {
      const paymentData = {
        amount: parseFloat(amount),
        receiverVPA: params.receiverVPA,
        receiverName: params.receiverName,
        note: note,
        mcc: params.mcc,
        category: params.category,
        merchantType: params.merchantType,
        paymentMethod: 'UPI_LITE'
      };

      router.push({
        pathname: '/payment-processing',
        params: {
          ...paymentData,
          amount: paymentData.amount.toString(),
        },
      });
    } catch (error) {
      console.error('Payment processing error:', error);
      Alert.alert('Payment Failed', 'Unable to process payment. Please try again.');
    }
  };

  const handlePINSuccess = async (pin: string) => {
    setShowPIN(false);

    try {
      // Verify PIN with backend (skip for biometric auth)
      if (pin !== 'BIOMETRIC_AUTH') {
        const pinVerification = await apiService.verifyPIN(pin);
        if (!pinVerification.valid) {
          Alert.alert('Invalid PIN', 'The entered PIN is incorrect. Please try again.');
          return;
        }
      }

      const paymentData = {
        amount: parseFloat(amount),
        receiverVPA: params.receiverVPA,
        receiverName: params.receiverName,
        note: note,
        mcc: params.mcc,
        category: params.category,
        merchantType: params.merchantType,
        paymentMethod: 'BANK'
      };

      // Navigate to processing screen
      router.push({
        pathname: '/payment-processing',
        params: {
          ...paymentData,
          amount: paymentData.amount.toString(),
        },
      });
    } catch (error) {
      console.error('PIN verification or payment error:', error);
      Alert.alert('Payment Failed', 'Unable to process payment. Please try again.');
    }
  };

  if (isValidating) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
        <ThemedText style={styles.loadingText}>Validating UPI ID...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={textColor} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Confirm Payment</ThemedText>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.receiverCard, { backgroundColor: cardColor }]}>
          <View style={styles.avatarContainer}>
            <IconSymbol name="person.circle.fill" size={60} color={primaryColor} />
          </View>
        <ThemedText style={styles.receiverName}>{params.receiverName}</ThemedText>
        <ThemedText style={[styles.receiverVPA, { color: secondaryTextColor }]}>{params.receiverVPA}</ThemedText>
        {params.merchantType && (
          <View style={[styles.merchantTypeContainer, { backgroundColor: primaryColor + '20' }]}>
            <IconSymbol name="tag.fill" size={14} color={primaryColor} />
            <ThemedText style={[styles.merchantTypeText, { color: primaryColor }]}>{params.merchantType}</ThemedText>
          </View>
        )}
        </View>

        <View style={styles.amountSection}>
          <ThemedText style={styles.label}>Amount</ThemedText>
          <View style={[styles.amountInputContainer, { backgroundColor: inputBackgroundColor }]}>
            <Text style={[styles.currencySymbol, { color: textColor }]}>₹</Text>
            <TextInput
              style={[styles.amountInput, { color: textColor }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="numeric"
              editable={!params.amount}
              placeholderTextColor={placeholderColor}
            />
          </View>
        </View>

        <View style={styles.noteSection}>
          <ThemedText style={styles.label}>Add Note (Optional)</ThemedText>
          <TextInput
            style={[styles.noteInput, { backgroundColor: inputBackgroundColor, color: textColor }]}
            value={note}
            onChangeText={setNote}
            placeholder="e.g., Dinner split, Rent"
            placeholderTextColor={placeholderColor}
            multiline
          />
        </View>

        <View style={styles.paymentMethodSection}>
          <ThemedText style={styles.label}>Pay From</ThemedText>
          
          <TouchableOpacity 
            style={[
              styles.methodOption, 
              { backgroundColor: cardColor, borderColor: 'transparent' },
              paymentMethod === 'BANK' && { backgroundColor: primaryColor + '10', borderColor: primaryColor }
            ]}
            onPress={() => setPaymentMethod('BANK')}
          >
            <View style={[styles.methodIcon, { backgroundColor: backgroundColor }]}>
              <IconSymbol name="building.columns.fill" size={24} color={paymentMethod === 'BANK' ? primaryColor : secondaryTextColor} />
            </View>
            <View style={styles.methodDetails}>
              <ThemedText style={styles.methodTitle}>Bank Account</ThemedText>
              <ThemedText style={[styles.methodBalance, { color: secondaryTextColor }]}>Balance: ₹{balance.toFixed(2)}</ThemedText>
            </View>
            {paymentMethod === 'BANK' && (
              <IconSymbol name="checkmark.circle.fill" size={24} color={primaryColor} />
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.methodOption, 
              { backgroundColor: cardColor, borderColor: 'transparent' },
              paymentMethod === 'UPI_LITE' && { backgroundColor: primaryColor + '10', borderColor: primaryColor }
            ]}
            onPress={() => {
              if (parseFloat(amount) > 2000) {
                Alert.alert('Limit Exceeded', 'UPI Lite payments are limited to ₹2000');
                return;
              }
              setPaymentMethod('UPI_LITE');
            }}
          >
            <View style={[styles.methodIcon, { backgroundColor: backgroundColor }]}>
              <IconSymbol name="bolt.fill" size={24} color={paymentMethod === 'UPI_LITE' ? primaryColor : secondaryTextColor} />
            </View>
            <View style={styles.methodDetails}>
              <ThemedText style={styles.methodTitle}>UPI Lite</ThemedText>
              <ThemedText style={[styles.methodBalance, { color: secondaryTextColor }]}>Balance: ₹{walletBalances.upiLiteBalance.toFixed(2)}</ThemedText>
            </View>
            {paymentMethod === 'UPI_LITE' && (
              <IconSymbol name="checkmark.circle.fill" size={24} color={primaryColor} />
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: backgroundColor, borderTopColor: borderColor }]}>
        <TouchableOpacity style={[styles.payButton, { backgroundColor: primaryColor }]} onPress={handleProceedToPay}>
          <Text style={styles.payButtonText}>Proceed to Pay</Text>
          <IconSymbol name="arrow.right" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <Modal visible={showPIN} animationType="slide" transparent={false}>
        <PINInput
          onSuccess={handlePINSuccess}
          onCancel={() => setShowPIN(false)}
          title="Enter UPI PIN"
          length={4}
        />
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  receiverCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  receiverName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  receiverVPA: {
    fontSize: 14,
  },
  merchantTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  merchantTypeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  amountSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '600',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '600',
    padding: 0,
  },
  noteSection: {
    marginBottom: 24,
  },
  noteInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  paymentMethodSection: {
    marginBottom: 24,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodDetails: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  methodBalance: {
    fontSize: 14,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  payButton: {
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
