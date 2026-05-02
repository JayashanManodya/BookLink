import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import type { BrowseStackParamList } from '../navigation/browseStackTypes';
import { SignInWithGoogleButton } from '../components/SignInWithGoogleButton';
import { cascadingWhite } from '../theme/colors';
import {
  themeGreen,
  themeIllustrationBlue,
  themeInk,
  themeMuted,
  themeOrange,
  themePageBg,
  themePrimary,
  themeCard,
} from '../theme/courseTheme';
import { cardShadow } from '../theme/shadows';
import { font } from '../theme/typography';
import type { Book } from '../types/book';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = NativeStackScreenProps<BrowseStackParamList, 'BookDetail'>;

type DetailTab = 'specs' | 'pickup' | 'about';

function conditionLabel(value?: string) {
  if (!value) return '';
  const c = value.toLowerCase().trim();
  return c === 'fair' ? 'poor' : c;
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
  const [detailTab, setDetailTab] = useState<DetailTab>('specs');

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
  const listedDate = book ? formatListedDate(book.createdAt) : null;
  const ownerName = book?.ownerDisplayName || 'Community member';
  const descRaw = book?.description?.trim() ?? '';
  const descLong = descRaw.length > 220;
  const descShown =
    descRaw && (!descLong || descExpanded) ? descRaw : descLong ? `${descRaw.slice(0, 220).trim()}…` : '';

  const subtitleParts = [book?.author?.trim(), book?.bookType?.trim()].filter(Boolean);
  const subtitle =
    subtitleParts.length > 0 ? subtitleParts.join(' · ') : 'Listed for community swap';

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

  const onShare = async () => {
    if (!book) return;
    try {
      await Share.share({
        title: book.title,
        message: `${book.title} — ${book.author}\n(On BookLink)`,
      });
    } catch {
      /* ignore cancel */
    }
  };

  const cond = conditionLabel(book?.condition);

  const specRows =
    book == null
      ? []
      : [
          {
            title: 'Condition',
            subtitle: cond || 'Not specified',
            rightLabel: '—',
          },
          {
            title: 'Language',
            subtitle: book.language?.trim() || 'Ask the owner',
          },
          {
            title: 'Publication year',
            subtitle:
              book.year != null && Number.isFinite(book.year) ? String(book.year) : 'Not specified',
          },
          {
            title: 'Category',
            subtitle: book.bookType || 'General',
          },
        ];

  function ChapterStyleRow(props: {
    title: string;
    subtitle: string;
    rightLabel?: string;
    locked?: boolean;
    isLast?: boolean;
  }) {
    const { title, subtitle: sub, rightLabel, locked, isLast } = props;
    return (
      <View style={[styles.specRow, isLast && styles.specRowLast]}>
        <View style={[styles.specLeadIcon, locked && styles.specLeadLocked]}>
          {locked ? (
            <Ionicons name="lock-closed" size={16} color={themeMuted} />
          ) : (
            <Ionicons name="checkmark" size={18} color={cascadingWhite} />
          )}
        </View>
        <View style={styles.specRowBody}>
          <Text style={[styles.specRowTitle, { fontFamily: font.bold }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.specRowSub, { fontFamily: font.regular }]} numberOfLines={2}>
            {sub}
          </Text>
        </View>
        <View style={styles.specRowRight}>
          {rightLabel ? (
            <Text style={[styles.specRowMeta, { fontFamily: font.medium }]}>{rightLabel}</Text>
          ) : null}
          <Ionicons name="download-outline" size={20} color={themeMuted} />
        </View>
      </View>
    );
  }

  const tabDefs: { key: DetailTab; label: string }[] = [
    { key: 'specs', label: 'Details' },
    { key: 'pickup', label: 'Meet-up' },
    { key: 'about', label: 'About' },
  ];

  return (
    <View style={styles.flex}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={themePrimary} size="large" />
      ) : error ? (
        <Text style={[styles.error, { fontFamily: font.medium }]}>{error}</Text>
      ) : !book ? null : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: Math.max(insets.top, 12), paddingBottom: 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={14}
              style={({ pressed }) => [styles.topCircle, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-back" size={22} color={themeInk} />
            </Pressable>
            <View style={styles.topBarRight}>
              <Pressable onPress={() => void onShare()} hitSlop={10} style={({ pressed }) => [styles.topCircle, pressed && styles.pressed]}>
                <Ionicons name="share-social-outline" size={20} color={themeInk} />
              </Pressable>
            </View>
          </View>

          <Text style={[styles.pageTitle, { fontFamily: font.extraBold }]}>{book.title}</Text>
          <Text style={[styles.pageSubtitle, { fontFamily: font.regular }]} numberOfLines={3}>
            {subtitle}
          </Text>

          <View style={styles.badgeRow}>
            <View style={styles.badgeMint}>
              <Ionicons name="checkmark-circle" size={16} color={themeGreen} />
              <Text style={[styles.badgeMintTxt, { fontFamily: font.semi }]}>
                {book.listingStatus === 'available' ? 'Swap ready' : 'Swapped'}{' '}
                {cond ? `· ${cond}` : ''}
              </Text>
            </View>
            <View style={styles.badgeLav}>
              <Ionicons name="time-outline" size={16} color={themePrimary} />
              <Text style={[styles.badgeLavTxt, { fontFamily: font.medium }]}>
                {book.year != null && Number.isFinite(book.year) ? `${book.year}` : listedDate ?? 'Recent'}
              </Text>
            </View>
          </View>

          <View style={[styles.heroWrap, cardShadow]}>
            {book.coverImageUrl ? (
              <Image source={{ uri: book.coverImageUrl }} style={styles.cover} resizeMode="cover" />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder]}>
                <Ionicons name="book-outline" size={56} color={themePrimary} />
              </View>
            )}
          </View>

          {descRaw ? (
            <View style={[styles.descBelowHero, cardShadow]}>
              <Text style={[styles.descBelowHeroTitle, { fontFamily: font.bold }]}>Description</Text>
              <Text style={[styles.descBelowHeroBody, { fontFamily: font.regular }]}>{descShown}</Text>
              {descLong ? (
                <Pressable onPress={toggleDesc} style={styles.readMoreBtn} hitSlop={10}>
                  <Text style={[styles.readMoreTxt, { fontFamily: font.bold }]}>
                    {descExpanded ? 'Show less' : 'Read more'}
                  </Text>
                  <Ionicons name={descExpanded ? 'chevron-up' : 'chevron-down'} size={17} color={themePrimary} />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <View style={styles.segmentBar}>
            {tabDefs.map((t) => {
              const active = detailTab === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setDetailTab(t.key)}
                  style={[styles.segmentPill, active && styles.segmentPillActive]}
                >
                  <Text
                    style={[
                      styles.segmentLabel,
                      active && styles.segmentLabelActive,
                      { fontFamily: active ? font.semi : font.medium },
                    ]}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => {
              if (isSignedIn && book.ownerClerkUserId) openReviews();
            }}
            disabled={!isSignedIn || !book.ownerClerkUserId}
            android_ripple={{ color: 'rgba(0,0,0,0.04)' }}
          >
            <LinearGradient colors={['#FFE8F5', '#E8DEFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.mentorCard, cardShadow]}>
              <View style={styles.mentorAvatarWrap}>
                {book.ownerAvatarUrl ? (
                  <Image source={{ uri: book.ownerAvatarUrl }} style={styles.mentorAvatar} />
                ) : (
                  <View style={[styles.mentorAvatar, styles.mentorAvatarFb]}>
                    <Text style={[styles.mentorAvatarTxt, { fontFamily: font.bold }]}>{initialsFromName(ownerName)}</Text>
                  </View>
                )}
              </View>
              <View style={styles.mentorBody}>
                <Text style={[styles.mentorName, { fontFamily: font.bold }]} numberOfLines={1}>
                  {ownerName}
                </Text>
                <Text style={[styles.mentorRole, { fontFamily: font.medium }]}>
                  Listed this book
                  {listedDate ? ` · ${listedDate}` : ''}
                </Text>
                <View style={styles.mentorRatingRow}>
                  <Ionicons name="star" size={14} color={themeOrange} />
                  <Text style={[styles.mentorRatingTxt, { fontFamily: font.semi }]}>
                    {ratingScore != null ? `${ratingScore.toFixed(1)}` : isSignedIn ? 'No rating yet' : 'Sign in'}{' '}
                    {ratingCount > 0 && isSignedIn ? `(${ratingCount} reviews)` : ''}
                  </Text>
                  {isSignedIn && book.ownerClerkUserId ? (
                    <Ionicons name="chevron-forward" size={16} color={themeMuted} style={{ marginLeft: 4 }} />
                  ) : null}
                </View>
              </View>
            </LinearGradient>
          </Pressable>

          {detailTab === 'specs' ? (
            <View style={[styles.listCard, cardShadow]}>
              {specRows.map((row, idx) => (
                <ChapterStyleRow key={row.title + idx} {...row} isLast={idx === specRows.length - 1} />
              ))}
            </View>
          ) : detailTab === 'pickup' ? (
            <View style={[styles.listCard, cardShadow]}>
              <ChapterStyleRow
                title="Meet-up location"
                subtitle={book.location?.trim() || 'Coordinate with the lister after requesting an exchange'}
              />
              {book.handoffPointLabel ? (
                <ChapterStyleRow title="Pickup point" subtitle={book.handoffPointLabel} />
              ) : null}
              <ChapterStyleRow
                title="Availability"
                subtitle={book.listingStatus === 'available' ? 'This copy is accepting requests.' : 'Already exchanged.'}
                isLast
              />
            </View>
          ) : (
            <View style={[styles.aboutWrap, cardShadow]}>
              <Text style={[styles.aboutBody, { fontFamily: font.regular }]}>
                This listing is by {ownerName}. Send an exchange request to connect and arrange pickup.
              </Text>
            </View>
          )}

          {isOwn ? (
            <Text style={[styles.footerHint, { fontFamily: font.regular }]}>
              This is your listing. Manage it from My listings.
            </Text>
          ) : book.listingStatus === 'exchanged' ? (
            <Text style={[styles.footerHint, { fontFamily: font.regular }]}>This book is no longer available.</Text>
          ) : !isSignedIn ? (
            <View style={[styles.gateBox, cardShadow]}>
              <Text style={[styles.gateTitle, { fontFamily: font.bold }]}>Sign in to request this book</Text>
              <Text style={[styles.gateBody, { fontFamily: font.regular }]}>Connect with Google so owners know who is asking.</Text>
              <SignInWithGoogleButton />
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryPressed]}
              onPress={() => navigation.navigate('RequestExchange', { bookId: book._id, title: book.title })}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            >
              <Text style={[styles.primaryBtnText, { fontFamily: font.bold }]}>Request exchange</Text>
              <Ionicons name="paper-plane-outline" size={19} color={cascadingWhite} />
            </Pressable>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: themePageBg },
  scroll: { paddingHorizontal: 22, gap: 14 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: themeCard,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: themeInk,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(142,142,142,0.12)',
  },
  pressed: { opacity: 0.9 },
  pageTitle: {
    fontSize: 26,
    lineHeight: 32,
    color: themeInk,
    letterSpacing: -0.5,
    marginTop: 6,
  },
  pageSubtitle: {
    marginTop: 6,
    fontSize: 15,
    color: themeMuted,
    lineHeight: 22,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  badgeMint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56,163,54,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  badgeMintTxt: { fontSize: 13, color: themeGreen },
  badgeLav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(113,110,255,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  badgeLavTxt: { fontSize: 13, color: themePrimary },
  heroWrap: {
    marginTop: 8,
    borderRadius: 28,
    overflow: 'hidden',
    height: 220,
    backgroundColor: themeIllustrationBlue,
  },
  cover: { width: '100%', height: '100%' },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeIllustrationBlue,
  },
  descBelowHero: {
    marginTop: 4,
    padding: 18,
    borderRadius: 24,
    backgroundColor: themeCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(142,142,142,0.1)',
    gap: 10,
  },
  descBelowHeroTitle: { fontSize: 17, color: themeInk },
  descBelowHeroBody: { fontSize: 15, lineHeight: 24, color: themeMuted },
  segmentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(240,239,245,0.95)',
    borderRadius: 999,
    padding: 6,
    marginTop: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(142,142,142,0.08)',
  },
  segmentPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  segmentPillActive: {
    backgroundColor: themeGreen,
    shadowColor: themeGreen,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segmentLabel: { fontSize: 13, color: themeMuted },
  segmentLabelActive: { color: cascadingWhite },
  mentorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  mentorAvatarWrap: {},
  mentorAvatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3,
    borderColor: cascadingWhite,
  },
  mentorAvatarFb: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(113,110,255,0.35)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(113,110,255,0.55)',
  },
  mentorAvatarTxt: { fontSize: 21, color: cascadingWhite },
  mentorBody: { flex: 1, minWidth: 0 },
  mentorName: { fontSize: 17, color: themeInk },
  mentorRole: { marginTop: 4, fontSize: 13, color: themeMuted },
  mentorRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  mentorRatingTxt: { fontSize: 13, color: themeInk },
  listCard: {
    borderRadius: 24,
    backgroundColor: themeCard,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(142,142,142,0.1)',
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(142,142,142,0.12)',
  },
  specRowLast: {
    borderBottomWidth: 0,
  },
  specLeadIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: themePrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specLeadLocked: { backgroundColor: 'rgba(142,142,142,0.16)' },
  specRowBody: { flex: 1, minWidth: 0 },
  specRowTitle: { fontSize: 16, color: themeInk },
  specRowSub: { marginTop: 3, fontSize: 13, color: themeMuted, lineHeight: 18 },
  specRowRight: { alignItems: 'flex-end', gap: 4 },
  specRowMeta: { fontSize: 12, color: themeMuted },
  aboutWrap: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: themeCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(142,142,142,0.1)',
    gap: 10,
  },
  aboutBody: { fontSize: 15, lineHeight: 24, color: themeMuted },
  readMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 4 },
  readMoreTxt: { fontSize: 14, color: themePrimary },
  footerHint: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    color: themeMuted,
    lineHeight: 20,
  },
  primaryBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: themeGreen,
    borderRadius: 20,
    paddingVertical: 16,
    shadowColor: themeGreen,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryPressed: { opacity: 0.9 },
  primaryBtnText: { fontSize: 16, color: cascadingWhite },
  error: {
    marginTop: 24,
    color: '#b3261e',
    fontSize: 14,
    marginHorizontal: 22,
    textAlign: 'center',
  },
  gateBox: {
    marginTop: 6,
    borderRadius: 24,
    padding: 22,
    backgroundColor: themeCard,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(113,110,255,0.14)',
  },
  gateTitle: { fontSize: 17, color: themeInk },
  gateBody: { fontSize: 14, color: themeMuted, lineHeight: 20 },
});
