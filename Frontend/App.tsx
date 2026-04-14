import 'react-native-gesture-handler';
import * as WebBrowser from 'expo-web-browser';
import { StatusBar } from 'expo-status-bar';
import { ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MainTabs } from './src/navigation/MainTabs';
import { cascadingWhite, lead } from './src/theme/colors';

WebBrowser.maybeCompleteAuthSession();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: cascadingWhite },
};

export default function App() {
  if (!publishableKey) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingTitle}>Missing Clerk key</Text>
        <Text style={styles.missingBody}>
          Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to Frontend/.env and restart Expo.
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <SafeAreaProvider>
          <NavigationContainer theme={navTheme}>
            <StatusBar style="dark" />
            <MainTabs />
          </NavigationContainer>
        </SafeAreaProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  missing: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: cascadingWhite,
  },
  missingTitle: { fontSize: 20, fontWeight: '800', color: lead, marginBottom: 8 },
  missingBody: { fontSize: 15, color: lead, lineHeight: 22 },
});
