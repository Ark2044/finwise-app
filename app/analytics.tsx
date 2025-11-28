import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/context/AuthContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import apiService from '@/services/api';
import { FinancialDNA, SpendingBucket } from '@/types/upi';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

interface AnalyticsData {
  spendingBuckets: SpendingBucket[];
  financialDNA: FinancialDNA | null;
  topMerchants: { name: string; amount: number; count: number }[];
}

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    spendingBuckets: [],
    financialDNA: null,
    topMerchants: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  const primaryColor = useThemeColor({}, 'primary');
  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const secondaryTextColor = useThemeColor({}, 'tabIconDefault');
  const borderColor = useThemeColor({}, 'border');
  const placeholderColor = useThemeColor({}, 'placeholder');
  const inputBackgroundColor = useThemeColor({}, 'inputBackground');

  const loadAnalytics = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      const endDate = new Date();
      const startDate = new Date();
      
      // Set period
      switch (selectedPeriod) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
      }

      // Generate Financial DNA first
      try {
        const response = await fetch(`${apiService.apiBaseUrl}/analytics/financial-dna/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await apiService.getAccessToken()}`,
          },
          body: JSON.stringify({
            periodStart: startDate.toISOString(),
            periodEnd: endDate.toISOString(),
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Financial DNA generated:', data.success);
        } else {
          const errorData = await response.json();
          console.error('Failed to generate Financial DNA:', errorData);
        }
      } catch (error) {
        console.error('Error generating Financial DNA:', error);
      }

      // Load spending buckets
      const bucketsResponse = await fetch(
        `${apiService.apiBaseUrl}/analytics/spending/buckets?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`,
        {
          headers: {
            'Authorization': `Bearer ${await apiService.getAccessToken()}`,
          },
        }
      );

      // Load top merchants
      const merchantsResponse = await fetch(
        `${apiService.apiBaseUrl}/analytics/spending/merchants?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`,
        {
          headers: {
            'Authorization': `Bearer ${await apiService.getAccessToken()}`,
          },
        }
      );

      // Load Financial DNA
      const dnaResponse = await fetch(
        `${apiService.apiBaseUrl}/analytics/financial-dna?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`,
        {
          headers: {
            'Authorization': `Bearer ${await apiService.getAccessToken()}`,
          },
        }
      );

      const [bucketsData, merchantsData, dnaData] = await Promise.all([
        bucketsResponse.json(),
        merchantsResponse.json(),
        dnaResponse.json(),
      ]);

      console.log('Analytics data loaded:', {
        bucketsSuccess: bucketsData.success,
        merchantsSuccess: merchantsData.success,
        dnaSuccess: dnaData.success,
        dnaError: dnaData.error
      });

      setAnalyticsData({
        spendingBuckets: bucketsData.success ? bucketsData.spendingBuckets : [],
        topMerchants: merchantsData.success ? merchantsData.topMerchants : [],
        financialDNA: dnaData.success ? dnaData.financialDNA : null,
      });
      
      // Show info message if DNA is not available
      if (!dnaData.success && dnaData.error) {
        console.log('Financial DNA not available:', dnaData.error);
      }
    } catch (error) {
      console.error('Analytics loading error:', error);
      Alert.alert('Error', 'Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedPeriod]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const handleAICoaching = async () => {
    try {
      const response = await fetch(`${apiService.apiBaseUrl}/analytics/ai/coaching-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await apiService.getAccessToken()}`,
        },
        body: JSON.stringify({
          requestType: 'spending_analysis',
          userQuery: 'Analyze my spending patterns and provide personalized recommendations',
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // In a real app, this would be sent to your AI coaching service
        console.log('Financial DNA for AI:', data.coachingRequest);
        
        Alert.alert(
          'AI Coaching Ready',
          `Your financial data is ready for AI coaching:\n\n• Total spent: ₹${(data.coachingRequest.financialDNA.totalSpent || 0).toFixed(2)}\n• Spending velocity: ${(data.coachingRequest.financialDNA.spendingVelocity || 0).toFixed(1)} transactions/day\n• Savings rate: ${(data.coachingRequest.financialDNA.savingsRate || 0).toFixed(1)}%\n• Overdraft risk: ${data.coachingRequest.financialDNA.overdraftRisk || 'unknown'}\n\nThis data can now be sent to your AI coaching model for personalized recommendations.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('AI coaching error:', error);
      Alert.alert('Error', 'Failed to prepare AI coaching data');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'food_dining': return 'fork.knife';
      case 'groceries': return 'basket.fill';
      case 'transport': return 'car.fill';
      case 'fuel': return 'fuelpump.fill';
      case 'shopping': return 'bag.fill';
      case 'entertainment': return 'tv.fill';
      case 'utilities': return 'bolt.fill';
      case 'healthcare': return 'heart.fill';
      case 'education': return 'book.fill';
      case 'travel': return 'airplane';
      case 'bills': return 'doc.text.fill';
      case 'transfers': return 'arrow.left.arrow.right.circle';
      case 'investments': return 'chart.line.uptrend.xyaxis';
      default: return 'circle.fill';
    }
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'food_dining': return '#FF6B6B';
      case 'groceries': return '#4ECDC4';
      case 'transport': return '#45B7D1';
      case 'fuel': return '#96CEB4';
      case 'shopping': return '#FFEAA7';
      case 'entertainment': return '#DDA0DD';
      case 'utilities': return '#98D8E8';
      case 'healthcare': return '#FFB6C1';
      case 'education': return '#87CEEB';
      case 'travel': return '#F4A460';
      case 'bills': return '#D3D3D3';
      case 'transfers': return '#20B2AA';
      case 'investments': return '#32CD32';
      default: return '#BDC3C7';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCategoryName = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={textColor} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Financial Analytics</ThemedText>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <IconSymbol name="chart.bar.fill" size={64} color={placeholderColor} />
          <ThemedText style={[styles.loadingText, { color: secondaryTextColor }]}>Loading your financial insights...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const { spendingBuckets, financialDNA, topMerchants } = analyticsData;
  const totalSpent = spendingBuckets.reduce((sum, bucket) => sum + bucket.totalAmount, 0);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={textColor} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Financial Analytics</ThemedText>
        <TouchableOpacity onPress={handleAICoaching} style={styles.aiButton}>
          <IconSymbol name="lightbulb.fill" size={24} color={primaryColor} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
      >
        {/* Period Selection */}
        <View style={styles.periodContainer}>
          {(['7d', '30d', '90d'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                { backgroundColor: cardColor },
                selectedPeriod === period && { backgroundColor: primaryColor },
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodText,
                  { color: secondaryTextColor },
                  selectedPeriod === period && styles.periodTextActive,
                ]}
              >
                {period.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Financial Overview */}
        {financialDNA && (
          <View style={[styles.overviewCard, { backgroundColor: cardColor }]}>
            <ThemedText style={styles.cardTitle}>Financial Overview</ThemedText>
            <View style={styles.overviewGrid}>
              <View style={styles.overviewItem}>
                <IconSymbol name="creditcard.fill" size={24} color={primaryColor} />
                <ThemedText style={[styles.overviewLabel, { color: secondaryTextColor }]}>Total Spent</ThemedText>
                <ThemedText style={styles.overviewValue}>
                  {formatCurrency(financialDNA.totalSpent)}
                </ThemedText>
              </View>
              <View style={styles.overviewItem}>
                <IconSymbol name="chart.line.uptrend.xyaxis" size={24} color="#34C759" />
                <ThemedText style={[styles.overviewLabel, { color: secondaryTextColor }]}>Savings Rate</ThemedText>
                <ThemedText style={styles.overviewValue}>
                  {(financialDNA.savingsRate || 0).toFixed(1)}%
                </ThemedText>
              </View>
              <View style={styles.overviewItem}>
                <IconSymbol name="speedometer" size={24} color="#FF9500" />
                <ThemedText style={[styles.overviewLabel, { color: secondaryTextColor }]}>Spending Velocity</ThemedText>
                <ThemedText style={styles.overviewValue}>
                  {(financialDNA.spendingVelocity || 0).toFixed(1)}/day
                </ThemedText>
              </View>
              <View style={styles.overviewItem}>
                <IconSymbol 
                  name={financialDNA.overdraftRisk === 'high' ? 'exclamationmark.triangle.fill' : 
                        financialDNA.overdraftRisk === 'medium' ? 'exclamationmark.circle.fill' : 
                        'checkmark.shield.fill'} 
                  size={24} 
                  color={financialDNA.overdraftRisk === 'high' ? '#FF3B30' : 
                         financialDNA.overdraftRisk === 'medium' ? '#FF9500' : '#34C759'} 
                />
                <ThemedText style={[styles.overviewLabel, { color: secondaryTextColor }]}>Risk Level</ThemedText>
                <ThemedText style={[
                  styles.overviewValue,
                  { color: financialDNA.overdraftRisk === 'high' ? '#FF3B30' : 
                            financialDNA.overdraftRisk === 'medium' ? '#FF9500' : '#34C759' }
                ]}>
                  {financialDNA.overdraftRisk.toUpperCase()}
                </ThemedText>
              </View>
            </View>
          </View>
        )}

        {/* Spending Buckets */}
        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <ThemedText style={styles.cardTitle}>Spending by Category</ThemedText>
          
          {spendingBuckets.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="chart.pie.fill" size={48} color={placeholderColor} />
              <ThemedText style={[styles.emptyStateText, { color: secondaryTextColor }]}>No spending data available</ThemedText>
              <Text style={[styles.emptyStateSubtext, { color: placeholderColor }]}>
                Make some transactions to see your spending analysis
              </Text>
            </View>
          ) : (
            <>
              {spendingBuckets.slice(0, 6).map((bucket, index) => {
                const barWidth = totalSpent > 0 ? ((bucket.totalAmount || 0) / totalSpent) * (width - 80) : 0;
                
                return (
                  <View key={bucket.category} style={styles.bucketItem}>
                    <View style={styles.bucketHeader}>
                      <View style={styles.bucketInfo}>
                        <View 
                          style={[
                            styles.categoryIcon, 
                            { backgroundColor: getCategoryColor(bucket.category) }
                          ]}
                        >
                          <IconSymbol 
                            name={getCategoryIcon(bucket.category)} 
                            size={16} 
                            color="#fff" 
                          />
                        </View>
                        <View>
                          <ThemedText style={styles.categoryName}>
                            {formatCategoryName(bucket.category)}
                          </ThemedText>
                          <Text style={[styles.categorySubtext, { color: secondaryTextColor }]}>
                            {bucket.transactionCount || 0} transactions
                          </Text>
                        </View>
                      </View>
                      <View style={styles.bucketAmounts}>
                        <ThemedText style={styles.bucketAmount}>
                          {formatCurrency(bucket.totalAmount || 0)}
                        </ThemedText>
                        <Text style={[styles.bucketPercentage, { color: secondaryTextColor }]}>
                          {(bucket.percentageOfTotal || 0).toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.progressBarContainer, { backgroundColor: inputBackgroundColor }]}>
                      <View 
                        style={[
                          styles.progressBar, 
                          { 
                            width: Math.max(barWidth, 4),
                            backgroundColor: getCategoryColor(bucket.category) 
                          }
                        ]} 
                      />
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </View>

        {/* Top Merchants */}
        {topMerchants.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardColor }]}>
            <ThemedText style={styles.cardTitle}>Top Merchants</ThemedText>
            {topMerchants.slice(0, 5).map((merchant, index) => (
              <View key={merchant.name} style={[styles.merchantItem, { borderBottomColor: borderColor }]}>
                <View style={[styles.merchantRank, { backgroundColor: primaryColor }]}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <View style={styles.merchantInfo}>
                  <ThemedText style={styles.merchantName} numberOfLines={1}>
                    {merchant.name}
                  </ThemedText>
                  <Text style={[styles.merchantSubtext, { color: secondaryTextColor }]}>
                    {merchant.count} transactions
                  </Text>
                </View>
                <ThemedText style={styles.merchantAmount}>
                  {formatCurrency(merchant.amount)}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        {/* Insights and Recommendations */}
        {financialDNA && (
          <View style={[styles.card, { backgroundColor: cardColor }]}>
            <ThemedText style={styles.cardTitle}>AI Insights</ThemedText>
            
            {financialDNA.unusualActivityFlags.length > 0 && (
              <View style={styles.alertsSection}>
                <ThemedText style={styles.alertsTitle}>⚠️ Alerts</ThemedText>
                {financialDNA.unusualActivityFlags.map((flag, index) => (
                  <View key={index} style={styles.alertItem}>
                    <IconSymbol name="exclamationmark.triangle.fill" size={16} color="#FF9500" />
                    <Text style={styles.alertText}>{flag}</Text>
                  </View>
                ))}
              </View>
            )}
            
            <View style={styles.insightsSection}>
              <ThemedText style={styles.insightsTitle}>💡 Quick Insights</ThemedText>
              <Text style={[styles.insightText, { color: textColor }]}>
                Your largest spending category is {formatCategoryName(spendingBuckets[0]?.category || 'other')} 
                {spendingBuckets[0] && ` (${(spendingBuckets[0].percentageOfTotal || 0).toFixed(1)}% of total)`}
              </Text>
              
              {financialDNA.impulsePurchaseRatio > 30 && (
                <Text style={[styles.insightText, { color: textColor }]}>
                  💸 You make frequent small purchases ({(financialDNA.impulsePurchaseRatio || 0).toFixed(1)}% impulse buys)
                </Text>
              )}
              
              {financialDNA.emergencyFundMonths >= 6 ? (
                <Text style={[styles.insightText, { color: '#34C759' }]}>
                  ✅ Great emergency fund! You have {(financialDNA.emergencyFundMonths || 0).toFixed(1)} months covered
                </Text>
              ) : (
                <Text style={[styles.insightText, { color: '#FF9500' }]}>
                  🎯 Consider building an emergency fund (currently {(financialDNA.emergencyFundMonths || 0).toFixed(1)} months)
                </Text>
              )}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
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
  aiButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  periodContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
  },
  periodTextActive: {
    color: '#fff',
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  overviewCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  overviewItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  overviewLabel: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  overviewValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  bucketItem: {
    marginBottom: 16,
  },
  bucketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bucketInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
  },
  categorySubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  bucketAmounts: {
    alignItems: 'flex-end',
  },
  bucketAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  bucketPercentage: {
    fontSize: 12,
    marginTop: 2,
  },
  progressBarContainer: {
    height: 4,
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  merchantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  merchantRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '600',
  },
  merchantSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  merchantAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  alertsSection: {
    marginBottom: 16,
  },
  alertsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  alertText: {
    fontSize: 14,
    color: '#FF9500',
    marginLeft: 8,
    flex: 1,
  },
  insightsSection: {
    marginTop: 8,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
});