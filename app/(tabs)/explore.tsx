import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { usePayment } from '@/context/PaymentContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HistoryScreen() {
  const { transactions, refreshTransactions } = usePayment();
  const [refreshing, setRefreshing] = useState(false);

  const primaryColor = useThemeColor({}, 'primary');
  const cardColor = useThemeColor({}, 'card');
  const secondaryTextColor = useThemeColor({}, 'tabIconDefault');
  const borderColor = useThemeColor({}, 'border');
  const successColor = useThemeColor({}, 'success');
  const errorColor = useThemeColor({}, 'error');
  const placeholderColor = useThemeColor({}, 'placeholder');

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshTransactions();
    setRefreshing(false);
  };

  const recentTransactions = transactions.slice(0, 10);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <ThemedText style={styles.headerTitle}>Transaction History</ThemedText>
        <TouchableOpacity onPress={() => router.push('/transactions')}>
          <Text style={[styles.viewAllText, { color: primaryColor }]}>View All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
      >
        {recentTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="tray" size={64} color={placeholderColor} />
            <ThemedText style={styles.emptyText}>No transactions yet</ThemedText>
            <Text style={[styles.emptySubtext, { color: placeholderColor }]}>Your payment history will appear here</Text>
          </View>
        ) : (
          recentTransactions.map((transaction) => (
            <View key={transaction.id} style={[styles.transactionCard, { backgroundColor: cardColor }]}>
              <View style={styles.transactionHeader}>
                <View style={styles.iconContainer}>
                  <IconSymbol
                    name={transaction.status === 'success' ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                    size={40}
                    color={transaction.status === 'success' ? successColor : errorColor}
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <ThemedText style={styles.receiverName}>{transaction.receiverName}</ThemedText>
                  <ThemedText style={[styles.receiverVPA, { color: secondaryTextColor }]}>{transaction.receiverVPA}</ThemedText>
                  <ThemedText style={[styles.timestamp, { color: placeholderColor }]}>
                    {new Date(transaction.timestamp).toLocaleString()}
                  </ThemedText>
                </View>
                <View style={styles.amountContainer}>
                  <ThemedText style={styles.amount}>-₹{transaction.amount.toFixed(2)}</ThemedText>
                  <Text
                    style={[
                      styles.status,
                      { color: transaction.status === 'success' ? successColor : errorColor }
                    ]}
                  >
                    {transaction.status}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
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
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    flex: 1,
    padding: 16,
  },
  transactionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  transactionHeader: {
    flexDirection: 'row',
  },
  iconContainer: {
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  receiverName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  receiverVPA: {
    fontSize: 13,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 11,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  status: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
  },
});
