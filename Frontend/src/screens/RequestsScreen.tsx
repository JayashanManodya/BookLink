import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
} from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api, apiErrorMessage } from '../lib/api';
import { SignInGateCard } from '../components/SignInGateCard';
import { CourseScreenShell } from '../components/CourseScreenShell';
import type { RequestsStackParamList } from '../navigation/requestsStackTypes';
import { cascadingWhite, textSecondary, themeSurfaceMuted } from '../theme/colors';
import {
  themeGreen,
  themeInk,
  themeOrange,
  themePrimary,
} from '../theme/courseTheme';
import { cardShadow } from '../theme/shadows';
import { font } from '../theme/typography';
import type { ExchangeRequest } from '../types/exchange';

/** Tints/borders derived only from palette (#716EFF, #38A336, #FF8A33, #101011). */
const REQ_SUBTEXT = 'rgba(16,16,17,0.55)';
const REQ_BORDER = 'rgba(16,16,17,0.12)';
const REQ_PURPLE_FILL = 'rgba(113,110,255,0.12)';

type TabKey = 'received' | 'sent';

type Props = NativeStackScreenProps<RequestsStackParamList, 'RequestsHome'>;

function formatRequestTimestamp(iso?: string): { time: string; date: string } {
  if (!iso) return { time: '', date: '' };
  try {
    const d = new Date(iso);
    return {
      time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
      date: d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' }),
    };
  } catch {
    return { time: '', date: '' };
  }
}

function capitalizeWord(s: string) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function relativeListingAge(iso?: string): string {
  if (!iso) return 'Recently';
  try {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    if (diffMs < 0) return 'Recently';
    const days = Math.floor(diffMs / 86400000);
    if (days < 1) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} wk ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export function RequestsScreen({ navigation }: Props) {
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

  useFocusEffect(
    useCallback(() => {
      if (!isSignedIn) return;
      void load();
    }, [isSignedIn, tab, load])
  );

  if (!isSignedIn) {
    return (
      <CourseScreenShell title="Requests" subtitle="Trades & borrows" scroll scrollContentStyle={{ gap: 16 }}>
        <SignInGateCard
          title="Sign in to see requests"
          message="Exchange and borrow requests appear here once you are signed in with Google."
          icon="swap-horizontal-outline"
        />
      </CourseScreenShell>
    );
  }

  return (
    <CourseScreenShell
      title="Requests"
      subtitle="Offers on your books and what you have sent."
      scroll={false}
      headerRight={
        <Pressable style={styles.headerChatsBtn} onPress={() => navigation.navigate('ChatsInbox')} hitSlop={6}>
          <Ionicons name="chatbubbles-outline" size={18} color={cascadingWhite} />
          <Text style={styles.headerChatsTxt}>Inbox</Text>
        </Pressable>
      }
    >
      <View style={styles.signedInBody}>
        <View style={styles.tabsPill}>
          <Pressable
            onPress={() => setTab('received')}
            style={[styles.tabPill, tab === 'received' && styles.tabPillOn]}
          >
            <Text style={[styles.tabPillTxt, tab === 'received' && styles.tabPillTxtOn]}>Received</Text>
          </Pressable>
          <Pressable onPress={() => setTab('sent')} style={[styles.tabPill, tab === 'sent' && styles.tabPillOn]}>
            <Text style={[styles.tabPillTxt, tab === 'sent' && styles.tabPillTxtOn]}>Sent</Text>
          </Pressable>
        </View>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={themePrimary} />
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
              requests.map((r) => {
                const ts = formatRequestTimestamp(r.createdAt);
                const peerLabel =
                  tab === 'received' ? r.requesterDisplayName?.trim() || 'Reader' : r.ownerDisplayName?.trim() || 'Lister';
                const rel = relativeListingAge(r.createdAt);
                return (
                  <Pressable
                    key={r._id}
                    style={({ pressed }) => [styles.compactCard, cardShadow, pressed && styles.compactPressed]}
                    onPress={() => navigation.navigate('ExchangeRequestDetail', { requestId: r._id })}
                    accessibilityRole="button"
                    accessibilityLabel={`${r.bookTitle || 'Book'}, ${capitalizeWord(r.status)}`}
                  >
                    <View style={styles.compactRow}>
                      <View style={styles.compactThumb}>
                        {r.bookCoverImageUrl ? (
                          <Image
                            source={{ uri: r.bookCoverImageUrl }}
                            style={styles.compactThumbImg as ImageStyle}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.compactThumbPh}>
                            <Ionicons name="book-outline" size={28} color={themePrimary} />
                          </View>
                        )}
                      </View>
                      <View style={styles.compactBody}>
                        <Text style={[styles.compactTitle, { fontFamily: font.bold }]} numberOfLines={2}>
                          {r.bookTitle || 'Book'}
                        </Text>
                        <View style={styles.compactMetaRow}>
                          <View style={styles.metaCluster}>
                            <View style={[styles.metaIconBubble, styles.metaIconGreen]}>
                              <Ionicons name="layers-outline" size={13} color={themeGreen} />
                            </View>
                            <Text style={[styles.metaTxt, { fontFamily: font.regular }]} numberOfLines={1}>
                              {peerLabel}
                            </Text>
                          </View>
                          <View style={[styles.metaCluster, styles.metaClusterRight]}>
                            <View style={[styles.metaIconBubble, styles.metaIconPurple]}>
                              <Ionicons name="time-outline" size={13} color={themePrimary} />
                            </View>
                            <Text style={[styles.metaTxt, { fontFamily: font.regular }]} numberOfLines={1}>
                              {rel}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.compactBottomRow}>
                          <Text style={[styles.compactStatusAccent, { fontFamily: font.bold }]}>
                            {capitalizeWord(r.status)}
                          </Text>
                          <View style={styles.compactTsCol}>
                            <Text style={[styles.compactTime, { fontFamily: font.regular }]}>{ts.time || '—'}</Text>
                            {ts.date ? (
                              <Text style={[styles.compactDate, { fontFamily: font.regular }]}>{ts.date}</Text>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        )}
      </View>
    </CourseScreenShell>
  );
}

const styles = StyleSheet.create({
  signedInBody: { flex: 1 },
  headerChatsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.4)',
    marginBottom: 2,
  },
  headerChatsTxt: { fontSize: 14, fontWeight: '800', color: cascadingWhite },
  tabsPill: {
    flexDirection: 'row',
    backgroundColor: themeSurfaceMuted,
    borderRadius: 14,
    padding: 4,
    gap: 4,
    marginBottom: 4,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  tabPillOn: { backgroundColor: themePrimary },
  tabPillTxt: { fontSize: 14, fontWeight: '700', color: textSecondary },
  tabPillTxtOn: { color: cascadingWhite, fontWeight: '800' },
  list: { paddingBottom: Math.max(32, 12), gap: 14, marginTop: 14, flexGrow: 1 },
  card: {
    marginTop: 4,
    backgroundColor: cascadingWhite,
    borderRadius: 24,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: REQ_BORDER,
  },
  body: { fontSize: 15, lineHeight: 22, color: REQ_SUBTEXT },
  error: { color: themeOrange, marginTop: 12 },
  compactCard: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: cascadingWhite,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: REQ_BORDER,
  },
  compactPressed: { opacity: 0.94 },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
  },
  compactThumb: {
    width: 72,
    height: 72,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: REQ_PURPLE_FILL,
    flexShrink: 0,
  },
  compactThumbImg: { width: '100%', height: '100%' },
  compactThumbPh: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: REQ_PURPLE_FILL,
  },
  compactBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  compactTitle: {
    fontSize: 16,
    color: themeInk,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  compactMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  metaCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  metaClusterRight: {
    flex: 0,
    flexShrink: 0,
    maxWidth: '48%',
  },
  metaIconBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaIconGreen: { backgroundColor: 'rgba(56,163,54,0.18)' },
  metaIconPurple: { backgroundColor: 'rgba(113,110,255,0.18)' },
  metaTxt: {
    flexShrink: 1,
    fontSize: 12,
    color: REQ_SUBTEXT,
    lineHeight: 16,
  },
  compactBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
  },
  compactStatusAccent: {
    fontSize: 15,
    color: themePrimary,
    letterSpacing: -0.2,
  },
  compactTsCol: { alignItems: 'flex-end' },
  compactTime: {
    fontSize: 12,
    color: REQ_SUBTEXT,
  },
  compactDate: {
    marginTop: 3,
    fontSize: 11,
    color: REQ_SUBTEXT,
  },
});
