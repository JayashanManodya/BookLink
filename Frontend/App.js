import React from 'react';
import { ClerkProvider } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
<<<<<<< Updated upstream
import AppNavigator from './src/navigation/AppNavigator';

const tokenCache = {
    async getToken(key) {
        try {
            return SecureStore.getItemAsync(key);
        } catch (err) {
            return null;
        }
    },
    async saveToken(key, value) {
        try {
            return SecureStore.setItemAsync(key, value);
        } catch (err) {
            return;
        }
    },
};

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function App() {
    return (
        <ClerkProvider 
            publishableKey={clerkPublishableKey} 
            tokenCache={tokenCache}
        >
            <AppNavigator />
        </ClerkProvider>
    );
=======
import { Platform, View } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';

const tokenCache = {
  async getToken(key) {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      }
      return SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key, value) {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
        return;
      }
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

export default function App() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      <AppNavigator />
      {/* Satisfies Clerk Bot Detection requirement when testing on web */}
      {Platform.OS === 'web' && (
        <View nativeID="clerk-captcha" style={{ display: 'none' }} />
      )}
    </ClerkProvider>
  );
>>>>>>> Stashed changes
}
