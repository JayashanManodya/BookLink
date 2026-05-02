import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
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
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import type { BrowseStackParamList } from '../navigation/browseStackTypes';
import {
  cascadingWhite,
  chineseSilver,
  dreamland,
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
import { font, fontHandwriting } from '../theme/typography';
import type { Book } from '../types/book';
import type { WishlistItem } from '../types/wishlist';
import { BOOK_TYPES } from '../constants/bookTypes';

const WANTED_SECTION_LIMIT = 12;

const HERO_BOTTOM_RADIUS = 44;
/**
 * Pulls the featured card up onto the rounded purple footer only — must stay *less* than
 * the header's bottom padding + search row height, or the card (painted above the hero in
 * scroll order) covers the search + filter.
 */
const FEATURE_OVERLAP_UP = 46;
/** Extra vertical space between the search row and the top of the Latest card (positive = more gap). */
const GAP_SEARCH_TO_FEATURE_CARD = 18;

const CONDITIONS = ['new', 'good', 'poor'] as const;

const SEARCH_DEBOUNCE_MS = 380;

const SCREEN_W = Dimensions.get('window').width;
const WANTED_GRID_GAP = 12;
const WANTED_CARD_W = (SCREEN_W - 40 - WANTED_GRID_GAP) / 2;
const WANTED_PAGE_STRIDE = WANTED_CARD_W + WANTED_GRID_GAP;
const CARD_W = Math.min(176, Math.max(152, SCREEN_W * 0.42));
const POPULAR_CARD_GAP = 14;
const POPULAR_PAGE_STRIDE = CARD_W + POPULAR_CARD_GAP;

const LATEST_CARD_COUNT = 3;
const LATEST_CARD_W = SCREEN_W - 40;
const LATEST_CARD_GAP = 14;
const LATEST_PAGE_STRIDE = LATEST_CARD_W + LATEST_CARD_GAP;

function normalizeConditionLabel(value?: string) {
  const c = value.toLowerCase().trim();
  return c === 'fair' ? 'poor' : c;
}

function listerInitials(book: Pick<Book, 'ownerDisplayName' | 'author'>) {
  const name = book.ownerDisplayName?.trim() || book.author?.trim() || 'Reader';
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  if (!parts.length) return '?';
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
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

type Props = NativeStackScreenProps<BrowseStackParamList, 'BrowseList'>;

type ListParams = {
  bookType?: string;
  search?: string;
  condition?: string;
  language?: string;
  yearMin?: number;
  yearMax?: number;
};

type OwnerReviewSummary = { averageRating: number | null; reviewCount: number };

export function BrowseListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [bookTypeChip, setBookTypeChip] = useState<string | null>(null);

  const [advModalOpen, setAdvModalOpen] = useState(false);
  const [advCondition, setAdvCondition] = useState<(typeof CONDITIONS)[number] | null>(null);
  const [advLanguage, setAdvLanguage] = useState('');
  const [advYearMin, setAdvYearMin] = useState('');
  const [advYearMax, setAdvYearMax] = useState('');
  const [wantedItems, setWantedItems] = useState<WishlistItem[]>([]);
  const [wantedLoading, setWantedLoading] = useState(false);
  const [ownerReviewsById, setOwnerReviewsById] = useState<Record<string, OwnerReviewSummary>>({});
  const latestScrollX = useRef(new Animated.Value(0)).current;
  const latestCarouselRef = useRef<ScrollView>(null);
  const popularScrollX = useRef(new Animated.Value(0)).current;
  const popularCarouselRef = useRef<ScrollView>(null);
  const wantedScrollX = useRef(new Animated.Value(0)).current;
  const wantedCarouselRef = useRef<ScrollView>(null);

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

  const advancedActiveCount = useMemo(() => {
    let n = 0;
    if (bookTypeChip) n += 1;
    if (advCondition) n += 1;
    if (advLanguage.trim()) n += 1;
    if (advYearMin.trim()) n += 1;
    if (advYearMax.trim()) n += 1;
    return n;
  }, [bookTypeChip, advCondition, advLanguage, advYearMin, advYearMax]);

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

  const loadWanted = useCallback(async () => {
    setWantedLoading(true);
    try {
      const res = await api.get<{ items: WishlistItem[] }>('/api/wishlist');
      const open = (res.data.items ?? []).filter((it) => it.status !== 'fulfilled');
      setWantedItems(open.slice(0, WANTED_SECTION_LIMIT));
    } catch {
      setWantedItems([]);
    } finally {
      setWantedLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      void loadWanted();
    }, [load, loadWanted])
  );

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

  const latestBooks = useMemo(() => {
    if (loading || books.length === 0) return [] as Book[];
    return books.slice(0, Math.min(LATEST_CARD_COUNT, books.length));
  }, [loading, books]);

  const latestBookIdsKey = useMemo(() => latestBooks.map((b) => b._id).join('|'), [latestBooks]);

  useEffect(() => {
    latestScrollX.setValue(0);
    latestCarouselRef.current?.scrollTo({ x: 0, y: 0, animated: false });
  }, [latestBookIdsKey, latestScrollX]);

  const latestSnapOffsets = useMemo(
    () => latestBooks.map((_, i) => i * LATEST_PAGE_STRIDE),
    [latestBooks.length]
  );

  const latestScrollHandler = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: latestScrollX } } }], {
        useNativeDriver: false,
      }),
    [latestScrollX]
  );

  const popularBookIdsKey = useMemo(() => books.map((b) => b._id).join('|'), [books]);

  useEffect(() => {
    popularScrollX.setValue(0);
    popularCarouselRef.current?.scrollTo({ x: 0, y: 0, animated: false });
  }, [popularBookIdsKey, popularScrollX]);

  const popularSnapOffsets = useMemo(
    () => books.map((_, i) => i * POPULAR_PAGE_STRIDE),
    [popularBookIdsKey]
  );

  const popularScrollHandler = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: popularScrollX } } }], {
        useNativeDriver: false,
      }),
    [popularScrollX]
  );

  const wantedBookIdsKey = useMemo(() => wantedItems.map((w) => w._id).join('|'), [wantedItems]);

  useEffect(() => {
    wantedScrollX.setValue(0);
    wantedCarouselRef.current?.scrollTo({ x: 0, y: 0, animated: false });
  }, [wantedBookIdsKey, wantedScrollX]);

  const wantedSnapOffsets = useMemo(
    () => wantedItems.map((_, i) => i * WANTED_PAGE_STRIDE),
    [wantedBookIdsKey]
  );

  const wantedScrollHandler = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: wantedScrollX } } }], {
        useNativeDriver: false,
      }),
    [wantedScrollX]
  );

  const openWantedBoard = () => {
    navigation.getParent()?.navigate('Wishlist', {
      screen: 'WishlistBoard',
      params: { initialTab: 'community' },
    });
  };

  const openWantedDetail = (wishlistItemId: string) => {
    navigation.getParent()?.navigate('Wishlist', {
      screen: 'WantedBookDetail',
      params: { wishlistItemId },
    });
  };

  const renderPopularCard = (b: Book) => {
    const ownerId = b.ownerClerkUserId;
    const rev = ownerId ? ownerReviewsById[ownerId] : undefined;
    const listerLine = b.ownerDisplayName?.trim() || 'Community lister';
    const listedLine = relativeListingAge(b.createdAt);
    const authorLine = [b.author?.trim(), b.bookType].filter(Boolean).join(' · ');

    return (
    <Pressable
      key={b._id}
      onPress={() => navigation.navigate('BookDetail', { bookId: b._id })}
      style={({ pressed }) => [styles.popCard, cardShadow, pressed && styles.cardPressed]}
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

  const fontBase = useMemo(() => ({ fontFamily: font.regular }), []);

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.scrollRoot}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.heroBlock, { paddingTop: Math.max(insets.top, 14) }]}>
          <View style={styles.heroPad}>
            <View style={styles.heroTopRow}>
              <Pressable
                accessibilityLabel="Open filters menu"
                onPress={() => setAdvModalOpen(true)}
                style={styles.heroIconBtn}
                hitSlop={8}
              >
                <Ionicons name="menu" size={22} color={cascadingWhite} />
              </Pressable>
              <Pressable accessibilityLabel="List a book" onPress={() => navigation.navigate('AddBook')} hitSlop={8}>
                <View style={[styles.heroIconBtn, styles.heroIconBtnMuted]}>
                  <Ionicons name="add" size={22} color={cascadingWhite} />
                </View>
              </Pressable>
              <View style={styles.heroTopSpacer} />
              <View style={styles.notifWrap}>
                <Pressable accessibilityLabel="Notifications" style={styles.heroIconBtn}>
                  <Ionicons name="notifications-outline" size={22} color={cascadingWhite} />
                </Pressable>
                <View style={styles.notifDot} pointerEvents="none" />
              </View>
            </View>

            <View style={styles.heroHeadingBlock}>
              <Text
                style={[styles.heroTaglineLine1, { fontFamily: fontHandwriting.caveatBold }]}
                accessibilityRole="header"
              >
                Read it. Share it.
              </Text>
              <Text style={[styles.heroTaglineLine2, { fontFamily: fontHandwriting.caveatBold }]}>
                Discover more.
              </Text>
            </View>

            <View style={styles.searchRow}>
              <View style={styles.searchGlass}>
                <Ionicons name="search-outline" size={20} color="rgba(255,255,255,0.92)" />
                <TextInput
                  style={[styles.searchInput, { fontFamily: font.medium }]}
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

        <View style={[styles.bodyPad, latestBooks.length === 0 && styles.bodyPadNoFeature]}>
          {latestBooks.length > 0 ? (
            <View style={styles.latestFeatureWrap}>
              <Animated.ScrollView
              ref={latestCarouselRef}
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              decelerationRate="fast"
              accessibilityLabel="Latest books, scroll sideways"
              contentContainerStyle={styles.latestCarouselContent}
              style={[styles.latestCarouselRow, styles.featureOverlap]}
              snapToOffsets={latestSnapOffsets}
              snapToEnd={false}
              disableIntervalMomentum
              scrollEventThrottle={16}
              onScroll={latestScrollHandler}
            >
              {latestBooks.map((b) => (
                <Pressable
                  key={b._id}
                  onPress={() => navigation.navigate('BookDetail', { bookId: b._id })}
                  style={({ pressed }) => [
                    styles.latestCard,
                    cardShadow,
                    pressed && styles.cardPressed,
                  ]}
                >
                  <View style={styles.latestImageOuter}>
                      {b.coverImageUrl ? (
                        <Image
                          source={{ uri: b.coverImageUrl }}
                          style={styles.latestImage as ImageStyle}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.latestImageFallback}>
                          <Ionicons name="book-outline" size={42} color={themePrimary} />
                        </View>
                      )}
                      <View style={[styles.liveBadge, { borderColor: themeCard }]}>
                        <Text style={[styles.liveBadgeTxt, { fontFamily: font.bold }]}>Latest</Text>
                      </View>
                    </View>
                    <View style={styles.featureOverlay}>
                      <View style={styles.latestTextCol}>
                        <Text style={[styles.featureCat, { fontFamily: font.bold }]} numberOfLines={2}>
                          {b.title}
                        </Text>
                        <Text style={[styles.featureSubtitle, { fontFamily: font.regular }]} numberOfLines={1}>
                          {b.bookType
                            ? [b.bookType, b.author?.trim()].filter(Boolean).join(' · ')
                            : b.author?.trim() || 'Community listing'}
                        </Text>
                      </View>
                      <View style={styles.featureListerWrap}>
                        {b.ownerAvatarUrl ? (
                          <Image
                            source={{ uri: b.ownerAvatarUrl }}
                            style={styles.featureListerImg as ImageStyle}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.featureListerImg, styles.featureListerFallback]}>
                            <Text style={[styles.featureListerInitials, { fontFamily: font.bold }]}>
                              {listerInitials(b)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </Pressable>
                ))}
            </Animated.ScrollView>
              <CarouselPageDots
                scrollX={latestScrollX}
                pageCount={latestBooks.length}
                stride={LATEST_PAGE_STRIDE}
                carouselName="Latest books"
              />
            </View>
          ) : null}

          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionMainTitle, { fontFamily: font.bold }]}>Popular books</Text>
            <Pressable onPress={() => void load()} hitSlop={8}>
              <Text style={[styles.viewAllTxt, { fontFamily: font.semi }]}>See all</Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.segmentRow}
          >
            <Pressable
              onPress={clearQuickFilters}
              style={[styles.segmentChip, !bookTypeChip && styles.segmentChipOn]}
            >
              <Text style={[styles.segmentTxt, !bookTypeChip && styles.segmentTxtOn, { fontFamily: font.semi }]}>
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
                  style={[styles.segmentTxt, bookTypeChip === tab && styles.segmentTxtOn, { fontFamily: font.semi }]}
                >
                  {tab}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View>
            <Animated.ScrollView
              ref={popularCarouselRef}
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              decelerationRate="fast"
              accessibilityLabel="Popular books, scroll sideways"
              contentContainerStyle={styles.carouselContent}
              style={styles.popularCarouselRow}
              snapToOffsets={popularSnapOffsets}
              snapToEnd={false}
              disableIntervalMomentum
              scrollEventThrottle={16}
              onScroll={popularScrollHandler}
            >
              {books.map((b) => renderPopularCard(b))}
            </Animated.ScrollView>
            <CarouselPageDots
              scrollX={popularScrollX}
              pageCount={books.length}
              stride={POPULAR_PAGE_STRIDE}
              carouselName="Popular books"
            />
          </View>

          {hasAnyFilter ? (
            <Pressable onPress={clearAllFilters} style={styles.clearAllRow}>
              <Text style={[styles.clearAllTxt, { fontFamily: font.bold }]}>Clear all filters</Text>
              <Ionicons name="close-circle-outline" size={18} color={themePrimary} />
            </Pressable>
          ) : null}

          {loading ? (
            <ActivityIndicator style={{ marginTop: 28 }} color={themePrimary} size="large" />
          ) : error ? (
            <Text style={[styles.error, fontBase]}>{error}</Text>
          ) : books.length === 0 ? (
            <View style={[styles.emptyCard, cardShadow]}>
              <Text style={[styles.muted, fontBase]}>
                {hasAnyFilter
                  ? 'No books match these filters. Try clearing some options or broadening your search.'
                  : 'No books yet. Be the first to list one from your shelf.'}
              </Text>
            </View>
          ) : null}

          {wantedLoading || wantedItems.length > 0 ? (
            <View style={styles.wantedSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionMainTitle, { fontFamily: font.bold }]}>Wanted books</Text>
                <Pressable onPress={openWantedBoard} hitSlop={8}>
                  <Text style={[styles.viewAllTxt, { fontFamily: font.semi }]}>Board</Text>
                </Pressable>
              </View>
              <Text style={[styles.wantedSub, { fontFamily: font.regular }]}>
                Readers looking for titles — tap a card to offer help.
              </Text>
              {wantedLoading && wantedItems.length === 0 ? (
                <ActivityIndicator style={{ marginVertical: 14 }} color={themeGreen} />
              ) : (
                <View>
                  <Animated.ScrollView
                    ref={wantedCarouselRef}
                    horizontal
                    nestedScrollEnabled
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    decelerationRate="fast"
                    accessibilityLabel="Wanted books, scroll sideways"
                    contentContainerStyle={styles.wantedCarouselContent}
                    style={styles.wantedCarouselRow}
                    snapToOffsets={wantedSnapOffsets}
                    snapToEnd={false}
                    disableIntervalMomentum
                    scrollEventThrottle={16}
                    onScroll={wantedScrollHandler}
                  >
                    {wantedItems.map((w) => {
                      const subjectLine = w.subject?.trim() || w.author?.trim() || 'Request';
                      return (
                        <Pressable
                          key={w._id}
                          onPress={() => openWantedDetail(w._id)}
                          style={({ pressed }) => [
                            styles.wantedCardOuter,
                            cardShadow,
                            pressed && styles.cardPressed,
                          ]}
                        >
                          <View style={styles.wantedThumbWrap}>
                            {w.wantedBookPhoto ? (
                              <Image
                                source={{ uri: w.wantedBookPhoto }}
                                style={styles.wantedThumbImg as ImageStyle}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={styles.wantedThumbPh}>
                                <Ionicons name="book-outline" size={36} color={themePrimary} />
                              </View>
                            )}
                          </View>
                          <View style={styles.wantedCardInner}>
                            <Text style={[styles.wantedGridTitle, { fontFamily: font.bold }]} numberOfLines={2}>
                              {w.title}
                            </Text>
                            <View style={styles.wantedMetaRow}>
                              <View style={styles.wantedMetaLeft}>
                                <Ionicons name="layers-outline" size={14} color={themeGreen} />
                                <Text style={[styles.wantedMetaTxt, { fontFamily: font.medium }]} numberOfLines={1}>
                                  {subjectLine}
                                </Text>
                              </View>
                              <View style={styles.wantedMetaRight}>
                                <Ionicons name="time-outline" size={14} color={themePrimary} />
                                <Text style={[styles.wantedMetaTime, { fontFamily: font.medium }]}>
                                  {relativeListingAge(w.createdAt)}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </Animated.ScrollView>
                  <CarouselPageDots
                    scrollX={wantedScrollX}
                    pageCount={wantedItems.length}
                    stride={WANTED_PAGE_STRIDE}
                    carouselName="Wanted books"
                  />
                </View>
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Modal
        visible={advModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setAdvModalOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setAdvModalOpen(false)} />
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontFamily: font.extraBold }]}>Advanced filters</Text>
              <Pressable onPress={() => setAdvModalOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={26} color={themeInk} />
              </Pressable>
            </View>
            <Text style={[styles.modalHint, { fontFamily: font.regular }]}>
              Combine with the search bar. Book type mirrors the category chips under Popular books.
            </Text>

            <ScrollView
              style={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.advLabel, { fontFamily: font.semi }]}>Book type</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={styles.advBookTypeScroll}
                contentContainerStyle={styles.advBookTypeScrollContent}
              >
                <Pressable
                  onPress={() => setBookTypeChip(null)}
                  style={[styles.advChip, !bookTypeChip && styles.advChipOn]}
                >
                  <Text
                    style={[styles.advChipTxt, !bookTypeChip && styles.advChipTxtOn, { fontFamily: font.medium }]}
                  >
                    Any
                  </Text>
                </Pressable>
                {BOOK_TYPES.map((tab) => (
                  <Pressable
                    key={tab}
                    onPress={() => setBookTypeChip((prev) => (prev === tab ? null : tab))}
                    style={[styles.advChip, bookTypeChip === tab && styles.advChipOn]}
                  >
                    <Text
                      style={[styles.advChipTxt, bookTypeChip === tab && styles.advChipTxtOn, { fontFamily: font.medium }]}
                    >
                      {tab}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={[styles.advLabel, { fontFamily: font.semi }]}>Condition</Text>
              <View style={styles.chipWrap}>
                <Pressable
                  onPress={() => setAdvCondition(null)}
                  style={[styles.advChip, !advCondition && styles.advChipOn]}
                >
                  <Text
                    style={[styles.advChipTxt, !advCondition && styles.advChipTxtOn, { fontFamily: font.medium }]}
                  >
                    Any
                  </Text>
                </Pressable>
                {CONDITIONS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setAdvCondition((prev) => (prev === c ? null : c))}
                    style={[styles.advChip, advCondition === c && styles.advChipOn]}
                  >
                    <Text
                      style={[styles.advChipTxt, advCondition === c && styles.advChipTxtOn, { fontFamily: font.medium }]}
                    >
                      {c}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.advLabel, { fontFamily: font.semi }]}>Language</Text>
              <TextInput
                style={[styles.advInput, { fontFamily: font.regular }]}
                placeholder="e.g. English, Sinhala"
                placeholderTextColor={themeMuted}
                value={advLanguage}
                onChangeText={setAdvLanguage}
              />

              <Text style={[styles.advLabel, { fontFamily: font.semi }]}>Publication year</Text>
              <View style={styles.yearRow}>
                <TextInput
                  style={[styles.advInput, styles.yearInput, { fontFamily: font.regular }]}
                  placeholder="From"
                  placeholderTextColor={themeMuted}
                  value={advYearMin}
                  onChangeText={setAdvYearMin}
                  keyboardType="number-pad"
                />
                <Text style={[styles.yearDash, { fontFamily: font.medium }]}>–</Text>
                <TextInput
                  style={[styles.advInput, styles.yearInput, { fontFamily: font.regular }]}
                  placeholder="To"
                  placeholderTextColor={themeMuted}
                  value={advYearMax}
                  onChangeText={setAdvYearMax}
                  keyboardType="number-pad"
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.modalBtnGhost]} onPress={clearAdvanced}>
                <Text style={[styles.modalBtnGhostTxt, { fontFamily: font.bold }]}>Reset panel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={() => setAdvModalOpen(false)}>
                <Text style={[styles.modalBtnPrimaryTxt, { fontFamily: font.bold }]}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: themePageBg },
  scrollRoot: { flex: 1, backgroundColor: themePageBg },
  scroll: { flexGrow: 1 },
  heroBlock: {
    backgroundColor: themePrimary,
    borderBottomLeftRadius: HERO_BOTTOM_RADIUS,
    borderBottomRightRadius: HERO_BOTTOM_RADIUS,
    overflow: 'hidden',
    paddingBottom: 30,
  },
  heroPad: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 18,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    position: 'relative',
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
  heroTopSpacer: { flex: 1 },
  notifWrap: { position: 'relative' },
  notifDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: themeGreen,
    borderWidth: 2,
    borderColor: themePrimary,
  },
  heroHeadingBlock: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 2,
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 2,
  },
  heroTaglineLine1: {
    color: cascadingWhite,
    textAlign: 'center',
    alignSelf: 'stretch',
    fontSize: 34,
    lineHeight: Platform.select({ ios: 40, default: 38 }),
    letterSpacing: 0.75,
    textShadowColor: 'rgba(24,14,72,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  heroTaglineLine2: {
    marginTop: 0,
    color: cascadingWhite,
    textAlign: 'center',
    alignSelf: 'stretch',
    fontSize: 52,
    lineHeight: Platform.select({ ios: 56, default: 52 }),
    letterSpacing: 1,
    textShadowColor: 'rgba(24,14,72,0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
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
  searchInput: {
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
  bodyPad: {
    paddingHorizontal: 20,
    marginTop: 0,
    gap: 16,
    backgroundColor: themePageBg,
    paddingBottom: 8,
  },
  bodyPadNoFeature: {
    paddingTop: 14,
  },
  wantedSection: {
    gap: 8,
    marginTop: 8,
    paddingBottom: 12,
  },
  wantedSub: {
    fontSize: 13,
    color: themeMuted,
    lineHeight: 18,
    marginTop: -4,
    marginBottom: 4,
  },
  wantedCarouselRow: {
    flexGrow: 0,
  },
  wantedCarouselContent: {
    flexDirection: 'row',
    gap: WANTED_GRID_GAP,
    paddingRight: 24,
    paddingVertical: 4,
  },
  wantedCardOuter: {
    width: WANTED_CARD_W,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: themeCard,
  },
  wantedThumbWrap: {
    width: '100%',
    aspectRatio: 1.12,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
    backgroundColor: themeIllustrationBlue,
    position: 'relative',
  },
  wantedThumbImg: {
    width: '100%',
    height: '100%',
  },
  wantedThumbPh: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(113,110,255,0.08)',
  },
  wantedCardInner: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 6,
  },
  wantedGridTitle: {
    fontSize: 14,
    color: themeInk,
    lineHeight: 19,
  },
  wantedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
  },
  wantedMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    minWidth: 0,
  },
  wantedMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  wantedMetaTxt: {
    flex: 1,
    fontSize: 11,
    color: themeInk,
    minWidth: 0,
  },
  wantedMetaTime: {
    fontSize: 11,
    color: themeMuted,
  },
  latestFeatureWrap: {
    marginHorizontal: -20,
  },
  latestDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 6,
    paddingBottom: Platform.select({ ios: 2, default: 4 }),
  },
  latestDot: {
    height: 8,
    borderRadius: 4,
  },
  featureOverlap: {
    marginTop: -FEATURE_OVERLAP_UP + GAP_SEARCH_TO_FEATURE_CARD,
    zIndex: 4,
    elevation: 8,
  },
  latestCarouselRow: {
    flexGrow: 0,
  },
  latestCarouselContent: {
    flexDirection: 'row',
    gap: LATEST_CARD_GAP,
    paddingHorizontal: 20,
    paddingTop: Platform.select({ ios: 10, default: 8 }),
    paddingBottom: 14,
    paddingRight: 20,
  },
  latestCard: {
    width: LATEST_CARD_W,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: themeCard,
  },
  latestImageOuter: {
    height: 200,
    backgroundColor: themeIllustrationBlue,
    position: 'relative',
  },
  latestImage: {
    width: '100%',
    height: '100%',
  },
  latestImageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeIllustrationBlue,
  },
  latestTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  liveBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: themeOrange,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 2,
  },
  liveBadgeTxt: {
    fontSize: 11,
    color: cascadingWhite,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  featureOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  featureCat: {
    fontSize: 17,
    color: themeInk,
  },
  featureSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: themeMuted,
  },
  featureListerWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    padding: 3,
    backgroundColor: cascadingWhite,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: themeInk,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  featureListerImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(113,110,255,0.22)',
    overflow: 'hidden',
  },
  featureListerFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(113,110,255,0.35)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(113,110,255,0.55)',
  },
  featureListerInitials: {
    fontSize: 17,
    color: themeInk,
    letterSpacing: -0.3,
  },
  sectionHeaderRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionMainTitle: { fontSize: 18, color: themeInk, letterSpacing: -0.3 },
  viewAllTxt: { fontSize: 14, color: themePrimary },
  carouselContent: {
    flexDirection: 'row',
    gap: POPULAR_CARD_GAP,
    paddingRight: 24,
    paddingVertical: 4,
  },
  popularCarouselRow: {
    flexGrow: 0,
  },
  popCard: {
    width: CARD_W,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: themeCard,
  },
  cardPressed: { opacity: 0.93, transform: [{ scale: 0.993 }] },
  popImageWrap: {
    height: 130,
    backgroundColor: themeIllustrationBlue,
    position: 'relative',
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
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 8,
  },
  popTitle: {
    fontFamily: font.bold,
    fontSize: 15,
    color: themeInk,
    lineHeight: 21,
    minHeight: 42,
  },
  popAuthorLine: {
    fontSize: 12,
    color: themeMuted,
    marginTop: -4,
    lineHeight: 16,
  },
  popListerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  popListerName: {
    flex: 1,
    fontSize: 12,
    color: themeInk,
    minWidth: 0,
  },
  popListedDate: {
    fontSize: 11,
    color: themeMuted,
    flexShrink: 0,
  },
  popRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  popRatingScore: {
    fontSize: 13,
    color: themeInk,
  },
  popReviewCount: {
    fontSize: 11,
    color: themeMuted,
    flex: 1,
  },
  popBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  miniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  miniPillGreen: { backgroundColor: 'rgba(56,163,54,0.14)' },
  miniPillLavender: { backgroundColor: 'rgba(113,110,255,0.14)' },
  miniPillTxt: {
    fontFamily: font.medium,
    fontSize: 12,
    color: themeMuted,
    textTransform: 'capitalize',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
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
  mutedHint: {
    fontSize: 14,
    color: themeMuted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
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
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16,16,17,0.45)',
  },
  modalSheet: {
    backgroundColor: cascadingWhite,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '88%',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: chineseSilver,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: chineseSilver,
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: { fontSize: 20, color: themeInk },
  modalHint: { fontSize: 14, color: themeMuted, lineHeight: 20, marginBottom: 16 },
  modalScroll: { maxHeight: 360 },
  advBookTypeScroll: {
    marginHorizontal: -20,
    marginBottom: 12,
  },
  advBookTypeScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  advLabel: {
    fontSize: 13,
    color: themeMuted,
    marginBottom: 8,
    marginTop: 4,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  advChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    backgroundColor: themeCard,
  },
  advChipOn: {
    backgroundColor: 'rgba(113,110,255,0.12)',
    borderColor: themePrimary,
  },
  advChipTxt: { fontSize: 14, color: themeMuted, textTransform: 'capitalize' },
  advChipTxtOn: { color: themePrimary },
  advInput: {
    backgroundColor: themePageBg,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: chineseSilver,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: themeInk,
    marginBottom: 14,
  },
  yearRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  yearInput: { flex: 1, marginBottom: 0 },
  yearDash: { fontSize: 18, color: themeMuted },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: chineseSilver,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
  },
  modalBtnGhost: {
    backgroundColor: cascadingWhite,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: chineseSilver,
  },
  modalBtnGhostTxt: { fontSize: 16, color: themeMuted },
  modalBtnPrimary: {
    backgroundColor: themePrimary,
    shadowColor: themePrimary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  modalBtnPrimaryTxt: {
    fontSize: 16,
    color: cascadingWhite,
  },
});

function CarouselPageDots({
  scrollX,
  pageCount,
  stride,
  carouselName = 'Carousel',
}: {
  scrollX: Animated.Value;
  pageCount: number;
  stride: number;
  carouselName?: string;
}) {
  if (pageCount <= 0) return null;
  if (pageCount === 1) {
    return (
      <View style={styles.latestDotsRow} accessibilityRole="tablist">
        <View
          style={[styles.latestDot, { width: 22, backgroundColor: themePrimary, opacity: 1 }]}
          accessibilityRole="tab"
          accessibilityLabel={`${carouselName}, slide 1, current`}
        />
      </View>
    );
  }
  return (
    <View style={styles.latestDotsRow} accessibilityRole="tablist">
      {Array.from({ length: pageCount }).map((_, index) => (
        <Animated.View
          key={index}
          accessibilityRole="tab"
          accessibilityLabel={`${carouselName}, slide ${index + 1}`}
          style={[
            styles.latestDot,
            {
              backgroundColor: themePrimary,
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
