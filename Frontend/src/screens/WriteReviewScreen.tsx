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
import { FormImageAttachment } from '../components/FormImageAttachment';
import { api, apiErrorMessage } from '../lib/api';
import { alertOk } from '../lib/platformAlert';
import type { RequestsStackParamList } from '../navigation/requestsStackTypes';
import { dreamland, lead, textSecondary, themeDanger, warmHaze, themePageBg, themePrimary, themeSurfaceMuted } from '../theme/colors';
import { FORM_SCROLL_GAP } from '../theme/formLayout';
import { cardShadow } from '../theme/shadows';
import {
  isValidMongoIdHex,
  normalizeMongoId,
  REVIEW_COMMENT_MAX_LENGTH,
  REVIEW_COMMENT_MIN_LENGTH,
  validateReviewComment,
  validateReviewRating,
} from '../lib/reviewFormRules';

type Props = NativeStackScreenProps<RequestsStackParamList, 'WriteReview'>;

export function WriteReviewScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { exchangeRequestId: exchangeIdRaw, revieweeClerkUserId, revieweeName } = route.params;
  const exchangeRequestId = normalizeMongoId(exchangeIdRaw);
  const [rating, setRating] = useState<number | null>(null);
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
      aspect: [3, 4],
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
    if (!isValidMongoIdHex(exchangeRequestId)) {
      alertOk('Error', 'Invalid exchange reference. Go back and open the review action again.');
      return;
    }
    const clerkErr =
      typeof revieweeClerkUserId === 'string' && revieweeClerkUserId.trim().length > 0 ? null : 'Missing lister.';
    if (clerkErr) {
      alertOk('Error', clerkErr);
      return;
    }
    const ratingErr = validateReviewRating(rating);
    if (ratingErr) {
      alertOk('Rating', ratingErr);
      return;
    }
    const commentErr = validateReviewComment(comment);
    if (commentErr) {
      alertOk('Comment', commentErr);
      return;
    }

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
      alertOk('Error', apiErrorMessage(e, 'Could not submit'));
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
        contentContainerStyle={[styles.scroll, { gap: FORM_SCROLL_GAP }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.head}>Rate {revieweeName}</Text>
        <Text style={styles.subHead}>One review per exchange. After you submit, you cannot add another for this swap.</Text>
        <Text style={styles.label}>
          Rating <Text style={styles.reqStar}>*</Text>
        </Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setRating(n)} hitSlop={6}>
              <Text style={[styles.starBtn, rating != null && n <= rating ? styles.starOn : null]}>
                {rating != null && n <= rating ? '\u2605' : '\u2606'}
              </Text>
            </Pressable>
          ))}
        </View>
        {rating == null ? (
          <Text style={styles.helper}>Tap stars to rate this swap.</Text>
        ) : null}
        <Text style={styles.label}>
          Comment <Text style={styles.reqStar}>*</Text>
        </Text>
        <TextInput
          value={comment}
          onChangeText={(t) =>
            setComment(t.length <= REVIEW_COMMENT_MAX_LENGTH ? t : t.slice(0, REVIEW_COMMENT_MAX_LENGTH))
          }
          placeholder="How did the swap go? (You can start with a number.)"
          placeholderTextColor={warmHaze}
          style={styles.input}
          multiline
        />
        <Text style={styles.counter}>
          {comment.trim().length}/{REVIEW_COMMENT_MIN_LENGTH}+ characters (max {REVIEW_COMMENT_MAX_LENGTH})
        </Text>
        <FormImageAttachment
          previewUri={photoUri}
          onPick={pick}
          onRemove={() => {
            setPhotoUri(null);
            setPhotoMime(null);
          }}
          emptyHint="Tap to add evidence photo (optional)"
        />
        <Pressable style={[styles.submit, cardShadow]} onPress={() => void submit()} disabled={busy}>
          {busy ? <ActivityIndicator color={lead} /> : <Text style={styles.submitTxt}>Submit review</Text>}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: themePageBg },
  topBar: { paddingHorizontal: 12, paddingBottom: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  backText: { fontSize: 16, fontWeight: '600', color: lead },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },
  head: { fontSize: 22, fontWeight: '800', color: lead },
  subHead: { fontSize: 14, color: textSecondary, lineHeight: 20, marginTop: 4 },
  label: { fontSize: 13, fontWeight: '700', color: warmHaze },
  reqStar: { color: themeDanger, fontWeight: '800' },
  starsRow: { flexDirection: 'row', gap: 8 },
  starBtn: { fontSize: 32, color: dreamland },
  starOn: { color: '#e6b800' },
  helper: { fontSize: 13, color: textSecondary },
  counter: { fontSize: 12, color: warmHaze, marginTop: -4 },
  input: {
    minHeight: 100,
    backgroundColor: themeSurfaceMuted,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    padding: 14,
    fontSize: 16,
    color: lead,
    textAlignVertical: 'top',
    marginBottom: 2,
  },
  submit: {
    marginTop: 8,
    backgroundColor: themePrimary,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitTxt: { fontSize: 16, fontWeight: '800', color: lead },
});
