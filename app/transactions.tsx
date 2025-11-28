import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { usePayment } from '@/context/PaymentContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function TransactionsScreen() {
  const { transactions, refreshTransactions } = usePayment();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');

  const primaryColor = useThemeColor({}, 'primary');
  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
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

  const filteredTransactions = transactions.filter((t) => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={textColor} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Transactions</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton, 
            { backgroundColor: cardColor },
            filter === 'all' && { backgroundColor: primaryColor }
          ]}
          onPress={() => setFilter('all')}
        >
          <Text style={[
            styles.filterText, 
            { color: secondaryTextColor },
            filter === 'all' && styles.filterTextActive
          ]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton, 
            { backgroundColor: cardColor },
            filter === 'success' && { backgroundColor: primaryColor }
          ]}
          onPress={() => setFilter('success')}
        >
          <Text style={[
            styles.filterText, 
            { color: secondaryTextColor },
            filter === 'success' && styles.filterTextActive
          ]}>
            Success
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton, 
            { backgroundColor: cardColor },
            filter === 'failed' && { backgroundColor: primaryColor }
          ]}
          onPress={() => setFilter('failed')}
        >
          <Text style={[
            styles.filterText, 
            { color: secondaryTextColor },
            filter === 'failed' && styles.filterTextActive
          ]}>
            Failed
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
      >
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="tray" size={64} color={placeholderColor} />
            <ThemedText style={[styles.emptyText, { color: placeholderColor }]}>No transactions found</ThemedText>
          </View>
        ) : (
          filteredTransactions.map((transaction) => (
            <TouchableOpacity key={transaction.id} style={[styles.transactionCard, { backgroundColor: cardColor }]}>
              <View style={styles.transactionHeader}>
                <View style={styles.iconContainer}>
                  <IconSymbol
                    name={transaction.status === 'success' ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                    size={48}
                    color={transaction.status === 'success' ? successColor : errorColor}
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <ThemedText style={styles.receiverName}>{transaction.receiverName}</ThemedText>
                  <ThemedText style={[styles.receiverVPA, { color: secondaryTextColor }]}>{transaction.receiverVPA}</ThemedText>
                  {transaction.transactionNote && (
                    <ThemedText style={[styles.note, { color: placeholderColor }]}>{transaction.transactionNote}</ThemedText>
                  )}
                </View>
                <View style={styles.amountContainer}>
                  <ThemedText style={styles.amount}>-₹{transaction.amount.toFixed(2)}</ThemedText>
                </View>
              </View>
              <View style={[styles.transactionFooter, { borderTopColor: borderColor }]}>
                <ThemedText style={[styles.timestamp, { color: placeholderColor }]}>
                  {new Date(transaction.timestamp).toLocaleString()}
                </ThemedText>
                <View style={styles.statusBadge}>
                  <Text
                    style={[
                      styles.statusText,
                      { color: transaction.status === 'success' ? successColor : errorColor }
                    ]}
                  >
                    {transaction.status}
                  </Text>
                </View>
              </View>
              {transaction.transactionRef && (
                <View style={[styles.refContainer, { borderTopColor: borderColor }]}>
                  <ThemedText style={[styles.refLabel, { color: placeholderColor }]}>UTR:</ThemedText>
                  <ThemedText style={[styles.refValue, { color: secondaryTextColor }]}>{transaction.transactionRef}</ThemedText>
                </View>
              )}
            </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
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
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
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
    marginBottom: 12,
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
  note: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  timestamp: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  refContainer: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  refLabel: {
    fontSize: 11,
    marginRight: 8,
  },
  refValue: {
    fontSize: 11,
    fontFamily: 'Courier',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
});
