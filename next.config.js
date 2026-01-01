/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  webpack: (config, { isServer }) => {
    config.resolve.fallback = { 
      fs: false, 
      net: false, 
      tls: false,
      indexedDB: false
    };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    
    // Add indexedDB polyfill for server-side rendering
    if (isServer) {
      config.resolve.fallback.indexedDB = require.resolve('./mocks/indexeddb.js');
    }
    
    // Ignore MetaMask SDK React Native dependencies
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    };
    
    return config;
  },
};

module.exports = nextConfig;
