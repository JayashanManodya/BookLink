import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { api } from '../lib/api';
import { alertOk } from '../lib/platformAlert';
import type { WishlistStackParamList } from '../navigation/wishlistStackTypes';
import {
  cascadingWhite,
  crunch,
  dreamland,
  lead,
  textSecondary,
  warmHaze,
} from '../theme/colors';
import { cardShadow } from '../theme/shadows';

type Props = NativeStackScreenProps<WishlistStackParamList, 'PostWanted'>;

const URGENCY = ['high', 'medium', 'low'] as const;

export function PostWantedBookScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [language, setLanguage] = useState('');
  const [urgency, setUrgency] = useState<(typeof URGENCY)[number]>('medium');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    if (!photoUri) return '';
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
    const up = await api.post<{ url: string }>('/api/upload/image', form);
    return up.data.url ?? '';
  };

  const submit = async () => {
    if (!title.trim()) {
      alertOk('Title required', 'What book are you looking for?');
      return;
    }
    const desc = description.trim();
    setBusy(true);
    try {
      const wantedBookPhoto = await uploadPhotoIfNeeded();
      await api.post('/api/wishlist', {
        title: title.trim(),
        author: author.trim(),
        description: desc,
        subject: subject.trim(),
        grade: '',
        language: language.trim(),
        urgency,
        wantedBookPhoto,
      });
      alertOk('Success', 'Your wanted book is on the community board.', () => {
        setTitle('');
        setAuthor('');
        setDescription('');
        setSubject('');
        setLanguage('');
        setUrgency('medium');
        setPhotoUri(null);
        setPhotoMime(null);
        navigation.goBack();
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not post';
      alertOk('Error', msg);
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
        <Text style={styles.screenTitle}>Post wanted</Text>
        <View style={{ width: 72 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>Tell the community what you need. Other readers may offer a swap.</Text>
        <Pressable style={[styles.upload, cardShadow]} onPress={() => void pickPhoto()}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
          ) : (
            <Ionicons name="image-outline" size={34} color={warmHaze} />
          )}
          <Text style={styles.uploadHint}>{photoUri ? 'Change wanted photo' : 'Add wanted book photo'}</Text>
        </Pressable>
        <Field label="Title" value={title} onChangeText={setTitle} placeholder="ICT Revision Guide 2024" />
        <Field label="Author (optional)" value={author} onChangeText={setAuthor} />
        <Field
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Add details for helpers..."
          multiline
          numberOfLines={4}
        />
        <Field label="Language (optional)" value={language} onChangeText={setLanguage} placeholder="Sinhala" />
        <Field
          label="Genre / book type (optional)"
          value={subject}
          onChangeText={setSubject}
          placeholder="e.g. Fantasy — helps match listings"
        />
        <Text style={styles.label}>Urgency</Text>
        <View style={styles.chipRow}>
          {URGENCY.map((u) => (
            <Pressable key={u} onPress={() => setUrgency(u)} style={[styles.chip, urgency === u && styles.chipOn]}>
              <Text style={[styles.chipTxt, urgency === u && styles.chipTxtOn]}>{u}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={[styles.submit, cardShadow]} onPress={() => void submit()} disabled={busy}>
          {busy ? <ActivityIndicator color={lead} /> : <Text style={styles.submitTxt}>Publish wanted book</Text>}
        </Pressable>
      </ScrollView>
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
    <View style={{ flex: 1, gap: 6 }}>
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
  scroll: { paddingHorizontal: 20, gap: 12, paddingBottom: 40, paddingTop: 8 },
  hint: { fontSize: 14, color: textSecondary, lineHeight: 20 },
  upload: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: dreamland,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8f8fa',
  },
  preview: { width: 100, height: 130, borderRadius: 10 },
  uploadHint: { fontSize: 13, color: textSecondary, fontWeight: '700' },
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
  inputMultiline: { minHeight: 92, paddingTop: 12 },
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
  chipOn: { backgroundColor: crunch, borderColor: crunch },
  chipTxt: { fontSize: 14, fontWeight: '700', color: textSecondary, textTransform: 'capitalize' },
  chipTxtOn: { color: lead },
  submit: {
    marginTop: 12,
    backgroundColor: crunch,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitTxt: { fontSize: 16, fontWeight: '800', color: lead },
});
