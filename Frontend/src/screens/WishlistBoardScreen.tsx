import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, apiErrorMessage } from '../lib/api';
import { SignInGateCard } from '../components/SignInGateCard';
import { CourseScreenShell } from '../components/CourseScreenShell';
import type { WishlistStackParamList } from '../navigation/wishlistStackTypes';
import { cascadingWhite, dreamland, lead, textSecondary, themeSurfaceMuted } from '../theme/colors';
import {
  themeCard,
  themeGreen,
  themeIllustrationBlue,
  themeInk,
  themeMuted,
  themePrimary,
} from '../theme/courseTheme';
import { cardShadow } from '../theme/shadows';
import { font } from '../theme/typography';
import type { WishlistItem } from '../types/wishlist';

type Props = NativeStackScreenProps<WishlistStackParamList, 'WishlistBoard'>;

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

function urgencyHeadline(u: WishlistItem['urgency']): string {
  if (u === 'high') return 'High priority';
  if (u === 'medium') return 'Medium priority';
  return 'Low priority';
}

export function WishlistBoardScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<WishlistStackParamList, 'WishlistBoard'>>();
  const { isSignedIn } = useAuth();
  const [scope, setScope] = useState<'community' | 'mine'>(
    route.params?.initialTab === 'mine' ? 'mine' : 'community'
  );
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (route.params?.initialTab === 'mine') setScope('mine');
  }, [route.params?.initialTab]);

  const fetchWishlist = useCallback(
    async (variant: 'screen' | 'pull') => {
      if (!isSignedIn) return;
      if (variant === 'pull') setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const path = scope === 'community' ? '/api/wishlist' : '/api/wishlist/mine';
        const res = await api.get<{ items: WishlistItem[] }>(path);
        setItems(res.data.items ?? []);
      } catch (e: unknown) {
        setError(apiErrorMessage(e, 'Could not load wanted books'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isSignedIn, scope]
  );

  useFocusEffect(
    useCallback(() => {
      if (!isSignedIn) {
        setLoading(false);
        return;
      }
      void fetchWishlist('screen');
    }, [isSignedIn, fetchWishlist])
  );

  if (!isSignedIn) {
    return (
      <CourseScreenShell title="Wanted books" subtitle="Posts from readers looking for titles." scroll scrollContentStyle={{ gap: 16 }}>
        <SignInGateCard
          title="Sign in for wanted books"
          message="Post books you are looking for and browse what the community needs."
          icon="book-outline"
        />
      </CourseScreenShell>
    );
  }

  const subtitle =
    scope === 'community'
      ? `Community board · ${items.length} ${items.length === 1 ? 'request' : 'requests'}`
      : `Your posts · ${items.length} ${items.length === 1 ? 'item' : 'items'}`;

  return (
    <CourseScreenShell
      title={scope === 'community' ? 'Wanted books' : 'My wanted books'}
      subtitle={subtitle}
      scroll={false}
      headerRight={
        <View style={styles.headerActions}>
          <Pressable style={styles.headerChatsBtn} onPress={() => navigation.navigate('WishlistChats')} hitSlop={6}>
            <Ionicons name="chatbubbles-outline" size={18} color={cascadingWhite} />
            <Text style={styles.headerChatsTxt}>Inbox</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('PostWanted')}
            style={styles.headerAddBtn}
            hitSlop={8}
            accessibilityLabel="Post a wanted book"
          >
            <Ionicons name="add" size={26} color={cascadingWhite} />
          </Pressable>
        </View>
      }
    >
      <View style={styles.signedInWrap}>
      <View style={styles.segment}>
        <Pressable
          onPress={() => setScope('community')}
          style={[styles.segmentBtn, scope === 'community' && styles.segmentBtnOn]}
        >
          <Text style={[styles.segmentTxt, scope === 'community' && styles.segmentTxtOn]}>Community</Text>
        </Pressable>
        <Pressable
          onPress={() => setScope('mine')}
          style={[styles.segmentBtn, scope === 'mine' && styles.segmentBtnOn]}
        >
          <Text style={[styles.segmentTxt, scope === 'mine' && styles.segmentTxtOn]}>Mine</Text>
        </Pressable>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={themePrimary} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void fetchWishlist('pull')}
              tintColor={themePrimary}
            />
          }
        >
          {items.length === 0 ? (
            <View style={[styles.card, cardShadow]}>
              <Text style={styles.body}>
                {scope === 'community'
                  ? 'No wanted posts yet. Be the first to add one.'
                  : 'You have not posted any wanted books yet. Tap below to add one.'}
              </Text>
            </View>
          ) : (
            items.map((w) => {
              const tagLine = [w.author?.trim(), w.subject?.trim()].filter(Boolean).join(' · ') || 'Book request';
              const listed = relativeListingAge(w.createdAt);
              const tailLabel =
                scope === 'community'
                  ? w.ownerDisplayName?.trim() || 'Community reader'
                  : 'Your post';

              return (
                <Pressable
                  key={w._id}
                  style={({ pressed }) => [
                    styles.wishRowCard,
                    cardShadow,
                    pressed && styles.wishRowPressed,
                  ]}
                  onPress={() => navigation.navigate('WantedBookDetail', { wishlistItemId: w._id })}
                >
                  <View style={styles.wishThumb}>
                    {w.wantedBookPhoto ? (
                      <Image
                        source={{ uri: w.wantedBookPhoto }}
                        style={styles.wishThumbImg as ImageStyle}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.wishThumbPh}>
                        <Ionicons name="book-outline" size={32} color={themePrimary} />
                      </View>
                    )}
                  </View>
                  <View style={styles.wishRowBody}>
                    <Text style={[styles.wishRowTitle, { fontFamily: font.bold }]} numberOfLines={2}>
                      {w.title}
                    </Text>
                    <View style={styles.wishMetaRow}>
                      <View style={styles.wishMetaCluster}>
                        <View style={[styles.metaIconBubble, styles.metaIconGreen]}>
                          <Ionicons name="layers-outline" size={13} color={themeGreen} />
                        </View>
                        <Text style={[styles.wishMetaTxt, { fontFamily: font.regular }]} numberOfLines={1}>
                          {tagLine}
                        </Text>
                      </View>
                      <View style={[styles.wishMetaCluster, styles.wishMetaClusterRight]}>
                        <View style={[styles.metaIconBubble, styles.metaIconPurple]}>
                          <Ionicons name="time-outline" size={13} color={themePrimary} />
                        </View>
                        <Text style={[styles.wishMetaTxt, { fontFamily: font.regular }]} numberOfLines={1}>
                          {listed}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.wishBottomRow}>
                      <Text style={[styles.wishUrgencyAccent, { fontFamily: font.bold }]}>
                        {urgencyHeadline(w.urgency)}
                      </Text>
                      <Text style={[styles.wishTailMuted, { fontFamily: font.medium }]} numberOfLines={1}>
                        {tailLabel}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}
      <Pressable
        style={[styles.fabSecondary, cardShadow, { bottom: Math.max(insets.bottom, 12) + 16 }]}
        onPress={() => navigation.navigate('WishlistMatches')}
      >
        <Text style={styles.fabSecondaryText}>See matches with listings</Text>
      </Pressable>
      </View>
    </CourseScreenShell>
  );
}

const styles = StyleSheet.create({
  signedInWrap: { flex: 1, position: 'relative' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  headerAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.4)',
    marginBottom: 2,
  },
  segment: {
    flexDirection: 'row',
    marginTop: 4,
    backgroundColor: themeSurfaceMuted,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  segmentBtnOn: { backgroundColor: themePrimary },
  segmentTxt: { fontSize: 14, fontWeight: '700', color: textSecondary },
  segmentTxtOn: { color: cascadingWhite },
  list: { paddingBottom: 110, gap: 12, marginTop: 16 },
  card: {
    backgroundColor: cascadingWhite,
    borderRadius: 24,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  body: { fontSize: 15, lineHeight: 22, color: textSecondary },
  error: { color: '#b3261e', marginTop: 12 },
  wishRowCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
    padding: 12,
    borderRadius: 20,
    backgroundColor: themeCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(16,16,17,0.06)',
  },
  wishRowPressed: { opacity: 0.94, transform: [{ scale: 0.995 }] },
  wishThumb: {
    width: 92,
    height: 92,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: themeIllustrationBlue,
    flexShrink: 0,
  },
  wishThumbImg: { width: '100%', height: '100%' },
  wishThumbPh: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(113,110,255,0.08)',
  },
  wishRowBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  wishRowTitle: {
    fontSize: 16,
    color: themeInk,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  wishMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  wishMetaCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  wishMetaClusterRight: {
    flex: 0,
    flexShrink: 0,
    maxWidth: '46%',
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
  wishMetaTxt: {
    flexShrink: 1,
    fontSize: 12,
    color: themeMuted,
    lineHeight: 16,
  },
  wishBottomRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
  },
  wishUrgencyAccent: {
    fontSize: 15,
    color: themePrimary,
    letterSpacing: -0.2,
  },
  wishTailMuted: {
    flex: 1,
    fontSize: 12,
    color: themeMuted,
    textAlign: 'right',
  },
  fabSecondary: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: cascadingWhite,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  fabSecondaryText: { fontSize: 15, fontWeight: '800', color: lead },
});
