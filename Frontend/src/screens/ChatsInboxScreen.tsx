import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import {
  themeCard,
  themeInboxSearchBorder,
  themeInboxTopBorder,
  themeMuted,
  themePageBg,
  themePrimary,
  themeInk,
} from '../theme/courseTheme';
import { textSecondary } from '../theme/colors';
import { font } from '../theme/typography';

type InboxChatExchange = {
  kind: 'exchange';
  /** You listed the book (`received`) vs you requested someone else's (`sent`). */
  exchangeRole?: 'sent' | 'received';
  requestId: string;
  bookTitle: string;
  peerName: string;
  peerAvatarUrl?: string;
  preview: string;
  lastAt: string;
  status: string;
  lastMessageSenderClerkUserId?: string | null;
  unreadCount?: number;
};

type InboxChatWishlist = {
  kind: 'wishlist';
  wishlistRole?: 'poster' | 'helper';
  threadId: string;
  itemTitle: string;
  peerName: string;
  peerAvatarUrl?: string;
  preview: string;
  lastAt: string;
  lastMessageSenderClerkUserId?: string | null;
  unreadCount?: number;
};

type InboxChat = InboxChatExchange | InboxChatWishlist;

type Props = NativeStackScreenProps<RequestsStackParamList, 'ChatsInbox'>;

function sortChatsDescending(a: InboxChat, b: InboxChat) {
  return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
}

export function ChatsInboxScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isSignedIn, userId } = useAuth();
  const [chats, setChats] = useState<InboxChat[]>([]);
  const [loading, setLoading] = useState(false);
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

  const sortedExchange = useMemo(
    () =>
      [...chats]
        .filter((c): c is InboxChatExchange => c.kind === 'exchange')
        .sort((a, b) => sortChatsDescending(a, b)),
    [chats]
  );

  const filteredExchange = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedExchange;
    return sortedExchange.filter((c) =>
      `${c.peerName} ${c.preview} ${c.bookTitle}`.toLowerCase().includes(q)
    );
  }, [sortedExchange, search]);

  const openExchangeChat = useCallback(
    (c: InboxChatExchange) => {
      navigation.navigate('RequestChat', {
        requestId: c.requestId,
        bookTitle: c.bookTitle,
        peerName: c.peerName,
        peerAvatarUrl: c.peerAvatarUrl,
      });
    },
    [navigation]
  );

  const headerGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('RequestsHome');
  }, [navigation]);

  const topPad = Math.max(insets.top, 10);

  const headerRow = (
    <View style={[styles.topBar, { paddingTop: topPad }]}>
      <Pressable
        style={styles.iconBtn}
        onPress={headerGoBack}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={26} color={themeInk} />
      </Pressable>
      <Text style={[styles.screenTitle, { fontFamily: font.bold }]} numberOfLines={1}>
        Swap chats
      </Text>
      <Pressable
        style={styles.iconBtn}
        onPress={() => void load()}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Refresh messages"
        disabled={loading}
      >
        <Ionicons name="refresh" size={22} color={loading ? themeMuted : themeInk} />
      </Pressable>
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
          <Pressable
            style={styles.boardLink}
            onPress={() => navigation.navigate('RequestsHome')}
            accessibilityRole="button"
          >
            <Ionicons name="swap-horizontal-outline" size={18} color={themePrimary} />
            <Text style={[styles.boardLinkTxt, styles.boardLinkTxtExchange, { fontFamily: font.semi }]}>
              Open exchange requests
            </Text>
          </Pressable>
          <SignInGateCard
            title="Sign in to see messages"
            message="Sign in with Google to open swap threads here. Wanted-book chats are on the Wanted tab."
            icon="chatbubbles-outline"
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {headerRow}
      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.searchShell}>
          <Ionicons name="search-outline" size={20} color={themePrimary} style={{ opacity: 0.55 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by book title, name, or message…"
            placeholderTextColor={themeMuted}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>

        <Pressable
          style={styles.boardLinkRow}
          onPress={() => navigation.navigate('RequestsHome')}
          accessibilityRole="button"
        >
          <Ionicons name="swap-horizontal-outline" size={18} color={themePrimary} />
          <Text style={[styles.boardLinkTxt, styles.boardLinkTxtExchange, { fontFamily: font.semi }]}>
            Exchange books board
          </Text>
          <Ionicons name="chevron-forward" size={16} color={themePrimary} />
        </Pressable>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 28 }} color={themePrimary} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <ScrollView
            style={styles.listFlex}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
          >
            {sortedExchange.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyBody, { fontFamily: font.regular }]}>
                  No swap threads yet. When you send or receive an exchange request, chats for that book appear here
                  together — each row uses the book title.
                </Text>
              </View>
            ) : filteredExchange.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyTitle, { fontFamily: font.bold }]}>No results</Text>
                <Text style={[styles.emptyBody, styles.emptySubtitle, { fontFamily: font.regular }]}>
                  Try another name or book title.
                </Text>
              </View>
            ) : (
              filteredExchange.map((c) => (
                <ChatListRow
                  key={c.requestId}
                  variant="inbox"
                  title={c.bookTitle || 'Book'}
                  preview={c.preview}
                  lastMessageSenderClerkUserId={c.lastMessageSenderClerkUserId}
                  peerNameForPrefix={c.peerName}
                  myUserId={userId}
                  dateIso={c.lastAt}
                  imageUrl={c.peerAvatarUrl}
                  fallbackLetter={(c.bookTitle || '?').trim().slice(0, 1).toUpperCase() || '?'}
                  onPress={() => openExchangeChat(c)}
                />
              ))
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: themePageBg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: themeInboxTopBorder,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    color: themeInk,
    letterSpacing: -0.3,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: themeCard,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: themeInboxSearchBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: font.regular,
    color: themeInk,
    padding: 0,
  },
  boardLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  boardLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  boardLinkTxt: {
    fontSize: 14,
  },
  boardLinkTxtExchange: {
    color: themePrimary,
  },
  signedOutScroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  listFlex: { flex: 1 },
  listContent: { paddingBottom: 40, flexGrow: 1 },
  emptyWrap: {
    paddingVertical: 28,
    paddingHorizontal: 12,
  },
  emptyTitle: {
    fontSize: 17,
    color: themeInk,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    marginTop: 0,
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 22,
    color: textSecondary,
    textAlign: 'center',
  },
  error: { color: '#b3261e', marginTop: 16, fontSize: 14, fontFamily: font.regular },
});
