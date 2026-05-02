import { Platform, StyleSheet, Text, View } from 'react-native';
import { useGoogleClerkSignIn } from '../hooks/useGoogleClerkSignIn';
import { GoogleBrandSignInButton, type GoogleBrandVariant } from './GoogleBrandSignInButton';

type Props = {
  /** Default matches Google’s standard label. */
  variant?: GoogleBrandVariant;
};

/**
 * Web: full-page redirect to Google (avoids popup / openAuthSessionAsync). Native: Clerk OAuth.
 */
export function SignInWithGoogleButton({ variant = 'neutral' }: Props) {
  const { signInWithGoogle, busy, message } = useGoogleClerkSignIn();

  return (
    <View style={styles.wrap}>
      <GoogleBrandSignInButton
        variant={variant}
        onPress={() => void signInWithGoogle()}
        disabled={busy}
        busy={busy}
      />
      {message ? <Text style={styles.error}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, width: '100%' },
  error: { color: '#b3261e', fontSize: 14, textAlign: 'center' },
});
