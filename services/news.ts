const NEWS_API_KEY = '5872c615cf2743f186798a9db142da6d';
const NEWS_API_BASE_URL = 'https://newsapi.org/v2';

export interface NewsArticle {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
}

export interface NewsResponse {
  status: string;
  totalResults: number;
  articles: NewsArticle[];
}

export type NewsCategory = 'stocks' | 'crypto' | 'economy' | 'banking' | 'markets' | 'personal_finance';

const CATEGORY_QUERIES: Record<NewsCategory, string> = {
  stocks: 'stock market OR stocks OR NSE OR BSE OR Sensex OR Nifty',
  crypto: 'cryptocurrency OR bitcoin OR ethereum OR crypto',
  economy: 'economy OR GDP OR inflation OR RBI OR fiscal policy',
  banking: 'banking OR bank OR loans OR interest rates OR UPI',
  markets: 'financial markets OR trading OR investment OR mutual funds',
  personal_finance: 'personal finance OR savings OR budget OR financial planning',
};

class NewsService {
  private cache: Map<string, { data: NewsArticle[]; timestamp: number }> = new Map();
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private generateId(article: Omit<NewsArticle, 'id'>, index: number): string {
    return `${article.source?.name || 'unknown'}-${index}-${new Date(article.publishedAt).getTime()}`;
  }

  async fetchNews(category: NewsCategory = 'stocks', pageSize: number = 20): Promise<NewsArticle[]> {
    const cacheKey = `${category}-${pageSize}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const query = encodeURIComponent(CATEGORY_QUERIES[category]);
      const url = `${NEWS_API_BASE_URL}/everything?q=${query}&language=en&sortBy=publishedAt&pageSize=${pageSize}&apiKey=${NEWS_API_KEY}`;
      
      const response = await fetch(url);
      const data: NewsResponse = await response.json();

      if (data.status === 'ok' && data.articles) {
        const articles = data.articles.map((article, index) => ({
          ...article,
          id: this.generateId(article, index),
        }));
        
        this.cache.set(cacheKey, { data: articles, timestamp: Date.now() });
        return articles;
      }
      
      return [];
    } catch (error) {
      console.error('News fetch error:', error);
      return cached?.data || [];
    }
  }

  async fetchTopHeadlines(pageSize: number = 10): Promise<NewsArticle[]> {
    const cacheKey = `headlines-${pageSize}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const url = `${NEWS_API_BASE_URL}/top-headlines?country=in&category=business&pageSize=${pageSize}&apiKey=${NEWS_API_KEY}`;
      
      const response = await fetch(url);
      const data: NewsResponse = await response.json();

      if (data.status === 'ok' && data.articles) {
        const articles = data.articles.map((article, index) => ({
          ...article,
          id: this.generateId(article, index),
        }));
        
        this.cache.set(cacheKey, { data: articles, timestamp: Date.now() });
        return articles;
      }
      
      return [];
    } catch (error) {
      console.error('Headlines fetch error:', error);
      return cached?.data || [];
    }
  }

  async searchNews(query: string, pageSize: number = 20): Promise<NewsArticle[]> {
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `${NEWS_API_BASE_URL}/everything?q=${encodedQuery}&language=en&sortBy=publishedAt&pageSize=${pageSize}&apiKey=${NEWS_API_KEY}`;
      
      const response = await fetch(url);
      const data: NewsResponse = await response.json();

      if (data.status === 'ok' && data.articles) {
        return data.articles.map((article, index) => ({
          ...article,
          id: this.generateId(article, index),
        }));
      }
      
      return [];
    } catch (error) {
      console.error('News search error:', error);
      return [];
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

export default new NewsService();
