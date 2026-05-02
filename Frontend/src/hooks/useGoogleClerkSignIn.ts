import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';

/**
 * Starts Clerk Google OAuth — shared by {@link ../components/SignInWithGoogleButton} and onboarding UI.
 */
export function useGoogleClerkSignIn() {
  const { signIn, setActive, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, isLoaded: isSignUpLoaded } = useSignUp();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const signInWithGoogle = useCallback(async () => {
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

  return {
    signInWithGoogle,
    busy,
    message,
    clearMessage: () => setMessage(null),
    ready: isSignInLoaded && isSignUpLoaded,
  };
}
