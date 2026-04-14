import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, apiErrorMessage } from '../lib/api';
import { confirmDestructive } from '../lib/platformAlert';
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
import type { Review } from '../types/review';

type Props = NativeStackScreenProps<ProfileStackParamList, 'MyReviews'>;

export function MyReviewsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ reviews: Review[] }>('/api/reviews/mine');
      setReviews(res.data.reviews ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = (id: string) => {
    confirmDestructive({
      title: 'Delete review',
      message: 'Remove this review permanently?',
      confirmLabel: 'Delete',
      onConfirm: () =>
        void (async () => {
          try {
            await api.delete(`/api/reviews/${id}`);
            setReviews((prev) => prev.filter((r) => r._id !== id));
          } catch (e: unknown) {
            Alert.alert('Error', apiErrorMessage(e, 'Failed'));
          }
        })(),
    });
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={lead} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
      <Text style={styles.title}>Reviews I gave</Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={crunch} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {reviews.length === 0 ? (
            <Text style={styles.empty}>You have not written any reviews yet.</Text>
          ) : (
            reviews.map((r) => (
              <View key={r._id} style={[styles.card, cardShadow]}>
                <View style={styles.row}>
                  <Text style={styles.meta}>{`${r.rating} / 5`}</Text>
                  <Pressable onPress={() => remove(r._id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={20} color="#b3261e" />
                  </Pressable>
                </View>
                {r.comment ? <Text style={styles.comment}>{r.comment}</Text> : null}
                {r.evidencePhoto ? (
                  <Image source={{ uri: r.evidencePhoto }} style={styles.evidence} resizeMode="cover" />
                ) : null}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: cascadingWhite },
  topBar: { paddingHorizontal: 12, paddingBottom: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  backText: { fontSize: 16, fontWeight: '600', color: lead },
  title: { fontSize: 22, fontWeight: '800', color: lead, paddingHorizontal: 20, marginTop: 4 },
  list: { padding: 20, gap: 12, paddingBottom: 40 },
  empty: { fontSize: 15, color: textSecondary },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    backgroundColor: cascadingWhite,
    gap: 8,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { fontSize: 15, fontWeight: '800', color: lead },
  comment: { fontSize: 14, color: textSecondary, lineHeight: 20 },
  evidence: { width: '100%', height: 120, borderRadius: 12, backgroundColor: '#eee' },
  error: { color: '#b3261e', marginHorizontal: 20 },
});
