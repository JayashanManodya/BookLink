import { useCallback, useEffect, useState } from 'react';
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
import { api, apiErrorMessage, apiPostFormData } from '../lib/api';
import { alertOk } from '../lib/platformAlert';
import type { WriteReviewParams } from '../navigation/sharedScreenTypes';
import type { Review } from '../types/review';
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

type Props = NativeStackScreenProps<{ WriteReview: WriteReviewParams }, 'WriteReview'>;

function prefilledReviewMatches(reviewId: string, snap: Review | undefined): snap is Review {
  if (!snap || !reviewId) return false;
  const sid = normalizeMongoId(String(snap._id));
  return isValidMongoIdHex(sid) && sid === reviewId;
}

export function WriteReviewScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const editReviewIdRaw = route.params.editReviewId;
  const editReviewId = editReviewIdRaw ? normalizeMongoId(editReviewIdRaw) : '';
  const isEditMode = Boolean(editReviewId && isValidMongoIdHex(editReviewId));
  const editPrefillReview = route.params.editPrefillReview;
  const canPrefillEdit = isEditMode && prefilledReviewMatches(editReviewId, editPrefillReview);

  const exchangeIdNew = normalizeMongoId(route.params.exchangeRequestId ?? '');
  const revieweeClerkUserIdParam =
    typeof route.params.revieweeClerkUserId === 'string' ? route.params.revieweeClerkUserId.trim() : '';
  const revieweeNameParam =
    typeof route.params.revieweeName === 'string' && route.params.revieweeName.trim()
      ? route.params.revieweeName.trim()
      : 'Lister';

  const [reviewLoading, setReviewLoading] = useState(isEditMode && !canPrefillEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revieweeName, setRevieweeName] = useState(revieweeNameParam);
  const [rating, setRating] = useState<number | null>(() =>
    canPrefillEdit ? editPrefillReview.rating : null
  );
  const [comment, setComment] = useState(() => (canPrefillEdit ? (editPrefillReview.comment ?? '') : ''));
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState<string | null>(null);
  const [existingEvidenceUrl, setExistingEvidenceUrl] = useState(() =>
    canPrefillEdit && editPrefillReview.evidencePhoto?.trim()
      ? editPrefillReview.evidencePhoto.trim()
      : ''
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isEditMode) {
      setReviewLoading(false);
      setRevieweeName(revieweeNameParam);
      return;
    }
    const snap = route.params.editPrefillReview;
    if (prefilledReviewMatches(editReviewId, snap)) {
      setRating(snap.rating);
      setComment(snap.comment ?? '');
      setExistingEvidenceUrl(snap.evidencePhoto?.trim() ? snap.evidencePhoto.trim() : '');
      setRevieweeName(snap.revieweeDisplayName?.trim() || revieweeNameParam);
      setPhotoUri(null);
      setPhotoMime(null);
      setLoadError(null);
      setReviewLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setReviewLoading(true);
      setLoadError(null);
      try {
        const res = await api.get<{ review: Review }>(`/api/reviews/${editReviewId}`);
        if (cancelled) return;
        const rv = res.data.review;
        setRating(rv.rating);
        setComment(rv.comment ?? '');
        setExistingEvidenceUrl(rv.evidencePhoto?.trim() ? rv.evidencePhoto.trim() : '');
        setRevieweeName(rv.revieweeDisplayName?.trim() || revieweeNameParam);
        setPhotoUri(null);
        setPhotoMime(null);
      } catch (e: unknown) {
        if (!cancelled) {
          setLoadError(apiErrorMessage(e, 'Could not load review'));
        }
      } finally {
        if (!cancelled) setReviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEditMode, editReviewId, revieweeNameParam, route.params.editPrefillReview]);

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
      setExistingEvidenceUrl('');
    }
  };

  const uploadEvidence = useCallback(async (): Promise<string> => {
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
    const { data } = await apiPostFormData('/api/upload/evidence', form);
    const payload = data as { url?: string };
    return payload.url ?? '';
  }, [photoMime, photoUri]);

  const submit = async () => {
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
      } else if (existingEvidenceUrl) {
        evidencePhoto = existingEvidenceUrl;
      } else {
        evidencePhoto = '';
      }

      if (isEditMode) {
        /** Use `POST /api/reviews` (same handler as creating a review). Some hosts 404 nested paths like `/:id/update`. */
        await api.post('/api/reviews', {
          updateReviewId: editReviewId,
          reviewId: editReviewId,
          rating,
          comment: comment.trim(),
          evidencePhoto,
        });
        alertOk('Saved', 'Your review was updated.', () => navigation.goBack());
        return;
      }

      if (!isValidMongoIdHex(exchangeIdNew)) {
        alertOk('Error', 'Invalid exchange reference. Go back and open the review action again.');
        return;
      }
      const clerkErr = revieweeClerkUserIdParam ? null : 'Missing lister.';
      if (clerkErr) {
        alertOk('Error', clerkErr);
        return;
      }

      await api.post('/api/reviews', {
        exchangeRequestId: exchangeIdNew,
        revieweeClerkUserId: revieweeClerkUserIdParam,
        rating,
        comment: comment.trim(),
        evidencePhoto,
      });
      alertOk('Thanks', 'Your review was posted.', () => navigation.goBack());
    } catch (e: unknown) {
      alertOk('Error', apiErrorMessage(e, isEditMode ? 'Could not save changes' : 'Could not submit'));
    } finally {
      setBusy(false);
    }
  };

  if (reviewLoading) {
    return (
      <View style={[styles.flex, styles.centered]}>
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={lead} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>
        <ActivityIndicator color={themePrimary} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.flex}>
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={lead} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>
        <Text style={styles.loadErr}>{loadError}</Text>
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
        contentContainerStyle={[styles.scroll, { gap: FORM_SCROLL_GAP }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.head}>{isEditMode ? 'Edit review' : `Rate ${revieweeName}`}</Text>
        <Text style={styles.subHead}>
          {isEditMode
            ? 'Update your rating, comment, or photo. This review stays tied to the same swap.'
            : 'One review per exchange. After you submit, you cannot add another for this swap.'}
        </Text>
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
          previewUri={photoUri || existingEvidenceUrl}
          onPick={pick}
          onRemove={() => {
            setPhotoUri(null);
            setPhotoMime(null);
            setExistingEvidenceUrl('');
          }}
          emptyHint="Tap to add evidence photo (optional)"
        />
        <Pressable style={[styles.submit, cardShadow]} onPress={() => void submit()} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={lead} />
          ) : (
            <Text style={styles.submitTxt}>{isEditMode ? 'Save changes' : 'Submit review'}</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: themePageBg },
  centered: { justifyContent: 'center' },
  topBar: { paddingHorizontal: 12, paddingBottom: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  backText: { fontSize: 16, fontWeight: '600', color: lead },
  loadErr: { paddingHorizontal: 20, marginTop: 16, color: themeDanger, fontSize: 15 },
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
