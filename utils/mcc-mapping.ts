// MCC (Merchant Category Code) to Spending Category Mapping
// Based on ISO 18245 standard used by BHIM UPI and other payment systems

import { SpendingCategory } from '@/types/upi';

export interface MCCData {
  code: string;
  category: SpendingCategory;
  description: string;
  merchantType: string;
}

// Comprehensive MCC mapping based on Indian payment ecosystem
export const MCC_MAPPING: Record<string, MCCData> = {
  // Food & Dining
  '5411': { code: '5411', category: 'groceries', description: 'Grocery Stores, Supermarkets', merchantType: 'Grocery Store' },
  '5412': { code: '5412', category: 'groceries', description: 'Grocery Stores, Supermarkets', merchantType: 'Supermarket' },
  '5441': { code: '5441', category: 'groceries', description: 'Candy, Nut, and Confectionery Stores', merchantType: 'Confectionery' },
  '5499': { code: '5499', category: 'groceries', description: 'Miscellaneous Food Stores', merchantType: 'Food Store' },
  
  '5811': { code: '5811', category: 'food_dining', description: 'Caterers', merchantType: 'Catering Service' },
  '5812': { code: '5812', category: 'food_dining', description: 'Eating Places, Restaurants', merchantType: 'Restaurant' },
  '5813': { code: '5813', category: 'food_dining', description: 'Drinking Places (Alcoholic Beverages), Bars, Taverns, Cocktail Lounges, Nightclubs and Discotheques', merchantType: 'Bar/Pub' },
  '5814': { code: '5814', category: 'food_dining', description: 'Fast Food Restaurants', merchantType: 'Fast Food' },
  
  // Transport & Fuel
  '4111': { code: '4111', category: 'transport', description: 'Local and Suburban Commuter Passenger Transportation', merchantType: 'Public Transport' },
  '4112': { code: '4112', category: 'transport', description: 'Passenger Railways', merchantType: 'Railway' },
  '4119': { code: '4119', category: 'transport', description: 'Ambulance Services', merchantType: 'Ambulance' },
  '4121': { code: '4121', category: 'transport', description: 'Taxicabs and Limousines', merchantType: 'Taxi/Cab' },
  '4131': { code: '4131', category: 'transport', description: 'Bus Lines', merchantType: 'Bus Service' },
  
  '5541': { code: '5541', category: 'fuel', description: 'Service Stations (with or without Ancillary Services)', merchantType: 'Fuel Station' },
  '5542': { code: '5542', category: 'fuel', description: 'Automated Fuel Dispensers', merchantType: 'Fuel Pump' },
  
  // Shopping & Retail
  '5311': { code: '5311', category: 'shopping', description: 'Department Stores', merchantType: 'Department Store' },
  '5331': { code: '5331', category: 'shopping', description: 'Variety Stores', merchantType: 'Variety Store' },
  '5399': { code: '5399', category: 'shopping', description: 'Miscellaneous General Merchandise', merchantType: 'General Store' },
  '5621': { code: '5621', category: 'shopping', description: 'Women\'s Ready-to-Wear Stores', merchantType: 'Clothing Store' },
  '5631': { code: '5631', category: 'shopping', description: 'Women\'s Accessory and Specialty Shops', merchantType: 'Accessory Store' },
  '5641': { code: '5641', category: 'shopping', description: 'Children\'s and Infants\' Wear Stores', merchantType: 'Kids Clothing' },
  '5651': { code: '5651', category: 'shopping', description: 'Family Clothing Stores', merchantType: 'Clothing Store' },
  '5661': { code: '5661', category: 'shopping', description: 'Shoe Stores', merchantType: 'Shoe Store' },
  '5691': { code: '5691', category: 'shopping', description: 'Men\'s and Women\'s Clothing Stores', merchantType: 'Clothing Store' },
  '5732': { code: '5732', category: 'shopping', description: 'Electronics Stores', merchantType: 'Electronics Store' },
  '5734': { code: '5734', category: 'shopping', description: 'Computer Software Stores', merchantType: 'Software Store' },
  '5735': { code: '5735', category: 'shopping', description: 'Record Stores', merchantType: 'Music Store' },
  '5943': { code: '5943', category: 'shopping', description: 'Stationery, Office and School Supply Stores', merchantType: 'Stationery Store' },
  '5945': { code: '5945', category: 'shopping', description: 'Hobby, Toy, and Game Shops', merchantType: 'Toy Store' },
  '5977': { code: '5977', category: 'shopping', description: 'Cosmetic Stores', merchantType: 'Cosmetics Store' },
  '5995': { code: '5995', category: 'shopping', description: 'Pet Shops, Pet Food, and Supplies', merchantType: 'Pet Store' },
  
  // Entertainment
  '5816': { code: '5816', category: 'entertainment', description: 'Digital Goods Games', merchantType: 'Gaming' },
  '5817': { code: '5817', category: 'entertainment', description: 'Digital Goods Media, Books, Movies, Music', merchantType: 'Digital Media' },
  '7832': { code: '7832', category: 'entertainment', description: 'Motion Picture Theaters', merchantType: 'Movie Theater' },
  '7922': { code: '7922', category: 'entertainment', description: 'Theatrical Producers (except Motion Pictures) and Miscellaneous Entertainers', merchantType: 'Entertainment' },
  '7929': { code: '7929', category: 'entertainment', description: 'Bands, Orchestras, and Miscellaneous Entertainers', merchantType: 'Live Entertainment' },
  '7932': { code: '7932', category: 'entertainment', description: 'Pool and Billiard Halls', merchantType: 'Gaming Lounge' },
  '7933': { code: '7933', category: 'entertainment', description: 'Bowling Alleys', merchantType: 'Bowling' },
  '7941': { code: '7941', category: 'entertainment', description: 'Commercial Sports, Athletic Fields, and Recreation Services', merchantType: 'Sports Club' },
  '7992': { code: '7992', category: 'entertainment', description: 'Public Golf Courses', merchantType: 'Golf Course' },
  '7996': { code: '7996', category: 'entertainment', description: 'Amusement Parks, Carnivals, Circuses, Fortune Tellers', merchantType: 'Amusement Park' },
  '7999': { code: '7999', category: 'entertainment', description: 'Recreation Services', merchantType: 'Recreation' },
  
  // Utilities & Bills
  '4814': { code: '4814', category: 'utilities', description: 'Telecommunication Equipment and Telephone Sales', merchantType: 'Telecom' },
  '4816': { code: '4816', category: 'utilities', description: 'Computer Network Services', merchantType: 'Internet Service' },
  '4821': { code: '4821', category: 'utilities', description: 'Telegraph Services', merchantType: 'Telegraph' },
  '4829': { code: '4829', category: 'utilities', description: 'Wires, Money Orders', merchantType: 'Money Transfer' },
  '4899': { code: '4899', category: 'utilities', description: 'Cable, Satellite, and Other Pay Television and Radio Services', merchantType: 'Cable/Satellite' },
  '4900': { code: '4900', category: 'utilities', description: 'Utilities', merchantType: 'Utility Service' },
  
  '9399': { code: '9399', category: 'bills', description: 'Government Services', merchantType: 'Government Payment' },
  
  // Healthcare
  '8011': { code: '8011', category: 'healthcare', description: 'Doctors', merchantType: 'Doctor' },
  '8021': { code: '8021', category: 'healthcare', description: 'Dentists and Orthodontists', merchantType: 'Dentist' },
  '8031': { code: '8031', category: 'healthcare', description: 'Osteopaths', merchantType: 'Osteopath' },
  '8041': { code: '8041', category: 'healthcare', description: 'Chiropractors', merchantType: 'Chiropractor' },
  '8042': { code: '8042', category: 'healthcare', description: 'Optometrists, Ophthalmologists', merchantType: 'Eye Doctor' },
  '8043': { code: '8043', category: 'healthcare', description: 'Opticians, Eyeglasses, and Contact Lenses', merchantType: 'Optical Shop' },
  '8049': { code: '8049', category: 'healthcare', description: 'Podiatrists and Chiropodists', merchantType: 'Podiatrist' },
  '8050': { code: '8050', category: 'healthcare', description: 'Nursing and Personal Care', merchantType: 'Nursing Care' },
  '8062': { code: '8062', category: 'healthcare', description: 'Hospitals', merchantType: 'Hospital' },
  '8071': { code: '8071', category: 'healthcare', description: 'Medical and Dental Laboratories', merchantType: 'Medical Lab' },
  '8099': { code: '8099', category: 'healthcare', description: 'Medical Services and Health Practitioners', merchantType: 'Healthcare Provider' },
  '5912': { code: '5912', category: 'healthcare', description: 'Drug Stores and Pharmacies', merchantType: 'Pharmacy' },
  
  // Education
  '8211': { code: '8211', category: 'education', description: 'Elementary and Secondary Schools', merchantType: 'School' },
  '8220': { code: '8220', category: 'education', description: 'Colleges, Universities, Professional Schools, and Junior Colleges', merchantType: 'College/University' },
  '8241': { code: '8241', category: 'education', description: 'Correspondence Schools', merchantType: 'Correspondence School' },
  '8244': { code: '8244', category: 'education', description: 'Business and Secretarial Schools', merchantType: 'Business School' },
  '8249': { code: '8249', category: 'education', description: 'Trade and Vocational Schools', merchantType: 'Vocational School' },
  '8299': { code: '8299', category: 'education', description: 'Schools and Educational Services', merchantType: 'Educational Service' },
  '5942': { code: '5942', category: 'education', description: 'Book Stores', merchantType: 'Book Store' },
  
  // Travel
  '3000': { code: '3000', category: 'travel', description: 'United Airlines', merchantType: 'Airline' },
  '3001': { code: '3001', category: 'travel', description: 'American Airlines', merchantType: 'Airline' },
  '3002': { code: '3002', category: 'travel', description: 'Pan American', merchantType: 'Airline' },
  '4511': { code: '4511', category: 'travel', description: 'Airlines, Air Carriers', merchantType: 'Airline' },
  '7011': { code: '7011', category: 'travel', description: 'Hotels, Motels, and Resorts', merchantType: 'Hotel' },
  '7012': { code: '7012', category: 'travel', description: 'Timeshares', merchantType: 'Timeshare' },
  '7033': { code: '7033', category: 'travel', description: 'Trailer Parks and Campgrounds', merchantType: 'Campground' },
  '7512': { code: '7512', category: 'travel', description: 'Car Rental Agencies', merchantType: 'Car Rental' },
  '7513': { code: '7513', category: 'travel', description: 'Truck and Utility Trailer Rentals', merchantType: 'Vehicle Rental' },
  '4722': { code: '4722', category: 'travel', description: 'Travel Agencies and Tour Operators', merchantType: 'Travel Agency' },
  
  // Investments & Financial
  '6012': { code: '6012', category: 'investments', description: 'Merchandise and Services', merchantType: 'Financial Service' },
  '6051': { code: '6051', category: 'investments', description: 'Non-FI, Money Orders', merchantType: 'Money Order' },
  '6211': { code: '6211', category: 'investments', description: 'Security Brokers/Dealers', merchantType: 'Stock Broker' },
  '6300': { code: '6300', category: 'investments', description: 'Insurance Services', merchantType: 'Insurance' },
  
  // Transfers
  '6010': { code: '6010', category: 'transfers', description: 'Financial Institutions', merchantType: 'Bank Transfer' },
  '6011': { code: '6011', category: 'transfers', description: 'Financial Institutions', merchantType: 'Bank' },
  
  // Popular Indian MCCs
  '5999': { code: '5999', category: 'other', description: 'Miscellaneous and Specialty Retail Stores', merchantType: 'Retail Store' },
  '7299': { code: '7299', category: 'other', description: 'Miscellaneous Personal Services', merchantType: 'Personal Service' },
  '8999': { code: '8999', category: 'other', description: 'Professional Services', merchantType: 'Professional Service' },
};

// Function to get category from MCC
export function getCategoryFromMCC(mcc: string): { category: SpendingCategory; merchantType: string } {
  const mccData = MCC_MAPPING[mcc];
  if (mccData) {
    return {
      category: mccData.category,
      merchantType: mccData.merchantType
    };
  }
  
  // Fallback logic for unknown MCCs
  const mccNum = parseInt(mcc);
  
  // Fallback categorization based on MCC ranges
  if (mccNum >= 5411 && mccNum <= 5499) return { category: 'groceries', merchantType: 'Food Store' };
  if (mccNum >= 5811 && mccNum <= 5814) return { category: 'food_dining', merchantType: 'Restaurant' };
  if (mccNum >= 4000 && mccNum <= 4799) return { category: 'transport', merchantType: 'Transportation' };
  if (mccNum >= 5541 && mccNum <= 5542) return { category: 'fuel', merchantType: 'Fuel Station' };
  if (mccNum >= 5000 && mccNum <= 5999) return { category: 'shopping', merchantType: 'Retail Store' };
  if (mccNum >= 7800 && mccNum <= 7999) return { category: 'entertainment', merchantType: 'Entertainment' };
  if (mccNum >= 4800 && mccNum <= 4999) return { category: 'utilities', merchantType: 'Utility Service' };
  if (mccNum >= 8000 && mccNum <= 8099) return { category: 'healthcare', merchantType: 'Healthcare' };
  if (mccNum >= 8200 && mccNum <= 8299) return { category: 'education', merchantType: 'Education' };
  if (mccNum >= 7000 && mccNum <= 7299) return { category: 'travel', merchantType: 'Travel Service' };
  if (mccNum >= 6000 && mccNum <= 6399) return { category: 'investments', merchantType: 'Financial Service' };
  if (mccNum >= 9000 && mccNum <= 9999) return { category: 'bills', merchantType: 'Government/Utility' };
  
  return { category: 'other', merchantType: 'General Merchant' };
}

// Function to extract MCC from UPI QR code
export function extractMCCFromQR(qrData: any): string | null {
  // MCC can come from multiple fields in UPI QR
  if (qrData.mc) return qrData.mc; // Direct merchant code
  if (qrData.merchantCategoryCode) return qrData.merchantCategoryCode;
  if (qrData.mcc) return qrData.mcc;
  
  // Try to extract from additional fields or URL parameters
  if (qrData.url) {
    try {
      const url = new URL(qrData.url);
      const mccParam = url.searchParams.get('mcc') || url.searchParams.get('mc');
      if (mccParam) return mccParam;
    } catch {
      // Invalid URL, ignore
    }
  }
  
  return null;
}

// Popular merchant patterns for better categorization
export const MERCHANT_PATTERNS: Record<string, { category: SpendingCategory; merchantType: string }> = {
  // Food delivery & restaurants
  'swiggy': { category: 'food_dining', merchantType: 'Food Delivery' },
  'zomato': { category: 'food_dining', merchantType: 'Food Delivery' },
  'uber eats': { category: 'food_dining', merchantType: 'Food Delivery' },
  'dominos': { category: 'food_dining', merchantType: 'Fast Food' },
  'kfc': { category: 'food_dining', merchantType: 'Fast Food' },
  'mcdonalds': { category: 'food_dining', merchantType: 'Fast Food' },
  'pizza hut': { category: 'food_dining', merchantType: 'Fast Food' },
  'starbucks': { category: 'food_dining', merchantType: 'Coffee Shop' },
  'cafe coffee day': { category: 'food_dining', merchantType: 'Coffee Shop' },
  
  // Transport
  'uber': { category: 'transport', merchantType: 'Ride Share' },
  'ola': { category: 'transport', merchantType: 'Ride Share' },
  'rapido': { category: 'transport', merchantType: 'Bike Taxi' },
  'metro': { category: 'transport', merchantType: 'Metro Rail' },
  'indian railways': { category: 'transport', merchantType: 'Train' },
  'irctc': { category: 'transport', merchantType: 'Train Booking' },
  
  // Fuel
  'indian oil': { category: 'fuel', merchantType: 'Fuel Station' },
  'bharat petroleum': { category: 'fuel', merchantType: 'Fuel Station' },
  'hindustan petroleum': { category: 'fuel', merchantType: 'Fuel Station' },
  'reliance petrol': { category: 'fuel', merchantType: 'Fuel Station' },
  'shell': { category: 'fuel', merchantType: 'Fuel Station' },
  
  // Shopping
  'amazon': { category: 'shopping', merchantType: 'E-commerce' },
  'flipkart': { category: 'shopping', merchantType: 'E-commerce' },
  'myntra': { category: 'shopping', merchantType: 'Fashion E-commerce' },
  'ajio': { category: 'shopping', merchantType: 'Fashion E-commerce' },
  'nykaa': { category: 'shopping', merchantType: 'Beauty E-commerce' },
  'bigbasket': { category: 'groceries', merchantType: 'Grocery Delivery' },
  'grofers': { category: 'groceries', merchantType: 'Grocery Delivery' },
  'blinkit': { category: 'groceries', merchantType: 'Quick Grocery' },
  'zepto': { category: 'groceries', merchantType: 'Quick Grocery' },
  'reliance digital': { category: 'shopping', merchantType: 'Electronics Store' },
  'croma': { category: 'shopping', merchantType: 'Electronics Store' },
  
  // Entertainment
  'bookmyshow': { category: 'entertainment', merchantType: 'Movie Booking' },
  'netflix': { category: 'entertainment', merchantType: 'Streaming Service' },
  'amazon prime': { category: 'entertainment', merchantType: 'Streaming Service' },
  'disney hotstar': { category: 'entertainment', merchantType: 'Streaming Service' },
  'spotify': { category: 'entertainment', merchantType: 'Music Streaming' },
  'youtube premium': { category: 'entertainment', merchantType: 'Digital Content' },
  
  // Utilities & Bills
  'jio': { category: 'utilities', merchantType: 'Mobile Recharge' },
  'airtel': { category: 'utilities', merchantType: 'Mobile Recharge' },
  'vi': { category: 'utilities', merchantType: 'Mobile Recharge' },
  'bsnl': { category: 'utilities', merchantType: 'Mobile Recharge' },
  'electricity board': { category: 'utilities', merchantType: 'Electricity Bill' },
  'water board': { category: 'utilities', merchantType: 'Water Bill' },
  'gas agency': { category: 'utilities', merchantType: 'Gas Bill' },
  
  // Healthcare
  'apollo': { category: 'healthcare', merchantType: 'Hospital' },
  'max healthcare': { category: 'healthcare', merchantType: 'Hospital' },
  'fortis': { category: 'healthcare', merchantType: 'Hospital' },
  'practo': { category: 'healthcare', merchantType: 'Doctor Consultation' },
  '1mg': { category: 'healthcare', merchantType: 'Online Pharmacy' },
  'pharmeasy': { category: 'healthcare', merchantType: 'Online Pharmacy' },
  'netmeds': { category: 'healthcare', merchantType: 'Online Pharmacy' },
  
  // Education
  'byju': { category: 'education', merchantType: 'Online Learning' },
  'unacademy': { category: 'education', merchantType: 'Online Learning' },
  'vedantu': { category: 'education', merchantType: 'Online Learning' },
  'coursera': { category: 'education', merchantType: 'Online Course' },
  'udemy': { category: 'education', merchantType: 'Online Course' },
};

export function getCategoryFromMerchantName(merchantName: string): { category: SpendingCategory; merchantType: string } | null {
  const lowerName = merchantName.toLowerCase();
  
  for (const [pattern, categoryData] of Object.entries(MERCHANT_PATTERNS)) {
    if (lowerName.includes(pattern)) {
      return categoryData;
    }
  }
  
  return null;
}