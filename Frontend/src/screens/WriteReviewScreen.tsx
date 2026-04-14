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
import { api } from '../lib/api';
import { alertOk } from '../lib/platformAlert';
import type { RequestsStackParamList } from '../navigation/requestsStackTypes';
import {
  cascadingWhite,
  crunch,
  dreamland,
  lead,
  textSecondary,
  warmHaze,
} from '../theme/colors';
import { cardShadow } from '../theme/shadows';

type Props = NativeStackScreenProps<RequestsStackParamList, 'WriteReview'>;

export function WriteReviewScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { exchangeRequestId, revieweeClerkUserId, revieweeName } = route.params;
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
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

  const uploadEvidence = async (): Promise<string> => {
    if (!photoUri) return '';
    const form = new FormData();
    const name = photoMime?.includes('png') ? 'evidence.png' : 'evidence.jpg';
    const type = photoMime ?? 'image/jpeg';
    if (Platform.OS === 'web') {
      const blobRes = await fetch(photoUri);
      const blob = await blobRes.blob();
      const mime = blob.type && blob.type.startsWith('image/') ? blob.type : type;
      if (typeof File !== 'undefined') {
        form.append('evidencePhoto', new File([blob], name, { type: mime }));
      } else {
        form.append('evidencePhoto', blob, name);
      }
    } else {
      form.append('evidencePhoto', { uri: photoUri, name, type } as unknown as Blob);
    }
    const up = await api.post<{ url: string }>('/api/upload/evidence', form);
    return up.data.url ?? '';
  };

  const submit = async () => {
    setBusy(true);
    try {
      let evidencePhoto = '';
      if (photoUri) {
        evidencePhoto = await uploadEvidence();
      }
      await api.post('/api/reviews', {
        exchangeRequestId,
        revieweeClerkUserId,
        rating,
        comment: comment.trim(),
        evidencePhoto,
      });
      alertOk('Thanks', 'Your review was posted.', () => navigation.goBack());
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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.head}>Rate {revieweeName}</Text>
        <Text style={styles.label}>Rating</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setRating(n)} hitSlop={6}>
              <Text style={[styles.starBtn, n <= rating && styles.starOn]}>{n <= rating ? '\u2605' : '\u2606'}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Comment</Text>
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="How did the swap go?"
          placeholderTextColor={warmHaze}
          style={styles.input}
          multiline
        />
        <Pressable style={styles.pickBtn} onPress={() => void pick()}>
          <Text style={styles.pickTxt}>{photoUri ? 'Change photo' : 'Add evidence photo (optional)'}</Text>
        </Pressable>
        <Pressable style={[styles.submit, cardShadow]} onPress={() => void submit()} disabled={busy}>
          {busy ? <ActivityIndicator color={lead} /> : <Text style={styles.submitTxt}>Submit review</Text>}
        </Pressable>
      </ScrollView>
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
  label: { fontSize: 13, fontWeight: '700', color: warmHaze },
  starsRow: { flexDirection: 'row', gap: 8 },
  starBtn: { fontSize: 32, color: dreamland },
  starOn: { color: '#e6b800' },
  input: {
    minHeight: 100,
    backgroundColor: '#f3f3f5',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    padding: 14,
    fontSize: 16,
    color: lead,
    textAlignVertical: 'top',
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
