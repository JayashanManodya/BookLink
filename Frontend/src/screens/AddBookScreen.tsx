import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@clerk/clerk-expo';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { alertOk } from '../lib/platformAlert';
import { BOOK_TYPES, type BookType } from '../constants/bookTypes';
import { SRI_LANKA_DIVISIONS } from '../constants/sriLankaDivisions';
import { FormImageAttachment } from '../components/FormImageAttachment';
import { SignInGateCard } from '../components/SignInGateCard';
import { SignInWithGoogleButton } from '../components/SignInWithGoogleButton';
import type { BrowseStackParamList } from '../navigation/browseStackTypes';
import {
  cascadingWhite,
  dreamland,
  lead,
  textSecondary,
  themeDanger,
  warmHaze,
  themePageBg,
  themePrimary,
  themeSurfaceMuted,
} from '../theme/colors';
import { FORM_SCROLL_GAP } from '../theme/formLayout';
import { cardShadow } from '../theme/shadows';
import {
  MIN_PUBLICATION_YEAR,
  publicationYearPastOptions,
  trimmedTitleBeginsWithDigit,
  isLettersOnlyNameText,
  filterToLettersOnlyNameText,
  maxPastPublicationYear,
} from '../lib/bookFormText';

type Props = NativeStackScreenProps<BrowseStackParamList, 'AddBook'>;

const CONDITIONS = ['new', 'good', 'poor'] as const;
const MAX_TEXT = 120;

type FieldErrorKey =
  | 'cover'
  | 'title'
  | 'author'
  | 'description'
  | 'location'
  | 'language'
  | 'year';

type FieldErrors = Partial<Record<FieldErrorKey, string>>;

function computeFieldErrors(vals: {
  hasCover: boolean;
  title: string;
  author: string;
  description: string;
  location: string;
  language: string;
  year: number | null;
}): FieldErrors {
  const e: FieldErrors = {};
  if (!vals.hasCover) {
    e.cover = 'Add a cover photo';
  }
  const t = vals.title.trim();
  const a = vals.author.trim();
  const d = vals.description.trim();
  const loc = vals.location.trim();
  const lang = vals.language.trim();
  const pastMax = maxPastPublicationYear();

  if (!t) {
    e.title = 'Title is required';
  } else if (t.length < 2) {
    e.title = 'Title must be at least 2 characters';
  } else if (t.length > MAX_TEXT) {
    e.title = `Keep title within ${MAX_TEXT} characters`;
  } else if (trimmedTitleBeginsWithDigit(vals.title)) {
    e.title = "Title can't start with a number";
  }

  if (!a) {
    e.author = 'Author is required';
  } else if (a.length < 2) {
    e.author = 'Author must be at least 2 characters';
  } else if (a.length > MAX_TEXT) {
    e.author = `Keep author within ${MAX_TEXT} characters`;
  } else if (!isLettersOnlyNameText(a)) {
    e.author = 'Use letters only (no numbers)';
  }

  if (d.length > 2000) {
    e.description = 'Description must be 2000 characters or fewer';
  }

  if (!loc) {
    e.location = 'Choose a Divisional Secretariat';
  } else if (!SRI_LANKA_DIVISIONS.includes(loc)) {
    e.location = 'Pick a location from the list';
  } else if (loc.length > 120) {
    e.location = 'Location is too long';
  }

  if (lang.length === 1) {
    e.language = 'Use at least 2 characters or leave language blank';
  } else if (lang.length > 40) {
    e.language = 'Language must be 40 characters or fewer';
  } else if (!isLettersOnlyNameText(lang)) {
    e.language = 'Use letters only (no numbers)';
  }

  if (vals.year != null) {
    if (!Number.isFinite(vals.year) || vals.year < MIN_PUBLICATION_YEAR || vals.year > pastMax) {
      e.year = pastMax < MIN_PUBLICATION_YEAR ? `Year must be ${MIN_PUBLICATION_YEAR} or earlier` : `Year must be ${MIN_PUBLICATION_YEAR}–${pastMax}`;
    }
  }

  return e;
}

export function AddBookScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [language, setLanguage] = useState('');
  const [bookType, setBookType] = useState<BookType>(BOOK_TYPES[0]);
  const [year, setYear] = useState<number | null>(null);
  const [condition, setCondition] = useState<(typeof CONDITIONS)[number]>('good');
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [coverMime, setCoverMime] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [typeModal, setTypeModal] = useState(false);
  const [yearModal, setYearModal] = useState(false);
  const [locationModal, setLocationModal] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const scrollRef = useRef<ScrollView>(null);

  const yearOptions = useMemo(() => publicationYearPastOptions(MIN_PUBLICATION_YEAR), []);
  const filteredLocations = useMemo(() => {
    const q = locationSearch.trim().toLowerCase();
    if (!q) return SRI_LANKA_DIVISIONS;
    return SRI_LANKA_DIVISIONS.filter((x) => x.toLowerCase().includes(q));
  }, [locationSearch]);

  const pickCover = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      alertOk('Permission needed', 'Allow photo library access to add a cover.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });
    if (!res.canceled && res.assets[0]) {
      setCoverUri(res.assets[0].uri);
      setCoverMime(res.assets[0].mimeType ?? 'image/jpeg');
      setFieldErrors((prev) => {
        if (!prev.cover) return prev;
        const { cover: _omit, ...rest } = prev;
        return rest;
      });
    }
  };

  const uploadCoverIfNeeded = async (): Promise<string> => {
    if (!coverUri) return '';
    const form = new FormData();
    const name = coverMime?.includes('png') ? 'cover.png' : 'cover.jpg';
    const type = coverMime ?? 'image/jpeg';

    if (Platform.OS === 'web') {
      const blobRes = await fetch(coverUri);
      const blob = await blobRes.blob();
      const mime = blob.type && blob.type.startsWith('image/') ? blob.type : type;
      if (typeof File !== 'undefined') {
        form.append('image', new File([blob], name, { type: mime }));
      } else {
        form.append('image', blob, name);
      }
    } else {
      form.append('image', { uri: coverUri, name, type } as unknown as Blob);
    }

    const up = await api.post<{ url: string }>('/api/upload/image', form);
    return up.data.url ?? '';
  };

  const submit = async () => {
    const t = title.trim();
    const a = author.trim();
    const d = description.trim();
    const loc = location.trim();
    const l = language.trim();

    const nextErrors = computeFieldErrors({
      hasCover: Boolean(coverUri?.trim()),
      title,
      author,
      description,
      location,
      language,
      year,
    });
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setFieldErrors({});

    setBusy(true);
    try {
      const coverImageUrl = await uploadCoverIfNeeded();
      await api.post('/api/books', {
        title: t,
        author: a,
        description: d,
        location: loc,
        language: l,
        bookType,
        condition,
        year: year ?? undefined,
        coverImageUrl,
      });
      alertOk('Success', 'Your book is live on the browse feed.', () => {
        setTitle('');
        setAuthor('');
        setDescription('');
        setLocation('');
        setLanguage('');
        setBookType(BOOK_TYPES[0]);
        setYear(null);
        setCondition('good');
        setCoverUri(null);
        setCoverMime(null);
        setFieldErrors({});
        navigation.navigate('BrowseList');
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not post listing';
      alertOk('Error', msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={lead} />
          <Text style={styles.backText}>Cancel</Text>
        </Pressable>
        <Text style={styles.screenTitle}>Add a book</Text>
        <View style={{ width: 72 }} />
      </View>
      {!isSignedIn ? (
        <ScrollView contentContainerStyle={[styles.scroll, styles.gateScroll, { gap: 12 }]}>
          <SignInGateCard
            title="Sign in to list a book"
            message="Postings are tied to your account so readers know who listed each copy."
            icon="book-outline"
          />
          <SignInWithGoogleButton />
        </ScrollView>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.scroll, { paddingBottom: 40, gap: FORM_SCROLL_GAP }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>
            Cover photo <Text style={styles.reqMark}>*</Text>
          </Text>
          <View style={fieldErrors.cover ? styles.coverErrorOutline : undefined}>
            <FormImageAttachment
              previewUri={coverUri}
              onPick={pickCover}
              onRemove={() => {
                setCoverUri(null);
                setCoverMime(null);
              }}
              emptyHint="Tap to add cover photo (required)"
            />
          </View>
          {fieldErrors.cover ? <Text style={styles.fieldErrorTxt}>{fieldErrors.cover}</Text> : null}
          <Field
            label="Book title"
            required
            value={title}
            onChangeText={(v) => {
              setTitle(v);
              setFieldErrors((prev) => {
                if (!prev.title) return prev;
                const { title: _omit, ...rest } = prev;
                return rest;
              });
            }}
            error={fieldErrors.title}
          />
          <Field
            label="Author"
            required
            value={author}
            onChangeText={(v) => {
              setAuthor(filterToLettersOnlyNameText(v));
              setFieldErrors((prev) => {
                if (!prev.author) return prev;
                const { author: _omit, ...rest } = prev;
                return rest;
              });
            }}
            error={fieldErrors.author}
          />
          <Field
            label="Description"
            value={description}
            onChangeText={(v) => {
              setDescription(v);
              setFieldErrors((prev) => {
                if (!prev.description) return prev;
                const { description: _omit, ...rest } = prev;
                return rest;
              });
            }}
            placeholder="Tell readers about this book..."
            multiline
            numberOfLines={4}
            error={fieldErrors.description}
          />
          <Text style={styles.label}>
            Divisional Secretariat (DS) location <Text style={styles.reqMark}>*</Text>
          </Text>
          <Pressable
            style={[styles.selectRow, fieldErrors.location && styles.fieldErrorOutline]}
            onPress={() => setLocationModal(true)}
          >
            <Text style={[styles.selectVal, !location && styles.selectPlaceholder]}>
              {location || 'Select Divisional Secretariat'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={lead} />
          </Pressable>
          {fieldErrors.location ? <Text style={styles.fieldErrorTxt}>{fieldErrors.location}</Text> : null}

          <Text style={styles.label}>Book type</Text>
          <Pressable style={styles.selectRow} onPress={() => setTypeModal(true)}>
            <Text style={styles.selectVal}>{bookType}</Text>
            <Ionicons name="chevron-down" size={20} color={lead} />
          </Pressable>

          <Text style={styles.label}>Book year (optional)</Text>
          <Pressable
            style={[styles.selectRow, fieldErrors.year && styles.fieldErrorOutline]}
            onPress={() => setYearModal(true)}
          >
            <Text style={styles.selectVal}>{year == null ? 'Not specified' : String(year)}</Text>
            <Ionicons name="chevron-down" size={20} color={lead} />
          </Pressable>
          {fieldErrors.year ? <Text style={styles.fieldErrorTxt}>{fieldErrors.year}</Text> : null}

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Condition</Text>
              <View style={styles.chipRow}>
                {CONDITIONS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCondition(c)}
                    style={[styles.chip, condition === c && styles.chipOn]}
                  >
                    <Text style={[styles.chipTxt, condition === c && styles.chipTxtOn]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Field
                label="Language"
                value={language}
                onChangeText={(v) => {
                  setLanguage(filterToLettersOnlyNameText(v));
                  setFieldErrors((prev) => {
                    if (!prev.language) return prev;
                    const { language: _omit, ...rest } = prev;
                    return rest;
                  });
                }}
                placeholder="Sinhala / Tamil / English"
                error={fieldErrors.language}
              />
            </View>
          </View>

          <Text style={styles.hint}>
            After someone&apos;s request is accepted, you&apos;ll choose the meet-up collection point in that exchange thread.
          </Text>

          <Pressable style={[styles.submit, cardShadow]} onPress={() => void submit()} disabled={busy}>
            {busy ? <ActivityIndicator color={lead} /> : <Text style={styles.submitTxt}>Post listing</Text>}
          </Pressable>
        </ScrollView>
      )}

      <Modal visible={typeModal} animationType="slide" transparent onRequestClose={() => setTypeModal(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setTypeModal(false)} />
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Text style={styles.modalTitle}>Book type</Text>
            <ScrollView style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">
              {BOOK_TYPES.map((bt) => (
                <Pressable
                  key={bt}
                  style={[styles.modalRow, bookType === bt && styles.modalRowOn]}
                  onPress={() => {
                    setBookType(bt);
                    setTypeModal(false);
                  }}
                >
                  <Text style={styles.modalRowTxt}>{bt}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={yearModal} animationType="slide" transparent onRequestClose={() => setYearModal(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setYearModal(false)} />
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Text style={styles.modalTitle}>Book year</Text>
            <ScrollView style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">
              {yearOptions.map((yOpt) => (
                <Pressable
                  key={yOpt == null ? 'none' : yOpt}
                  style={[styles.modalRow, year === yOpt && styles.modalRowOn]}
                  onPress={() => {
                    setYear(yOpt);
                    setYearModal(false);
                    setFieldErrors((prev) => {
                      if (!prev.year) return prev;
                      const { year: _omit, ...rest } = prev;
                      return rest;
                    });
                  }}
                >
                  <Text style={styles.modalRowTxt}>{yOpt == null ? 'Not specified' : String(yOpt)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={locationModal} animationType="slide" transparent onRequestClose={() => setLocationModal(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setLocationModal(false)} />
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Text style={styles.modalTitle}>Select Divisional Secretariat</Text>
            <TextInput
              value={locationSearch}
              onChangeText={setLocationSearch}
              placeholder="Search Divisional Secretariat..."
              placeholderTextColor={warmHaze}
              style={styles.input}
            />
            <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
              {filteredLocations.map((locOption) => (
                <Pressable
                  key={locOption}
                  style={[styles.modalRow, location === locOption && styles.modalRowOn]}
                  onPress={() => {
                    setLocation(locOption);
                    setLocationModal(false);
                    setLocationSearch('');
                    setFieldErrors((prev) => {
                      if (!prev.location) return prev;
                      const { location: _omit, ...rest } = prev;
                      return rest;
                    });
                  }}
                >
                  <Text style={styles.modalRowTxt}>{locOption}</Text>
                </Pressable>
              ))}
              {filteredLocations.length === 0 ? <Text style={styles.modalRowTxt}>No matching locations</Text> : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Field({
  label,
  required,
  value,
  onChangeText,
  placeholder,
  multiline,
  numberOfLines,
  error,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  error?: string;
}) {
  return (
    <View style={{ width: '100%', gap: 6 }}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.reqMark}> *</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={warmHaze}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, multiline && styles.inputMultiline, error && styles.inputError]}
      />
      {error ? <Text style={styles.fieldErrorTxt}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: themePageBg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 88 },
  backText: { fontSize: 15, fontWeight: '600', color: lead },
  screenTitle: { fontSize: 17, fontWeight: '800', color: lead },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  gateScroll: { flexGrow: 1, paddingBottom: 32 },
  label: { fontSize: 13, fontWeight: '700', color: warmHaze },
  reqMark: { color: themeDanger, fontWeight: '800' },
  fieldErrorTxt: { fontSize: 12, color: themeDanger, fontWeight: '600', marginTop: 2 },
  fieldErrorOutline: {
    borderColor: themeDanger,
    borderWidth: 2,
  },
  coverErrorOutline: {
    borderRadius: 22,
    borderWidth: 2,
    borderColor: themeDanger,
    overflow: 'hidden',
  },
  hint: { fontSize: 13, color: textSecondary, lineHeight: 18, marginTop: 4 },
  input: {
    backgroundColor: themeSurfaceMuted,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: lead,
  },
  inputMultiline: { minHeight: 96, paddingTop: 12, marginBottom: 2 },
  inputError: {
    borderColor: themeDanger,
    borderWidth: 2,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: themeSurfaceMuted,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  selectVal: { flex: 1, fontSize: 16, fontWeight: '600', color: lead },
  selectPlaceholder: { color: warmHaze, fontWeight: '500' },
  row2: { flexDirection: 'row', gap: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    backgroundColor: cascadingWhite,
  },
  chipOn: { backgroundColor: themePrimary, borderColor: themePrimary },
  chipTxt: { fontSize: 13, fontWeight: '700', color: textSecondary, textTransform: 'capitalize' },
  chipTxtOn: { color: cascadingWhite },
  submit: {
    marginTop: 8,
    backgroundColor: themePrimary,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitTxt: { fontSize: 16, fontWeight: '800', color: lead },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalSheet: {
    backgroundColor: cascadingWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: '85%',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: lead, marginBottom: 10 },
  modalRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: dreamland,
  },
  modalRowOn: { backgroundColor: themeSurfaceMuted },
  modalRowTxt: { fontSize: 16, color: lead, fontWeight: '600' },
  modalRowTitle: { fontSize: 16, fontWeight: '800', color: lead },
  modalRowSub: { fontSize: 13, color: textSecondary, marginTop: 4 },
});
