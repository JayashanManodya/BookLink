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
import type { WishlistStackParamList } from '../navigation/wishlistStackTypes';
import { cascadingWhite, chineseSilver, crunch, dreamland, lead, textSecondary, warmHaze } from '../theme/colors';
import { cardShadow } from '../theme/shadows';

type TabKey = 'poster' | 'helper';

type WishlistChatRow = {
  threadId: string;
  itemTitle: string;
  peerName: string;
  peerAvatarUrl?: string;
  preview: string;
  lastAt: string;
  lastMessageSenderClerkUserId?: string | null;
};

type Props = NativeStackScreenProps<WishlistStackParamList, 'WishlistChats'>;

function truncateHint(s: string, max: number) {
  const t = s.trim();
  if (!t) return '';
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

export function WishlistChatsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isSignedIn, userId } = useAuth();
  const [tab, setTab] = useState<TabKey>('poster');
  const [chats, setChats] = useState<WishlistChatRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ chats: WishlistChatRow[] }>('/api/wishlist/my-chats', {
        params: { role: tab },
      });
      setChats(res.data.chats ?? []);
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Could not load chats'));
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, tab]);

  useFocusEffect(
    useCallback(() => {
      if (isSignedIn) void load();
    }, [isSignedIn, load])
  );

  const openThread = (c: WishlistChatRow) => {
    navigation.navigate('WishlistThreadChat', {
      threadId: c.threadId,
      itemTitle: c.itemTitle,
      peerName: c.peerName,
      peerAvatarUrl: c.peerAvatarUrl,
    });
  };

  if (!isSignedIn) {
    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.scroll, { paddingTop: Math.max(insets.top, 8) + 8 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Wishlist chats</Text>
        <Text style={styles.subtitle}>Conversations about wanted books.</Text>
        <SignInGateCard
          title="Sign in to see chats"
          message="Use Google to view threads on your posts and ones you joined."
          icon="chatbubbles-outline"
        />
      </ScrollView>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 8) + 8 }]}>
      <View style={styles.headerPad}>
        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Wishlist chats</Text>
            <Text style={styles.subtitle}>Threads on your wanted posts and ones you replied to.</Text>
          </View>
          <Pressable style={styles.boardPill} onPress={() => navigation.navigate('WishlistBoard')} hitSlop={6}>
            <Ionicons name="heart-outline" size={18} color={lead} />
            <Text style={styles.boardPillTxt}>Board</Text>
          </Pressable>
          <Pressable onPress={() => void load()} style={styles.iconBtn} hitSlop={8} disabled={loading}>
            <Ionicons name="refresh" size={22} color={lead} />
          </Pressable>
        </View>

        <View style={styles.tabs}>
          <Pressable onPress={() => setTab('poster')} style={[styles.tab, tab === 'poster' && styles.tabOn]}>
            <Text style={[styles.tabText, tab === 'poster' && styles.tabTextOn]}>My posts</Text>
          </Pressable>
          <Pressable onPress={() => setTab('helper')} style={[styles.tab, tab === 'helper' && styles.tabOn]}>
            <Text style={[styles.tabText, tab === 'helper' && styles.tabTextOn]}>Helping</Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={crunch} />
      ) : error ? (
        <Text style={[styles.error, styles.headerPad]}>{error}</Text>
      ) : (
        <ScrollView
          style={styles.listFlex}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator
        >
          {chats.length === 0 ? (
            <View style={[styles.card, cardShadow, styles.headerPad]}>
              <Text style={styles.body}>
                {tab === 'poster'
                  ? 'No chats yet on your wanted posts. When someone messages you, it will show here.'
                  : 'No threads yet where you offered a book. Open a wanted post and tap to start a chat.'}
              </Text>
            </View>
          ) : (
            chats.map((c) => (
              <ChatListRow
                key={c.threadId}
                title={c.peerName}
                preview={c.preview}
                lastMessageSenderClerkUserId={c.lastMessageSenderClerkUserId}
                peerNameForPrefix={c.peerName}
                myUserId={userId}
                dateIso={c.lastAt}
                imageUrl={c.peerAvatarUrl}
                fallbackLetter={c.peerName || '?'}
                onPress={() => openThread(c)}
                contextHint={truncateHint(c.itemTitle, 40)}
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
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  title: { fontSize: 28, fontWeight: '800', color: lead, letterSpacing: -0.5 },
  subtitle: { marginTop: 4, fontSize: 15, color: warmHaze, fontWeight: '600', maxWidth: '72%' },
  boardPill: {
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
  boardPillTxt: { fontSize: 14, fontWeight: '800', color: lead },
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
});
