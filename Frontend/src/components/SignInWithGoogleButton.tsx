import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { crunch, dreamland, lead, textSecondary } from '../theme/colors';
import { useGoogleClerkSignIn } from '../hooks/useGoogleClerkSignIn';

type Props = {
  label?: string;
};

/**
 * Web: full-page redirect to Google (avoids popup / openAuthSessionAsync, which mobile
 * browsers and preview extensions often block). Native: same flow as @clerk/clerk-expo useOAuth.
 */
export function SignInWithGoogleButton({ label = 'Continue with Google' }: Props) {
  const { signInWithGoogle, busy, message } = useGoogleClerkSignIn();

  return (
    <View style={styles.wrap}>
      <Pressable
        style={[styles.btn, busy && styles.btnDisabled]}
        onPress={() => void signInWithGoogle()}
        disabled={busy}
      >
        {busy ? <ActivityIndicator color={lead} /> : <Text style={styles.btnText}>{label}</Text>}
      </Pressable>
      {Platform.OS === 'web' ? (
        <Text style={styles.hint}>Uses a full-page sign-in (no popup), which works better in mobile browsers.</Text>
      ) : null}
      {message ? <Text style={styles.error}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, width: '100%' },
  btn: {
    backgroundColor: crunch,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: lead, fontSize: 16, fontWeight: '800' },
  hint: { fontSize: 12, color: textSecondary, textAlign: 'center', lineHeight: 17 },
  error: { color: '#b3261e', fontSize: 14, textAlign: 'center' },
});
