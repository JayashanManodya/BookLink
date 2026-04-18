import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@clerk/clerk-expo';
import { api } from '../lib/api';
import type { BrowseStackParamList } from '../navigation/browseStackTypes';
import { cascadingWhite, chineseSilver, crunch, dreamland, lead, textSecondary, warmHaze } from '../theme/colors';
import { cardShadow } from '../theme/shadows';
import type { Book } from '../types/book';
import { BOOK_TYPES } from '../constants/bookTypes';

const QUICK_TYPE_CHIPS = BOOK_TYPES.slice(0, 8);

const CONDITIONS = ['new', 'good', 'poor'] as const;

const SEARCH_DEBOUNCE_MS = 380;

function normalizeConditionLabel(value?: string) {
  if (!value) return '';
  const c = value.toLowerCase().trim();
  return c === 'fair' ? 'poor' : c;
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

export function BrowseListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const greetingName = useMemo(() => {
    const first = user?.firstName?.trim();
    if (first) return first;
    const full = user?.fullName?.trim();
    if (full) return full.split(/\s+/)[0] ?? full;
    const uname = user?.username?.trim();
    if (uname) return uname;
    const email = user?.primaryEmailAddress?.emailAddress;
    if (email) return email.split('@')[0] ?? 'Reader';
    return 'Reader';
  }, [user]);
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
    if (advCondition) n += 1;
    if (advLanguage.trim()) n += 1;
    if (advYearMin.trim()) n += 1;
    if (advYearMax.trim()) n += 1;
    return n;
  }, [advCondition, advLanguage, advYearMin, advYearMax]);

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

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const clearQuickFilters = () => {
    setBookTypeChip(null);
  };

  const clearAdvanced = () => {
    setAdvCondition(null);
    setAdvLanguage('');
    setAdvYearMin('');
    setAdvYearMax('');
  };

  const clearAllFilters = () => {
    setSearchInput('');
    clearQuickFilters();
    clearAdvanced();
  };

  const hasAnyFilter = !!debouncedSearch || !!bookTypeChip || advancedActiveCount > 0;

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: Math.max(insets.top, 8) + 8 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greetTitle} numberOfLines={1}>Hi, {greetingName}</Text>
            <Text style={styles.greetSub}>Explore the world of books</Text>
          </View>
          <Pressable style={styles.avatarCircle} onPress={() => navigation.navigate('AddBook')} hitSlop={8}>
            <Ionicons name="add" size={22} color={lead} />
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={18} color={warmHaze} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search books"
              placeholderTextColor={warmHaze}
              value={searchInput}
              onChangeText={setSearchInput}
              returnKeyType="search"
            />
          </View>
          <Pressable
            style={[styles.filterFab, advancedActiveCount > 0 && styles.filterFabOn]}
            onPress={() => setAdvModalOpen(true)}
            hitSlop={6}
          >
            <Ionicons name="options-outline" size={20} color={advancedActiveCount > 0 ? lead : textSecondary} />
          </Pressable>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionMainTitle}>Popular books</Text>
          <Pressable onPress={() => void load()} hitSlop={8}>
            <Text style={styles.viewAllTxt}>View all</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentRow}>
          <Pressable
            onPress={clearQuickFilters}
            style={[styles.segmentChip, !bookTypeChip && styles.segmentChipOn]}
          >
            <Text style={[styles.segmentTxt, !bookTypeChip && styles.segmentTxtOn]}>All</Text>
          </Pressable>
          {QUICK_TYPE_CHIPS.map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setBookTypeChip((prev) => (prev === tab ? null : tab))}
              style={[styles.segmentChip, bookTypeChip === tab && styles.segmentChipOn]}
            >
              <Text style={[styles.segmentTxt, bookTypeChip === tab && styles.segmentTxtOn]}>{tab}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {hasAnyFilter ? (
          <Pressable onPress={clearAllFilters} style={styles.clearAllRow}>
            <Text style={styles.clearAllTxt}>Clear all filters</Text>
            <Ionicons name="close-circle-outline" size={18} color={crunch} />
          </Pressable>
        ) : null}

        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} color={crunch} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : books.length === 0 ? (
          <View style={[styles.emptyCard, cardShadow]}>
            <Text style={styles.muted}>
              {hasAnyFilter
                ? 'No books match these filters. Try clearing some options or broadening your search.'
                : 'No books yet. Be the first to list one from your shelf.'}
            </Text>
          </View>
        ) : (
          <View style={styles.gridWrap}>
            {books.map((b) => (
              <Pressable
                key={b._id}
                onPress={() => navigation.navigate('BookDetail', { bookId: b._id })}
                style={[styles.gridCard, cardShadow]}
              >
                <View style={styles.featureImageWrap}>
                  {b.coverImageUrl ? (
                    <Image source={{ uri: b.coverImageUrl }} style={styles.featureImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.coverFallback}>
                      <Ionicons name="book-outline" size={32} color={lead} />
                    </View>
                  )}
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.featureTitle} numberOfLines={1}>
                    {b.title}
                  </Text>
                  <View style={styles.featureMetaRow}>
                    <View style={styles.listerRow}>
                      {b.ownerAvatarUrl ? (
                        <Image source={{ uri: b.ownerAvatarUrl }} style={styles.listerAvatarImg} />
                      ) : (
                        <View style={styles.listerAvatar}>
                          <Text style={styles.listerAvatarTxt}>
                            {(b.ownerDisplayName || b.author || 'R').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.featureSub} numberOfLines={1}>
                        {b.author}
                        {b.bookType ? ` · ${b.bookType}` : ''}
                      </Text>
                    </View>
                    {b.condition ? (
                      <Text
                        style={[
                          styles.conditionChipLarge,
                          normalizeConditionLabel(b.condition) === 'new'
                            ? styles.conditionChipNew
                            : normalizeConditionLabel(b.condition) === 'good'
                              ? styles.conditionChipGood
                              : styles.conditionChipPoor,
                        ]}
                        numberOfLines={1}
                      >
                        {normalizeConditionLabel(b.condition)}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
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
            <Text style={styles.modalTitle}>Advanced filters</Text>
            <Pressable onPress={() => setAdvModalOpen(false)} hitSlop={12}>
              <Ionicons name="close" size={26} color={lead} />
            </Pressable>
          </View>
          <Text style={styles.modalHint}>Combine with the search bar and quick type chips.</Text>

          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.advLabel}>Condition</Text>
            <View style={styles.chipWrap}>
              <Pressable
                onPress={() => setAdvCondition(null)}
                style={[styles.advChip, !advCondition && styles.advChipOn]}
              >
                <Text style={[styles.advChipTxt, !advCondition && styles.advChipTxtOn]}>Any</Text>
              </Pressable>
              {CONDITIONS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setAdvCondition((prev) => (prev === c ? null : c))}
                  style={[styles.advChip, advCondition === c && styles.advChipOn]}
                >
                  <Text style={[styles.advChipTxt, advCondition === c && styles.advChipTxtOn]}>{c}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.advLabel}>Language</Text>
            <TextInput
              style={styles.advInput}
              placeholder="e.g. English, Sinhala"
              placeholderTextColor={warmHaze}
              value={advLanguage}
              onChangeText={setAdvLanguage}
            />

            <Text style={styles.advLabel}>Publication year</Text>
            <View style={styles.yearRow}>
              <TextInput
                style={[styles.advInput, styles.yearInput]}
                placeholder="From"
                placeholderTextColor={warmHaze}
                value={advYearMin}
                onChangeText={setAdvYearMin}
                keyboardType="number-pad"
              />
              <Text style={styles.yearDash}>–</Text>
              <TextInput
                style={[styles.advInput, styles.yearInput]}
                placeholder="To"
                placeholderTextColor={warmHaze}
                value={advYearMax}
                onChangeText={setAdvYearMax}
                keyboardType="number-pad"
              />
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <Pressable style={[styles.modalBtn, styles.modalBtnGhost]} onPress={clearAdvanced}>
              <Text style={styles.modalBtnGhostTxt}>Reset panel</Text>
            </Pressable>
            <Pressable style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={() => setAdvModalOpen(false)}>
              <Text style={styles.modalBtnPrimaryTxt}>Apply</Text>
            </Pressable>
          </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: cascadingWhite },
  scroll: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  greetTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: lead,
  },
  greetSub: { marginTop: 2, fontSize: 14, color: textSecondary },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ececec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f3f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: lead, paddingVertical: 0 },
  filterFab: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#f3f3f5',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterFabOn: {
    backgroundColor: '#ececec',
    borderColor: lead,
  },
  sectionHeaderRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionMainTitle: { fontSize: 16, fontWeight: '800', color: lead },
  viewAllTxt: { fontSize: 12, color: warmHaze, fontWeight: '700' },
  segmentRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  segmentChip: {
    backgroundColor: '#f1f1f1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  segmentChipOn: { backgroundColor: '#1f1f1f' },
  segmentTxt: { fontSize: 11, fontWeight: '700', color: '#8a8a8a' },
  segmentTxtOn: { color: cascadingWhite },
  clearAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  clearAllTxt: { fontSize: 14, fontWeight: '700', color: crunch },
  pillRow: { gap: 16, paddingVertical: 6, paddingRight: 20 },
  tabChip: {
    marginRight: 2,
    paddingBottom: 6,
    minHeight: 30,
    justifyContent: 'flex-end',
  },
  tabChipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  tabChipTextOn: { color: lead, fontWeight: '800' },
  tabChipTextOff: { color: warmHaze },
  tabChipUnderline: {
    marginTop: 6,
    alignSelf: 'center',
    width: 18,
    height: 2,
    borderRadius: 4,
    backgroundColor: lead,
  },
  emptyCard: {
    marginTop: 8,
    borderRadius: 24,
    padding: 20,
    backgroundColor: cascadingWhite,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  muted: { fontSize: 15, lineHeight: 22, color: textSecondary },
  error: { color: '#b3261e', fontSize: 14, marginTop: 8 },
  gridWrap: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  gridCard: {
    width: '48%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: cascadingWhite,
  },
  featureImageWrap: { width: '100%', height: 190, backgroundColor: '#d9d9dd' },
  featureImage: { width: '100%', height: '100%' },
  coverFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  cardBody: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: cascadingWhite,
  },
  featureTitle: { fontSize: 13, fontWeight: '800', color: lead },
  featureSub: { fontSize: 10, color: textSecondary, flex: 1 },
  featureMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    marginTop: 5,
  },
  listerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 6 },
  listerAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#dfe3e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listerAvatarImg: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: chineseSilver,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  listerAvatarTxt: { fontSize: 10, fontWeight: '800', color: lead },
  conditionChipLarge: {
    fontSize: 9,
    fontWeight: '800',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    textTransform: 'capitalize',
    overflow: 'hidden',
  },
  conditionChipNew: { backgroundColor: '#b8f2c0', color: '#0f5a28' },
  conditionChipGood: { backgroundColor: '#ffe79d', color: '#7a5a00' },
  conditionChipPoor: { backgroundColor: '#ffc8c8', color: '#8a1f1f' },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(32,32,34,0.45)',
  },
  modalSheet: {
    backgroundColor: cascadingWhite,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '88%',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: dreamland,
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: lead },
  modalHint: { fontSize: 14, color: textSecondary, lineHeight: 20, marginBottom: 16 },
  modalScroll: { maxHeight: 360 },
  advLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: warmHaze,
    marginBottom: 8,
    marginTop: 4,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  advChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    backgroundColor: cascadingWhite,
  },
  advChipOn: { backgroundColor: chineseSilver, borderColor: lead },
  advChipTxt: { fontSize: 14, fontWeight: '700', color: textSecondary, textTransform: 'capitalize' },
  advChipTxtOn: { color: lead },
  advInput: {
    backgroundColor: '#f3f3f5',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: lead,
    marginBottom: 14,
  },
  yearRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  yearInput: { flex: 1, marginBottom: 0 },
  yearDash: { fontSize: 18, color: warmHaze, fontWeight: '600' },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: dreamland,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalBtnGhost: {
    backgroundColor: cascadingWhite,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  modalBtnGhostTxt: { fontSize: 16, fontWeight: '700', color: textSecondary },
  modalBtnPrimary: { backgroundColor: crunch },
  modalBtnPrimaryTxt: { fontSize: 16, fontWeight: '800', color: lead },
});
