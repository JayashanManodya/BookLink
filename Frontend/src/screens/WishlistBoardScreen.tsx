import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageStyle,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, apiErrorMessage } from '../lib/api';
import { SignInGateCard } from '../components/SignInGateCard';
import { CourseScreenShell } from '../components/CourseScreenShell';
import type { WishlistStackParamList } from '../navigation/wishlistStackTypes';
import { cascadingWhite, chineseSilver, dreamland, lead, textSecondary, themeSurfaceMuted } from '../theme/colors';
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
import type { WishlistItem } from '../types/wishlist';

type Props = NativeStackScreenProps<WishlistStackParamList, 'WishlistBoard'>;

function relativeListingAge(iso?: string): string {
  if (!iso) return 'Recently';
  try {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    if (diffMs < 0) return 'Recently';
    const days = Math.floor(diffMs / 86400000);
    if (days < 1) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} wk ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

function urgencyHeadline(u: WishlistItem['urgency']): string {
  if (u === 'high') return 'High priority';
  if (u === 'medium') return 'Medium priority';
  return 'Low priority';
}

function createdAtMs(iso?: string): number {
  if (!iso) return 0;
  const n = new Date(iso).getTime();
  return Number.isFinite(n) ? n : 0;
}

function urgencySortRank(u: WishlistItem['urgency']): number {
  if (u === 'high') return 0;
  if (u === 'medium') return 1;
  return 2;
}

type CommunitySortKey = 'newest' | 'oldest' | 'priority' | 'title';

type CommunityUrgencyFilter = 'all' | WishlistItem['urgency'];

const URGENCY_CHIPS: [CommunityUrgencyFilter, string][] = [
  ['all', 'All'],
  ['high', 'High'],
  ['medium', 'Medium'],
  ['low', 'Low'],
];

const SORT_CHIPS: [CommunitySortKey, string][] = [
  ['newest', 'Recent'],
  ['oldest', 'Oldest'],
  ['priority', 'Priority'],
  ['title', 'Title A-Z'],
];

export function WishlistBoardScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<WishlistStackParamList, 'WishlistBoard'>>();
  const { isSignedIn } = useAuth();
  const [scope, setScope] = useState<'community' | 'mine'>(
    route.params?.initialTab === 'mine' ? 'mine' : 'community'
  );
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [communitySearch, setCommunitySearch] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<CommunityUrgencyFilter>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('__all__');
  const [sortKey, setSortKey] = useState<CommunitySortKey>('newest');
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [gradeFilter, setGradeFilter] = useState<string>('__all__');
  const [languageFilterModal, setLanguageFilterModal] = useState('');

  useEffect(() => {
    if (route.params?.initialTab === 'mine') setScope('mine');
  }, [route.params?.initialTab]);

  useEffect(() => {
    if (scope === 'mine') {
      setCommunitySearch('');
      setUrgencyFilter('all');
      setSubjectFilter('__all__');
      setSortKey('newest');
      setGradeFilter('__all__');
      setLanguageFilterModal('');
      setFilterModalOpen(false);
    }
  }, [scope]);

  const fetchWishlist = useCallback(
    async (variant: 'screen' | 'pull') => {
      if (!isSignedIn) return;
      if (variant === 'pull') setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const path = scope === 'community' ? '/api/wishlist' : '/api/wishlist/mine';
        const res = await api.get<{ items: WishlistItem[] }>(path);
        setItems(res.data.items ?? []);
      } catch (e: unknown) {
        setError(apiErrorMessage(e, 'Could not load wanted books'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isSignedIn, scope]
  );

  useFocusEffect(
    useCallback(() => {
      if (!isSignedIn) {
        setLoading(false);
        return;
      }
      void fetchWishlist('screen');
    }, [isSignedIn, fetchWishlist])
  );

  const subjectChipOptions = useMemo(() => {
    const uniq = new Set<string>();
    for (const w of items) {
      const s = w.subject?.trim();
      if (s) uniq.add(s);
    }
    return [...uniq].sort((a, b) => a.localeCompare(b)).slice(0, 24);
  }, [items]);

  const gradeChipOptions = useMemo(() => {
    const uniq = new Set<string>();
    for (const w of items) {
      const g = w.grade?.trim();
      if (g) uniq.add(g);
    }
    return [...uniq].sort((a, b) => a.localeCompare(b)).slice(0, 20);
  }, [items]);

  const communityFilterActiveCount = useMemo(() => {
    let n = 0;
    if (urgencyFilter !== 'all') n += 1;
    if (subjectFilter !== '__all__') n += 1;
    if (sortKey !== 'newest') n += 1;
    if (gradeFilter !== '__all__') n += 1;
    if (languageFilterModal.trim()) n += 1;
    return n;
  }, [urgencyFilter, subjectFilter, sortKey, gradeFilter, languageFilterModal]);

  const resetCommunityFiltersPanel = useCallback(() => {
    setUrgencyFilter('all');
    setSubjectFilter('__all__');
    setSortKey('newest');
    setGradeFilter('__all__');
    setLanguageFilterModal('');
  }, []);

  const clearWishlistExplore = useCallback(() => {
    setCommunitySearch('');
    resetCommunityFiltersPanel();
  }, [resetCommunityFiltersPanel]);

  const visibleItems = useMemo(() => {
    if (scope !== 'community') return items;

    let list = [...items];
    const q = communitySearch.trim().toLowerCase();
    if (q) {
      list = list.filter((w) => {
        const blob = `${w.title} ${w.author ?? ''} ${w.subject ?? ''} ${w.description ?? ''} ${w.language ?? ''} ${w.grade ?? ''} ${w.ownerDisplayName ?? ''}`.toLowerCase();
        return blob.includes(q);
      });
    }
    if (urgencyFilter !== 'all') {
      list = list.filter((w) => w.urgency === urgencyFilter);
    }
    if (subjectFilter !== '__all__') {
      list = list.filter((w) => (w.subject ?? '').trim() === subjectFilter);
    }
    const langQ = languageFilterModal.trim().toLowerCase();
    if (langQ) {
      list = list.filter((w) => (w.language ?? '').trim().toLowerCase().includes(langQ));
    }
    if (gradeFilter !== '__all__') {
      list = list.filter((w) => (w.grade ?? '').trim() === gradeFilter);
    }

    if (sortKey === 'newest') {
      list.sort((a, b) => createdAtMs(b.createdAt) - createdAtMs(a.createdAt));
    } else if (sortKey === 'oldest') {
      list.sort((a, b) => createdAtMs(a.createdAt) - createdAtMs(b.createdAt));
    } else if (sortKey === 'priority') {
      list.sort((a, b) => {
        const dr = urgencySortRank(a.urgency) - urgencySortRank(b.urgency);
        if (dr !== 0) return dr;
        return createdAtMs(b.createdAt) - createdAtMs(a.createdAt);
      });
    } else {
      list.sort((a, b) => (a.title || '').trim().localeCompare((b.title || '').trim(), undefined, { sensitivity: 'base' }));
    }

    return list;
  }, [
    scope,
    items,
    communitySearch,
    urgencyFilter,
    subjectFilter,
    sortKey,
    gradeFilter,
    languageFilterModal,
  ]);

  if (!isSignedIn) {
    return (
      <CourseScreenShell title="Wanted books" subtitle="Posts from readers looking for titles." scroll scrollContentStyle={{ gap: 16 }}>
        <SignInGateCard
          title="Sign in for wanted books"
          message="Post books you are looking for and browse what the community needs."
          icon="book-outline"
        />
      </CourseScreenShell>
    );
  }

  return (
    <>
      <CourseScreenShell
        title="Wanted books"
        subtitle="Community requests and listings you manage."
        scroll={false}
        headerRight={
          <View style={styles.headerActions}>
            <Pressable style={styles.headerChatsBtn} onPress={() => navigation.navigate('WishlistChats')} hitSlop={6}>
              <Ionicons name="chatbubbles-outline" size={18} color={cascadingWhite} />
              <Text style={styles.headerChatsTxt}>Inbox</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('PostWanted')}
              style={styles.headerAddBtn}
              hitSlop={8}
              accessibilityLabel="Post a wanted book"
            >
              <Ionicons name="add" size={26} color={cascadingWhite} />
            </Pressable>
          </View>
        }
      >
        <View style={styles.signedInWrap}>
      <View style={styles.segment}>
        <Pressable
          onPress={() => setScope('community')}
          style={[styles.segmentBtn, scope === 'community' && styles.segmentBtnOn]}
        >
          <Text style={[styles.segmentTxt, scope === 'community' && styles.segmentTxtOn]}>Community</Text>
        </Pressable>
        <Pressable
          onPress={() => setScope('mine')}
          style={[styles.segmentBtn, scope === 'mine' && styles.segmentBtnOn]}
        >
          <Text style={[styles.segmentTxt, scope === 'mine' && styles.segmentTxtOn]}>Mine</Text>
        </Pressable>
      </View>

      {scope === 'community' ? (
        <View style={styles.communityExplore}>
          <View style={styles.wantedSearchRow}>
            <View style={styles.wantedSearchGlass}>
              <Ionicons name="search-outline" size={20} color={themeMuted} />
              <TextInput
                style={[styles.wantedSearchInput, { fontFamily: font.medium }]}
                value={communitySearch}
                onChangeText={setCommunitySearch}
                placeholder="Search anything..."
                placeholderTextColor={themeMuted}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
                selectionColor={themePrimary}
              />
            </View>
            <Pressable
              accessibilityLabel="Open filters"
              onPress={() => setFilterModalOpen(true)}
              hitSlop={6}
              style={[styles.wantedFilterCircle, communityFilterActiveCount > 0 && styles.wantedFilterCircleOn]}
            >
              <Ionicons name="options-outline" size={20} color={themePrimary} />
            </Pressable>
          </View>
          {communitySearch.trim().length > 0 || communityFilterActiveCount > 0 ? (
            <Pressable onPress={clearWishlistExplore} style={styles.clearExploreRow}>
              <Text style={[styles.clearExploreTxt, { fontFamily: font.bold }]}>Clear all filters</Text>
              <Ionicons name="close-circle-outline" size={18} color={themePrimary} />
            </Pressable>
          ) : null}
        </View>

      ) : null}

      {loading && !refreshing ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={themePrimary} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={[styles.list, scope === 'community' && styles.listAfterExplore]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void fetchWishlist('pull')}
              tintColor={themePrimary}
            />
          }
        >
          {items.length === 0 ? (
            <View style={[styles.card, cardShadow]}>
              <Text style={styles.body}>
                {scope === 'community'
                  ? 'No wanted posts yet. Be the first to add one.'
                  : 'You have not posted any wanted books yet. Tap below to add one.'}
              </Text>
            </View>
          ) : visibleItems.length === 0 ? (
            <View style={[styles.card, cardShadow]}>
              <Text style={styles.body}>No posts match your search or filters. Try widening your search.</Text>
            </View>
          ) : (
            visibleItems.map((w) => {
              const tagLine = [w.author?.trim(), w.subject?.trim()].filter(Boolean).join(' · ') || 'Book request';
              const listed = relativeListingAge(w.createdAt);
              const tailLabel =
                scope === 'community'
                  ? w.ownerDisplayName?.trim() || 'Community reader'
                  : 'Your post';

              return (
                <Pressable
                  key={w._id}
                  style={({ pressed }) => [
                    styles.wishRowCard,
                    cardShadow,
                    pressed && styles.wishRowPressed,
                  ]}
                  onPress={() => navigation.navigate('WantedBookDetail', { wishlistItemId: w._id })}
                >
                  <View style={styles.wishThumb}>
                    {w.wantedBookPhoto ? (
                      <Image
                        source={{ uri: w.wantedBookPhoto }}
                        style={styles.wishThumbImg as ImageStyle}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.wishThumbPh}>
                        <Ionicons name="book-outline" size={32} color={themePrimary} />
                      </View>
                    )}
                  </View>
                  <View style={styles.wishRowBody}>
                    <Text style={[styles.wishRowTitle, { fontFamily: font.bold }]} numberOfLines={2}>
                      {w.title}
                    </Text>
                    <View style={styles.wishMetaRow}>
                      <View style={styles.wishMetaCluster}>
                        <View style={[styles.metaIconBubble, styles.metaIconGreen]}>
                          <Ionicons name="layers-outline" size={13} color={themeGreen} />
                        </View>
                        <Text style={[styles.wishMetaTxt, { fontFamily: font.regular }]} numberOfLines={1}>
                          {tagLine}
                        </Text>
                      </View>
                      <View style={[styles.wishMetaCluster, styles.wishMetaClusterRight]}>
                        <View style={[styles.metaIconBubble, styles.metaIconPurple]}>
                          <Ionicons name="time-outline" size={13} color={themePrimary} />
                        </View>
                        <Text style={[styles.wishMetaTxt, { fontFamily: font.regular }]} numberOfLines={1}>
                          {listed}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.wishBottomRow}>
                      <Text style={[styles.wishUrgencyAccent, { fontFamily: font.bold }]}>
                        {urgencyHeadline(w.urgency)}
                      </Text>
                      <Text style={[styles.wishTailMuted, { fontFamily: font.medium }]} numberOfLines={1}>
                        {tailLabel}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}
      </View>
      </CourseScreenShell>

      <Modal
        visible={filterModalOpen && scope === 'community'}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterModalOpen(false)}
      >
        <View style={styles.wModalRoot}>
          <Pressable style={styles.wModalBackdrop} onPress={() => setFilterModalOpen(false)} />
          <View style={[styles.wModalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.wModalHandle} />
            <View style={styles.wModalHeader}>
              <Text style={[styles.wModalTitle, { fontFamily: font.extraBold }]}>Filters</Text>
              <Pressable onPress={() => setFilterModalOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={26} color={themeInk} />
              </Pressable>
            </View>
            <Text style={[styles.wModalHint, { fontFamily: font.regular }]}>
              Combine with search. Mirrors the filters sheet on Home.
            </Text>

            <ScrollView style={styles.wModalScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={[styles.wAdvLabel, { fontFamily: font.semi }]}>Urgency</Text>
              <View style={styles.wChipWrap}>
                {URGENCY_CHIPS.map(([value, label]) => (
                  <Pressable
                    key={value}
                    onPress={() => setUrgencyFilter(value)}
                    style={[styles.wAdvChip, urgencyFilter === value && styles.wAdvChipOn]}
                  >
                    <Text
                      style={[
                        styles.wAdvChipTxt,
                        urgencyFilter === value && styles.wAdvChipTxtOn,
                        { fontFamily: font.medium },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {subjectChipOptions.length > 0 ? (
                <>
                  <Text style={[styles.wAdvLabel, { fontFamily: font.semi }]}>Subject / topic</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.wAdvHScroll}
                    contentContainerStyle={styles.wAdvHScrollContent}
                    keyboardShouldPersistTaps="handled"
                  >
                    <Pressable
                      onPress={() => setSubjectFilter('__all__')}
                      style={[styles.wAdvChip, subjectFilter === '__all__' && styles.wAdvChipOn]}
                    >
                      <Text
                        style={[
                          styles.wAdvChipTxt,
                          subjectFilter === '__all__' && styles.wAdvChipTxtOn,
                          { fontFamily: font.medium },
                        ]}
                      >
                        Any
                      </Text>
                    </Pressable>
                    {subjectChipOptions.map((subj) => (
                      <Pressable
                        key={subj}
                        onPress={() => setSubjectFilter(subj)}
                        style={[styles.wAdvChip, subjectFilter === subj && styles.wAdvChipOn]}
                      >
                        <Text
                          style={[
                            styles.wAdvChipTxt,
                            subjectFilter === subj && styles.wAdvChipTxtOn,
                            { fontFamily: font.medium },
                          ]}
                          numberOfLines={1}
                        >
                          {subj}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              ) : null}

              <Text style={[styles.wAdvLabel, { fontFamily: font.semi }]}>Sort by</Text>
              <View style={styles.wChipWrap}>
                {SORT_CHIPS.map(([value, label]) => (
                  <Pressable
                    key={value}
                    onPress={() => setSortKey(value)}
                    style={[styles.wAdvChip, sortKey === value && styles.wAdvChipOn]}
                  >
                    <Text
                      style={[
                        styles.wAdvChipTxt,
                        sortKey === value && styles.wAdvChipTxtOn,
                        { fontFamily: font.medium },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {gradeChipOptions.length > 0 ? (
                <>
                  <Text style={[styles.wAdvLabel, { fontFamily: font.semi }]}>Grade</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.wAdvHScroll}
                    contentContainerStyle={styles.wAdvHScrollContent}
                  >
                    <Pressable
                      onPress={() => setGradeFilter('__all__')}
                      style={[styles.wAdvChip, gradeFilter === '__all__' && styles.wAdvChipOn]}
                    >
                      <Text
                        style={[
                          styles.wAdvChipTxt,
                          gradeFilter === '__all__' && styles.wAdvChipTxtOn,
                          { fontFamily: font.medium },
                        ]}
                      >
                        Any
                      </Text>
                    </Pressable>
                    {gradeChipOptions.map((g) => (
                      <Pressable
                        key={g}
                        onPress={() => setGradeFilter(g)}
                        style={[styles.wAdvChip, gradeFilter === g && styles.wAdvChipOn]}
                      >
                        <Text
                          style={[
                            styles.wAdvChipTxt,
                            gradeFilter === g && styles.wAdvChipTxtOn,
                            { fontFamily: font.medium },
                          ]}
                          numberOfLines={1}
                        >
                          {g}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              ) : null}

              <Text style={[styles.wAdvLabel, { fontFamily: font.semi }]}>Language</Text>
              <TextInput
                style={[styles.wAdvInput, { fontFamily: font.regular }]}
                placeholder="e.g. English, Sinhala"
                placeholderTextColor={themeMuted}
                value={languageFilterModal}
                onChangeText={setLanguageFilterModal}
              />
            </ScrollView>

            <View style={styles.wModalActions}>
              <Pressable
                style={[styles.wModalBtn, styles.wModalBtnGhost]}
                onPress={() => {
                  resetCommunityFiltersPanel();
                }}
              >
                <Text style={[styles.wModalBtnGhostTxt, { fontFamily: font.bold }]}>Reset panel</Text>
              </Pressable>
              <Pressable
                style={[styles.wModalBtn, styles.wModalBtnPrimary]}
                onPress={() => setFilterModalOpen(false)}
              >
                <Text style={[styles.wModalBtnPrimaryTxt, { fontFamily: font.bold }]}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  signedInWrap: { flex: 1, position: 'relative' },
  listScroll: { flex: 1, minHeight: 0 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerChatsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.4)',
    marginBottom: 2,
  },
  headerChatsTxt: { fontSize: 14, fontWeight: '800', color: cascadingWhite },
  headerAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.4)',
    marginBottom: 2,
  },
  segment: {
    flexDirection: 'row',
    marginTop: 4,
    backgroundColor: themeSurfaceMuted,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  segmentBtnOn: { backgroundColor: themePrimary },
  segmentTxt: { fontSize: 14, fontWeight: '700', color: textSecondary },
  segmentTxtOn: { color: cascadingWhite },
  communityExplore: {
    paddingTop: 8,
    paddingBottom: 4,
    gap: 0,
  },
  wantedSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  wantedSearchGlass: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeCard,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: Platform.select({ ios: 11, default: 9 }),
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  wantedSearchInput: {
    flex: 1,
    fontSize: 15,
    color: lead,
    paddingVertical: 0,
  },
  wantedFilterCircle: {
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  wantedFilterCircleOn: {
    borderWidth: 2,
    borderColor: themeOrange,
  },
  clearExploreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
    marginBottom: 8,
  },
  clearExploreTxt: { fontSize: 14, color: themePrimary },
  listAfterExplore: {
    marginTop: 6,
  },
  wModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  wModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16,16,17,0.45)',
  },
  wModalSheet: {
    backgroundColor: cascadingWhite,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '88%',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: chineseSilver,
  },
  wModalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: chineseSilver,
    marginBottom: 14,
  },
  wModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  wModalTitle: { fontSize: 20, color: themeInk },
  wModalHint: { fontSize: 14, color: themeMuted, lineHeight: 20, marginBottom: 16 },
  wModalScroll: { maxHeight: 400 },
  wAdvLabel: {
    fontSize: 13,
    color: themeMuted,
    marginBottom: 8,
    marginTop: 4,
  },
  wChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  wAdvChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    backgroundColor: themeCard,
    maxWidth: 220,
  },
  wAdvChipOn: {
    backgroundColor: 'rgba(113,110,255,0.12)',
    borderColor: themePrimary,
  },
  wAdvChipTxt: { fontSize: 14, color: themeMuted },
  wAdvChipTxtOn: { color: themePrimary },
  wAdvHScroll: {
    marginHorizontal: -20,
    marginBottom: 14,
  },
  wAdvHScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  wAdvInput: {
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
  wModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: chineseSilver,
  },
  wModalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
  },
  wModalBtnGhost: {
    backgroundColor: cascadingWhite,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: chineseSilver,
  },
  wModalBtnGhostTxt: { fontSize: 16, color: themeMuted },
  wModalBtnPrimary: {
    backgroundColor: themePrimary,
    shadowColor: themePrimary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  wModalBtnPrimaryTxt: {
    fontSize: 16,
    color: cascadingWhite,
  },
  list: {
    paddingBottom: 36,
    gap: 12,
    marginTop: 16,
  },
  card: {
    backgroundColor: cascadingWhite,
    borderRadius: 24,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  body: { fontSize: 15, lineHeight: 22, color: textSecondary },
  error: { color: '#b3261e', marginTop: 12 },
  wishRowCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
    padding: 12,
    borderRadius: 20,
    backgroundColor: themeCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(16,16,17,0.06)',
  },
  wishRowPressed: { opacity: 0.94, transform: [{ scale: 0.995 }] },
  wishThumb: {
    width: 92,
    height: 92,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: themeIllustrationBlue,
    flexShrink: 0,
  },
  wishThumbImg: { width: '100%', height: '100%' },
  wishThumbPh: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(113,110,255,0.08)',
  },
  wishRowBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  wishRowTitle: {
    fontSize: 16,
    color: themeInk,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  wishMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  wishMetaCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  wishMetaClusterRight: {
    flex: 0,
    flexShrink: 0,
    maxWidth: '46%',
  },
  metaIconBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaIconGreen: { backgroundColor: 'rgba(56,163,54,0.18)' },
  metaIconPurple: { backgroundColor: 'rgba(113,110,255,0.18)' },
  wishMetaTxt: {
    flexShrink: 1,
    fontSize: 12,
    color: themeMuted,
    lineHeight: 16,
  },
  wishBottomRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
  },
  wishUrgencyAccent: {
    fontSize: 15,
    color: themePrimary,
    letterSpacing: -0.2,
  },
  wishTailMuted: {
    flex: 1,
    fontSize: 12,
    color: themeMuted,
    textAlign: 'right',
  },
});
