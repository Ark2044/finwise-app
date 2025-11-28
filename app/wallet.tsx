import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import apiService from '@/services/api';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { WebView } from 'react-native-webview';

interface WalletBalances {
  bankBalance: number;
  upiLiteBalance: number;
}

export default function WalletScreen() {
  const [walletBalances, setWalletBalances] = useState<WalletBalances>({
    bankBalance: 0,
    upiLiteBalance: 0,
  });
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'bank' | 'upi-lite'>('bank');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentHtml, setPaymentHtml] = useState('');

  const primaryColor = useThemeColor({}, 'primary');
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');
  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const successColor = useThemeColor({}, 'success');
  const warningColor = useThemeColor({}, 'warning');
  const errorColor = useThemeColor({}, 'error');
  const placeholderColor = useThemeColor({}, 'placeholder');

  useEffect(() => {
    loadWalletBalances();
  }, []);

  const loadWalletBalances = async () => {
    setLoading(true);
    try {
      const balances = await apiService.getWalletBalances();
      setWalletBalances(balances);
    } catch (error) {
      console.error('Error loading wallet balances:', error);
      Alert.alert('Error', 'Failed to load wallet balances');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToBankAccount = () => {
    setModalType('bank');
    setModalVisible(true);
    setAmount('');
    setPin('');
    setShowPinInput(false);
  };

  const handleAddToUPILite = () => {
    if (walletBalances.bankBalance <= 0) {
      Alert.alert('Insufficient Balance', 'Please add money to your bank account first.');
      return;
    }
    setModalType('upi-lite');
    setModalVisible(true);
    setAmount('');
    setPin('');
    setShowPinInput(false);
  };

  const handleAmountSubmit = () => {
    const amountValue = parseFloat(amount);
    
    if (!amountValue || amountValue <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (modalType === 'bank') {
      // For bank, go directly to payment gateway
      initiatePayment(amountValue);
    } else {
      // For UPI Lite, check balance and ask for PIN
      if (amountValue > walletBalances.bankBalance) {
        Alert.alert('Insufficient Balance', 'You don\'t have enough balance in your bank account');
        return;
      }
      setShowPinInput(true);
    }
  };

  const initiatePayment = async (amountValue: number) => {
    setLoading(true);
    try {
      const data = await apiService.initiateAddMoney(amountValue);
      
      // Razorpay Checkout integration following official docs
      // https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
            <style>
              body {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              .container {
                text-align: center;
                color: white;
              }
              .amount {
                font-size: 48px;
                font-weight: bold;
                margin: 20px 0;
              }
              .info {
                font-size: 18px;
                opacity: 0.9;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="info">Adding to Wallet</div>
              <div class="amount">₹${amountValue.toFixed(2)}</div>
              <div class="info">Initializing payment...</div>
            </div>
            <script>
              // Razorpay Checkout configuration
              var options = {
                "key": "${data.keyId}",
                "amount": "${data.amount}",
                "currency": "${data.currency}",
                "name": "FinWise",
                "description": "Add Money to Wallet",
                "order_id": "${data.orderId}",
                "image": "https://cdn.razorpay.com/logos/payment-gateway.png",
                "prefill": {
                  "name": "FinWise User",
                  "contact": "",
                  "email": ""
                },
                "notes": {
                  "purpose": "wallet_topup"
                },
                "theme": {
                  "color": "#667eea"
                },
                "handler": function (response) {
                  // Payment successful
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'PAYMENT_SUCCESS',
                    data: response
                  }));
                },
                "modal": {
                  "ondismiss": function() {
                    // User closed the payment modal
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'PAYMENT_CANCELLED'
                    }));
                  },
                  "escape": true,
                  "backdropclose": false
                }
              };

              // Initialize Razorpay and open checkout
              try {
                var rzp1 = new Razorpay(options);
                
                rzp1.on('payment.failed', function (response) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'PAYMENT_FAILED',
                    error: response.error
                  }));
                });
                
                // Auto-open the checkout
                rzp1.open();
              } catch (error) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'PAYMENT_ERROR',
                  error: error.message
                }));
              }
            </script>
          </body>
        </html>
      `;
      
      setPaymentHtml(html);
      setShowPaymentModal(true);
      setModalVisible(false); // Close the amount input modal
    } catch (error) {
      console.error('Payment initiation failed:', error);
      Alert.alert('Error', 'Failed to initiate payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onPaymentMessage = async (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      if (message.type === 'PAYMENT_SUCCESS') {
        setShowPaymentModal(false);
        setLoading(true);
        
        // Verify payment on backend with complete Razorpay response
        try {
          const response = await apiService.verifyAddMoney({
            razorpay_order_id: message.data.razorpay_order_id,
            razorpay_payment_id: message.data.razorpay_payment_id,
            razorpay_signature: message.data.razorpay_signature
          });
          
          if (response.success) {
            Alert.alert(
              '✅ Payment Successful',
              response.message || `Money added to your wallet successfully`,
              [
                {
                  text: 'OK',
                  onPress: () => {
                    loadWalletBalances();
                    setAmount('');
                  }
                }
              ]
            );
          } else {
            Alert.alert('Error', response.error || 'Payment verification failed');
          }
        } catch (verifyError: any) {
          console.error('Verification error:', verifyError);
          Alert.alert(
            'Verification Failed',
            verifyError.response?.data?.error || 'Please contact support if amount was deducted'
          );
        }
        setLoading(false);
        
      } else if (message.type === 'PAYMENT_CANCELLED') {
        setShowPaymentModal(false);
        Alert.alert('Payment Cancelled', 'You cancelled the payment');
        
      } else if (message.type === 'PAYMENT_FAILED') {
        setShowPaymentModal(false);
        const errorMsg = message.error?.description || 'Payment failed';
        Alert.alert('Payment Failed', errorMsg);
        
      } else if (message.type === 'PAYMENT_ERROR') {
        setShowPaymentModal(false);
        Alert.alert('Error', message.error || 'Something went wrong');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      setShowPaymentModal(false);
      Alert.alert('Error', 'Failed to process payment response');
    }
  };

  const handlePinSubmit = async () => {
    if (pin.length !== 4) {
      Alert.alert('Invalid PIN', 'PIN must be 4 digits');
      return;
    }

    setLoading(true);
    try {
      // Verify PIN first
      const pinVerification = await apiService.verifyPIN(pin);
      if (!pinVerification.valid) {
        Alert.alert('Invalid PIN', 'The PIN you entered is incorrect');
        setPin('');
        setLoading(false);
        return;
      }

      const amountValue = parseFloat(amount);
      
      if (modalType === 'bank') {
        await apiService.addToBankAccount(amountValue);
        Alert.alert('Success', `₹${amountValue} added to your bank account`);
      } else {
        await apiService.transferToUPILite(amountValue);
        Alert.alert('Success', `₹${amountValue} transferred to UPI Lite`);
      }

      // Refresh balances
      await loadWalletBalances();
      setModalVisible(false);
      setAmount('');
      setPin('');
      setShowPinInput(false);

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

    } catch (error) {
      console.error('Transaction error:', error);
      Alert.alert('Error', 'Transaction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTransferBetweenWallets = () => {
    Alert.alert(
      'Transfer Between Wallets',
      'Choose transfer direction:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Bank → UPI Lite',
          onPress: () => {
            if (walletBalances.bankBalance <= 0) {
              Alert.alert('Insufficient Balance', 'No balance in bank account');
              return;
            }
            setModalType('upi-lite');
            setModalVisible(true);
            setAmount('');
            setPin('');
            setShowPinInput(false);
          },
        },
        {
          text: 'UPI Lite → Bank',
          onPress: () => {
            if (walletBalances.upiLiteBalance <= 0) {
              Alert.alert('Insufficient Balance', 'No balance in UPI Lite');
              return;
            }
            // Implement UPI Lite to Bank transfer
            Alert.alert('Feature Coming Soon', 'UPI Lite to Bank transfer will be available soon');
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView>
        <View style={[styles.header, { backgroundColor: cardColor }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={primaryColor} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>My Wallet</ThemedText>
          <View style={styles.placeholder} />
        </View>

        {/* Bank Account Card */}
        <View style={[styles.walletCard, styles.bankCard, { backgroundColor: primaryColor }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <IconSymbol name="banknote" size={32} color="#fff" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Bank Account</Text>
              <Text style={styles.cardSubtitle}>Main Balance</Text>
            </View>
          </View>
          <View style={styles.balanceSection}>
            <Text style={styles.balanceAmount}>₹{walletBalances.bankBalance.toFixed(2)}</Text>
            <TouchableOpacity
              style={[styles.actionButton, styles.bankButton]}
              onPress={handleAddToBankAccount}
              disabled={loading}
            >
              <IconSymbol name="plus.circle" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Add Money</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* UPI Lite Card */}
        <View style={[styles.walletCard, styles.upiLiteCard, { backgroundColor: successColor }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <IconSymbol name="creditcard" size={32} color="#fff" />
            </View>
            <View>
              <Text style={styles.cardTitle}>UPI Lite</Text>
              <Text style={styles.cardSubtitle}>Virtual Wallet</Text>
            </View>
          </View>
          <View style={styles.balanceSection}>
            <Text style={styles.balanceAmount}>₹{walletBalances.upiLiteBalance.toFixed(2)}</Text>
            <TouchableOpacity
              style={[styles.actionButton, styles.upiLiteButton]}
              onPress={handleAddToUPILite}
              disabled={loading || walletBalances.bankBalance <= 0}
            >
              <IconSymbol name="arrow.right.circle" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Transfer</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.upiLiteNote}>
            Transfers from your bank account balance
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickActionCard, { backgroundColor: cardColor }]}
            onPress={handleTransferBetweenWallets}
          >
            <IconSymbol name="arrow.left.arrow.right" size={28} color={primaryColor} />
            <ThemedText style={styles.quickActionText}>Transfer Between Wallets</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionCard, { backgroundColor: cardColor }]}
            onPress={() => router.push('/transactions')}
          >
            <IconSymbol name="list.bullet" size={28} color={successColor} />
            <ThemedText style={styles.quickActionText}>Transaction History</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Add Money Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: cardColor }]}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>
                  {modalType === 'bank' ? 'Add to Bank Account' : 'Transfer to UPI Lite'}
                </ThemedText>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.closeButton}
                >
                  <IconSymbol name="xmark" size={24} color={iconColor} />
                </TouchableOpacity>
              </View>

              {!showPinInput ? (
                <View style={styles.amountSection}>
                  <ThemedText style={styles.inputLabel}>Enter Amount</ThemedText>
                  <View style={styles.amountInputContainer}>
                    <Text style={[styles.currencySymbol, { color: primaryColor }]}>₹</Text>
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
                  {modalType === 'upi-lite' && (
                    <ThemedText style={styles.availableBalance}>
                      Available in Bank: ₹{walletBalances.bankBalance.toFixed(2)}
                    </ThemedText>
                  )}
                  <TouchableOpacity
                    style={[styles.proceedButton, { backgroundColor: primaryColor }, !amount && styles.disabledButton]}
                    onPress={handleAmountSubmit}
                    disabled={!amount || loading}
                  >
                    <Text style={styles.proceedButtonText}>Proceed</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.pinSection}>
                  <ThemedText style={styles.inputLabel}>Enter UPI PIN</ThemedText>
                  <Text style={[styles.amountConfirm, { color: primaryColor }]}>Amount: ₹{amount}</Text>
                  <TextInput
                    style={[styles.pinInput, { color: textColor, borderColor: primaryColor }]}
                    value={pin}
                    onChangeText={setPin}
                    placeholder="••••"
                    placeholderTextColor={placeholderColor}
                    secureTextEntry
                    keyboardType="numeric"
                    maxLength={4}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={[styles.proceedButton, { backgroundColor: primaryColor }, (!pin || pin.length !== 4) && styles.disabledButton]}
                    onPress={handlePinSubmit}
                    disabled={!pin || pin.length !== 4 || loading}
                  >
                    <Text style={styles.proceedButtonText}>
                      {loading ? 'Processing...' : 'Confirm'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* Payment Modal */}
        <Modal
          animationType="slide"
          transparent={false}
          visible={showPaymentModal}
          onRequestClose={() => setShowPaymentModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'white', paddingTop: Platform.OS === 'ios' ? 40 : 0 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Complete Payment</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)} style={{ padding: 10 }}>
                <IconSymbol name="xmark" size={24} color="black" />
              </TouchableOpacity>
            </View>
            <WebView
              originWhitelist={['*']}
              source={{ html: paymentHtml }}
              style={{ flex: 1 }}
              onMessage={onPaymentMessage}
              javaScriptEnabled={true}
              domStorageEnabled={true}
            />
          </View>
        </Modal>
      </ScrollView>
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
    padding: 20,
    paddingTop: 60,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
    }),
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  walletCard: {
    margin: 20,
    marginBottom: 10,
    padding: 20,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      },
    }),
  },
  bankCard: {
    // handled inline
  },
  upiLiteCard: {
    // handled inline
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  cardSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  balanceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  bankButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  upiLiteButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  upiLiteNote: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    textAlign: 'center',
  },
  quickActions: {
    margin: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    flex: 1,
    padding: 20,
    margin: 5,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
    }),
  },
  quickActionText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountSection: {
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '600',
    marginRight: 8,
  },
  amountInput: {
    fontSize: 32,
    fontWeight: '600',
    minWidth: 100,
    textAlign: 'center',
  },
  availableBalance: {
    fontSize: 14,
    marginBottom: 20,
  },
  proceedButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  proceedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  pinSection: {
    alignItems: 'center',
  },
  amountConfirm: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  pinInput: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    padding: 16,
    borderWidth: 2,
    borderRadius: 12,
    width: 120,
    marginBottom: 20,
  },
  webView: {
    height: 400,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
});