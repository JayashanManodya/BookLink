import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoogleBrandSignInButton } from '../components/GoogleBrandSignInButton';
import { useGoogleClerkSignIn } from '../hooks/useGoogleClerkSignIn';
import { cascadingWhite, landingPurple, landingPurpleBlob } from '../theme/colors';
import { fontHandwriting } from '../theme/typography';

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
          <Text style={[styles.headlineLine, styles.headlineBrand]}>BookLink</Text>
        </View>

        <View style={[styles.ctaWrap, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <GoogleBrandSignInButton
            variant="outline"
            onPress={() => void signInWithGoogle()}
            disabled={!ready}
            busy={busy}
          />
          {message ? (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {message}
            </Text>
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
  /** Caveat — same handwritten accent as Browse hero. */
  headlineBrand: {
    fontFamily: fontHandwriting.caveatBold,
    fontSize: 52,
    lineHeight: Platform.select({ ios: 56, default: 54 }),
    letterSpacing: 0.85,
    marginTop: 6,
    textShadowColor: 'rgba(24,14,72,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  ctaWrap: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
    maxWidth: 400,
    alignSelf: 'center',
  },
  error: {
    color: '#fde8ea',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
