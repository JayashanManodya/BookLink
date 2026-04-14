import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import type { ProfileStackParamList } from '../navigation/profileStackTypes';
import {
  cascadingWhite,
  crunch,
  dreamland,
  lead,
  textSecondary,
  warmHaze,
} from '../theme/colors';
import { cardShadow } from '../theme/shadows';

type Me = {
  city?: string;
  country?: string;
  area?: string;
};

type Props = NativeStackScreenProps<ProfileStackParamList, 'EditProfile'>;

export function EditProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [area, setArea] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Me>('/api/users/me');
      setCity(res.data.city ?? '');
      setCountry(res.data.country ?? '');
      setArea(res.data.area ?? '');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.patch<Me>('/api/users/me', { city, country, area });
      navigation.goBack();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={lead} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 24) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Edit profile</Text>
        <Text style={styles.subtitle}>Update how others see your general location for swaps.</Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={crunch} />
        ) : (
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.sectionLabel}>Location</Text>
            <Text style={styles.hint}>
              Optional details help readers know your area. Exact address is never shown here.
            </Text>

            <Text style={styles.fieldLabel}>Neighborhood or area</Text>
            <TextInput
              value={area}
              onChangeText={setArea}
              placeholder="e.g. Borella, near Town Hall"
              placeholderTextColor={warmHaze}
              style={styles.input}
              maxLength={200}
            />

            <Text style={styles.fieldLabel}>City</Text>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Colombo"
              placeholderTextColor={warmHaze}
              style={styles.input}
              maxLength={120}
            />

            <Text style={styles.fieldLabel}>Country / region</Text>
            <TextInput
              value={country}
              onChangeText={setCountry}
              placeholder="e.g. Sri Lanka"
              placeholderTextColor={warmHaze}
              style={styles.input}
              maxLength={120}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable style={[styles.saveBtn, saving && styles.saveBtnOff]} onPress={() => void save()} disabled={saving}>
              {saving ? <ActivityIndicator color={lead} /> : <Text style={styles.saveBtnText}>Save location</Text>}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: cascadingWhite },
  topBar: { paddingHorizontal: 12, paddingBottom: 8 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  backText: { fontSize: 16, fontWeight: '600', color: lead },
  scroll: { paddingHorizontal: 20, gap: 12 },
  title: { fontSize: 26, fontWeight: '800', color: lead, letterSpacing: -0.4 },
  subtitle: { fontSize: 15, color: textSecondary, lineHeight: 22, fontWeight: '600' },
  card: {
    marginTop: 8,
    borderRadius: 24,
    padding: 18,
    backgroundColor: cascadingWhite,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: lead,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  hint: { fontSize: 13, color: warmHaze, lineHeight: 19, marginBottom: 4 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: lead },
  input: {
    backgroundColor: '#f3f3f5',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: lead,
  },
  error: { color: '#b3261e', fontSize: 14 },
  saveBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: crunch,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  saveBtnOff: { opacity: 0.7 },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: lead },
});
