import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import type { BrowseStackParamList } from '../navigation/browseStackTypes';
import { SignInWithGoogleButton } from '../components/SignInWithGoogleButton';
import {
  cascadingWhite,
  chineseSilver,
  crunch,
  dreamland,
  lead,
  textSecondary,
  warmHaze,
} from '../theme/colors';
import { cardShadow } from '../theme/shadows';
import type { Book } from '../types/book';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = NativeStackScreenProps<BrowseStackParamList, 'BookDetail'>;

function conditionLabel(value?: string) {
  if (!value) return '';
  const c = value.toLowerCase().trim();
  return c === 'fair' ? 'poor' : c;
}

function conditionStyle(value?: string) {
  const c = conditionLabel(value);
  if (c === 'new') return { bg: '#b8f2c0', fg: '#0f5a28' };
  if (c === 'good') return { bg: '#ffe79d', fg: '#7a5a00' };
  return { bg: '#ffc8c8', fg: '#8a1f1f' };
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return 'R';
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'R';
}

function formatListedDate(iso?: string) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return null;
  }
}

type GlanceRowProps = { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; showDivider: boolean };

function GlanceRow({ icon, label, value, showDivider }: GlanceRowProps) {
  return (
    <View style={[styles.glanceRow, showDivider && styles.glanceRowDivider]}>
      <View style={styles.glanceIconWrap}>
        <Ionicons name={icon} size={18} color={crunch} />
      </View>
      <Text style={styles.glanceRowLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.glanceRowValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export function BookDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { isSignedIn, userId } = useAuth();
  const { bookId } = route.params;
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ratingScore, setRatingScore] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [descExpanded, setDescExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ book: Book }>(`/api/books/${bookId}`);
      setBook(res.data.book);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load book';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const ownerId = book?.ownerClerkUserId;
    if (!ownerId || !isSignedIn) {
      setRatingScore(null);
      setRatingCount(0);
      return;
    }
    let cancelled = false;
    const loadRating = async () => {
      try {
        const res = await api.get<{ averageRating: number | null; reviewCount: number }>(
          `/api/reviews/user/${encodeURIComponent(ownerId)}`
        );
        if (cancelled) return;
        setRatingScore(typeof res.data.averageRating === 'number' ? res.data.averageRating : null);
        setRatingCount(typeof res.data.reviewCount === 'number' ? res.data.reviewCount : 0);
      } catch {
        if (cancelled) return;
        setRatingScore(null);
        setRatingCount(0);
      }
    };
    void loadRating();
    return () => {
      cancelled = true;
    };
  }, [book?.ownerClerkUserId, isSignedIn]);

  const isOwn = Boolean(book && userId && book.ownerClerkUserId === userId);
  const condTheme = conditionStyle(book?.condition);
  const listedDate = book ? formatListedDate(book.createdAt) : null;
  const ownerName = book?.ownerDisplayName || 'Community member';
  const descRaw = book?.description?.trim() ?? '';
  const descLong = descRaw.length > 220;
  const descShown =
    descRaw && (!descLong || descExpanded) ? descRaw : descLong ? `${descRaw.slice(0, 220).trim()}…` : '';

  const openReviews = () => {
    if (!book?.ownerClerkUserId) return;
    navigation.navigate('UserReviews', {
      clerkUserId: book.ownerClerkUserId,
      displayName: ownerName,
    });
  };

  const toggleDesc = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDescExpanded((e) => !e);
  };

  return (
    <View style={styles.flex}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={crunch} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : !book ? null : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: Math.max(insets.top, 8) + 4 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.heroCard, cardShadow]}>
            <View style={styles.heroTopIcons}>
              <Pressable
                onPress={() => navigation.goBack()}
                hitSlop={12}
                style={({ pressed }) => [styles.heroIconBtn, pressed && styles.pressedHeroBtn]}
              >
                <Ionicons name="chevron-back" size={20} color={cascadingWhite} />
              </Pressable>
            </View>
            {book.coverImageUrl ? (
              <Image source={{ uri: book.coverImageUrl }} style={styles.cover} resizeMode="cover" />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="book-outline" size={52} color={cascadingWhite} />
              </View>
            )}
          </View>

          <View style={styles.titleBlock}>
            <Text style={styles.pageTitle}>{book.title}</Text>
            <Text style={styles.pageAuthor}>by {book.author}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.listerCard, cardShadow, pressed && styles.pressedCard]}
            onPress={() => {
              if (isSignedIn && book.ownerClerkUserId) openReviews();
            }}
            disabled={!isSignedIn || !book.ownerClerkUserId}
            android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
          >
            <View style={styles.listerAvatarWrap}>
              {book.ownerAvatarUrl ? (
                <Image source={{ uri: book.ownerAvatarUrl }} style={styles.listerAvatar} />
              ) : (
                <View style={[styles.listerAvatar, styles.listerAvatarFallback]}>
                  <Text style={styles.listerAvatarTxt}>{initialsFromName(ownerName)}</Text>
                </View>
              )}
            </View>
            <View style={styles.listerMeta}>
              <Text style={styles.listerName}>{ownerName}</Text>
              <Text style={styles.listerHint}>Listed this book{listedDate ? ` · ${listedDate}` : ''}</Text>
              <View style={styles.listerRatingRow}>
                <Ionicons name="star" size={16} color="#f4c025" />
                <Text style={styles.listerRatingTxt}>
                  {ratingScore != null ? `${ratingScore.toFixed(1)} out of 5` : isSignedIn ? 'No rating yet' : 'Sign in to see rating'}
                </Text>
              </View>
            </View>
            {isSignedIn && book.ownerClerkUserId ? (
              <View style={styles.listerChevron}>
                <Text style={styles.reviewsLink}>Reviews</Text>
                <Ionicons name="chevron-forward" size={20} color={warmHaze} />
              </View>
            ) : null}
          </Pressable>

          <Text style={styles.sectionLabel}>At a glance</Text>
          <View style={[styles.glanceCard, cardShadow]}>
            <GlanceRow
              icon="sparkles-outline"
              label="Condition"
              value={conditionLabel(book.condition) || 'good'}
              showDivider
            />
            <GlanceRow
              icon="language-outline"
              label="Language"
              value={book.language?.trim() || 'Not specified'}
              showDivider
            />
            <GlanceRow
              icon="calendar-outline"
              label="Year"
              value={book.year != null && Number.isFinite(book.year) ? String(book.year) : 'Not specified'}
              showDivider
            />
            <GlanceRow icon="library-outline" label="Category" value={book.bookType || 'General'} showDivider={false} />
          </View>

          <View style={[styles.locationCard, cardShadow]}>
            <Ionicons name="navigate-outline" size={22} color={crunch} />
            <View style={{ flex: 1 }}>
              <Text style={styles.locationLabel}>Meet-up area</Text>
              <Text style={styles.locationValue}>{book.location?.trim() || 'Ask the lister in your request'}</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>About this copy</Text>
          <View style={[styles.aboutCard, cardShadow]}>
            <Text style={styles.bodyText}>
              {descRaw
                ? descShown
                : `This copy is listed by ${ownerName}. Send a request to start a conversation.`}
            </Text>
            {descLong ? (
              <Pressable onPress={toggleDesc} style={styles.readMoreBtn} hitSlop={8}>
                <Text style={styles.readMoreTxt}>{descExpanded ? 'Show less' : 'Read more'}</Text>
                <Ionicons name={descExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={crunch} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.metricsRow}>
            <View style={[styles.metricChip, { backgroundColor: condTheme.bg }]}>
              <Ionicons name="shield-checkmark-outline" size={14} color={lead} />
              <Text style={[styles.metricText, { color: condTheme.fg }]}>{book.condition || 'good'}</Text>
            </View>
            <View style={styles.metricChip}>
              <Ionicons name="pricetag-outline" size={14} color={lead} />
              <Text style={styles.metricText}>{book.bookType || 'General'}</Text>
            </View>
            <View style={styles.metricChip}>
              <Ionicons name="heart-outline" size={14} color={lead} />
              <Text style={styles.metricText}>{book.listingStatus === 'available' ? 'Available' : 'Exchanged'}</Text>
            </View>
          </View>

          {isOwn ? (
            <Text style={styles.ownHint}>This is your listing. Manage it from My Listings.</Text>
          ) : book.listingStatus === 'exchanged' ? (
            <Text style={styles.ownHint}>This book is no longer available.</Text>
          ) : !isSignedIn ? (
            <View style={[styles.gateBox, cardShadow]}>
              <Text style={styles.gateTitle}>Sign in to request this book</Text>
              <Text style={styles.gateBody}>Connect with Google so owners know who is asking.</Text>
              <SignInWithGoogleButton />
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
              onPress={() => navigation.navigate('RequestExchange', { bookId: book._id, title: book.title })}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            >
              <Text style={styles.primaryBtnText}>Request exchange</Text>
              <Ionicons name="paper-plane-outline" size={18} color={cascadingWhite} />
            </Pressable>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: cascadingWhite },
  scroll: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  heroCard: {
    borderRadius: 22,
    overflow: 'hidden',
    width: '100%',
    height: 300,
    backgroundColor: '#a8c5e3',
  },
  heroTopIcons: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  heroIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedHeroBtn: { opacity: 0.85 },
  cover: { width: '100%', height: '100%' },
  coverPlaceholder: {
    flex: 1,
    backgroundColor: lead,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: { marginTop: 4, gap: 4 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: lead, letterSpacing: -0.4, lineHeight: 30 },
  pageAuthor: { fontSize: 16, fontWeight: '600', color: warmHaze },
  listerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 6,
    padding: 16,
    borderRadius: 20,
    backgroundColor: cascadingWhite,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  pressedCard: { opacity: 0.92 },
  listerAvatarWrap: {},
  listerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: chineseSilver,
  },
  listerAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  listerAvatarTxt: { fontSize: 22, fontWeight: '800', color: lead },
  listerMeta: { flex: 1, minWidth: 0 },
  listerName: { fontSize: 18, fontWeight: '800', color: lead },
  listerHint: { marginTop: 4, fontSize: 13, color: textSecondary, fontWeight: '600' },
  listerRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  listerRatingTxt: { fontSize: 14, fontWeight: '700', color: lead },
  listerChevron: { alignItems: 'flex-end', gap: 2 },
  reviewsLink: { fontSize: 12, fontWeight: '800', color: crunch },
  sectionLabel: {
    marginTop: 18,
    marginBottom: 2,
    fontSize: 13,
    fontWeight: '800',
    color: lead,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  glanceCard: {
    marginTop: 4,
    borderRadius: 18,
    backgroundColor: cascadingWhite,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    overflow: 'hidden',
  },
  glanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  glanceRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: dreamland,
  },
  glanceIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f5f0e6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glanceRowLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: '700',
    color: textSecondary,
  },
  glanceRowValue: {
    flexShrink: 1,
    maxWidth: '46%',
    fontSize: 15,
    fontWeight: '800',
    color: lead,
    textAlign: 'right',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginTop: 4,
    padding: 16,
    borderRadius: 18,
    backgroundColor: cascadingWhite,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  locationLabel: { fontSize: 12, fontWeight: '700', color: warmHaze, textTransform: 'uppercase', letterSpacing: 0.4 },
  locationValue: { marginTop: 4, fontSize: 16, fontWeight: '700', color: lead, lineHeight: 22 },
  aboutCard: {
    marginTop: 4,
    padding: 18,
    borderRadius: 18,
    backgroundColor: cascadingWhite,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    gap: 10,
  },
  bodyText: { fontSize: 15, lineHeight: 24, color: textSecondary, fontWeight: '500' },
  readMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 4 },
  readMoreTxt: { fontSize: 14, fontWeight: '800', color: crunch },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f3f1ed',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  metricText: { fontSize: 12, color: lead, fontWeight: '700', textTransform: 'capitalize' },
  ownHint: { fontSize: 14, color: textSecondary, marginTop: 8, textAlign: 'center' },
  primaryBtn: {
    marginTop: 14,
    backgroundColor: lead,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtnPressed: { opacity: 0.88 },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: cascadingWhite },
  error: { color: '#b3261e', fontSize: 14, marginHorizontal: 20 },
  gateBox: {
    marginTop: 10,
    borderRadius: 20,
    padding: 18,
    backgroundColor: cascadingWhite,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    gap: 12,
  },
  gateTitle: { fontSize: 17, fontWeight: '800', color: lead },
  gateBody: { fontSize: 14, color: textSecondary, lineHeight: 20 },
});
