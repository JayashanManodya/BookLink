import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { api } from '../lib/api';
import type { UserReviewsParams } from '../navigation/sharedScreenTypes';
import { cascadingWhite, dreamland, lead, textSecondary, warmHaze, themePageBg, themePrimary } from '../theme/colors';
import { cardShadow } from '../theme/shadows';
import type { Review } from '../types/review';

type Props = NativeStackScreenProps<{ UserReviews: UserReviewsParams }, 'UserReviews'>;

export function UserReviewsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { clerkUserId, displayName } = route.params;
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ averageRating: number | null; reviewCount: number; reviews: Review[] }>(
        `/api/reviews/user/${encodeURIComponent(clerkUserId)}`
      );
      setAverageRating(res.data.averageRating);
      setReviewCount(res.data.reviewCount ?? 0);
      setReviews(res.data.reviews ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load reviews');
    } finally {
      setLoading(false);
    }
  }, [clerkUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={lead} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
      <Text style={styles.title}>{displayName || 'Reader'} · reviews</Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={themePrimary} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <View style={[styles.summary, cardShadow]}>
            <Text style={styles.summaryLabel}>Average</Text>
            <Text style={styles.summaryVal}>
              {averageRating != null ? `${averageRating} / 5` : '—'} · {reviewCount} review
              {reviewCount === 1 ? '' : 's'}
            </Text>
          </View>
          {reviews.length === 0 ? (
            <Text style={styles.empty}>No reviews yet.</Text>
          ) : (
            reviews.map((r) => (
              <View key={r._id} style={[styles.card, cardShadow]}>
                <Text style={styles.revName}>{r.reviewerDisplayName ?? 'Reader'}</Text>
                <Text style={styles.stars}>{`${r.rating} / 5`}</Text>
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
  flex: { flex: 1, backgroundColor: themePageBg },
  topBar: { paddingHorizontal: 12, paddingBottom: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  backText: { fontSize: 16, fontWeight: '600', color: lead },
  title: { fontSize: 22, fontWeight: '800', color: lead, paddingHorizontal: 20, marginTop: 4 },
  list: { padding: 20, gap: 12, paddingBottom: 40 },
  summary: {
    borderRadius: 20,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    backgroundColor: cascadingWhite,
  },
  summaryLabel: { fontSize: 12, fontWeight: '700', color: warmHaze },
  summaryVal: { marginTop: 6, fontSize: 18, fontWeight: '800', color: lead },
  empty: { fontSize: 15, color: textSecondary },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    backgroundColor: cascadingWhite,
    gap: 8,
  },
  revName: { fontSize: 15, fontWeight: '800', color: lead },
  stars: { fontSize: 14, color: '#b8860b' },
  comment: { fontSize: 14, color: textSecondary, lineHeight: 20 },
  evidence: { width: '100%', height: 140, borderRadius: 12, marginTop: 4, backgroundColor: '#eee' },
  error: { color: '#b3261e', marginHorizontal: 20 },
});
