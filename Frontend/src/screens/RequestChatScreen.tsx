import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatImageLightbox } from '../components/ChatImageLightbox';
import { ChatMessageRow } from '../components/ChatMessageRow';
import { api, apiErrorMessage } from '../lib/api';
import { pickChatImageFromLibrary } from '../lib/pickChatImage';
import { uploadChatImage } from '../lib/uploadChatImage';
import { hasMapCoords, openGoogleMapsDirections, openGoogleMapsSearch } from '../lib/mapsLinks';
import type { RequestsStackParamList } from '../navigation/requestsStackTypes';
import type { ExchangeRequest } from '../types/exchange';
import type { CollectionPoint } from '../types/point';
import {
  cascadingWhite,
  chatComposerBar,
  chatSendActive,
  chatWallpaper,
  crunch,
  dreamland,
  lead,
  textSecondary,
  warmHaze,
} from '../theme/colors';

type Props = NativeStackScreenProps<RequestsStackParamList, 'RequestChat'>;

type ExchangeMessage = {
  _id: string;
  requestId: string;
  senderClerkUserId: string;
  senderDisplayName: string;
  senderAvatarUrl?: string;
  text: string;
  imageUrl?: string;
  createdAt?: string;
};

export function RequestChatScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const { requestId, bookTitle, peerName, peerAvatarUrl } = route.params;
  const [request, setRequest] = useState<ExchangeRequest | null>(null);
  const [messages, setMessages] = useState<ExchangeMessage[]>([]);
  const [points, setPoints] = useState<CollectionPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [meetupBusy, setMeetupBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [meetupModal, setMeetupModal] = useState(false);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    try {
      const [reqRes, msgRes] = await Promise.all([
        api.get<{ request: ExchangeRequest }>(`/api/requests/${requestId}`),
        api.get<{ messages: ExchangeMessage[] }>(`/api/requests/${requestId}/messages`),
      ]);
      setRequest(reqRes.data.request ?? null);
      setMessages(msgRes.data.messages ?? []);
      setError(null);
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Could not load chat'));
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  const loadPoints = useCallback(async () => {
    try {
      const res = await api.get<{ points: CollectionPoint[] }>('/api/points');
      setPoints(res.data.points ?? []);
    } catch {
      setPoints([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => {
      void load();
    }, 5000);
    return () => clearInterval(id);
  }, [load]);

  const isOwner = !!userId && !!request && request.ownerClerkUserId === userId;
  const isAccepted = request?.status === 'accepted';

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      await api.post(`/api/requests/${requestId}/messages`, { text: body });
      setText('');
      await load();
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Could not send message'));
    } finally {
      setSending(false);
    }
  };

  const sendPhoto = async () => {
    if (sending) return;
    const picked = await pickChatImageFromLibrary();
    if (!picked) return;
    setSending(true);
    setError(null);
    try {
      const url = await uploadChatImage(picked.uri, picked.mimeType);
      if (!url) {
        setError('Could not upload image');
        return;
      }
      await api.post(`/api/requests/${requestId}/messages`, {
        text: text.trim(),
        imageUrl: url,
      });
      setText('');
      await load();
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Could not send photo'));
    } finally {
      setSending(false);
    }
  };

  const pickMeetup = async (p: CollectionPoint) => {
    setMeetupBusy(true);
    try {
      await api.patch(`/api/requests/${requestId}/meetup`, { collectionPointId: p._id });
      setMeetupModal(false);
      await load();
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Could not set meet-up'));
    } finally {
      setMeetupBusy(false);
    }
  };

  const openMeetupModal = () => {
    void loadPoints();
    setMeetupModal(true);
  };

  const subtitle = useMemo(() => `About: ${bookTitle}`, [bookTitle]);

  const leaveChat = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('ChatsInbox');
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        leaveChat();
        return true;
      });
      return () => sub.remove();
    }, [leaveChat])
  );

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable onPress={leaveChat} hitSlop={12} style={styles.backBtn} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={lead} />
        </Pressable>
        <Avatar name={peerName || 'Reader'} uri={peerAvatarUrl} size={34} />
        <View style={styles.headTxtWrap}>
          <Text style={styles.headTitle} numberOfLines={1}>
            {peerName || 'Chat'}
          </Text>
          <Text style={styles.headSub} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <View style={styles.topBarSpacer} />
      </View>

      {request && isAccepted && request.meetupHandoffLabel ? (
        <View style={styles.meetupBanner}>
          <Text style={styles.meetupLabel}>Meet-up</Text>
          <Text style={styles.meetupVal}>{request.meetupHandoffLabel}</Text>
          {hasMapCoords(request.meetupLatitude ?? undefined, request.meetupLongitude ?? undefined) ? (
            <Pressable
              style={styles.dirBtn}
              onPress={() =>
                void openGoogleMapsDirections(request.meetupLatitude as number, request.meetupLongitude as number)
              }
            >
              <Ionicons name="navigate-outline" size={16} color={lead} />
              <Text style={styles.dirBtnTxt}>Directions</Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.dirBtnSecondary}
              onPress={() => void openGoogleMapsSearch(request.meetupHandoffLabel!)}
            >
              <Ionicons name="map-outline" size={16} color={lead} />
              <Text style={styles.dirBtnTxtMuted}>Maps</Text>
            </Pressable>
          )}
        </View>
      ) : request && isAccepted && isOwner ? (
        <View style={styles.meetupHint}>
          <Text style={styles.meetupHintTxt}>Choose where to meet — tap below to pick a collection point.</Text>
        </View>
      ) : request && !isAccepted ? (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingTxt}>
            Meet-up can be set here only after the lister accepts this request.
          </Text>
        </View>
      ) : null}

      {isOwner && isAccepted ? (
        <Pressable style={styles.setMeetupBtn} onPress={() => openMeetupModal()} disabled={meetupBusy}>
          {meetupBusy ? (
            <ActivityIndicator color={lead} size="small" />
          ) : (
            <>
              <Ionicons name="location-outline" size={20} color={lead} />
              <Text style={styles.setMeetupTxt}>
                {request?.meetupHandoffLabel ? 'Change meet-up point' : 'Set meet-up point'}
              </Text>
            </>
          )}
        </Pressable>
      ) : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.flex, styles.chatPane]}
      >
        {loading ? (
          <View style={styles.chatPane}>
            <ActivityIndicator style={{ marginTop: 30 }} color={crunch} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.chatPane}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
            contentContainerStyle={styles.msgList}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((m) => {
              const mine = !!userId && m.senderClerkUserId === userId;
              return (
                <ChatMessageRow
                  key={m._id}
                  mine={mine}
                  text={m.text}
                  imageUrl={m.imageUrl}
                  senderDisplayName={m.senderDisplayName || 'Reader'}
                  senderAvatarUrl={m.senderAvatarUrl}
                  createdAt={m.createdAt}
                  onPressImage={(uri) => setLightboxUri(uri)}
                />
              );
            })}
            {messages.length === 0 ? (
              <Text style={styles.empty}>No messages yet. Start the chat.</Text>
            ) : null}
          </ScrollView>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={[styles.composer, { paddingBottom: Math.max(10, insets.bottom) }]}>
          <Pressable
            style={[styles.attachBtn, sending && styles.sendBtnOff]}
            onPress={() => void sendPhoto()}
            disabled={sending}
            accessibilityLabel="Attach photo"
          >
            <Ionicons name="image-outline" size={22} color={lead} />
          </Pressable>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Write a message..."
            placeholderTextColor={warmHaze}
            multiline
            maxLength={2000}
          />
          <Pressable
            style={[
              styles.sendBtn,
              (!text.trim() || sending) ? styles.sendBtnDisabled : styles.sendBtnActive,
              sending && styles.sendBtnOff,
            ]}
            onPress={() => void send()}
          >
            {sending ? (
              <ActivityIndicator color={text.trim() ? '#fff' : lead} size="small" />
            ) : (
              <Ionicons name="send" size={18} color={text.trim() ? '#fff' : lead} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <ChatImageLightbox uri={lightboxUri} visible={!!lightboxUri} onClose={() => setLightboxUri(null)} />

      <Modal visible={meetupModal} animationType="slide" transparent onRequestClose={() => setMeetupModal(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setMeetupModal(false)} />
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Text style={styles.modalTitle}>Collection point</Text>
            <ScrollView style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">
              {points.length === 0 ? (
                <Text style={styles.emptyModal}>No points yet. Add one under Profile → Collection points.</Text>
              ) : (
                points.map((p) => (
                  <Pressable
                    key={p._id}
                    style={styles.modalRow}
                    onPress={() => void pickMeetup(p)}
                    disabled={meetupBusy}
                  >
                    <Text style={styles.modalRowTitle}>{p.name}</Text>
                    <Text style={styles.modalRowSub}>
                      {p.city} · {p.address}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return 'R';
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'R';
}

function Avatar({ name, uri, size }: { name: string; uri?: string; size: number }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#ddd' }}
      />
    );
  }
  return (
    <View
      style={[
        styles.avatarFallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={styles.avatarTxt}>{initialsFromName(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: cascadingWhite },
  chatPane: { flex: 1, backgroundColor: chatWallpaper },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 10,
    backgroundColor: cascadingWhite,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: dreamland,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
  },
  topBarSpacer: { width: 44 },
  headTxtWrap: { flex: 1, alignItems: 'center' },
  headTitle: { fontSize: 17, fontWeight: '800', color: lead },
  headSub: { marginTop: 2, fontSize: 12, color: textSecondary, maxWidth: '90%' },
  meetupBanner: {
    marginHorizontal: 12,
    marginBottom: 6,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#eaf3de',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#c0dd97',
    gap: 6,
  },
  meetupLabel: { fontSize: 11, fontWeight: '800', color: warmHaze, textTransform: 'uppercase' },
  meetupVal: { fontSize: 15, fontWeight: '700', color: lead },
  meetupHint: { marginHorizontal: 12, marginBottom: 6, padding: 10, borderRadius: 12, backgroundColor: '#f3f3f5' },
  meetupHintTxt: { fontSize: 13, color: textSecondary, lineHeight: 18 },
  pendingBanner: { marginHorizontal: 12, marginBottom: 6, padding: 10, borderRadius: 12, backgroundColor: '#faeeda' },
  pendingTxt: { fontSize: 13, color: '#854f0b', lineHeight: 18 },
  setMeetupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: crunch,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  setMeetupTxt: { fontSize: 14, fontWeight: '800', color: lead },
  dirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: crunch,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  dirBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: cascadingWhite,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  dirBtnTxt: { fontSize: 13, fontWeight: '800', color: lead },
  dirBtnTxtMuted: { fontSize: 13, fontWeight: '700', color: textSecondary },
  msgList: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: chatWallpaper,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e9e9ef',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  avatarTxt: { fontSize: 12, fontWeight: '800', color: lead },
  empty: { marginTop: 24, color: warmHaze, textAlign: 'center', paddingHorizontal: 24 },
  error: { color: '#b3261e', paddingHorizontal: 16, marginBottom: 8 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: dreamland,
    backgroundColor: chatComposerBar,
  },
  attachBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: lead,
    fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: { backgroundColor: chatSendActive },
  sendBtnDisabled: { backgroundColor: '#fff', borderWidth: StyleSheet.hairlineWidth, borderColor: dreamland, opacity: 0.85 },
  sendBtnOff: { opacity: 0.5 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalSheet: {
    backgroundColor: cascadingWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: '85%',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: lead, marginBottom: 10 },
  modalRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: dreamland,
  },
  modalRowTitle: { fontSize: 16, fontWeight: '800', color: lead },
  modalRowSub: { fontSize: 13, color: textSecondary, marginTop: 4 },
  emptyModal: { fontSize: 15, color: textSecondary, lineHeight: 22, paddingVertical: 12 },
});
