import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@clerk/clerk-expo';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, apiErrorMessage } from '../lib/api';
import { FormImageAttachment } from '../components/FormImageAttachment';
import { SignInGateCard } from '../components/SignInGateCard';
import { SignInWithGoogleButton } from '../components/SignInWithGoogleButton';
import type { BrowseStackParamList } from '../navigation/browseStackTypes';
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

type Props = NativeStackScreenProps<BrowseStackParamList, 'RequestExchange'>;

export function RequestExchangeScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const { bookId, title } = route.params;
  const [message, setMessage] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access.');
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

  const uploadOffered = async (): Promise<string> => {
    if (!photoUri) return '';
    const form = new FormData();
    const name = photoMime?.includes('png') ? 'offer.png' : 'offer.jpg';
    const type = photoMime ?? 'image/jpeg';
    if (Platform.OS === 'web') {
      const blobRes = await fetch(photoUri);
      const blob = await blobRes.blob();
      const mime = blob.type && blob.type.startsWith('image/') ? blob.type : type;
      if (typeof File !== 'undefined') {
        form.append('image', new File([blob], name, { type: mime }));
      } else {
        form.append('image', blob, name);
      }
    } else {
      form.append('image', { uri: photoUri, name, type } as unknown as Blob);
    }
    const up = await api.post<{ url: string }>('/api/upload/image', form);
    return up.data.url ?? '';
  };

  const submit = async () => {
    setBusy(true);
    try {
      const offeredBookPhoto = await uploadOffered();
      await api.post('/api/requests', {
        bookId,
        message: message.trim(),
        offeredBookPhoto: offeredBookPhoto || undefined,
      });
      Alert.alert('Sent', 'The owner will see your offer in Requests.', [
        { text: 'OK', onPress: () => navigation.popToTop() },
      ]);
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
          <FormImageAttachment
            previewUri={photoUri}
            onPick={pick}
            onRemove={() => {
              setPhotoUri(null);
              setPhotoMime(null);
            }}
            emptyHint="Tap to add photo of book you offer (optional)"
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
  flex: { flex: 1, backgroundColor: cascadingWhite },
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
    backgroundColor: '#f3f3f5',
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
    backgroundColor: crunch,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitTxt: { fontSize: 16, fontWeight: '800', color: lead },
});
