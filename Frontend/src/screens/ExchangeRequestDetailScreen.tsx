import { useCallback, useEffect, useState } from 'react';
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
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, apiErrorMessage } from '../lib/api';
import { confirmDestructive } from '../lib/platformAlert';
import { pickChatImageFromLibrary } from '../lib/pickChatImage';
import { uploadChatImage } from '../lib/uploadChatImage';
import { FormImageAttachment } from '../components/FormImageAttachment';
import { CourseScreenShell } from '../components/CourseScreenShell';
import { FORM_SCROLL_GAP } from '../theme/formLayout';
import type { RequestsStackParamList } from '../navigation/requestsStackTypes';
import { cascadingWhite, dreamland, lead, textSecondary, warmHaze, themeSurfaceMuted } from '../theme/colors';
import {
  themeGreen,
  themeInk,
  themeOrange,
  themePrimary,
} from '../theme/courseTheme';
import { cardShadow } from '../theme/shadows';
import type { ExchangeRequest } from '../types/exchange';

/** Matches RequestsScreen palette tokens */
const REQ_SUBTEXT = 'rgba(16,16,17,0.55)';
const REQ_BORDER = 'rgba(16,16,17,0.12)';
const REQ_PURPLE_FILL = 'rgba(113,110,255,0.12)';
const REQ_GREEN_FILL = 'rgba(56,163,54,0.14)';
const REQ_ORANGE_FILL = 'rgba(255,138,51,0.16)';
const REQ_INK_FILL = 'rgba(16,16,17,0.06)';

type Props = NativeStackScreenProps<RequestsStackParamList, 'ExchangeRequestDetail'>;

function capitalizeWord(s: string) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function statusStyle(s: ExchangeRequest['status']): TextStyle {
  if (s === 'pending') return { backgroundColor: themeOrange, color: themeInk };
  if (s === 'accepted') return { backgroundColor: themeGreen, color: themeInk };
  if (s === 'cancelled') return { backgroundColor: REQ_PURPLE_FILL, color: themePrimary };
  return { backgroundColor: REQ_ORANGE_FILL, color: themeInk };
}

function statusSolidBadge(status: ExchangeRequest['status']): { box: ViewStyle; txt: TextStyle } {
  switch (status) {
    case 'pending':
      return { box: { backgroundColor: themeOrange }, txt: { color: themeInk } };
    case 'accepted':
      return { box: { backgroundColor: themeGreen }, txt: { color: themeInk } };
    case 'rejected':
      return {
        box: {
          backgroundColor: 'transparent',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: themeInk,
        },
        txt: { color: themeInk },
      };
    default:
      return {
        box: { backgroundColor: REQ_PURPLE_FILL },
        txt: { color: themePrimary },
      };
  }
}

function receivedSecondaryBadge(r: ExchangeRequest): string {
  if (r.offeredBookPhoto) return 'Offer photo';
  if (r.meetupScheduledAt) return 'Meet-up set';
  return 'Swap request';
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

export function ExchangeRequestDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const { requestId } = route.params;

  const [request, setRequest] = useState<ExchangeRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editMessage, setEditMessage] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editPhotoLocalUri, setEditPhotoLocalUri] = useState<string | null>(null);
  const [editPhotoMime, setEditPhotoMime] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  const loadRequest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ request: ExchangeRequest }>(`/api/requests/${requestId}`);
      setRequest(res.data.request ?? null);
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Could not load request'));
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    void loadRequest();
  }, [loadRequest]);

  const isReceived = !!request && !!userId && request.ownerClerkUserId === userId;
  const isSent = !!request && !!userId && request.requesterClerkUserId === userId;

  const updateStatus = async (id: string, status: 'accepted' | 'rejected' | 'cancelled') => {
    try {
      await api.patch(`/api/requests/${id}`, { status });
      await loadRequest();
    } catch (e: unknown) {
      Alert.alert('Error', apiErrorMessage(e, 'Could not update'));
    }
  };

  const confirmReceipt = async (id: string) => {
    try {
      await api.post(`/api/requests/${id}/confirm-receipt`);
      await loadRequest();
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

  const deleteRequest = async (id: string) => {
    try {
      await api.delete(`/api/requests/${id}`);
      navigation.goBack();
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
      message: 'Remove this request and its message history?',
      confirmLabel: 'Delete',
      onConfirm: () => void deleteRequest(id),
    });
  };

  const openEdit = (r: ExchangeRequest) => {
    setEditMessage(r.message || '');
    setEditPhotoUrl(r.offeredBookPhoto || '');
    setEditPhotoLocalUri(null);
    setEditPhotoMime(null);
    setEditOpen(true);
  };

  const closeEdit = () => {
    if (editBusy) return;
    setEditOpen(false);
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
    if (!request || editBusy) return;
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
      await api.patch(`/api/requests/${request._id}/edit`, {
        message: editMessage.trim(),
        offeredBookPhoto: finalPhoto || '',
      });
      setEditOpen(false);
      setEditPhotoLocalUri(null);
      setEditPhotoMime(null);
      await loadRequest();
    } catch (e: unknown) {
      Alert.alert('Error', apiErrorMessage(e, 'Could not save changes'));
    } finally {
      setEditBusy(false);
    }
  };

  if (loading && !request) {
    return (
      <CourseScreenShell title="Request" subtitle="" scroll={false} onBackPress={() => navigation.goBack()}>
        <ActivityIndicator style={{ marginTop: 32 }} color={themePrimary} size="large" />
      </CourseScreenShell>
    );
  }

  if (error || !request) {
    return (
      <CourseScreenShell title="Request" subtitle="" scroll={false} onBackPress={() => navigation.goBack()}>
        <Text style={styles.error}>{error || 'Not found'}</Text>
      </CourseScreenShell>
    );
  }

  const r = request;
  const solidBadge = statusSolidBadge(r.status);
  const peerName = isReceived ? r.requesterDisplayName || 'Reader' : r.ownerDisplayName || 'Book lister';
  const peerAvatar = isReceived ? r.requesterAvatarUrl : r.ownerAvatarUrl;

  return (
    <>
      <CourseScreenShell
        title="Request details"
        subtitle={r.bookTitle || 'Book'}
        scroll={false}
        onBackPress={() => navigation.goBack()}
      >
        <ScrollView
          contentContainerStyle={[styles.detailScroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
        >
          <View style={[styles.summaryCard, cardShadow]}>
            <View style={styles.reqTop}>
              <View style={styles.personRow}>
                <Avatar name={peerName} uri={peerAvatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.reqName}>{peerName}</Text>
                  <Text style={styles.reqBook}>Book: {r.bookTitle || 'Book'}</Text>
                </View>
              </View>
              <View style={styles.rightTop}>
                <View style={styles.rightBtnRow}>
                  {isSent && r.status === 'pending' ? (
                    <Pressable style={styles.editBtn} onPress={() => openEdit(r)} hitSlop={8} accessibilityLabel="Edit request">
                      <Ionicons name="create-outline" size={16} color={themeInk} />
                    </Pressable>
                  ) : null}
                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => (isSent && r.status === 'pending' ? cancelSent(r._id) : confirmDeleteRequest(r._id))}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={isSent && r.status === 'pending' ? 'close-circle-outline' : 'trash-outline'}
                      size={16}
                      color={themeOrange}
                    />
                  </Pressable>
                </View>
                <Text style={[styles.status, statusStyle(r.status)]}>{r.status}</Text>
              </View>
            </View>

            {isReceived ? (
              <View style={styles.receivedBadgeRow}>
                <View style={[styles.badgeSolid, solidBadge.box]}>
                  <Text style={[styles.badgeSolidTxt, solidBadge.txt]}>{capitalizeWord(r.status)}</Text>
                </View>
                <View style={styles.badgeSoft}>
                  <Text style={styles.badgeSoftTxt}>{receivedSecondaryBadge(r)}</Text>
                </View>
              </View>
            ) : null}

            {r.bookCoverImageUrl ? (
              <Image source={{ uri: r.bookCoverImageUrl }} style={styles.listingCover as ImageStyle} resizeMode="cover" />
            ) : null}

            {r.message ? (
              <Text style={styles.msg}>&ldquo;{r.message}&rdquo;</Text>
            ) : null}
            {r.offeredBookPhoto ? (
              <Image source={{ uri: r.offeredBookPhoto }} style={styles.offered} resizeMode="cover" />
            ) : null}

            {isSent && r.status === 'accepted' ? (
              <View style={styles.receiptPromptBlock}>
                {!r.requesterConfirmedAt ? (
                  r.myExchangeReportId ? (
                    <View style={styles.reportBlockedBlock}>
                      <Text style={styles.reportBlockedTxt}>
                        You filed a report for this swap. Receipt confirmation is not available.
                      </Text>
                      <Pressable
                        style={styles.reportEditFullWidth}
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
                    </View>
                  ) : (
                    <>
                      <Text style={styles.confirmHint}>
                        Confirm when you have the book, or report a problem first. If you report, you cannot confirm receipt
                        afterward.
                      </Text>
                      <View style={styles.preConfirmRow}>
                        <Pressable style={styles.confirmBtnHalf} onPress={() => confirmBookReceived(r._id)}>
                          <Ionicons name="checkmark-circle-outline" size={17} color={cascadingWhite} />
                          <Text style={styles.confirmTxt}>Confirm receipt</Text>
                        </Pressable>
                        <Pressable
                          style={styles.reportBtnHalf}
                          onPress={() =>
                            navigation.navigate('ReportExchange', {
                              exchangeRequestId: r._id,
                              bookTitle: r.bookTitle || 'Book',
                            })
                          }
                        >
                          <Ionicons name="flag-outline" size={16} color={cascadingWhite} />
                          <Text style={styles.reportTxt}>Report</Text>
                        </Pressable>
                      </View>
                    </>
                  )
                ) : (
                  <>
                    <Text style={styles.confirmedDone}>
                      <Ionicons name="checkmark-circle" size={14} color={themeGreen} /> You confirmed receipt of this book
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

            {isReceived && r.status === 'pending' ? (
              <View style={styles.actions}>
                <Text style={styles.acceptHint}>
                  Accepting one reader finishes this swap for the book; other pending requests for it are declined automatically.
                </Text>
                <View style={styles.actionRow}>
                  <Pressable style={[styles.actBtn, styles.accept]} onPress={() => void updateStatus(r._id, 'accepted')}>
                    <Text style={styles.actAcceptTxt}>Accept</Text>
                  </Pressable>
                  <Pressable style={[styles.actBtn, styles.reject]} onPress={() => void updateStatus(r._id, 'rejected')}>
                    <Text style={styles.actRejectTxt}>Reject</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {isReceived && r.status === 'accepted' && r.hasReportFromRequester ? (
              <View style={styles.reportNotice}>
                <View style={styles.reportNoticeTop}>
                  <Ionicons name="alert-circle-outline" size={16} color={themeOrange} />
                  <Text style={styles.reportNoticeTxt}>The requester reported an issue for this exchange.</Text>
                </View>
                {r.requesterReportId ? (
                  <Pressable
                    style={styles.viewReportBtn}
                    onPress={() =>
                      navigation.navigate('ReportExchange', {
                        exchangeRequestId: r._id,
                        bookTitle: r.bookTitle || 'Book',
                        reportId: r.requesterReportId,
                        listerView: true,
                        readerName: r.requesterDisplayName || 'Reader',
                        readerAvatarUrl: r.requesterAvatarUrl || '',
                      })
                    }
                  >
                    <Text style={styles.viewReportTxt}>View report</Text>
                    <Ionicons name="chevron-forward" size={18} color={themePrimary} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <Pressable
              style={styles.chatBtn}
              onPress={() =>
                navigation.navigate('RequestChat', {
                  requestId: r._id,
                  bookTitle: r.bookTitle || 'Book',
                  peerName,
                  peerAvatarUrl: peerAvatar || '',
                })
              }
            >
              <Text style={styles.chatTxt}>{isSent ? 'Message lister' : 'Open messages'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </CourseScreenShell>

      <Modal visible={editOpen} animationType="slide" transparent onRequestClose={closeEdit}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeEdit} />
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Text style={styles.modalTitle}>Edit request</Text>
            <Text style={styles.modalSub}>For: {r.bookTitle || 'Book'}</Text>
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
    </>
  );
}

const styles = StyleSheet.create({
  detailScroll: { paddingTop: 8 },
  error: { color: themeOrange, marginTop: 16, paddingHorizontal: 20 },
  summaryCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: cascadingWhite,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: REQ_BORDER,
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
    borderColor: themeOrange,
    backgroundColor: REQ_ORANGE_FILL,
  },
  personRow: { flexDirection: 'row', gap: 10, alignItems: 'center', flex: 1 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: REQ_INK_FILL },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: REQ_BORDER },
  avatarTxt: { fontSize: 14, fontWeight: '800', color: themeInk },
  reqName: { fontSize: 17, fontWeight: '800', color: themeInk },
  reqBook: { marginTop: 2, fontSize: 14, color: REQ_SUBTEXT },
  status: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    overflow: 'hidden',
  },
  receivedBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  badgeSolid: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeSolidTxt: {
    fontSize: 11,
    letterSpacing: 0.2,
    fontWeight: '800',
  },
  badgeSoft: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: REQ_PURPLE_FILL,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: REQ_BORDER,
  },
  badgeSoftTxt: {
    fontSize: 11,
    color: themePrimary,
    fontWeight: '600',
  },
  listingCover: { width: '100%', height: 160, borderRadius: 14, marginTop: 4, backgroundColor: REQ_PURPLE_FILL },
  msg: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: REQ_BORDER,
    fontSize: 14,
    color: REQ_SUBTEXT,
    lineHeight: 20,
  },
  offered: { width: '100%', height: 140, borderRadius: 12, marginTop: 4, backgroundColor: REQ_PURPLE_FILL },
  actions: { gap: 10, marginTop: 4 },
  acceptHint: { fontSize: 12, color: REQ_SUBTEXT, lineHeight: 17, marginBottom: 2 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accept: { backgroundColor: themeGreen },
  reject: { backgroundColor: themeOrange },
  actAcceptTxt: { fontSize: 15, fontWeight: '800', color: cascadingWhite },
  actRejectTxt: { fontSize: 15, fontWeight: '800', color: cascadingWhite },
  chatBtn: {
    marginTop: 4,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themePrimary,
  },
  chatTxt: { fontSize: 15, fontWeight: '800', color: cascadingWhite },
  receiptPromptBlock: { marginTop: 4, gap: 6 },
  preConfirmRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, alignItems: 'stretch' },
  reviewBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themePrimary,
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
    paddingVertical: 14,
    backgroundColor: themeGreen,
  },
  reportBtnHalf: {
    flex: 1,
    minWidth: '42%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: themeOrange,
  },
  reportBlockedBlock: { gap: 10, marginTop: 2 },
  reportBlockedTxt: { fontSize: 13, color: REQ_SUBTEXT, lineHeight: 18 },
  reportEditFullWidth: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: REQ_PURPLE_FILL,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: themePrimary,
    alignSelf: 'stretch',
  },
  reportEditTxt: { fontSize: 14, fontWeight: '800', color: themeInk },
  reportTxt: { fontSize: 14, fontWeight: '800', color: cascadingWhite },
  reportNotice: {
    marginTop: 4,
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: REQ_ORANGE_FILL,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: themeOrange,
  },
  reportNoticeTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  reportNoticeTxt: { flex: 1, fontSize: 13, fontWeight: '700', color: themeInk },
  viewReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'stretch',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: cascadingWhite,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: themePrimary,
  },
  viewReportTxt: { fontSize: 13, fontWeight: '800', color: themePrimary },
  reviewTxt: { fontSize: 15, fontWeight: '800', color: cascadingWhite },
  reviewDone: {
    fontSize: 13,
    fontWeight: '700',
    color: REQ_SUBTEXT,
  },
  confirmHint: { fontSize: 13, color: REQ_SUBTEXT, lineHeight: 18 },
  confirmTxt: { fontSize: 14, fontWeight: '800', color: cascadingWhite },
  confirmedDone: {
    fontSize: 13,
    fontWeight: '700',
    color: themeGreen,
  },
  rightBtnRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  editBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: REQ_BORDER,
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
    backgroundColor: themeSurfaceMuted,
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
