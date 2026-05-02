import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cascadingWhite, dreamland, lead, textSecondary, themeSurfaceMuted } from '../theme/colors';
import { cardShadow } from '../theme/shadows';
import { SignInWithGoogleButton } from './SignInWithGoogleButton';

type IonName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  title: string;
  message: string;
  icon?: IonName;
};

export function SignInGateCard({ title, message, icon = 'lock-closed-outline' }: Props) {
  return (
    <View style={[styles.card, cardShadow]}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={28} color={lead} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <SignInWithGoogleButton />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 24,
    backgroundColor: cascadingWhite,
    borderRadius: 24,
    padding: 24,
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: themeSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '800', color: lead, textAlign: 'center' },
  message: { fontSize: 15, lineHeight: 22, color: textSecondary, textAlign: 'center' },
});
