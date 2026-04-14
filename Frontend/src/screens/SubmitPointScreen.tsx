import { useState } from 'react';
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
import { LocationMapPicker } from '../components/LocationMapPicker';
import { api } from '../lib/api';
import { alertOk } from '../lib/platformAlert';
import type { ProfileStackParamList } from '../navigation/profileStackTypes';
import {
  cascadingWhite,
  crunch,
  dreamland,
  lead,
  textSecondary,
  warmHaze,
} from '../theme/colors';
import { cardShadow } from '../theme/shadows';

type Props = NativeStackScreenProps<ProfileStackParamList, 'SubmitPoint'>;

/** Default map center when the picker first opens — drag the pin to the real spot. */
const DEFAULT_PIN_LAT = 7.8731;
const DEFAULT_PIN_LNG = 80.7718;

export function SubmitPointScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [pinLat, setPinLat] = useState(DEFAULT_PIN_LAT);
  const [pinLng, setPinLng] = useState(DEFAULT_PIN_LNG);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [association, setAssociation] = useState('');
  const [operatingHours, setOperatingHours] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      alertOk('Permission needed', 'Allow photo library access.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });
    if (!res.canceled && res.assets[0]) {
      setPhotoUri(res.assets[0].uri);
      setPhotoMime(res.assets[0].mimeType ?? 'image/jpeg');
    }
  };

  const uploadPhoto = async (): Promise<string> => {
    if (!photoUri) return '';
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
    const up = await api.post<{ url: string }>('/api/upload/location', form);
    return up.data.url ?? '';
  };

  const submit = async () => {
    if (!name.trim() || !city.trim() || !address.trim()) {
      alertOk('Required', 'Name, city, and address are required.');
      return;
    }
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
    setBusy(true);
    try {
      const locationPhoto = await uploadPhoto();
      await api.post('/api/points', {
        name: name.trim(),
        city: city.trim(),
        address: address.trim(),
        association: association.trim(),
        operatingHours: operatingHours.trim(),
        contactNumber: contactNumber.trim(),
        locationPhoto,
        latitude: pinLat,
        longitude: pinLng,
      });
      alertOk('Thanks', 'Collection point submitted.', () => navigation.goBack());
    } catch (e: unknown) {
      alertOk('Error', e instanceof Error ? e.message : 'Could not submit');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={lead} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <Text style={styles.head}>Suggest a collection point</Text>
        <Text style={styles.mapSectionTitle}>Select location on the map</Text>
        <Text style={styles.mapSectionSub}>
          The pin marks where exchanges happen. Tap the map or drag the pin — required before you submit.
        </Text>
        <LocationMapPicker
          latitude={pinLat}
          longitude={pinLng}
          onChange={(lat, lng) => {
            setPinLat(lat);
            setPinLng(lng);
          }}
        />
        <Text style={styles.detailsTitle}>Place details</Text>
        <Field label="Name" value={name} onChange={setName} />
        <CityDictionarySelect value={city} onChange={setCity} />
        <Field label="Address" value={address} onChange={setAddress} multiline />
        <Field label="Association (optional)" value={association} onChange={setAssociation} />
        <Field label="Hours (optional)" value={operatingHours} onChange={setOperatingHours} />
        <Field label="Contact (optional)" value={contactNumber} onChange={setContactNumber} />
        <Pressable style={styles.pickBtn} onPress={() => void pick()}>
          <Text style={styles.pickTxt}>{photoUri ? 'Change photo' : 'Add location photo (optional)'}</Text>
        </Pressable>
        <Pressable style={[styles.submit, cardShadow]} onPress={() => void submit()} disabled={busy}>
          {busy ? <ActivityIndicator color={lead} /> : <Text style={styles.submitTxt}>Submit</Text>}
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholderTextColor={warmHaze}
        style={[styles.input, multiline && { minHeight: 72, textAlignVertical: 'top' }]}
        multiline={multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: cascadingWhite },
  topBar: { paddingHorizontal: 12, paddingBottom: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  backText: { fontSize: 16, fontWeight: '600', color: lead },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 12, paddingTop: 8 },
  head: { fontSize: 22, fontWeight: '800', color: lead },
  mapSectionTitle: { fontSize: 17, fontWeight: '800', color: lead, marginTop: 4 },
  mapSectionSub: { fontSize: 14, color: textSecondary, lineHeight: 20 },
  detailsTitle: { fontSize: 15, fontWeight: '800', color: lead, marginTop: 8 },
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
  pickBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  pickTxt: { fontSize: 14, fontWeight: '700', color: textSecondary },
  submit: {
    marginTop: 8,
    backgroundColor: crunch,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitTxt: { fontSize: 16, fontWeight: '800', color: lead },
});
