import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { CityDictionarySelect } from '../components/CityDictionarySelect';
import { FormImageAttachment } from '../components/FormImageAttachment';
import { LocationMapPicker } from '../components/LocationMapPicker';
import { api, apiErrorMessage, apiPostFormData } from '../lib/api';
import { alertOk } from '../lib/platformAlert';
import { computeCollectionPointFieldErrors } from '../lib/collectionPointFormRules';
import { sanitizeMeetupPhoneDigits } from '../lib/meetupFormRules';
import type { ProfileStackParamList } from '../navigation/profileStackTypes';
import { dreamland, lead, textSecondary, warmHaze, themePageBg, themePrimary, themeSurfaceMuted } from '../theme/colors';
import { FORM_SCROLL_GAP } from '../theme/formLayout';
import { cardShadow } from '../theme/shadows';
import type { CollectionPoint } from '../types/point';

type Props = NativeStackScreenProps<ProfileStackParamList, 'SubmitPoint'>;

/** Default map center when the picker first opens — drag the pin to the real spot. */
const DEFAULT_PIN_LAT = 7.8731;
const DEFAULT_PIN_LNG = 80.7718;

export function SubmitPointScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const editingId = route.params?.pointId;
  const isEdit = Boolean(editingId);

  const [pinLat, setPinLat] = useState(DEFAULT_PIN_LAT);
  const [pinLng, setPinLng] = useState(DEFAULT_PIN_LNG);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string>('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [mapPickerEpoch, setMapPickerEpoch] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const lastBootEditId = useRef<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  useEffect(() => {
    if (!isEdit || !editingId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ point: CollectionPoint }>(`/api/points/${editingId}`);
        if (cancelled) return;
        const p = res.data.point;
        if (!p) return;
        setName(p.name ?? '');
        setCity(p.city ?? '');
        setAddress(p.address ?? '');
        setContactNumber(sanitizeMeetupPhoneDigits(p.contactNumber ?? ''));
        setExistingPhotoUrl(p.locationPhoto ?? '');
        if (typeof p.latitude === 'number') setPinLat(p.latitude);
        if (typeof p.longitude === 'number') setPinLng(p.longitude);
      } catch (e: unknown) {
        alertOk('Error', apiErrorMessage(e, 'Could not load point'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, editingId]);

  useEffect(() => {
    if (!isEdit || !editingId) {
      lastBootEditId.current = null;
      return;
    }
    if (loading) return;
    if (lastBootEditId.current !== editingId) {
      lastBootEditId.current = editingId;
      setMapPickerEpoch((e) => e + 1);
    }
  }, [isEdit, editingId, loading]);

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      alertOk('Permission needed', 'Allow photo library access.');
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

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoUri) return null;
    const form = new FormData();
    const fname = photoMime?.includes('png') ? 'loc.png' : 'loc.jpg';
    const type = photoMime ?? 'image/jpeg';
    if (Platform.OS === 'web') {
      const blobRes = await fetch(photoUri);
      const blob = await blobRes.blob();
      const mime = blob.type && blob.type.startsWith('image/') ? blob.type : type;
      if (typeof File !== 'undefined') {
        form.append('locationPhoto', new File([blob], fname, { type: mime }));
      } else {
        form.append('locationPhoto', blob, fname);
      }
    } else {
      form.append('locationPhoto', { uri: photoUri, name: fname, type } as unknown as Blob);
    }
    const { data } = await apiPostFormData('/api/upload/location', form);
    const payload = data as { url?: string };
    return payload.url ?? '';
  };

  const submit = async () => {
    const nextErrors = computeCollectionPointFieldErrors({ name, city, address, contactNumber });
    if (
      !Number.isFinite(pinLat) ||
      !Number.isFinite(pinLng) ||
      pinLat < -90 ||
      pinLat > 90 ||
      pinLng < -180 ||
      pinLng > 180
    ) {
      alertOk('Map', 'Choose a location on the map by tapping or dragging the pin.');
      return;
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setFieldErrors({});
    setBusy(true);
    try {
      const uploaded = await uploadPhoto();
      const locationPhoto = uploaded ?? existingPhotoUrl ?? '';
      const contactDigits = sanitizeMeetupPhoneDigits(contactNumber);
      const payload = {
        name: name.trim(),
        city: city.trim(),
        address: address.trim(),
        contactNumber: contactDigits,
        locationPhoto,
        latitude: pinLat,
        longitude: pinLng,
      };
      if (isEdit && editingId) {
        await api.put(`/api/points/${editingId}`, payload);
        alertOk('Saved', 'Collection point updated.', () => navigation.goBack());
      } else {
        await api.post('/api/points', payload);
        alertOk('Thanks', 'Collection point submitted.', () => navigation.goBack());
      }
    } catch (e: unknown) {
      alertOk('Error', apiErrorMessage(e, isEdit ? 'Could not save changes' : 'Could not submit'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.flex, styles.center]}>
        <ActivityIndicator color={themePrimary} />
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
      </View>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.scroll, { gap: FORM_SCROLL_GAP }]}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <Text style={styles.head}>
          {isEdit ? 'Edit collection point' : 'Add a collection point'}
        </Text>
        <Text style={styles.mapSectionTitle}>Select location on the map</Text>
        <Text style={styles.mapSectionSub}>
          The pin marks where exchanges happen. Tap the map or drag the pin — required before you save.
        </Text>
        <LocationMapPicker
          key={`map-${mapPickerEpoch}`}
          latitude={pinLat}
          longitude={pinLng}
          onChange={(lat, lng) => {
            setPinLat(lat);
            setPinLng(lng);
          }}
        />
        <Text style={styles.detailsTitle}>Place details</Text>
        <Field
          label="Name"
          required
          value={name}
          error={fieldErrors.name}
          onChangeText={(t) => {
            setName(t);
            clearFieldError('name');
          }}
        />
        <CityDictionarySelect
          value={city}
          onChange={(c) => {
            setCity(c);
            clearFieldError('city');
          }}
          error={fieldErrors.city}
        />
        <Field
          label="Address"
          required
          value={address}
          error={fieldErrors.address}
          onChangeText={(t) => {
            setAddress(t);
            clearFieldError('address');
          }}
          multiline
        />
        <Field
          label="Contact number"
          required
          value={contactNumber}
          error={fieldErrors.contactNumber}
          onChangeText={(t) => {
            setContactNumber(sanitizeMeetupPhoneDigits(t));
            clearFieldError('contactNumber');
          }}
          placeholder="10 digits — e.g. 0770123456"
          keyboardType="number-pad"
          maxLength={10}
          inputMode="numeric"
        />
        <FormImageAttachment
          previewUri={photoUri || existingPhotoUrl}
          onPick={pick}
          onRemove={() => {
            setPhotoUri(null);
            setPhotoMime(null);
            setExistingPhotoUrl('');
          }}
          emptyHint="Tap to add location photo (optional)"
        />
        <Pressable style={[styles.submit, cardShadow]} onPress={() => void submit()} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={lead} />
          ) : (
            <Text style={styles.submitTxt}>{isEdit ? 'Save changes' : 'Submit'}</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  multiline,
  error,
  required,
  placeholder,
  keyboardType,
  maxLength,
  inputMode,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  multiline?: boolean;
  error?: string;
  required?: boolean;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad';
  maxLength?: number;
  inputMode?: 'numeric' | 'text';
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
        style={[styles.input, multiline && styles.inputMultiline, error && styles.inputInvalid]}
        multiline={multiline}
        keyboardType={keyboardType}
        maxLength={maxLength}
        inputMode={inputMode}
        autoCapitalize={keyboardType === 'number-pad' ? 'none' : 'sentences'}
        autoCorrect={keyboardType !== 'number-pad'}
      />
      {error ? <Text style={styles.fieldErrorTxt}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: themePageBg },
  center: { alignItems: 'center', justifyContent: 'center' },
  topBar: { paddingHorizontal: 12, paddingBottom: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  backText: { fontSize: 16, fontWeight: '600', color: lead },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },
  head: { fontSize: 22, fontWeight: '800', color: lead },
  mapSectionTitle: { fontSize: 17, fontWeight: '800', color: lead, marginTop: 4 },
  mapSectionSub: { fontSize: 14, color: textSecondary, lineHeight: 20 },
  detailsTitle: { fontSize: 15, fontWeight: '800', color: lead, marginTop: 8 },
  reqMark: { color: '#b3261e', fontWeight: '800' },
  label: { fontSize: 13, fontWeight: '700', color: warmHaze },
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
  inputMultiline: { minHeight: 72, textAlignVertical: 'top', marginBottom: 2 },
  inputInvalid: { borderColor: '#b3261e', borderWidth: 1 },
  fieldErrorTxt: { fontSize: 13, fontWeight: '600', color: '#b3261e' },
  submit: {
    marginTop: 8,
    backgroundColor: themePrimary,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitTxt: { fontSize: 16, fontWeight: '800', color: lead },
});
