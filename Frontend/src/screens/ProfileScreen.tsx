import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@clerk/clerk-expo';
import { SignInGateCard } from '../components/SignInGateCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import type { ProfileStackParamList } from '../navigation/profileStackTypes';
import {
  cascadingWhite,
  chineseSilver,
  crunch,
  dreamland,
  lead,
  warmHaze,
} from '../theme/colors';
import { cardShadow } from '../theme/shadows';

type Me = {
  firstName: string | null;
  lastName: string | null;
  primaryEmailAddress: string | null;
  imageUrl: string | null;
  city?: string;
  country?: string;
  area?: string;
  syncedName?: string;
  syncedEmail?: string;
  profilePhotoOverride?: string;
};

type Stats = {
  listingsActive: number;
  exchangesCompleted: number;
  wishlistOpen: number;
};

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { isSignedIn, signOut, userId } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avgRating, setAvgRating] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meRes, statsRes] = await Promise.all([
        api.get<Me>('/api/users/me'),
        api.get<Stats>('/api/users/stats'),
      ]);
      setMe(meRes.data);
      setStats(statsRes.data);
      if (userId) {
        try {
          const rev = await api.get<{ averageRating: number | null }>(
            `/api/reviews/user/${encodeURIComponent(userId)}`
          );
          setAvgRating(rev.data.averageRating);
        } catch {
          setAvgRating(null);
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load profile';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!isSignedIn) {
      setMe(null);
      setStats(null);
      setLoading(false);
      setError(null);
    }
  }, [isSignedIn]);

  useFocusEffect(
    useCallback(() => {
      if (isSignedIn) void load();
    }, [isSignedIn, load])
  );

  const displayName = useMemo(() => {
    if (me?.firstName || me?.lastName) {
      return [me.firstName, me.lastName].filter(Boolean).join(' ');
    }
    return 'Reader';
  }, [me]);

  const locationSummary = useMemo(() => {
    const parts = [me?.area?.trim(), me?.city?.trim(), me?.country?.trim()].filter(Boolean);
    if (parts.length) return parts.join(' · ');
    return 'Tap Edit profile to add your location';
  }, [me?.area, me?.city, me?.country]);

  if (!isSignedIn) {
    return (
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scroll, styles.gateScroll, { paddingTop: Math.max(insets.top, 8) + 8 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headerTitle}>Profile</Text>
        <Text style={styles.gateSubtitle}>Sign in to see your account and settings.</Text>
        <SignInGateCard
          title="You’re signed out"
          message="Use Google to sign in and manage your BookLink profile, listings, and swaps."
          icon="person-outline"
        />
      </ScrollView>
    );
  }

  const tabs = navigation.getParent();

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scroll, { paddingTop: Math.max(insets.top, 8) + 8 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={[styles.identityCard, cardShadow]}>
        {loading ? (
          <ActivityIndicator color={crunch} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <>
            {me?.imageUrl ? (
              <Image source={{ uri: me.imageUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarLetter}>{(me?.firstName ?? '?').slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.displayName}>{displayName}</Text>
            <Text style={styles.email}>{me?.primaryEmailAddress ?? userId}</Text>
            <Text style={styles.subLine}>{locationSummary}</Text>
            <View style={styles.statsRow}>
              <View style={[styles.statPill, { backgroundColor: '#e8f5e9' }]}>
                <Text style={styles.statLabel}>Listed</Text>
                <Text style={styles.statValue}>{stats?.listingsActive ?? 0}</Text>
              </View>
              <View style={[styles.statPill, { backgroundColor: chineseSilver }]}>
                <Text style={styles.statLabel}>Exchanged</Text>
                <Text style={styles.statValue}>{stats?.exchangesCompleted ?? 0}</Text>
              </View>
              <View style={[styles.statPill, { backgroundColor: '#fff3e0' }]}>
                <Text style={styles.statLabel}>Rating</Text>
                <Text style={styles.statValue}>
                  {avgRating != null ? `${avgRating} / 5` : '—'}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>

      <Text style={styles.sectionLabel}>Account</Text>
      <View style={[styles.menuCard, cardShadow]}>
        <Pressable style={styles.menuRow} onPress={() => navigation.navigate('EditProfile')}>
          <Text style={styles.menuLabel}>Edit profile</Text>
          <Text style={styles.chevron}>Location ›</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>My activity</Text>
      <View style={[styles.menuCard, cardShadow]}>
        <Pressable style={styles.menuRow} onPress={() => navigation.navigate('MyListings')}>
          <Text style={styles.menuLabel}>My listings</Text>
          <Text style={styles.chevron}>{stats?.listingsActive ?? 0} active ›</Text>
        </Pressable>
        <Pressable
          style={styles.menuRow}
          onPress={() =>
            tabs?.navigate('Wishlist', { screen: 'WishlistBoard', params: { initialTab: 'mine' } })
          }
        >
          <Text style={styles.menuLabel}>My wanted books</Text>
          <Text style={styles.chevron}>{stats?.wishlistOpen ?? 0} open ›</Text>
        </Pressable>
        <Pressable style={styles.menuRow} onPress={() => navigation.navigate('BrowsePoints')}>
          <Text style={styles.menuLabel}>Collection points</Text>
          <Text style={styles.chevron}>Browse ›</Text>
        </Pressable>
        <Pressable
          style={styles.menuRow}
          onPress={() =>
            userId
              ? navigation.navigate('UserReviews', { clerkUserId: userId, displayName: displayName })
              : undefined
          }
        >
          <Text style={styles.menuLabel}>My public reviews</Text>
          <Text style={styles.chevron}>View ›</Text>
        </Pressable>
        <Pressable style={styles.menuRow} onPress={() => navigation.navigate('MyReviews')}>
          <Text style={styles.menuLabel}>Reviews I wrote</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => signOut()} style={[styles.signOutBtn, cardShadow]}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: cascadingWhite },
  scroll: { paddingHorizontal: 20, paddingBottom: 32, gap: 16 },
  gateScroll: { flexGrow: 1 },
  gateSubtitle: { marginTop: 6, fontSize: 15, color: warmHaze, fontWeight: '600' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: lead },
  identityCard: {
    backgroundColor: cascadingWhite,
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    marginTop: 8,
  },
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: 12 },
  avatarPlaceholder: {
    backgroundColor: chineseSilver,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 36, fontWeight: '800', color: lead },
  displayName: { fontSize: 22, fontWeight: '800', color: lead },
  email: { marginTop: 4, fontSize: 14, color: warmHaze },
  subLine: { marginTop: 6, fontSize: 14, color: lead, fontWeight: '600', textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 18, width: '100%' },
  statPill: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statLabel: { fontSize: 11, fontWeight: '600', color: warmHaze },
  statValue: { marginTop: 4, fontSize: 16, fontWeight: '800', color: lead },
  menuCard: {
    backgroundColor: cascadingWhite,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    overflow: 'hidden',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 10,
  },
  sectionLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '800',
    color: warmHaze,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: dreamland,
  },
  menuLabel: { fontSize: 16, fontWeight: '600', color: lead },
  chevron: { fontSize: 15, color: warmHaze, fontWeight: '700' },
  signOutBtn: {
    backgroundColor: lead,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signOutText: { color: cascadingWhite, fontWeight: '800', fontSize: 16 },
  error: { color: '#b3261e', fontSize: 14 },
});
