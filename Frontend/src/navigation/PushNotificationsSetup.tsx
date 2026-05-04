import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@clerk/clerk-expo';
import { api } from '../lib/api';
import { navigateToChatFromPushDeferred } from './navigationRef';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('messages', {
    name: 'Messages',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'default',
    bypassDnd: false,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

function readProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  const id = extra?.eas?.projectId;
  return typeof id === 'string' && id.trim() ? id.trim() : undefined;
}

/**
 * Registers for Expo push tokens after sign-in and wires heads-up + sound behavior.
 * Physical Android/iOS device + OS notification permission required for delivery.
 */
export function PushNotificationsSetup() {
  const { isSignedIn, userId } = useAuth();
  const lastRegisteredToken = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    void ensureAndroidChannel();

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const raw = response.notification.request.content.data;
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        navigateToChatFromPushDeferred(raw as Record<string, unknown>);
      }
    });

    let cancelled = false;
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (cancelled || !response?.notification?.request?.content?.data) return;
      const raw = response.notification.request.content.data;
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        navigateToChatFromPushDeferred(raw as Record<string, unknown>);
      }
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    if (!isSignedIn || !userId) {
      lastRegisteredToken.current = null;
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        if (!Device.isDevice) {
          console.info('[push] Push tokens are unreliable on simulators; use a physical device for real alerts.');
        }

        const { status: existing } = await Notifications.getPermissionsAsync();
        let final = existing;
        if (existing !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync({
            ios: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
            },
          });
          final = status;
        }
        if (final !== 'granted') return;

        const projectId = readProjectId();
        if (!projectId) {
          console.warn('[push] Missing extra.eas.projectId in app.json — cannot obtain Expo push token.');
          return;
        }

        const expoPush = await Notifications.getExpoPushTokenAsync({ projectId });
        const token = expoPush.data;
        if (cancelled || !token) return;

        if (lastRegisteredToken.current === token) return;
        lastRegisteredToken.current = token;

        await api.post('/api/push/register', {
          token,
          platform: Platform.OS === 'android' ? 'android' : Platform.OS === 'ios' ? 'ios' : 'unknown',
        });
      } catch (e) {
        console.warn('[push] Registration failed:', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, userId]);

  return null;
}
