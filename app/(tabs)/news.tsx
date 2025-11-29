import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import newsService, { NewsArticle, NewsCategory } from '@/services/news';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');
const HEADLINE_CARD_WIDTH = width * 0.85;

interface CategoryTab {
  id: NewsCategory;
  label: string;
  icon: string;
}

const CATEGORIES: CategoryTab[] = [
  { id: 'stocks', label: 'Stocks', icon: 'chart.line.uptrend.xyaxis' },
  { id: 'markets', label: 'Markets', icon: 'chart.bar.fill' },
  { id: 'crypto', label: 'Crypto', icon: 'bitcoinsign.circle.fill' },
  { id: 'economy', label: 'Economy', icon: 'building.columns.fill' },
  { id: 'banking', label: 'Banking', icon: 'building.2.fill' },
  { id: 'personal_finance', label: 'Finance', icon: 'wallet.pass.fill' },
];

export default function NewsScreen() {
  const [headlines, setHeadlines] = useState<NewsArticle[]>([]);
  const [categoryNews, setCategoryNews] = useState<NewsArticle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory>('stocks');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCategory, setIsLoadingCategory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NewsArticle[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const primaryColor = useThemeColor({}, 'primary');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const secondaryTextColor = useThemeColor({}, 'tabIconDefault');
  const borderColor = useThemeColor({}, 'border');
  const inputBackgroundColor = useThemeColor({}, 'inputBackground');
  const placeholderColor = useThemeColor({}, 'placeholder');

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [headlinesData, categoryData] = await Promise.all([
        newsService.fetchTopHeadlines(10),
        newsService.fetchNews(selectedCategory, 20),
      ]);
      setHeadlines(headlinesData);
      setCategoryNews(categoryData);
    } catch (error) {
      console.error('Error loading news:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  const loadCategoryNews = useCallback(async (category: NewsCategory) => {
    setIsLoadingCategory(true);
    try {
      const data = await newsService.fetchNews(category, 20);
      setCategoryNews(data);
    } catch (error) {
      console.error('Error loading category news:', error);
    } finally {
      setIsLoadingCategory(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleCategoryChange = (category: NewsCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(category);
    loadCategoryNews(category);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    newsService.clearCache();
    await loadInitialData();
    setRefreshing(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await newsService.searchNews(searchQuery, 20);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const openArticle = async (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await WebBrowser.openBrowserAsync(url);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderHeadlineCard = ({ item, index }: { item: NewsArticle; index: number }) => (
    <TouchableOpacity
      style={[
        styles.headlineCard,
        { backgroundColor: cardColor, marginLeft: index === 0 ? 20 : 10 },
      ]}
      onPress={() => openArticle(item.url)}
      activeOpacity={0.9}
    >
      {item.urlToImage ? (
        <Image source={{ uri: item.urlToImage }} style={styles.headlineImage} />
      ) : (
        <View style={[styles.headlineImagePlaceholder, { backgroundColor: inputBackgroundColor }]}>
          <IconSymbol name="newspaper.fill" size={40} color={placeholderColor} />
        </View>
      )}
      <View style={styles.headlineOverlay} />
      <View style={styles.headlineContent}>
        <View style={styles.headlineSourceBadge}>
          <Text style={styles.headlineSourceText}>{item.source.name}</Text>
        </View>
        <Text style={styles.headlineTitle} numberOfLines={3}>
          {item.title}
        </Text>
        <Text style={styles.headlineTime}>{formatTimeAgo(item.publishedAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderNewsCard = ({ item }: { item: NewsArticle }) => (
    <TouchableOpacity
      style={[styles.newsCard, { backgroundColor: cardColor }]}
      onPress={() => openArticle(item.url)}
      activeOpacity={0.8}
    >
      <View style={styles.newsCardContent}>
        <View style={styles.newsCardText}>
          <View style={styles.newsSourceRow}>
            <Text style={[styles.newsSource, { color: primaryColor }]}>{item.source.name}</Text>
            <Text style={[styles.newsTime, { color: placeholderColor }]}>
              {formatTimeAgo(item.publishedAt)}
            </Text>
          </View>
          <Text style={[styles.newsTitle, { color: textColor }]} numberOfLines={2}>
            {item.title}
          </Text>
          {item.description && (
            <Text style={[styles.newsDescription, { color: secondaryTextColor }]} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
        {item.urlToImage ? (
          <Image source={{ uri: item.urlToImage }} style={styles.newsThumbnail} />
        ) : (
          <View style={[styles.newsThumbnailPlaceholder, { backgroundColor: inputBackgroundColor }]}>
            <IconSymbol name="photo" size={24} color={placeholderColor} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <ThemedText style={styles.headerTitle}>Financial News</ThemedText>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
          <ThemedText style={[styles.loadingText, { color: secondaryTextColor }]}>
            Loading latest news...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <ThemedText style={styles.headerTitle}>Financial News</ThemedText>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <IconSymbol name="arrow.clockwise" size={22} color={primaryColor} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: inputBackgroundColor }]}>
            <IconSymbol name="magnifyingglass" size={20} color={placeholderColor} />
            <TextInput
              style={[styles.searchInput, { color: textColor }]}
              placeholder="Search financial news..."
              placeholderTextColor={placeholderColor}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
              >
                <IconSymbol name="xmark.circle.fill" size={20} color={placeholderColor} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search Results */}
        {searchQuery.length > 0 && searchResults.length > 0 && (
          <View style={styles.searchResultsContainer}>
            <ThemedText style={styles.sectionTitle}>Search Results</ThemedText>
            {isSearching ? (
              <ActivityIndicator size="small" color={primaryColor} />
            ) : (
              searchResults.map((item) => (
                <View key={item.id}>{renderNewsCard({ item })}</View>
              ))
            )}
          </View>
        )}

        {/* Top Headlines */}
        {searchQuery.length === 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <IconSymbol name="flame.fill" size={20} color="#FF6B6B" />
                <ThemedText style={styles.sectionTitle}>Top Headlines</ThemedText>
              </View>
              <Text style={[styles.sectionSubtitle, { color: secondaryTextColor }]}>Breaking news</Text>
            </View>

            <FlatList
              data={headlines}
              renderItem={renderHeadlineCard}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.headlinesList}
              snapToInterval={HEADLINE_CARD_WIDTH + 10}
              decelerationRate="fast"
            />

            {/* Category Tabs */}
            <View style={styles.categoryContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryTabs}
              >
                {CATEGORIES.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryTab,
                      { backgroundColor: cardColor },
                      selectedCategory === category.id && { backgroundColor: primaryColor },
                    ]}
                    onPress={() => handleCategoryChange(category.id)}
                  >
                    <IconSymbol
                      name={category.icon}
                      size={18}
                      color={selectedCategory === category.id ? '#fff' : secondaryTextColor}
                    />
                    <Text
                      style={[
                        styles.categoryLabel,
                        { color: secondaryTextColor },
                        selectedCategory === category.id && styles.categoryLabelActive,
                      ]}
                    >
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Category News */}
            <View style={styles.categoryNewsContainer}>
              <View style={styles.sectionHeader}>
                <ThemedText style={styles.sectionTitle}>
                  {CATEGORIES.find((c) => c.id === selectedCategory)?.label} News
                </ThemedText>
                <Text style={[styles.newsCount, { color: secondaryTextColor }]}>
                  {categoryNews.length} articles
                </Text>
              </View>

              {isLoadingCategory ? (
                <View style={styles.categoryLoadingContainer}>
                  <ActivityIndicator size="small" color={primaryColor} />
                </View>
              ) : categoryNews.length === 0 ? (
                <View style={styles.emptyState}>
                  <IconSymbol name="newspaper" size={48} color={placeholderColor} />
                  <ThemedText style={[styles.emptyStateText, { color: secondaryTextColor }]}>
                    No news available
                  </ThemedText>
                </View>
              ) : (
                categoryNews.map((item) => <View key={item.id}>{renderNewsCard({ item })}</View>)
              )}
            </View>
          </>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
  },
  refreshButton: {
    padding: 8,
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
    marginTop: 16,
    fontSize: 16,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  searchResultsContainer: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  headlinesList: {
    paddingRight: 20,
  },
  headlineCard: {
    width: HEADLINE_CARD_WIDTH,
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
      },
    }),
  },
  headlineImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  headlineImagePlaceholder: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headlineOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  headlineContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  headlineSourceBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  headlineSourceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  headlineTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 8,
  },
  headlineTime: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  categoryContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  categoryTabs: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryLabelActive: {
    color: '#fff',
  },
  categoryNewsContainer: {
    paddingTop: 8,
  },
  newsCount: {
    fontSize: 14,
    marginTop: 4,
  },
  categoryLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  newsCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  newsCardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  newsCardText: {
    flex: 1,
    marginRight: 12,
  },
  newsSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  newsSource: {
    fontSize: 12,
    fontWeight: '600',
  },
  newsTime: {
    fontSize: 11,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 6,
  },
  newsDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  newsThumbnail: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },
  newsThumbnailPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 12,
  },
});
