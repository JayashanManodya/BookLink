import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, apiErrorMessage } from '../lib/api';
import { confirmDestructive } from '../lib/platformAlert';
import { pickChatImageFromLibrary } from '../lib/pickChatImage';
import { uploadChatImage } from '../lib/uploadChatImage';
import { FormImageAttachment } from '../components/FormImageAttachment';
import { FORM_SCROLL_GAP } from '../theme/formLayout';
import { SignInGateCard } from '../components/SignInGateCard';
import type { RequestsStackParamList } from '../navigation/requestsStackTypes';
import {
  cascadingWhite,
  chineseSilver,
  crunch,
  dreamland,
  lead,
  textSecondary,
  warmHaze,
} from '../theme/colors';
import { cardShadow } from '../theme/shadows';
import type { ExchangeRequest } from '../types/exchange';

type TabKey = 'received' | 'sent';

type Props = NativeStackScreenProps<RequestsStackParamList, 'RequestsHome'>;

export function RequestsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const [tab, setTab] = useState<TabKey>('received');
  const [requests, setRequests] = useState<ExchangeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editBookTitle, setEditBookTitle] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editPhotoLocalUri, setEditPhotoLocalUri] = useState<string | null>(null);
  const [editPhotoMime, setEditPhotoMime] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ requests: ExchangeRequest[] }>('/api/requests', {
        params: { role: tab },
      });
      setRequests(res.data.requests ?? []);
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Could not load requests'));
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useFocusEffect(
    useCallback(() => {
      if (!isSignedIn) return;
      void load();
    }, [isSignedIn, tab, load])
  );

  const updateStatus = async (id: string, status: 'accepted' | 'rejected' | 'cancelled') => {
    try {
      await api.patch(`/api/requests/${id}`, { status });
      void load();
    } catch (e: unknown) {
      Alert.alert('Error', apiErrorMessage(e, 'Could not update'));
    }
  };

  const confirmReceipt = async (id: string) => {
    try {
      await api.post(`/api/requests/${id}/confirm-receipt`);
      void load();
    } catch (e: unknown) {
      Alert.alert('Error', apiErrorMessage(e, 'Could not confirm receipt'));
    }
  };

  const confirmBookReceived = (id: string) => {
    confirmDestructive({
      title: 'Confirm you received the book',
      message: 'Mark this exchange as successfully received. After confirming, you won\u2019t be able to undo this.',
      cancelLabel: 'Not yet',
      confirmLabel: 'Yes, I got it',
      confirmStyle: 'default',
      onConfirm: () => void confirmReceipt(id),
    });
  };

  const openEdit = (r: ExchangeRequest) => {
    setEditId(r._id);
    setEditBookTitle(r.bookTitle || 'Book');
    setEditMessage(r.message || '');
    setEditPhotoUrl(r.offeredBookPhoto || '');
    setEditPhotoLocalUri(null);
    setEditPhotoMime(null);
    setEditOpen(true);
  };

  const closeEdit = () => {
    if (editBusy) return;
    setEditOpen(false);
    setEditId(null);
    setEditPhotoLocalUri(null);
    setEditPhotoMime(null);
  };

  const pickEditPhoto = async () => {
    const picked = await pickChatImageFromLibrary({ aspectBookCover: true });
    if (!picked) return;
    setEditPhotoLocalUri(picked.uri);
    setEditPhotoMime(picked.mimeType);
  };

  const removeEditPhoto = () => {
    setEditPhotoLocalUri(null);
    setEditPhotoMime(null);
    setEditPhotoUrl('');
  };

  const saveEdit = async () => {
    if (!editId || editBusy) return;
    setEditBusy(true);
    try {
      let finalPhoto = editPhotoUrl;
      if (editPhotoLocalUri) {
        const url = await uploadChatImage(editPhotoLocalUri, editPhotoMime);
        if (!url) {
          Alert.alert('Upload', 'Could not upload photo.');
          setEditBusy(false);
          return;
        }
        finalPhoto = url;
      }
      await api.patch(`/api/requests/${editId}/edit`, {
        message: editMessage.trim(),
        offeredBookPhoto: finalPhoto || '',
      });
      setEditOpen(false);
      setEditId(null);
      setEditPhotoLocalUri(null);
      setEditPhotoMime(null);
      void load();
    } catch (e: unknown) {
      Alert.alert('Error', apiErrorMessage(e, 'Could not save changes'));
    } finally {
      setEditBusy(false);
    }
  };

  const deleteRequest = async (id: string) => {
    try {
      await api.delete(`/api/requests/${id}`);
      setRequests((prev) => prev.filter((r) => r._id !== id));
    } catch (e: unknown) {
      Alert.alert('Error', apiErrorMessage(e, 'Could not delete request'));
    }
  };

  const cancelSent = (id: string) => {
    confirmDestructive({
      title: 'Cancel request',
      message: 'Mark this request as cancelled?',
      cancelLabel: 'No',
      confirmLabel: 'Cancel request',
      onConfirm: () => void updateStatus(id, 'cancelled'),
    });
  };

  const confirmDeleteRequest = (id: string) => {
    confirmDestructive({
      title: 'Delete request',
      message: 'Remove this request and its chat history?',
      confirmLabel: 'Delete',
      onConfirm: () => void deleteRequest(id),
    });
  };

  if (!isSignedIn) {
    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.scroll, { paddingTop: Math.max(insets.top, 8) + 8 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Requests</Text>
        <Text style={styles.subtitle}>Trades & borrows</Text>
        <SignInGateCard
          title="Sign in to see requests"
          message="Exchange and borrow requests appear here once you are signed in with Google."
          icon="swap-horizontal-outline"
        />
      </ScrollView>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 8) + 8 }]}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Requests</Text>
          <Text style={styles.subtitle}>Offers on your books and what you have sent.</Text>
        </View>
        <Pressable style={styles.chatsPill} onPress={() => navigation.navigate('ChatsInbox')} hitSlop={6}>
          <Ionicons name="chatbubbles-outline" size={18} color={lead} />
          <Text style={styles.chatsPillTxt}>Chats</Text>
        </Pressable>
      </View>
      <View style={styles.tabs}>
        <Pressable onPress={() => setTab('received')} style={[styles.tab, tab === 'received' && styles.tabOn]}>
          <Text style={[styles.tabText, tab === 'received' && styles.tabTextOn]}>Received</Text>
        </Pressable>
        <Pressable onPress={() => setTab('sent')} style={[styles.tab, tab === 'sent' && styles.tabOn]}>
          <Text style={[styles.tabText, tab === 'sent' && styles.tabTextOn]}>Sent</Text>
        </Pressable>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={crunch} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {requests.length === 0 ? (
            <View style={[styles.card, cardShadow]}>
              <Text style={styles.body}>
                {tab === 'received'
                  ? 'No incoming requests yet. When someone wants your book, it will land here.'
                  : 'You have not sent any requests yet. Open a book and tap Request exchange.'}
              </Text>
            </View>
          ) : (
            requests.map((r) => (
              <View key={r._id} style={[styles.reqCard, cardShadow]}>
                <View style={styles.reqTop}>
                  <View style={styles.personRow}>
                    <Avatar
                      name={tab === 'received' ? r.requesterDisplayName || 'Reader' : r.ownerDisplayName || 'Book lister'}
                      uri={tab === 'received' ? r.requesterAvatarUrl : r.ownerAvatarUrl}
                    />
                    <View style={{ flex: 1 }}>
                    <Text style={styles.reqName}>
                      {tab === 'received' ? r.requesterDisplayName || 'Reader' : r.ownerDisplayName || 'Book lister'}
                    </Text>
                    <Text style={styles.reqBook}>For: {r.bookTitle || 'Book'}</Text>
                    </View>
                  </View>
                  <View style={styles.rightTop}>
                    <View style={styles.rightBtnRow}>
                      {tab === 'sent' && r.status === 'pending' ? (
                        <Pressable
                          style={styles.editBtn}
                          onPress={() => openEdit(r)}
                          hitSlop={8}
                          accessibilityLabel="Edit request"
                        >
                          <Ionicons name="create-outline" size={16} color={lead} />
                        </Pressable>
                      ) : null}
                      <Pressable
                        style={styles.deleteBtn}
                        onPress={() =>
                          tab === 'sent' && r.status === 'pending' ? cancelSent(r._id) : confirmDeleteRequest(r._id)
                        }
                        hitSlop={8}
                      >
                        <Ionicons
                          name={tab === 'sent' && r.status === 'pending' ? 'close-circle-outline' : 'trash-outline'}
                          size={16}
                          color="#b3261e"
                        />
                      </Pressable>
                    </View>
                    <Text style={[styles.status, statusStyle(r.status)]}>{r.status}</Text>
                  </View>
                </View>
                {r.message ? (
                  <Text style={styles.msg}>&ldquo;{r.message}&rdquo;</Text>
                ) : null}
                {r.offeredBookPhoto ? (
                  <Image source={{ uri: r.offeredBookPhoto }} style={styles.offered} resizeMode="cover" />
                ) : null}
                {tab === 'sent' && r.status === 'accepted' ? (
                  <View style={styles.receiptPromptBlock}>
                    {!r.requesterConfirmedAt ? (
                      <>
                        <Text style={styles.confirmHint}>
                          Confirm when you have the book, or report a problem first. After you confirm, you can only leave a
                          review (no more reporting).
                        </Text>
                        <View style={styles.preConfirmRow}>
                          <Pressable style={styles.confirmBtnHalf} onPress={() => confirmBookReceived(r._id)}>
                            <Ionicons name="checkmark-circle-outline" size={17} color="#27500a" />
                            <Text style={styles.confirmTxt}>Confirm receipt</Text>
                          </Pressable>
                          {!r.myExchangeReportId ? (
                            <Pressable
                              style={styles.reportBtnHalf}
                              onPress={() =>
                                navigation.navigate('ReportExchange', {
                                  exchangeRequestId: r._id,
                                  bookTitle: r.bookTitle || 'Book',
                                })
                              }
                            >
                              <Ionicons name="flag-outline" size={16} color="#8b2500" />
                              <Text style={styles.reportTxt}>Report</Text>
                            </Pressable>
                          ) : (
                            <Pressable
                              style={styles.reportEditHalf}
                              onPress={() =>
                                navigation.navigate('ReportExchange', {
                                  exchangeRequestId: r._id,
                                  bookTitle: r.bookTitle || 'Book',
                                  reportId: r.myExchangeReportId,
                                })
                              }
                            >
                              <Text style={styles.reportEditTxt}>Your report</Text>
                            </Pressable>
                          )}
                        </View>
                      </>
                    ) : (
                      <>
                        <Text style={styles.confirmedDone}>
                          <Ionicons name="checkmark-circle" size={14} color="#27500a" /> You confirmed receipt of this book
                        </Text>
                        {!r.hasExchangeReview ? (
                          <Pressable
                            style={styles.reviewBtn}
                            onPress={() =>
                              navigation.navigate('WriteReview', {
                                exchangeRequestId: r._id,
                                revieweeClerkUserId: r.ownerClerkUserId,
                                revieweeName: r.ownerDisplayName || 'Lister',
                              })
                            }
                          >
                            <Text style={styles.reviewTxt}>Leave a review</Text>
                          </Pressable>
                        ) : (
                          <Text style={styles.reviewDone}>You reviewed this exchange</Text>
                        )}
                      </>
                    )}
                  </View>
                ) : null}
                {tab === 'received' && r.status === 'pending' ? (
                  <View style={styles.actions}>
                    <Text style={styles.acceptHint}>
                      Accepting one reader finishes this swap for the book; other pending requests for it are declined
                      automatically.
                    </Text>
                    <View style={styles.actionRow}>
                      <Pressable
                        style={[styles.actBtn, styles.accept]}
                        onPress={() => void updateStatus(r._id, 'accepted')}
                      >
                        <Text style={styles.actAcceptTxt}>Accept</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.actBtn, styles.reject]}
                        onPress={() => void updateStatus(r._id, 'rejected')}
                      >
                        <Text style={styles.actRejectTxt}>Reject</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
                {tab === 'received' && r.status === 'accepted' && r.hasReportFromRequester ? (
                  <View style={styles.reportNotice}>
                    <Ionicons name="alert-circle-outline" size={16} color="#8b2500" />
                    <Text style={styles.reportNoticeTxt}>
                      The requester reported an issue for this exchange.
                    </Text>
                  </View>
                ) : null}
                <Pressable
                  style={styles.chatBtn}
                  onPress={() =>
                    navigation.navigate('RequestChat', {
                      requestId: r._id,
                      bookTitle: r.bookTitle || 'Book',
                      peerName:
                        tab === 'received'
                          ? r.requesterDisplayName || 'Reader'
                          : r.ownerDisplayName || 'Book lister',
                      peerAvatarUrl:
                        tab === 'received'
                          ? r.requesterAvatarUrl || ''
                          : r.ownerAvatarUrl || '',
                    })
                  }
                >
                  <Text style={styles.chatTxt}>{tab === 'sent' ? 'Chat with lister' : 'Open chat'}</Text>
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={editOpen} animationType="slide" transparent onRequestClose={closeEdit}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeEdit} />
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Text style={styles.modalTitle}>Edit request</Text>
            <Text style={styles.modalSub}>For: {editBookTitle}</Text>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ gap: FORM_SCROLL_GAP, paddingBottom: 8 }}
            >
              <View style={{ gap: 6 }}>
                <Text style={styles.modalFieldLabel}>Message to the owner</Text>
                <TextInput
                  value={editMessage}
                  onChangeText={setEditMessage}
                  placeholder='e.g. "I can offer Physics past papers in good condition"'
                  placeholderTextColor={warmHaze}
                  style={styles.modalInput}
                  multiline
                  textAlignVertical="top"
                  numberOfLines={5}
                />
              </View>
              <View style={{ gap: 6 }}>
                <Text style={styles.modalFieldLabel}>Offered book photo</Text>
                <FormImageAttachment
                  previewUri={editPhotoLocalUri || editPhotoUrl}
                  onPick={pickEditPhoto}
                  onRemove={removeEditPhoto}
                  emptyHint="Tap to add photo of book you offer (optional)"
                />
              </View>
            </ScrollView>
            <View style={styles.modalActionsRow}>
              <Pressable style={styles.modalBackBtn} onPress={closeEdit} disabled={editBusy}>
                <Text style={styles.modalBackBtnTxt}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmBtn, editBusy && styles.modalConfirmBtnOff]}
                onPress={() => void saveEdit()}
                disabled={editBusy}
              >
                {editBusy ? (
                  <ActivityIndicator color={cascadingWhite} size="small" />
                ) : (
                  <Text style={styles.modalConfirmBtnTxt}>Save changes</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function statusStyle(s: ExchangeRequest['status']) {
  if (s === 'pending') return { backgroundColor: '#faeeda', color: '#854f0b' };
  if (s === 'accepted') return { backgroundColor: '#eaf3de', color: '#27500a' };
  if (s === 'cancelled') return { backgroundColor: '#f3f3f5', color: warmHaze };
  return { backgroundColor: chineseSilver, color: lead };
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return 'R';
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'R';
}

function Avatar({ name, uri }: { name: string; uri?: string }) {
  if (uri) {
    return <Image source={{ uri }} style={styles.avatar} />;
  }
  return (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <Text style={styles.avatarTxt}>{initialsFromName(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: cascadingWhite, paddingHorizontal: 20, paddingBottom: 24 },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  chatsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: chineseSilver,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    marginTop: 2,
  },
  chatsPillTxt: { fontSize: 14, fontWeight: '800', color: lead },
  title: { fontSize: 28, fontWeight: '800', color: lead, letterSpacing: -0.5 },
  subtitle: { marginTop: 4, fontSize: 15, color: warmHaze, fontWeight: '600', maxWidth: '88%' },
  tabs: {
    flexDirection: 'row',
    marginTop: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: dreamland,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabOn: { borderBottomWidth: 2, borderBottomColor: crunch },
  tabText: { fontSize: 15, fontWeight: '600', color: warmHaze },
  tabTextOn: { color: lead, fontWeight: '800' },
  list: { paddingBottom: 32, gap: 12, marginTop: 14 },
  card: {
    marginTop: 4,
    backgroundColor: cascadingWhite,
    borderRadius: 24,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  body: { fontSize: 15, lineHeight: 22, color: textSecondary },
  error: { color: '#b3261e', marginTop: 12 },
  reqCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: cascadingWhite,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    gap: 10,
  },
  reqTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  rightTop: { alignItems: 'flex-end', gap: 6 },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#f0cccc',
    backgroundColor: '#fff7f7',
  },
  personRow: { flexDirection: 'row', gap: 10, alignItems: 'center', flex: 1 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: chineseSilver },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: dreamland },
  avatarTxt: { fontSize: 14, fontWeight: '800', color: lead },
  reqName: { fontSize: 17, fontWeight: '800', color: lead },
  reqBook: { marginTop: 2, fontSize: 14, color: textSecondary },
  status: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    overflow: 'hidden',
  },
  msg: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: dreamland,
    fontSize: 14,
    color: textSecondary,
    lineHeight: 20,
  },
  actions: { gap: 10, marginTop: 4 },
  acceptHint: { fontSize: 12, color: warmHaze, lineHeight: 17, marginBottom: 2 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actBtn: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
  accept: { backgroundColor: '#eaf3de', borderColor: '#c0dd97' },
  reject: { backgroundColor: cascadingWhite, borderColor: dreamland },
  actAcceptTxt: { fontSize: 15, fontWeight: '800', color: '#27500a' },
  actRejectTxt: { fontSize: 15, fontWeight: '700', color: textSecondary },
  chatBtn: {
    marginTop: 4,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#f3f3f5',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  chatTxt: { fontSize: 14, fontWeight: '700', color: lead },
  offered: { width: '100%', height: 140, borderRadius: 12, marginTop: 4, backgroundColor: chineseSilver },
  receiptPromptBlock: { marginTop: 4, gap: 6 },
  preConfirmRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, alignItems: 'stretch' },
  reviewBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: crunch,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    alignSelf: 'stretch',
  },
  confirmBtnHalf: {
    flex: 1,
    minWidth: '42%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: '#eaf3de',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#c0dd97',
  },
  reportBtnHalf: {
    flex: 1,
    minWidth: '42%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: '#fff5f0',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e8c4b8',
  },
  reportEditHalf: {
    flex: 1,
    minWidth: '42%',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f3f5',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  reportEditTxt: { fontSize: 14, fontWeight: '800', color: lead },
  reportTxt: { fontSize: 14, fontWeight: '800', color: '#8b2500' },
  reportNotice: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff5f0',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e8c4b8',
  },
  reportNoticeTxt: { flex: 1, fontSize: 13, fontWeight: '700', color: '#8b2500' },
  reviewTxt: { fontSize: 14, fontWeight: '800', color: lead },
  reviewDone: {
    fontSize: 13,
    fontWeight: '700',
    color: textSecondary,
  },
  confirmHint: { fontSize: 13, color: textSecondary, lineHeight: 18 },
  confirmTxt: { fontSize: 14, fontWeight: '800', color: '#27500a' },
  confirmedDone: {
    fontSize: 13,
    fontWeight: '700',
    color: '#27500a',
  },
  rightBtnRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  editBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    backgroundColor: cascadingWhite,
  },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalSheet: {
    backgroundColor: cascadingWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: '90%',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: lead },
  modalSub: { marginTop: 2, marginBottom: 12, fontSize: 14, color: textSecondary },
  modalFieldLabel: { fontSize: 13, fontWeight: '800', color: warmHaze },
  modalInput: {
    minHeight: 110,
    backgroundColor: '#f3f3f5',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: lead,
    marginBottom: 2,
  },
  modalActionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
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
});
