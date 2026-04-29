// Configuration for the application

export const config = {
  // API Configuration
  api: {
    baseURL: (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000/api',
    timeout: 30000,
  },

  // App Configuration
  app: {
    name: 'Digital Eyes',
    version: '0.1.0',
    description: 'AI-powered retail shelf monitoring system',
  },

  // Feature Flags
  features: {
    enableNotifications: true,
    enableOfflineMode: false,
    enableAdvancedAnalytics: false,
  },

  // Image Upload Configuration
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    compressionQuality: 0.8,
  },

  // Analytics Configuration
  analytics: {
    enableTracking: false,
    trackingId: '', // Add your tracking ID
  },
};

export default config;
