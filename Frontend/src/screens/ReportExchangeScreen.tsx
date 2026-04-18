import { useCallback, useEffect, useState } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormImageAttachment } from '../components/FormImageAttachment';
import { api, apiErrorMessage } from '../lib/api';
import { alertOk } from '../lib/platformAlert';
import type { ProfileStackParamList } from '../navigation/profileStackTypes';
import type { RequestsStackParamList } from '../navigation/requestsStackTypes';
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
import type { ExchangeReport } from '../types/report';

type Props = NativeStackScreenProps<RequestsStackParamList & ProfileStackParamList, 'ReportExchange'>;

export function ReportExchangeScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { exchangeRequestId, bookTitle, reportId, listerView, readerName, readerAvatarUrl } = route.params;
  const isListerRoute = Boolean(listerView);
  const [details, setDetails] = useState('');
  const [existingEvidenceUrl, setExistingEvidenceUrl] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(reportId));
  /** False after you confirm receipt — report is view-only. Lister always view-only. */
  const [canEditReport, setCanEditReport] = useState(!isListerRoute);
  const [readOnlyReason, setReadOnlyReason] = useState<ExchangeReport['readOnlyReason']>(
    isListerRoute ? 'lister_view' : null
  );
  const [peerName, setPeerName] = useState(readerName ?? '');
  const [peerAvatarUrl, setPeerAvatarUrl] = useState(readerAvatarUrl ?? '');

  const load = useCallback(async () => {
    if (!reportId) return;
    setLoading(true);
    try {
      const res = await api.get<{ report: ExchangeReport }>(`/api/reports/${reportId}`);
      const r = res.data.report;
      setDetails(r.details ?? '');
      setExistingEvidenceUrl(r.evidencePhoto ?? '');
      if (r.reporterDisplayName) setPeerName(r.reporterDisplayName);
      if (r.reporterAvatarUrl) setPeerAvatarUrl(r.reporterAvatarUrl);
      if (isListerRoute) {
        setCanEditReport(false);
        setReadOnlyReason('lister_view');
      } else {
        setCanEditReport(r.canEdit !== false);
        setReadOnlyReason(r.readOnlyReason ?? (r.canEdit === false ? 'reporter_locked' : null));
      }
    } catch (e: unknown) {
      alertOk('Error', apiErrorMessage(e, 'Could not load report'), () => navigation.goBack());
    } finally {
      setLoading(false);
    }
  }, [reportId, navigation, isListerRoute]);

  const openChatWithReader = () => {
    const params = {
      requestId: exchangeRequestId,
      bookTitle: bookTitle || 'Book',
      peerName: peerName || readerName || 'Reader',
      peerAvatarUrl: peerAvatarUrl || readerAvatarUrl || '',
    };
    const stackNav = navigation.getParent();
    const names = stackNav?.getState?.()?.routeNames as string[] | undefined;
    if (names?.includes('RequestChat')) {
      (stackNav as { navigate: (name: 'RequestChat', p: typeof params) => void }).navigate('RequestChat', params);
      return;
    }
    const tabNav = stackNav?.getParent?.();
    (tabNav as { navigate: (name: 'Requests', p: { screen: string; params: typeof params }) => void } | null)?.navigate(
      'Requests',
      { screen: 'RequestChat', params }
    );
  };

  useEffect(() => {
    void load();
  }, [load]);

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
    if (!canEditReport || isListerRoute) return;
    let evidenceUrl = existingEvidenceUrl;
    if (photoUri) {
      evidenceUrl = await uploadEvidence();
    }
    if (!evidenceUrl) {
      alertOk('Photo required', 'Add an evidence photo for this report.');
      return;
    }
    setBusy(true);
    try {
      if (reportId) {
        await api.patch(`/api/reports/${reportId}`, {
          details: details.trim(),
          evidencePhoto: evidenceUrl,
        });
        alertOk('Saved', 'Your report was updated.', () => navigation.goBack());
      } else {
        await api.post('/api/reports', {
          exchangeRequestId,
          details: details.trim(),
          evidencePhoto: evidenceUrl,
        });
        alertOk('Sent', 'We recorded your report. Receipt confirmation is not available for this swap.', () =>
          navigation.goBack()
        );
      }
    } catch (e: unknown) {
      alertOk('Error', apiErrorMessage(e, 'Could not save'));
    } finally {
      setBusy(false);
    }
  };

  const previewUri = photoUri || existingEvidenceUrl || undefined;
  const readOnly = isListerRoute || (Boolean(reportId) && !canEditReport);
  const listerUi = isListerRoute || readOnlyReason === 'lister_view';

  const titleText = (() => {
    if (listerUi) return "Reader's report";
    if (readOnly) return 'Your report';
    if (reportId) return 'Edit report';
    return 'Report an issue';
  })();

  const subHeadText = (() => {
    if (listerUi) {
      return `For: ${bookTitle}`;
    }
    if (!reportId) {
      return `For: ${bookTitle}. If you submit a report, you cannot confirm receipt for this swap.`;
    }
    if (readOnly) {
      return `For: ${bookTitle}`;
    }
    return `For: ${bookTitle}`;
  })();

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={lead} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={crunch} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { gap: FORM_SCROLL_GAP }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.head}>{titleText}</Text>
          <Text style={styles.subHead}>{subHeadText}</Text>
          {listerUi ? (
            <Pressable style={styles.chatWithReaderBtn} onPress={openChatWithReader}>
              <Ionicons name="chatbubbles-outline" size={20} color={lead} />
              <Text style={styles.chatWithReaderTxt}>Chat with reader</Text>
            </Pressable>
          ) : null}
          <Text style={styles.label}>What happened?</Text>
          {readOnly ? (
            <Text style={styles.readOnlyDetails}>{details || '—'}</Text>
          ) : (
            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder="Describe the problem (condition, no-show, etc.)"
              placeholderTextColor={warmHaze}
              style={styles.input}
              multiline
              textAlignVertical="top"
            />
          )}
          <Text style={styles.label}>Evidence photo</Text>
          {readOnly ? (
            existingEvidenceUrl ? (
              <Image source={{ uri: existingEvidenceUrl }} style={styles.evidenceImg} resizeMode="cover" />
            ) : (
              <Text style={styles.readOnlyDetails}>No photo on file.</Text>
            )
          ) : (
            <FormImageAttachment
              previewUri={previewUri}
              onPick={pick}
              onRemove={() => {
                setPhotoUri(null);
                setPhotoMime(null);
                setExistingEvidenceUrl('');
              }}
              emptyHint="Tap to add a photo (required)"
            />
          )}
          {!readOnly ? (
            <Pressable style={[styles.submit, cardShadow]} onPress={() => void submit()} disabled={busy}>
              {busy ? (
                <ActivityIndicator color={lead} />
              ) : (
                <Text style={styles.submitTxt}>{reportId ? 'Save' : 'Submit report'}</Text>
              )}
            </Pressable>
          ) : null}
        </ScrollView>
      )}
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
  subHead: { fontSize: 14, color: textSecondary, lineHeight: 20, marginTop: 4 },
  readOnlyDetails: {
    fontSize: 16,
    color: lead,
    lineHeight: 22,
    backgroundColor: '#f3f3f5',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    padding: 14,
    minHeight: 80,
  },
  evidenceImg: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    backgroundColor: '#eee',
  },
  label: { fontSize: 13, fontWeight: '700', color: warmHaze },
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
    marginBottom: 2,
  },
  submit: {
    marginTop: 8,
    backgroundColor: crunch,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitTxt: { fontSize: 16, fontWeight: '800', color: lead },
  chatWithReaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#f3f3f5',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    alignSelf: 'stretch',
  },
  chatWithReaderTxt: { fontSize: 16, fontWeight: '800', color: lead },
});
