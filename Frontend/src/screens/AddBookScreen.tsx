import { useMemo, useState } from 'react';
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
  crunch,
  dreamland,
  lead,
  textSecondary,
  warmHaze,
} from '../theme/colors';
import { FORM_SCROLL_GAP } from '../theme/formLayout';
import { cardShadow } from '../theme/shadows';

type Props = NativeStackScreenProps<BrowseStackParamList, 'AddBook'>;

const CONDITIONS = ['new', 'good', 'poor'] as const;
const MAX_TEXT = 120;
const MIN_YEAR = 1900;

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

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    const list: (number | null)[] = [null];
    for (let i = 0; i <= y - MIN_YEAR; i += 1) {
      list.push(y - i);
    }
    return list;
  }, []);
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
    const nowYear = new Date().getFullYear();

    if (!t || !a) {
      alertOk('Missing fields', 'Title and author are required.');
      return;
    }
    if (t.length < 2 || a.length < 2) {
      alertOk('Too short', 'Title and author must be at least 2 characters.');
      return;
    }
    if (t.length > MAX_TEXT || a.length > MAX_TEXT) {
      alertOk('Too long', `Title and author must be ${MAX_TEXT} characters or fewer.`);
      return;
    }
    if (l && l.length > 40) {
      alertOk('Invalid details', 'Language text is too long.');
      return;
    }
    if (d.length > 2000) {
      alertOk('Too long', 'Description must be 2000 characters or fewer.');
      return;
    }
    if (loc.length > 120) {
      alertOk('Too long', 'Location must be 120 characters or fewer.');
      return;
    }
    if (year != null && (!Number.isFinite(year) || year < MIN_YEAR || year > nowYear + 1)) {
      alertOk('Invalid year', `Pick a year between ${MIN_YEAR} and ${nowYear + 1}.`);
      return;
    }

    setBusy(true);
    try {
      let coverImageUrl = '';
      if (coverUri) {
        coverImageUrl = await uploadCoverIfNeeded();
      }
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
          contentContainerStyle={[styles.scroll, { paddingBottom: 40, gap: FORM_SCROLL_GAP }]}
          keyboardShouldPersistTaps="handled"
        >
          <FormImageAttachment
            previewUri={coverUri}
            onPick={pickCover}
            onRemove={() => {
              setCoverUri(null);
              setCoverMime(null);
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

          <Text style={styles.label}>Publication year (optional)</Text>
          <Pressable style={styles.selectRow} onPress={() => setYearModal(true)}>
            <Text style={styles.selectVal}>{year == null ? 'Not specified' : String(year)}</Text>
            <Ionicons name="chevron-down" size={20} color={lead} />
          </Pressable>

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
              <Field label="Language" value={language} onChangeText={setLanguage} placeholder="Sinhala / Tamil / English" />
            </View>
          </View>

          <Text style={styles.hint}>
            After someone&apos;s request is accepted, you&apos;ll choose the meet-up collection point in that chat.
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
  hint: { fontSize: 13, color: textSecondary, lineHeight: 18, marginTop: 4 },
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
  modalRowTitle: { fontSize: 16, fontWeight: '800', color: lead },
  modalRowSub: { fontSize: 13, color: textSecondary, marginTop: 4 },
});
