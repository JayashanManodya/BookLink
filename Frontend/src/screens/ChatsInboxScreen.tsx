import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatListRow } from '../components/ChatListRow';
import { SignInGateCard } from '../components/SignInGateCard';
import { api, apiErrorMessage } from '../lib/api';
import type { RequestsStackParamList } from '../navigation/requestsStackTypes';
import { themeGreen, themeMuted, themeNavMintBorder } from '../theme/courseTheme';
import { lead, textSecondary } from '../theme/colors';
import { font } from '../theme/typography';

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

type ActivePeer = {
  key: string;
  firstName: string;
  avatarUrl?: string;
  chat: InboxChat;
};

function truncateHint(s: string, max: number) {
  const t = s.trim();
  if (!t) return '';
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

function sortChatsDescending(a: InboxChat, b: InboxChat) {
  return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
}

function firstNameOnly(name: string) {
  const t = name.trim();
  if (!t) return '?';
  return t.split(/\s+/)[0] ?? t;
}

function buildActivePeers(chatsSorted: InboxChat[]): ActivePeer[] {
  const seen = new Set<string>();
  const list: ActivePeer[] = [];
  for (const c of chatsSorted) {
    const key = `${c.peerName.trim().toLowerCase()}|${c.peerAvatarUrl ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    list.push({
      key,
      firstName: firstNameOnly(c.peerName),
      avatarUrl: c.peerAvatarUrl,
      chat: c,
    });
    if (list.length >= 24) break;
  }
  return list;
}

export function ChatsInboxScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isSignedIn, userId } = useAuth();
  const [chats, setChats] = useState<InboxChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ chats: InboxChat[] }>('/api/chats/inbox');
      setChats(res.data.chats ?? []);
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Could not load messages'));
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useFocusEffect(
    useCallback(() => {
      if (isSignedIn) void load();
    }, [isSignedIn, load])
  );

  const sortedChats = useMemo(() => [...chats].sort(sortChatsDescending), [chats]);

  const filteredChats = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedChats;
    return sortedChats.filter((c) => {
      const blob =
        c.kind === 'exchange'
          ? `${c.peerName} ${c.preview} ${c.bookTitle}`
          : `${c.peerName} ${c.preview} ${c.itemTitle}`;
      return blob.toLowerCase().includes(q);
    });
  }, [sortedChats, search]);

  const activePeers = useMemo(() => buildActivePeers(filteredChats), [filteredChats]);

  const openChat = useCallback(
    (c: InboxChat) => {
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
    },
    [navigation]
  );

  const headerRow = (
    <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 10) }]}>
      <Pressable
        style={styles.iconBtn}
        onPress={() => navigation.navigate('RequestsHome')}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Open exchange requests"
      >
        <Ionicons name="menu-outline" size={28} color={lead} />
      </Pressable>
      <Pressable
        style={styles.bellWrap}
        onPress={() => navigation.navigate('RequestsHome')}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Activity and offers"
      >
        <Ionicons name="notifications-outline" size={26} color={lead} />
        {chats.length > 0 ? <View style={styles.bellDot} /> : null}
      </Pressable>
    </View>
  );

  const searchBar = (
    <View style={styles.searchShell}>
      <Ionicons name="search-outline" size={20} color={themeMuted} />
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search anything..."
        placeholderTextColor={themeMuted}
        style={styles.searchInput}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
      />
    </View>
  );

  if (!isSignedIn) {
    return (
      <View style={styles.screen}>
        {headerRow}
        <ScrollView
          contentContainerStyle={[styles.signedOutScroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.sectionHeading, styles.gateTitle]}>Exchange</Text>
          <Text style={styles.gateSub}>Sign in to coordinate swaps with readers and listers.</Text>
          <SignInGateCard
            title="Sign in for exchange messages"
            message="Connect with Google to open your exchange and wanted-book threads."
            icon="chatbubbles-outline"
          />
        </ScrollView>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        {headerRow}
        <View style={styles.searchPad}>{searchBar}</View>
        <ActivityIndicator style={{ marginTop: 32 }} color={themeGreen} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        {headerRow}
        <View style={styles.searchPad}>{searchBar}</View>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={filteredChats}
        keyExtractor={(c) => (c.kind === 'exchange' ? `e-${c.requestId}` : `w-${c.threadId}`)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        renderItem={({ item: c }) => (
          <ChatListRow
            variant="inbox"
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
                : `${truncateHint(c.itemTitle, 36)} · Wanted`
            }
          />
        )}
        ListHeaderComponent={
          <View>
            {headerRow}
            <View style={styles.searchPad}>{searchBar}</View>
            {activePeers.length > 0 ? (
              <>
                <Text style={[styles.sectionHeading, styles.horizontalPad]}>Active</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.activeStrip}
                >
                  {activePeers.map((p) => (
                    <Pressable key={p.key} style={styles.activeCell} onPress={() => openChat(p.chat)}>
                      <View style={[styles.activeRing, { borderColor: themeNavMintBorder }]}>
                        {p.avatarUrl ? (
                          <Image source={{ uri: p.avatarUrl }} style={styles.activeAvatar} />
                        ) : (
                          <View style={[styles.activeAvatar, styles.activeAvatarPh]}>
                            <Text style={styles.activeAvatarLetter}>{p.firstName.slice(0, 1).toUpperCase()}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.activeName} numberOfLines={1}>
                        {p.firstName}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}
            <Text style={[styles.sectionHeading, styles.horizontalPad, styles.messageHeading]}>Message</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            {search.trim() ? (
              <>
                <Text style={styles.emptyTitle}>No results</Text>
                <Text style={styles.emptySub}>Try another name or phrase.</Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyTitle}>No conversations yet</Text>
                <Text style={styles.emptySub}>
                  Send an exchange request or message someone from the wanted books board.
                </Text>
              </>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  iconBtn: {
    padding: 4,
  },
  bellWrap: {
    padding: 4,
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 4,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: themeGreen,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  searchPad: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F4F4F6',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: font.regular,
    color: lead,
    padding: 0,
  },
  sectionHeading: {
    fontSize: 18,
    fontFamily: font.bold,
    color: lead,
    letterSpacing: -0.3,
  },
  horizontalPad: {
    paddingHorizontal: 20,
  },
  messageHeading: {
    marginTop: 22,
    marginBottom: 6,
  },
  activeStrip: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 16,
  },
  activeCell: {
    alignItems: 'center',
    width: 72,
  },
  activeRing: {
    padding: 2,
    borderRadius: 999,
    borderWidth: 2,
  },
  activeAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#E8E8EC',
  },
  activeAvatarPh: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeAvatarLetter: {
    fontSize: 22,
    fontFamily: font.bold,
    color: lead,
  },
  activeName: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: font.semi,
    color: lead,
    textAlign: 'center',
    maxWidth: 72,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  emptyWrap: {
    paddingHorizontal: 8,
    paddingTop: 36,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: font.bold,
    color: lead,
  },
  emptySub: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: font.regular,
    color: textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 280,
  },
  error: {
    color: '#b3261e',
    marginTop: 16,
    paddingHorizontal: 20,
    fontSize: 14,
    fontFamily: font.regular,
  },
  signedOutScroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  gateTitle: {
    marginBottom: 6,
  },
  gateSub: {
    fontSize: 14,
    fontFamily: font.regular,
    color: textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
});
