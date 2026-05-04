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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatImageLightbox } from '../components/ChatImageLightbox';
import { ChatMessageRow } from '../components/ChatMessageRow';
import { MeetupDateTimePickers } from '../components/MeetupDateTimePickers';
import { api, apiErrorMessage } from '../lib/api';
import { alertOk } from '../lib/platformAlert';
import { pickChatImageFromLibrary } from '../lib/pickChatImage';
import { uploadChatImage } from '../lib/uploadChatImage';
import { hasMapCoords, openGoogleMapsDirections, openGoogleMapsSearch } from '../lib/mapsLinks';
import type { RequestsStackParamList } from '../navigation/requestsStackTypes';
import type { ExchangeRequest } from '../types/exchange';
import type { CollectionPoint } from '../types/point';
import {
  messengerComposerBg,
  messengerHintBg,
  messengerInputFill,
  messengerMeetupBannerBg,
  messengerMeetupBannerBorder,
  messengerPrimaryActionBg,
  messengerScreenBg,
  messengerSendActive,
  messengerThreadBg,
  messengerTopHairline,
} from '../theme/chatMessengerTheme';
import { cascadingWhite, dreamland, lead, textSecondary, warmHaze, themeSurfaceMuted } from '../theme/colors';
import { themeGreen, themeMuted } from '../theme/courseTheme';

import {
  combineLocalDateTimeToISO,
  defaultMeetupWhenDate,
  localDateToMeetupStrings,
  meetupContactValidationError,
  meetupDateTimeFutureError,
  sanitizeMeetupPhoneDigits,
} from '../lib/meetupFormRules';

type Props = NativeStackScreenProps<RequestsStackParamList, 'RequestChat'>;

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
  const [meetupStep, setMeetupStep] = useState<'pick' | 'details'>('pick');
  const [selectedPoint, setSelectedPoint] = useState<CollectionPoint | null>(null);
  const [meetupWhen, setMeetupWhen] = useState<Date>(() => defaultMeetupWhenDate());
  const [meetupContactStr, setMeetupContactStr] = useState('');
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
      void api.post(`/api/chats/exchange/${requestId}/read`).catch(() => {});
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Could not load messages'));
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

  const closeMeetupModal = () => {
    setMeetupModal(false);
    setMeetupStep('pick');
    setSelectedPoint(null);
  };

  const openMeetupModal = () => {
    void loadPoints();
    setMeetupStep('pick');
    setSelectedPoint(null);
    setMeetupWhen(defaultMeetupWhenDate());
    setMeetupContactStr('');
    setMeetupModal(true);
  };

  const goMeetupDetails = (p: CollectionPoint) => {
    setSelectedPoint(p);
    setMeetupWhen(defaultMeetupWhenDate());
    setMeetupContactStr(sanitizeMeetupPhoneDigits(p.contactNumber ?? ''));
    setMeetupStep('details');
  };

  const confirmMeetup = async () => {
    if (!selectedPoint) {
      alertOk('Meet-up', 'Pick a collection point first.');
      return;
    }
    const { dateStr, timeStr } = localDateToMeetupStrings(meetupWhen);
    const whenErr = meetupDateTimeFutureError(dateStr, timeStr);
    if (whenErr) {
      alertOk('Date & time', whenErr);
      return;
    }
    const contactDigits = sanitizeMeetupPhoneDigits(meetupContactStr);
    const contactErr = meetupContactValidationError(contactDigits);
    if (contactErr) {
      alertOk('Contact', contactErr);
      return;
    }
    const meetupAt = combineLocalDateTimeToISO(dateStr, timeStr);
    if (!meetupAt) {
      alertOk('Date & time', 'Use date as YYYY-MM-DD and time as HH:mm (24-hour), e.g. 14:30.');
      return;
    }
    setMeetupBusy(true);
    try {
      await api.patch(`/api/requests/${requestId}/meetup`, {
        collectionPointId: selectedPoint._id,
        meetupAt,
        meetupContactNumber: contactDigits,
      });
      closeMeetupModal();
      await load();
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Could not set meet-up'));
    } finally {
      setMeetupBusy(false);
    }
  };

  const subtitle = useMemo(() => `About: ${bookTitle}`, [bookTitle]);

  const chatRoleSubtitle = useMemo(() => {
    if (!request || !userId) return '';
    if (request.ownerClerkUserId === userId) return 'Received — people asking about your book';
    return 'Sent — swap thread you opened';
  }, [request, userId]);

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
            {peerName || 'Exchange'}
          </Text>
          <Text style={styles.headSub} numberOfLines={1}>
            {subtitle}
          </Text>
          {chatRoleSubtitle ? (
            <Text style={styles.headRoleLine} numberOfLines={2}>
              {chatRoleSubtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.topBarSpacer} />
      </View>

      {request && isAccepted && request.meetupHandoffLabel ? (
        <View style={styles.meetupBanner}>
          <Text style={styles.meetupLabel}>Meet-up</Text>
          <Text style={styles.meetupVal}>{request.meetupHandoffLabel}</Text>
          {request.meetupScheduledAt ? (
            <Text style={styles.meetupWhen}>
              <Text style={styles.meetupMetaLabel}>When: </Text>
              {formatMeetupWhen(request.meetupScheduledAt)}
            </Text>
          ) : null}
          {request.meetupContactNumber ? (
            <Pressable
              onPress={() => {
                const raw = request.meetupContactNumber ?? '';
                const tel = raw.replace(/[^\d+]/g, '');
                if (tel.length >= 10) void Linking.openURL(`tel:${tel}`);
              }}
              style={styles.meetupContactRow}
            >
              <Ionicons name="call-outline" size={17} color={lead} />
              <Text style={styles.meetupContactTxt}>{request.meetupContactNumber}</Text>
            </Pressable>
          ) : null}
          {hasMapCoords(request.meetupLatitude ?? undefined, request.meetupLongitude ?? undefined) ? (
            <Pressable
              style={styles.dirBtn}
              onPress={() =>
                void openGoogleMapsDirections(request.meetupLatitude as number, request.meetupLongitude as number)
              }
            >
              <Ionicons name="navigate-outline" size={16} color={cascadingWhite} />
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
          <Text style={styles.meetupHintTxt}>
            Set the meet-up: choose a collection point, then add date, time, and a contact number. That summary is
            sent in this thread for both of you.
          </Text>
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
            <ActivityIndicator color={cascadingWhite} size="small" />
          ) : (
            <>
              <Ionicons name="location-outline" size={20} color={cascadingWhite} />
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
            <ActivityIndicator style={{ marginTop: 30 }} color={themeGreen} />
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
              <Text style={styles.empty}>No messages yet. Say hello.</Text>
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
            placeholderTextColor={themeMuted}
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
                  <MeetupDateTimePickers
                    value={meetupWhen}
                    onChange={setMeetupWhen}
                    disabled={meetupBusy}
                    dateHint="Must be today or a future calendar day."
                    timeHint="Together with date, cannot be in the past."
                  />
                  <View style={styles.modalField}>
                    <Text style={styles.modalFieldLabel}>Your contact number</Text>
                    <TextInput
                      value={meetupContactStr}
                      onChangeText={(t) => setMeetupContactStr(sanitizeMeetupPhoneDigits(t))}
                      placeholder="10 digits — e.g. 0770123456"
                      placeholderTextColor={themeMuted}
                      style={styles.modalInput}
                      keyboardType="number-pad"
                      maxLength={10}
                      inputMode="numeric"
                    />
                  </View>
                  <Text style={styles.modalHint}>Times use your device’s local timezone.</Text>
                </ScrollView>
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
  flex: { flex: 1, backgroundColor: messengerScreenBg },
  chatPane: { flex: 1, backgroundColor: messengerThreadBg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 10,
    backgroundColor: cascadingWhite,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: messengerTopHairline,
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
  headRoleLine: { marginTop: 2, fontSize: 11, fontWeight: '600', color: themeMuted, maxWidth: '95%' },
  meetupBanner: {
    marginHorizontal: 12,
    marginBottom: 6,
    padding: 12,
    borderRadius: 14,
    backgroundColor: messengerMeetupBannerBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: messengerMeetupBannerBorder,
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
  meetupHint: {
    marginHorizontal: 12,
    marginBottom: 6,
    padding: 10,
    borderRadius: 12,
    backgroundColor: messengerHintBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: messengerMeetupBannerBorder,
  },
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
    backgroundColor: messengerPrimaryActionBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: messengerMeetupBannerBorder,
  },
  setMeetupTxt: { fontSize: 14, fontWeight: '800', color: cascadingWhite },
  dirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: messengerPrimaryActionBg,
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
  dirBtnTxt: { fontSize: 13, fontWeight: '800', color: cascadingWhite },
  dirBtnTxtMuted: { fontSize: 13, fontWeight: '700', color: textSecondary },
  msgList: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: messengerThreadBg,
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
    borderTopColor: messengerTopHairline,
    backgroundColor: messengerComposerBg,
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
    backgroundColor: messengerInputFill,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: lead,
    fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: messengerTopHairline,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: { backgroundColor: messengerSendActive },
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
    backgroundColor: themeSurfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    gap: 4,
  },
  detailsSummaryLabel: { fontSize: 11, fontWeight: '800', color: warmHaze, textTransform: 'uppercase' },
  detailsSummaryTxt: { fontSize: 15, fontWeight: '800', color: lead },
  modalField: { marginBottom: 14 },
  modalFieldLabel: { fontSize: 13, fontWeight: '800', color: warmHaze, marginBottom: 6 },
  modalInput: {
    backgroundColor: themeSurfaceMuted,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: lead,
  },
  modalFieldMicro: {
    fontSize: 12,
    color: themeMuted,
    marginTop: 6,
    lineHeight: 16,
  },
  modalHint: { fontSize: 13, color: textSecondary, marginBottom: 8, lineHeight: 18 },
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
    backgroundColor: messengerPrimaryActionBg,
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
