import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, apiErrorMessage } from '../lib/api';
import { SignInGateCard } from '../components/SignInGateCard';
import { ChatListRow } from '../components/ChatListRow';
import type { RequestsStackParamList } from '../navigation/requestsStackTypes';
import { cascadingWhite, chineseSilver, crunch, dreamland, lead, textSecondary, warmHaze } from '../theme/colors';
import { cardShadow } from '../theme/shadows';

type InboxChatExchange = {
  kind: 'exchange';
  requestId: string;
  bookTitle: string;
  peerName: string;
  peerAvatarUrl?: string;
  preview: string;
  lastAt: string;
  status: string;
  lastMessageSenderClerkUserId?: string | null;
};

type InboxChatWishlist = {
  kind: 'wishlist';
  threadId: string;
  itemTitle: string;
  peerName: string;
  peerAvatarUrl?: string;
  preview: string;
  lastAt: string;
  lastMessageSenderClerkUserId?: string | null;
};

type InboxChat = InboxChatExchange | InboxChatWishlist;

type Props = NativeStackScreenProps<RequestsStackParamList, 'ChatsInbox'>;

function truncateHint(s: string, max: number) {
  const t = s.trim();
  if (!t) return '';
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

export function ChatsInboxScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isSignedIn, userId } = useAuth();
  const [chats, setChats] = useState<InboxChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ chats: InboxChat[] }>('/api/chats/inbox');
      setChats(res.data.chats ?? []);
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Could not load chats'));
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useFocusEffect(
    useCallback(() => {
      if (isSignedIn) void load();
    }, [isSignedIn, load])
  );

  const openChat = (c: InboxChat) => {
    if (c.kind === 'exchange') {
      navigation.navigate('RequestChat', {
        requestId: c.requestId,
        bookTitle: c.bookTitle,
        peerName: c.peerName,
        peerAvatarUrl: c.peerAvatarUrl,
      });
      return;
    }
    navigation.getParent()?.navigate('Wishlist', {
      screen: 'WishlistThreadChat',
      params: {
        threadId: c.threadId,
        itemTitle: c.itemTitle,
        peerName: c.peerName,
        peerAvatarUrl: c.peerAvatarUrl,
        returnToChatsInbox: true,
      },
    });
  };

  if (!isSignedIn) {
    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.scroll, { paddingTop: Math.max(insets.top, 8) + 8 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Chats</Text>
        <Text style={styles.subtitle}>Exchange and wishlist messages in one place.</Text>
        <SignInGateCard
          title="Sign in to see chats"
          message="Connect with Google to open your conversation history."
          icon="chatbubbles-outline"
        />
      </ScrollView>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 8) + 8 }]}>
      <View style={styles.headerPad}>
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Chats</Text>
            <Text style={styles.subtitle}>Wishlist & exchange · newest first</Text>
          </View>
          <Pressable style={styles.offersBtn} onPress={() => navigation.navigate('RequestsHome')} hitSlop={6}>
            <Text style={styles.offersBtnTxt}>Offers</Text>
            <Ionicons name="chevron-forward" size={16} color={lead} />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 28 }} color={crunch} />
      ) : error ? (
        <Text style={[styles.error, styles.headerPad]}>{error}</Text>
      ) : (
        <ScrollView
          style={styles.listFlex}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator
        >
          {chats.length === 0 ? (
            <View style={[styles.emptyCard, cardShadow, styles.headerPad]}>
              <Text style={styles.emptyTxt}>No conversations yet.</Text>
              <Text style={styles.emptySub}>Send an exchange request or reply on the wishlist board.</Text>
            </View>
          ) : (
            chats.map((c) => (
              <ChatListRow
                key={c.kind === 'exchange' ? `e-${c.requestId}` : `w-${c.threadId}`}
                title={c.peerName}
                preview={c.preview}
                lastMessageSenderClerkUserId={c.lastMessageSenderClerkUserId}
                peerNameForPrefix={c.peerName}
                myUserId={userId}
                dateIso={c.lastAt}
                imageUrl={c.peerAvatarUrl}
                fallbackLetter={c.peerName || '?'}
                onPress={() => openChat(c)}
                contextHint={
                  c.kind === 'exchange'
                    ? `${truncateHint(c.bookTitle, 36)} · Exchange`
                    : `${truncateHint(c.itemTitle, 36)} · Wishlist`
                }
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: cascadingWhite, paddingBottom: 24 },
  headerPad: { paddingHorizontal: 20 },
  scroll: { paddingBottom: 32, paddingHorizontal: 20 },
  listFlex: { flex: 1 },
  listContent: { paddingBottom: 40, flexGrow: 1 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: lead, letterSpacing: -0.5 },
  subtitle: { marginTop: 4, fontSize: 14, color: warmHaze, fontWeight: '600', maxWidth: 260 },
  offersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: chineseSilver,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    marginTop: 4,
  },
  offersBtnTxt: { fontSize: 14, fontWeight: '800', color: lead },
  emptyCard: {
    marginTop: 12,
    padding: 20,
    borderRadius: 20,
    backgroundColor: cascadingWhite,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  emptyTxt: { fontSize: 16, fontWeight: '800', color: lead },
  emptySub: { marginTop: 8, fontSize: 14, color: textSecondary, lineHeight: 20 },
  error: { color: '#b3261e', marginTop: 16, fontSize: 14 },
});
