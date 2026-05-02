import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { useAuth } from '@clerk/clerk-expo';
import { LandingScreen } from '../screens/LandingScreen';
import { MainTabs } from './MainTabs';
import { themePrimary, themePageBg } from '../theme/courseTheme';

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: themePageBg },
};

/** Shows landing until Clerk is ready and the user signs in; then main tabs + API token wiring. */
export function RootGate() {
  const { isSignedIn, isLoaded } = useAuth();

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
        <NavigationContainer theme={navTheme}>
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
