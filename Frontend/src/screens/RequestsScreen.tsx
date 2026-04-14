import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, apiErrorMessage } from '../lib/api';
import { confirmDestructive } from '../lib/platformAlert';
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

  useEffect(() => {
    if (!isSignedIn) return;
    void load();
  }, [isSignedIn, load]);

  const updateStatus = async (id: string, status: 'accepted' | 'rejected' | 'cancelled') => {
    try {
      await api.patch(`/api/requests/${id}`, { status });
      void load();
    } catch (e: unknown) {
      Alert.alert('Error', apiErrorMessage(e, 'Could not update'));
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
        <Pressable onPress={() => void load()} style={styles.iconBtn} hitSlop={8} disabled={loading}>
          <Text style={styles.refresh}>↻</Text>
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
                    <Text style={[styles.status, statusStyle(r.status)]}>{r.status}</Text>
                  </View>
                </View>
                {r.message ? (
                  <Text style={styles.msg}>&ldquo;{r.message}&rdquo;</Text>
                ) : null}
                {r.offeredBookPhoto ? (
                  <Image source={{ uri: r.offeredBookPhoto }} style={styles.offered} resizeMode="cover" />
                ) : null}
                {r.status === 'accepted' ? (
                  <Pressable
                    style={styles.reviewBtn}
                    onPress={() =>
                      navigation.navigate('WriteReview', {
                        exchangeRequestId: r._id,
                        revieweeClerkUserId:
                          tab === 'sent' ? r.ownerClerkUserId : r.requesterClerkUserId,
                        revieweeName:
                          tab === 'sent'
                            ? r.ownerDisplayName || 'Lister'
                            : r.requesterDisplayName || 'Reader',
                      })
                    }
                  >
                    <Text style={styles.reviewTxt}>Leave a review</Text>
                  </Pressable>
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
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: cascadingWhite,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  refresh: { fontSize: 22, color: lead, fontWeight: '700' },
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
  reviewBtn: {
    marginTop: 4,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: crunch,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  reviewTxt: { fontSize: 14, fontWeight: '800', color: lead },
});
