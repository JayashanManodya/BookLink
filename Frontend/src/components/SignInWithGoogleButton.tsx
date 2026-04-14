import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { crunch, dreamland, lead, textSecondary } from '../theme/colors';

type Props = {
  label?: string;
};

/**
 * Web: full-page redirect to Google (avoids popup / openAuthSessionAsync, which mobile
 * browsers and preview extensions often block). Native: same flow as @clerk/clerk-expo useOAuth.
 */
export function SignInWithGoogleButton({ label = 'Continue with Google' }: Props) {
  const { signIn, setActive, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, isLoaded: isSignUpLoaded } = useSignUp();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onPress = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (!isSignInLoaded || !isSignUpLoaded || !signIn || !signUp) {
        setMessage('Still loading. Try again in a moment.');
        return;
      }

      const redirectUrl =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? window.location.href
          : AuthSession.makeRedirectUri({ path: 'oauth-native-callback' });

      await signIn.create({
        strategy: 'oauth_google',
        redirectUrl,
      });

      const externalUrl = signIn.firstFactorVerification.externalVerificationRedirectURL?.toString();
      if (!externalUrl) {
        throw new Error('Could not start Google sign-in.');
      }

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.assign(externalUrl);
        return;
      }

      const authSessionResult = await WebBrowser.openAuthSessionAsync(externalUrl, redirectUrl);
      if (authSessionResult.type !== 'success' || !('url' in authSessionResult) || !authSessionResult.url) {
        return;
      }

      const params = new URL(authSessionResult.url).searchParams;
      const rotatingTokenNonce = params.get('rotating_token_nonce') || '';
      await signIn.reload({ rotatingTokenNonce });

      const { status, firstFactorVerification } = signIn;
      let createdSessionId = '';
      if (status === 'complete') {
        createdSessionId = signIn.createdSessionId || '';
      } else if (firstFactorVerification.status === 'transferable') {
        await signUp.create({ transfer: true });
        createdSessionId = signUp.createdSessionId || '';
      }

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Google sign-in failed';
      setMessage(msg);
    } finally {
      setBusy(false);
    }
  }, [isSignInLoaded, isSignUpLoaded, setActive, signIn, signUp]);

  return (
    <View style={styles.wrap}>
      <Pressable style={[styles.btn, busy && styles.btnDisabled]} onPress={onPress} disabled={busy}>
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
