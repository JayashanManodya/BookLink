import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { alertOk } from '../lib/platformAlert';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
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
import type { WishlistStackParamList } from '../navigation/wishlistStackTypes';
import type { WishlistThreadDetail } from '../types/wishlistThread';
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

type Props = NativeStackScreenProps<WishlistStackParamList, 'WishlistThreadChat'>;

type ThreadMessage = {
  _id: string;
  threadId: string;
  senderClerkUserId: string;
  senderDisplayName: string;
  senderAvatarUrl?: string;
  text: string;
  imageUrl?: string;
  createdAt?: string;
};

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function defaultMeetupDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function defaultMeetupTimeStr() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function combineLocalDateTimeToISO(dateStr: string, timeStr: string): string | null {
  const dPart = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  const tPart = /^(\d{1,2}):(\d{2})$/.exec(timeStr.trim());
  if (!dPart || !tPart) return null;
  const y = Number(dPart[1]);
  const mo = Number(dPart[2]);
  const day = Number(dPart[3]);
  const hh = Number(tPart[1]);
  const mm = Number(tPart[2]);
  if (![y, mo, day, hh, mm].every((n) => Number.isFinite(n))) return null;
  if (hh > 23 || hh < 0 || mm > 59 || mm < 0) return null;
  const dt = new Date(y, mo - 1, day, hh, mm, 0, 0);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

function formatMeetupWhen(iso?: string | null) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function WishlistThreadChatScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const { threadId, itemTitle, peerName, peerAvatarUrl, returnToChatsInbox } = route.params;
  const [thread, setThread] = useState<WishlistThreadDetail | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [points, setPoints] = useState<CollectionPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [meetupBusy, setMeetupBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [meetupModal, setMeetupModal] = useState(false);
  const [meetupStep, setMeetupStep] = useState<'pick' | 'details'>('pick');
  const [selectedPoint, setSelectedPoint] = useState<CollectionPoint | null>(null);
  const [meetupDateStr, setMeetupDateStr] = useState('');
  const [meetupTimeStr, setMeetupTimeStr] = useState('');
  const [meetupContactStr, setMeetupContactStr] = useState('');
  const [meetupError, setMeetupError] = useState<string | null>(null);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    try {
      const [threadRes, msgRes] = await Promise.all([
        api.get<{ thread: WishlistThreadDetail }>(`/api/wishlist/threads/${threadId}`),
        api.get<{ messages: ThreadMessage[] }>(`/api/wishlist/threads/${threadId}/messages`),
      ]);
      setThread(threadRes.data.thread ?? null);
      setMessages(msgRes.data.messages ?? []);
      setError(null);
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Could not load chat'));
    } finally {
      setLoading(false);
    }
  }, [threadId]);

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
    const id = setInterval(() => void load(), 5000);
    return () => clearInterval(id);
  }, [load]);

  const isHelper = !!userId && !!thread && thread.helperClerkUserId === userId;

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      await api.post(`/api/wishlist/threads/${threadId}/messages`, { text: body });
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
      await api.post(`/api/wishlist/threads/${threadId}/messages`, {
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

  const closeMeetupModal = () => {
    setMeetupModal(false);
    setMeetupStep('pick');
    setSelectedPoint(null);
    setMeetupError(null);
  };

  const openMeetupModal = () => {
    void loadPoints();
    setMeetupStep('pick');
    setSelectedPoint(null);
    setMeetupDateStr(defaultMeetupDateStr());
    setMeetupTimeStr(defaultMeetupTimeStr());
    setMeetupContactStr('');
    setMeetupError(null);
    setMeetupBusy(false);
    setMeetupModal(true);
  };

  const goMeetupDetails = (p: CollectionPoint) => {
    setSelectedPoint(p);
    setMeetupDateStr(defaultMeetupDateStr());
    setMeetupTimeStr(defaultMeetupTimeStr());
    setMeetupContactStr(p.contactNumber?.trim() || '');
    setMeetupError(null);
    setMeetupStep('details');
  };

  const confirmMeetup = async () => {
    if (!selectedPoint) {
      const msg = 'Pick a collection point first.';
      setMeetupError(msg);
      alertOk('Meet-up', msg);
      return;
    }
    const meetupAt = combineLocalDateTimeToISO(meetupDateStr, meetupTimeStr);
    if (!meetupAt) {
      const msg = 'Use date as YYYY-MM-DD and time as HH:mm (24-hour), e.g. 14:30.';
      setMeetupError(msg);
      alertOk('Date & time', msg);
      return;
    }
    const contact = meetupContactStr.trim();
    if (contact.length < 5) {
      const msg = 'Enter a contact number (at least 5 characters).';
      setMeetupError(msg);
      alertOk('Contact', msg);
      return;
    }
    setMeetupError(null);
    setMeetupBusy(true);
    try {
      await api.patch(`/api/wishlist/threads/${threadId}/meetup`, {
        collectionPointId: selectedPoint._id,
        meetupAt,
        meetupContactNumber: contact,
      });
      closeMeetupModal();
      await load();
    } catch (e: unknown) {
      const msg = apiErrorMessage(e, 'Could not set meet-up');
      setMeetupError(msg);
      setError(msg);
    } finally {
      setMeetupBusy(false);
    }
  };

  const subtitle = useMemo(() => `About: ${itemTitle}`, [itemTitle]);

  const leaveChat = useCallback(() => {
    if (returnToChatsInbox) {
      navigation.getParent()?.navigate('Requests', { screen: 'ChatsInbox' });
      return;
    }
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'WishlistChats' }],
      })
    );
  }, [navigation, returnToChatsInbox]);

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

      {thread && thread.meetupHandoffLabel ? (
        <View style={styles.meetupBanner}>
          <Text style={styles.meetupLabel}>Meet-up</Text>
          <Text style={styles.meetupVal}>{thread.meetupHandoffLabel}</Text>
          {thread.meetupScheduledAt ? (
            <Text style={styles.meetupWhen}>
              <Text style={styles.meetupMetaLabel}>When: </Text>
              {formatMeetupWhen(thread.meetupScheduledAt)}
            </Text>
          ) : null}
          {thread.meetupContactNumber ? (
            <Pressable
              onPress={() => {
                const raw = thread.meetupContactNumber ?? '';
                const tel = raw.replace(/[^\d+]/g, '');
                if (tel.length >= 5) void Linking.openURL(`tel:${tel}`);
              }}
              style={styles.meetupContactRow}
            >
              <Ionicons name="call-outline" size={17} color={lead} />
              <Text style={styles.meetupContactTxt}>{thread.meetupContactNumber}</Text>
            </Pressable>
          ) : null}
          {hasMapCoords(thread.meetupLatitude ?? undefined, thread.meetupLongitude ?? undefined) ? (
            <Pressable
              style={styles.dirBtn}
              onPress={() =>
                void openGoogleMapsDirections(thread.meetupLatitude as number, thread.meetupLongitude as number)
              }
            >
              <Ionicons name="navigate-outline" size={16} color={lead} />
              <Text style={styles.dirBtnTxt}>Directions</Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.dirBtnSecondary}
              onPress={() => void openGoogleMapsSearch(thread.meetupHandoffLabel!)}
            >
              <Ionicons name="map-outline" size={16} color={lead} />
              <Text style={styles.dirBtnTxtMuted}>Maps</Text>
            </Pressable>
          )}
        </View>
      ) : thread && isHelper ? (
        <View style={styles.meetupHint}>
          <Text style={styles.meetupHintTxt}>
            If you have the book, set the meet-up: pick a collection point, then add date, time, and a contact
            number. The summary is sent in chat for both of you.
          </Text>
        </View>
      ) : null}

      {isHelper ? (
        <Pressable style={styles.setMeetupBtn} onPress={() => openMeetupModal()} disabled={meetupBusy}>
          {meetupBusy ? (
            <ActivityIndicator color={lead} size="small" />
          ) : (
            <>
              <Ionicons name="location-outline" size={20} color={lead} />
              <Text style={styles.setMeetupTxt}>
                {thread?.meetupHandoffLabel ? 'Change meet-up point' : 'Set meet-up point'}
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
              <Text style={styles.empty}>No messages yet. Say hi and offer the book if you have it.</Text>
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

      <Modal visible={meetupModal} animationType="slide" transparent onRequestClose={closeMeetupModal}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeMeetupModal} />
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            {meetupStep === 'pick' ? (
              <>
                <Text style={styles.modalTitle}>Collection point</Text>
                <ScrollView style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">
                  {points.length === 0 ? (
                    <Text style={styles.emptyModal}>No points yet. Add one under Profile → Collection points.</Text>
                  ) : (
                    points.map((p) => (
                      <Pressable key={p._id} style={styles.modalRow} onPress={() => goMeetupDetails(p)}>
                        <Text style={styles.modalRowTitle}>{p.name}</Text>
                        <Text style={styles.modalRowSub}>
                          {p.city} · {p.address}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </ScrollView>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>When & how to reach you</Text>
                {selectedPoint ? (
                  <View style={styles.detailsSummary}>
                    <Text style={styles.detailsSummaryLabel}>Place</Text>
                    <Text style={styles.detailsSummaryTxt}>
                      {selectedPoint.name} · {selectedPoint.city}
                    </Text>
                    <Text style={styles.modalRowSub}>{selectedPoint.address}</Text>
                  </View>
                ) : null}
                <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 360 }}>
                  <View style={styles.modalField}>
                    <Text style={styles.modalFieldLabel}>Date</Text>
                    <TextInput
                      value={meetupDateStr}
                      onChangeText={setMeetupDateStr}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={warmHaze}
                      style={styles.modalInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  <View style={styles.modalField}>
                    <Text style={styles.modalFieldLabel}>Time (24h)</Text>
                    <TextInput
                      value={meetupTimeStr}
                      onChangeText={setMeetupTimeStr}
                      placeholder="HH:mm"
                      placeholderTextColor={warmHaze}
                      style={styles.modalInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  <View style={styles.modalField}>
                    <Text style={styles.modalFieldLabel}>Your contact number</Text>
                    <TextInput
                      value={meetupContactStr}
                      onChangeText={setMeetupContactStr}
                      placeholder="Shown to the other reader for this handoff"
                      placeholderTextColor={warmHaze}
                      style={styles.modalInput}
                      keyboardType="phone-pad"
                    />
                  </View>
                  <Text style={styles.modalHint}>Times use your device’s local timezone.</Text>
                </ScrollView>
                {meetupError ? <Text style={styles.modalError}>{meetupError}</Text> : null}
                <View style={styles.modalActionsRow}>
                  <Pressable
                    style={styles.modalBackBtn}
                    onPress={() => setMeetupStep('pick')}
                    disabled={meetupBusy}
                  >
                    <Text style={styles.modalBackBtnTxt}>Back</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalConfirmBtn, meetupBusy && styles.modalConfirmBtnOff]}
                    onPress={() => void confirmMeetup()}
                    disabled={meetupBusy}
                  >
                    {meetupBusy ? (
                      <ActivityIndicator color={cascadingWhite} size="small" />
                    ) : (
                      <Text style={styles.modalConfirmBtnTxt}>Send meet-up</Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
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
    marginTop: 8,
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
  meetupWhen: { fontSize: 14, fontWeight: '600', color: lead, marginTop: 4, lineHeight: 20 },
  meetupMetaLabel: { fontWeight: '800', color: warmHaze },
  meetupContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: cascadingWhite,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  meetupContactTxt: { fontSize: 15, fontWeight: '800', color: lead },
  meetupHint: { marginHorizontal: 12, marginTop: 8, marginBottom: 6, padding: 10, borderRadius: 12, backgroundColor: '#f3f3f5' },
  meetupHintTxt: { fontSize: 13, color: textSecondary, lineHeight: 18 },
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
  detailsSummary: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#f3f3f5',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    gap: 4,
  },
  detailsSummaryLabel: { fontSize: 11, fontWeight: '800', color: warmHaze, textTransform: 'uppercase' },
  detailsSummaryTxt: { fontSize: 15, fontWeight: '800', color: lead },
  modalField: { marginBottom: 14 },
  modalFieldLabel: { fontSize: 13, fontWeight: '800', color: warmHaze, marginBottom: 6 },
  modalInput: {
    backgroundColor: '#f3f3f5',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: lead,
  },
  modalHint: { fontSize: 13, color: textSecondary, marginBottom: 8, lineHeight: 18 },
  modalError: {
    color: '#b3261e',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 4,
  },
  modalActionsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalBackBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    backgroundColor: cascadingWhite,
  },
  modalBackBtnTxt: { fontSize: 15, fontWeight: '800', color: lead },
  modalConfirmBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: lead,
  },
  modalConfirmBtnOff: { opacity: 0.7 },
  modalConfirmBtnTxt: { fontSize: 15, fontWeight: '800', color: cascadingWhite },
  modalRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: dreamland,
  },
  modalRowTitle: { fontSize: 16, fontWeight: '800', color: lead },
  modalRowSub: { fontSize: 13, color: textSecondary, marginTop: 4 },
  emptyModal: { fontSize: 15, color: textSecondary, lineHeight: 22, paddingVertical: 12 },
});
