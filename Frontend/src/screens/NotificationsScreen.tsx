import { useCallback, useMemo, useState } from 'react';
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
import { ChatListRow } from '../components/ChatListRow';
import { SignInGateCard } from '../components/SignInGateCard';
import { api, apiErrorMessage } from '../lib/api';
import type { BrowseStackParamList } from '../navigation/browseStackTypes';
import { themeMuted, themePageBg, themeInk, themePrimary, themeInboxTopBorder } from '../theme/courseTheme';
import { textSecondary } from '../theme/colors';
import { font } from '../theme/typography';

type NotificationExchange = {
  kind: 'exchange';
  wishlistRole?: undefined;
  requestId: string;
  bookTitle: string;
  peerName: string;
  peerAvatarUrl?: string;
  preview: string;
  lastAt: string;
  lastMessageSenderClerkUserId?: string | null;
  unreadCount: number;
};

type NotificationWishlist = {
  kind: 'wishlist';
  wishlistRole: 'poster' | 'helper';
  threadId: string;
  itemTitle: string;
  peerName: string;
  peerAvatarUrl?: string;
  preview: string;
  lastAt: string;
  lastMessageSenderClerkUserId?: string | null;
  unreadCount: number;
};

type NotificationChat = NotificationExchange | NotificationWishlist;

type Props = NativeStackScreenProps<BrowseStackParamList, 'Notifications'>;

function sortDesc(a: NotificationChat, b: NotificationChat) {
  return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
}

export function NotificationsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isSignedIn, userId } = useAuth();
  const [chats, setChats] = useState<NotificationChat[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ chats: NotificationChat[]; totalUnread: number }>('/api/chats/notifications');
      setChats(res.data.chats ?? []);
      setTotalUnread(res.data.totalUnread ?? 0);
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Could not load notifications'));
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useFocusEffect(
    useCallback(() => {
      if (isSignedIn) void load();
    }, [isSignedIn, load])
  );

  const exchangeUnread = useMemo(
    () => chats.filter((c): c is NotificationExchange => c.kind === 'exchange').sort(sortDesc),
    [chats]
  );
  const mineWishlistUnread = useMemo(
    () =>
      chats
        .filter((c): c is NotificationWishlist => c.kind === 'wishlist' && c.wishlistRole === 'poster')
        .sort(sortDesc),
    [chats]
  );
  const helpWishlistUnread = useMemo(
    () =>
      chats
        .filter((c): c is NotificationWishlist => c.kind === 'wishlist' && c.wishlistRole === 'helper')
        .sort(sortDesc),
    [chats]
  );

  const openExchange = useCallback(
    (c: NotificationExchange) => {
      navigation.getParent()?.navigate('Requests', {
        screen: 'RequestChat',
        params: {
          requestId: c.requestId,
          bookTitle: c.bookTitle,
          peerName: c.peerName,
          peerAvatarUrl: c.peerAvatarUrl,
        },
      });
    },
    [navigation]
  );

  const openWishlist = useCallback(
    (c: NotificationWishlist) => {
      navigation.getParent()?.navigate('Wishlist', {
        screen: 'WishlistThreadChat',
        params: {
          threadId: c.threadId,
          itemTitle: c.itemTitle,
          peerName: c.peerName,
          peerAvatarUrl: c.peerAvatarUrl,
        },
      });
    },
    [navigation]
  );

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
        <Ionicons name="chevron-back" size={26} color={themeInk} />
      </Pressable>
      <Text style={[styles.screenTitle, { fontFamily: font.bold }]} numberOfLines={1}>
        Notifications
      </Text>
      <Pressable
        style={styles.iconBtn}
        onPress={() => void load()}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Refresh notifications"
        disabled={loading}
      >
        <Ionicons name="refresh" size={22} color={loading ? themeMuted : themeInk} />
      </Pressable>
    </View>
  );

  const renderSection = (title: string, rows: NotificationChat[], keyPrefix: string) => {
    if (!rows.length) return null;
    return (
      <View style={styles.section} key={keyPrefix}>
        <Text style={[styles.sectionTitle, { fontFamily: font.semi }]}>{title}</Text>
        {rows.map((c) => {
          if (c.kind === 'exchange') {
            return (
              <ChatListRow
                key={`${keyPrefix}-ex-${c.requestId}`}
                variant="inbox"
                title={c.bookTitle || 'Book'}
                preview={c.preview}
                lastMessageSenderClerkUserId={c.lastMessageSenderClerkUserId}
                peerNameForPrefix={c.peerName}
                myUserId={userId}
                dateIso={c.lastAt}
                imageUrl={c.peerAvatarUrl}
                fallbackLetter={(c.bookTitle || '?').trim().slice(0, 1).toUpperCase() || '?'}
                unreadBadgeCount={c.unreadCount}
                onPress={() => openExchange(c)}
              />
            );
          }
          return (
            <ChatListRow
              key={`${keyPrefix}-wl-${c.threadId}`}
              variant="inbox"
              title={c.peerName || 'Reader'}
              preview={c.preview}
              lastMessageSenderClerkUserId={c.lastMessageSenderClerkUserId}
              peerNameForPrefix={c.peerName}
              myUserId={userId}
              dateIso={c.lastAt}
              imageUrl={c.peerAvatarUrl}
              fallbackLetter={(c.peerName || '?').trim().slice(0, 1).toUpperCase() || '?'}
              contextHint={c.itemTitle}
              unreadBadgeCount={c.unreadCount}
              onPress={() => openWishlist(c)}
            />
          );
        })}
      </View>
    );
  };

  if (!isSignedIn) {
    return (
      <View style={styles.screen}>
        {headerRow}
        <ScrollView
          contentContainerStyle={[styles.signedOutScroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <SignInGateCard
            title="Sign in for chat alerts"
            message="Sign in to see unread swap threads and wanted-book messages in one place."
            icon="notifications-outline"
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {headerRow}
      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        {totalUnread > 0 ? (
          <Text style={[styles.summary, { fontFamily: font.regular }]}>
            {totalUnread > 99 ? '99+' : totalUnread} unread message{totalUnread === 1 ? '' : 's'} across your inboxes
          </Text>
        ) : (
          <Text style={[styles.summaryMuted, { fontFamily: font.regular }]}>You are all caught up.</Text>
        )}

        {loading ? (
          <ActivityIndicator style={{ marginTop: 28 }} color={themePrimary} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : chats.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyBody, { fontFamily: font.regular }]}>
              No unread chats. When someone messages you on Swap or Wanted books, it will show here.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.listFlex}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
          >
            {renderSection('Swap chats', exchangeUnread, 'ex')}
            {renderSection('Wanted books · yours', mineWishlistUnread, 'mine')}
            {renderSection('Wanted books · helping others', helpWishlistUnread, 'help')}
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
  summary: {
    fontSize: 14,
    color: themeInk,
    marginBottom: 12,
  },
  summaryMuted: {
    fontSize: 14,
    color: themeMuted,
    marginBottom: 12,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    color: themeMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 4,
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
