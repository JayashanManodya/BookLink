import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { cascadingWhite, themePrimary, themeSurfaceMuted } from '../theme/colors';
import { font } from '../theme/typography';
import { GoogleGLogo } from './GoogleGLogo';

export type GoogleBrandVariant = 'outline' | 'neutral' | 'dark' | 'accent';

type Props = {
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: GoogleBrandVariant;
  accessibilityLabel?: string;
};

/** Pill-shaped Google sign-in aligned with Google's button patterns (outline / neutral / dark). */
export function GoogleBrandSignInButton({
  onPress,
  disabled = false,
  busy = false,
  variant = 'neutral',
  accessibilityLabel = 'Sign in with Google',
}: Props) {
  const v = VARIANTS[variant];
  const spinnerColor =
    variant === 'dark' ? cascadingWhite : variant === 'accent' ? themePrimary : v.spinnerColor;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => void onPress()}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.pill,
        v.pill,
        pressed && !(disabled || busy) && styles.pressed,
        (disabled || busy) && styles.disabled,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.logoSlot}>
          {busy ? (
            <ActivityIndicator color={spinnerColor} size="small" />
          ) : (
            <GoogleGLogo size={20} />
          )}
        </View>
        <Text style={[styles.label, { fontFamily: font.medium, color: v.labelColor }]}>
          Sign in with Google
        </Text>
      </View>
    </Pressable>
  );
}

const VARIANTS: Record<
  GoogleBrandVariant,
  { pill: ViewStyle; labelColor: string; spinnerColor: string }
> = {
  outline: {
    pill: {
      backgroundColor: cascadingWhite,
      borderWidth: StyleSheet.hairlineWidth * 2,
      borderColor: '#747775',
    },
    labelColor: '#1f1f1f',
    spinnerColor: '#1f1f1f',
  },
  neutral: {
    pill: {
      backgroundColor: '#f2f2f2',
      borderWidth: 0,
    },
    labelColor: '#1f1f1f',
    spinnerColor: '#1f1f1f',
  },
  dark: {
    pill: {
      backgroundColor: '#131314',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#8e918f',
    },
    labelColor: cascadingWhite,
    spinnerColor: cascadingWhite,
  },
  /** BookLink course UI — purple accent; works on lavender-tint cards (e.g. book detail gate). */
  accent: {
    pill: {
      backgroundColor: themeSurfaceMuted,
      borderWidth: StyleSheet.hairlineWidth * 2,
      borderColor: 'rgba(113, 110, 255, 0.42)',
      shadowColor: themePrimary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.18,
      shadowRadius: 8,
      elevation: 3,
    },
    labelColor: '#1f1f1f',
    spinnerColor: themePrimary,
  },
};

const styles = StyleSheet.create({
  pill: {
    width: '100%',
    minHeight: 48,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
  },
  logoSlot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.993 }] },
  disabled: { opacity: 0.72 },
});
