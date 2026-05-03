import 'react-native-gesture-handler';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, type ReactNode } from 'react';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Caveat_700Bold } from '@expo-google-fonts/caveat';
import * as SplashScreen from 'expo-splash-screen';
import { ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootGate } from './src/navigation/RootGate';
import { cascadingWhite, lead } from './src/theme/colors';

WebBrowser.maybeCompleteAuthSession();

void SplashScreen.preventAutoHideAsync().catch(() => {});

function InterFontGate({ children }: { children: ReactNode }) {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Caveat_700Bold,
  });
  useEffect(() => {
    if (loaded) void SplashScreen.hideAsync();
  }, [loaded]);
  if (!loaded) return null;
  return children;
}

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

export default function App() {
  if (!publishableKey) {
    return (
      <InterFontGate>
        <View style={styles.missing}>
          <Text style={styles.missingTitle}>Missing Clerk key</Text>
          <Text style={styles.missingBody}>
            Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY for your build (Frontend/.env locally, or EAS env /
            eas.json for APK). Then rebuild — env is baked in at build time, not read from the phone.
          </Text>
        </View>
      </InterFontGate>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <SafeAreaProvider>
          <InterFontGate>
            <RootGate />
          </InterFontGate>
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
