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
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormImageAttachment } from '../components/FormImageAttachment';
import { api, apiErrorMessage, apiPostFormData } from '../lib/api';
import { alertOk } from '../lib/platformAlert';
import { BOOK_TYPES, type BookType } from '../constants/bookTypes';
import type { WishlistStackParamList } from '../navigation/wishlistStackTypes';
import type { WishlistItem } from '../types/wishlist';
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

type Props = NativeStackScreenProps<WishlistStackParamList, 'PostWanted'>;

const URGENCY = ['high', 'medium', 'low'] as const;

export function PostWantedBookScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const editItemId = route.params?.editItemId;
  const isEdit = Boolean(editItemId);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState<BookType | ''>('');
  const [language, setLanguage] = useState('');
  const [urgency, setUrgency] = useState<(typeof URGENCY)[number]>('medium');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEdit);
  const [year, setYear] = useState<number | null>(null);
  const [yearModal, setYearModal] = useState(false);
  const [genreModal, setGenreModal] = useState(false);

  const yearOptions = useMemo(() => publicationYearPastOptions(MIN_PUBLICATION_YEAR), []);

  useEffect(() => {
    if (!editItemId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ item: WishlistItem }>(`/api/wishlist/${editItemId}`);
        if (cancelled) return;
        const it = res.data.item;
        setTitle(it.title ?? '');
        setAuthor(it.author ?? '');
        setDescription(it.description ?? '');
        const g = typeof it.subject === 'string' && BOOK_TYPES.includes(it.subject as BookType) ? (it.subject as BookType) : '';
        setGenre(g);
        setLanguage(it.language ?? '');
        setUrgency(
          (['high', 'medium', 'low'] as const).includes(it.urgency as 'high' | 'medium' | 'low')
            ? (it.urgency as (typeof URGENCY)[number])
            : 'medium'
        );
        setExistingPhotoUrl(it.wantedBookPhoto ?? '');
        const pastMax = maxPastPublicationYear();
        const yNum = typeof it.year === 'number' && Number.isFinite(it.year) ? it.year : null;
        setYear(yNum !== null && yNum >= MIN_PUBLICATION_YEAR && yNum <= pastMax ? yNum : null);
      } catch (e: unknown) {
        if (cancelled) return;
        alertOk('Error', apiErrorMessage(e, 'Could not load wanted book'));
      } finally {
        if (!cancelled) setLoadingEdit(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editItemId]);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      alertOk('Permission needed', 'Allow photo library access to add wanted book image.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });
    if (!res.canceled && res.assets[0]) {
      setPhotoUri(res.assets[0].uri);
      setPhotoMime(res.assets[0].mimeType ?? 'image/jpeg');
    }
  };

  const uploadPhotoIfNeeded = async (): Promise<string> => {
    if (!photoUri) return existingPhotoUrl;
    const form = new FormData();
    const name = photoMime?.includes('png') ? 'wanted.png' : 'wanted.jpg';
    const type = photoMime ?? 'image/jpeg';
    if (Platform.OS === 'web') {
      const blobRes = await fetch(photoUri);
      const blob = await blobRes.blob();
      const mime = blob.type && blob.type.startsWith('image/') ? blob.type : type;
      if (typeof File !== 'undefined') form.append('image', new File([blob], name, { type: mime }));
      else form.append('image', blob, name);
    } else {
      form.append('image', { uri: photoUri, name, type } as unknown as Blob);
    }
    const { data } = await apiPostFormData('/api/upload/image', form);
    const payload = data as { url?: string };
    return payload.url ?? '';
  };

  const submit = async () => {
    const ti = title.trim();
    if (!ti) {
      alertOk('Title required', 'What book are you looking for?');
      return;
    }
    if (trimmedTitleBeginsWithDigit(title)) {
      alertOk('Invalid title', "Title can't start with a number.");
      return;
    }
    const au = author.trim();
    if (au && !isLettersOnlyNameText(au)) {
      alertOk('Invalid author', 'Please check the author name.');
      return;
    }
    const lang = language.trim();
    if (lang !== '' && !isLettersOnlyNameText(lang)) {
      alertOk('Invalid language', 'Please check the language.');
      return;
    }
    const pastMax = maxPastPublicationYear();
    if (
      year !== null &&
      (!Number.isFinite(year) || year < MIN_PUBLICATION_YEAR || year > pastMax)
    ) {
      alertOk(
        'Invalid year',
        pastMax < MIN_PUBLICATION_YEAR
          ? `Pick a year from ${MIN_PUBLICATION_YEAR} onward.`
          : `Pick a year from ${MIN_PUBLICATION_YEAR} to ${pastMax}.`
      );
      return;
    }
    const previewCombined = `${photoUri || ''}${existingPhotoUrl || ''}`.trim();
    if (!previewCombined) {
      alertOk('Photo required', 'Add a photo of the book you are looking for.');
      return;
    }
    const desc = description.trim();
    setBusy(true);
    try {
      const wantedBookPhoto = await uploadPhotoIfNeeded();
      if (!wantedBookPhoto.trim()) {
        alertOk('Photo required', 'Add a photo of the book you are looking for.');
        return;
      }
      const payload: Record<string, unknown> = {
        title: ti,
        author: au,
        description: desc,
        subject: genre,
        grade: '',
        language: lang,
        urgency,
        wantedBookPhoto,
      };
      if (year !== null) {
        payload.year = year;
      } else if (isEdit && editItemId) {
        payload.year = null;
      }
      if (isEdit && editItemId) {
        await api.put(`/api/wishlist/${editItemId}`, payload);
        alertOk('Saved', 'Your wanted book has been updated.', () => navigation.goBack());
      } else {
        await api.post('/api/wishlist', payload);
        alertOk('Success', 'Your wanted book is on the community board.', () => {
          setTitle('');
          setAuthor('');
          setDescription('');
          setGenre('');
          setLanguage('');
          setYear(null);
          setUrgency('medium');
          setPhotoUri(null);
          setPhotoMime(null);
          navigation.goBack();
        });
      }
    } catch (e: unknown) {
      alertOk('Error', apiErrorMessage(e, isEdit ? 'Could not save' : 'Could not post'));
    } finally {
      setBusy(false);
    }
  };

  if (loadingEdit) {
    return (
      <View style={[styles.flex, { paddingTop: Math.max(insets.top, 8) }]}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={lead} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.screenTitle}>Edit wanted</Text>
          <View style={{ width: 72 }} />
        </View>
        <ActivityIndicator style={{ marginTop: 40 }} color={themePrimary} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={lead} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.screenTitle}>{isEdit ? 'Edit wanted' : 'Post wanted'}</Text>
        <View style={{ width: 72 }} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.scroll, { gap: FORM_SCROLL_GAP }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.hint}>
          {isEdit
            ? 'Update the details of your wanted book.'
            : 'Tell the community what you need. Other readers may offer a swap.'}
        </Text>
        <Text style={styles.label}>
          Book photo <Text style={styles.reqMark}>*</Text>
        </Text>
        <FormImageAttachment
          previewUri={photoUri || existingPhotoUrl}
          onPick={pickPhoto}
          onRemove={() => {
            setPhotoUri(null);
            setPhotoMime(null);
            setExistingPhotoUrl('');
          }}
          emptyHint="Tap to add book photo (required)"
        />
        <Field label="Title" value={title} onChangeText={setTitle} placeholder="ICT Revision Guide 2024" />
        <Field label="Author (optional)" value={author} onChangeText={(v) => setAuthor(filterToLettersOnlyNameText(v))} />
        <Field
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Add details for helpers..."
          multiline
          numberOfLines={4}
        />
        <Field
          label="Language (optional)"
          value={language}
          onChangeText={(v) => setLanguage(filterToLettersOnlyNameText(v))}
          placeholder="Sinhala, English, Tamil…"
          maxLength={80}
        />
        <Text style={styles.label}>Book type / genre (optional)</Text>
        <Pressable
          style={styles.selectRow}
          onPress={() => setGenreModal(true)}
          accessibilityRole="button"
          accessibilityLabel="Select book type"
        >
          <Text style={[styles.selectVal, !genre && styles.selectPlaceholder]} numberOfLines={2}>
            {genre || 'Select book type'}
          </Text>
          <Ionicons name="chevron-down" size={20} color={lead} />
        </Pressable>
        <Text style={styles.label}>Book year (optional)</Text>
        <Pressable style={styles.selectRow} onPress={() => setYearModal(true)}>
          <Text style={[styles.selectVal, year == null && styles.selectPlaceholder]}>
            {year == null ? 'Not specified' : String(year)}
          </Text>
          <Ionicons name="chevron-down" size={20} color={lead} />
        </Pressable>
        <Text style={styles.label}>Urgency</Text>
        <View style={styles.chipRow}>
          {URGENCY.map((u) => (
            <Pressable key={u} onPress={() => setUrgency(u)} style={[styles.chip, urgency === u && styles.chipOn]}>
              <Text style={[styles.chipTxt, urgency === u && styles.chipTxtOn]}>{u}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={[styles.submit, cardShadow]} onPress={() => void submit()} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={lead} />
          ) : (
            <Text style={styles.submitTxt}>{isEdit ? 'Save changes' : 'Publish wanted book'}</Text>
          )}
        </Pressable>
      </ScrollView>
      <Modal visible={genreModal} animationType="slide" transparent onRequestClose={() => setGenreModal(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setGenreModal(false)} />
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>Book type</Text>
              <Pressable onPress={() => setGenreModal(false)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close book type menu">
                <Text style={styles.modalDone}>Done</Text>
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 480 }} keyboardShouldPersistTaps="handled">
              <Pressable
                style={[styles.modalRow, genre === '' && styles.modalRowOn]}
                onPress={() => {
                  setGenre('');
                  setGenreModal(false);
                }}
              >
                <Text style={styles.modalRowTxt}>Not specified</Text>
              </Pressable>
              {BOOK_TYPES.map((g) => (
                <Pressable
                  key={g}
                  style={[styles.modalRow, genre === g && styles.modalRowOn]}
                  onPress={() => {
                    setGenre(g);
                    setGenreModal(false);
                  }}
                >
                  <Text style={styles.modalRowTxt}>{g}</Text>
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
            <Text style={styles.modalSheetTitleStandalone}>Book year</Text>
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
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
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
        maxLength={maxLength}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
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
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },
  hint: { fontSize: 14, color: textSecondary, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '700', color: warmHaze },
  reqMark: { color: themeDanger, fontWeight: '800' },
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
  inputMultiline: { minHeight: 92, paddingTop: 12, marginBottom: 2 },
  row2: { flexDirection: 'row', gap: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    backgroundColor: cascadingWhite,
  },
  chipOn: { backgroundColor: themePrimary, borderColor: themePrimary },
  chipTxt: { fontSize: 14, fontWeight: '700', color: textSecondary, textTransform: 'capitalize' },
  chipTxtOn: { color: cascadingWhite },
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
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: dreamland,
  },
  modalHeaderTitle: { fontSize: 18, fontWeight: '800', color: lead, flex: 1 },
  modalSheetTitleStandalone: { fontSize: 18, fontWeight: '800', color: lead, marginBottom: 10 },
  modalDone: { fontSize: 16, fontWeight: '700', color: themePrimary },
  modalRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: dreamland,
  },
  modalRowOn: { backgroundColor: themeSurfaceMuted },
  modalRowTxt: { fontSize: 16, color: lead, fontWeight: '600' },
  submit: {
    marginTop: 12,
    backgroundColor: themePrimary,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitTxt: { fontSize: 16, fontWeight: '800', color: lead },
});
