import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, apiErrorMessage } from '../lib/api';
import { SignInGateCard } from '../components/SignInGateCard';
import { ChatListRow } from '../components/ChatListRow';
import type { WishlistStackParamList } from '../navigation/wishlistStackTypes';
import { themeGreen, themeMuted, themeNavMint, themeNavMintBorder } from '../theme/courseTheme';
import { lead, textSecondary } from '../theme/colors';
import { font } from '../theme/typography';

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
      setError(apiErrorMessage(e, 'Could not load messages'));
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

  const topPad = Math.max(insets.top, 10);

  const headerRow = (
    <View style={[styles.topBar, { paddingTop: topPad }]}>
      <Pressable
        style={styles.iconBtn}
        onPress={() => navigation.goBack()}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={26} color={lead} />
      </Pressable>
      <Text style={[styles.screenTitle, { fontFamily: font.bold }]} numberOfLines={1}>
        Wanted books · inbox
      </Text>
      <Pressable
        style={styles.iconBtn}
        onPress={() => void load()}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Refresh messages"
        disabled={loading}
      >
        <Ionicons name="refresh" size={22} color={loading ? themeMuted : lead} />
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
            onPress={() => navigation.navigate('WishlistBoard')}
            accessibilityRole="button"
          >
            <Ionicons name="book-outline" size={18} color={themeGreen} />
            <Text style={[styles.boardLinkTxt, { fontFamily: font.semi }]}>Open wanted books board</Text>
          </Pressable>
          <SignInGateCard
            title="Sign in to see messages"
            message="Use Google to view threads on your wanted posts and ones you joined."
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
            onPress={() => setTab('poster')}
            style={[styles.tabChip, tab === 'poster' && styles.tabChipActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'poster' }}
          >
            <Text
              style={[
                styles.tabChipTxt,
                { fontFamily: tab === 'poster' ? font.semi : font.medium },
                tab === 'poster' && styles.tabChipTxtActive,
              ]}
            >
              My posts
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('helper')}
            style={[styles.tabChip, tab === 'helper' && styles.tabChipActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'helper' }}
          >
            <Text
              style={[
                styles.tabChipTxt,
                { fontFamily: tab === 'helper' ? font.semi : font.medium },
                tab === 'helper' && styles.tabChipTxtActive,
              ]}
            >
              Helping
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.boardLinkRow}
          onPress={() => navigation.navigate('WishlistBoard')}
          accessibilityRole="button"
        >
          <Ionicons name="book-outline" size={18} color={themeGreen} />
          <Text style={[styles.boardLinkTxt, { fontFamily: font.semi }]}>Wanted books board</Text>
          <Ionicons name="chevron-forward" size={16} color={themeMuted} />
        </Pressable>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 28 }} color={themeGreen} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <ScrollView
            style={styles.listFlex}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator
          >
            {chats.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyBody, { fontFamily: font.regular }]}>
                  {tab === 'poster'
                    ? 'No messages yet on your wanted posts. When someone reaches out, it will show here.'
                    : 'No threads yet where you offered a book. Open a wanted post and tap to send a message.'}
                </Text>
              </View>
            ) : (
              chats.map((c) => (
                <ChatListRow
                  key={c.threadId}
                  variant="inbox"
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
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ECECEC',
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
    color: lead,
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
    backgroundColor: '#F4F4F6',
  },
  tabChipActive: {
    backgroundColor: themeNavMint,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: themeNavMintBorder,
  },
  tabChipTxt: {
    fontSize: 14,
    color: themeMuted,
  },
  tabChipTxtActive: {
    color: themeGreen,
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
    color: themeGreen,
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
  emptyBody: {
    fontSize: 15,
    lineHeight: 22,
    color: textSecondary,
    textAlign: 'center',
  },
  error: { color: '#b3261e', marginTop: 16, fontSize: 14, fontFamily: font.regular },
});
