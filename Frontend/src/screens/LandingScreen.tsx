import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGoogleClerkSignIn } from '../hooks/useGoogleClerkSignIn';
import { landingPurple, landingPurpleBlob, cascadingWhite } from '../theme/colors';

/** Full-screen onboarding before Clerk session — matches branded landing layout. */
export function LandingScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithGoogle, busy, message, ready } = useGoogleClerkSignIn();

  return (
    <View style={styles.root}>
      {/* Decorative blobs */}
      <View pointerEvents="none" style={[styles.blob, styles.blobTopLeft]} />
      <View pointerEvents="none" style={[styles.blob, styles.blobBottomRight]} />

      <View style={[styles.content, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.headlineWrap}>
          <Text style={[styles.headlineLine, styles.headlineSoft]}>Welcome</Text>
          <Text style={[styles.headlineLine, styles.headlineSoft]}>to</Text>
          <Text style={[styles.headlineLine, styles.headlineAccent]}>BookLink</Text>
        </View>

        <View style={[styles.ctaWrap, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log in with Google"
            onPress={() => void signInWithGoogle()}
            disabled={busy || !ready}
            style={({ pressed }) => [styles.ctaOuter, pressed && styles.ctaPressed, busy && styles.ctaDisabled]}
          >
            <Text style={styles.ctaLabel}>Log In</Text>
            <View style={styles.ctaIconCircle}>
              {busy ? (
                <ActivityIndicator color={cascadingWhite} size="small" />
              ) : (
                <Ionicons name="chevron-forward" size={22} color={cascadingWhite} />
              )}
            </View>
          </Pressable>
          {message ? (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {message}
            </Text>
          ) : Platform.OS === 'web' ? (
            <Text style={styles.webHint}>Sign-in opens in full page — works reliably in mobile browsers.</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: landingPurple,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: landingPurpleBlob,
  },
  blobTopLeft: {
    top: -120,
    left: -100,
    transform: [{ scaleX: 1.1 }],
  },
  blobBottomRight: {
    bottom: -140,
    right: -80,
    width: 360,
    height: 360,
    borderRadius: 180,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  headlineWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginBottom: -32,
  },
  headlineLine: {
    fontSize: 42,
    lineHeight: 50,
    textAlign: 'center',
    color: cascadingWhite,
    letterSpacing: -0.5,
  },
  headlineSoft: {
    fontWeight: '500',
    opacity: 0.92,
  },
  headlineAccent: {
    fontWeight: '800',
    marginTop: 2,
  },
  ctaWrap: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
    maxWidth: 400,
    alignSelf: 'center',
  },
  ctaOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: cascadingWhite,
    borderRadius: 999,
    paddingLeft: 32,
    paddingRight: 8,
    paddingVertical: 8,
    minHeight: 58,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaPressed: { opacity: 0.94, transform: [{ scale: 0.994 }] },
  ctaDisabled: { opacity: 0.85 },
  ctaLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: landingPurple,
    letterSpacing: 0.2,
  },
  ctaIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: landingPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: '#fde8ea',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  webHint: {
    color: cascadingWhite,
    opacity: 0.85,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 8,
  },
});
