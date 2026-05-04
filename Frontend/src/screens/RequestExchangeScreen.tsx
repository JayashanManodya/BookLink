import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, apiErrorMessage } from '../lib/api';
import { alertOk } from '../lib/platformAlert';
import { SignInGateCard } from '../components/SignInGateCard';
import { SignInWithGoogleButton } from '../components/SignInWithGoogleButton';
import type { BrowseStackParamList } from '../navigation/browseStackTypes';
import { dreamland, lead, textSecondary, warmHaze, themePageBg, themePrimary, themeSurfaceMuted } from '../theme/colors';
import { FORM_SCROLL_GAP } from '../theme/formLayout';
import { cardShadow } from '../theme/shadows';

type Props = NativeStackScreenProps<BrowseStackParamList, 'RequestExchange'>;

/** Match backend `normalizeBookIdInput`: params from navigation / deep links may be `{ $oid }` blobs. */
function normalizeBookIdParam(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'object' && raw !== null && '$oid' in raw && typeof (raw as { $oid: string }).$oid === 'string') {
    return (raw as { $oid: string }).$oid.trim();
  }
  return String(raw).trim();
}

const MONGO_ID_RE = /^[a-f\d]{24}$/i;

export function RequestExchangeScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const { bookId: bookIdRaw, title } = route.params;
  const bookId = normalizeBookIdParam(bookIdRaw);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!MONGO_ID_RE.test(bookId)) {
      Alert.alert('Error', 'This listing reference is invalid. Go back and open the book again.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/requests', {
        bookId,
        message: message.trim(),
      });
      alertOk(
        'Request sent successfully',
        'Your exchange offer was delivered. We are taking you to the Exchange tab — check Sent to see your request.',
        () => {
          navigation.popToTop();
          navigation.getParent()?.navigate('Requests', {
            screen: 'RequestsHome',
            params: { preferSentTab: true },
          });
        }
      );
    } catch (e: unknown) {
      const msg = apiErrorMessage(e, 'Could not send request');
      Alert.alert('Error', msg);
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
      {!isSignedIn ? (
        <ScrollView contentContainerStyle={[styles.scroll, styles.gateScroll]}>
          <SignInGateCard
            title="Sign in to request"
            message="You need an account so owners can reply to your exchange offer."
            icon="swap-horizontal-outline"
          />
          <SignInWithGoogleButton />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: 40, gap: FORM_SCROLL_GAP }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.head}>Request exchange</Text>
          <Text style={styles.bookTitle} numberOfLines={3}>
            For: {title}
          </Text>
          <Text style={styles.label}>Message to the owner</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder='e.g. "I can offer Physics past papers in good condition"'
            placeholderTextColor={warmHaze}
            style={styles.input}
            multiline
            textAlignVertical="top"
            numberOfLines={5}
          />
          <Pressable style={[styles.submit, cardShadow]} onPress={() => void submit()} disabled={busy}>
            {busy ? <ActivityIndicator color={lead} /> : <Text style={styles.submitTxt}>Send request</Text>}
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: themePageBg },
  topBar: { paddingHorizontal: 12, paddingBottom: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  backText: { fontSize: 16, fontWeight: '600', color: lead },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  gateScroll: { flexGrow: 1, paddingBottom: 32 },
  head: { fontSize: 22, fontWeight: '800', color: lead },
  bookTitle: { fontSize: 16, color: textSecondary, lineHeight: 22 },
  label: { fontSize: 13, fontWeight: '700', color: warmHaze },
  input: {
    minHeight: 120,
    backgroundColor: themeSurfaceMuted,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    padding: 14,
    fontSize: 16,
    color: lead,
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
