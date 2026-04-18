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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, apiErrorMessage } from '../lib/api';
import { confirmDestructive } from '../lib/platformAlert';
import type { WishlistStackParamList } from '../navigation/wishlistStackTypes';
import type { WishlistItem } from '../types/wishlist';
import type { WishlistHelpThread } from '../types/wishlistThread';
import {
  cascadingWhite,
  crunch,
  dreamland,
  lead,
  textSecondary,
  warmHaze,
} from '../theme/colors';
import { cardShadow } from '../theme/shadows';

type Props = NativeStackScreenProps<WishlistStackParamList, 'WantedBookDetail'>;

export function WantedBookDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const { wishlistItemId } = route.params;
  const [item, setItem] = useState<WishlistItem | null>(null);
  const [threads, setThreads] = useState<WishlistHelpThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ item: WishlistItem }>(`/api/wishlist/${wishlistItemId}`);
      const it = res.data.item;
      setItem(it);
      if (userId && it.ownerClerkUserId === userId) {
        const tr = await api.get<{ threads: WishlistHelpThread[] }>(`/api/wishlist/${wishlistItemId}/threads`);
        setThreads(tr.data.threads ?? []);
      } else {
        setThreads([]);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load');
    } finally {
      setLoading(false);
    }
  }, [wishlistItemId, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const isOwner = !!item && !!userId && item.ownerClerkUserId === userId;
  const canOffer = !!item && !!userId && !isOwner && item.status === 'open';

  const startChat = async () => {
    if (!item) return;
    setBusy(true);
    try {
      const res = await api.post<{
        thread: { _id: string };
        item: WishlistItem;
      }>(`/api/wishlist/${item._id}/chat`);
      const { thread, item: it } = res.data;
      navigation.navigate('WishlistThreadChat', {
        threadId: thread._id,
        itemTitle: it.title,
        peerName: it.ownerDisplayName || 'Reader',
        peerAvatarUrl: it.ownerAvatarUrl,
      });
    } catch (e: unknown) {
      Alert.alert('Error', apiErrorMessage(e, 'Could not open chat'));
    } finally {
      setBusy(false);
    }
  };

  const markFulfilled = () => {
    if (!item) return;
    const itemId = item._id;
    confirmDestructive({
      title: 'Mark fulfilled?',
      message: 'Hide this wanted post from the community board.',
      confirmLabel: 'Mark fulfilled',
      confirmStyle: 'default',
      onConfirm: () =>
        void (async () => {
          try {
            await api.put(`/api/wishlist/${itemId}`, { status: 'fulfilled' });
            navigation.goBack();
          } catch (e: unknown) {
            Alert.alert('Error', apiErrorMessage(e, 'Could not update'));
          }
        })(),
    });
  };

  const confirmDelete = () => {
    if (!item) return;
    const itemId = item._id;
    const title = item.title;
    confirmDestructive({
      title: 'Delete wanted book?',
      message: `"${title}" will be removed from the community board along with any help chats.`,
      confirmLabel: 'Delete',
      onConfirm: () =>
        void (async () => {
          try {
            await api.delete(`/api/wishlist/${itemId}`);
            navigation.goBack();
          } catch (e: unknown) {
            Alert.alert('Error', apiErrorMessage(e, 'Could not delete'));
          }
        })(),
    });
  };

  if (loading) {
    return (
      <View style={[styles.flex, { paddingTop: Math.max(insets.top, 8) }]}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={lead} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>
        <ActivityIndicator style={{ marginTop: 40 }} color={crunch} />
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={[styles.flex, { paddingTop: Math.max(insets.top, 8) }]}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={lead} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>
        <Text style={styles.error}>{error || 'Not found'}</Text>
      </View>
    );
  }

  const meta = [item.author, item.subject, item.language].filter(Boolean).join(' · ');
  const urgency = urgencyStyle(item.urgency);

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={lead} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.screenTitle}>Wanted book</Text>
        <View style={{ width: 72 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {item.wantedBookPhoto ? (
          <Image source={{ uri: item.wantedBookPhoto }} style={styles.photo} resizeMode="cover" />
        ) : null}
        <Text style={styles.title}>{item.title}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
        <View style={styles.row}>
          <Text style={styles.label}>Posted by</Text>
          <Text style={styles.value}>{item.ownerDisplayName || 'Reader'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Urgency</Text>
          <Text style={[styles.badge, { backgroundColor: urgency.bg, color: urgency.color }]}>{item.urgency}</Text>
        </View>

        {isOwner ? (
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.cardTitle}>Your wanted post</Text>
            <Text style={styles.cardBody}>
              When someone has this book, they can message you here. Open a chat below to reply.
            </Text>
            {item.status === 'open' ? (
              <View style={styles.ownerActionsRow}>
                <Pressable
                  style={[styles.secondaryBtn, cardShadow]}
                  onPress={() => navigation.navigate('PostWanted', { editItemId: item._id })}
                >
                  <Ionicons name="create-outline" size={16} color={lead} />
                  <Text style={styles.secondaryBtnTxt}>Edit</Text>
                </Pressable>
                <Pressable style={[styles.deleteBtn, cardShadow]} onPress={confirmDelete}>
                  <Ionicons name="trash-outline" size={16} color="#7a2e2e" />
                  <Text style={styles.deleteBtnTxt}>Delete</Text>
                </Pressable>
                <Pressable style={[styles.secondaryBtn, cardShadow]} onPress={() => markFulfilled()}>
                  <Text style={styles.secondaryBtnTxt}>Mark as fulfilled</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.ownerActionsRow}>
                <Text style={styles.closed}>This post is fulfilled.</Text>
                <Pressable style={[styles.deleteBtn, cardShadow]} onPress={confirmDelete}>
                  <Ionicons name="trash-outline" size={16} color="#7a2e2e" />
                  <Text style={styles.deleteBtnTxt}>Delete</Text>
                </Pressable>
              </View>
            )}
            {threads.length === 0 ? (
              <Text style={styles.noThreads}>No messages yet.</Text>
            ) : (
              threads.map((t) => (
                <Pressable
                  key={t._id}
                  style={styles.threadRow}
                  onPress={() =>
                    navigation.navigate('WishlistThreadChat', {
                      threadId: t._id,
                      itemTitle: item.title,
                      peerName: t.helperDisplayName || 'Reader',
                      peerAvatarUrl: t.helperAvatarUrl,
                    })
                  }
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={22} color={lead} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.threadName}>{t.helperDisplayName || 'Reader'}</Text>
                    <Text style={styles.threadHint}>Tap to open chat</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={warmHaze} />
                </Pressable>
              ))
            )}
          </View>
        ) : null}

        {canOffer ? (
          <View style={{ gap: 12 }}>
            <Pressable style={[styles.primaryBtn, cardShadow]} onPress={() => void startChat()} disabled={busy}>
              {busy ? <ActivityIndicator color={lead} /> : <Text style={styles.primaryBtnTxt}>Message & offer this book</Text>}
            </Pressable>
            <Text style={styles.hint}>
              Start a private chat with the person who wants it. You can coordinate a handoff and set a meet-up right
              from the chat.
            </Text>
          </View>
        ) : null}

        {!userId ? (
          <Text style={styles.hint}>Sign in to message someone about a wanted book.</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

function urgencyStyle(u: WishlistItem['urgency']) {
  if (u === 'high') return { color: '#b3261e', bg: '#fcebeb' };
  if (u === 'medium') return { color: '#854f0b', bg: '#faeeda' };
  return { color: '#27500a', bg: '#eaf3de' };
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: cascadingWhite },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 8 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 88 },
  backText: { fontSize: 15, fontWeight: '600', color: lead },
  screenTitle: { fontSize: 17, fontWeight: '800', color: lead },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },
  photo: { width: '100%', height: 200, borderRadius: 16, backgroundColor: '#eee' },
  title: { fontSize: 24, fontWeight: '800', color: lead, letterSpacing: -0.3 },
  meta: { fontSize: 15, color: textSecondary, lineHeight: 22 },
  desc: { fontSize: 14, color: textSecondary, lineHeight: 21 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  label: { fontSize: 14, color: warmHaze, fontWeight: '700' },
  value: { fontSize: 15, fontWeight: '700', color: lead, flex: 1, textAlign: 'right' },
  badge: { fontSize: 13, fontWeight: '800', textTransform: 'capitalize', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, overflow: 'hidden' },
  card: {
    marginTop: 8,
    borderRadius: 20,
    padding: 16,
    backgroundColor: cascadingWhite,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    gap: 12,
  },
  cardTitle: { fontSize: 17, fontWeight: '800', color: lead },
  cardBody: { fontSize: 14, color: textSecondary, lineHeight: 20 },
  ownerActionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f3f3f5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  secondaryBtnTxt: { fontSize: 14, fontWeight: '800', color: lead },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fdeaea',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e8bcbc',
  },
  deleteBtnTxt: { fontSize: 14, fontWeight: '800', color: '#7a2e2e' },
  closed: { fontSize: 14, color: warmHaze, fontWeight: '600', flex: 1 },
  noThreads: { fontSize: 14, color: warmHaze },
  threadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: dreamland,
  },
  threadName: { fontSize: 16, fontWeight: '800', color: lead },
  threadHint: { fontSize: 12, color: warmHaze, marginTop: 2 },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: crunch,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  primaryBtnTxt: { fontSize: 16, fontWeight: '800', color: lead },
  hint: { fontSize: 13, color: textSecondary, lineHeight: 19 },
  error: { color: '#b3261e', padding: 20 },
});
