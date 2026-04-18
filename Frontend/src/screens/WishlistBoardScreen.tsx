import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, apiErrorMessage } from '../lib/api';
import { SignInGateCard } from '../components/SignInGateCard';
import type { WishlistStackParamList } from '../navigation/wishlistStackTypes';
import {
  cascadingWhite,
  chineseSilver,
  crunch,
  dreamland,
  lead,
  textSecondary,
  warmHaze,
} from '../theme/colors';
import { cardShadow } from '../theme/shadows';
import type { WishlistItem } from '../types/wishlist';

type Props = NativeStackScreenProps<WishlistStackParamList, 'WishlistBoard'>;

function urgencyStyle(u: WishlistItem['urgency']) {
  if (u === 'high') return { borderColor: '#f7c1c1', bg: '#fcebeb' };
  if (u === 'medium') return { borderColor: '#fac775', bg: '#faeeda' };
  return { borderColor: '#c0dd97', bg: '#eaf3de' };
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
        setError(apiErrorMessage(e, 'Could not load wishlist'));
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
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.scroll, { paddingTop: Math.max(insets.top, 8) + 8 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Wishlist</Text>
        <Text style={styles.subtitle}>Wanted books</Text>
        <SignInGateCard
          title="Sign in for your wishlist"
          message="Post books you are looking for and browse what the community needs."
          icon="heart-outline"
        />
      </ScrollView>
    );
  }

  const subtitle =
    scope === 'community'
      ? `Community board · ${items.length} ${items.length === 1 ? 'request' : 'requests'}`
      : `Your posts · ${items.length} ${items.length === 1 ? 'item' : 'items'}`;

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 8) + 8 }]}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{scope === 'community' ? 'Wanted books' : 'My wanted books'}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <Pressable style={styles.chatsPill} onPress={() => navigation.navigate('WishlistChats')} hitSlop={6}>
          <Ionicons name="chatbubbles-outline" size={18} color={lead} />
          <Text style={styles.chatsPillTxt}>Chats</Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate('PostWanted')}
          style={styles.iconBtn}
          hitSlop={8}
          accessibilityLabel="Post a wanted book"
        >
          <Ionicons name="add" size={28} color={lead} />
        </Pressable>
      </View>

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
        <ActivityIndicator style={{ marginTop: 24 }} color={crunch} />
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
              tintColor={crunch}
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
              const u = urgencyStyle(w.urgency);
              const detailLine = [w.author, w.subject].filter(Boolean).join(' · ');
              return (
                <Pressable
                  key={w._id}
                  style={[styles.wishCard, { backgroundColor: u.bg, borderColor: u.borderColor }]}
                  onPress={() => navigation.navigate('WantedBookDetail', { wishlistItemId: w._id })}
                >
                  <View style={styles.wishTop}>
                    <Text style={styles.wishName}>{w.title}</Text>
                    <Text style={styles.urgency}>{w.urgency}</Text>
                  </View>
                  {detailLine ? <Text style={styles.wishDetail}>{detailLine}</Text> : null}
                  {w.description ? (
                    <Text style={styles.wishDesc} numberOfLines={2}>
                      {w.description}
                    </Text>
                  ) : null}
                  <Text style={styles.wishMeta}>
                    {[w.language, scope === 'community' ? w.ownerDisplayName : null].filter(Boolean).join(' · ')}
                  </Text>
                  <Text style={styles.openHint}>Tap to open · chat if you have this book</Text>
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
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: cascadingWhite, paddingHorizontal: 20, paddingBottom: 24 },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  chatsPill: {
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
  chatsPillTxt: { fontSize: 14, fontWeight: '800', color: lead },
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
  title: { fontSize: 28, fontWeight: '800', color: lead, letterSpacing: -0.5 },
  subtitle: { marginTop: 4, fontSize: 15, color: warmHaze, fontWeight: '600' },
  segment: {
    flexDirection: 'row',
    marginTop: 16,
    backgroundColor: '#f3f3f5',
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
  segmentBtnOn: { backgroundColor: crunch },
  segmentTxt: { fontSize: 14, fontWeight: '700', color: textSecondary },
  segmentTxtOn: { color: lead },
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
  wishCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    ...cardShadow,
  },
  wishTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  wishName: { flex: 1, fontSize: 17, fontWeight: '800', color: lead },
  urgency: {
    fontSize: 12,
    fontWeight: '800',
    color: lead,
    textTransform: 'capitalize',
    backgroundColor: 'rgba(255,255,255,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  wishDetail: { marginTop: 8, fontSize: 14, color: lead, fontWeight: '600' },
  wishDesc: { marginTop: 6, fontSize: 13, color: textSecondary, lineHeight: 18 },
  wishMeta: { marginTop: 6, fontSize: 14, color: textSecondary },
  openHint: { marginTop: 8, fontSize: 12, fontWeight: '700', color: warmHaze },
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
