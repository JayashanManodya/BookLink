import { useEffect, useMemo, useState } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormImageAttachment } from '../components/FormImageAttachment';
import { api } from '../lib/api';
import { alertOk } from '../lib/platformAlert';
import { BOOK_TYPES, type BookType } from '../constants/bookTypes';
import { SRI_LANKA_DIVISIONS } from '../constants/sriLankaDivisions';
import type { ProfileStackParamList } from '../navigation/profileStackTypes';
import {
  cascadingWhite,
  crunch,
  dreamland,
  lead,
  textSecondary,
  warmHaze,
} from '../theme/colors';
import { FORM_SCROLL_GAP } from '../theme/formLayout';
import { cardShadow } from '../theme/shadows';
import type { Book } from '../types/book';

type Props = NativeStackScreenProps<ProfileStackParamList, 'EditListing'>;

const CONDITIONS = ['new', 'good', 'poor'] as const;
const MAX_TEXT = 120;
const MIN_YEAR = 1900;

export function EditListingScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { bookId } = route.params;

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [language, setLanguage] = useState('');
  const [bookType, setBookType] = useState<BookType>(BOOK_TYPES[0]);
  const [year, setYear] = useState<number | null>(null);
  const [condition, setCondition] = useState<(typeof CONDITIONS)[number]>('good');
  const [coverPreview, setCoverPreview] = useState('');
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [coverMime, setCoverMime] = useState<string | null>(null);
  const [typeModal, setTypeModal] = useState(false);
  const [yearModal, setYearModal] = useState(false);
  const [locationModal, setLocationModal] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    const list: (number | null)[] = [null];
    for (let i = 0; i <= y - MIN_YEAR; i += 1) list.push(y - i);
    return list;
  }, []);
  const filteredLocations = useMemo(() => {
    const q = locationSearch.trim().toLowerCase();
    if (!q) return SRI_LANKA_DIVISIONS;
    return SRI_LANKA_DIVISIONS.filter((x) => x.toLowerCase().includes(q));
  }, [locationSearch]);

  useEffect(() => {
    const loadBook = async () => {
      setLoading(true);
      try {
        const res = await api.get<{ book: Book }>(`/api/books/${bookId}`);
        const b = res.data.book;
        setTitle(b.title ?? '');
        setAuthor(b.author ?? '');
        setDescription(b.description ?? '');
        setLocation(b.location ?? '');
        setLanguage(b.language ?? '');
        setBookType(BOOK_TYPES.includes(b.bookType as BookType) ? (b.bookType as BookType) : BOOK_TYPES[0]);
        setYear(typeof b.year === 'number' ? b.year : null);
        setCondition(
          b.condition === 'fair' || b.condition === 'poor'
            ? 'poor'
            : b.condition === 'new' || b.condition === 'good'
              ? b.condition
              : 'good'
        );
        setCoverPreview(b.coverImageUrl ?? '');
      } catch (e: unknown) {
        alertOk('Error', e instanceof Error ? e.message : 'Could not load listing', () => navigation.goBack());
      } finally {
        setLoading(false);
      }
    };
    void loadBook();
  }, [bookId, navigation]);

  const pickCover = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      alertOk('Permission needed', 'Allow photo library access to change the cover.');
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
      setCoverPreview(res.assets[0].uri);
    }
  };

  const uploadCoverIfNeeded = async (): Promise<string | null> => {
    if (!coverUri) return null;
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
    const nowYear = new Date().getFullYear();

    if (!t || !a) return alertOk('Missing fields', 'Title and author are required.');
    if (t.length < 2 || a.length < 2) return alertOk('Too short', 'Title and author must be at least 2 characters.');
    if (t.length > MAX_TEXT || a.length > MAX_TEXT) {
      return alertOk('Too long', `Title and author must be ${MAX_TEXT} characters or fewer.`);
    }
    if (l && l.length > 40) return alertOk('Invalid details', 'Language text is too long.');
    if (d.length > 2000) return alertOk('Too long', 'Description must be 2000 characters or fewer.');
    if (loc.length > 120) return alertOk('Too long', 'Location must be 120 characters or fewer.');
    if (year != null && (!Number.isFinite(year) || year < MIN_YEAR || year > nowYear + 1)) {
      return alertOk('Invalid year', `Pick a year between ${MIN_YEAR} and ${nowYear + 1}.`);
    }

    setBusy(true);
    try {
      const uploaded = await uploadCoverIfNeeded();
      await api.put(`/api/books/${bookId}`, {
        title: t,
        author: a,
        description: d,
        location: loc,
        language: l,
        bookType,
        condition,
        year: year ?? undefined,
        coverImageUrl: uploaded ?? coverPreview,
      });
      alertOk('Saved', 'Listing updated.', () => navigation.goBack());
    } catch (e: unknown) {
      alertOk('Error', e instanceof Error ? e.message : 'Could not update listing');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.flex, styles.center]}>
        <ActivityIndicator color={crunch} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={lead} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.screenTitle}>Edit listing</Text>
        <View style={{ width: 78 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { gap: FORM_SCROLL_GAP }]}
        keyboardShouldPersistTaps="handled"
      >
        <FormImageAttachment
          previewUri={coverPreview}
          onPick={pickCover}
          onRemove={() => {
            setCoverUri(null);
            setCoverMime(null);
            setCoverPreview('');
          }}
          emptyHint="Tap to add cover photo"
        />

        <Field label="Book title" value={title} onChangeText={setTitle} />
        <Field label="Author" value={author} onChangeText={setAuthor} />
        <Field
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Tell readers about this book..."
          multiline
          numberOfLines={4}
        />
        <Text style={styles.label}>Divisional Secretariat (DS) location</Text>
        <Pressable style={styles.selectRow} onPress={() => setLocationModal(true)}>
          <Text style={[styles.selectVal, !location && styles.selectPlaceholder]}>
            {location || 'Select Divisional Secretariat'}
          </Text>
          <Ionicons name="chevron-down" size={20} color={lead} />
        </Pressable>

        <Text style={styles.label}>Book type</Text>
        <Pressable style={styles.selectRow} onPress={() => setTypeModal(true)}>
          <Text style={styles.selectVal}>{bookType}</Text>
          <Ionicons name="chevron-down" size={20} color={lead} />
        </Pressable>

        <Text style={styles.label}>Publication year</Text>
        <Pressable style={styles.selectRow} onPress={() => setYearModal(true)}>
          <Text style={styles.selectVal}>{year == null ? 'Not specified' : String(year)}</Text>
          <Ionicons name="chevron-down" size={20} color={lead} />
        </Pressable>

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Condition</Text>
            <View style={styles.chipRow}>
              {CONDITIONS.map((c) => (
                <Pressable key={c} onPress={() => setCondition(c)} style={[styles.chip, condition === c && styles.chipOn]}>
                  <Text style={[styles.chipTxt, condition === c && styles.chipTxtOn]}>{c}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Field label="Language" value={language} onChangeText={setLanguage} placeholder="English / Sinhala / Tamil" />
          </View>
        </View>

        <Pressable style={[styles.submit, cardShadow]} onPress={() => void submit()} disabled={busy}>
          {busy ? <ActivityIndicator color={lead} /> : <Text style={styles.submitTxt}>Save changes</Text>}
        </Pressable>
      </ScrollView>

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
            <Text style={styles.modalTitle}>Publication year</Text>
            <ScrollView style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">
              {yearOptions.map((yOpt) => (
                <Pressable
                  key={yOpt == null ? 'none' : yOpt}
                  style={[styles.modalRow, year === yOpt && styles.modalRowOn]}
                  onPress={() => {
                    setYear(yOpt);
                    setYearModal(false);
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
  value,
  onChangeText,
  placeholder,
  multiline,
  numberOfLines,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
}) {
  return (
    <View style={{ width: '100%', gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={warmHaze}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: cascadingWhite },
  center: { alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 78 },
  backText: { fontSize: 15, fontWeight: '600', color: lead },
  screenTitle: { fontSize: 18, fontWeight: '800', color: lead },
  scroll: { paddingHorizontal: 20, paddingBottom: 32, paddingTop: 8 },
  label: { fontSize: 13, fontWeight: '700', color: warmHaze },
  input: {
    backgroundColor: '#f3f3f5',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: lead,
  },
  inputMultiline: { minHeight: 96, paddingTop: 12, marginBottom: 2 },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f3f5',
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
  chipOn: { backgroundColor: crunch, borderColor: crunch },
  chipTxt: { fontSize: 13, fontWeight: '700', color: textSecondary, textTransform: 'capitalize' },
  chipTxtOn: { color: lead },
  submit: {
    marginTop: 8,
    backgroundColor: crunch,
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
  modalRowOn: { backgroundColor: '#f3f3f5' },
  modalRowTxt: { fontSize: 16, color: lead, fontWeight: '600' },
});
