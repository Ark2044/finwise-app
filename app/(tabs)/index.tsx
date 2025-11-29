import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/context/AuthContext';
import { usePayment } from '@/context/PaymentContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function HomeScreen() {
  const { user, balance, transactions, walletBalances, refreshBalance, refreshTransactions, refreshWalletBalances } = usePayment();
  const { logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const primaryColor = useThemeColor({}, 'primary');
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');
  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const successColor = useThemeColor({}, 'success');
  const warningColor = useThemeColor({}, 'warning');
  const errorColor = useThemeColor({}, 'error');

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await logout();
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshBalance(), refreshTransactions(), refreshWalletBalances()]);
    setRefreshing(false);
  };

  const handleScanPay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/scan-pay');
  };

  const handleSendMoney = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/send-money');
  };

  const handleRequestMoney = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/request-money');
  };

  const handleCheckBalance = () => {
    Alert.alert('Balance', `Available Balance: ₹${balance.toFixed(2)}`);
  };

  const recentTransactions = transactions.slice(0, 5);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
      >
        <View style={[styles.header, { backgroundColor: cardColor }]}>
          <View>
            <ThemedText style={styles.greeting}>Hello,</ThemedText>
            <ThemedText style={styles.userName}>{user?.name || 'Guest'}</ThemedText>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={handleLogout}>
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={28} color={errorColor} />
          </TouchableOpacity>
        </View>

        <View style={[styles.balanceCard, { backgroundColor: primaryColor }]}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceAmount}>₹{(balance).toFixed(2)}</Text>
          <View style={styles.walletBreakdown}>
            <View style={styles.walletItem}>
              <Text style={styles.walletLabel}>Bank</Text>
              <Text style={styles.walletValue}>₹{walletBalances.bankBalance.toFixed(2)}</Text>
            </View>
            <View style={styles.walletDivider} />
            <View style={styles.walletItem}>
              <Text style={styles.walletLabel}>UPI Lite</Text>
              <Text style={styles.walletValue}>₹{walletBalances.upiLiteBalance.toFixed(2)}</Text>
            </View>
          </View>
          <View style={styles.balanceActions}>
            <TouchableOpacity style={styles.balanceActionButton} onPress={() => router.push('/wallet')}>
              <IconSymbol name="wallet.pass" size={16} color="#fff" />
              <Text style={styles.balanceActionText}>Manage</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.balanceActionButton} onPress={onRefresh}>
              <IconSymbol name="arrow.clockwise" size={16} color="#fff" />
              <Text style={styles.balanceActionText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionCard} onPress={handleScanPay}>
            <View style={[styles.actionIcon, { backgroundColor: primaryColor }]}>
              <IconSymbol name="qrcode" size={28} color="#fff" />
            </View>
            <ThemedText style={styles.actionText}>Scan & Pay</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleSendMoney}>
            <View style={[styles.actionIcon, { backgroundColor: successColor }]}>
              <IconSymbol name="arrow.up.circle.fill" size={28} color="#fff" />
            </View>
            <ThemedText style={styles.actionText}>Send Money</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleRequestMoney}>
            <View style={[styles.actionIcon, { backgroundColor: warningColor }]}>
              <IconSymbol name="arrow.down.circle.fill" size={28} color="#fff" />
            </View>
            <ThemedText style={styles.actionText}>Request</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/wallet')}
          >
            <View style={[styles.actionIcon, { backgroundColor: warningColor }]}>
              <IconSymbol name="wallet.pass.fill" size={28} color="#fff" />
            </View>
            <ThemedText style={styles.actionText}>My Wallet</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/analytics')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#AF52DE' }]}>
              <IconSymbol name="chart.bar.fill" size={28} color="#fff" />
            </View>
            <ThemedText style={styles.actionText}>Analytics</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={[styles.transactionsSection, { backgroundColor: cardColor }]}>
          <View style={styles.transactionsHeader}>
            <ThemedText style={styles.sectionTitle}>Recent Transactions</ThemedText>
            <TouchableOpacity onPress={() => router.push('/transactions')}>
              <Text style={[styles.viewAllText, { color: primaryColor }]}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="tray" size={48} color={iconColor} />
              <ThemedText style={styles.emptyStateText}>No transactions yet</ThemedText>
              <ThemedText style={styles.emptyStateSubtext}>Start by scanning a QR code to pay</ThemedText>
            </View>
          ) : (
            recentTransactions.map((transaction) => (
              <TouchableOpacity key={transaction.id} style={[styles.transactionItem, { borderBottomColor: backgroundColor }]}>
                <View style={styles.transactionIcon}>
                  <IconSymbol
                    name={transaction.status === 'success' ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                    size={40}
                    color={transaction.status === 'success' ? successColor : errorColor}
                  />
                </View>
                <View style={styles.transactionDetails}>
                  <ThemedText style={styles.transactionName}>{transaction.receiverName}</ThemedText>
                  <ThemedText style={styles.transactionVPA}>{transaction.receiverVPA}</ThemedText>
                  <ThemedText style={styles.transactionDate}>
                    {new Date(transaction.timestamp).toLocaleDateString()}
                  </ThemedText>
                </View>
                <View style={styles.transactionAmount}>
                  <ThemedText style={styles.transactionAmountText}>-₹{transaction.amount.toFixed(2)}</ThemedText>
                  <ThemedText style={[styles.transactionStatus, { color: transaction.status === 'success' ? successColor : errorColor }]}>{transaction.status}</ThemedText>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  greeting: {
    fontSize: 16,
    opacity: 0.7,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
  },
  profileButton: {
    width: 40,
    height: 40,
  },
  balanceCard: {
    margin: 20,
    padding: 24,
    borderRadius: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
    elevation: 5,
  },
  balanceLabel: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 8,
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 16,
  },
  walletBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  walletItem: {
    alignItems: 'center',
    flex: 1,
  },
  walletLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  walletValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  walletDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 16,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  balanceActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  balanceActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionCard: {
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    textAlign: 'center',
  },
  transactionsSection: {
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 300,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  transactionIcon: {
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionVPA: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 11,
    opacity: 0.5,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  transactionStatus: {
    fontSize: 11,
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    opacity: 0.7,
  },
});
