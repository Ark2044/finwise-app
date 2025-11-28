export const TOKEN_KEYS = {
  ACCESS: 'auth_access_token',
  REFRESH: 'auth_refresh_token',
  USER: 'auth_user_data',
  UPI_PROFILE: 'upi_profile_data',
} as const;

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
