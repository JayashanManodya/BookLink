import type { TextStyle } from 'react-native';

/** Loaded via `useFonts` in App — must match @expo-google-fonts/inter exports. */
export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semi: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
} as const;

/** Handwritten accent (Caveat) — loaded alongside Inter in App. */
export const fontHandwriting = {
  caveatBold: 'Caveat_700Bold',
} as const;

export const textFamily = (weight: keyof typeof font): TextStyle => ({
  fontFamily: font[weight],
});
