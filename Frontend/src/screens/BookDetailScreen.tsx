import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import type { BrowseStackParamList } from '../navigation/browseStackTypes';
import { SignInWithGoogleButton } from '../components/SignInWithGoogleButton';
import {
  cascadingWhite,
  crunch,
  dreamland,
  lead,
  textSecondary,
  warmHaze,
} from '../theme/colors';
import { cardShadow } from '../theme/shadows';
import type { Book } from '../types/book';

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

export function BookDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { isSignedIn, userId } = useAuth();
  const { bookId } = route.params;
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'details'>('overview');
  const [ratingScore, setRatingScore] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState<number>(0);

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
  const detailSummary = useMemo(() => {
    if (!book) return '';
    const parts = [book.bookType, conditionLabel(book.condition), book.language, book.year ? String(book.year) : '']
      .filter(Boolean)
      .join(' · ');
    return parts || 'Community listing';
  }, [book]);

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
              <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.heroIconBtn}>
                <Ionicons name="chevron-back" size={18} color={cascadingWhite} />
              </Pressable>
              <View style={styles.heroIconBtn}>
                <Ionicons name="bookmark-outline" size={16} color={cascadingWhite} />
              </View>
            </View>
            {book.coverImageUrl ? (
              <Image source={{ uri: book.coverImageUrl }} style={styles.cover} resizeMode="cover" />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="book-outline" size={48} color={cascadingWhite} />
              </View>
            )}
            <View style={styles.heroOverlay}>
              <View>
                <Text style={styles.heroTitle} numberOfLines={1}>
                  {book.title}
                </Text>
                <Text style={styles.heroSub} numberOfLines={1}>
                  <Ionicons name="location-outline" size={11} color="#d7e5f6" /> {book.location || 'Location not specified'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.priceLabel}>Lister rating</Text>
                <Text style={styles.priceValue}>{ratingScore != null ? ratingScore.toFixed(1) : 'N/A'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.tabsRow}>
            <Pressable onPress={() => setActiveTab('overview')}>
              <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextOn]}>Overview</Text>
            </Pressable>
            <Pressable onPress={() => setActiveTab('details')}>
              <Text style={[styles.tabText, activeTab === 'details' && styles.tabTextOn]}>Details</Text>
            </Pressable>
          </View>

          {activeTab === 'overview' ? (
            <>
              <View style={styles.metricsRow}>
                <View style={[styles.metricChip, { backgroundColor: condTheme.bg }]}>
                  <Ionicons name="time-outline" size={13} color={lead} />
                  <Text style={[styles.metricText, { color: condTheme.fg }]}>{book.condition || 'good'}</Text>
                </View>
                <View style={styles.metricChip}>
                  <Ionicons name="book-outline" size={13} color={lead} />
                  <Text style={styles.metricText}>{book.bookType || 'General'}</Text>
                </View>
                <View style={styles.metricChip}>
                  <Ionicons name="star" size={12} color={lead} />
                  <Text style={styles.metricText}>
                    {ratingScore != null ? `${ratingScore.toFixed(1)} (${ratingCount})` : 'No ratings'}
                  </Text>
                </View>
              </View>

              <Text style={styles.bodyText}>
                {book.description?.trim()
                  ? book.description.trim()
                  : `This copy is listed by ${book.ownerDisplayName || 'a community member'} and can be requested directly.`}
              </Text>
            </>
          ) : (
            <View style={styles.detailsCard}>
              <Text style={styles.detailLine}>Author: {book.author}</Text>
              <Text style={styles.detailLine}>Type: {book.bookType || 'General'}</Text>
              <Text style={styles.detailLine}>Condition: {conditionLabel(book.condition) || 'good'}</Text>
              <Text style={styles.detailLine}>Language: {book.language || 'Not specified'}</Text>
              <Text style={styles.detailLine}>Location: {book.location || 'Not specified'}</Text>
              <Text style={styles.detailLine}>Listed by: {book.ownerDisplayName || 'Community member'}</Text>
              <Text style={styles.detailSub}>{detailSummary}</Text>
            </View>
          )}

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
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('RequestExchange', { bookId: book._id, title: book.title })}
            >
              <Text style={styles.primaryBtnText}>Request Exchange</Text>
              <Ionicons name="paper-plane-outline" size={16} color={cascadingWhite} />
            </Pressable>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: cascadingWhite },
  scroll: { paddingHorizontal: 16, paddingBottom: 36, gap: 12 },
  heroCard: {
    borderRadius: 18,
    overflow: 'hidden',
    width: '100%',
    height: 300,
    backgroundColor: '#a8c5e3',
  },
  heroTopIcons: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroIconBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cover: { width: '100%', height: '100%' },
  coverPlaceholder: {
    flex: 1,
    backgroundColor: lead,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6, 27, 48, 0.55)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  heroTitle: { fontSize: 14, fontWeight: '800', color: cascadingWhite },
  heroSub: { marginTop: 2, fontSize: 11, color: '#d7e5f6' },
  priceLabel: { fontSize: 10, color: '#d7e5f6' },
  priceValue: { fontSize: 18, fontWeight: '800', color: cascadingWhite },
  tabsRow: { flexDirection: 'row', gap: 14, marginTop: 2, alignItems: 'center' },
  tabText: { fontSize: 13, color: '#8d8d8d', fontWeight: '700' },
  tabTextOn: { color: lead },
  metricsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f3f3f5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metricText: { fontSize: 12, color: lead, fontWeight: '700', textTransform: 'capitalize' },
  bodyText: { marginTop: 8, fontSize: 12, lineHeight: 18, color: textSecondary },
  detailsCard: {
    marginTop: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  detailLine: { fontSize: 13, color: lead },
  detailSub: { marginTop: 4, fontSize: 12, color: warmHaze },
  ownHint: { fontSize: 14, color: textSecondary },
  primaryBtn: {
    marginTop: 10,
    backgroundColor: '#121212',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '800', color: cascadingWhite },
  error: { color: '#b3261e', fontSize: 14, marginHorizontal: 20 },
  gateBox: {
    marginTop: 8,
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
