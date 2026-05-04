import { type ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Platform,
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
import type { UserReviewsParams } from '../navigation/sharedScreenTypes';
import { textFamily } from '../theme/typography';
import type { Review } from '../types/review';

const SCREEN_W = Dimensions.get('window').width;
const REVIEW_CARD_W = SCREEN_W - 40;
const REVIEW_GAP = 14;
const REVIEW_PAGE_STRIDE = REVIEW_CARD_W + REVIEW_GAP;

/** Page-local Skilloom / style-guide palette — other screens untouched. */
const SG = {
  primary: '#716EFF',
  green: '#38A336',
  orange: '#FF8A33',
  ink: '#101011',
  pageBg: '#F3F2FF',
  card: '#FFFFFF',
  muted: 'rgba(16,16,17,0.55)',
  border: 'rgba(113,110,255,0.14)',
};

type Props = NativeStackScreenProps<{ UserReviews: UserReviewsParams }, 'UserReviews'>;

type ListerSummary = {
  displayName: string;
  avatarUrl: string;
  locationSummary: string;
  listingsActive: number;
  exchangesCompleted: number;
  wishlistOpen: number;
  joinedAt: string | null;
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return 'R';
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'R';
}

function formatMemberSince(iso?: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  } catch {
    return null;
  }
}

function cardElevated() {
  return Platform.select({
    ios: {
      shadowColor: SG.ink,
      shadowOpacity: 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 4 },
    default: {},
  });
}

type IonIcon = ComponentProps<typeof Ionicons>['name'];

function StatTile({
  label,
  value,
  icon,
  iconBg,
  iconTint,
}: {
  label: string;
  value: number;
  icon: IonIcon;
  iconBg: string;
  iconTint: string;
}) {
  return (
    <View style={[styles.statTile, cardElevated()]}>
      <View style={[styles.statIconBlob, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconTint} />
      </View>
      <Text style={[styles.statTileVal, textFamily('extraBold')]}>{value}</Text>
      <Text style={[styles.statTileLabel, textFamily('medium')]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function ReviewCarouselDots({
  scrollX,
  pageCount,
  stride,
}: {
  scrollX: Animated.Value;
  pageCount: number;
  stride: number;
}) {
  if (pageCount <= 0) return null;
  if (pageCount === 1) {
    return (
      <View style={reviewDotStyles.row} accessibilityRole="tablist">
        <View
          style={[reviewDotStyles.dot, { width: 22, backgroundColor: SG.primary, opacity: 1 }]}
          accessibilityRole="tab"
          accessibilityLabel="Reviews carousel, slide 1, current"
        />
      </View>
    );
  }
  return (
    <View style={reviewDotStyles.row} accessibilityRole="tablist">
      {Array.from({ length: pageCount }).map((_, index) => (
        <Animated.View
          key={index}
          accessibilityRole="tab"
          accessibilityLabel={`Reviews carousel, slide ${index + 1}`}
          style={[
            reviewDotStyles.dot,
            {
              backgroundColor: SG.primary,
              width: scrollX.interpolate({
                inputRange: [(index - 0.5) * stride, index * stride, (index + 0.5) * stride],
                outputRange: [8, 22, 8],
                extrapolate: 'clamp',
              }),
              opacity: scrollX.interpolate({
                inputRange: [(index - 0.5) * stride, index * stride, (index + 0.5) * stride],
                outputRange: [0.45, 1, 0.45],
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

const reviewDotStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 10,
    paddingBottom: Platform.select({ ios: 2, default: 4 }),
  },
  dot: { height: 8, borderRadius: 4 },
});

export function UserReviewsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { clerkUserId, displayName: paramName, avatarUrl: paramAvatar, listingLocationHint } = route.params;
  const [summary, setSummary] = useState<ListerSummary | null>(null);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setReviewsError(null);
    try {
      const [sumResult, revResult] = await Promise.allSettled([
        api.get<ListerSummary>(`/api/users/${encodeURIComponent(clerkUserId)}/public-summary`),
        api.get<{ averageRating: number | null; reviewCount: number; reviews: Review[] }>(
          `/api/reviews/user/${encodeURIComponent(clerkUserId)}`
        ),
      ]);

      if (sumResult.status === 'fulfilled') {
        setSummary(sumResult.value.data);
      } else {
        setSummary(null);
      }

      if (revResult.status === 'fulfilled') {
        setAverageRating(
          typeof revResult.value.data.averageRating === 'number' ? revResult.value.data.averageRating : null
        );
        setReviewCount(typeof revResult.value.data.reviewCount === 'number' ? revResult.value.data.reviewCount : 0);
        setReviews(revResult.value.data.reviews ?? []);
      } else {
        setReviewsError(apiErrorMessage(revResult.reason, 'Could not load reviews'));
        setAverageRating(null);
        setReviewCount(0);
        setReviews([]);
      }
    } catch (e: unknown) {
      setReviewsError(apiErrorMessage(e, 'Could not load'));
    } finally {
      setLoading(false);
    }
  }, [clerkUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  const displayName = summary?.displayName?.trim() || paramName?.trim() || 'Community lister';
  const avatarUri = (summary?.avatarUrl || paramAvatar || '').trim();
  const locationLine = summary?.locationSummary?.trim() || '';
  const memberSince = formatMemberSince(summary?.joinedAt);

  const reviewsCarouselRef = useRef<ScrollView>(null);
  const reviewsScrollX = useRef(new Animated.Value(0)).current;
  const reviewsIdsKey = useMemo(() => reviews.map((r) => r._id).join('|'), [reviews]);

  useEffect(() => {
    reviewsScrollX.setValue(0);
    reviewsCarouselRef.current?.scrollTo({ x: 0, y: 0, animated: false });
  }, [reviewsIdsKey, reviewsScrollX]);

  const reviewSnapOffsets = useMemo(() => reviews.map((_, i) => i * REVIEW_PAGE_STRIDE), [reviews]);

  const onReviewsScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: reviewsScrollX } } }], {
        useNativeDriver: false,
      }),
    [reviewsScrollX]
  );

  return (
    <View style={[styles.flex, { backgroundColor: SG.pageBg }]}>
      <View
        style={[
          styles.heroHeader,
          {
            paddingTop: Math.max(insets.top, 12),
            backgroundColor: SG.primary,
          },
        ]}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={14} style={styles.headerBackOrb}>
          <Ionicons name="chevron-back" size={22} color={SG.primary} />
        </Pressable>
        <View style={styles.headerTitles}>
          <Text style={[styles.headerTitle, textFamily('extraBold')]}>Lister profile</Text>
          <Text style={[styles.headerSubtitle, textFamily('medium')]} numberOfLines={1}>
            {displayName}
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={SG.primary} size="large" />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.heroCard, cardElevated()]}>
            <View style={styles.avatarRing}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImg} resizeMode="cover" />
              ) : (
                <View style={[styles.avatarImg, styles.avatarFallback]}>
                  <Text style={[styles.avatarInitials, textFamily('extraBold')]}>{initialsFromName(displayName)}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.heroName, textFamily('bold')]}>{displayName}</Text>
            <Text style={[styles.heroMeta, textFamily('regular')]}>
              {memberSince ? (
                <>
                  Member since{' '}
                  <Text style={[styles.heroMetaEm, textFamily('semi')]}>{memberSince}</Text>
                </>
              ) : (
                'Community lister'
              )}
            </Text>

            {listingLocationHint ? (
              <View style={styles.accentChipMint}>
                <Ionicons name="location-outline" size={17} color={SG.green} />
                <Text style={[styles.accentChipTxt, textFamily('semi')]} numberOfLines={3}>
                  This book&apos;s meet-up · {listingLocationHint}
                </Text>
              </View>
            ) : null}

            {locationLine ? (
              <View style={styles.accentChipLav}>
                <Ionicons name="globe-outline" size={17} color={SG.primary} />
                <Text style={[styles.profileLocTxt, textFamily('medium')]} numberOfLines={3}>
                  {locationLine}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.sectionHeading, textFamily('semi'), { marginTop: 6 }]}>Activity</Text>
          <View style={styles.statsGrid}>
            <StatTile
              label="Active listings"
              value={summary?.listingsActive ?? 0}
              icon="book-outline"
              iconBg="rgba(113,110,255,0.18)"
              iconTint={SG.primary}
            />
            <StatTile
              label="Exchanges completed"
              value={summary?.exchangesCompleted ?? 0}
              icon="repeat-outline"
              iconBg="rgba(56,163,54,0.18)"
              iconTint={SG.green}
            />
            <StatTile
              label="Open wanted posts"
              value={summary?.wishlistOpen ?? 0}
              icon="sparkles-outline"
              iconBg="rgba(255,138,51,0.2)"
              iconTint={SG.orange}
            />
            <StatTile label="Reviews" value={reviewCount} icon="star-outline" iconBg="rgba(255,138,51,0.14)" iconTint={SG.orange} />
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeading, textFamily('extraBold')]}>Reviews</Text>
            {!reviewsError ? (
              <View style={styles.avgPill}>
                <Ionicons name="star" size={14} color={SG.orange} />
                <Text style={[styles.avgPillTxt, textFamily('semi')]}>
                  {averageRating != null ? averageRating.toFixed(1) : '—'}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.sectionLead, textFamily('regular')]}>
            Feedback from readers after swaps. Each review is tied to a completed exchange.
          </Text>

          {reviewsError ? (
            <Text style={[styles.warn, textFamily('medium')]}>{reviewsError}</Text>
          ) : (
            <View style={[styles.ratingCard, cardElevated()]}>
              <Text style={[styles.summaryLabel, textFamily('semi')]}>Average rating</Text>
              <Text style={[styles.summaryVal, textFamily('bold')]}>
                {averageRating != null ? `${averageRating.toFixed(1)} / 5` : 'No rating yet'}
                {reviewCount > 0 ? ` · ${reviewCount} written` : ''}
              </Text>
            </View>
          )}

          {!reviewsError && reviews.length === 0 ? (
            <Text style={[styles.empty, textFamily('medium')]}>No reviews yet — be the first after a swap.</Text>
          ) : null}

          {!reviewsError && reviews.length > 0 ? (
            <View style={styles.reviewsCarouselWrap}>
              <Animated.ScrollView
                ref={reviewsCarouselRef}
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                decelerationRate="fast"
                accessibilityLabel="Reviews, scroll sideways"
                snapToOffsets={reviewSnapOffsets}
                snapToEnd={false}
                disableIntervalMomentum
                scrollEventThrottle={16}
                onScroll={onReviewsScroll}
                style={styles.reviewsCarouselRow}
                contentContainerStyle={styles.reviewsCarouselContent}
              >
                {reviews.map((r) => (
                  <View
                    key={r._id}
                    style={[styles.revCarouselCard, cardElevated(), { width: REVIEW_CARD_W }]}
                  >
                    {r.evidencePhoto ? (
                      <Image source={{ uri: r.evidencePhoto }} style={styles.revCarouselEvidence} resizeMode="cover" />
                    ) : (
                      <View style={styles.revCarouselEvidencePlaceholder}>
                        <Ionicons name="star-outline" size={34} color={SG.primary} />
                      </View>
                    )}
                    <View style={styles.revCarouselBody}>
                      <Text style={[styles.revName, textFamily('bold')]} numberOfLines={1}>
                        {r.reviewerDisplayName ?? 'Reader'}
                      </Text>
                      <Text style={[styles.stars, textFamily('semi')]}>{`${r.rating} / 5`}</Text>
                      {r.comment ? (
                        <Text style={[styles.comment, textFamily('regular')]} numberOfLines={7}>
                          {r.comment}
                        </Text>
                      ) : (
                        <Text style={[styles.commentMuted, textFamily('medium')]}>No written comment.</Text>
                      )}
                    </View>
                  </View>
                ))}
              </Animated.ScrollView>
              <ReviewCarouselDots scrollX={reviewsScrollX} pageCount={reviews.length} stride={REVIEW_PAGE_STRIDE} />
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerBackOrb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: SG.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerTitle: { fontSize: 13, letterSpacing: 0.8, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' },
  headerSubtitle: { fontSize: 18, marginTop: 4, color: SG.card },

  scrollContent: { paddingHorizontal: 20, gap: 14, paddingTop: 16 },
  heroCard: {
    backgroundColor: SG.card,
    borderRadius: 28,
    padding: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SG.border,
    alignItems: 'center',
  },
  avatarRing: {
    padding: 4,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: 'rgba(113,110,255,0.35)',
    backgroundColor: SG.card,
  },
  avatarImg: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(113,110,255,0.12)',
    overflow: 'hidden',
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 32, color: SG.primary },

  heroName: {
    marginTop: 14,
    fontSize: 22,
    letterSpacing: -0.4,
    color: SG.ink,
    textAlign: 'center',
  },
  heroMeta: {
    marginTop: 8,
    fontSize: 14,
    color: SG.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  heroMetaEm: { color: SG.ink },

  accentChipMint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(56,163,54,0.11)',
    width: '100%',
  },
  accentChipTxt: { flex: 1, fontSize: 13, color: SG.ink, lineHeight: 19 },

  accentChipLav: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(113,110,255,0.09)',
    width: '100%',
  },
  profileLocTxt: { flex: 1, fontSize: 13, color: SG.muted, lineHeight: 19 },

  sectionHeading: {
    fontSize: 17,
    color: SG.ink,
    letterSpacing: -0.3,
    marginBottom: -4,
    marginTop: 4,
  },
  sectionLead: { fontSize: 13, color: SG.muted, lineHeight: 20 },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  statTile: {
    width: '47%',
    flexGrow: 1,
    minWidth: '45%',
    maxWidth: '48%',
    alignItems: 'center',
    backgroundColor: SG.card,
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SG.border,
    gap: 8,
  },
  statIconBlob: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTileVal: { fontSize: 26, letterSpacing: -0.8, color: SG.ink },
  statTileLabel: { fontSize: 12, color: SG.muted, textAlign: 'center', lineHeight: 16 },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  avgPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: SG.card,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SG.border,
  },
  avgPillTxt: { fontSize: 14, color: SG.ink },

  ratingCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: SG.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SG.border,
    marginTop: 4,
  },
  summaryLabel: { fontSize: 12, color: SG.muted },
  summaryVal: { marginTop: 8, fontSize: 17, color: SG.ink, lineHeight: 24 },

  empty: {
    marginTop: 4,
    fontSize: 14,
    color: SG.muted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },

  reviewsCarouselWrap: {
    marginHorizontal: -20,
  },
  reviewsCarouselRow: {
    flexGrow: 0,
  },
  reviewsCarouselContent: {
    flexDirection: 'row',
    gap: REVIEW_GAP,
    paddingHorizontal: 20,
    paddingTop: Platform.select({ ios: 10, default: 8 }),
    paddingBottom: 10,
    paddingRight: 20,
  },
  revCarouselCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: SG.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SG.border,
  },
  revCarouselEvidence: {
    width: '100%',
    height: 160,
    backgroundColor: SG.pageBg,
  },
  revCarouselEvidencePlaceholder: {
    width: '100%',
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(113,110,255,0.08)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SG.border,
  },
  revCarouselBody: {
    padding: 16,
    gap: 6,
  },
  commentMuted: {
    fontSize: 14,
    color: SG.muted,
    fontStyle: 'italic',
    lineHeight: 20,
  },

  revCard: {
    borderRadius: 24,
    padding: 17,
    backgroundColor: SG.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SG.border,
    gap: 8,
    marginBottom: 2,
  },
  revName: { fontSize: 15, color: SG.ink },
  stars: { fontSize: 14, color: SG.orange },
  comment: { fontSize: 14, color: SG.muted, lineHeight: 21 },
  evidence: {
    width: '100%',
    height: 140,
    borderRadius: 18,
    marginTop: 4,
    backgroundColor: SG.pageBg,
  },
  warn: { fontSize: 14, color: SG.orange, marginTop: 2 },
});
