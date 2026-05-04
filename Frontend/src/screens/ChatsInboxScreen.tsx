import { useCallback, useEffect, useMemo, useState } from 'react';
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
  themeInboxTabActiveBg,
  themeInboxTabInactiveBg,
  themeInboxTopBorder,
  themeMuted,
  themePageBg,
  themePrimary,
  themeInk,
} from '../theme/courseTheme';
import { textSecondary } from '../theme/colors';
import { font } from '../theme/typography';

type ExchangeInboxTab = 'sent' | 'received';

type InboxChatExchange = {
  kind: 'exchange';
  /** Present when `kind` is `exchange`; omitted on older API responses (treated as received). */
  exchangeRole?: 'sent' | 'received';
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

function sortChatsDescending(a: InboxChat, b: InboxChat) {
  return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
}

export function ChatsInboxScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isSignedIn, userId } = useAuth();
  const [chats, setChats] = useState<InboxChat[]>([]);
  const [exchangeTab, setExchangeTab] = useState<ExchangeInboxTab>('received');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setSearch('');
  }, [exchangeTab]);

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

  const exchangeForTab = useMemo(
    () =>
      sortedExchange.filter((c) => {
        const role = c.exchangeRole ?? 'received';
        return exchangeTab === 'sent' ? role === 'sent' : role === 'received';
      }),
    [sortedExchange, exchangeTab]
  );

  const filteredExchange = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return exchangeForTab;
    return exchangeForTab.filter((c) =>
      `${c.peerName} ${c.preview} ${c.bookTitle}`.toLowerCase().includes(q)
    );
  }, [exchangeForTab, search]);

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
        Exchange · inbox
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
        <View style={styles.tabsRow}>
          <Pressable
            onPress={() => setExchangeTab('received')}
            style={[styles.tabChip, exchangeTab === 'received' && styles.tabChipActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: exchangeTab === 'received' }}
          >
            <Text
              style={[
                styles.tabChipTxt,
                { fontFamily: exchangeTab === 'received' ? font.semi : font.medium },
                exchangeTab === 'received' && styles.tabChipTxtActive,
              ]}
            >
              Received
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setExchangeTab('sent')}
            style={[styles.tabChip, exchangeTab === 'sent' && styles.tabChipActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: exchangeTab === 'sent' }}
          >
            <Text
              style={[
                styles.tabChipTxt,
                { fontFamily: exchangeTab === 'sent' ? font.semi : font.medium },
                exchangeTab === 'sent' && styles.tabChipTxtActive,
              ]}
            >
              Sent
            </Text>
          </Pressable>
        </View>

        <View style={styles.searchShell}>
          <Ionicons name="search-outline" size={20} color={themePrimary} style={{ opacity: 0.55 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or book..."
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
            {exchangeForTab.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyBody, { fontFamily: font.regular }]}>
                  {exchangeTab === 'sent'
                    ? 'No threads yet for requests you sent. Browse listings and send an exchange offer to start a conversation.'
                    : 'No chats from readers requesting your listings. When someone swaps on your books, conversations land here.'}
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
                  title={c.peerName}
                  preview={c.preview}
                  lastMessageSenderClerkUserId={c.lastMessageSenderClerkUserId}
                  peerNameForPrefix={c.peerName}
                  myUserId={userId}
                  dateIso={c.lastAt}
                  imageUrl={c.peerAvatarUrl}
                  fallbackLetter={c.peerName || '?'}
                  onPress={() => openExchangeChat(c)}
                  contextHint={truncateHint(c.bookTitle, 40)}
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
  tabsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  tabChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    backgroundColor: themeInboxTabInactiveBg,
  },
  tabChipActive: {
    backgroundColor: themeInboxTabActiveBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: themePrimary,
  },
  tabChipTxt: {
    fontSize: 14,
    color: themeMuted,
  },
  tabChipTxtActive: {
    color: themePrimary,
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
