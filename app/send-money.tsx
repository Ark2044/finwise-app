import PINInput from '@/components/payment/PINInput';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { usePayment } from '@/context/PaymentContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import apiService from '@/services/api';
import { validateVPA } from '@/utils/security';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface RecentContact {
  name: string;
  vpa: string;
  avatar?: string;
}

export default function SendMoneyScreen() {
  const { balance, walletBalances, transactions } = usePayment();
  const [upiId, setUpiId] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [, setIsValidVPA] = useState(false);
  const [showPIN, setShowPIN] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'BANK' | 'UPI_LITE'>('BANK');
  const [recentContacts, setRecentContacts] = useState<RecentContact[]>([]);
  const [step, setStep] = useState<'enter_upi' | 'enter_amount'>('enter_upi');

  const primaryColor = useThemeColor({}, 'primary');
  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const secondaryTextColor = useThemeColor({}, 'tabIconDefault');
  const borderColor = useThemeColor({}, 'border');
  const inputBackgroundColor = useThemeColor({}, 'inputBackground');
  const placeholderColor = useThemeColor({}, 'placeholder');


  useEffect(() => {
    // Extract recent contacts from transactions
    const uniqueContacts = new Map<string, RecentContact>();
    transactions.forEach((txn) => {
      if (txn.receiverVPA && !uniqueContacts.has(txn.receiverVPA)) {
        uniqueContacts.set(txn.receiverVPA, {
          name: txn.receiverName,
          vpa: txn.receiverVPA,
        });
      }
    });
    setRecentContacts(Array.from(uniqueContacts.values()).slice(0, 6));
  }, [transactions]);

  useEffect(() => {
    const amountNum = parseFloat(amount);
    if (!isNaN(amountNum) && amountNum > 0 && amountNum <= 2000 && walletBalances.upiLiteBalance >= amountNum) {
      setPaymentMethod('UPI_LITE');
    } else {
      setPaymentMethod('BANK');
    }
  }, [amount, walletBalances]);

  const validateUPI = async () => {
    if (!upiId.trim()) {
      Alert.alert('Invalid UPI ID', 'Please enter a UPI ID');
      return;
    }

    if (!validateVPA(upiId)) {
      Alert.alert('Invalid UPI ID', 'Please enter a valid UPI ID (e.g., name@upi)');
      return;
    }

    setIsValidating(true);
    Keyboard.dismiss();

    try {
      const result = await apiService.validateVPA(upiId);
      if (result.valid) {
        setIsValidVPA(true);
        setReceiverName(result.name || 'UPI User');
        setStep('enter_amount');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        Alert.alert('Invalid UPI ID', 'This UPI ID does not exist. Please check and try again.');
        setIsValidVPA(false);
      }
    } catch (error) {
      console.error('VPA validation error:', error);
      Alert.alert('Error', 'Unable to validate UPI ID. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSelectContact = (contact: RecentContact) => {
    setUpiId(contact.vpa);
    setReceiverName(contact.name);
    setIsValidVPA(true);
    setStep('enter_amount');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

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
      processPayment();
    } else {
      setShowPIN(true);
    }
  };

  const processPayment = () => {
    router.push({
      pathname: '/payment-processing',
      params: {
        amount: amount,
        receiverVPA: upiId,
        receiverName: receiverName,
        note: note,
        paymentMethod: paymentMethod,
      },
    });
  };

  const handlePINSuccess = async (pin: string) => {
    setShowPIN(false);

    try {
      if (pin !== 'BIOMETRIC_AUTH') {
        const pinVerification = await apiService.verifyPIN(pin);
        if (!pinVerification.valid) {
          Alert.alert('Invalid PIN', 'The entered PIN is incorrect. Please try again.');
          return;
        }
      }
      processPayment();
    } catch (error) {
      console.error('PIN verification error:', error);
      Alert.alert('Error', 'Unable to verify PIN. Please try again.');
    }
  };

  const quickAmounts = [100, 200, 500, 1000, 2000];

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={textColor} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Send Money</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        {step === 'enter_upi' ? (
          <>
            {/* UPI ID Input */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Enter UPI ID</ThemedText>
              <View style={[styles.inputContainer, { backgroundColor: inputBackgroundColor }]}>
                <IconSymbol name="at" size={20} color={placeholderColor} />
                <TextInput
                  style={[styles.input, { color: textColor }]}
                  value={upiId}
                  onChangeText={setUpiId}
                  placeholder="name@upi"
                  placeholderTextColor={placeholderColor}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
                {upiId.length > 0 && (
                  <TouchableOpacity onPress={() => setUpiId('')}>
                    <IconSymbol name="xmark.circle.fill" size={20} color={placeholderColor} />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  { backgroundColor: primaryColor },
                  (!upiId.trim() || isValidating) && styles.disabledButton,
                ]}
                onPress={validateUPI}
                disabled={!upiId.trim() || isValidating}
              >
                {isValidating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={styles.verifyButtonText}>Verify & Continue</Text>
                    <IconSymbol name="arrow.right" size={18} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Recent Contacts */}
            {recentContacts.length > 0 && (
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Recent</ThemedText>
                <View style={styles.contactsGrid}>
                  {recentContacts.map((contact, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.contactCard, { backgroundColor: cardColor }]}
                      onPress={() => handleSelectContact(contact)}
                    >
                      <View style={[styles.contactAvatar, { backgroundColor: primaryColor + '20' }]}>
                        <IconSymbol name="person.fill" size={24} color={primaryColor} />
                      </View>
                      <ThemedText style={styles.contactName} numberOfLines={1}>
                        {contact.name}
                      </ThemedText>
                      <Text style={[styles.contactVPA, { color: secondaryTextColor }]} numberOfLines={1}>
                        {contact.vpa}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Scan QR Option */}
            <TouchableOpacity
              style={[styles.scanOption, { backgroundColor: cardColor }]}
              onPress={() => router.push('/scan-pay')}
            >
              <View style={[styles.scanIcon, { backgroundColor: primaryColor + '20' }]}>
                <IconSymbol name="qrcode" size={28} color={primaryColor} />
              </View>
              <View style={styles.scanText}>
                <ThemedText style={styles.scanTitle}>Scan QR Code</ThemedText>
                <Text style={[styles.scanSubtitle, { color: secondaryTextColor }]}>
                  Pay by scanning any UPI QR code
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={20} color={secondaryTextColor} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Receiver Info */}
            <View style={[styles.receiverCard, { backgroundColor: cardColor }]}>
              <View style={[styles.receiverAvatar, { backgroundColor: primaryColor + '20' }]}>
                <IconSymbol name="person.fill" size={32} color={primaryColor} />
              </View>
              <View style={styles.receiverInfo}>
                <ThemedText style={styles.receiverName}>{receiverName}</ThemedText>
                <Text style={[styles.receiverVPA, { color: secondaryTextColor }]}>{upiId}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setStep('enter_upi');
                  setIsValidVPA(false);
                }}
                style={[styles.changeButton, { backgroundColor: inputBackgroundColor }]}
              >
                <Text style={[styles.changeButtonText, { color: primaryColor }]}>Change</Text>
              </TouchableOpacity>
            </View>

            {/* Amount Input */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Amount</ThemedText>
              <View style={[styles.amountContainer, { backgroundColor: inputBackgroundColor }]}>
                <Text style={[styles.currencySymbol, { color: textColor }]}>₹</Text>
                <TextInput
                  style={[styles.amountInput, { color: textColor }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor={placeholderColor}
                  keyboardType="numeric"
                  autoFocus
                />
              </View>

              {/* Quick Amount Buttons */}
              <View style={styles.quickAmounts}>
                {quickAmounts.map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={[
                      styles.quickAmountButton,
                      { backgroundColor: cardColor },
                      amount === amt.toString() && { backgroundColor: primaryColor + '20', borderColor: primaryColor },
                    ]}
                    onPress={() => setAmount(amt.toString())}
                  >
                    <Text
                      style={[
                        styles.quickAmountText,
                        { color: secondaryTextColor },
                        amount === amt.toString() && { color: primaryColor },
                      ]}
                    >
                      ₹{amt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Note Input */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Add Note (Optional)</ThemedText>
              <TextInput
                style={[styles.noteInput, { backgroundColor: inputBackgroundColor, color: textColor }]}
                value={note}
                onChangeText={setNote}
                placeholder="What's this for?"
                placeholderTextColor={placeholderColor}
              />
            </View>

            {/* Payment Method Selection */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Pay From</ThemedText>

              <TouchableOpacity
                style={[
                  styles.methodOption,
                  { backgroundColor: cardColor, borderColor: 'transparent' },
                  paymentMethod === 'BANK' && { backgroundColor: primaryColor + '10', borderColor: primaryColor },
                ]}
                onPress={() => setPaymentMethod('BANK')}
              >
                <View style={[styles.methodIcon, { backgroundColor: backgroundColor }]}>
                  <IconSymbol
                    name="building.columns.fill"
                    size={24}
                    color={paymentMethod === 'BANK' ? primaryColor : secondaryTextColor}
                  />
                </View>
                <View style={styles.methodDetails}>
                  <ThemedText style={styles.methodTitle}>Bank Account</ThemedText>
                  <Text style={[styles.methodBalance, { color: secondaryTextColor }]}>
                    Balance: ₹{balance.toFixed(2)}
                  </Text>
                </View>
                {paymentMethod === 'BANK' && <IconSymbol name="checkmark.circle.fill" size={24} color={primaryColor} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.methodOption,
                  { backgroundColor: cardColor, borderColor: 'transparent' },
                  paymentMethod === 'UPI_LITE' && { backgroundColor: primaryColor + '10', borderColor: primaryColor },
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
                  <IconSymbol
                    name="bolt.fill"
                    size={24}
                    color={paymentMethod === 'UPI_LITE' ? primaryColor : secondaryTextColor}
                  />
                </View>
                <View style={styles.methodDetails}>
                  <ThemedText style={styles.methodTitle}>UPI Lite</ThemedText>
                  <Text style={[styles.methodBalance, { color: secondaryTextColor }]}>
                    Balance: ₹{walletBalances.upiLiteBalance.toFixed(2)}
                  </Text>
                </View>
                {paymentMethod === 'UPI_LITE' && (
                  <IconSymbol name="checkmark.circle.fill" size={24} color={primaryColor} />
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Pay Button */}
      {step === 'enter_amount' && (
        <View style={[styles.footer, { backgroundColor: backgroundColor, borderTopColor: borderColor }]}>
          <TouchableOpacity
            style={[
              styles.payButton,
              { backgroundColor: primaryColor },
              (!amount || parseFloat(amount) <= 0) && styles.disabledButton,
            ]}
            onPress={handleProceedToPay}
            disabled={!amount || parseFloat(amount) <= 0}
          >
            <Text style={styles.payButtonText}>Pay ₹{amount || '0'}</Text>
            <IconSymbol name="arrow.right" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={showPIN} animationType="slide" transparent={false}>
        <PINInput onSuccess={handlePINSuccess} onCancel={() => setShowPIN(false)} title="Enter UPI PIN" length={4} />
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
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
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 16,
    gap: 8,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  contactsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  contactCard: {
    width: '30%',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  contactVPA: {
    fontSize: 10,
    textAlign: 'center',
  },
  scanOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
  },
  scanIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scanText: {
    flex: 1,
  },
  scanTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  scanSubtitle: {
    fontSize: 13,
  },
  receiverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    padding: 16,
    borderRadius: 12,
  },
  receiverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  receiverInfo: {
    flex: 1,
  },
  receiverName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  receiverVPA: {
    fontSize: 14,
  },
  changeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  currencySymbol: {
    fontSize: 36,
    fontWeight: '600',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: '600',
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  quickAmountButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
  },
  noteInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopWidth: 1,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
