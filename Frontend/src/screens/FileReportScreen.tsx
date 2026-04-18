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
import { REPORT_REASONS } from '../types/report';

type Props = NativeStackScreenProps<ProfileStackParamList, 'FileReport'>;

export function FileReportScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const pre = route.params ?? {};
  /** When opened from Requests etc., targets are set in the background — no raw IDs in the UI. */
  const hideIdFields = Boolean(pre.reportedUserClerkId?.trim() || pre.reportedBookId?.trim());
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [description, setDescription] = useState('');
  const [reportedUserClerkId, setReportedUserClerkId] = useState(pre?.reportedUserClerkId ?? '');
  const [reportedBookId, setReportedBookId] = useState(pre?.reportedBookId ?? '');
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
    const up = await api.post<{ url: string }>('/api/upload/report-evidence', form);
    return up.data.url ?? '';
  };

  const submit = async () => {
    if (!description.trim()) {
      alertOk('Required', 'Please describe what happened.');
      return;
    }
    const uid = reportedUserClerkId.trim();
    const bid = reportedBookId.trim();
    if (!uid && !bid) {
      alertOk('Target required', 'Provide a reported user id or book id.');
      return;
    }
    setBusy(true);
    try {
      const evidencePhoto = await uploadEvidence();
      await api.post('/api/reports', {
        reportedUserClerkId: uid || undefined,
        reportedBookId: bid || undefined,
        reason,
        description: description.trim(),
        evidencePhoto,
      });
      alertOk('Report filed', 'Thank you for helping keep BookLink safe.', () => navigation.goBack());
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
        <Text style={styles.head}>File a report</Text>
        {pre?.reportedLabel ? <Text style={styles.hint}>Regarding: {pre.reportedLabel}</Text> : null}
        <Text style={styles.label}>Reason</Text>
        <View style={styles.chips}>
          {REPORT_REASONS.map((r) => (
            <Pressable key={r} onPress={() => setReason(r)} style={[styles.chip, reason === r && styles.chipOn]}>
              <Text style={[styles.chipTxt, reason === r && styles.chipTxtOn]} numberOfLines={2}>
                {r}
              </Text>
            </Pressable>
          ))}
        </View>
        {hideIdFields ? null : (
          <>
            <Text style={styles.label}>Reported user Clerk ID (optional if book below)</Text>
            <TextInput
              value={reportedUserClerkId}
              onChangeText={setReportedUserClerkId}
              placeholder="user_..."
              placeholderTextColor={warmHaze}
              style={styles.input}
              autoCapitalize="none"
            />
            <Text style={styles.label}>Reported book Mongo ID (optional)</Text>
            <TextInput
              value={reportedBookId}
              onChangeText={setReportedBookId}
              placeholder="Book ObjectId"
              placeholderTextColor={warmHaze}
              style={styles.input}
              autoCapitalize="none"
            />
          </>
        )}
        <Text style={styles.label}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="What happened?"
          placeholderTextColor={warmHaze}
          style={[styles.input, styles.inputMultiline]}
          multiline
        />
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
          {busy ? <ActivityIndicator color={lead} /> : <Text style={styles.submitTxt}>Submit report</Text>}
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
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },
  head: { fontSize: 22, fontWeight: '800', color: lead },
  hint: { fontSize: 14, color: textSecondary },
  label: { fontSize: 13, fontWeight: '700', color: warmHaze },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    backgroundColor: cascadingWhite,
    maxWidth: '48%',
  },
  chipOn: { backgroundColor: crunch, borderColor: crunch },
  chipTxt: { fontSize: 12, fontWeight: '700', color: textSecondary },
  chipTxtOn: { color: lead },
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
  inputMultiline: { minHeight: 100, textAlignVertical: 'top', marginBottom: 2 },
  submit: {
    marginTop: 8,
    backgroundColor: crunch,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitTxt: { fontSize: 16, fontWeight: '800', color: lead },
});
