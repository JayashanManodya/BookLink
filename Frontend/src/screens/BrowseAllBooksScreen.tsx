import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageStyle,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrowseBooksFilterModal, BROWSE_CONDITIONS } from '../components/BrowseBooksFilterModal';
import { BOOK_TYPES } from '../constants/bookTypes';
import { api } from '../lib/api';
import type { BrowseStackParamList } from '../navigation/browseStackTypes';
import {
  cascadingWhite,
} from '../theme/colors';
import {
  themeCard,
  themeGreen,
  themeIllustrationBlue,
  themeInk,
  themeMuted,
  themeOrange,
  themePageBg,
  themePrimary,
} from '../theme/courseTheme';
import { cardShadow } from '../theme/shadows';
import { font } from '../theme/typography';
import type { Book } from '../types/book';

const SEARCH_DEBOUNCE_MS = 380;
const HERO_BOTTOM_RADIUS = 44;

type AdvCondition = (typeof BROWSE_CONDITIONS)[number] | null;

type Props = NativeStackScreenProps<BrowseStackParamList, 'BrowseAllBooks'>;

type ListParams = {
  bookType?: string;
  search?: string;
  condition?: string;
  language?: string;
  yearMin?: number;
  yearMax?: number;
};

type OwnerReviewSummary = { averageRating: number | null; reviewCount: number };

function normalizeConditionLabel(value?: string) {
  if (!value) return '';
  const c = value.toLowerCase().trim();
  return c === 'fair' ? 'poor' : c;
}

function relativeListingAge(iso?: string): string {
  if (!iso) return 'Recently';
  try {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    if (diffMs < 0) return 'Recently';
    const days = Math.floor(diffMs / 86400000);
    if (days < 1) return 'Today';
    if (days === 1) return '1 day';
    if (days < 7) return `${days} days`;
    if (days < 30) return `${Math.floor(days / 7)} wk`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

const SCREEN_W = Dimensions.get('window').width;
const BODY_PAD_H = 20;
const GRID_GAP = 12;
const GRID_CARD_W = (SCREEN_W - BODY_PAD_H * 2 - GRID_GAP) / 2;

export function BrowseAllBooksScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [bookTypeChip, setBookTypeChip] = useState<string | null>(null);
  const [advModalOpen, setAdvModalOpen] = useState(false);
  const [advCondition, setAdvCondition] = useState<AdvCondition>(null);
  const [advLanguage, setAdvLanguage] = useState('');
  const [advYearMin, setAdvYearMin] = useState('');
  const [advYearMax, setAdvYearMax] = useState('');
  const [ownerReviewsById, setOwnerReviewsById] = useState<Record<string, OwnerReviewSummary>>({});

  useEffect(() => {
    const p = route.params;
    if (!p) return;
    if (p.initialSearch !== undefined) setSearchInput(p.initialSearch);
    if (p.initialBookType !== undefined) setBookTypeChip(p.initialBookType || null);
    if (p.initialCondition !== undefined) {
      const c = p.initialCondition?.toLowerCase().trim();
      setAdvCondition(
        c === 'new' || c === 'good' || c === 'poor' ? (c as NonNullable<AdvCondition>) : null
      );
    }
    if (p.initialLanguage !== undefined) setAdvLanguage(p.initialLanguage ?? '');
    if (p.initialYearMin !== undefined) setAdvYearMin(p.initialYearMin ?? '');
    if (p.initialYearMax !== undefined) setAdvYearMax(p.initialYearMax ?? '');
  }, [route.params]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const listParams = useMemo((): ListParams => {
    const params: ListParams = {};
    if (bookTypeChip) params.bookType = bookTypeChip;
    if (debouncedSearch) params.search = debouncedSearch;
    if (advCondition) params.condition = advCondition;
    const lang = advLanguage.trim();
    if (lang) params.language = lang;
    const yMin = advYearMin.trim() ? Number(advYearMin) : NaN;
    const yMax = advYearMax.trim() ? Number(advYearMax) : NaN;
    if (Number.isFinite(yMin)) params.yearMin = yMin;
    if (Number.isFinite(yMax)) params.yearMax = yMax;
    return params;
  }, [bookTypeChip, debouncedSearch, advCondition, advLanguage, advYearMin, advYearMax]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ books: Book[] }>('/api/books', { params: listParams });
      setBooks(res.data.books ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load listings';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [listParams]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isSignedIn || books.length === 0) {
      setOwnerReviewsById({});
      return;
    }
    const ids = [
      ...new Set(books.map((b) => b.ownerClerkUserId).filter((id): id is string => Boolean(id))),
    ];
    let cancelled = false;
    void (async () => {
      const rows = await Promise.all(
        ids.map(async (id) => {
          try {
            const res = await api.get<OwnerReviewSummary>(
              `/api/reviews/user/${encodeURIComponent(id)}`
            );
            const averageRating =
              typeof res.data.averageRating === 'number' ? res.data.averageRating : null;
            const reviewCount =
              typeof res.data.reviewCount === 'number' ? res.data.reviewCount : 0;
            return [id, { averageRating, reviewCount }] as const;
          } catch {
            return [id, { averageRating: null, reviewCount: 0 }] as const;
          }
        })
      );
      if (cancelled) return;
      setOwnerReviewsById(Object.fromEntries(rows));
    })();
    return () => {
      cancelled = true;
    };
  }, [books, isSignedIn]);

  const advancedActiveCount = useMemo(() => {
    let n = 0;
    if (bookTypeChip) n += 1;
    if (advCondition) n += 1;
    if (advLanguage.trim()) n += 1;
    if (advYearMin.trim()) n += 1;
    if (advYearMax.trim()) n += 1;
    return n;
  }, [bookTypeChip, advCondition, advLanguage, advYearMin, advYearMax]);

  const clearQuickFilters = () => {
    setBookTypeChip(null);
  };

  const clearAdvanced = () => {
    setBookTypeChip(null);
    setAdvCondition(null);
    setAdvLanguage('');
    setAdvYearMin('');
    setAdvYearMax('');
  };

  const clearAllFilters = () => {
    setSearchInput('');
    clearAdvanced();
  };

  const hasAnyFilter = !!debouncedSearch || advancedActiveCount > 0;

  const fontBase = useMemo(() => ({ fontFamily: font.regular }), []);

  const renderGridCard = (b: Book) => {
    const ownerId = b.ownerClerkUserId;
    const rev = ownerId ? ownerReviewsById[ownerId] : undefined;
    const listerLine = b.ownerDisplayName?.trim() || 'Community lister';
    const listedLine = relativeListingAge(b.createdAt);
    const authorLine = [b.author?.trim(), b.bookType].filter(Boolean).join(' · ');

    return (
      <Pressable
        onPress={() => navigation.navigate('BookDetail', { bookId: b._id })}
        style={({ pressed }) => [
          styles.gridCard,
          { width: GRID_CARD_W },
          cardShadow,
          pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.popImageWrap}>
          {b.coverImageUrl ? (
            <Image source={{ uri: b.coverImageUrl }} style={styles.popImage as ImageStyle} resizeMode="cover" />
          ) : (
            <View style={styles.popImageFallback}>
              <Ionicons name="book-outline" size={38} color={themePrimary} />
            </View>
          )}
        </View>
        <View style={styles.popBody}>
          <Text style={styles.popTitle} numberOfLines={2}>
            {b.title}
          </Text>
          {authorLine ? (
            <Text style={[styles.popAuthorLine, { fontFamily: font.regular }]} numberOfLines={1}>
              {authorLine}
            </Text>
          ) : null}
          <View style={styles.popListerRow}>
            <Text style={[styles.popListerName, { fontFamily: font.semi }]} numberOfLines={1}>
              {listerLine}
            </Text>
            <Text style={[styles.popListedDate, { fontFamily: font.regular }]}>{listedLine}</Text>
          </View>
          {isSignedIn && ownerId ? (
            <View style={styles.popRatingRow}>
              <Ionicons name="star" size={14} color={themeOrange} />
              {rev === undefined ? (
                <Text style={[styles.popReviewCount, { fontFamily: font.regular }]}>…</Text>
              ) : rev.averageRating != null ? (
                <>
                  <Text style={[styles.popRatingScore, { fontFamily: font.bold }]}>
                    {rev.averageRating.toFixed(1)}
                  </Text>
                  {rev.reviewCount > 0 ? (
                    <Text style={[styles.popReviewCount, { fontFamily: font.regular }]}>
                      ({rev.reviewCount} review{rev.reviewCount === 1 ? '' : 's'})
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text style={[styles.popReviewCount, { fontFamily: font.regular }]}>No reviews yet</Text>
              )}
            </View>
          ) : null}
          <View style={styles.popBadgeRow}>
            {b.condition ? (
              <View style={[styles.miniPill, styles.miniPillGreen]}>
                <Ionicons name="layers-outline" size={12} color={themeGreen} />
                <Text style={styles.miniPillTxt}>{normalizeConditionLabel(b.condition)}</Text>
              </View>
            ) : null}
            {typeof b.year === 'number' ? (
              <View style={[styles.miniPill, styles.miniPillLavender]}>
                <Ionicons name="calendar-outline" size={12} color={themePrimary} />
                <Text style={styles.miniPillTxt}>{b.year}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.heroBlock, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.heroPad}>
          <View style={styles.heroTopRow}>
            <View style={{ width: 44, alignItems: 'flex-start', justifyContent: 'center' }}>
              <Pressable
                style={styles.heroIconBtn}
                onPress={() => navigation.goBack()}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                hitSlop={8}
              >
                <Ionicons name="chevron-back" size={26} color={cascadingWhite} />
              </Pressable>
            </View>
            <Text style={[styles.heroTitle, { fontFamily: font.bold }]} numberOfLines={1}>
              All books
            </Text>
            <View style={styles.heroAddWrap}>
              <Pressable
                accessibilityLabel="List a book"
                onPress={() => navigation.navigate('AddBook')}
                hitSlop={8}
              >
                <View style={[styles.heroIconBtn, styles.heroIconBtnMuted]}>
                  <Ionicons name="add" size={22} color={cascadingWhite} />
                </View>
              </Pressable>
            </View>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchGlass}>
              <Ionicons name="search-outline" size={20} color="rgba(255,255,255,0.92)" />
              <TextInput
                style={[styles.searchInputField, { fontFamily: font.medium }]}
                placeholder="Search anything..."
                placeholderTextColor="rgba(255,255,255,0.65)"
                value={searchInput}
                onChangeText={setSearchInput}
                returnKeyType="search"
                selectionColor={cascadingWhite}
              />
            </View>
            <Pressable
              style={[styles.filterCircle, advancedActiveCount > 0 && styles.filterCircleOn]}
              onPress={() => setAdvModalOpen(true)}
              hitSlop={6}
            >
              <Ionicons name="options-outline" size={20} color={themePrimary} />
            </Pressable>
          </View>
        </View>
      </View>

      <FlatList
        data={books}
        keyExtractor={(b) => b._id}
        numColumns={2}
        keyboardShouldPersistTaps="handled"
        columnWrapperStyle={books.length > 0 ? styles.gridRowWrap : undefined}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 28 },
          books.length <= 2 && loading ? { flexGrow: 1 } : null,
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerBelowHero}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentRow}>
              <Pressable
                onPress={clearQuickFilters}
                style={[styles.segmentChip, !bookTypeChip && styles.segmentChipOn]}
              >
                <Text
                  style={[styles.segmentTxt, !bookTypeChip && styles.segmentTxtOn, { fontFamily: font.semi }]}
                >
                  All
                </Text>
              </Pressable>
              {BOOK_TYPES.map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setBookTypeChip((prev) => (prev === tab ? null : tab))}
                  style={[styles.segmentChip, bookTypeChip === tab && styles.segmentChipOn]}
                >
                  <Text
                    style={[
                      styles.segmentTxt,
                      bookTypeChip === tab && styles.segmentTxtOn,
                      { fontFamily: font.semi },
                    ]}
                  >
                    {tab}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {hasAnyFilter ? (
              <Pressable onPress={clearAllFilters} style={styles.clearAllRow}>
                <Text style={[styles.clearAllTxt, { fontFamily: font.bold }]}>Clear all filters</Text>
                <Ionicons name="close-circle-outline" size={18} color={themePrimary} />
              </Pressable>
            ) : null}

            {loading ? (
              <ActivityIndicator style={{ marginTop: 20, marginBottom: 12 }} color={themePrimary} size="large" />
            ) : null}
            {!loading && error ? (
              <Text style={[styles.error, fontBase, styles.headerMsg]}>{error}</Text>
            ) : null}
            {!loading && !error && books.length === 0 ? (
              <View style={[styles.emptyCard, cardShadow]}>
                <Text style={[styles.muted, fontBase]}>
                  {hasAnyFilter
                    ? 'No books match these filters. Try clearing some options or broadening your search.'
                    : 'No books yet. Be the first to list one from your shelf.'}
                </Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => renderGridCard(item)}
      />

      <BrowseBooksFilterModal
        visible={advModalOpen}
        onClose={() => setAdvModalOpen(false)}
        bookTypeChip={bookTypeChip}
        setBookTypeChip={setBookTypeChip}
        advCondition={advCondition}
        setAdvCondition={setAdvCondition}
        advLanguage={advLanguage}
        setAdvLanguage={setAdvLanguage}
        advYearMin={advYearMin}
        setAdvYearMin={setAdvYearMin}
        advYearMax={advYearMax}
        setAdvYearMax={setAdvYearMax}
        onResetAdvanced={clearAdvanced}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: themePageBg },
  heroBlock: {
    backgroundColor: themePrimary,
    borderBottomLeftRadius: HERO_BOTTOM_RADIUS,
    borderBottomRightRadius: HERO_BOTTOM_RADIUS,
    overflow: 'hidden',
    paddingBottom: 22,
    marginBottom: 4,
  },
  heroPad: {
    paddingHorizontal: 20,
    gap: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  heroTitle: {
    flex: 1,
    fontSize: 18,
    color: cascadingWhite,
    textAlign: 'center',
    letterSpacing: -0.3,
    paddingHorizontal: 4,
  },
  heroIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(30, 22, 80, 0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconBtnMuted: { opacity: 0.92 },
  heroAddWrap: {
    width: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  searchGlass: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: Platform.select({ ios: 12, default: 10 }),
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  searchInputField: {
    flex: 1,
    fontSize: 15,
    color: cascadingWhite,
    paddingVertical: 0,
  },
  filterCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: cascadingWhite,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#101011',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  filterCircleOn: {
    borderWidth: 2,
    borderColor: themeOrange,
  },
  headerBelowHero: {
    paddingHorizontal: BODY_PAD_H,
    paddingTop: 12,
    gap: 6,
  },
  gridRowWrap: {
    gap: GRID_GAP,
    paddingHorizontal: BODY_PAD_H,
    marginBottom: GRID_GAP,
    justifyContent: 'flex-start',
  },
  listContent: {
    paddingTop: 4,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 4,
    paddingBottom: 8,
    paddingRight: 22,
    alignItems: 'center',
  },
  segmentChip: {
    backgroundColor: 'rgba(113,110,255,0.1)',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(113,110,255,0.2)',
  },
  segmentChipOn: {
    backgroundColor: themePrimary,
    borderColor: themePrimary,
  },
  segmentTxt: { fontSize: 13, color: themePrimary },
  segmentTxtOn: { color: cascadingWhite },
  clearAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  clearAllTxt: { fontSize: 14, color: themePrimary },
  headerMsg: { marginBottom: 8, textAlign: 'center' },
  emptyCard: {
    marginTop: 8,
    borderRadius: 26,
    padding: 22,
    backgroundColor: themeCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(113,110,255,0.12)',
  },
  muted: { fontSize: 15, lineHeight: 22, color: themeMuted },
  error: { color: '#c62828', fontSize: 14, marginTop: 8 },

  gridCard: {
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: themeCard,
  },
  cardPressed: { opacity: 0.93, transform: [{ scale: 0.993 }] },
  popImageWrap: {
    height: 130,
    backgroundColor: themeIllustrationBlue,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  popImage: { width: '100%', height: '100%' },
  popImageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popBody: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 6,
  },
  popTitle: {
    fontFamily: font.bold,
    fontSize: 14,
    color: themeInk,
    lineHeight: 19,
    minHeight: 38,
  },
  popAuthorLine: {
    fontSize: 11,
    color: themeMuted,
    marginTop: -2,
    lineHeight: 15,
  },
  popListerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  popListerName: {
    flex: 1,
    fontSize: 11,
    color: themeInk,
    minWidth: 0,
  },
  popListedDate: {
    fontSize: 10,
    color: themeMuted,
    flexShrink: 0,
  },
  popRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  popRatingScore: {
    fontSize: 12,
    color: themeInk,
  },
  popReviewCount: {
    fontSize: 10,
    color: themeMuted,
    flex: 1,
  },
  popBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  miniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  miniPillGreen: { backgroundColor: 'rgba(56,163,54,0.14)' },
  miniPillLavender: { backgroundColor: 'rgba(113,110,255,0.14)' },
  miniPillTxt: {
    fontFamily: font.medium,
    fontSize: 10,
    color: themeMuted,
    textTransform: 'capitalize',
  },
});
