import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { useAuth } from '@clerk/clerk-expo';
import { useEffect, useRef } from 'react';
import { LandingScreen } from '../screens/LandingScreen';
import { MainTabs } from './MainTabs';
import { navigationRef } from './navigationRef';
import { themePrimary, themePageBg } from '../theme/courseTheme';

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: themePageBg },
};

/** Shows landing until Clerk is ready and the user signs in; then main tabs + API token wiring. */
export function RootGate() {
  const { isSignedIn, isLoaded } = useAuth();
  const prevSignedIn = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof document === 'undefined') return;
    const wasOut = prevSignedIn.current === false;
    prevSignedIn.current = Boolean(isSignedIn);
    if (!wasOut || !isSignedIn) return;
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (active instanceof HTMLElement) active.blur();
    });
  }, [isSignedIn]);

  if (!isLoaded) {
    return (
      <View style={styles.boot}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isSignedIn ? 'dark' : 'light'} />
      {isSignedIn ? (
        <NavigationContainer ref={navigationRef} theme={navTheme}>
          <MainTabs />
        </NavigationContainer>
      ) : (
        <LandingScreen />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themePrimary,
  },
});
