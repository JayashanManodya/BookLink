import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ProfileStackParamList } from '../navigation/profileStackTypes';
import { cascadingWhite, dreamland, lead, textSecondary } from '../theme/colors';
import { cardShadow } from '../theme/shadows';

/** Legacy placeholder; prefer dedicated screens in ProfileStack. */
export function ProfilePlaceholderScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const name = route.name as keyof ProfileStackParamList;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scroll, { paddingTop: Math.max(insets.top, 8) + 8 }]}
    >
      <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={24} color={lead} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>
      <Text style={styles.title}>{String(name)}</Text>
      <View style={[styles.card, cardShadow]}>
        <Text style={styles.body}>This screen is not wired. Use the menu items on your profile.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: cascadingWhite },
  scroll: { paddingHorizontal: 20, paddingBottom: 32, gap: 14 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', marginBottom: 4 },
  backText: { fontSize: 16, fontWeight: '600', color: lead },
  title: { fontSize: 26, fontWeight: '800', color: lead, letterSpacing: -0.4 },
  card: {
    marginTop: 12,
    borderRadius: 24,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    backgroundColor: cascadingWhite,
  },
  body: { fontSize: 15, lineHeight: 22, color: textSecondary },
});
