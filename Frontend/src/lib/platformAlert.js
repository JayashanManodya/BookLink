import { Alert, Platform } from 'react-native';

/**
 * Single-button alert; on web falls back to `window.alert` then optional callback.
 * @param {string} title
 * @param {string} [message]
 * @param {() => void} [onPress]
 */
export function alertOk(title, message, onPress) {
  const body = message ?? '';
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    window.alert(body ? `${title}\n\n${body}` : title);
    onPress?.();
    return;
  }
  Alert.alert(title, body || undefined, [{ text: 'OK', onPress }]);
}

/**
 * Two-button confirmation for destructive actions. On web uses `window.confirm` (multi-button
 * `Alert.alert` is unreliable there); on iOS/Android uses `Alert.alert`.
 * @param {{ title: string, message?: string, confirmLabel?: string, cancelLabel?: string, confirmStyle?: 'destructive' | 'default', onConfirm: () => void }} opts
 */
export function confirmDestructive({
  title,
  message = '',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  confirmStyle = 'destructive',
  onConfirm,
}) {
  const body = typeof message === 'string' ? message : '';
  if (Platform.OS === 'web') {
    const combined = body ? `${title}\n\n${body}` : title;
    // eslint-disable-next-line no-alert
    if (typeof window !== 'undefined' && window.confirm(combined)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, body || undefined, [
    { text: cancelLabel, style: 'cancel' },
    { text: confirmLabel, style: confirmStyle, onPress: onConfirm },
  ]);
}
