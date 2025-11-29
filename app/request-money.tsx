import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/context/AuthContext';
import { usePayment } from '@/context/PaymentContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import apiService from '@/services/api';
import { validateVPA } from '@/utils/security';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
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
}

export default function RequestMoneyScreen() {
  const { user: authUser } = useAuth();
  const { transactions } = usePayment();
  const [upiId, setUpiId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isValidVPA, setIsValidVPA] = useState(false);
  const [recentContacts, setRecentContacts] = useState<RecentContact[]>([]);
  const [step, setStep] = useState<'enter_details' | 'share_request'>('enter_details');
  const [requestLink, setRequestLink] = useState('');

  const primaryColor = useThemeColor({}, 'primary');
  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const secondaryTextColor = useThemeColor({}, 'tabIconDefault');
  const borderColor = useThemeColor({}, 'border');
  const inputBackgroundColor = useThemeColor({}, 'inputBackground');
  const placeholderColor = useThemeColor({}, 'placeholder');
  const successColor = useThemeColor({}, 'success');
  const warningColor = useThemeColor({}, 'warning');

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
        setPayerName(result.name || 'UPI User');
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
    setPayerName(contact.name);
    setIsValidVPA(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const generateRequestLink = () => {
    // Generate UPI payment link
    const userVPA = authUser?.vpa || 'user@finwise';
    const userName = authUser?.name || 'FinWise User';
    const amountNum = parseFloat(amount);
    
    // UPI Intent URL format
    let upiLink = `upi://pay?pa=${userVPA}&pn=${encodeURIComponent(userName)}`;
    if (amountNum > 0) {
      upiLink += `&am=${amountNum.toFixed(2)}`;
    }
    if (note) {
      upiLink += `&tn=${encodeURIComponent(note)}`;
    }
    upiLink += `&cu=INR`;
    
    return upiLink;
  };

  const handleCreateRequest = () => {
    const amountNum = parseFloat(amount);

    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (amountNum > 100000) {
      Alert.alert('Amount Too High', 'Maximum request amount is ₹1,00,000');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const link = generateRequestLink();
    setRequestLink(link);
    setStep('share_request');
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(requestLink);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied!', 'Payment link copied to clipboard');
  };

  const handleShare = async () => {
    const userName = authUser?.name || 'I';
    const amountNum = parseFloat(amount);
    const message = `${userName} is requesting ₹${amountNum.toFixed(2)}${note ? ` for ${note}` : ''}. Pay using this UPI link: ${requestLink}`;

    try {
      if (Platform.OS === 'web') {
        await Clipboard.setStringAsync(message);
        Alert.alert('Copied!', 'Payment request copied to clipboard. You can now paste and share it.');
      } else if (await Sharing.isAvailableAsync()) {
        // On mobile, we'll copy to clipboard since Sharing.shareAsync requires a file
        await Clipboard.setStringAsync(message);
        Alert.alert('Copied!', 'Payment request copied to clipboard. You can now share it via any app.');
      } else {
        await Clipboard.setStringAsync(message);
        Alert.alert('Copied!', 'Payment request copied to clipboard.');
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Share error:', error);
      await Clipboard.setStringAsync(message);
      Alert.alert('Copied!', 'Payment request copied to clipboard.');
    }
  };

  const handleSendReminder = () => {
    if (!isValidVPA || !upiId) {
      Alert.alert('Select Recipient', 'Please select or enter a valid UPI ID to send a reminder');
      return;
    }
    
    // In a real app, this would send a notification/SMS
    Alert.alert(
      'Reminder Sent!',
      `A payment reminder has been sent to ${payerName || upiId}`,
      [{ text: 'OK' }]
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={textColor} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Request Money</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        {step === 'enter_details' ? (
          <>
            {/* Amount Input */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Request Amount</ThemedText>
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
              <ThemedText style={styles.sectionTitle}>What's this for? (Optional)</ThemedText>
              <TextInput
                style={[styles.noteInput, { backgroundColor: inputBackgroundColor, color: textColor }]}
                value={note}
                onChangeText={setNote}
                placeholder="e.g., Dinner split, Rent, Birthday gift"
                placeholderTextColor={placeholderColor}
              />
            </View>

            {/* Request From Specific Person (Optional) */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Request From (Optional)</ThemedText>
              <View style={[styles.inputContainer, { backgroundColor: inputBackgroundColor }]}>
                <IconSymbol name="at" size={20} color={placeholderColor} />
                <TextInput
                  style={[styles.input, { color: textColor }]}
                  value={upiId}
                  onChangeText={(text) => {
                    setUpiId(text);
                    setIsValidVPA(false);
                  }}
                  placeholder="name@upi (optional)"
                  placeholderTextColor={placeholderColor}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
                {upiId.length > 0 && !isValidVPA && (
                  <TouchableOpacity onPress={validateUPI} disabled={isValidating}>
                    {isValidating ? (
                      <ActivityIndicator size="small" color={primaryColor} />
                    ) : (
                      <Text style={[styles.verifyText, { color: primaryColor }]}>Verify</Text>
                    )}
                  </TouchableOpacity>
                )}
                {isValidVPA && (
                  <IconSymbol name="checkmark.circle.fill" size={20} color={successColor} />
                )}
              </View>
              {isValidVPA && payerName && (
                <Text style={[styles.verifiedName, { color: successColor }]}>
                  ✓ {payerName}
                </Text>
              )}
            </View>

            {/* Recent Contacts */}
            {recentContacts.length > 0 && (
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Recent</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.contactsRow}>
                    {recentContacts.map((contact, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.contactChip,
                          { backgroundColor: cardColor },
                          upiId === contact.vpa && { backgroundColor: primaryColor + '20', borderColor: primaryColor },
                        ]}
                        onPress={() => handleSelectContact(contact)}
                      >
                        <IconSymbol 
                          name="person.fill" 
                          size={16} 
                          color={upiId === contact.vpa ? primaryColor : secondaryTextColor} 
                        />
                        <Text
                          style={[
                            styles.contactChipText,
                            { color: secondaryTextColor },
                            upiId === contact.vpa && { color: primaryColor },
                          ]}
                          numberOfLines={1}
                        >
                          {contact.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </>
        ) : (
          <>
            {/* Success State - Share Request */}
            <View style={styles.successContainer}>
              <View style={[styles.successIcon, { backgroundColor: successColor + '20' }]}>
                <IconSymbol name="checkmark.circle.fill" size={60} color={successColor} />
              </View>
              <ThemedText style={styles.successTitle}>Request Created!</ThemedText>
              <ThemedText style={styles.successAmount}>₹{parseFloat(amount).toFixed(2)}</ThemedText>
              {note && <Text style={[styles.successNote, { color: secondaryTextColor }]}>{note}</Text>}
            </View>

            {/* Share Options */}
            <View style={styles.shareSection}>
              <ThemedText style={styles.sectionTitle}>Share Payment Request</ThemedText>

              <TouchableOpacity
                style={[styles.shareOption, { backgroundColor: cardColor }]}
                onPress={handleShare}
              >
                <View style={[styles.shareIcon, { backgroundColor: primaryColor + '20' }]}>
                  <IconSymbol name="square.and.arrow.up" size={24} color={primaryColor} />
                </View>
                <View style={styles.shareText}>
                  <ThemedText style={styles.shareTitle}>Share via Apps</ThemedText>
                  <Text style={[styles.shareSubtitle, { color: secondaryTextColor }]}>
                    WhatsApp, Messages, Email & more
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={20} color={secondaryTextColor} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.shareOption, { backgroundColor: cardColor }]}
                onPress={handleCopyLink}
              >
                <View style={[styles.shareIcon, { backgroundColor: warningColor + '20' }]}>
                  <IconSymbol name="doc.on.doc" size={24} color={warningColor} />
                </View>
                <View style={styles.shareText}>
                  <ThemedText style={styles.shareTitle}>Copy Payment Link</ThemedText>
                  <Text style={[styles.shareSubtitle, { color: secondaryTextColor }]}>
                    Copy and paste anywhere
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={20} color={secondaryTextColor} />
              </TouchableOpacity>

              {isValidVPA && (
                <TouchableOpacity
                  style={[styles.shareOption, { backgroundColor: cardColor }]}
                  onPress={handleSendReminder}
                >
                  <View style={[styles.shareIcon, { backgroundColor: successColor + '20' }]}>
                    <IconSymbol name="bell.fill" size={24} color={successColor} />
                  </View>
                  <View style={styles.shareText}>
                    <ThemedText style={styles.shareTitle}>Send Reminder</ThemedText>
                    <Text style={[styles.shareSubtitle, { color: secondaryTextColor }]}>
                      Notify {payerName || upiId}
                    </Text>
                  </View>
                  <IconSymbol name="chevron.right" size={20} color={secondaryTextColor} />
                </TouchableOpacity>
              )}
            </View>

            {/* Payment Link Preview */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>UPI Payment Link</ThemedText>
              <View style={[styles.linkPreview, { backgroundColor: inputBackgroundColor }]}>
                <Text style={[styles.linkText, { color: secondaryTextColor }]} numberOfLines={2}>
                  {requestLink}
                </Text>
              </View>
            </View>
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Action Button */}
      <View style={[styles.footer, { backgroundColor: backgroundColor, borderTopColor: borderColor }]}>
        {step === 'enter_details' ? (
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: primaryColor },
              (!amount || parseFloat(amount) <= 0) && styles.disabledButton,
            ]}
            onPress={handleCreateRequest}
            disabled={!amount || parseFloat(amount) <= 0}
          >
            <Text style={styles.actionButtonText}>Create Request</Text>
            <IconSymbol name="arrow.right" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: cardColor }]}
            onPress={() => {
              setStep('enter_details');
              setAmount('');
              setNote('');
              setUpiId('');
              setIsValidVPA(false);
            }}
          >
            <Text style={[styles.actionButtonText, { color: textColor }]}>Create Another Request</Text>
          </TouchableOpacity>
        )}
      </View>
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
  verifyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  verifiedName: {
    fontSize: 14,
    marginTop: 8,
    marginLeft: 4,
  },
  contactsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  contactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  contactChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  successAmount: {
    fontSize: 42,
    fontWeight: '800',
    marginBottom: 8,
  },
  successNote: {
    fontSize: 16,
  },
  shareSection: {
    paddingHorizontal: 20,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  shareIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  shareText: {
    flex: 1,
  },
  shareTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  shareSubtitle: {
    fontSize: 13,
  },
  linkPreview: {
    borderRadius: 12,
    padding: 16,
  },
  linkText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
